// Start staging with only locally backed portal content and the existing Google
// session flow. Expand this list only after each integration is isolated.
export function stagingBlock(request: Request, mode?: string): Response | null {
  if (mode !== "isolated-staging") return null;
  const url = new URL(request.url);
  const path = url.pathname;
  const loginRead = path === "/api/admin-users" && request.method === "GET" &&
    [null, "config", "me", "staff-picker", "directory", "public-settings"].includes(url.searchParams.get("resource"));
  const localRead = request.method === "GET" && ["/api/staff-work", "/api/portfolio"].includes(path);
  const documentDrafts = path === "/api/documents" && ["GET", "POST"].includes(request.method);
  const portfolioSelection = path === "/api/portfolio" && ["PUT", "POST"].includes(request.method);
  const isolatedDriveRead = path === "/api/pengurusan" && request.method === "GET" &&
    (Boolean(url.searchParams.get("file")) || url.searchParams.get("health") === "1");
  const aiHealth = path === "/api/ai/health" && request.method === "GET";
  const allowed = isolatedDriveRead || aiHealth || portfolioSelection || localRead || documentDrafts || loginRead || path === "/api/session" || path === "/api/portal-content" || path === "/api/skas";
  if ((path === "/api" || path.startsWith("/api/")) && !allowed) {
    return Response.json({ error: "Modul staging ini belum diaktifkan: pengasingan integrasi masih dalam pengesahan.", code: "STAGING_INTEGRATION_BLOCKED" }, {
      status: 503, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
    });
  }
  return null;
}

export function stagingDocumentActionAllowed(mode: string | undefined, action: string): boolean {
  return mode !== "isolated-staging" || action === "save-draft";
}
