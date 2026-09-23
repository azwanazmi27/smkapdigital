import { env } from "cloudflare:workers";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { portalActor } from "../../server-auth";

type VisitorBody = Record<string, unknown>;
class GoogleActionError extends Error {}

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
  const readOnly = payload.action === "ekunjung_active" || payload.action === "ekunjung_by_date";
  const attempts=payload.action==="ekunjung_active"?2:1;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, token }),
        redirect: "follow",
        cache: "no-store",
        signal: AbortSignal.timeout(readOnly ? 8_000 : 20_000),
      });
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("json")) throw new Error("Google Apps Script memulangkan halaman bukan JSON.");
      const result = await response.json() as Record<string, unknown>;
      if (!response.ok || result.ok !== true) throw new GoogleActionError(typeof result.error === "string" ? result.error : "Sambungan Google gagal");
      return result;
    } catch (error) {
      if (!readOnly || attempt === attempts-1) {
        if (readOnly) throw error;
        if (error instanceof GoogleActionError) throw error;
        throw new Error("Pengesahan Google mengambil terlalu lama atau gagal. Rekod mungkin sudah disimpan; semak senarai sebelum cuba lagi.");
      }
    }
  }
  throw new Error("Sambungan Google gagal");
}

type VisitorRecord = { id:string;date:string;timeIn:string;timeOut:string;name:string;phone:string;vehicleNo:string;organisation:string;purpose:string;staff:string;meetingPlace:string;notes:string;status:string };
const visitorColumns = "id,date,time_in AS timeIn,time_out AS timeOut,name,phone,vehicle_no AS vehicleNo,organisation,purpose,staff,meeting_place AS meetingPlace,notes,status";
type ActiveRow = { id:string;date:string;timeIn:string;name:string;vehicleNo:string };
type ActiveCache = { records:ActiveRow[]; checkedAt:number };
const activeCacheKey = (request:Request) => new Request(new URL("/__internal/ekunjung-active",request.url));
const edgeCache = () => (globalThis as unknown as {caches?:{default?:{match(key:Request):Promise<Response|undefined>;put(key:Request,value:Response):Promise<void>;delete(key:Request):Promise<boolean>}}}).caches?.default;
async function cachedActive(request:Request) {
  const edge=edgeCache(),key=activeCacheKey(request);
  let saved:ActiveCache|null=null;
  try{const hit=await edge?.match(key);if(hit?.ok)saved=await hit.json() as ActiveCache;}catch{}
  if(saved&&Date.now()-saved.checkedAt<15_000)return {records:saved.records,stale:false};
  try{
    const result=await callGoogle({action:"ekunjung_active"}),records=activeRows(result.records);
    try{await edge?.put(key,Response.json({records,checkedAt:Date.now()},{headers:{"Cache-Control":"s-maxage=60"}}));}catch{}
    return {records,stale:false};
  }catch(error){
    if(saved&&Date.now()-saved.checkedAt<60_000)return {records:saved.records,stale:true};
    throw error;
  }
}
async function clearActive(request:Request){try{await edgeCache()?.delete(activeCacheKey(request));}catch{}}
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

function fullRows(value:unknown):VisitorRecord[]{
  if(!Array.isArray(value))return [];
  return value.flatMap((item)=>{
    if(!item||typeof item!=="object")return [];
    const row=item as Record<string,unknown>;
    if(!["id","date","timeIn","name"].every(key=>typeof row[key]==="string"))return [];
    return [{id:cleanText(row.id,80),date:cleanText(row.date,10),timeIn:cleanText(row.timeIn,5),timeOut:cleanText(row.timeOut,5),name:cleanText(row.name,120),phone:cleanText(row.phone,30),vehicleNo:cleanText(row.vehicleNo,30),organisation:cleanText(row.organisation,120),purpose:cleanText(row.purpose,160),staff:cleanText(row.staff,120),meetingPlace:cleanText(row.meetingPlace,120),notes:cleanText(row.notes,300),status:cleanText(row.status,40)}];
  });
}

async function visitorPdf(date:string,records:VisitorRecord[],sheetVerified:boolean){
  const pdf=await PDFDocument.create(),regular=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const safe=(value:string)=>value.replace(/[^\x20-\x7e\u00a0-\u00ff]/g,"-");
  const pageWidth=842,pageHeight=595,margin=35;
  let page=pdf.addPage([pageWidth,pageHeight]),y=pageHeight-45;
  const drawHeader=()=>{page.drawRectangle({x:0,y:pageHeight-95,width:pageWidth,height:95,color:rgb(.07,.25,.29)});page.drawText("SENARAI PELAWAT E-KUNJUNG",{x:margin,y:pageHeight-48,font:bold,size:18,color:rgb(1,1,1)});page.drawText(`SMK Agama Pahang  |  ${date}`,{x:margin,y:pageHeight-72,font:regular,size:10,color:rgb(1,1,1)});y=pageHeight-115;};
  drawHeader();
  for(let index=0;index<records.length;index++){
    const record=records[index];
    const parts=[`Telefon: ${record.phone||"-"}  |  Kenderaan: ${record.vehicleNo||"-"}`,`Tujuan: ${record.purpose||"-"}  |  Staf: ${record.staff||"-"}`,`Organisasi: ${record.organisation||"-"}  |  Tempat: ${record.meetingPlace||"-"}`,record.notes?`Catatan: ${record.notes}`:""] .filter(Boolean);
    const lines=parts.flatMap(part=>{const words=safe(part).split(" "),out:string[]=[];let current="";for(const word of words){if((current+" "+word).length>110){out.push(current);current=word;}else current=current?current+" "+word:word;}if(current)out.push(current);return out;});
    const height=36+lines.length*13;
    if(y-height<45){page=pdf.addPage([pageWidth,pageHeight]);drawHeader();}
    page.drawRectangle({x:margin,y:y-height+7,width:pageWidth-margin*2,height:height-2,color:index%2?rgb(.96,.98,.98):rgb(.92,.96,.96)});
    page.drawText(safe(`${index+1}. ${record.name}`).slice(0,95),{x:margin+10,y:y-15,font:bold,size:10,color:rgb(.08,.22,.25)});
    page.drawText(`${record.timeIn||"-"} - ${record.timeOut||"BELUM KELUAR"}`,{x:pageWidth-margin-145,y:y-15,font:bold,size:9,color:rgb(.08,.22,.25)});
    lines.forEach((line,lineIndex)=>page.drawText(line.slice(0,115),{x:margin+10,y:y-29-lineIndex*13,font:regular,size:8,color:rgb(.2,.3,.32)}));
    y-=height+5;
  }
  const note=sheetVerified?"Sumber: Google Sheet sekolah dan rekod portal.":"Sumber: rekod portal sahaja; semakan Google Sheet tidak tersedia semasa eksport.";
  for(const item of pdf.getPages()){item.drawText(safe(`Jumlah: ${records.length}  |  Belum keluar: ${records.filter(row=>!row.timeOut).length}`),{x:margin,y:27,font:bold,size:8});item.drawText(safe(note),{x:margin,y:15,font:regular,size:8});}
  return new Response(await pdf.save(),{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="Senarai-Pelawat-${date}.pdf"`,"Cache-Control":"private, no-store","X-Ekunjung-Source":sheetVerified?"sheet-and-portal":"portal-only"}});
}

export async function GET(request:Request) {
  try {
    const params=new URL(request.url).searchParams;
    if(params.get("view")==="pdf"){
      const actor=await portalActor(request);
      if(!actor||!["admin","super_admin"].includes(actor.role))return Response.json({error:"Akses pentadbir diperlukan."},{status:403});
      const date=cleanText(params.get("date"),10);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return Response.json({error:"Tarikh tidak sah."},{status:400});
      await ensureVisitorArchive();
      const archive=(await env.DB.prepare(`SELECT ${visitorColumns} FROM ekunjung_records WHERE date=? ORDER BY time_in DESC`).bind(date).all<VisitorRecord>()).results;
      let fromSheet:VisitorRecord[]=[],sheetVerified=false;
      try{const result=await callGoogle({action:"ekunjung_by_date",date});fromSheet=fullRows(result.records).filter(row=>row.date===date);sheetVerified=true;}catch(error){console.error("E-Kunjung PDF Sheet read unavailable",error instanceof Error?error.name:"UNKNOWN");}
      const byId=new Map<string,VisitorRecord>();
      archive.forEach(row=>byId.set(row.id,row));fromSheet.forEach(row=>byId.set(row.id,row));
      const records=Array.from(byId.values()).sort((a,b)=>b.timeIn.localeCompare(a.timeIn));
      if(!records.length)return Response.json({error:sheetVerified?"Tiada rekod pelawat pada tarikh yang dipilih.":"Google Sheet belum dapat disemak dan tiada rekod portal untuk tarikh ini. Cuba semula sebentar lagi."},{status:sheetVerified?404:503});
      return visitorPdf(date,records,sheetVerified);
    }
    const {records,stale}=await cachedActive(request);
    if(params.get("view")!=="admin") return Response.json({ success: true, records, activeCount:records.length, stale }, { headers: { "Cache-Control": "private, no-store" } });
    const actor=await portalActor(request);
    if(!actor||!["admin","super_admin"].includes(actor.role))return Response.json({error:"Akses pentadbir diperlukan."},{status:403});
    const date=cleanText(params.get("date"),10)||new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Kuala_Lumpur"});
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return Response.json({error:"Tarikh tidak sah."},{status:400});
    await ensureVisitorArchive();
    const archive=(await env.DB.prepare(`SELECT ${visitorColumns} FROM ekunjung_records WHERE date=? ORDER BY time_in DESC`).bind(date).all<VisitorRecord>()).results;
    const byId=new Map(archive.map(row=>[row.id,row]));
    records.filter(row=>row.date===date&&!byId.has(row.id)).forEach(row=>byId.set(row.id,{...row,timeOut:"",phone:"",organisation:"",purpose:"",staff:"",meetingPlace:"",notes:"",status:"DALAM KAWASAN"}));
    return Response.json({success:true,activeCount:records.length,stale,records:Array.from(byId.values()).sort((a,b)=>b.timeIn.localeCompare(a.timeIn))},{headers:{"Cache-Control":"private, no-store"}});
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
      await ensureVisitorArchive();
      let result:Record<string,unknown>;
      try{result=await callGoogle({ action: "ekunjung_checkout", id, timeOut });}
      catch(error){
        const stored=await env.DB.prepare("SELECT date FROM ekunjung_records WHERE id=?").bind(id).first<{date:string}>();
        const date=cleanText(body.date,10)||stored?.date||"";
        if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw error;
        try{
          const lookup=await callGoogle({action:"ekunjung_by_date",date});
          const row=fullRows(lookup.records).find(item=>item.id===id);
          if(!row?.timeOut)throw error;
          result={id,name:row.name,timeOut:row.timeOut,status:row.status};
        }catch{throw error;}
      }
      await env.DB.prepare("UPDATE ekunjung_records SET time_out=?,status='TELAH KELUAR',updated_at=? WHERE id=?").bind(String(result.timeOut||timeOut),new Date().toISOString(),id).run();
      await clearActive(request);
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
    const hasPhoto = Boolean(photo.base64 || photo.mimeType);
    const mimeType = photo.mimeType === "image/png" ? "image/png" : photo.mimeType === "image/jpeg" ? "image/jpeg" : "";
    const base64 = typeof photo.base64 === "string" ? photo.base64 : "";
    if (hasPhoto) {
      if (!mimeType || !base64 || base64.length > 7_000_000) return Response.json({ error: "Gambar tidak sah atau terlalu besar." }, { status: 400 });
      const raw = Uint8Array.from(atob(base64.slice(0, 16)), (char) => char.charCodeAt(0));
      const validImage = mimeType === "image/jpeg" ? raw[0] === 0xff && raw[1] === 0xd8 && raw[2] === 0xff : raw[0] === 0x89 && raw[1] === 0x50 && raw[2] === 0x4e && raw[3] === 0x47;
      if (!validImage) return Response.json({ error: "Kandungan gambar tidak sah." }, { status: 400 });
    }

    const result = await callGoogle({ action: "ekunjung_create", ...data, photo: hasPhoto ? { mimeType, base64 } : null });
    await ensureVisitorArchive();
    const now=new Date().toISOString();
    await env.DB.prepare("INSERT OR REPLACE INTO ekunjung_records(id,date,time_in,time_out,name,phone,vehicle_no,organisation,purpose,staff,meeting_place,notes,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .bind(String(result.id),data.date,data.timeIn,"",data.visitorName,data.phone,data.vehicleNo,data.organisation,data.purpose,data.staff,data.meetingPlace,data.notes,String(result.status||"DALAM KAWASAN"),now,now).run();
    await clearActive(request);
    return Response.json({ success: true, id: result.id, status: result.status });
  } catch (error) {
    console.error("E-Kunjung save error", error instanceof Error ? error.message : error);
    return Response.json({ error: error instanceof Error ? error.message : "Rekod E-Kunjung tidak dapat disimpan sekarang." }, { status: 502 });
  }
}
