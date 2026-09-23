import { portalActor, type PortalActor } from "../../server-auth";

type BookingBody = Record<string, unknown>;

const rooms = new Set(["Pusat Sumber Sekolah", "Pusat Akses", "Bilik Gerakan", "Bilik KKQ", "Bilik Media", "Makmal Sibaweh", "Makmal Komputer 1", "Makmal Komputer 2", "Dewan Al Farabi", "Surau As-Syafie", "Bilik Seni"]);
const purposes = new Set(["PdPC", "Mesyuarat", "Taklimat", "Perjumpaan", "Latihan SPTS", "Program Sekolah", "Lain-lain"]);
const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "";

function connection() {
  const dedicated = Boolean(process.env.ETEMPAHAN_APPS_SCRIPT_URL && process.env.ETEMPAHAN_APPS_SCRIPT_TOKEN);
  const url = dedicated ? process.env.ETEMPAHAN_APPS_SCRIPT_URL : process.env.OPR_APPS_SCRIPT_URL;
  const token = dedicated ? process.env.ETEMPAHAN_APPS_SCRIPT_TOKEN : process.env.OPR_APPS_SCRIPT_TOKEN;
  if (!url || !token) throw new Error("Sambungan Google Sheet belum dikonfigurasi");
  return { url, token };
}

async function callGoogle(payload: Record<string, unknown>) {
  const { url, token } = connection();
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, token }), redirect: "follow", cache: "no-store" });
  const result = await response.json() as Record<string, unknown>;
  if (!response.ok || result.ok !== true) throw new Error(typeof result.error === "string" ? result.error : "Sambungan E-Tempahan gagal");
  return result;
}

function normalizeBookings(value: unknown) {
  return Array.isArray(value) ? value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    const required = ["id", "room", "applicantName", "purpose", "startDate", "startTime", "endDate", "endTime", "status"];
    if (!required.every((key) => typeof row[key] === "string") || !rooms.has(String(row.room))) return [];
    const ownerEmail = clean(row.ownerEmail || row.createdByEmail || row.email || row.applicantEmail, 160).toLowerCase();
    return [{ ...Object.fromEntries(required.map((key) => [key, row[key]])), participants: Number(row.participants) || 0, ownerEmail }];
  }) : [];
}

type NormalizedBooking = ReturnType<typeof normalizeBookings>[number];
const isAdmin = (actor: PortalActor | null) => Boolean(actor && ["admin", "super_admin"].includes(actor.role));
const samePerson = (booking: NormalizedBooking, actor: PortalActor | null) => Boolean(actor && (
  (booking.ownerEmail && booking.ownerEmail === actor.email.toLowerCase()) ||
  (!booking.ownerEmail && clean(booking.applicantName, 120).toLocaleLowerCase("ms-MY") === clean(actor.name, 120).toLocaleLowerCase("ms-MY"))
));
const presentBooking = (booking: NormalizedBooking, actor: PortalActor | null) => {
  const { ownerEmail: _ownerEmail, ...safe } = booking;
  return { ...safe, canDelete: isAdmin(actor) || samePerson(booking, actor) };
};

function datesBetween(from: string, to: string, maximum = 62) {
  const start = new Date(`${from}T12:00:00+08:00`), end = new Date(`${to}T12:00:00+08:00`);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end < start) return [];
  const dates: string[] = [];
  for (const cursor = new Date(start); cursor <= end && dates.length < maximum; cursor.setDate(cursor.getDate() + 1)) dates.push(cursor.toISOString().slice(0, 10));
  return dates;
}

export async function GET(request: Request) {
  try {
    const actor = await portalActor(request);
    const params = new URL(request.url).searchParams;
    const date = params.get("date") || "", from = params.get("from") || "", to = params.get("to") || "";
    if (from || to) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return Response.json({ error: "Julat tarikh tidak sah." }, { status: 400 });
      const dates = datesBetween(from, to);
      if (!dates.length || dates.length > 61) return Response.json({ error: "Julat senarai mestilah tidak melebihi 61 hari." }, { status: 400 });
      const results = await Promise.all(dates.map((item) => callGoogle({ action: "etempahan_list", date: item })));
      const unique = new Map<string, ReturnType<typeof normalizeBookings>[number]>();
      results.flatMap((result) => normalizeBookings(result.bookings)).forEach((booking) => unique.set(String(booking.id), booking));
      return Response.json({ success: true, bookings: Array.from(unique.values()).sort((a, b) => `${a.startDate}${a.startTime}`.localeCompare(`${b.startDate}${b.startTime}`)).map((booking) => presentBooking(booking, actor)) }, { headers: { "Cache-Control": "private, no-store" } });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return Response.json({ error: "Tarikh tidak sah." }, { status: 400 });
    const result = await callGoogle({ action: "etempahan_list", date });
    const bookings = normalizeBookings(result.bookings);
    return Response.json({ success: true, bookings: bookings.map((booking) => presentBooking(booking, actor)) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("E-Tempahan list error", error instanceof Error ? error.message : error);
    return Response.json({ error: "Status bilik tidak dapat dibaca sekarang." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await portalActor(request);
    const body = await request.json() as BookingBody;
    const room = clean(body.room, 100), applicantName = clean(body.applicantName, 120), email = clean(body.email, 160).toLowerCase();
    const startDate = clean(body.startDate, 10), startTime = clean(body.startTime, 5), endDate = clean(body.endDate, 10), endTime = clean(body.endTime, 5), purpose = clean(body.purpose, 100);
    // Bilangan peserta tidak lagi diminta dalam borang. Nilai ini dikekalkan
    // untuk serasi dengan rekod dan automasi Google Sheet sedia ada.
    const participants = Number(body.participants) || 1;
    if (!rooms.has(room)) return Response.json({ error: "Sila pilih bilik atau ruang yang hendak ditempah." }, { status: 400 });
    if (!applicantName) return Response.json({ error: "Sila masukkan nama pemohon." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: "Sila masukkan alamat e-mel yang sah." }, { status: 400 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) return Response.json({ error: "Sila lengkapkan tarikh mula dan tarikh tamat." }, { status: 400 });
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) return Response.json({ error: "Sila lengkapkan masa mula dan masa tamat." }, { status: 400 });
    if (!purposes.has(purpose)) return Response.json({ error: "Sila pilih tujuan penggunaan." }, { status: 400 });
    if (!Number.isInteger(participants) || participants < 1 || participants > 1000) return Response.json({ error: "Maklumat tempahan tidak sah." }, { status: 400 });
    const start = new Date(`${startDate}T${startTime}:00+08:00`), end = new Date(`${endDate}T${endTime}:00+08:00`);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return Response.json({ error: "Tarikh dan waktu akhir mestilah selepas tarikh dan waktu mula." }, { status: 400 });
    // Keep the original fields and send the legacy date/time aliases too. This
    // avoids a false overlap when the connected Sheet script still reads `date`.
    const result = await callGoogle({ action: "etempahan_create", room, applicantName, email, ownerEmail: actor?.email || email, createdByEmail: actor?.email || email, startDate, startTime, endDate, endTime, date: startDate, time: startTime, purpose, participants, sendConfirmation: true });
    const count = Number(result.count) || Math.max(1, datesBetween(startDate, endDate).length);
    return Response.json({ success: true, id: result.id, count, status: result.status || "Diluluskan", emailSent: result.emailSent !== false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tempahan tidak dapat diproses.";
    const conflict = /bertindih|ditempah|conflict/i.test(message);
    console.error("E-Tempahan create error", message);
    return Response.json({ error: conflict ? message : "Tempahan tidak dapat diproses sekarang. E-mel keputusan tidak dihantar." }, { status: conflict ? 409 : 502 });
  }
}

export async function DELETE(request: Request) {
  try {
    const actor = await portalActor(request);
    if (!actor) return Response.json({ error: "Sila log masuk untuk membatalkan tempahan." }, { status: 401 });
    const body = await request.json() as BookingBody;
    const id = clean(body.id, 160), startDate = clean(body.startDate, 10);
    if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return Response.json({ error: "Maklumat tempahan tidak sah." }, { status: 400 });

    const listed = await callGoogle({ action: "etempahan_list", date: startDate });
    const booking = normalizeBookings(listed.bookings).find((item) => item.id === id);
    if (!booking) return Response.json({ error: "Tempahan tidak ditemui atau telah dipadam." }, { status: 404 });
    if (!isAdmin(actor) && !samePerson(booking, actor)) return Response.json({ error: "Anda hanya boleh memadam tempahan sendiri." }, { status: 403 });

    const payload = { id, bookingId: id, startDate, date: startDate, requesterEmail: actor.email, email: actor.email, isAdmin: isAdmin(actor) };
    // The original Sheet script has existed in a few versions. Try only the
    // supported delete aliases so older deployments remain compatible.
    let lastError: unknown;
    for (const action of ["etempahan_delete", "etempahan_cancel", "delete_booking", "deleteBooking"]) {
      try { await callGoogle({ action, ...payload }); lastError = undefined; break; }
      catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : "";
        if (!/action|tindakan|dikenali|unknown|sah/i.test(message)) throw error;
      }
    }
    if (lastError) throw lastError;
    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tempahan tidak dapat dipadam.";
    console.error("E-Tempahan delete error", message);
    return Response.json({ error: message }, { status: 502 });
  }
}
