import { env } from "cloudflare:workers";
import { portalActor, type PortalActor } from "../../server-auth";
import { skasDomains, skasEvidenceTypes, skasStandards } from "../../skas-catalog";

type EvidenceRow = {
  id:string; schoolYear:number; domain:string; unitName:string; evidenceType:string; title:string; standardCode:string;
  sourceType:string; sourceUrl:string; storageKey:string; mimeType:string; originalName:string; notes:string; status:string;
  submittedByEmail:string; submittedByName:string; verifiedByEmail:string; verifiedByName:string; verifiedAt:string;
  createdAt:string; updatedAt:string; sourceModule:string; sourceRecordId:string;
};

const clean=(value:unknown,max=220)=>typeof value==="string"?value.trim().slice(0,max):"";
const allowedStatus=new Set(["pending","approved","needs_info","rejected"]);
const allowedDomains=new Set<string>(skasDomains.map(item=>item.name));
const allowedEvidenceTypes=new Set<string>(skasEvidenceTypes);
const allowedStandards=new Set<string>(skasStandards.map(item=>item[0]));
const currentYear=()=>new Date().getFullYear();

let ready:Promise<void>|null=null;
async function prepare(){
  if(ready)return ready;
  ready=env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS skas_years (school_year INTEGER PRIMARY KEY,status TEXT NOT NULL DEFAULT 'draft',prepared_from INTEGER,activation_date TEXT,closed_at TEXT,created_by TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS skas_evidence (id TEXT PRIMARY KEY,school_year INTEGER NOT NULL,domain TEXT NOT NULL,unit_name TEXT NOT NULL,evidence_type TEXT NOT NULL,title TEXT NOT NULL,standard_code TEXT NOT NULL DEFAULT '',source_type TEXT NOT NULL,source_url TEXT NOT NULL DEFAULT '',storage_key TEXT NOT NULL DEFAULT '',mime_type TEXT NOT NULL DEFAULT '',original_name TEXT NOT NULL DEFAULT '',notes TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'pending',submitted_by_email TEXT NOT NULL,submitted_by_name TEXT NOT NULL,verified_by_email TEXT NOT NULL DEFAULT '',verified_by_name TEXT NOT NULL DEFAULT '',verified_at TEXT NOT NULL DEFAULT '',source_module TEXT NOT NULL DEFAULT '',source_record_id TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL,updated_at TEXT NOT NULL)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_skas_evidence_year_domain_status ON skas_evidence(school_year,domain,status)"),
    env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_skas_evidence_source_record ON skas_evidence(source_module,source_record_id) WHERE source_record_id!=''"),
  ]).then(()=>undefined).catch((error:unknown)=>{ready=null;throw error;});
  await ready;
  const year=currentYear(),now=new Date().toISOString();
  await env.DB.prepare("INSERT OR IGNORE INTO skas_years(school_year,status,prepared_from,activation_date,closed_at,created_by,created_at,updated_at) VALUES(?,'active',NULL,?,NULL,'system',?,?)").bind(year,now.slice(0,10),now,now).run();
}

async function requireAdmin(request:Request):Promise<PortalActor|null>{
  const actor=await portalActor(request);
  return actor&&["admin","super_admin"].includes(actor.role)?actor:null;
}

function denied(){return Response.json({error:"Pusat SK@S hanya boleh diakses oleh pentadbir."},{status:403});}
function safeKeyPart(value:string){return value.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80)||"fail";}
function mapDomain(category:string){if(category.startsWith("HEM")||category.includes("Hal Ehwal Murid"))return "Hal Ehwal Murid";if(category.startsWith("Kokurikulum")||category.includes("Kokurikulum"))return "Kokurikulum";if(category.startsWith("Kurikulum")||category.startsWith("Tingkatan Enam"))return "Kurikulum";if(category.startsWith("Pengurusan"))return "Pengurusan";return "Kekuatan Sekolah";}
function mapUnit(category:string,domain:string){const pieces=category.split(" · ").filter(Boolean);return pieces.at(-1)||skasDomains.find(item=>item.name===domain)?.units[0]||"Lain-lain";}

async function dashboard(year:number){
  const [years,evidence,candidates]=await Promise.all([
    env.DB.prepare("SELECT school_year AS schoolYear,status,prepared_from AS preparedFrom,activation_date AS activationDate,closed_at AS closedAt,created_at AS createdAt FROM skas_years ORDER BY school_year DESC").all(),
    env.DB.prepare("SELECT id,school_year AS schoolYear,domain,unit_name AS unitName,evidence_type AS evidenceType,title,standard_code AS standardCode,source_type AS sourceType,source_url AS sourceUrl,storage_key AS storageKey,mime_type AS mimeType,original_name AS originalName,notes,status,submitted_by_email AS submittedByEmail,submitted_by_name AS submittedByName,verified_by_email AS verifiedByEmail,verified_by_name AS verifiedByName,verified_at AS verifiedAt,created_at AS createdAt,updated_at AS updatedAt,source_module AS sourceModule,source_record_id AS sourceRecordId FROM skas_evidence WHERE school_year=? ORDER BY created_at DESC").bind(year).all<EvidenceRow>(),
    env.DB.prepare("SELECT r.id AS reportId,r.category,COALESCE(m.suggested_skas_json,'[]') AS suggestedSkasJson,COALESCE(m.payload_json,'{}') AS payloadJson,r.created_at AS createdAt,r.name,r.view_url AS viewUrl FROM opr_reports r LEFT JOIN opr_intake_metadata m ON m.report_id=r.id WHERE NOT EXISTS (SELECT 1 FROM skas_evidence s WHERE s.source_module='OPR' AND s.source_record_id=r.id) AND (m.review_status IS NULL OR m.review_status='pending') ORDER BY r.created_at DESC LIMIT 80").all<Record<string,string>>().catch(()=>({results:[]})),
  ]);
  return {years:years.results,evidence:evidence.results,candidates:candidates.results.map((row:Record<string,string>)=>{let payload:Record<string,unknown>={},suggestions:string[]=[];try{payload=JSON.parse(row.payloadJson||"{}");}catch{payload={};}try{suggestions=JSON.parse(row.suggestedSkasJson||"[]");}catch{suggestions=[];}return {...row,title:clean(payload.title,180)||row.name,suggestions};})};
}

export async function GET(request:Request){
  try{
    await prepare();const me=await requireAdmin(request);if(!me)return denied();
    const url=new URL(request.url),fileId=clean(url.searchParams.get("file"),80);
    if(fileId){
      const row=await env.DB.prepare("SELECT storage_key AS storageKey,mime_type AS mimeType,original_name AS originalName FROM skas_evidence WHERE id=?").bind(fileId).first<{storageKey:string;mimeType:string;originalName:string}>();
      if(!row?.storageKey)return Response.json({error:"Fail evidens tidak ditemui."},{status:404});
      const object=await env.FILES.get(row.storageKey);if(!object)return Response.json({error:"Fail evidens tidak ditemui."},{status:404});
      const download=url.searchParams.get("download")==="1",safe=row.originalName.replace(/[\r\n"\\]/g,"-");
      return new Response(object.body,{headers:{"Content-Type":row.mimeType||object.httpMetadata?.contentType||"application/octet-stream","Content-Disposition":`${download?"attachment":"inline"}; filename="${safe}"`,"Cache-Control":"private, max-age=300","X-Content-Type-Options":"nosniff"}});
    }
    const active=await env.DB.prepare("SELECT school_year AS schoolYear FROM skas_years WHERE status='active' ORDER BY school_year DESC LIMIT 1").first<{schoolYear:number}>();
    const requested=Number(new URL(request.url).searchParams.get("year")),year=Number.isInteger(requested)&&requested>=2020&&requested<=2100?requested:active?.schoolYear||currentYear();
    return Response.json({success:true,activeYear:active?.schoolYear||year,...await dashboard(year)},{headers:{"Cache-Control":"private, no-store"}});
  }catch(error){console.error("SKAS read",error);return Response.json({error:"Data Pusat SK@S tidak dapat dibaca sekarang."},{status:500});}
}

async function addEvidence(me:PortalActor,input:Record<string,unknown>,file?:File){
  const year=Number(input.schoolYear),domain=clean(input.domain,80),unitName=clean(input.unitName,120),evidenceType=clean(input.evidenceType,120),title=clean(input.title,180),standardCode=clean(input.standardCode,20),notes=clean(input.notes,1800),sourceUrl=clean(input.sourceUrl,1800);
  if(!Number.isInteger(year)||year<2020||year>2100||!allowedDomains.has(domain)||!unitName||!allowedEvidenceTypes.has(evidenceType)||!title||!allowedStandards.has(standardCode))throw new Error("Maklumat evidens belum lengkap atau tidak sah.");
  const id=crypto.randomUUID(),now=new Date().toISOString();let storageKey="",mimeType="",originalName="",sourceType="link";
  if(file){
    const allowedFiles:Record<string,string>={"application/pdf":"pdf","image/jpeg":"jpg","image/png":"png","image/webp":"webp","application/vnd.openxmlformats-officedocument.wordprocessingml.document":"docx","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":"xlsx","application/vnd.openxmlformats-officedocument.presentationml.presentation":"pptx"};
    mimeType=file.type;originalName=file.name.slice(0,180);if(!allowedFiles[mimeType])throw new Error("Fail mesti dalam format PDF, JPG, PNG, WebP, DOCX, XLSX atau PPTX.");if(file.size>8_000_000)throw new Error("Saiz fail mestilah 8 MB atau kurang.");
    const bytes=new Uint8Array(await file.arrayBuffer());if(!bytes.length)throw new Error("Fail yang dipilih kosong.");
    const ext=allowedFiles[mimeType];storageKey=`skas/${year}/${safeKeyPart(domain)}/${id}/${safeKeyPart(originalName.replace(/\.[^.]+$/,"") )}.${ext}`;
    await env.FILES.put(storageKey,bytes,{httpMetadata:{contentType:mimeType}});sourceType="upload";
  }else if(!/^https:\/\//i.test(sourceUrl)){throw new Error("Masukkan pautan HTTPS Google Drive atau sumber rasmi.");}
  await env.DB.prepare("INSERT INTO skas_evidence(id,school_year,domain,unit_name,evidence_type,title,standard_code,source_type,source_url,storage_key,mime_type,original_name,notes,status,submitted_by_email,submitted_by_name,verified_by_email,verified_by_name,verified_at,source_module,source_record_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,'pending',?,?,'','','','','',?,?)")
    .bind(id,year,domain,unitName,evidenceType,title,standardCode,sourceType,sourceUrl,storageKey,mimeType,originalName,notes,me.email,me.name,now,now).run();
  return id;
}

export async function POST(request:Request){
  try{
    await prepare();const me=await requireAdmin(request);if(!me)return denied();const contentType=request.headers.get("content-type")||"";
    if(contentType.includes("multipart/form-data")){
      const form=await request.formData(),file=form.get("file");const input=Object.fromEntries([...form.entries()].filter(([key])=>key!=="file").map(([key,value])=>[key,String(value)]));
      const id=await addEvidence(me,input,file instanceof File?file:undefined);return Response.json({success:true,id});
    }
    const input=await request.json() as Record<string,unknown>,action=clean(input.action,40),now=new Date().toISOString();
    if(action==="create_year"){
      const year=Number(input.schoolYear),from=Number(input.preparedFrom);if(!Number.isInteger(year)||year<2020||year>2100)return Response.json({error:"Tahun tidak sah."},{status:400});
      await env.DB.prepare("INSERT OR IGNORE INTO skas_years(school_year,status,prepared_from,activation_date,closed_at,created_by,created_at,updated_at) VALUES(?,'draft',?,NULL,NULL,?,?,?)").bind(year,Number.isInteger(from)?from:null,me.email,now,now).run();return Response.json({success:true});
    }
    if(action==="activate_year"){
      const year=Number(input.schoolYear);if(!Number.isInteger(year))return Response.json({error:"Tahun tidak sah."},{status:400});
      await env.DB.batch([env.DB.prepare("UPDATE skas_years SET status='closed',closed_at=?,updated_at=? WHERE status='active' AND school_year!=?").bind(now,now,year),env.DB.prepare("UPDATE skas_years SET status='active',activation_date=?,closed_at=NULL,updated_at=? WHERE school_year=?").bind(now.slice(0,10),now,year)]);return Response.json({success:true});
    }
    if(action==="import_candidate"){
      const reportId=clean(input.reportId,120),row=await env.DB.prepare("SELECT r.category,COALESCE(m.suggested_skas_json,'[]') AS suggestions,COALESCE(m.payload_json,'{}') AS payload,r.name,r.view_url AS viewUrl FROM opr_reports r LEFT JOIN opr_intake_metadata m ON m.report_id=r.id WHERE r.id=? AND NOT EXISTS (SELECT 1 FROM skas_evidence s WHERE s.source_module='OPR' AND s.source_record_id=r.id)").bind(reportId).first<Record<string,string>>();
      if(!row)return Response.json({error:"Calon OPR tidak ditemui atau telah diproses."},{status:404});let payload:Record<string,unknown>={},suggestions:string[]=[];try{payload=JSON.parse(row.payload||"{}");}catch{payload={};}try{suggestions=JSON.parse(row.suggestions||"[]");}catch{suggestions=[];}const domain=mapDomain(row.category),year=Number(input.schoolYear)||currentYear(),standard=clean(input.standardCode,20)||suggestions.find(value=>allowedStandards.has(value))||skasDomains.find(item=>item.name===domain)?.standard.split(" ")[0]||"2",id=crypto.randomUUID();
      await env.DB.prepare("INSERT INTO skas_evidence(id,school_year,domain,unit_name,evidence_type,title,standard_code,source_type,source_url,storage_key,mime_type,original_name,notes,status,submitted_by_email,submitted_by_name,verified_by_email,verified_by_name,verified_at,source_module,source_record_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,'portal',?,'','','','Cadangan automatik daripada OPR','pending',?,?,'','','','OPR',?,?,?)").bind(id,year,domain,mapUnit(row.category,domain),"Program, aktiviti atau OPR",clean(payload.title,180)||row.name,standard,row.viewUrl,me.email,me.name,reportId,now,now).run();
      await env.DB.prepare("UPDATE opr_intake_metadata SET review_status='imported',updated_at=? WHERE report_id=?").bind(now,reportId).run();return Response.json({success:true,id});
    }
    const id=await addEvidence(me,input);return Response.json({success:true,id});
  }catch(error){console.error("SKAS create",error);return Response.json({error:error instanceof Error?error.message:"Evidens tidak dapat disimpan."},{status:400});}
}

export async function PATCH(request:Request){
  try{await prepare();const me=await requireAdmin(request);if(!me)return denied();const input=await request.json() as Record<string,unknown>,id=clean(input.id,80),status=clean(input.status,30),notes=clean(input.notes,1800);if(!id||!allowedStatus.has(status))return Response.json({error:"Tindakan tidak sah."},{status:400});const now=new Date().toISOString();await env.DB.prepare("UPDATE skas_evidence SET status=?,notes=CASE WHEN ?!='' THEN ? ELSE notes END,verified_by_email=?,verified_by_name=?,verified_at=?,updated_at=? WHERE id=?").bind(status,notes,notes,me.email,me.name,now,now,id).run();return Response.json({success:true});}catch(error){console.error("SKAS review",error);return Response.json({error:"Status evidens tidak dapat dikemas kini."},{status:500});}
}

export async function DELETE(request:Request){
  try{await prepare();const me=await requireAdmin(request);if(!me)return denied();const id=clean(new URL(request.url).searchParams.get("id"),80),row=await env.DB.prepare("SELECT storage_key AS storageKey,source_module AS sourceModule,source_record_id AS sourceRecordId FROM skas_evidence WHERE id=?").bind(id).first<{storageKey:string;sourceModule:string;sourceRecordId:string}>();if(!row)return Response.json({error:"Evidens tidak ditemui."},{status:404});if(row.storageKey)await env.FILES.delete(row.storageKey);await env.DB.prepare("DELETE FROM skas_evidence WHERE id=?").bind(id).run();if(row.sourceModule==="OPR"&&row.sourceRecordId)await env.DB.prepare("UPDATE opr_intake_metadata SET review_status='pending',updated_at=? WHERE report_id=?").bind(new Date().toISOString(),row.sourceRecordId).run();return Response.json({success:true});}catch(error){console.error("SKAS delete",error);return Response.json({error:"Evidens tidak dapat dipadam."},{status:500});}
}
