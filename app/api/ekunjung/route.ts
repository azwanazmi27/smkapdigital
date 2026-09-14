import { env } from "cloudflare:workers";
import { portalActor } from "../../server-auth";

type VisitorBody = Record<string, unknown>;

const textLimits: Record<string, number> = {
  date: 10, timeIn: 5, visitorName: 120, phone: 30, vehicleNo: 30,
  organisation: 120, purpose: 160, staff: 120, meetingPlace: 120, notes: 300,
};

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "";
}

function connection() {
  const url = process.env.OPR_APPS_SCRIPT_URL;
  const token = process.env.OPR_APPS_SCRIPT_TOKEN;
  if (!url || !token) throw new Error("Sambungan Google belum dikonfigurasi");
  return { url, token };
}

async function callGoogle(payload: Record<string, unknown>) {
  const { url, token } = connection();
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, token }),
    redirect: "follow",
    cache: "no-store",
  });
  const result = await response.json() as Record<string, unknown>;
  if (!response.ok || result.ok !== true) throw new Error(typeof result.error === "string" ? result.error : "Sambungan Google gagal");
  return result;
}

type VisitorRecord = { id:string;date:string;timeIn:string;timeOut:string;name:string;phone:string;vehicleNo:string;organisation:string;purpose:string;staff:string;meetingPlace:string;notes:string;status:string };
const visitorColumns = "id,date,time_in AS timeIn,time_out AS timeOut,name,phone,vehicle_no AS vehicleNo,organisation,purpose,staff,meeting_place AS meetingPlace,notes,status";
async function ensureVisitorArchive() {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS ekunjung_records (id TEXT PRIMARY KEY,date TEXT NOT NULL,time_in TEXT NOT NULL,time_out TEXT NOT NULL DEFAULT '',name TEXT NOT NULL,phone TEXT NOT NULL DEFAULT '',vehicle_no TEXT NOT NULL DEFAULT '',organisation TEXT NOT NULL DEFAULT '',purpose TEXT NOT NULL DEFAULT '',staff TEXT NOT NULL DEFAULT '',meeting_place TEXT NOT NULL DEFAULT '',notes TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'DALAM KAWASAN',created_at TEXT NOT NULL,updated_at TEXT NOT NULL)").run();
}
function activeRows(value: unknown) {
  return Array.isArray(value) ? value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    if (!["id", "date", "timeIn", "name", "vehicleNo"].every((key) => typeof row[key] === "string")) return [];
    return [{ id:String(row.id),date:String(row.date),timeIn:String(row.timeIn),name:String(row.name),vehicleNo:String(row.vehicleNo) }];
  }) : [];
}

export async function GET(request:Request) {
  try {
    const result = await callGoogle({ action: "ekunjung_active" });
    const records = activeRows(result.records);
    const params=new URL(request.url).searchParams;
    if(params.get("view")!=="admin") return Response.json({ success: true, records, activeCount:records.length }, { headers: { "Cache-Control": "private, no-store" } });
    const actor=await portalActor(request);
    if(!actor||!["admin","super_admin"].includes(actor.role))return Response.json({error:"Akses pentadbir diperlukan."},{status:403});
    const date=cleanText(params.get("date"),10)||new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Kuala_Lumpur"});
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return Response.json({error:"Tarikh tidak sah."},{status:400});
    await ensureVisitorArchive();
    const archive=(await env.DB.prepare(`SELECT ${visitorColumns} FROM ekunjung_records WHERE date=? ORDER BY time_in DESC`).bind(date).all<VisitorRecord>()).results;
    const byId=new Map(archive.map(row=>[row.id,row]));
    records.filter(row=>row.date===date&&!byId.has(row.id)).forEach(row=>byId.set(row.id,{...row,timeOut:"",phone:"",organisation:"",purpose:"",staff:"",meetingPlace:"",notes:"",status:"DALAM KAWASAN"}));
    return Response.json({success:true,activeCount:records.length,records:Array.from(byId.values()).sort((a,b)=>b.timeIn.localeCompare(a.timeIn))},{headers:{"Cache-Control":"private, no-store"}});
  } catch (error) {
    console.error("E-Kunjung active list error", error instanceof Error ? error.message : error);
    return Response.json({ error: "Senarai pelawat aktif tidak dapat dibaca sekarang." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as VisitorBody;
    const action = body.action;
    if (action === "checkout") {
      const id = cleanText(body.id, 80);
      const timeOut = cleanText(body.timeOut, 5);
      if (!id || !/^\d{2}:\d{2}$/.test(timeOut)) return Response.json({ error: "Pelawat dan masa keluar diperlukan." }, { status: 400 });
      const result = await callGoogle({ action: "ekunjung_checkout", id, timeOut });
      await ensureVisitorArchive();
      await env.DB.prepare("UPDATE ekunjung_records SET time_out=?,status='TELAH KELUAR',updated_at=? WHERE id=?").bind(timeOut,new Date().toISOString(),id).run();
      return Response.json({ success: true, id: result.id, name: result.name, timeOut: result.timeOut, status: result.status });
    }
    if (action !== "create") return Response.json({ error: "Tindakan tidak sah." }, { status: 400 });

    const data = Object.fromEntries(Object.entries(textLimits).map(([key, max]) => [key, cleanText(body[key], max)]));
    // Kekalkan keserasian dengan Google Apps Script lama yang masih menjangka
    // nilai `staff`, walaupun medan tersebut tidak lagi dipaparkan kepada pelawat.
    if (!data.staff) data.staff = "Tidak dinyatakan";
    if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date) || !/^\d{2}:\d{2}$/.test(data.timeIn) || !data.visitorName || !data.phone || !data.purpose) {
      return Response.json({ error: "Maklumat wajib tidak lengkap atau tidak sah." }, { status: 400 });
    }
    const photo = body.photo && typeof body.photo === "object" ? body.photo as Record<string, unknown> : {};
    const mimeType = photo.mimeType === "image/png" ? "image/png" : photo.mimeType === "image/jpeg" ? "image/jpeg" : "";
    const base64 = typeof photo.base64 === "string" ? photo.base64 : "";
    if (!mimeType || !base64 || base64.length > 7_000_000) return Response.json({ error: "Gambar tidak sah atau terlalu besar." }, { status: 400 });
    const raw = Uint8Array.from(atob(base64.slice(0, 16)), (char) => char.charCodeAt(0));
    const validImage = mimeType === "image/jpeg" ? raw[0] === 0xff && raw[1] === 0xd8 && raw[2] === 0xff : raw[0] === 0x89 && raw[1] === 0x50 && raw[2] === 0x4e && raw[3] === 0x47;
    if (!validImage) return Response.json({ error: "Kandungan gambar tidak sah." }, { status: 400 });

    const result = await callGoogle({ action: "ekunjung_create", ...data, photo: { mimeType, base64 } });
    await ensureVisitorArchive();
    const now=new Date().toISOString();
    await env.DB.prepare("INSERT OR REPLACE INTO ekunjung_records(id,date,time_in,time_out,name,phone,vehicle_no,organisation,purpose,staff,meeting_place,notes,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .bind(String(result.id),data.date,data.timeIn,"",data.visitorName,data.phone,data.vehicleNo,data.organisation,data.purpose,data.staff,data.meetingPlace,data.notes,String(result.status||"DALAM KAWASAN"),now,now).run();
    return Response.json({ success: true, id: result.id, status: result.status });
  } catch (error) {
    console.error("E-Kunjung save error", error instanceof Error ? error.message : error);
    return Response.json({ error: error instanceof Error ? error.message : "Rekod E-Kunjung tidak dapat disimpan sekarang." }, { status: 502 });
  }
}
