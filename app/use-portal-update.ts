import { useEffect } from "react";

declare const __PORTAL_RELEASE__: string;

export function usePortalUpdate(atHome: boolean) {
  useEffect(() => {
    if (!atHome || process.env.NODE_ENV !== "production") return;
    const controller = new AbortController();
    let checking = false;
    const safeToReload = () => document.visibilityState === "visible" &&
      !document.querySelector('[aria-modal="true"], dialog[open], .folder-backdrop, .campus-account-menu') &&
      !document.activeElement?.matches('input, textarea, select, [contenteditable="true"]') &&
      !document.querySelector<HTMLInputElement>('.campus-search input')?.value;

    async function check() {
      if (checking || !safeToReload()) return;
      checking = true;
      try {
        const response = await fetch("/portal-release.json", {
          cache: "no-store", signal: controller.signal,
        });
        if (!response.ok) return;
        const { release } = await response.json();
        if (typeof release !== "string" || !/^[0-9a-f-]{36}$/i.test(release) ||
            release === __PORTAL_RELEASE__ || controller.signal.aborted || !safeToReload()) return;
        // Avoid reloading repeatedly if a cache serves the previous page again.
        const key = "smkap.reload-for-release";
        const attempt = __PORTAL_RELEASE__ + ":" + release;
        if (sessionStorage.getItem(key) === attempt) return;
        sessionStorage.setItem(key, attempt);
        window.location.reload();
      } catch {
        // Offline, interrupted, or storage unavailable: keep the current page usable.
      } finally {
        checking = false;
      }
    }

    void check();
    document.addEventListener("visibilitychange", check);
    window.addEventListener("pageshow", check);
    return () => {
      controller.abort();
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("pageshow", check);
    };
  }, [atHome]);
}
