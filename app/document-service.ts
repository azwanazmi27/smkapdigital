import { env } from "cloudflare:workers";

export const EPANITIA_CATEGORIES = [
  ["01", "01 — Pengurusan Am"], ["02", "02 — Perancangan Strategik"], ["03", "03 — Mesyuarat"],
  ["04", "04 — Kurikulum dan Pentaksiran"], ["05", "05 — Perancangan dan Program"], ["06", "06 — Kewangan PCG"],
  ["07", "07 — Pembangunan Profesional"], ["08", "08 — Laporan dan Penilaian"],
] as const;

type Actor={id:string;email:string;name:string;role:string};
type DriveFile={id:string;name:string;viewUrl:string;mimeType?:string;fileSize?:number;folderId?:string;checksum?:string};
type RegisterInput={title:string;documentType:string;sourceModule:string;schoolYear:number;panelId?:string;programmeId?:string;status?:string;file:DriveFile;metadata?:Record<string,unknown>};

const now=()=>new Date().toISOString();
const id=(prefix:string)=>`${prefix}_${crypto.randomUUID()}`;
const yearOk=(value:number)=>Number.isInteger(value)&&value>=2020&&value<=2100;

function defaultMappings(input:RegisterInput){
  const type=input.documentType.toLowerCase(),source=input.sourceModule.toLowerCase();
  const explicit=typeof input.metadata?.epanitiaCategory==="string"&&/^(0[1-8])$/.test(input.metadata.epanitiaCategory)?input.metadata.epanitiaCategory:"";
  const epanitia=explicit|| (type.includes("lantikan")?"01":type.includes("panggilan")?"03":type.includes("nota minta")||type.includes("invois")||type.includes("resit")?"06":type.includes("takwim tahunan")?"05":type.includes("strategik")||type.includes("taktikal")||type.includes("operasi")?"02":type.includes("plc")||type.includes("ladap")?"07":type.includes("laporan tahunan")?"08":source.includes("opr")||type.includes("opr")||type.includes("kertas kerja")?"05":type.includes("minit")?"03":type.includes("pentaksiran")?"04":type.includes("carta organisasi")?"01":"");
  const mappings=[{module:"epanitia",category:epanitia,standard:"",status:input.status==="approved"?"active":"draft"}];
  if(source.includes("opr"))mappings.push({module:"management",category:"",standard:"",status:input.status==="approved"?"active":"draft"});
  const suggestions=Array.isArray(input.metadata?.suggestedSkas)?input.metadata!.suggestedSkas.filter((v):v is string=>typeof v==="string"):[];
  for(const standard of suggestions)mappings.push({module:"skas",category:"",standard,status:input.status==="approved"?"pending_review":"draft"});
  return mappings;
}

export async function registerDocument(actor:Actor,input:RegisterInput){
  if(!input.title.trim()||!input.documentType.trim()||!input.sourceModule.trim()||!yearOk(input.schoolYear)||!/^[\w-]{10,160}$/.test(input.file.id))throw new Error("Metadata dokumen tidak lengkap");
  const existing=await env.DB.prepare("SELECT document_id AS documentId,id AS versionId FROM document_versions WHERE drive_file_id=?").bind(input.file.id).first<{documentId:string;versionId:string}>();
  if(existing)return {documentId:existing.documentId,versionId:existing.versionId,created:false};
  const documentId=id("doc"),versionId=id("ver"),createdAt=now(),status=input.status||"draft",programmeId=input.programmeId||"";
  const statements=[
    env.DB.prepare("INSERT INTO documents (id,school_id,academic_year_id,panel_id,programme_id,source_module,document_type,title,reference_number,status,current_version_id,owner_user_id,created_by,created_at,updated_at,archived_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(documentId,"CRA8001",input.schoolYear,input.panelId||"",programmeId,input.sourceModule,input.documentType,input.title.trim(),"",status,versionId,actor.id||actor.email,actor.email,createdAt,createdAt,""),
    env.DB.prepare("INSERT INTO document_versions (id,document_id,version_number,template_version_id,drive_file_id,drive_folder_id,drive_url,filename,mime_type,file_size,checksum,created_by,created_at,approval_status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(versionId,documentId,1,"",input.file.id,input.file.folderId||"",input.file.viewUrl,input.file.name,input.file.mimeType||"application/pdf",input.file.fileSize||0,input.file.checksum||"",actor.email,createdAt,status),
  ];
  if(programmeId)statements.push(env.DB.prepare("INSERT OR IGNORE INTO programme_documents (programme_id,document_id,relationship_type) VALUES (?,?,?)").bind(programmeId,documentId,input.documentType));
  for(const mapping of defaultMappings(input))statements.push(env.DB.prepare("INSERT OR IGNORE INTO document_mappings (id,document_id,document_version_id,destination_module,destination_category_id,destination_standard_id,mapping_status,mapped_by,mapped_at,reviewed_by,reviewed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").bind(id("map"),documentId,versionId,mapping.module,mapping.category,mapping.standard,mapping.status,actor.email,createdAt,"",""));
  await env.DB.batch(statements);
  return {documentId,versionId,created:true};
}

export async function addDocumentVersion(actor:Actor,documentId:string,file:DriveFile,status="draft"){
  const doc=await env.DB.prepare("SELECT id,owner_user_id AS ownerUserId,status FROM documents WHERE id=? AND archived_at=''").bind(documentId).first<{id:string;ownerUserId:string;status:string}>();if(!doc)throw new Error("Dokumen induk tidak ditemui");
  if(!["admin","super_admin"].includes(actor.role)&&![actor.id,actor.email].includes(doc.ownerUserId))throw new Error("Anda tidak dibenarkan menambah versi dokumen ini.");
  const duplicate=await env.DB.prepare("SELECT id,document_id AS documentId FROM document_versions WHERE drive_file_id=?").bind(file.id).first<{id:string;documentId:string}>();if(duplicate){if(duplicate.documentId!==documentId)throw new Error("Fail sudah didaftarkan pada rekod lain.");return {versionId:duplicate.id,created:false};}
  const count=await env.DB.prepare("SELECT COALESCE(MAX(version_number),0) AS number FROM document_versions WHERE document_id=?").bind(documentId).first<{number:number}>();
  const versionId=id("ver"),createdAt=now(),versionNumber=(count?.number||0)+1;
  await env.DB.batch([
    env.DB.prepare("INSERT INTO document_versions (id,document_id,version_number,template_version_id,drive_file_id,drive_folder_id,drive_url,filename,mime_type,file_size,checksum,created_by,created_at,approval_status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(versionId,documentId,versionNumber,"",file.id,file.folderId||"",file.viewUrl,file.name,file.mimeType||"application/pdf",file.fileSize||0,file.checksum||"",actor.email,createdAt,status),
    env.DB.prepare("UPDATE documents SET updated_at=?,current_version_id=CASE WHEN status='draft' THEN ? ELSE current_version_id END WHERE id=?").bind(createdAt,versionId,documentId),
    env.DB.prepare("UPDATE document_mappings SET document_version_id=? WHERE document_id=? AND mapping_status IN ('draft','pending') AND EXISTS (SELECT 1 FROM documents d WHERE d.id=document_mappings.document_id AND d.status='draft')").bind(versionId,documentId),
  ]);
  return {versionId,versionNumber,created:true};
}

export async function approveDocument(actor:Actor,documentId:string,versionId:string){
  const stamp=now();
  await env.DB.batch([
    env.DB.prepare("UPDATE document_versions SET approval_status='approved' WHERE id=? AND document_id=?").bind(versionId,documentId),
    env.DB.prepare("UPDATE documents SET status='approved',current_version_id=?,updated_at=? WHERE id=?").bind(versionId,stamp,documentId),
    env.DB.prepare("UPDATE document_mappings SET document_version_id=?,mapping_status=CASE WHEN destination_module='skas' THEN 'pending_review' ELSE 'active' END,reviewed_by=?,reviewed_at=? WHERE document_id=?").bind(versionId,actor.email,stamp,documentId),
  ]);
}

