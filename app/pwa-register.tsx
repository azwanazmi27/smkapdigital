"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    let lastRefresh=0;
    const refresh=()=>{if(document.visibilityState!=="visible"||Date.now()-lastRefresh<3600000)return;lastRefresh=Date.now();void fetch('/api/session',{cache:'no-store'}).catch(()=>{lastRefresh=0;});};
    refresh();document.addEventListener('visibilitychange',refresh);
    const timer=window.setInterval(refresh,3600000);
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js");
    return ()=>{document.removeEventListener("visibilitychange",refresh);window.clearInterval(timer);};
  }, []);
  return null;
}
