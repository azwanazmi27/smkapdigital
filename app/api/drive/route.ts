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

export async function POST(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "Sila log masuk untuk menghantar OPR." }, { status: 401 });

    const allowed = (process.env.OPR_ALLOWED_EMAILS || "")
      .split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
    if (!allowed.includes(user.email.toLowerCase())) {
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
