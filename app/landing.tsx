"use client";

import { useState } from "react";

type Folder = "ibubapa" | "warga" | "tentang" | "pengunjung" | "oprhub" | "oprgenerator" | "admin" | null;
type SubItem = { icon: string; title: string; text: string; badge?: string; href?: string; folder?: Folder };

const folders = [
  { id: "tentang", no: "01", icon: "⌕", title: "Tentang Sekolah", text: "Kenali SMK Agama Pahang", count: "3 bahagian", accent: "purple" },
  { id: "warga", no: "02", icon: "◎", title: "Warga Sekolah", text: "Urusan guru dan kakitangan", count: "4 modul", accent: "blue" },
  { id: "ibubapa", no: "03", icon: "⌂", title: "Ibu Bapa", text: "Maklumat dan urusan penjaga", count: "3 pilihan", accent: "teal" },
  { id: "pengunjung", no: "04", icon: "⌁", title: "Pengunjung", text: "Daftar dan dapatkan panduan", count: "3 pilihan", accent: "gold" },
] as const;

const folderContent: Record<Exclude<Folder, null | "admin" | "oprgenerator">, { title: string; intro: string; items: SubItem[] }> = {
  ibubapa: {
    title: "Ibu Bapa",
    intro: "Maklumat penting sekolah yang mudah dicapai oleh ibu bapa dan penjaga.",
    items: [
      { icon: "▤", title: "Hebahan sekolah", text: "Pengumuman dan makluman terkini" },
      { icon: "□", title: "Takwim sekolah", text: "Tarikh dan aktiviti penting" },
      { icon: "☎", title: "Hubungi sekolah", text: "Saluran rasmi untuk pertanyaan" },
    ],
  },
  warga: {
    title: "Warga Sekolah",
    intro: "Semua urusan kerja guru dan kakitangan dihimpunkan di sini.",
    items: [
      { icon: "✎", title: "Pusat OPR", text: "Cipta dan semak laporan mengikut bidang", folder: "oprhub" },
      { icon: "✓", title: "E-Keberadaan & Relief", text: "Lapor tidak hadir, kemudian urus relief", href: "https://sistem-relief-smap.noorazwan092.chatgpt.site", badge: "Buka" },
      { icon: "□", title: "E-Tempahan", text: "Tempahan bilik dan kemudahan sekolah" },
      { icon: "⑥", title: "Tingkatan Enam", text: "Kurikulum, HEM dan Kokurikulum" },
    ],
  },
  tentang: {
    title: "Tentang Sekolah",
    intro: "Kenali organisasi, warga dan hala tuju SMK Agama Pahang.",
    items: [
      { icon: "⌂", title: "Profil sekolah", text: "Maklumat dan hala tuju SMKAP" },
      { icon: "♙", title: "Carta organisasi", text: "Struktur pengurusan sekolah" },
      { icon: "◉", title: "Senarai guru", text: "Direktori nama dan jawatan" },
    ],
  },
  pengunjung: {
    title: "Pengunjung",
    intro: "Daftar kehadiran dan dapatkan panduan sebelum berurusan di sekolah.",
    items: [
      { icon: "⌁", title: "E-Kunjung", text: "Imbas QR dan daftar masuk", badge: "QR" },
      { icon: "↗", title: "Panduan ke sekolah", text: "Lokasi dan panduan ketibaan" },
      { icon: "☎", title: "Hubungi pejabat", text: "Saluran rasmi urusan pelawat" },
    ],
  },
  oprhub: {
    title: "Pusat OPR",
    intro: "Cipta satu OPR, kemudian semak laporan yang difailkan mengikut bidang berkaitan.",
    items: [
      { icon: "＋", title: "Cipta OPR baharu", text: "Penjana OPR rasmi dalam portal", folder: "oprgenerator", badge: "AI" },
      { icon: "◈", title: "Pengurusan", text: "Laporan pengurusan", badge: "12" },
      { icon: "▥", title: "Kurikulum", text: "Laporan akademik", badge: "15" },
      { icon: "♡", title: "Hal Ehwal Murid", text: "Laporan HEM", badge: "8" },
      { icon: "✦", title: "Kokurikulum", text: "Laporan aktiviti", badge: "7" },
      { icon: "⑥", title: "Tingkatan Enam", text: "Kurikulum, HEM & Kokurikulum", badge: "5" },
      { icon: "•••", title: "Lain-lain", text: "Laporan kategori tambahan", badge: "0" },
    ],
  },
};

export function LandingPortal() {
  const [open, setOpen] = useState<Folder>(null);
  const [toast, setToast] = useState("");

  const closeCurrentView = () => {
    if (open === "oprgenerator") return setOpen("oprhub");
    if (open === "oprhub") return setOpen("warga");
    setOpen(null);
  };

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };

  return <main className="landing-shell">
    <div className="landing-noise" aria-hidden="true"></div>
    <header className="landing-header">
      <div className="official-logo"><img src="/logo-smkap.png" alt="Logo rasmi SMK Agama Pahang" /></div>
      <div className="portal-label"><i></i><span>PORTAL RASMI</span><b>2026</b></div>
      <button className="admin-entry" onClick={() => setOpen("admin")}><span>⚙</span><div><strong>Pentadbir</strong><small>Urus kandungan</small></div></button>
    </header>

    <section className="landing-main">
      <div className="landing-intro">
        <div className="intro-label"><i></i> PORTAL SEHENTI WARGA SMKAP</div>
        <h1>Urusan sekolah,<br/><em>lebih mudah.</em></h1>
        <p>Semua perkhidmatan digital sekolah dalam satu tempat. Pilih urusan anda untuk bermula.</p>
        <div className="school-name"><span>س</span><div><strong>SMK Agama Pahang</strong><small>Muadzam Shah · Berilmu · Bertakwa</small></div></div>
      </div>

      <div className="folder-area">
        <div className="folder-heading"><span><i></i> MULA DI SINI</span><strong>Apakah yang anda mahu lakukan?</strong></div>
        <div className="folder-grid">
          {folders.map((folder) => <button key={folder.id} className={`folder-card ${folder.accent}`} onClick={() => setOpen(folder.id)}>
            <span className="folder-no">{folder.no}</span>
            <div className="folder-icon">{folder.icon}</div>
            <h2>{folder.title}</h2>
            <p>{folder.text}</p>
            <div className="folder-foot"><strong>{folder.count}</strong><i>↗</i></div>
          </button>)}
        </div>
        <p className="safe-note"><span>✓</span> Selamat dan mudah digunakan · Gunakan akaun sekolah apabila diminta.</p>
      </div>
    </section>

    <footer className="landing-footer"><span>SMK AGAMA PAHANG · MUADZAM SHAH</span><button onClick={() => notify("Panduan ringkas akan dibuka di sini")}>? Perlukan bantuan</button></footer>

    {open && <div className="folder-backdrop" onMouseDown={(e) => e.target === e.currentTarget && closeCurrentView()}>
      <section className={`folder-modal ${open === "oprgenerator" || open === "oprhub" ? "generator-modal" : ""}`} role="dialog" aria-modal="true" aria-labelledby="folder-title">
        <button className="portal-home-button" onClick={() => setOpen(null)}>⌂ Portal Utama</button>
        <button className="folder-close" onClick={closeCurrentView} aria-label={open === "oprgenerator" ? "Kembali ke Pusat OPR" : open === "oprhub" ? "Kembali ke Warga Sekolah" : "Tutup"}>×</button>
        {open === "admin" ? <AdminPanel notify={notify} /> : open === "oprgenerator" ? <OprGenerator notify={notify} close={() => setOpen("oprhub")} /> : open === "oprhub" ? <OprDashboard create={() => setOpen("oprgenerator")} notify={notify} /> : <>
          <span className="modal-overline">PILIH SUBMODUL</span>
          <h2 id="folder-title">{folderContent[open].title}</h2>
          <p>{folderContent[open].intro}</p>
          <div className="submodule-grid">{folderContent[open].items.map((item) => {
            const inside = <><span>{item.icon}</span><div><strong>{item.title}</strong><small>{item.text}</small></div>{item.badge && <b>{item.badge}</b>}<i>{item.href ? "↗" : "›"}</i></>;
            if (item.href) return <a key={item.title} href={item.href} target="_blank" rel="noreferrer">{inside}</a>;
            return <button key={item.title} onClick={() => item.folder ? setOpen(item.folder) : notify(`${item.title} dipilih`)}>{inside}</button>;
          })}</div>
        </>}
      </section>
    </div>}
    {toast && <div className="landing-toast" role="status"><span>✓</span>{toast}</div>}
  </main>;
}

const oprCategories = [
  ["Pengurusan", 12, "#79d4c5"], ["Kurikulum", 15, "#78b9df"], ["HEM", 8, "#dd8d78"],
  ["Kokurikulum", 7, "#e2ba65"], ["Tingkatan Enam", 5, "#a792d5"], ["Lain-lain", 1, "#8ea3aa"],
] as const;

type OprReport = { title: string; category: string; organiser: string; owner: string; date: string; status: string };

function OprDashboard({ create, notify }: { create: () => void; notify: (message: string) => void }) {
  const [folderView, setFolderView] = useState<string | null>(null);
  const [folderSearch, setFolderSearch] = useState("");
  const [selected, setSelected] = useState<OprReport | null>(null);
  const reports: OprReport[] = [
    { title: "Mesyuarat Pengurusan Sekolah", category: "Pengurusan", organiser: "Pejabat Sekolah", owner: "Pn. Suriha", date: "18 Ogos 2026", status: "Lengkap" },
    { title: "Program Ihya’ Ramadan", category: "HEM", organiser: "Unit HEM", owner: "Ustazah Noraini", date: "15 Ogos 2026", status: "Lengkap" },
    { title: "Bengkel Teknik Menjawab SPM", category: "Kurikulum", organiser: "Unit Kurikulum", owner: "Pn. Farah", date: "12 Ogos 2026", status: "Lengkap" },
    { title: "Kejohanan Merentas Desa", category: "Kokurikulum", organiser: "Unit Kokurikulum", owner: "En. Khairul", date: "8 Ogos 2026", status: "Draf" },
    { title: "Program Orientasi Tingkatan Enam", category: "Tingkatan Enam", organiser: "Unit Tingkatan Enam", owner: "En. Mohd Fadil", date: "5 Ogos 2026", status: "Lengkap" },
    { title: "Gotong-royong Perdana", category: "Lain-lain", organiser: "Kelab Warga SMKAP", owner: "Pn. Aisyah", date: "2 Ogos 2026", status: "Lengkap" },
  ];
  const visible = reports.slice(0, 3);
  const folderReports = reports.filter((report) => (folderView === "Semua" || report.category === folderView) && `${report.title} ${report.organiser} ${report.owner}`.toLowerCase().includes(folderSearch.toLowerCase()));
  const openFolder = (name: string) => { setFolderSearch(""); setFolderView(name); };
  const printReport = (report: OprReport) => {
    const printWindow = window.open("", "_blank", "width=900,height=1100");
    if (!printWindow) return notify("Benarkan tetingkap baharu untuk mencetak OPR");
    printWindow.document.write(`<!doctype html><html lang="ms"><head><title>${report.title}</title><style>body{font-family:Arial,sans-serif;color:#17344a;margin:0;padding:36px;background:#eef6fb}.paper{max-width:760px;margin:auto;background:white;border:1px solid #c9dce8;padding:34px;box-shadow:0 14px 40px #abc3d455}.head{border-radius:14px;background:#d8effb;padding:22px;border-bottom:5px solid #2d77a5}.head small{letter-spacing:.15em;font-weight:700}.head h1{font-size:24px;margin:10px 0 3px}.meta{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:20px 0}.meta div,.section{border:1px solid #dbe7ee;border-radius:9px;padding:13px}.meta small,.section h2{display:block;color:#2d77a5;font-size:10px;letter-spacing:.08em}.meta strong{display:block;margin-top:5px;font-size:13px}.section{margin-top:12px}.section h2{margin:0 0 8px}.section p{font-size:13px;line-height:1.65;margin:0}.sign{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:22px}.sign div{min-height:85px;border-top:1px solid #aebfca;padding-top:9px;font-size:12px}@media print{body{background:white;padding:0}.paper{box-shadow:none;border:0}}</style></head><body><main class="paper"><header class="head"><small>SMK AGAMA PAHANG · ONE PAGE REPORT</small><h1>${report.title}</h1><span>${report.category}</span></header><section class="meta"><div><small>TARIKH</small><strong>${report.date}</strong></div><div><small>ANJURAN</small><strong>${report.organiser}</strong></div><div><small>PENYEDIA</small><strong>${report.owner}</strong></div><div><small>STATUS</small><strong>${report.status}</strong></div></section><section class="section"><h2>PELAKSANAAN PROGRAM</h2><p>Program telah dilaksanakan mengikut perancangan oleh ${report.organiser}. Aktiviti diselaraskan dengan teratur dan penglibatan peserta direkodkan bagi tujuan pelaporan sekolah.</p></section><section class="section"><h2>OBJEKTIF</h2><p>Melaksanakan program secara sistematik serta mencapai matlamat yang ditetapkan oleh pihak sekolah.</p></section><section class="section"><h2>HASIL / IMPAK</h2><p>Program berjalan lancar dan memberi manfaat kepada warga sekolah yang terlibat.</p></section><section class="sign"><div>Disediakan oleh<br><strong>${report.owner}</strong></div><div>Disahkan oleh<br><strong>Pihak Pengurusan SMKAP</strong></div></section></main><script>window.addEventListener('load',()=>window.print())<\/script></body></html>`);
    printWindow.document.close();
  };
  if (selected) return <article className="saved-opr-preview" role="document" aria-label={`Pratonton ${selected.title}`}>
    <button className="saved-preview-close" onClick={() => setSelected(null)} aria-label="Tutup pratonton">×</button>
    <header><span>SMK AGAMA PAHANG · ONE PAGE REPORT</span><h2>{selected.title}</h2><p>{selected.category}</p></header>
    <div className="saved-preview-meta"><div><small>Tarikh</small><strong>{selected.date}</strong></div><div><small>Anjuran</small><strong>{selected.organiser}</strong></div><div><small>Penyedia</small><strong>{selected.owner}</strong></div><div><small>Status</small><strong>{selected.status}</strong></div></div>
    <section><h3>Pelaksanaan program</h3><p>Program telah dilaksanakan mengikut perancangan oleh {selected.organiser}. Aktiviti diselaraskan dengan teratur dan penglibatan peserta direkodkan bagi tujuan pelaporan sekolah.</p></section>
    <div className="saved-preview-columns"><section><h3>Objektif</h3><p>Melaksanakan program secara sistematik serta mencapai matlamat yang ditetapkan oleh pihak sekolah.</p></section><section><h3>Hasil / impak</h3><p>Program berjalan lancar dan memberi manfaat kepada warga sekolah yang terlibat.</p></section></div>
    <div className="saved-preview-signatures"><div><small>DISEDIAKAN OLEH</small><strong>{selected.owner}</strong></div><div><small>DISAHKAN OLEH</small><strong>Pihak Pengurusan SMKAP</strong></div></div>
    <footer><button onClick={() => setSelected(null)}>Tutup pratonton</button><button className="print-opr" onClick={() => printReport(selected)}>▣ Cetak OPR</button></footer>
  </article>;
  return <div className="opr-dashboard">
    <div className="opr-dash-head"><div><span className="modal-overline">PUSAT OPR</span><h2 id="folder-title">Dashboard laporan sekolah</h2><p>Pantau, cari dan hasilkan One Page Report dalam satu ruang kerja.</p></div><button className="dash-create" onClick={create}><b>＋</b><span>Buat OPR Baharu<small>Tekan di sini untuk mula</small></span></button></div>
    <div className="opr-kpis">
      <article><span>JUMLAH OPR</span><strong>48</strong><small><i>↑ 12%</i> berbanding bulan lalu</small></article>
      <article><span>BULAN INI</span><strong>9</strong><small>7 lengkap · 2 draf</small></article>
      <article><span>PALING AKTIF</span><strong className="word">Kurikulum</strong><small>15 laporan dihantar</small></article>
      <article className="ai-kpi"><span>AI GEMINI</span><strong className="word">Sedia</strong><small>Penulisan pintar OPR</small></article>
    </div>
    <section className="opr-folder-section"><div className="dash-section-title"><div><span>FOLDER BIDANG</span><h3>Tekan folder untuk membuka senarai OPR</h3></div><b>Senarai terapung</b></div><div className="opr-folder-grid"><button onClick={() => openFolder("Semua")}><span>▤</span><div><strong>Semua OPR</strong><small>48 laporan</small></div></button>{oprCategories.map(([name,count]) => <button key={name} onClick={() => openFolder(name)}><span>▰</span><div><strong>{name}</strong><small>{count} laporan</small></div></button>)}</div></section>
    <section className="recent-opr"><div className="dash-section-title"><div><span>LAPORAN TERKINI</span><h3>3 laporan paling terkini</h3><small className="report-help">Tekan nama laporan untuk membuka pratonton.</small></div><div className="report-filters"><button onClick={() => openFolder("Semua")}>Lihat semua</button><button onClick={() => openFolder("Semua")}>⌕ Cari</button></div></div><div className="report-list">{visible.map((report) => <button key={report.title} onClick={() => setSelected(report)}><span className="report-file">▤</span><div><strong>{report.title}</strong><small>{report.organiser} · {report.date} · {report.owner}</small></div><b>{report.category}</b><em className={report.status === "Draf" ? "draft" : ""}><i></i>{report.status}</em><span className="report-arrow">›</span></button>)}</div></section>
    <div className="opr-dash-grid summary-only"><section className="opr-chart-card"><div className="dash-section-title"><div><span>RINGKASAN BIDANG</span><h3>Agihan semua laporan</h3></div><b>48 OPR</b></div><div className="category-bars">{oprCategories.map(([name,count,color]) => <button key={name} onClick={() => openFolder(name)}><span><i style={{backgroundColor:color}}></i>{name}</span><strong>{count}</strong><em><i style={{width:`${Math.max(4,(count/15)*100)}%`,backgroundColor:color}}></i></em></button>)}</div></section></div>
    {folderView && <div className="opr-folder-float-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setFolderView(null)}><section className="opr-folder-float" role="dialog" aria-modal="true" aria-label={`Senarai OPR ${folderView}`}>
      <button className="folder-float-close" onClick={() => setFolderView(null)} aria-label="Tutup senarai folder">×</button>
      <span className="modal-overline">FOLDER BIDANG</span><h3>{folderView === "Semua" ? "Semua OPR" : `OPR ${folderView}`}</h3><p>Cari dan pilih laporan untuk membuka pratonton.</p>
      <label className="folder-search"><span>⌕</span><input autoFocus value={folderSearch} onChange={(event) => setFolderSearch(event.target.value)} placeholder="Cari tajuk, unit atau nama penyedia..." /></label>
      <div className="folder-result-count">{folderReports.length} laporan ditemui</div>
      <div className="folder-scroll-list">{folderReports.length ? folderReports.map((report) => <button key={report.title} onClick={() => { setFolderView(null); setSelected(report); }}><span className="report-file">▤</span><div><strong>{report.title}</strong><small>{report.organiser} · {report.date} · {report.owner}</small></div><b>{report.status}</b><i>›</i></button>) : <p>Tiada OPR sepadan dengan carian ini.</p>}</div>
    </section></div>}
  </div>;
}

function AdminPanel({ notify }: { notify: (message: string) => void }) {
  const [enabled, setEnabled] = useState(false);
  return <>
    <span className="modal-overline">KAWALAN PENTADBIR</span>
    <h2 id="folder-title">Urus kandungan portal</h2>
    <p>Tambah, ubah atau buang kategori, pautan dan maklumat rasmi sekolah.</p>
    <div className="admin-switch"><div><strong>Mod suntingan</strong><small>Hanya pentadbir yang dibenarkan</small></div><button className={enabled ? "enabled" : ""} onClick={() => setEnabled(!enabled)} aria-pressed={enabled}><i></i></button></div>
    <div className="submodule-grid admin-grid">
      {["Kategori OPR", "Carta organisasi", "Senarai guru", "Pautan modul"].map((item) => <button key={item} disabled={!enabled} onClick={() => notify(`${item} sedia disunting`)}><span>✎</span><div><strong>{item}</strong><small>Tambah, ubah atau buang</small></div><i>›</i></button>)}
    </div>
  </>;
}

function OprGenerator({ notify, close }: { notify: (message: string) => void; close: () => void }) {
  const [enhancing, setEnhancing] = useState(false);
  const [sending, setSending] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [driveUrl, setDriveUrl] = useState("");
  const [preview, setPreview] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState("");
  const [pdfBase64, setPdfBase64] = useState("");
  const [details, setDetails] = useState("");
  const [aiMessage, setAiMessage] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [form, setForm] = useState({
    title: "", category: "Kurikulum", date: new Date().toISOString().slice(0, 10), venue: "", organiser: "", objective: "", outcome: "",
    preparedBy: "", preparedRole: "", verifier: "Wan Harun Bin Wan Ali|Pengetua", manualVerifier: "", manualVerifierRole: "",
  });

  const verifiers = [
    ["Wan Harun Bin Wan Ali", "Pengetua"],
    ["Suriha Binti Sadi", "Guru Penolong Kanan Pentadbiran"],
    ["SHAMSUL HAZLAN BIN MUHAMMAD KAMAL HAKIM", "Guru Penolong Kanan Hal Ehwal Murid"],
    ["MUHAMAD SHUKRI BIN ABDUL GHANI", "Guru Penolong Kanan Kokurikulum"],
    ["MOHD FADIL BIN ABDULLAH", "Guru Penolong Kanan Tingkatan Enam"],
  ] as const;
  const [verifiedName, verifiedRole] = form.verifier === "manual" ? [form.manualVerifier, form.manualVerifierRole] : form.verifier.split("|");
  const dayName = form.date ? new Intl.DateTimeFormat("ms-MY", { weekday: "long" }).format(new Date(`${form.date}T12:00:00`)) : "";

  const setField = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const enhance = async () => {
    if (!details.trim()) return notify("Masukkan ringkasan program dahulu");
    setAiMessage("");
    setEnhancing(true);
    try {
      const response = await fetch("/api/gemini", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: details, title: form.title, category: form.category, objective: form.objective, outcome: form.outcome }) });
      const data = await response.json() as { details?: string; objective?: string; outcome?: string; error?: string };
      if (!response.ok || !data.details) throw new Error(data.error || "Gemini tidak dapat memproses permintaan");
      setDetails(data.details);
      setForm((current) => ({ ...current, objective: data.objective || current.objective, outcome: data.outcome || current.outcome }));
      setAiMessage("✓ Kandungan berjaya dijana dan dimasukkan ke dalam borang.");
      notify("Pelaksanaan, objektif dan hasil diperkemas oleh Gemini AI");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sambungan Gemini belum tersedia";
      setAiMessage(`⚠ ${message}`);
      notify(message);
    } finally {
      setEnhancing(false);
    }
  };

  const complete = Boolean(form.title && form.date && form.venue && details && form.preparedBy && form.preparedRole && verifiedName && verifiedRole);
  const safeName = (value: string) => value.normalize("NFKD").replace(/[^a-zA-Z0-9 -]/g, "").replace(/\s+/g, " ").trim() || "OPR";
  const fileToDataUrl = (file: Blob) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); });
  const fileToBase64 = async (file: Blob) => (await fileToDataUrl(file)).split(",")[1] || "";
  const makePdf = async () => {
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    pdf.setProperties({ title: form.title, subject: "One Page Report SMK Agama Pahang", author: form.preparedBy, creator: "Portal Rasmi SMKAP" });
    const navy = [22, 54, 82] as const, headerBlue = [201, 230, 247] as const, glassBlue = [231, 245, 253] as const;
    const maroon = [45, 119, 165] as const, gold = [82, 157, 199] as const;
    const muted = [78, 105, 124] as const, pale = [239, 247, 252] as const;
    const x = 12, pageWidth = 210, contentWidth = 186;
    pdf.setFillColor(...headerBlue); pdf.rect(0, 0, pageWidth, 40, "F");
    pdf.setFillColor(...glassBlue); pdf.circle(187, 3, 28, "F"); pdf.circle(158, 1, 17, "F");
    pdf.setFillColor(218, 238, 250); pdf.roundedRect(3, 3, 204, 33, 7, 7, "F");
    pdf.setFillColor(235, 247, 253); pdf.circle(198, 31, 26, "F");
    pdf.setDrawColor(153, 199, 225); pdf.roundedRect(3, 3, 204, 33, 7, 7, "S");
    pdf.setFillColor(...maroon); pdf.rect(0, 38, pageWidth, 1.4, "F");
    pdf.setFillColor(124, 184, 216); pdf.rect(0, 39.4, pageWidth, 0.6, "F");
    try {
      const logoData = await fileToDataUrl(await (await fetch("/logo-smkap.png")).blob());
      pdf.addImage(logoData, "PNG", 8, 8, 63, 17, undefined, "FAST");
    } catch {}
    pdf.setTextColor(...navy); pdf.setFont("helvetica", "bold"); pdf.setFontSize(16);
    pdf.text("SMK AGAMA PAHANG", 76, 14);
    pdf.setFontSize(9); pdf.setFont("helvetica", "normal"); pdf.text("MUADZAM SHAH, PAHANG", 76, 20);
    pdf.setTextColor(...gold); pdf.setFont("helvetica", "bold"); pdf.setFontSize(8.5); pdf.text("ONE PAGE REPORT (OPR)", 76, 28);
    pdf.setFontSize(7); pdf.setTextColor(58, 91, 116); pdf.text(`DIJANA: ${new Date().toLocaleDateString("ms-MY")}`, 198, 11, { align: "right" });
    pdf.text(`RUJUKAN: OPR/${form.category.replace(/[^A-Za-z]/g, "").slice(0, 6).toUpperCase()}/${form.date.replace(/-/g, "")}`, 198, 16, { align: "right" });

    pdf.setTextColor(...navy); pdf.setFont("helvetica", "bold"); pdf.setFontSize(15);
    const titleLines = pdf.splitTextToSize(form.title.toUpperCase(), contentWidth);
    pdf.text(titleLines.slice(0, 2), x, 49);
    const titleBottom = 49 + Math.min(titleLines.length, 2) * 6;

    const metaY = titleBottom + 2, boxW = 35.6, gap = 2;
    const meta = [["BIDANG", form.category], ["TARIKH", form.date], ["HARI", dayName], ["TEMPAT", form.venue], ["ANJURAN", form.organiser || "-"]];
    meta.forEach(([label, value], index) => {
      const bx = x + index * (boxW + gap);
      pdf.setFillColor(...pale); pdf.roundedRect(bx, metaY, boxW, 17, 2, 2, "F");
      pdf.setTextColor(...maroon); pdf.setFontSize(6.8); pdf.setFont("helvetica", "bold"); pdf.text(label, bx + 3, metaY + 5);
      pdf.setTextColor(...navy); pdf.setFontSize(8.2); pdf.text(pdf.splitTextToSize(value, boxW - 6).slice(0, 2), bx + 3, metaY + 10);
    });

    const section = (heading: string, value: string, sx: number, sy: number, sw: number, sh: number) => {
      pdf.setDrawColor(220, 225, 230); pdf.setFillColor(255, 255, 255); pdf.roundedRect(sx, sy, sw, sh, 2, 2, "FD");
      pdf.setFillColor(...maroon); pdf.roundedRect(sx, sy, sw, 8, 2, 2, "F"); pdf.rect(sx, sy + 5, sw, 3, "F");
      pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.5); pdf.text(heading, sx + 3, sy + 5.3);
      pdf.setTextColor(48, 56, 66); pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.2);
      const lines = pdf.splitTextToSize(value || "Belum dinyatakan.", sw - 6);
      pdf.text(lines.slice(0, Math.max(2, Math.floor((sh - 12) / 4.1))), sx + 3, sy + 13, { lineHeightFactor: 1.25 });
    };
    const contentY = metaY + 21;
    section("PELAKSANAAN PROGRAM", details, x, contentY, contentWidth, 45);
    section("OBJEKTIF", form.objective, x, contentY + 49, 91, 32);
    section("HASIL / IMPAK", form.outcome, x + 95, contentY + 49, 91, 32);

    const photoY = contentY + 85, photoH = 80;
    pdf.setTextColor(...navy); pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); pdf.text("DOKUMENTASI PROGRAM", x, photoY);
    pdf.setDrawColor(220, 225, 230); pdf.setFillColor(...pale); pdf.roundedRect(x, photoY + 3, contentWidth, photoH, 2, 2, "FD");
    if (photoFiles.length) {
      const shown = photoFiles.slice(0, 4), cols = shown.length === 1 ? 1 : 2, rows = Math.ceil(shown.length / cols);
      const cellW = (contentWidth - 6 - (cols - 1) * 3) / cols, cellH = (photoH - 6 - (rows - 1) * 3) / rows;
      for (let index = 0; index < shown.length; index++) {
        const data = await fileToDataUrl(shown[index]); const px = x + 3 + (index % cols) * (cellW + 3); const py = photoY + 6 + Math.floor(index / cols) * (cellH + 3);
        pdf.setFillColor(255, 255, 255); pdf.setDrawColor(203, 210, 216); pdf.roundedRect(px, py, cellW, cellH, 1.5, 1.5, "FD");
        const innerW = cellW - 4, innerH = cellH - 4;
        const props = pdf.getImageProperties(data); const ratio = Math.min(innerW / props.width, innerH / props.height);
        const iw = props.width * ratio, ih = props.height * ratio;
        pdf.addImage(data, shown[index].type === "image/png" ? "PNG" : "JPEG", px + (cellW - iw) / 2, py + (cellH - ih) / 2, iw, ih, undefined, "FAST");
        pdf.setFillColor(...maroon); pdf.circle(px + 4, py + 4, 2.6, "F"); pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(6); pdf.text(String(index + 1), px + 4, py + 4.8, { align: "center" });
      }
    } else {
      pdf.setTextColor(...muted); pdf.setFont("helvetica", "italic"); pdf.setFontSize(8); pdf.text("Tiada gambar program dilampirkan.", pageWidth / 2, photoY + 35, { align: "center" });
    }

    const signY = photoY + photoH + 9, signW = 90;
    [["DISEDIAKAN OLEH", form.preparedBy, form.preparedRole], ["DISAHKAN OLEH", verifiedName, verifiedRole]].forEach(([label, name, role], index) => {
      const sx = x + index * 96; pdf.setDrawColor(220, 225, 230); pdf.roundedRect(sx, signY, signW, 25, 2, 2, "S");
      pdf.setTextColor(...maroon); pdf.setFont("helvetica", "bold"); pdf.setFontSize(6.8); pdf.text(label, sx + 4, signY + 6);
      pdf.setTextColor(...navy); pdf.setFontSize(8); pdf.text(pdf.splitTextToSize(name, signW - 8).slice(0, 2), sx + 4, signY + 12);
      pdf.setTextColor(...muted); pdf.setFont("helvetica", "normal"); pdf.setFontSize(7); pdf.text(pdf.splitTextToSize(role, signW - 8).slice(0, 2), sx + 4, signY + 20);
    });
    pdf.setFillColor(...maroon); pdf.rect(0, 289, pageWidth, 8, "F"); pdf.setTextColor(255, 255, 255); pdf.setFontSize(6.5);
    pdf.text("Portal Rasmi SMK Agama Pahang | Dokumen dijana secara digital", 12, 294);
    pdf.text("SMKAP", 198, 294, { align: "right" });
    const blob = pdf.output("blob");
    return { base64: await fileToBase64(blob), url: URL.createObjectURL(blob) };
  };
  const preparePreview = async () => {
    setRendering(true);
    try {
      const generated = await makePdf();
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
      setPdfBase64(generated.base64); setPdfPreviewUrl(generated.url); setPreview(true); setDriveUrl("");
    } catch { notify("Pratonton PDF tidak dapat dijana"); }
    finally { setRendering(false); }
  };
  const sendToDrive = async () => { if (!pdfBase64 || !pdfPreviewUrl) return notify("Sila jana dan semak pratonton PDF dahulu"); setSending(true); setDriveUrl(""); try { const base = `${form.date}-${safeName(form.title)}`; const files = [{ name: `${base}.pdf`, mimeType: "application/pdf", base64: pdfBase64 }]; for (let index = 0; index < photoFiles.length; index++) files.push({ name: `${base}-gambar-${index + 1}.${photoFiles[index].type === "image/png" ? "png" : "jpg"}`, mimeType: photoFiles[index].type || "image/jpeg", base64: await fileToBase64(photoFiles[index]) }); const response = await fetch("/api/drive", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category: form.category, files }) }); const result = await response.json() as { error?: string; files?: Array<{ url: string }> }; if (!response.ok || !result.files?.[0]) throw new Error(result.error || "Penghantaran tidak berjaya"); setDriveUrl(result.files[0].url); notify("OPR berjaya disimpan ke Google Drive sekolah"); } catch (error) { notify(error instanceof Error ? error.message : "OPR tidak dapat dihantar"); } finally { setSending(false); } };
  return <div className="opr-generator">
    <span className="modal-overline">PENJANA OPR RASMI SMKAP</span>
    <h2 id="folder-title">Cipta OPR baharu</h2>
    <p>Isi maklumat program, kemaskan penulisan dan semak laporan sebelum disimpan.</p>
    <div className="generator-steps" aria-label="Aliran penciptaan OPR"><b>1</b><span>Maklumat</span><i></i><b>2</b><span>Perincian</span><i></i><b>3</b><span>Semakan</span></div>

    {!preview ? <form className="generator-form" onSubmit={(event) => { event.preventDefault(); if (complete) void preparePreview(); }}>
      <div className="generator-row">
        <label>Tajuk program<input value={form.title} onChange={(e) => setField("title", e.target.value)} placeholder="Contoh: Program Ihya' Ramadan" required /></label>
        <label>Bidang<select value={form.category} onChange={(e) => setField("category", e.target.value)}><option>Pengurusan</option><option>Kurikulum</option><option>HEM</option><option>Kokurikulum</option><option>Tingkatan Enam · Kurikulum</option><option>Tingkatan Enam · HEM</option><option>Tingkatan Enam · Kokurikulum</option><option>Lain-lain</option></select></label>
      </div>
      <div className="generator-row generator-four">
        <label>Tarikh<input type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} required /></label>
        <label>Hari<input value={dayName} readOnly aria-readonly="true" /></label>
        <label>Tempat<input value={form.venue} onChange={(e) => setField("venue", e.target.value)} placeholder="Dewan / lokasi" required /></label>
        <label>Anjuran<input value={form.organiser} onChange={(e) => setField("organiser", e.target.value)} placeholder="Unit / panitia" /></label>
      </div>
      <label>Ringkasan pelaksanaan<textarea rows={5} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Terangkan aktiviti yang dijalankan, kumpulan sasaran dan perjalanan program..." required /></label>
      <button type="button" className="generator-ai" onClick={enhance} disabled={enhancing}><span>✦</span><span>{enhancing ? "Gemini sedang menulis..." : "Jana pelaksanaan, objektif & hasil dengan Gemini AI"}<small>AI mengekalkan fakta asal dan mengemaskan ketiga-tiga bahagian</small></span></button>
      {aiMessage && <p className={`ai-status ${aiMessage.startsWith("✓") ? "success" : "error"}`} role="status">{aiMessage}</p>}
      <div className="generator-row">
        <label>Objektif<input value={form.objective} onChange={(e) => setField("objective", e.target.value)} placeholder="Objektif utama program" /></label>
        <label>Hasil / impak<input value={form.outcome} onChange={(e) => setField("outcome", e.target.value)} placeholder="Hasil yang dicapai" /></label>
      </div>
      <label className="photo-drop">Gambar program<input type="file" accept="image/jpeg,image/png" multiple onChange={(event) => { const files = Array.from(event.target.files || []).slice(0, 6); setPhotoFiles(files); setPhotos(files.map((file) => URL.createObjectURL(file))); if ((event.target.files?.length || 0) > 6) notify("Maksimum 6 gambar dipilih"); }} /><span>＋ Pilih gambar daripada peranti</span><small>Maksimum 6 gambar · JPG atau PNG · maksimum 6 MB setiap satu</small></label>
      {photos.length > 0 && <div className="photo-preview-strip">{photos.map((src, index) => <div key={src}><img src={src} alt={`Pratonton gambar program ${index + 1}`} /><button type="button" onClick={() => { setPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index)); setPhotoFiles((current) => current.filter((_, photoIndex) => photoIndex !== index)); }} aria-label={`Buang gambar ${index + 1}`}>×</button></div>)}</div>}
      <fieldset className="signatory-fields"><legend>Penyedia dan pengesah OPR</legend><div className="generator-row"><label>Nama penyedia<input value={form.preparedBy} onChange={(e) => setField("preparedBy", e.target.value)} placeholder="Nama penuh penyedia" required /></label><label>Jawatan penyedia<input value={form.preparedRole} onChange={(e) => setField("preparedRole", e.target.value)} placeholder="Contoh: Guru Mata Pelajaran" required /></label></div><label>Pilih pengesah<select value={form.verifier} onChange={(e) => setField("verifier", e.target.value)}>{verifiers.map(([name, role]) => <option key={name} value={`${name}|${role}`}>{name} — {role}</option>)}<option value="manual">Isi pengesah secara manual</option></select></label>{form.verifier === "manual" && <div className="generator-row manual-verifier"><label>Nama pengesah<input value={form.manualVerifier} onChange={(e) => setField("manualVerifier", e.target.value)} placeholder="Nama penuh pengesah" required /></label><label>Jawatan pengesah<input value={form.manualVerifierRole} onChange={(e) => setField("manualVerifierRole", e.target.value)} placeholder="Jawatan pengesah" required /></label></div>}</fieldset>
      <div className="generator-actions"><button type="button" onClick={close}>Kembali</button><button className="save" disabled={!complete || rendering}>{rendering ? "Menjana PDF..." : "Pratonton PDF"} <span>→</span></button></div>
    </form> : <article className="opr-preview pdf-review">
      <div className="pdf-review-head"><div><span>PRATONTON PDF SEBENAR</span><h3>Semak sebelum simpan</h3><p>Pastikan tajuk, kandungan, gambar serta nama penyedia dan pengesah adalah betul.</p></div><a href={pdfPreviewUrl} download={`${form.date}-${safeName(form.title)}.pdf`}>Muat turun semakan</a></div>
      <div className="pdf-preview-stage">{pdfPreviewUrl ? <iframe src={pdfPreviewUrl} title="Pratonton PDF OPR rasmi" /> : <p>Pratonton sedang disediakan...</p>}</div>
      <div className="drive-destination"><span>◈</span><div><strong>Destinasi Google Drive</strong><small>Folder {form.category} · OPR Disahkan</small></div></div>
      {driveUrl && <p className="drive-success">✓ OPR telah difailkan. <a href={driveUrl} target="_blank" rel="noreferrer">Buka PDF di Google Drive</a></p>}
      <div className="preview-confirmation"><span>✓</span><p><strong>Sudah semak pratonton?</strong><small>Selepas disimpan, PDF akan dimasukkan ke folder bidang yang dipilih.</small></p></div>
      <div className="generator-actions"><button onClick={() => { setPreview(false); setPdfBase64(""); if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl); setPdfPreviewUrl(""); }} disabled={sending}>Ubah maklumat</button><button className="save" onClick={sendToDrive} disabled={sending || Boolean(driveUrl) || !pdfBase64}>{sending ? "Menyimpan..." : driveUrl ? "Sudah disimpan" : "Simpan ke Google Drive"}</button></div>
    </article>}
  </div>;
}
