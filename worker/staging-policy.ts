// Start staging with only locally backed portal content and the existing Google
// session flow. Expand this list only after each integration is isolated.
export function stagingBlock(request: Request, mode?: string): Response | null {
  if (mode !== "isolated-staging") return null;
  const url = new URL(request.url);
  const path = url.pathname;
  const loginRead = path === "/api/admin-users" && request.method === "GET" &&
    [null, "config", "me", "staff-picker", "directory", "public-settings"].includes(url.searchParams.get("resource"));
  const allowed = loginRead || path === "/api/session" || path === "/api/portal-content" || path === "/api/skas";
  if ((path === "/api" || path.startsWith("/api/")) && !allowed) {
    return Response.json({ error: "Modul staging ini belum diaktifkan: pengasingan integrasi masih dalam pengesahan.", code: "STAGING_INTEGRATION_BLOCKED" }, {
      status: 503, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
    });
  }
  return null;
}
