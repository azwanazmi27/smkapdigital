import { env } from "cloudflare:workers";
import { portalActor, type PortalActor } from "../../server-auth";
import { skasDomains, skasEvidenceTypes, skasSignalProfile, skasStandards, suggestSkasMappings, type SkasMappingSuggestion } from "../../skas-catalog";

type EvidenceRow = {
  id:string; schoolYear:number; domain:string; unitName:string; evidenceType:string; title:string; standardCode:string;
  sourceType:string; sourceUrl:string; storageKey:string; mimeType:string; originalName:string; notes:string; status:string;
  submittedByEmail:string; submittedByName:string; verifiedByEmail:string; verifiedByName:string; verifiedAt:string;
  createdAt:string; updatedAt:string; sourceModule:string; sourceRecordId:string;
};
type MappingRuleRow={category:string;signalProfile:string;domain:string;unitName:string;evidenceType:string;standardCode:string};

const clean=(value:unknown,max=220)=>typeof value==="string"?value.trim().slice(0,max):"";
const allowedStatus=new Set(["pending","approved","needs_info","rejected"]);
const allowedDomains=new Set<string>(skasDomains.map(item=>item.name));
const allowedEvidenceTypes=new Set<string>(skasEvidenceTypes);
const allowedStandards=new Set<string>(skasStandards.map(item=>item[0]));
const allowedUnit=(domain:string,unitName:string)=>skasDomains.some(item=>item.name===domain&&item.units.some(unit=>unit===unitName));
const allowedStandardDomain=(standard:string,domain:string)=>standard==="1"?domain==="Pengurusan":standard==="2"?["Pengurusan","Kekuatan Sekolah"].includes(domain):standard==="3.1"?domain==="Kurikulum":standard==="3.2"?domain==="Kokurikulum":standard==="3.3"?domain==="Hal Ehwal Murid":standard==="4"?domain==="Pengajaran dan Pembelajaran":standard.startsWith("5.")?domain==="Pencapaian":false;
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

function parseJson(value:unknown,fallback:unknown){try{return JSON.parse(clean(value,20_000)||"");}catch{return fallback;}}

function candidateMappings(category:string,title:string,payload:Record<string,unknown>,stored:unknown,rule?:MappingRuleRow){
  const automatic=suggestSkasMappings({category,title,metadata:payload,storedSuggestions:stored});
  if(!rule)return automatic;
  const learned:SkasMappingSuggestion={standardCode:rule.standardCode,standardLabel:skasStandards.find(([code])=>code===rule.standardCode)?.[1]||"Standard sekolah",domain:rule.domain as SkasMappingSuggestion["domain"],unitName:rule.unitName,evidenceType:rule.evidenceType as SkasMappingSuggestion["evidenceType"],reason:"Mengikut pemetaan manual pentadbir terdahulu bagi kategori dan jenis rekod yang sama.",confidence:"tinggi"};
  return [learned,...automatic.filter(item=>`${item.standardCode}|${item.domain}|${item.unitName}`!==`${learned.standardCode}|${learned.domain}|${learned.unitName}`)].slice(0,3);
}

async function dashboard(year:number){
  const [years,evidence,candidates,rules]=await Promise.all([
    env.DB.prepare("SELECT school_year AS schoolYear,status,prepared_from AS preparedFrom,activation_date AS activationDate,closed_at AS closedAt,created_at AS createdAt FROM skas_years ORDER BY school_year DESC").all(),
    env.DB.prepare("SELECT id,school_year AS schoolYear,domain,unit_name AS unitName,evidence_type AS evidenceType,title,standard_code AS standardCode,source_type AS sourceType,source_url AS sourceUrl,storage_key AS storageKey,mime_type AS mimeType,original_name AS originalName,notes,status,submitted_by_email AS submittedByEmail,submitted_by_name AS submittedByName,verified_by_email AS verifiedByEmail,verified_by_name AS verifiedByName,verified_at AS verifiedAt,created_at AS createdAt,updated_at AS updatedAt,source_module AS sourceModule,source_record_id AS sourceRecordId FROM skas_evidence WHERE school_year=? AND status!='source_deleted' ORDER BY created_at DESC").bind(year).all<EvidenceRow>(),
    env.DB.prepare("SELECT r.id AS reportId,r.category,COALESCE(m.suggested_skas_json,'[]') AS suggestedSkasJson,COALESCE(m.payload_json,'{}') AS payloadJson,r.created_at AS createdAt,r.name,r.view_url AS viewUrl FROM opr_reports r LEFT JOIN opr_intake_metadata m ON m.report_id=r.id WHERE NOT EXISTS (SELECT 1 FROM skas_evidence s WHERE s.source_module='OPR' AND s.source_record_id=r.id) AND (m.review_status IS NULL OR m.review_status='pending') ORDER BY r.created_at DESC LIMIT 80").all<Record<string,string>>().catch(()=>({results:[]})),
    env.DB.prepare("SELECT category,signal_profile AS signalProfile,domain,unit_name AS unitName,evidence_type AS evidenceType,standard_code AS standardCode FROM skas_mapping_rules").all<MappingRuleRow>(),
  ]);
  const ruleMap=new Map(rules.results.map(rule=>[`${rule.category}|${rule.signalProfile}`,rule]));
  return {years:years.results,evidence:evidence.results,candidates:candidates.results.map((row:Record<string,string>)=>{const payload=parseJson(row.payloadJson,{}) as Record<string,unknown>,stored=parseJson(row.suggestedSkasJson,[]),title=clean(payload.title,180)||row.name,profile=skasSignalProfile({category:row.category,title,metadata:payload}),rule=ruleMap.get(`${row.category}|${profile}`);return {...row,title,mappings:candidateMappings(row.category,title,payload,stored,rule)};})};
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
      if(!row)return Response.json({error:"Calon OPR tidak ditemui atau telah diproses."},{status:404});
      const payload=parseJson(row.payload,{}) as Record<string,unknown>,stored=parseJson(row.suggestions,[]),title=clean(payload.title,180)||row.name,mappings=candidateMappings(row.category,title,payload,stored);
      const requested=input.mapping&&typeof input.mapping==="object"?input.mapping as Partial<SkasMappingSuggestion>:null,chosen=requested&&allowedStandards.has(clean(requested.standardCode,20))&&allowedDomains.has(clean(requested.domain,80))?requested:mappings[0];
      if(!chosen)return Response.json({error:"Cadangan pemetaan tidak dapat ditentukan."},{status:400});
      const domain=clean(chosen.domain,80),unitName=clean(chosen.unitName,120),evidenceType=clean(chosen.evidenceType,120),standard=clean(chosen.standardCode,20),manual=input.manual===true,remember=manual&&input.remember===true,reason=manual?"Pemetaan manual oleh pentadbir.":clean(chosen.reason,500),year=Number(input.schoolYear)||currentYear(),id=crypto.randomUUID();
      if(!allowedDomains.has(domain)||!allowedUnit(domain,unitName)||!allowedStandards.has(standard)||!allowedStandardDomain(standard,domain)||!allowedEvidenceTypes.has(evidenceType))return Response.json({error:"Pemetaan tidak sah atau standard, bidang dan unit tidak sepadan."},{status:400});
      const writes=[env.DB.prepare("INSERT INTO skas_evidence(id,school_year,domain,unit_name,evidence_type,title,standard_code,source_type,source_url,storage_key,mime_type,original_name,notes,status,submitted_by_email,submitted_by_name,verified_by_email,verified_by_name,verified_at,source_module,source_record_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,'portal',?,'','','',?,'pending',?,?,'','','','OPR',?,?,?)").bind(id,year,domain,unitName,evidenceType,title,standard,row.viewUrl,`${manual?"Pemetaan manual":"Pemetaan automatik"}: ${reason}`,me.email,me.name,reportId,now,now),env.DB.prepare("UPDATE opr_intake_metadata SET review_status='imported',updated_at=? WHERE report_id=?").bind(now,reportId)];
      if(remember){const profile=skasSignalProfile({category:row.category,title,metadata:payload});writes.push(env.DB.prepare("INSERT INTO skas_mapping_rules(id,category,signal_profile,domain,unit_name,evidence_type,standard_code,updated_by_email,updated_by_name,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(category,signal_profile) DO UPDATE SET domain=excluded.domain,unit_name=excluded.unit_name,evidence_type=excluded.evidence_type,standard_code=excluded.standard_code,updated_by_email=excluded.updated_by_email,updated_by_name=excluded.updated_by_name,updated_at=excluded.updated_at").bind(crypto.randomUUID(),row.category,profile,domain,unitName,evidenceType,standard,me.email,me.name,now,now));}
      await env.DB.batch(writes);
      return Response.json({success:true,id});
    }
    const id=await addEvidence(me,input);return Response.json({success:true,id});
  }catch(error){console.error("SKAS create",error);return Response.json({error:error instanceof Error?error.message:"Evidens tidak dapat disimpan."},{status:400});}
}

export async function PATCH(request:Request){
  try{await prepare();const me=await requireAdmin(request);if(!me)return denied();const input=await request.json() as Record<string,unknown>,id=clean(input.id,80),status=clean(input.status,30),notes=clean(input.notes,1800);if(!id||!allowedStatus.has(status))return Response.json({error:"Tindakan tidak sah."},{status:400});const now=new Date().toISOString();await env.DB.prepare("UPDATE skas_evidence SET status=?,notes=CASE WHEN ?!='' THEN ? ELSE notes END,verified_by_email=?,verified_by_name=?,verified_at=?,updated_at=? WHERE id=? AND status!='source_deleted'").bind(status,notes,notes,me.email,me.name,now,now,id).run();return Response.json({success:true});}catch(error){console.error("SKAS review",error);return Response.json({error:"Status evidens tidak dapat dikemas kini."},{status:500});}
}

export async function DELETE(request:Request){
  try{await prepare();const me=await requireAdmin(request);if(!me)return denied();const id=clean(new URL(request.url).searchParams.get("id"),80),row=await env.DB.prepare("SELECT storage_key AS storageKey,source_module AS sourceModule,source_record_id AS sourceRecordId FROM skas_evidence WHERE id=?").bind(id).first<{storageKey:string;sourceModule:string;sourceRecordId:string}>();if(!row)return Response.json({error:"Evidens tidak ditemui."},{status:404});if(row.storageKey)await env.FILES.delete(row.storageKey);await env.DB.prepare("DELETE FROM skas_evidence WHERE id=?").bind(id).run();if(row.sourceModule==="OPR"&&row.sourceRecordId)await env.DB.prepare("UPDATE opr_intake_metadata SET review_status='pending',updated_at=? WHERE report_id=?").bind(new Date().toISOString(),row.sourceRecordId).run();return Response.json({success:true});}catch(error){console.error("SKAS delete",error);return Response.json({error:"Evidens tidak dapat dipadam."},{status:500});}
}
