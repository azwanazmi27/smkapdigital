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
