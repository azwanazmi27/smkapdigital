type EdgeCache = {
  match(key: Request): Promise<Response | undefined>;
  put(key: Request, value: Response): Promise<void>;
  delete(key: Request): Promise<boolean>;
};

const cache = () => (globalThis as unknown as { caches?: { default?: EdgeCache } }).caches?.default;
const keyFor = (origin: string, date: string) => new Request(`${origin}/__internal/etempahan-status/${date}`);

export async function readBookingStatus<T>(origin: string, date: string, load: () => Promise<T>): Promise<{ value: T; checkedAt: string; source: "cache" | "sheet" }> {
  const edge = cache();
  const key = keyFor(origin, date);
  if (edge) {
    try {
      const hit = await edge.match(key);
      if (hit?.ok) {
        const saved = await hit.json() as { value: T; checkedAt: string };
        if (saved.checkedAt) return { ...saved, source: "cache" };
      }
    } catch { /* A cache outage must not block a live Sheet read. */ }
  }
  const value = await load();
  const checkedAt = new Date().toISOString();
  if (edge) {
    try {
      await edge.put(key, Response.json({ value, checkedAt }, { headers: { "Cache-Control": "s-maxage=20" } }));
    } catch { /* The portal still works if this data center cannot cache. */ }
  }
  return { value, checkedAt, source: "sheet" };
}

export async function clearBookingStatus(origin: string, dates: string[]) {
  const edge = cache();
  if (!edge) return;
  await Promise.all(dates.map(async (date) => {
    try { await edge.delete(keyFor(origin, date)); } catch { /* Other data centers expire within 20 seconds. */ }
  }));
}
