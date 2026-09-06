import { env } from "cloudflare:workers";
import { legacyOprCategories, oprCategoryValues } from "../../opr-categories";
import { portalActor } from "../../server-auth";
import { suggestSkasMappings } from "../../skas-catalog";

type UploadFile = { name?: unknown; mimeType?: unknown; base64?: unknown };

type OprIntakeMetadata = {
  title: string;
  programDate: string;
  createdBy: string;
  competition: {
    enabled: boolean;
    name: string;
    participantType: string;
    representsSchool: string;
    participantName: string;
    level: string;
    achievement: string;
    recognitionStatus: string;
    officialResultStatus: string;
  };
  external: {
    enabled: boolean;
    partyType: string;
    partyName: string;
    involvementType: string;
    invitedCount: string;
    attendanceCount: string;
    contributionType: string;
    contributionValue: string;
  };
  attachments: Array<{ name: string; type: string; kind: string }>;
};

let metadataPreparation: Promise<void> | null = null;

function prepareOprMetadata() {
  if (!metadataPreparation) {
    metadataPreparation = env.DB.batch([
      env.DB.prepare("CREATE TABLE IF NOT EXISTS opr_intake_metadata (report_id TEXT PRIMARY KEY NOT NULL, created_by_email TEXT NOT NULL DEFAULT '', category TEXT NOT NULL, competition_status TEXT NOT NULL DEFAULT '0', external_involvement_status TEXT NOT NULL DEFAULT '0', suggested_skas_json TEXT NOT NULL DEFAULT '[]', payload_json TEXT NOT NULL DEFAULT '{}', review_status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_opr_intake_review_status ON opr_intake_metadata (review_status)"),
    ]).then(() => undefined).catch((error) => {
      metadataPreparation = null;
      throw error;
    });
  }
  return metadataPreparation;
}

function clean(value: unknown, max = 160) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalizeOprMetadata(value: unknown): OprIntakeMetadata | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const competitionInput = input.competition && typeof input.competition === "object" ? input.competition as Record<string, unknown> : {};
  const externalInput = input.external && typeof input.external === "object" ? input.external as Record<string, unknown> : {};
  const attachments = Array.isArray(input.attachments) ? input.attachments.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const file = entry as Record<string, unknown>;
    const name = clean(file.name, 180), type = clean(file.type, 80), kind = clean(file.kind, 80);
    return name && ["application/pdf", "image/jpeg", "image/png"].includes(type) ? [{ name, type, kind }] : [];
  }).slice(0, 6) : [];
  return {
    title: clean(input.title, 180),
    programDate: /^20\d{2}-\d{2}-\d{2}$/.test(clean(input.programDate,10)) ? clean(input.programDate,10) : '',
    createdBy: clean(input.createdBy, 180).toLowerCase(),
    competition: {
      enabled: competitionInput.enabled === true,
      name: clean(competitionInput.name),
      participantType: clean(competitionInput.participantType, 60),
      representsSchool: clean(competitionInput.representsSchool, 20),
      participantName: clean(competitionInput.participantName),
      level: clean(competitionInput.level, 40),
      achievement: clean(competitionInput.achievement, 60),
      recognitionStatus: clean(competitionInput.recognitionStatus, 80),
      officialResultStatus: clean(competitionInput.officialResultStatus, 80),
    },
    external: {
      enabled: externalInput.enabled === true,
      partyType: clean(externalInput.partyType, 80),
      partyName: clean(externalInput.partyName),
      involvementType: clean(externalInput.involvementType, 80),
      invitedCount: clean(externalInput.invitedCount, 12),
      attendanceCount: clean(externalInput.attendanceCount, 12),
      contributionType: clean(externalInput.contributionType, 80),
      contributionValue: clean(externalInput.contributionValue, 80),
    },
    attachments,
  };
}

function suggestedSkas(category: string, metadata: OprIntakeMetadata) {
  return suggestSkasMappings({ category, title: metadata.title, metadata }).map((item) => item.standardCode);
}

const allowedCategories = new Set<string>([...legacyOprCategories, ...oprCategoryValues]);

function driveCategory(category: string) {
  if (category.startsWith("Tingkatan Enam · Hal Ehwal Murid Tingkatan Enam")) return "Tingkatan Enam · HEM";
  if (category.startsWith("Tingkatan Enam · Kokurikulum Tingkatan Enam")) return "Tingkatan Enam · Kokurikulum";
  if (category.startsWith("Tingkatan Enam")) return "Tingkatan Enam · Kurikulum";
  if (category.startsWith("Pengurusan")) return "Pengurusan";
  if (category.startsWith("Kurikulum")) return "Kurikulum";
  if (category.startsWith("HEM")) return "HEM";
  if (category.startsWith("Kokurikulum")) return "Kokurikulum";
  if (category.startsWith("Lain-lain")) return "Lain-lain";
  return category;
}

function validCategory(category:string) {
  return allowedCategories.has(category) || (/^Lain-lain · [^<>]{1,80}$/.test(category));
}

type OprFile = { id: string; name: string; category: string; createdAt: string; updatedAt: string; viewUrl: string; previewUrl: string; downloadUrl: string };

async function admin(request:Request){
  const me=await portalActor(request);
  return me&&["admin","super_admin"].includes(me.role)?me:null;
}

function binaryResponse(result:{base64?:string;mimeType?:string;name?:string},download=false){
  if(!result.base64)throw new Error("Kandungan fail tidak diterima");
  const decoded=atob(result.base64),bytes=Uint8Array.from(decoded,c=>c.charCodeAt(0));
  const safe=(result.name||"dokumen").replace(/[\r\n"\\]/g,"-");
  return new Response(bytes,{headers:{"Content-Type":result.mimeType||"application/octet-stream","Content-Disposition":`${download?"attachment":"inline"}; filename="${safe}"`,"Cache-Control":"private, max-age=300","X-Content-Type-Options":"nosniff"}});
}

async function scriptAction(payload:Record<string,unknown>,timeoutMs=15_000){
  const webAppUrl=process.env.OPR_APPS_SCRIPT_URL,token=process.env.OPR_APPS_SCRIPT_TOKEN;
  if(!webAppUrl||!token)throw new Error("Sambungan Google Drive belum dikonfigurasi");
  // Never leave a phone waiting indefinitely when the Drive web app is cold or unavailable.
  const response=await fetch(webAppUrl,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,...payload}),redirect:"follow",cache:"no-store",signal:AbortSignal.timeout(timeoutMs)});
  const result=await response.json() as {ok?:boolean;error?:string;base64?:string;mimeType?:string;name?:string;files?:unknown[];ensured?:number};
  if(!response.ok||!result.ok)throw new Error(result.error||"Google Drive tidak dapat memproses permintaan");
  return result;
}

function parseDriveFiles(value: unknown): OprFile[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const file = item as Record<string, unknown>;
    const required = ["id", "name", "category", "createdAt", "updatedAt", "viewUrl", "previewUrl", "downloadUrl"];
    if (!required.every((key) => typeof file[key] === "string") || !validCategory(file.category as string)) return [];
    return [file as OprFile];
  });
}

function normalizeUploadedFiles(value: unknown, category: string, incoming: Array<{ name: string }>): OprFile[] {
  if (!Array.isArray(value)) return [];
  const now = new Date().toISOString();
  return value.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const file = item as Record<string, unknown>;
    const id = typeof file.id === "string" ? file.id : "";
    if (!id) return [];
    const name = typeof file.name === "string" ? file.name : incoming[index]?.name;
    if (!name) return [];
    const viewUrl = typeof file.viewUrl === "string" ? file.viewUrl
      : typeof file.url === "string" ? file.url
      : `https://drive.google.com/file/d/${encodeURIComponent(id)}/view`;
    return [{
      id,
      name,
      category,
      createdAt: typeof file.createdAt === "string" ? file.createdAt : now,
      updatedAt: typeof file.updatedAt === "string" ? file.updatedAt : now,
      viewUrl,
      previewUrl: typeof file.previewUrl === "string" ? file.previewUrl : `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`,
      downloadUrl: typeof file.downloadUrl === "string" ? file.downloadUrl : `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`,
    }];
  });
}

async function cachedReports() {
  const result = await env.DB.prepare("SELECT id,name,category,created_at AS createdAt,updated_at AS updatedAt,view_url AS viewUrl,preview_url AS previewUrl,download_url AS downloadUrl FROM opr_reports ORDER BY updated_at DESC").all<OprFile>();
  return result.results;
}

async function replaceReportCache(files: OprFile[]) {
  const syncedAt = new Date().toISOString();
  const existing = await env.DB.prepare("SELECT id,category FROM opr_reports").all<{ id:string; category:string }>();
  const categoryById = new Map(existing.results.map((file) => [file.id,file.category]));
  const preserved = files.map((file) => {
    const previous = categoryById.get(file.id);
    return previous && previous !== file.category && driveCategory(previous) === file.category ? { ...file,category:previous } : file;
  });
  await env.DB.batch([
    env.DB.prepare("DELETE FROM opr_reports"),
    ...preserved.map((file) => env.DB.prepare("INSERT INTO opr_reports (id,name,category,created_at,updated_at,view_url,preview_url,download_url,synced_at) VALUES (?,?,?,?,?,?,?,?,?)").bind(file.id,file.name,file.category,file.createdAt,file.updatedAt,file.viewUrl,file.previewUrl,file.downloadUrl,syncedAt)),
  ]);
}

function validMagic(raw: Uint8Array, mimeType: string) {
  if (mimeType === "application/pdf") return raw[0] === 0x25 && raw[1] === 0x50 && raw[2] === 0x44 && raw[3] === 0x46;
  if (mimeType === "image/jpeg") return raw[0] === 0xff && raw[1] === 0xd8 && raw[2] === 0xff;
  if (mimeType === "image/png") return raw[0] === 0x89 && raw[1] === 0x50 && raw[2] === 0x4e && raw[3] === 0x47;
  return false;
}

export async function GET(request: Request) {
  const url=new URL(request.url),fileId=url.searchParams.get("file");
  try {
    const download=url.searchParams.get("download")==="1";
    if(fileId){
      if(!/^[\w-]{10,120}$/.test(fileId))return Response.json({error:"ID fail tidak sah."},{status:400});
      return binaryResponse(await scriptAction({action:"download",id:fileId}),download);
    }
    const refresh = url.searchParams.get("refresh") === "1";
    if (!refresh) {
      const cached = await cachedReports();
      if (cached.length) return Response.json({ success: true, files: cached, source: "cache" }, { headers: { "Cache-Control": "private, max-age=60" } });
    }
    const webAppUrl = process.env.OPR_APPS_SCRIPT_URL;
    const token = process.env.OPR_APPS_SCRIPT_TOKEN;
    if (!webAppUrl || !token) {
      return Response.json({ error: "Sambungan Google Drive belum dikonfigurasi." }, { status: 503 });
    }
    const response = await fetch(webAppUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, action: "list" }),
      redirect: "follow",
      cache: "no-store",
    });
    const result = await response.json() as { ok?: boolean; files?: unknown; error?: string };
    if (!response.ok || !result.ok || !Array.isArray(result.files)) throw new Error(result.error || "Senarai Drive tidak tersedia");
    const files = parseDriveFiles(result.files);
    await replaceReportCache(files);
    return Response.json({ success: true, files, source: "drive" }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Google Drive list error", error instanceof Error ? error.message : error);
    return Response.json({ error: fileId ? "PDF tidak dapat dicapai daripada Google Drive sekarang." : "Senarai OPR tidak dapat dibaca daripada Google Drive sekarang." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  try {
    const webAppUrl = process.env.OPR_APPS_SCRIPT_URL;
    const token = process.env.OPR_APPS_SCRIPT_TOKEN;
    if (!webAppUrl || !token) {
      return Response.json({ error: "Sambungan Google Drive belum dikonfigurasi." }, { status: 503 });
    }

    const body = await request.json() as { category?: unknown; files?: unknown; metadata?:unknown; action?:unknown; ids?:unknown; name?:unknown; root?:unknown };
    if(body.action==="bundle"){
      const me=await admin(request);if(!me)return Response.json({error:"Hanya pentadbir boleh memuat turun bundle."},{status:403});
      const ids=Array.isArray(body.ids)?body.ids.filter((id):id is string=>typeof id==="string"&&/^[\w-]{10,120}$/.test(id)).slice(0,100):[];
      if(!ids.length)return Response.json({error:"Tiada fail dipilih."},{status:400});
      const requestedName=typeof body.name==="string"?body.name:"Semua-Laporan-SMKAP.zip";
      const name=requestedName.replace(/[^a-zA-Z0-9 ._-]/g,"-").slice(0,120)||"Semua-Laporan-SMKAP.zip";
      return binaryResponse(await scriptAction({action:"bundle",ids,name}),true);
    }
    if(body.action==="ensure-folders"){
      const me=await admin(request);if(!me)return Response.json({error:"Hanya pentadbir boleh menyediakan folder OPR."},{status:403});
      const root=typeof body.root==="string"?body.root:"";
      const roots=new Set(["Pengurusan","Kurikulum","HEM","Kokurikulum","Tingkatan Enam","Lain-lain"]);
      if(!roots.has(root))return Response.json({error:"Bidang OPR tidak sah."},{status:400});
      const categories=oprCategoryValues.filter((category)=>category===root||category.startsWith(`${root} · `));
      const result=await scriptAction({action:"ensureFolders",categories},60_000);
      return Response.json({success:true,root,ensured:result.ensured||0});
    }
    const category = typeof body.category === "string" ? body.category : "";
    if (!validCategory(category)) {
      return Response.json({ error: "Kategori OPR tidak sah." }, { status: 400 });
    }

    const incoming = Array.isArray(body.files) ? body.files as UploadFile[] : [];
    if (!incoming.length || incoming.length > 7) {
      return Response.json({ error: "Bilangan fail tidak sah." }, { status: 400 });
    }

    const files: Array<{ name: string; mimeType: string; base64: string }> = [];
    let total = 0;
    for (const item of incoming) {
      const mimeType = typeof item.mimeType === "string" ? item.mimeType : "";
      const base64 = typeof item.base64 === "string" ? item.base64 : "";
      if (!base64 || base64.length > 8_500_000 || !["application/pdf", "image/jpeg", "image/png"].includes(mimeType)) {
        return Response.json({ error: "Jenis atau saiz fail tidak dibenarkan." }, { status: 400 });
      }
      const decoded = atob(base64);
      const raw = Uint8Array.from(decoded, (character) => character.charCodeAt(0));
      total += raw.length;
      if (!validMagic(raw, mimeType) || total > 20_000_000) {
        return Response.json({ error: "Kandungan atau jumlah saiz fail tidak sah." }, { status: 400 });
      }
      const name = (typeof item.name === "string" ? item.name : "fail-opr")
        .replace(/[\\/:*?"<>|]/g, "-").slice(0, 180);
      files.push({ name, mimeType, base64 });
    }

    if (category !== "Lain-lain · Arkib Kejayaan" && files[0].mimeType !== "application/pdf") {
      return Response.json({ error: "PDF OPR diperlukan." }, { status: 400 });
    }

    const metadata = normalizeOprMetadata(body.metadata);
    const result = await scriptAction({category,files},45_000);
    const saved = normalizeUploadedFiles(result.files, category, files);
    if (!saved.length) throw new Error("Google Drive tidak memulangkan ID fail yang telah disimpan");
    if (saved.length) {
      const syncedAt = new Date().toISOString();
      await env.DB.batch(saved.map((file) => env.DB.prepare("INSERT INTO opr_reports (id,name,category,created_at,updated_at,view_url,preview_url,download_url,synced_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,category=excluded.category,created_at=excluded.created_at,updated_at=excluded.updated_at,view_url=excluded.view_url,preview_url=excluded.preview_url,download_url=excluded.download_url,synced_at=excluded.synced_at").bind(file.id,file.name,file.category,file.createdAt,file.updatedAt,file.viewUrl,file.previewUrl,file.downloadUrl,syncedAt)));
    }
    if (metadata && saved[0]) {
      await prepareOprMetadata();
      const actor = await portalActor(request);
      const now = new Date().toISOString();
      const suggestions = suggestedSkas(category, metadata);
      await env.DB.prepare("INSERT INTO opr_intake_metadata (report_id,created_by_email,category,competition_status,external_involvement_status,suggested_skas_json,payload_json,review_status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(report_id) DO UPDATE SET created_by_email=excluded.created_by_email,category=excluded.category,competition_status=excluded.competition_status,external_involvement_status=excluded.external_involvement_status,suggested_skas_json=excluded.suggested_skas_json,payload_json=excluded.payload_json,review_status='pending',updated_at=excluded.updated_at")
        .bind(saved[0].id, actor?.email || metadata.createdBy, category, metadata.competition.enabled ? "1" : "0", metadata.external.enabled ? "1" : "0", JSON.stringify(suggestions), JSON.stringify(metadata), "pending", now, now).run();
    }
    return Response.json({ success: true, files: saved });
  } catch (error) {
    console.error("Google Drive upload error", error instanceof Error ? error.message : error);
    return Response.json({ error: "OPR tidak dapat dihantar ke Google Drive sekarang." }, { status: 502 });
  }
}

export async function DELETE(request:Request){
  try{
    const me=await admin(request);if(!me)return Response.json({error:"Hanya pentadbir boleh memadam laporan."},{status:403});
    const id=new URL(request.url).searchParams.get("id")||"";
    if(!/^[\w-]{10,120}$/.test(id))return Response.json({error:"ID fail tidak sah."},{status:400});
    await scriptAction({action:"delete",id});
    await prepareOprMetadata();
    await env.DB.batch([
      env.DB.prepare("DELETE FROM opr_reports WHERE id=?").bind(id),
      env.DB.prepare("DELETE FROM opr_intake_metadata WHERE report_id=?").bind(id),
      env.DB.prepare("UPDATE skas_evidence SET status='source_deleted',updated_at=? WHERE source_module='OPR' AND source_record_id=?").bind(new Date().toISOString(),id),
    ]);
    return Response.json({success:true});
  }catch(error){console.error("Google Drive delete error",error);return Response.json({error:"Laporan tidak dapat dipadam daripada Google Drive sekarang."},{status:502});}
}
