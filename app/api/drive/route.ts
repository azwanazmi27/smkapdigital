import { getChatGPTUser } from "../../chatgpt-auth";

type UploadFile = { name?: unknown; mimeType?: unknown; base64?: unknown };

const allowedCategories = new Set([
  "Pengurusan", "Kurikulum", "HEM", "Kokurikulum",
  "Tingkatan Enam · Kurikulum", "Tingkatan Enam · HEM",
  "Tingkatan Enam · Kokurikulum", "Lain-lain",
]);

function validMagic(raw: Uint8Array, mimeType: string) {
  if (mimeType === "application/pdf") return raw[0] === 0x25 && raw[1] === 0x50 && raw[2] === 0x44 && raw[3] === 0x46;
  if (mimeType === "image/jpeg") return raw[0] === 0xff && raw[1] === 0xd8 && raw[2] === 0xff;
  if (mimeType === "image/png") return raw[0] === 0x89 && raw[1] === 0x50 && raw[2] === 0x4e && raw[3] === 0x47;
  return false;
}

async function authorizedUser() {
  const user = await getChatGPTUser();
  if (!user) return null;
  const allowed = (process.env.OPR_ALLOWED_EMAILS || "")
    .split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(user.email.toLowerCase()) ? user : null;
}

export async function GET() {
  try {
    if (!await authorizedUser()) {
      return Response.json({ error: "Akaun ini belum dibenarkan melihat OPR." }, { status: 403 });
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
    const files = result.files.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const file = item as Record<string, unknown>;
      const required = ["id", "name", "category", "createdAt", "updatedAt", "viewUrl", "previewUrl", "downloadUrl"];
      if (!required.every((key) => typeof file[key] === "string")) return [];
      if (!allowedCategories.has(file.category as string)) return [];
      return [{ id: file.id, name: file.name, category: file.category, createdAt: file.createdAt, updatedAt: file.updatedAt, viewUrl: file.viewUrl, previewUrl: file.previewUrl, downloadUrl: file.downloadUrl }];
    });
    return Response.json({ success: true, files }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Google Drive list error", error instanceof Error ? error.message : error);
    return Response.json({ error: "Senarai OPR tidak dapat dibaca daripada Google Drive sekarang." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await authorizedUser();
    if (!user) {
      return Response.json({ error: "Akaun ini belum dibenarkan menghantar OPR." }, { status: 403 });
    }

    const webAppUrl = process.env.OPR_APPS_SCRIPT_URL;
    const token = process.env.OPR_APPS_SCRIPT_TOKEN;
    if (!webAppUrl || !token) {
      return Response.json({ error: "Sambungan Google Drive belum dikonfigurasi." }, { status: 503 });
    }

    const body = await request.json() as { category?: unknown; files?: unknown };
    const category = typeof body.category === "string" ? body.category : "";
    if (!allowedCategories.has(category)) {
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
      body: JSON.stringify({ token, category, files }),
      redirect: "follow",
    });
    const result = await response.json() as { ok?: boolean; files?: unknown[]; error?: string };
    if (!response.ok || !result.ok) throw new Error(result.error || "Apps Script gagal menyimpan fail");
    return Response.json({ success: true, files: result.files || [] });
  } catch (error) {
    console.error("Google Drive upload error", error instanceof Error ? error.message : error);
    return Response.json({ error: "OPR tidak dapat dihantar ke Google Drive sekarang." }, { status: 502 });
  }
}
