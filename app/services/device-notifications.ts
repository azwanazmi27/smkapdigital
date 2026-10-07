export type DevicePushState = "idle" | "loading" | "enabled" | "blocked" | "unsupported";
export const reminderKey = (userId: string) => `smkap:push-reminder:v1:${userId}`;
export function reminderDue(value: string | null, now = Date.now()) {
  const until = Number(value);
  return !Number.isFinite(until) || until <= now;
}
export function devicePushState(): DevicePushState {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  return Notification.permission === "denied" ? "blocked" : "idle";
}
async function pushRequest(body: unknown) {
  const response = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error("Pendaftaran notifikasi belum berjaya. Semak sambungan dan cuba semula.");
  return response.json();
}
export async function inspectDevicePush(): Promise<DevicePushState> {
  const state = devicePushState();
  if (state !== "idle" || Notification.permission !== "granted") return state;
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return "idle";
  const status = await pushRequest({ action: "status", endpoint: subscription.endpoint });
  // Permission alone is insufficient: repair a missing server registration too.
  if (!status.registered) await pushRequest({ action: "subscribe", ...subscription.toJSON() });
  return "enabled";
}
export async function activateDevicePush(): Promise<DevicePushState> {
  const state = devicePushState();
  if (state !== "idle") return state;
  // Called directly by the user's click, before any network await.
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "blocked" : "idle";
  const response = await fetch("/api/push?view=config", { cache: "no-store", signal: AbortSignal.timeout(12000) });
  const config = await response.json() as { publicKey?: string };
  if (!response.ok || !config.publicKey) throw new Error("Tetapan notifikasi belum tersedia. Cuba semula.");
  await navigator.serviceWorker.register("/sw.js");
  let timer: ReturnType<typeof setTimeout> | undefined;
  const registration = await Promise.race([navigator.serviceWorker.ready, new Promise<ServiceWorkerRegistration>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Notifikasi belum dapat dimulakan. Cuba semula.")), 10000);
  })]).finally(() => clearTimeout(timer));
  const key = config.publicKey;
  const raw = atob((key + "=".repeat((4 - key.length % 4) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  const subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: Uint8Array.from(raw, char => char.charCodeAt(0)) });
  await pushRequest({ action: "subscribe", ...subscription.toJSON() });
  return "enabled";
}
