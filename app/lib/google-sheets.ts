type AbsenceSheetRecord = Record<string, unknown> & { id?: unknown };

type TokenCache = { token: string; expiresAt: number };

const globalTokenCache = globalThis as typeof globalThis & { __smkapGoogleToken?: TokenCache };
const sheetName = "E-Keberadaan";

function configured() {
  return Boolean(
    process.env.EKEBERADAAN_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
  );
}

function base64Url(value: string | Uint8Array) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function pemBytes(pem: string) {
  const normalized = pem.replace(/\\n/g, "\n");
  const raw = normalized
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const binary = atob(raw);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function accessToken() {
  const cached = globalTokenCache.__smkapGoogleToken;
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64Url(JSON.stringify({
    iss: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claim}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemBytes(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || ""),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${base64Url(new Uint8Array(signature))}`,
    }),
    signal: AbortSignal.timeout(3000),
  });
  if (!response.ok) throw new Error(`Google OAuth ${response.status}`);
  const data = await response.json() as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("Google OAuth token tidak diterima");
  globalTokenCache.__smkapGoogleToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };
  return data.access_token;
}

function asText(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function rowFor(record: AbsenceSheetRecord) {
  return [[
    asText(record.id),
    asText(record.teacherName),
    asText(record.teacherId),
    asText(record.category),
    asText(record.absenceDate),
    asText(record.endDate),
    asText(record.reason),
    asText(record.duration),
    asText(record.startTime),
    asText(record.endTime),
    asText(record.note),
    asText(record.reliefStatus) || "pending",
    "AKTIF",
    asText(record.createdAt) || new Date().toISOString(),
    asText(record.updatedAt) || new Date().toISOString(),
    "",
  ]];
}

async function sheetsRequest(path: string, init?: RequestInit) {
  const token = await accessToken();
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${process.env.EKEBERADAAN_SHEET_ID}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    signal: AbortSignal.timeout(3000),
  });
  if (!response.ok) throw new Error(`Google Sheets ${response.status}`);
  return response.status === 204 ? null : response.json();
}

async function existingRows() {
  const range = encodeURIComponent(`'${sheetName}'!A2:P`);
  const data = await sheetsRequest(`/values/${range}`) as { values?: string[][] };
  return data.values || [];
}

export async function upsertAbsenceToSheet(record: AbsenceSheetRecord) {
  if (!configured() || !record.id) return false;
  try {
    const rows = await existingRows();
    const found = rows.findIndex((row) => row[0] === String(record.id));
    if (found >= 0) {
      const rowNumber = found + 2;
      const range = encodeURIComponent(`'${sheetName}'!A${rowNumber}:P${rowNumber}`);
      await sheetsRequest(`/values/${range}?valueInputOption=USER_ENTERED`, {
        method: "PUT",
        body: JSON.stringify({ range: `'${sheetName}'!A${rowNumber}:P${rowNumber}`, majorDimension: "ROWS", values: rowFor(record) }),
      });
    } else {
      const range = encodeURIComponent(`'${sheetName}'!A:P`);
      await sheetsRequest(`/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
        method: "POST",
        body: JSON.stringify({ range: `'${sheetName}'!A:P`, majorDimension: "ROWS", values: rowFor(record) }),
      });
    }
    return true;
  } catch (error) {
    console.warn("E-Keberadaan Google Sheet mirror unavailable", error);
    return false;
  }
}

export async function markAbsenceDeletedInSheet(id: string) {
  if (!configured() || !id) return false;
  try {
    const rows = await existingRows();
    const found = rows.findIndex((row) => row[0] === id);
    if (found < 0) return true;
    const rowNumber = found + 2;
    const row = Array.from({ length: 16 }, (_, index) => rows[found]?.[index] || "");
    row[12] = "DIPADAM";
    row[14] = new Date().toISOString();
    row[15] = new Date().toISOString();
    const range = encodeURIComponent(`'${sheetName}'!A${rowNumber}:P${rowNumber}`);
    await sheetsRequest(`/values/${range}?valueInputOption=USER_ENTERED`, {
      method: "PUT",
      body: JSON.stringify({ range: `'${sheetName}'!A${rowNumber}:P${rowNumber}`, majorDimension: "ROWS", values: [row] }),
    });
    return true;
  } catch (error) {
    console.warn("E-Keberadaan Google Sheet deletion mirror unavailable", error);
    return false;
  }
}
