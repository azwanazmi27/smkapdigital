export const skasStandards = [
  ["1", "Kepimpinan"],
  ["2", "Pengurusan organisasi"],
  ["3.1", "Pengurusan kurikulum"],
  ["3.2", "Pengurusan kokurikulum"],
  ["3.3", "Pengurusan hal ehwal murid"],
  ["4", "Pembelajaran dan pemudahcaraan"],
  ["5.1", "Kemenjadian murid — akademik"],
  ["5.2", "Kemenjadian murid — kokurikulum"],
  ["5.3", "Kemenjadian murid — sahsiah"],
  ["5.4", "Pencapaian dan pengiktirafan"],
] as const;

export const skasEvidenceTypes = [
  "Carta organisasi",
  "Surat lantikan dan bidang tugas",
  "Pelan strategik, taktikal atau operasi",
  "Minit mesyuarat dan tindakan susulan",
  "Program, aktiviti atau OPR",
  "Pemantauan dan penambahbaikan",
  "Analisis, laporan atau keberhasilan",
  "Sijil, keputusan atau pengiktirafan",
  "Dokumen sokongan lain",
] as const;

export const skasDomains = [
  {
    name: "Pengurusan",
    standard: "1 / 2",
    units: ["Pengurusan Induk", "Perancangan Strategik", "Sumber Manusia", "Kewangan dan Audit", "Aset dan Stok", "Data dan Dokumentasi", "PIBG, Sarana dan PIBK", "Pembangunan Fizikal", "Bencana dan Keselamatan"],
  },
  {
    name: "Kurikulum",
    standard: "3.1",
    units: ["Pengurusan Kurikulum", "Panitia · Bahasa Melayu", "Panitia · Bahasa Inggeris", "Panitia · Bahasa Arab", "Panitia · Matematik", "Panitia · Matematik Tambahan", "Panitia · Sains", "Panitia · Fizik", "Panitia · Kimia", "Panitia · Biologi", "Panitia · Sejarah", "Panitia · Geografi", "Panitia · Pendidikan Islam", "Panitia · Pendidikan Seni", "Panitia · RBT dan Sains Komputer", "Pentaksiran dan Peperiksaan", "Jadual Waktu", "Pusat Sumber Sekolah", "PLC dan LDP", "Intervensi Akademik", "Teknologi Maklumat"],
  },
  {
    name: "Hal Ehwal Murid",
    standard: "3.3",
    units: ["Pengurusan HEM", "Disiplin dan Pengawas", "Kehadiran dan Keciciran", "Bimbingan dan Kaunseling", "Kebajikan dan Bantuan", "Kesihatan, 3K dan Keselamatan", "SPBT", "Asrama", "Kantin dan Pemakanan", "SUMUR"],
  },
  {
    name: "Kokurikulum",
    standard: "3.2",
    units: ["Pengurusan Kokurikulum", "Badan Beruniform · Kadet JPJ", "Badan Beruniform · Persekutuan Pengakap", "Badan Beruniform · Kadet Remaja Sekolah", "Badan Beruniform · Persatuan Pandu Puteri", "Badan Beruniform · PPIM", "Badan Beruniform · Kadet Bomba dan Penyelamat", "Badan Beruniform · Kadet Polis", "Kelab dan Persatuan · Bahasa Melayu", "Kelab dan Persatuan · Bahasa Inggeris/Scrabble", "Kelab dan Persatuan · Bahasa Arab", "Kelab dan Persatuan · PAI", "Kelab dan Persatuan · Kesihatan", "Kelab dan Persatuan · Kesenian Islam/Seni Muzik", "Kelab dan Persatuan · Pencegahan Jenayah", "Kelab dan Persatuan · Kerjaya", "Kelab dan Persatuan · Koperasi", "Kelab dan Persatuan · Alam Sekitar", "Kelab dan Persatuan · Pengguna", "Kelab dan Persatuan · SPBT", "Kelab dan Persatuan · PNB", "Kelab dan Persatuan · STEM", "Kelab dan Persatuan · Inovasi dan Rekacipta", "Sukan dan Permainan · Petanque/Bowles", "Sukan dan Permainan · Bola Jaring", "Sukan dan Permainan · Bola Tampar", "Sukan dan Permainan · Bola Baling", "Sukan dan Permainan · Bola Sepak", "Sukan dan Permainan · Olahraga/Merentas Desa", "Sukan dan Permainan · Catur", "Sukan dan Permainan · Sepak Takraw", "Sukan dan Permainan · Badminton", "Sukan dan Permainan · Ping Pong", "Sukan dan Permainan · Woodball", "Pasukan Sekolah · Silat", "Pasukan Sekolah · Memanah", "Pasukan Sekolah · Taekwando", "PAJSK dan Kehadiran", "Kejohanan dan Pencapaian", "Rumah Sukan"],
  },
  {
    name: "Pengajaran dan Pembelajaran",
    standard: "4",
    units: ["Perancangan PdP", "Pelaksanaan PdP", "Pentaksiran dalam PdP", "Pencerapan dan Pemantauan", "Refleksi dan Penambahbaikan", "Perkongsian Amalan Terbaik"],
  },
  {
    name: "Pencapaian",
    standard: "5.4",
    units: ["Akademik", "Kokurikulum", "Sahsiah", "Pertandingan dan Pengiktirafan", "Arkib Kejayaan"],
  },
  {
    name: "Kekuatan Sekolah",
    standard: "Pelengkap",
    units: ["Kepakaran Guru", "Inovasi", "Jaringan dan Jalinan", "Amalan Terbaik", "Kemudahan", "Identiti dan Kebitaraan Sekolah"],
  },
] as const;

export type SkasDomainName = (typeof skasDomains)[number]["name"];

export type SkasMappingSuggestion = {
  standardCode: string;
  standardLabel: string;
  domain: SkasDomainName;
  unitName: string;
  evidenceType: (typeof skasEvidenceTypes)[number];
  reason: string;
  confidence: "tinggi" | "sederhana";
};

type MappingInput = {
  category?: unknown;
  title?: unknown;
  storedSuggestions?: unknown;
  metadata?: unknown;
};

const standardLabels = new Map<string, string>(skasStandards.map(([code, label]) => [code, label]));
const tidy = (value: unknown) => typeof value === "string" ? value.trim() : "";
const fold = (value: unknown) => tidy(value).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function metadataFlag(metadata: unknown, group: "competition" | "external") {
  if (!metadata || typeof metadata !== "object") return false;
  const value = (metadata as Record<string, unknown>)[group];
  return Boolean(value && typeof value === "object" && (value as Record<string, unknown>).enabled === true);
}

function domainFromCategory(category: string): SkasDomainName {
  const value = fold(category);
  if (value.includes("kokurikulum")) return "Kokurikulum";
  if (value.startsWith("hem") || value.includes(" · hem") || value.includes("hal ehwal murid")) return "Hal Ehwal Murid";
  if (value.startsWith("kurikulum") || value.startsWith("tingkatan enam")) return "Kurikulum";
  if (value.startsWith("pengurusan")) return "Pengurusan";
  if (value.startsWith("pengajaran dan pembelajaran")) return "Pengajaran dan Pembelajaran";
  if (value.includes("arkib kejayaan") || value.includes("pencapaian")) return "Pencapaian";
  return "Kekuatan Sekolah";
}

function availableUnit(domain: SkasDomainName, preferred: string) {
  const definition = skasDomains.find((item) => item.name === domain) || skasDomains[0];
  const exact = definition.units.find((unit) => fold(unit) === fold(preferred));
  if (exact) return exact;
  const partial = definition.units.find((unit) => fold(unit).includes(fold(preferred)) || fold(preferred).includes(fold(unit)));
  return partial || definition.units[0];
}

function unitFromCategory(category: string, domain: SkasDomainName) {
  const parts = category.split(" · ").map((part) => part.trim()).filter(Boolean);
  const tail = parts.at(-1) || "";
  if (domain === "Kokurikulum" && parts.length >= 3) {
    const group = parts.at(-2) || "";
    if (fold(group).includes("pasukan sekolah")) return availableUnit(domain, `Pasukan Sekolah · ${tail}`);
    if (["badan beruniform", "kelab dan persatuan", "sukan dan permainan"].includes(fold(group))) {
      const cleaned = tail.replace(/^(Persatuan|Kelab)\s+/i, "");
      const label = group.replace(/\bdan\b/gi, "dan").replace(/\bpermainan\b/i, "Permainan").replace(/\bberuniform\b/i, "Beruniform");
      return availableUnit(domain, `${label} · ${cleaned}`);
    }
  }
  if (domain === "Kurikulum" && parts.length >= 2) return availableUnit(domain, `Panitia · ${tail}`);
  if (domain === "Pencapaian") return availableUnit(domain, "Arkib Kejayaan");
  return availableUnit(domain, tail);
}

function makeSuggestion(standardCode: string, domain: SkasDomainName, unitName: string, evidenceType: SkasMappingSuggestion["evidenceType"], reason: string, confidence: SkasMappingSuggestion["confidence"]): SkasMappingSuggestion {
  return { standardCode, standardLabel: standardLabels.get(standardCode) || "Standard sekolah", domain, unitName: availableUnit(domain, unitName), evidenceType, reason, confidence };
}

function storedCodes(value: unknown) {
  const entries = Array.isArray(value) ? value : [];
  return entries.flatMap((entry) => {
    const code = tidy(entry);
    if (/^5\.4(?:\.|$)/.test(code)) return ["5.4"];
    if (/^3\.[123]$/.test(code) || ["1", "2", "4", "5.1", "5.2", "5.3", "5.4"].includes(code)) return [code];
    if (code === "A9" || code.includes("Standard 1 / Standard 2")) return ["2"];
    return [];
  });
}

export function skasSignalProfile(input: MappingInput) {
  const text = fold(`${tidy(input.category)} ${tidy(input.title)}`);
  const signals = [];
  if (metadataFlag(input.metadata, "competition") || /pertandingan|kejohanan|johan|naib johan|tempat ketiga|anugerah|pingat|pencapaian|sijil/.test(text)) signals.push("competition");
  if ((/pemantauan|pencerapan|observasi/.test(text)) && (/pdp|pengajaran|pembelajaran|kelas/.test(text))) signals.push("monitoring_pdp");
  if (metadataFlag(input.metadata, "external")) signals.push("external");
  return signals.length ? signals.join("+") : "regular";
}

/** Deterministic fallback used for new and historic portal records. */
export function suggestSkasMappings(input: MappingInput): SkasMappingSuggestion[] {
  const category = tidy(input.category);
  const title = tidy(input.title);
  const text = fold(`${category} ${title}`);
  const domain = domainFromCategory(category);
  const domainDefinition = skasDomains.find((item) => item.name === domain) || skasDomains[0];
  const leadership = /kepimpinan|pengetua|peneraju/.test(text);
  const baseCode = domainDefinition.standard === "Pelengkap" ? "2" : domain === "Pengurusan" ? (leadership ? "1" : "2") : domainDefinition.standard.split(" ")[0];
  const baseUnit = unitFromCategory(category, domain);
  const profile = skasSignalProfile(input);
  const competition = profile.includes("competition");
  const external = metadataFlag(input.metadata, "external");
  const monitoringPdp = profile.includes("monitoring_pdp");
  const suggestions: SkasMappingSuggestion[] = [];

  if (competition) suggestions.push(makeSuggestion("5.4", "Pencapaian", "Pertandingan dan Pengiktirafan", "Sijil, keputusan atau pengiktirafan", "Maklumat menunjukkan pertandingan, keputusan, sijil atau pencapaian sekolah.", "tinggi"));
  if (monitoringPdp) suggestions.push(makeSuggestion("4", "Pengajaran dan Pembelajaran", "Pencerapan dan Pemantauan", "Pemantauan dan penambahbaikan", "Tajuk menunjukkan pemantauan atau pencerapan berkaitan PdP.", "tinggi"));
  suggestions.push(makeSuggestion(baseCode, domain, baseUnit, "Program, aktiviti atau OPR", category ? `Kategori OPR “${category}” dipadankan dengan bidang dan unit berkaitan.` : "Bidang dan unit yang dipilih digunakan sebagai pemetaan asas.", category ? "tinggi" : "sederhana"));
  if (external) suggestions.push(makeSuggestion("2", "Pengurusan", "PIBG, Sarana dan PIBK", "Program, aktiviti atau OPR", "Rekod menyatakan pelibatan ibu bapa, komuniti atau pihak luar.", "tinggi"));

  for (const code of storedCodes(input.storedSuggestions)) {
    if (suggestions.some((item) => item.standardCode === code)) continue;
    const matchingDomain = skasDomains.find((item) => item.standard.split(" ")[0] === code)?.name || domain;
    suggestions.push(makeSuggestion(code, matchingDomain, matchingDomain === domain ? baseUnit : skasDomains.find((item) => item.name === matchingDomain)?.units[0] || baseUnit, "Program, aktiviti atau OPR", "Cadangan terdahulu dinormalkan kepada kod standard yang sah.", "sederhana"));
  }

  const seen = new Set<string>();
  return suggestions.filter((item) => {
    const key = `${item.standardCode}|${item.domain}|${item.unitName}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 3);
}
