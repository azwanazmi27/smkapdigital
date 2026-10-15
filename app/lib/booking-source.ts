const clean = (value:unknown,max:number)=>typeof value==='string'?value.trim().replace(/\s+/g,' ').slice(0,max):'';
function connection() {
  const dedicated = Boolean(process.env.ETEMPAHAN_APPS_SCRIPT_URL && process.env.ETEMPAHAN_APPS_SCRIPT_TOKEN);
  const url = dedicated ? process.env.ETEMPAHAN_APPS_SCRIPT_URL : process.env.OPR_APPS_SCRIPT_URL;
  const token = dedicated ? process.env.ETEMPAHAN_APPS_SCRIPT_TOKEN : process.env.OPR_APPS_SCRIPT_TOKEN;
  if (!url || !token) throw new Error("Sambungan Google Sheet belum dikonfigurasi");
  return { url, token };
}

export async function callGoogle(payload: Record<string, unknown>) {
  const { url, token } = connection();
  const readOnly = payload.action === "etempahan_list" || payload.action === "etempahan_list_range";
  for (let attempt = 0; attempt < (readOnly ? 3 : 1); attempt++) {
    try {
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, token }), redirect: "follow", cache: "no-store", signal:AbortSignal.timeout(25000) });
      const result = await response.json() as Record<string, unknown>;
      if (!response.ok || result.ok !== true) throw new Error(typeof result.error === "string" ? result.error : "Sambungan E-Tempahan gagal");
      return result;
    } catch (error) {
      if (!readOnly || attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
  throw new Error("Sambungan E-Tempahan gagal");
}

export function normalizeBookings(value: unknown) {
  return Array.isArray(value) ? value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    const required = ["id", "room", "applicantName", "purpose", "startDate", "startTime", "endDate", "endTime", "status"] as const;
    if (!required.every((key) => typeof row[key] === "string")) return [];
    const ownerEmail = clean(row.ownerEmail || row.createdByEmail || row.email || row.applicantEmail, 160).toLowerCase();
    return [{ ...(Object.fromEntries(required.map((key) => [key, row[key]])) as Record<typeof required[number], string>), participants: Number(row.participants) || 0, ownerEmail }];
  }) : [];
}

