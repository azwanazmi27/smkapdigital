import { portalActor } from "../../server-auth";
import { generateAI } from "../../services/ai/router";
import { reserveAIUsage } from "../../services/ai/usage";

const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
export async function POST(request: Request) {
  try {
    const actor = await portalActor(request);
    if (!actor) return Response.json({ error: "Sila log masuk untuk menggunakan Bantuan Bang Wan." }, { status: 401 });
    const body = await request.json() as { base64?: unknown }, base64 = typeof body.base64 === "string" ? body.base64 : "";
    if (!base64 || base64.length > 9_000_000 || !/^[A-Za-z0-9+/=]+$/.test(base64)) return Response.json({ error: "Halaman PDF terlalu besar atau tidak sah." }, { status: 400 });
    const quota = await reserveAIUsage(actor);
    if (quota.error) return Response.json({ error: quota.error, usage: quota.usage }, { status: 429 });
    const result = await generateAI({ systemPrompt: "Anda ialah pembantu pembacaan dokumen sekolah Malaysia. Gunakan Bahasa Melayu Malaysia dan salin fakta yang benar-benar kelihatan sahaja. Jangan mereka maklumat atau mendedahkan nombor kad pengenalan.", userPrompt: "Baca sijil ini. Pulangkan JSON sahaja dengan recipient, title (nama program atau pengiktirafan), date (YYYY-MM-DD), venue, level (Sekolah, Daerah, Negeri, Kebangsaan, Antarabangsa atau kosong), field (Akademik, Kokurikulum, Sukan, Inovasi, Sahsiah, Lain-lain atau kosong), unitCategory (nama unit atau kelab jika tertulis), achievement, dan confidence (0-100). Gunakan rentetan kosong jika tidak pasti. Jangan gunakan markdown.", temperature: 0, maxTokens: 850, responseFormat: "json", attachments: [{ mimeType: "application/pdf", base64 }] });
    const parsed = JSON.parse(result.text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")) as Record<string, unknown>, level = clean(parsed.level, 30), date = clean(parsed.date, 10);
    const field = clean(parsed.field, 30);
    return Response.json({ recipient: clean(parsed.recipient, 240), title: clean(parsed.title, 180), date: /^20\d{2}-\d{2}-\d{2}$/.test(date) ? date : "", venue: clean(parsed.venue, 160), level: ["Sekolah", "Daerah", "Negeri", "Kebangsaan", "Antarabangsa"].includes(level) ? level : "", field: ["Akademik", "Kokurikulum", "Sukan", "Inovasi", "Sahsiah", "Lain-lain"].includes(field) ? field : "", unitCategory: clean(parsed.unitCategory, 120), achievement: clean(parsed.achievement, 120), confidence: Math.max(0, Math.min(100, Number(parsed.confidence) || 0)) });
  } catch (error) {
    console.error("[AI] Achievement OCR request failed", error instanceof Error ? error.name : "UNKNOWN");
    return Response.json({ error: "Perkhidmatan AI sedang mengalami gangguan sementara. Sila cuba semula." }, { status: 503 });
  }
}
