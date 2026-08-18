const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "Gemini AI belum diaktifkan oleh pentadbir." }, { status: 503 });
    }

    const body = await request.json() as { text?: unknown; title?: unknown; category?: unknown; objective?: unknown; outcome?: unknown };
    const text = typeof body.text === "string" ? body.text.trim().slice(0, 6000) : "";
    const title = typeof body.title === "string" ? body.title.trim().slice(0, 180) : "";
    const category = typeof body.category === "string" ? body.category.trim().slice(0, 100) : "";
    const objective = typeof body.objective === "string" ? body.objective.trim().slice(0, 1000) : "";
    const outcome = typeof body.outcome === "string" ? body.outcome.trim().slice(0, 1000) : "";
    if (!text) return Response.json({ error: "Ringkasan program diperlukan." }, { status: 400 });

    const prompt = `Anda ialah pembantu penulisan rasmi SMK Agama Pahang, Muadzam Shah.
Hasilkan tiga bahagian One Page Report (OPR) dalam Bahasa Melayu Malaysia yang formal, jelas dan ringkas:
1. details: satu perenggan pelaksanaan program.
2. objective: objektif program dalam satu atau dua ayat.
3. outcome: hasil atau impak program dalam satu atau dua ayat.
Kekalkan semua fakta asal. Jangan mereka nama, nombor, tarikh, pencapaian atau aktiviti baharu. Jika objektif atau hasil tidak diberikan, rumuskan secara berhati-hati hanya daripada catatan guru.
Pulangkan JSON sahaja dengan kekunci details, objective dan outcome. Jangan gunakan markdown.

Tajuk program: ${title || "Tidak dinyatakan"}
Bidang: ${category || "Tidak dinyatakan"}
Catatan guru: ${text}
Objektif asal: ${objective || "Tidak dinyatakan"}
Hasil asal: ${outcome || "Tidak dinyatakan"}`;

    const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
    const response = await fetch(`${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1200,
          thinkingConfig: { thinkingLevel: "minimal" },
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              details: { type: "string", description: "Perenggan pelaksanaan program yang formal dan ringkas." },
              objective: { type: "string", description: "Objektif program dalam satu atau dua ayat." },
              outcome: { type: "string", description: "Hasil atau impak program dalam satu atau dua ayat." },
            },
            required: ["details", "objective", "outcome"],
          },
        },
      }),
    });

    const result = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      error?: { message?: string };
    };
    if (!response.ok) {
      console.error("Gemini API error", response.status, result.error?.message);
      return Response.json({ error: "Gemini tidak dapat memproses permintaan sekarang." }, { status: 502 });
    }

    const enhanced = result.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
    if (!enhanced) return Response.json({ error: "Gemini tidak menghasilkan teks. Cuba sekali lagi." }, { status: 502 });
    const jsonText = enhanced.replace(/^\`\`\`(?:json)?\s*/i, "").replace(/\s*\`\`\`$/, "").trim();
    const parsed = JSON.parse(jsonText) as { details?: unknown; objective?: unknown; outcome?: unknown };
    if (typeof parsed.details !== "string") return Response.json({ error: "Format jawapan Gemini tidak lengkap." }, { status: 502 });
    return Response.json({
      details: parsed.details.trim(),
      objective: typeof parsed.objective === "string" ? parsed.objective.trim() : "",
      outcome: typeof parsed.outcome === "string" ? parsed.outcome.trim() : "",
    });
  } catch (error) {
    console.error("OPR enhancement error", error);
    return Response.json({ error: "Permintaan AI tidak dapat diselesaikan." }, { status: 500 });
  }
}
