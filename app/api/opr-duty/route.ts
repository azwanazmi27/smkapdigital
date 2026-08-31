import { env } from "cloudflare:workers";

type DutyRow = { id:string; reportDate:string; weekNumber:number; schoolYear:number; dayName:string; teachers:string; teacherTotal:number; teacherPresent:number; teacherAbsent:number; cleanlinessStatus:string; disciplineStatus:string; safetyStatus:string; healthStatus:string; canteenStatus:string; activityNote:string; generalNote:string; detailsJson:string; preparedBy:string; createdAt:string; updatedAt:string };

let preparation:Promise<void>|null=null;
async function prepare() {
  if(preparation)return preparation;
  preparation=env.DB.prepare("CREATE TABLE IF NOT EXISTS opr_duty_reports (id TEXT PRIMARY KEY,report_date TEXT NOT NULL UNIQUE,week_number INTEGER NOT NULL,school_year INTEGER NOT NULL,day_name TEXT NOT NULL,teachers TEXT NOT NULL,teacher_total INTEGER NOT NULL DEFAULT 0,teacher_present INTEGER NOT NULL DEFAULT 0,teacher_absent INTEGER NOT NULL DEFAULT 0,cleanliness_status TEXT NOT NULL,discipline_status TEXT NOT NULL,safety_status TEXT NOT NULL,health_status TEXT NOT NULL,canteen_status TEXT NOT NULL,activity_note TEXT NOT NULL DEFAULT '',general_note TEXT NOT NULL DEFAULT '',details_json TEXT NOT NULL DEFAULT '{}',prepared_by TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)").run().then(()=>{}).catch(error=>{preparation=null;throw error;});
  return preparation;
}

const select = "SELECT id,report_date AS reportDate,week_number AS weekNumber,school_year AS schoolYear,day_name AS dayName,teachers,teacher_total AS teacherTotal,teacher_present AS teacherPresent,teacher_absent AS teacherAbsent,cleanliness_status AS cleanlinessStatus,discipline_status AS disciplineStatus,safety_status AS safetyStatus,health_status AS healthStatus,canteen_status AS canteenStatus,activity_note AS activityNote,general_note AS generalNote,details_json AS detailsJson,prepared_by AS preparedBy,created_at AS createdAt,updated_at AS updatedAt FROM opr_duty_reports";

export async function GET(request: Request) {
  try {
    await prepare(); const url = new URL(request.url); const week = Number(url.searchParams.get("week")); const year = Number(url.searchParams.get("year"));
    const result = week && year ? await env.DB.prepare(`${select} WHERE school_year=? AND week_number=? ORDER BY report_date`).bind(year,week).all<DutyRow>() : await env.DB.prepare(`${select} ORDER BY report_date DESC LIMIT 60`).all<DutyRow>();
    return Response.json({ records:result.results },{ headers:{ "Cache-Control":"private, no-store" } });
  } catch (error) { console.error("OPR duty read",error); return Response.json({ error:"Laporan guru bertugas tidak dapat dibaca sekarang." },{ status:500 }); }
}

export async function POST(request: Request) {
  try {
    await prepare(); const body = await request.json() as Record<string,unknown>;
    const text = (key:string,max=800) => typeof body[key] === "string" ? String(body[key]).trim().slice(0,max) : "";
    const integer = (key:string,max=999) => Math.max(0,Math.min(max,Number(body[key]) || 0));
    const reportDate=text("reportDate",10), teachers=text("teachers",500), preparedBy=text("preparedBy",120),weekNumber=integer("weekNumber",53),schoolYear=integer("schoolYear",2100);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDate) || !teachers || !preparedBy) return Response.json({ error:"Tarikh, nama guru bertugas dan nama penyedia diperlukan." },{ status:400 });
    if(weekNumber<1||weekNumber>53||schoolYear<2020)return Response.json({error:"Nombor minggu dan tahun persekolahan tidak sah."},{status:400});
    const allowedStatus=["Baik","Memuaskan","Perlu perhatian","Tiada isu"];
    for (const key of ["cleanlinessStatus","disciplineStatus","safetyStatus","healthStatus","canteenStatus"]) if (!allowedStatus.includes(text(key,30))) return Response.json({ error:"Status laporan tidak sah." },{ status:400 });
    const detailsJson=typeof body.details==="object"&&body.details?JSON.stringify(body.details).slice(0,12000):"{}"; const submittedAt=text("submittedAt",40); const submittedTime=Date.parse(submittedAt); const createdAt=new Date().toISOString(); const updatedAt=Number.isFinite(submittedTime)?new Date(submittedTime).toISOString():createdAt; const id=text("id",80)||crypto.randomUUID();
    await env.DB.prepare("INSERT INTO opr_duty_reports (id,report_date,week_number,school_year,day_name,teachers,teacher_total,teacher_present,teacher_absent,cleanliness_status,discipline_status,safety_status,health_status,canteen_status,activity_note,general_note,details_json,prepared_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(report_date) DO UPDATE SET week_number=excluded.week_number,school_year=excluded.school_year,day_name=excluded.day_name,teachers=excluded.teachers,teacher_total=excluded.teacher_total,teacher_present=excluded.teacher_present,teacher_absent=excluded.teacher_absent,cleanliness_status=excluded.cleanliness_status,discipline_status=excluded.discipline_status,safety_status=excluded.safety_status,health_status=excluded.health_status,canteen_status=excluded.canteen_status,activity_note=excluded.activity_note,general_note=excluded.general_note,details_json=excluded.details_json,prepared_by=excluded.prepared_by,updated_at=excluded.updated_at WHERE excluded.updated_at>=opr_duty_reports.updated_at").bind(id,reportDate,weekNumber,schoolYear,text("dayName",30),teachers,integer("teacherTotal"),integer("teacherPresent"),integer("teacherAbsent"),text("cleanlinessStatus",30),text("disciplineStatus",30),text("safetyStatus",30),text("healthStatus",30),text("canteenStatus",30),text("activityNote"),text("generalNote"),detailsJson,preparedBy,createdAt,updatedAt).run();
    const record=await env.DB.prepare(`${select} WHERE report_date=?`).bind(reportDate).first<DutyRow>();
    return Response.json({ success:true,id,record });
  } catch (error) { console.error("OPR duty save",error); return Response.json({ error:"Laporan harian tidak dapat disimpan sekarang." },{ status:500 }); }
}
