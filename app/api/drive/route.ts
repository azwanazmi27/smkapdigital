import { env } from "cloudflare:workers";
import { legacyOprCategories, oprCategoryValues } from "../../opr-categories";

type UploadFile = { name?: unknown; mimeType?: unknown; base64?: unknown };

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

function parseDriveFiles(value: unknown): OprFile[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const file = item as Record<string, unknown>;
    const required = ["id", "name", "category", "createdAt", "updatedAt", "viewUrl", "previewUrl", "downloadUrl"];
    if (!required.every((key) => typeof file[key] === "string") || !allowedCategories.has(file.category as string)) return [];
    return [file as OprFile];
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
  try {
    const refresh = new URL(request.url).searchParams.get("refresh") === "1";
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
    return Response.json({ error: "Senarai OPR tidak dapat dibaca daripada Google Drive sekarang." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  try {
    const webAppUrl = process.env.OPR_APPS_SCRIPT_URL;
    const token = process.env.OPR_APPS_SCRIPT_TOKEN;
    if (!webAppUrl || !token) {
      return Response.json({ error: "Sambungan Google Drive belum dikonfigurasi." }, { status: 503 });
    }

    const body = await request.json() as { category?: unknown; files?: unknown };
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

    if (files[0].mimeType !== "application/pdf") {
      return Response.json({ error: "PDF OPR diperlukan." }, { status: 400 });
    }

    const response = await fetch(webAppUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, category: driveCategory(category), files }),
      redirect: "follow",
    });
    const result = await response.json() as { ok?: boolean; files?: unknown[]; error?: string };
    if (!response.ok || !result.ok) throw new Error(result.error || "Apps Script gagal menyimpan fail");
    const saved = parseDriveFiles(result.files).map((file) => ({ ...file, category }));
    if (saved.length) {
      const syncedAt = new Date().toISOString();
      await env.DB.batch(saved.map((file) => env.DB.prepare("INSERT INTO opr_reports (id,name,category,created_at,updated_at,view_url,preview_url,download_url,synced_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,category=excluded.category,created_at=excluded.created_at,updated_at=excluded.updated_at,view_url=excluded.view_url,preview_url=excluded.preview_url,download_url=excluded.download_url,synced_at=excluded.synced_at").bind(file.id,file.name,file.category,file.createdAt,file.updatedAt,file.viewUrl,file.previewUrl,file.downloadUrl,syncedAt)));
    }
    return Response.json({ success: true, files: saved });
  } catch (error) {
    console.error("Google Drive upload error", error instanceof Error ? error.message : error);
    return Response.json({ error: "OPR tidak dapat dihantar ke Google Drive sekarang." }, { status: 502 });
  }
}
