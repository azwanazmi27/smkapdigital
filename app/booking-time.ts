export function bookingStartIsPast(date: string, time: string, now = Date.now()) {
  const start = Date.parse(`${date}T${time}:00+08:00`);
  return !Number.isFinite(start) || start < now;
}
export function nextBookingSlot(now = Date.now()) {
  const start = Math.ceil((now + 60000) / 900000) * 900000;
  const parts = (value: number) => {
    const shifted = new Date(value + 8 * 3600000).toISOString();
    return {date: shifted.slice(0,10), time: shifted.slice(11,16)};
  };
  return {start:parts(start), end:parts(start+3600000)};
}
export function malaysiaTime(now = Date.now()) {
  return new Date(now + 8 * 3600000).toISOString().slice(11,16);
}
