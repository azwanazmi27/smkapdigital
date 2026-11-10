import { portalActor } from "../../server-auth";
import html from "./dashboard-spm.html?raw";

// Dashboard SPM (Guru & Staf → Pentaksiran dan Peperiksaan → Arus Perdana). Fail HTML penuh ini hanya dihantar kepada
// warga yang log masuk, supaya orang luar tidak dapat mengambilnya. Markah calon diproses dan disimpan dalam pelayar
// pengguna sahaja; tiada data peperiksaan dihantar ke pelayan portal.
// Kemas kini: dalam projek Dashboard SPM jalankan `python3 build.py`, kemudian salin dist/portal/dashboard-spm.html ke sini.

const security = {
  "X-Frame-Options": "SAMEORIGIN",
  "Content-Security-Policy": "frame-ancestors 'self'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "same-origin",
};

let etag: Promise<string> | undefined;
const contentTag = () => etag ??= crypto.subtle.digest("SHA-256", new TextEncoder().encode(html)).then((bytes) =>
  `"dspm-${btoa(String.fromCharCode(...new Uint8Array(bytes).slice(0, 12))).replace(/[+/=]/g, "")}"`);

const loginPage = `<!doctype html><html lang="ms"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dashboard SPM · Log masuk</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;box-sizing:border-box;font-family:system-ui,sans-serif;color:#edf7f5;background:#082c39;text-align:center}a{color:#78d7cd;font-weight:700}p{color:#9bb8bb}</style></head><body><main><h1>Sila log masuk</h1><p>Dashboard SPM hanya untuk warga SMK Agama Pahang yang log masuk ke portal SMKAP Digital.</p><a href="/" target="_top">Buka portal dan log masuk</a></main></body></html>`;

export async function GET(request: Request) {
  const actor = await portalActor(request);
  if (!actor) return new Response(loginPage, { status: 401, headers: { ...security, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
  const tag = await contentTag();
  const cached = (request.headers.get("if-none-match") || "").split(",").map((value) => value.trim().replace(/^W\//, ""));
  const headers = { ...security, "Cache-Control": "private, no-cache", ETag: tag };
  if (cached.includes(tag)) return new Response(null, { status: 304, headers });
  return new Response(html, { headers: { ...headers, "Content-Type": "text/html; charset=utf-8" } });
}
