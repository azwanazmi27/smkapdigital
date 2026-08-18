type VisitorBody = Record<string, unknown>;

const textLimits: Record<string, number> = {
  date: 10, timeIn: 5, visitorName: 120, phone: 30, vehicleNo: 30,
  organisation: 120, purpose: 160, staff: 120, meetingPlace: 120, notes: 300,
};

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "";
}

function connection() {
  const url = process.env.OPR_APPS_SCRIPT_URL;
  const token = process.env.OPR_APPS_SCRIPT_TOKEN;
  if (!url || !token) throw new Error("Sambungan Google belum dikonfigurasi");
  return { url, token };
}

async function callGoogle(payload: Record<string, unknown>) {
  const { url, token } = connection();
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, token }),
    redirect: "follow",
    cache: "no-store",
  });
  const result = await response.json() as Record<string, unknown>;
  if (!response.ok || result.ok !== true) throw new Error(typeof result.error === "string" ? result.error : "Sambungan Google gagal");
  return result;
}

export async function GET() {
  try {
    const result = await callGoogle({ action: "ekunjung_active" });
    const records = Array.isArray(result.records) ? result.records.flatMap((value) => {
      if (!value || typeof value !== "object") return [];
      const row = value as Record<string, unknown>;
      if (!["id", "date", "timeIn", "name", "vehicleNo"].every((key) => typeof row[key] === "string")) return [];
      return [{ id: row.id, date: row.date, timeIn: row.timeIn, name: row.name, vehicleNo: row.vehicleNo }];
    }) : [];
    return Response.json({ success: true, records }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("E-Kunjung active list error", error instanceof Error ? error.message : error);
    return Response.json({ error: "Senarai pelawat aktif tidak dapat dibaca sekarang." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as VisitorBody;
    const action = body.action;
    if (action === "checkout") {
      const id = cleanText(body.id, 80);
      const timeOut = cleanText(body.timeOut, 5);
      if (!id || !/^\d{2}:\d{2}$/.test(timeOut)) return Response.json({ error: "Pelawat dan masa keluar diperlukan." }, { status: 400 });
      const result = await callGoogle({ action: "ekunjung_checkout", id, timeOut });
      return Response.json({ success: true, id: result.id, name: result.name, timeOut: result.timeOut, status: result.status });
    }
    if (action !== "create") return Response.json({ error: "Tindakan tidak sah." }, { status: 400 });

    const data = Object.fromEntries(Object.entries(textLimits).map(([key, max]) => [key, cleanText(body[key], max)]));
    if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date) || !/^\d{2}:\d{2}$/.test(data.timeIn) || !data.visitorName || !data.phone || !data.purpose || !data.staff) {
      return Response.json({ error: "Maklumat wajib tidak lengkap atau tidak sah." }, { status: 400 });
    }
    const photo = body.photo && typeof body.photo === "object" ? body.photo as Record<string, unknown> : {};
    const mimeType = photo.mimeType === "image/png" ? "image/png" : photo.mimeType === "image/jpeg" ? "image/jpeg" : "";
    const base64 = typeof photo.base64 === "string" ? photo.base64 : "";
    if (!mimeType || !base64 || base64.length > 7_000_000) return Response.json({ error: "Gambar tidak sah atau terlalu besar." }, { status: 400 });
    const raw = Uint8Array.from(atob(base64.slice(0, 16)), (char) => char.charCodeAt(0));
    const validImage = mimeType === "image/jpeg" ? raw[0] === 0xff && raw[1] === 0xd8 && raw[2] === 0xff : raw[0] === 0x89 && raw[1] === 0x50 && raw[2] === 0x4e && raw[3] === 0x47;
    if (!validImage) return Response.json({ error: "Kandungan gambar tidak sah." }, { status: 400 });

    const result = await callGoogle({ action: "ekunjung_create", ...data, photo: { mimeType, base64 } });
    return Response.json({ success: true, id: result.id, status: result.status });
  } catch (error) {
    console.error("E-Kunjung save error", error instanceof Error ? error.message : error);
    return Response.json({ error: error instanceof Error ? error.message : "Rekod E-Kunjung tidak dapat disimpan sekarang." }, { status: 502 });
  }
}
