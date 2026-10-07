"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, X } from "lucide-react";
import { activateDevicePush, inspectDevicePush, reminderDue, reminderKey, type DevicePushState } from "./services/device-notifications";

export function useDeviceNotifications(userId?: string) {
  const [state, setState] = useState<DevicePushState>("idle");
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState("");
  const owner = useRef(userId);
  owner.current = userId;
  const busy = useRef(false);
  useEffect(() => {
    let cancelled = false;
    setState("idle"); setChecked(false); setError("");
    if (!userId) return;
    const check = async () => {
      if (busy.current || document.hidden) return;
      busy.current = true;
      try {
        const next = await inspectDevicePush();
        if (!cancelled) { setState(next); setChecked(true); setError(""); }
      } catch {
        // A network failure is not evidence that the user disabled notifications.
      } finally { busy.current = false; }
    };
    void check();
    const timer = window.setInterval(check, 60000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("online", check);
    return () => { cancelled = true; clearInterval(timer); document.removeEventListener("visibilitychange", check); window.removeEventListener("online", check); };
  }, [userId]);
  const enable = useCallback(async () => {
    if (!userId || busy.current) return;
    busy.current = true; setState("loading"); setError("");
    try {
      const next = await activateDevicePush();
      if (owner.current === userId) {
        setState(next); setChecked(true);
        if (next === "blocked") setError("Notifikasi disekat. Benarkan notifikasi SMKAP Digital dalam tetapan pelayar atau peranti, kemudian kembali ke portal.");
        if (next === "unsupported") setError("Pelayar ini belum menyokong notifikasi. Pada iPhone, tambah portal ke Skrin Utama dan buka melalui ikon itu.");
        if (next === "idle") setError("Kebenaran belum diberikan. Tekan Aktifkan dan pilih Benarkan untuk menerima notifikasi.");
      }
    } catch (failure) {
      if (owner.current === userId) { setState("idle"); setError(failure instanceof Error ? failure.message : "Notifikasi belum dapat diaktifkan. Cuba semula."); }
    } finally { busy.current = false; }
  }, [userId]);
  return { state, checked, error, enable };
}

export function DeviceNotificationReminder({ userId, blocked, state, checked, error, enable }: {
  userId: string; blocked: boolean; state: DevicePushState; checked: boolean; error: string; enable: () => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [iphone, setIphone] = useState(false);
  useEffect(() => {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const standalone = matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
    setIphone(Boolean(ios && !standalone));
  }, []);
  const dismiss = () => {
    try { localStorage.setItem(reminderKey(userId), String(Date.now() + 86400000)); } catch { /* Keep session dismissal if storage is unavailable. */ }
    setDismissed(true); setVisible(false);
  };
  useEffect(() => {
    if (!checked || blocked || dismissed || state === "enabled") { setVisible(false); return; }
    const check = () => {
      if (document.hidden || document.querySelector('dialog[open]')) return;
      try { if (!reminderDue(localStorage.getItem(reminderKey(userId)))) return; } catch { /* Storage may be restricted. */ }
      setVisible(true);
    };
    const timer = window.setInterval(check, 2000);
    return () => clearInterval(timer);
  }, [checked, blocked, dismissed, state, userId]);
  useEffect(() => {
    const element = dialog.current;
    if (!visible || !element) return;
    element.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { element.close(); document.body.style.overflow = overflow; };
  }, [visible]);
  // Do not re-request a browser permission that the user has already denied.
  const guidance = state === "blocked" ? "Notifikasi disekat pada peranti ini. Buka tetapan notifikasi pelayar atau peranti, benarkan notifikasi untuk SMKAP Digital, kemudian kembali ke portal."
    : iphone ? "Untuk menerima notifikasi pada iPhone atau iPad, tambah portal ke Skrin Utama melalui menu Kongsi. Buka portal dari ikon itu, kemudian tekan Aktifkan notifikasi."
    : state === "unsupported" ? "Pelayar ini belum menyokong notifikasi portal. Buka portal menggunakan pelayar yang menyokong notifikasi atau kemas kini pelayar anda."
    : "Terima ringkasan tugasan pagi serta peringatan kelas dan relief pada peranti ini, walaupun portal tidak dibuka.";
  const canEnable = !iphone && state !== "blocked" && state !== "unsupported";
  return <dialog ref={dialog} className="device-push-reminder" aria-labelledby="device-push-title" aria-describedby="device-push-description" onCancel={event => { event.preventDefault(); dismiss(); }}>
    <button className="device-push-close" aria-label="Ingatkan saya kemudian" onClick={dismiss}><X aria-hidden="true" size={22}/></button>
    <span className="device-push-icon"><Bell aria-hidden="true" size={28}/></span>
    <small>NOTIFIKASI PERANTI</small>
    <h2 id="device-push-title">Jangan terlepas tugasan cikgu</h2>
    <p id="device-push-description">{guidance}</p>
    {error && <p className="device-push-error" role="alert">{error}</p>}
    <div className="device-push-actions">
      {canEnable && <button className="device-push-enable" disabled={state === "loading"} onClick={() => void enable()}>{state === "loading" ? "Mengaktifkan…" : "Aktifkan notifikasi"}</button>}
      <button onClick={dismiss}>Nanti</button>
    </div>
    <p className="device-push-hint">Jika pilih Nanti, BangWan akan ingatkan semula selepas 24 jam apabila cikgu membuka portal.</p>
  </dialog>;
}
