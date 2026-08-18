import { env } from "cloudflare:workers";

const form6 = ["DESFITRI BINTI MOHD NASIR","MOHD FADIL BIN ABDULLAH","NOOR AZWAN BIN AZMI","NOR ATIKAH BINTI MOHAMED","NOR RABIATUL ADAWIAH BINTI RAMELI","NORHASHIDAH BINTI MOHD NORHANI","SARIZAN BINTI SULONG","SITI NUR AISYAH BINTI MOHD NAYAI"];
const mainstream = ["AFFROSH KHANA BT AHMAD","AHMAD NAJIB BIN AZMI","AINUL HUSNA ABDUL SAMAD","AMIRUL AMIN ZULKIFLE AMIN","AZHAR BIN MOHAMED","AZLIZA ALIAS","AZMAN KASSIM","ENGKU NUR AISYAH BINTI CHE ENGKU MUHAMMAD","FARAH HASNOOR JAAFAR","FAZIYAH ISMAIL","HABIBAH BT ABD AZIZ","HAMIZON BERAHIM","HASNI BIN MAMAT","MAHMUD SABRI DAUD","MAISARAH BINTI ABD SAMAD","MAIZURA MAIDIN","MOHAMMAD ZAHARI BIN KHALIB","MOHASAFRA MOHD SHARIF","MOHD IZZUDIN BIN ISHAK","MOHD RASHIDI ABDUL LATIFF","MOHD RAZLY BIN ABDUL RAZAMAN","MUHAMAD AL AMIN BIN RAMLI","MUHAMAD SHUKRI ABDUL GHANI","MUHAMMAD AMIEN HAIQAL MAHMUD","MUHAMMAD FAHMI IDHAM BIN MUSA","MUHAMMAD RAFIQ FARHAN B NOORDIN","MUZAYANA ABD MANAN","NAJAH AMIROH BT ROHANI","NOOR AMIRA SYAMILA BINTI AHMAD NASIR","NOR AZITA BT MAMAT","NOR FADHILAH HANANI BINTI MOHD RAZALI","NOR FAIZAH BT KAMARUDDIN","NOR SYAKIRAH BINTI BAHRU","NORASYIKIN BT MOHD ANUAR","NORFATIMAWATI MAHMOOD","NORZALINAWATI MUHAMAD AZHA","NUR AISYAH MANSOR","NUR ZATUL AYUNI MOHAMAD ALDARAWI","NURAISURA IBRAHIM","NURUL ARISYA MOHD BADLI","RAHIMAH BINTI ABD HALIM","ROS SELAI BINTI HARUN","SHAHIRUDDIN IBRAHIM","SHAMSUL HAZLAN B MOHD KAMAL HAKIM","SHARMA ELIANA SHAFIE","SITI ELIANA BTE ROSLI","SITI NORAINAA BT MOHD ZAIDI","SITI NORFAZILAH MAT NOR","SURIHA SADI","TENGKU NOORMUNIRA BT TENGKU KAMARULZAMAN","TG MOHD HILMI TG MOHD DAUD","WAN HARUN BIN WAN ALI","WAN MAYZAITU WAHIDAH","ZANILAH ZAINAL"];

async function prepare() {
  const db = env.DB;
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS teachers (id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, created_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS absences (id TEXT PRIMARY KEY, teacher_id TEXT NOT NULL, teacher_name TEXT NOT NULL, category TEXT NOT NULL, absence_date TEXT NOT NULL, end_date TEXT, reason TEXT NOT NULL, duration TEXT NOT NULL, start_time TEXT, end_time TEXT, note TEXT NOT NULL DEFAULT '', relief_status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_absences_date ON absences(absence_date, end_date)"),
  ]);
  const count = await db.prepare("SELECT COUNT(*) AS total FROM teachers").first<{ total: number }>();
  if (!count?.total) {
    const now = new Date().toISOString();
    await db.batch([...form6.map((name, index) => db.prepare("INSERT OR IGNORE INTO teachers (id,name,category,created_at) VALUES (?,?,?,?)").bind(`form6-${index + 1}`, name, "form6", now)), ...mainstream.map((name, index) => db.prepare("INSERT OR IGNORE INTO teachers (id,name,category,created_at) VALUES (?,?,?,?)").bind(`main-${index + 1}`, name, "mainstream", now))]);
  }
}

export async function GET(request: Request) {
  try {
    await prepare(); const resource = new URL(request.url).searchParams.get("resource");
    if (resource === "teachers") { const result = await env.DB.prepare("SELECT id,name,category,created_at AS createdAt FROM teachers ORDER BY category,name").all(); return Response.json({ teachers: result.results }); }
    if (resource === "absences") { const result = await env.DB.prepare("SELECT id,teacher_id AS teacherId,teacher_name AS teacherName,category,absence_date AS absenceDate,end_date AS endDate,reason,duration,start_time AS startTime,end_time AS endTime,note,relief_status AS reliefStatus,created_at AS createdAt,updated_at AS updatedAt FROM absences ORDER BY absence_date DESC,created_at DESC").all(); return Response.json({ records: result.results }); }
    return Response.json({ error: "Sumber tidak sah" }, { status: 400 });
  } catch (error) { console.error("E-Keberadaan read", error); return Response.json({ error: "Data E-Keberadaan tidak dapat dibaca sekarang." }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    await prepare(); const resource = new URL(request.url).searchParams.get("resource"); if (resource !== "absences") return Response.json({ error: "Sumber tidak sah" }, { status: 400 });
    const body = await request.json() as Record<string, unknown>; const required = ["id","teacherId","teacherName","category","absenceDate","reason","duration"];
    if (!required.every((key) => typeof body[key] === "string" && String(body[key]).trim())) return Response.json({ error: "Maklumat ketidakhadiran belum lengkap." }, { status: 400 });
    const teacher = await env.DB.prepare("SELECT id,name,category FROM teachers WHERE id=?").bind(body.teacherId).first<{id:string;name:string;category:string}>();
    if (!teacher || teacher.name !== body.teacherName || teacher.category !== body.category) return Response.json({ error: "Nama guru tidak sah." }, { status: 400 });
    const clean = (value: unknown, max = 250) => typeof value === "string" ? value.trim().slice(0, max) : null; const now = new Date().toISOString();
    await env.DB.prepare("INSERT INTO absences (id,teacher_id,teacher_name,category,absence_date,end_date,reason,duration,start_time,end_time,note,relief_status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(clean(body.id,80),teacher.id,teacher.name,teacher.category,clean(body.absenceDate,10),clean(body.endDate,10),clean(body.reason,80),clean(body.duration,20),clean(body.startTime,5),clean(body.endTime,5),clean(body.note,500) || "","pending",now,now).run();
    return Response.json({ success: true });
  } catch (error) { console.error("E-Keberadaan create", error); return Response.json({ error: "Laporan tidak dapat disimpan sekarang." }, { status: 500 }); }
}
