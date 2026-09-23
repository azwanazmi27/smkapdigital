import test from "node:test";
import assert from "node:assert/strict";
import { readBookingStatus, clearBookingStatus } from "../app/etempahan-cache.ts";
import { requestBookingStatus } from "../app/booking-status.ts";

test("room status cache serves a repeated date and clears after a booking change", async () => {
  const previous = globalThis.caches;
  const stored = new Map();
  globalThis.caches = { default: {
    async match(key) { return stored.get(key.url)?.clone(); },
    async put(key, value) { stored.set(key.url, value.clone()); },
    async delete(key) { return stored.delete(key.url); },
  } };
  try {
    let reads = 0;
    const load = async () => { reads++; return [{ id: `booking-${reads}` }]; };
    const origin = "https://portal.example";
    const first = await readBookingStatus(origin, "2026-09-24", load);
    const second = await readBookingStatus(origin, "2026-09-24", load);
    assert.equal(reads, 1);
    assert.equal(first.source, "sheet");
    assert.equal(second.source, "cache");
    assert.deepEqual(second.value, first.value);
    await clearBookingStatus(origin, ["2026-09-24"]);
    const third = await readBookingStatus(origin, "2026-09-24", load);
    assert.equal(reads, 2);
    assert.equal(third.source, "sheet");
  } finally { globalThis.caches = previous; }
});

test("slow room status stops visible waiting while allowing the cache to warm", async () => {
  let finish;
  let signal;
  let late;
  const pendingFetch = async (_url, options) => { signal = options.signal; return new Promise((resolve) => { finish = resolve; }); };
  await assert.rejects(() => requestBookingStatus("2026-09-24", 20, pendingFetch, (status) => { late = status; }), /Status belum disahkan/);
  assert.equal(signal, undefined);
  finish(Response.json({ bookings: [] }));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(late.bookings, []);
});
