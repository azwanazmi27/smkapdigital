import { env } from "cloudflare:workers";
import { portalActor } from "../../server-auth";
import { addDocumentVersion, approveDocument, registerDocument } from "../../document-service";

const allowedModules=new Set(["epanitia","management","skas"]);
const clean=(v:unknown,n=180)=>typeof v==="string"?v.trim().slice(0,n):"";
const admin=(role:string)=>role==="admin"||role==="super_admin";

export async function GET(request:Request){
  const actor=await portalActor(request);if(!actor)return Response.json({error:"Sila log masuk dengan akaun sekolah."},{status:401});
  const url=new URL(request.url),year=Number(url.searchParams.get("year")||new Date().getFullYear()),module=clean(url.searchParams.get("module"),30);
  if(!Number.isInteger(year)||year<2020||year>2100)return Response.json({error:"Tahun tidak sah."},{status:400});
  const seeded=await env.DB.prepare("SELECT COUNT(*) AS count FROM documents WHERE academic_year_id=?").bind(year).first<{count:number}>();
  if(!seeded?.count){
    const legacy=await env.DB.prepare("SELECT r.id,r.name,r.category,r.view_url AS viewUrl,COALESCE(m.payload_json,'{}') AS payload,COALESCE(m.suggested_skas_json,'[]') AS suggested FROM opr_reports r LEFT JOIN opr_intake_metadata m ON m.report_id=r.id WHERE substr(COALESCE(json_extract(m.payload_json,'$.programDate'),r.name),1,4)=? LIMIT 200").bind(String(year)).all<{id:string;name:string;category:string;viewUrl:string;payload:string;suggested:string}>();
    for(const item of legacy.results){let metadata:Record<string,unknown>={};try{metadata=JSON.parse(item.payload)}catch{}let suggestedSkas:string[]=[];try{suggestedSkas=JSON.parse(item.suggested)}catch{}await registerDocument(actor,{title:clean(metadata.title)||item.name.replace(/\.pdf$/i,""),documentType:"Laporan OPR",sourceModule:"Pusat OPR",schoolYear:year,panelId:item.category,status:"draft",file:{id:item.id,name:item.name,viewUrl:item.viewUrl,mimeType:"application/pdf"},metadata:{suggestedSkas}})}
  }
  const filter=module&&allowedModules.has(module)?"AND m.destination_module=?":"";
  const args=module&&allowedModules.has(module)?[year,module]:[year];
  const query=`SELECT d.id,d.title,d.document_type AS documentType,d.source_module AS sourceModule,d.status,d.panel_id AS panelId,d.programme_id AS programmeId,d.updated_at AS updatedAt,v.id AS versionId,v.version_number AS versionNumber,v.drive_file_id AS driveFileId,v.drive_url AS driveUrl,v.filename,m.destination_module AS destinationModule,m.destination_category_id AS destinationCategoryId,m.destination_standard_id AS destinationStandardId,m.mapping_status AS mappingStatus FROM documents d JOIN document_versions v ON v.id=d.current_version_id LEFT JOIN document_mappings m ON m.document_id=d.id WHERE d.academic_year_id=? AND d.archived_at='' ${filter} ORDER BY d.updated_at DESC`;
  const rows=await env.DB.prepare(query).bind(...args).all();
  const stats=await env.DB.prepare("SELECT COUNT(DISTINCT d.id) AS documents,COUNT(m.id) AS mappings,SUM(CASE WHEN m.mapping_status IN ('pending','pending_review') THEN 1 ELSE 0 END) AS pending FROM documents d LEFT JOIN document_mappings m ON m.document_id=d.id WHERE d.academic_year_id=? AND d.archived_at=''").bind(year).first();
  return Response.json({documents:rows.results,stats},{headers:{"Cache-Control":"private, no-store"}});
}

export async function POST(request:Request){
  const actor=await portalActor(request);if(!actor)return Response.json({error:"Sila log masuk."},{status:401});
  try{
    const body=await request.json() as Record<string,unknown>,action=clean(body.action,40);
    if(action==="register")return Response.json({ok:true,...await registerDocument(actor,body.input as never)});
    if(action==="new-version")return Response.json({ok:true,...await addDocumentVersion(actor,clean(body.documentId,120),body.file as never,clean(body.status,30)||"draft")});
    if(action==="approve"){if(!admin(actor.role))return Response.json({error:"Hanya pentadbir boleh meluluskan dokumen."},{status:403});await approveDocument(actor,clean(body.documentId,120),clean(body.versionId,120));return Response.json({ok:true});}
    if(action==="map"){
      const documentId=clean(body.documentId,120),destinationModule=clean(body.destinationModule,30);if(!allowedModules.has(destinationModule))return Response.json({error:"Modul destinasi tidak sah."},{status:400});
      const current=await env.DB.prepare("SELECT current_version_id AS versionId FROM documents WHERE id=? AND archived_at=''").bind(documentId).first<{versionId:string}>();if(!current)return Response.json({error:"Dokumen tidak ditemui."},{status:404});
      const stamp=new Date().toISOString(),mappingId=`map_${crypto.randomUUID()}`;
      await env.DB.prepare("INSERT INTO document_mappings (id,document_id,document_version_id,destination_module,destination_category_id,destination_standard_id,mapping_status,mapped_by,mapped_at,reviewed_by,reviewed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(document_id,destination_module,destination_category_id,destination_standard_id) DO UPDATE SET document_version_id=excluded.document_version_id,mapping_status=excluded.mapping_status,mapped_by=excluded.mapped_by,mapped_at=excluded.mapped_at").bind(mappingId,documentId,current.versionId,destinationModule,clean(body.destinationCategoryId,120),clean(body.destinationStandardId,120),clean(body.mappingStatus,30)||"pending",actor.email,stamp,"","").run();
      return Response.json({ok:true});
    }
    if(action==="archive"){
      const documentId=clean(body.documentId,120),usage=await env.DB.prepare("SELECT destination_module AS module,destination_category_id AS category,destination_standard_id AS standard,mapping_status AS status FROM document_mappings WHERE document_id=?").bind(documentId).all();
      if(body.confirm!==true)return Response.json({error:"Pengesahan diperlukan.",impact:usage.results},{status:409});
      if(!admin(actor.role))return Response.json({error:"Hanya pentadbir boleh mengarkibkan dokumen."},{status:403});
      await env.DB.prepare("UPDATE documents SET status='archived',archived_at=?,updated_at=? WHERE id=?").bind(new Date().toISOString(),new Date().toISOString(),documentId).run();return Response.json({ok:true,archived:true,driveFileDeleted:false});
    }
    return Response.json({error:"Operasi tidak sah."},{status:400});
  }catch(error){console.error("Shared document service",error);return Response.json({error:error instanceof Error?error.message:"Operasi dokumen gagal."},{status:500});}
}
