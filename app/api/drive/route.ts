import { getChatGPTUser } from "../../chatgpt-auth";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true";
type ServiceAccount = { client_email: string; private_key: string; token_uri?: string };
type UploadFile = { name?: unknown; mimeType?: unknown; base64?: unknown };

const folderKeys: Record<string, string> = {
  Pengurusan: "GDRIVE_FINAL_PENGURUSAN", Kurikulum: "GDRIVE_FINAL_KURIKULUM",
  HEM: "GDRIVE_FINAL_HEM", Kokurikulum: "GDRIVE_FINAL_KOKURIKULUM",
  "Tingkatan Enam · Kurikulum": "GDRIVE_FINAL_T6_KURIKULUM",
  "Tingkatan Enam · HEM": "GDRIVE_FINAL_T6_HEM",
  "Tingkatan Enam · Kokurikulum": "GDRIVE_FINAL_T6_KOKURIKULUM",
  "Lain-lain": "GDRIVE_FINAL_LAIN_LAIN",
};

function base64Url(value: string | Uint8Array) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = ""; for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function pemToBytes(pem: string) {
  const raw = atob(pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, ""));
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}
async function getAccessToken(account: ServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64Url(JSON.stringify({ iss: account.client_email, scope: "https://www.googleapis.com/auth/drive", aud: account.token_uri || TOKEN_URL, iat: now, exp: now + 3600 }));
  const unsigned = `${header}.${claim}`;
  const key = await crypto.subtle.importKey("pkcs8", pemToBytes(account.private_key), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const assertion = `${unsigned}.${base64Url(new Uint8Array(signature))}`;
  const response = await fetch(account.token_uri || TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }) });
  const result = await response.json() as { access_token?: string; error_description?: string };
  if (!response.ok || !result.access_token) throw new Error(result.error_description || "Token Google tidak dapat dijana");
  return result.access_token;
}
function validMagic(raw: Uint8Array, mimeType: string) {
  if (mimeType === "application/pdf") return raw[0] === 0x25 && raw[1] === 0x50 && raw[2] === 0x44 && raw[3] === 0x46;
  if (mimeType === "image/jpeg") return raw[0] === 0xff && raw[1] === 0xd8 && raw[2] === 0xff;
  if (mimeType === "image/png") return raw[0] === 0x89 && raw[1] === 0x50 && raw[2] === 0x4e && raw[3] === 0x47;
  return false;
}
async function uploadFile(token: string, folderId: string, file: { name: string; mimeType: string; raw: Uint8Array }) {
  const boundary = `smkap_${crypto.randomUUID().replace(/-/g, "")}`;
  const prefix = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name: file.name, parents: [folderId] })}\r\n--${boundary}\r\nContent-Type: ${file.mimeType}\r\n\r\n`;
  const suffix = `\r\n--${boundary}--`;
  const a = new TextEncoder().encode(prefix), b = new TextEncoder().encode(suffix);
  const body = new Uint8Array(a.length + file.raw.length + b.length); body.set(a); body.set(file.raw, a.length); body.set(b, a.length + file.raw.length);
  const response = await fetch(DRIVE_UPLOAD_URL, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": `multipart/related; boundary=${boundary}` }, body });
  const result = await response.json() as { id?: string; error?: { message?: string } };
  if (!response.ok || !result.id) throw new Error(result.error?.message || "Fail tidak dapat dimuat naik");
  return { id: result.id, url: `https://drive.google.com/file/d/${result.id}/view` };
}

export async function POST(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "Sila log masuk untuk menghantar OPR." }, { status: 401 });
    const allowed = (process.env.OPR_ALLOWED_EMAILS || "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
    if (!allowed.includes(user.email.toLowerCase())) return Response.json({ error: "Akaun ini belum dibenarkan menghantar OPR." }, { status: 403 });
    const secret = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!secret) return Response.json({ error: "Sambungan Google Drive belum dikonfigurasi." }, { status: 503 });
    const account = JSON.parse(secret) as ServiceAccount;
    const body = await request.json() as { category?: unknown; files?: unknown };
    const category = typeof body.category === "string" ? body.category : "";
    const envKey = folderKeys[category], folderId = envKey ? process.env[envKey] : undefined;
    if (!folderId) return Response.json({ error: "Folder bidang belum ditetapkan." }, { status: 400 });
    const incoming = Array.isArray(body.files) ? body.files as UploadFile[] : [];
    if (!incoming.length || incoming.length > 7) return Response.json({ error: "Bilangan fail tidak sah." }, { status: 400 });
    const files: Array<{ name: string; mimeType: string; raw: Uint8Array }> = []; let total = 0;
    for (const item of incoming) {
      const mimeType = typeof item.mimeType === "string" ? item.mimeType : "";
      const base64 = typeof item.base64 === "string" ? item.base64 : "";
      if (!base64 || base64.length > 8_500_000 || !["application/pdf", "image/jpeg", "image/png"].includes(mimeType)) return Response.json({ error: "Jenis atau saiz fail tidak dibenarkan." }, { status: 400 });
      const decoded = atob(base64); const raw = Uint8Array.from(decoded, (character) => character.charCodeAt(0)); total += raw.length;
      if (!validMagic(raw, mimeType) || total > 20_000_000) return Response.json({ error: "Kandungan atau jumlah saiz fail tidak sah." }, { status: 400 });
      const name = (typeof item.name === "string" ? item.name : "fail-opr").replace(/[\\/:*?"<>|]/g, "-").slice(0, 180);
      files.push({ name, mimeType, raw });
    }
    if (files[0].mimeType !== "application/pdf") return Response.json({ error: "PDF OPR diperlukan." }, { status: 400 });
    const token = await getAccessToken(account); const uploaded = [];
    for (const file of files) uploaded.push(await uploadFile(token, folderId, file));
    return Response.json({ success: true, files: uploaded });
  } catch (error) {
    console.error("Google Drive upload error", error instanceof Error ? error.message : error);
    return Response.json({ error: "OPR tidak dapat dihantar ke Google Drive sekarang." }, { status: 502 });
  }
}
