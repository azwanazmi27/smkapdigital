import { AIUnavailableError } from "../../services/ai/errors";
import { allowAIRequest } from "../../services/ai/rate-limit";
import { generateAI } from "../../services/ai/router";

const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";

export async function POST(request: Request) {
  try {
    if (!allowAIRequest(request)) return Response.json({ error: "Terlalu banyak permintaan. Sila cuba semula sebentar lagi." }, { status: 429 });
    const body = await request.json() as Record<string, unknown>;
    const text = clean(body.text, 6000), title = clean(body.title, 180), category = clean(body.category, 100), objective = clean(body.objective, 1000), outcome = clean(body.outcome, 1000);
    if (!text) return Response.json({ error: "Ringkasan program diperlukan." }, { status: 400 });
    const result = await generateAI({
      systemPrompt: "Anda ialah pembantu penulisan rasmi SMK Agama Pahang, Muadzam Shah. Utamakan Bahasa Melayu Malaysia formal, bukan Bahasa Indonesia. Kekalkan fakta, struktur, tajuk, susunan dan gaya dokumen asal. Jangan mereka nama, nombor, tarikh, pencapaian atau aktiviti baharu.",
      userPrompt: `Hasilkan tiga bahagian One Page Report (OPR):\n1. details: satu perenggan pelaksanaan program.\n2. objective: objektif program dalam satu atau dua ayat.\n3. outcome: hasil atau impak program dalam satu atau dua ayat.\nJika objektif atau hasil tidak diberikan, rumuskan secara berhati-hati hanya daripada catatan guru. Pulangkan JSON sahaja dengan kekunci details, objective dan outcome. Jangan gunakan markdown.\n\nTajuk program: ${title || "Tidak dinyatakan"}\nBidang: ${category || "Tidak dinyatakan"}\nCatatan guru: ${text}\nObjektif asal: ${objective || "Tidak dinyatakan"}\nHasil asal: ${outcome || "Tidak dinyatakan"}`,
      temperature: 0.2, maxTokens: 1200, responseFormat: "json",
    });
    const parsed = JSON.parse(result.text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim()) as Record<string, unknown>;
    if (typeof parsed.details !== "string") throw new AIUnavailableError();
    return Response.json({ details: parsed.details.trim(), objective: clean(parsed.objective, 2000), outcome: clean(parsed.outcome, 2000) });
  } catch (error) {
    if (!(error instanceof AIUnavailableError)) console.error("[AI] OPR request failed", error instanceof Error ? error.name : "UNKNOWN");
    return Response.json({ error: "Perkhidmatan AI sedang mengalami gangguan sementara. Sila cuba semula." }, { status: 503 });
  }
}
