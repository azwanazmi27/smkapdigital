import { portalActor } from "../../server-auth";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  try {
    const actor = await portalActor(request);
    if (!actor || !["admin", "super_admin"].includes(actor.role)) {
      return Response.json({ error: "Fungsi AI hanya tersedia untuk pentadbir." }, { status: 403 });
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return Response.json({ error: "Pembacaan pintar belum diaktifkan oleh pentadbir." }, { status: 503 });

    const body = await request.json() as { base64?: unknown; page?: unknown };
    const base64 = typeof body.base64 === "string" ? body.base64 : "";
    if (!base64 || base64.length > 9_000_000 || !/^[A-Za-z0-9+/=]+$/.test(base64)) {
      return Response.json({ error: "Halaman PDF terlalu besar atau tidak sah." }, { status: 400 });
    }

    const prompt = `Baca satu halaman sijil sekolah yang diimbas. Salin fakta yang benar-benar kelihatan sahaja.
Pulangkan JSON dengan medan berikut:
- recipient: nama penerima atau senarai nama penerima. Kekalkan ejaan asal. Jangan masukkan nombor kad pengenalan.
- title: nama program, pertandingan atau anugerah, tanpa nama penerima.
- date: tarikh program dalam format YYYY-MM-DD jika jelas; jika julat tarikh, gunakan tarikh mula.
- venue: tempat program jika jelas.
- level: hanya satu daripada Sekolah, Daerah, Negeri, Kebangsaan, Antarabangsa; kosong jika tidak pasti.
- achievement: contoh Johan, Naib Johan, Tempat Kelima atau Penyertaan. Jangan anggap pingat, kedudukan atau pencapaian jika sijil hanya menyatakan penyertaan.
- confidence: nombor bulat 0 hingga 100 berdasarkan kejelasan halaman.
Gunakan rentetan kosong untuk fakta yang tidak kelihatan. Jangan gunakan markdown.`;

    const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
    const response = await fetch(`${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [
          { text: prompt },
          { inlineData: { mimeType: "application/pdf", data: base64 } },
        ] }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 700,
          thinkingConfig: { thinkingLevel: "minimal" },
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              recipient: { type: "string" }, title: { type: "string" }, date: { type: "string" },
              venue: { type: "string" }, level: { type: "string" }, achievement: { type: "string" },
              confidence: { type: "integer" },
            },
            required: ["recipient", "title", "date", "venue", "level", "achievement", "confidence"],
          },
        },
      }),
      signal: AbortSignal.timeout(45_000),
    });

    const result = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; error?: { message?: string } };
    if (!response.ok) {
      console.error("Achievement OCR error", response.status, result.error?.message);
      return Response.json({ error: "Halaman tidak dapat dibaca sekarang." }, { status: 502 });
    }
    const text = result.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
    if (!text) return Response.json({ error: "Tiada bacaan diterima untuk halaman ini." }, { status: 502 });
    const parsed = JSON.parse(text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")) as Record<string, unknown>;
    const level = clean(parsed.level, 30);
    return Response.json({
      recipient: clean(parsed.recipient, 240), title: clean(parsed.title, 180),
      date: /^20\d{2}-\d{2}-\d{2}$/.test(clean(parsed.date, 10)) ? clean(parsed.date, 10) : "",
      venue: clean(parsed.venue, 160), level: ["Sekolah", "Daerah", "Negeri", "Kebangsaan", "Antarabangsa"].includes(level) ? level : "",
      achievement: clean(parsed.achievement, 120), confidence: Math.max(0, Math.min(100, Number(parsed.confidence) || 0)),
    });
  } catch (error) {
    console.error("Achievement OCR request failed", error);
    return Response.json({ error: "Pembacaan halaman tidak dapat diselesaikan." }, { status: 500 });
  }
}
