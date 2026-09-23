export type BookingStatusResponse<T> = { bookings?: T[]; error?: string; checkedAt?: string; source?: "cache" | "sheet" };

export type BookingStatus<T> = { bookings: T[]; checkedAt: string; source: "cache" | "sheet" };

export async function requestBookingStatus<T>(date: string, timeoutMs = 4500, fetcher: typeof fetch = fetch, onLateResult?: (status: BookingStatus<T>) => void): Promise<BookingStatus<T>> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      timedOut = true;
      reject(new Error("Semakan melebihi 5 saat. Status belum disahkan; sila cuba semula."));
    }, timeoutMs);
  });
  const reading = (async () => {
    // Let a slow read finish so the Worker can warm its short-lived cache.
    // Only the visible wait has a deadline; later refreshes can use that cache.
    const response = await fetcher(`/api/etempahan?date=${encodeURIComponent(date)}`, { cache: "no-store" });
    const data = await response.json() as BookingStatusResponse<T>;
    if (!response.ok) throw new Error(data.error || "Status bilik tidak dapat dibaca");
    const status = { bookings: data.bookings || [], checkedAt: data.checkedAt || new Date().toISOString(), source: data.source || "sheet" };
    if (timedOut) onLateResult?.(status);
    return status;
  })();
  try {
    return await Promise.race([reading, deadline]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
