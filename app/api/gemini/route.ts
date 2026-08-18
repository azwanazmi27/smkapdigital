const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "Gemini AI belum diaktifkan oleh pentadbir." }, { status: 503 });
    }

    const body = await request.json() as { text?: unknown; title?: unknown; category?: unknown };
    const text = typeof body.text === "string" ? body.text.trim().slice(0, 6000) : "";
    const title = typeof body.title === "string" ? body.title.trim().slice(0, 180) : "";
    const category = typeof body.category === "string" ? body.category.trim().slice(0, 100) : "";
    if (!text) return Response.json({ error: "Ringkasan program diperlukan." }, { status: 400 });

    const prompt = `Anda ialah pembantu penulisan rasmi SMK Agama Pahang, Muadzam Shah.
Perkemas catatan guru menjadi satu perenggan pelaksanaan One Page Report (OPR) dalam Bahasa Melayu Malaysia yang formal, jelas dan ringkas.
Kekalkan semua fakta asal. Jangan mereka nama, nombor, tarikh, pencapaian atau aktiviti baharu. Jangan gunakan tajuk, senarai atau markdown.

Tajuk program: ${title || "Tidak dinyatakan"}
Bidang: ${category || "Tidak dinyatakan"}
Catatan guru: ${text}`;

    const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";
    const response = await fetch(`${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.25, maxOutputTokens: 700 },
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
    return Response.json({ text: enhanced });
  } catch (error) {
    console.error("OPR enhancement error", error);
    return Response.json({ error: "Permintaan AI tidak dapat diselesaikan." }, { status: 500 });
  }
}
