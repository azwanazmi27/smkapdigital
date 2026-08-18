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

    {open && <div className="folder-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setOpen(null)}>
      <section className={`folder-modal ${open === "oprgenerator" || open === "oprhub" ? "generator-modal" : ""}`} role="dialog" aria-modal="true" aria-labelledby="folder-title">
        <button className="folder-close" onClick={() => setOpen(null)} aria-label="Tutup">×</button>
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
  ["Kokurikulum", 7, "#e2ba65"], ["Tingkatan Enam", 5, "#a792d5"], ["Lain-lain", 0, "#8ea3aa"],
] as const;

function OprDashboard({ create, notify }: { create: () => void; notify: (message: string) => void }) {
  const [filter, setFilter] = useState("Semua");
  const reports = [
    { title: "Program Ihya’ Ramadan", category: "HEM", owner: "Ustazah Noraini", date: "15 Ogos 2026", status: "Lengkap" },
    { title: "Bengkel Teknik Menjawab SPM", category: "Kurikulum", owner: "Pn. Farah", date: "12 Ogos 2026", status: "Lengkap" },
    { title: "Kejohanan Merentas Desa", category: "Kokurikulum", owner: "En. Khairul", date: "8 Ogos 2026", status: "Draf" },
  ];
  const visible = filter === "Semua" ? reports : reports.filter((report) => report.category === filter);
  return <div className="opr-dashboard">
    <div className="opr-dash-head"><div><span className="modal-overline">PUSAT OPR</span><h2 id="folder-title">Dashboard laporan sekolah</h2><p>Pantau, cari dan hasilkan One Page Report dalam satu ruang kerja.</p></div><button className="dash-create" onClick={create}><b>＋</b><span>Cipta OPR<small>dengan Gemini AI</small></span></button></div>
    <div className="opr-kpis">
      <article><span>JUMLAH OPR</span><strong>47</strong><small><i>↑ 12%</i> berbanding bulan lalu</small></article>
      <article><span>BULAN INI</span><strong>9</strong><small>7 lengkap · 2 draf</small></article>
      <article><span>PALING AKTIF</span><strong className="word">Kurikulum</strong><small>15 laporan dihantar</small></article>
      <article className="ai-kpi"><span>AI GEMINI</span><strong className="word">Sedia</strong><small>Penulisan pintar OPR</small></article>
    </div>
    <div className="opr-dash-grid">
      <section className="opr-chart-card"><div className="dash-section-title"><div><span>RINGKASAN BIDANG</span><h3>Agihan semua laporan</h3></div><b>47 OPR</b></div><div className="category-bars">{oprCategories.map(([name,count,color]) => <button key={name} onClick={() => setFilter(name)}><span><i style={{backgroundColor:color}}></i>{name}</span><strong>{count}</strong><em><i style={{width:`${Math.max(4,(count/15)*100)}%`,backgroundColor:color}}></i></em></button>)}</div></section>
      <section className="opr-progress-card"><div className="dash-section-title"><div><span>SASARAN TAHUNAN</span><h3>Kemajuan 2026</h3></div></div><div className="progress-ring"><div><strong>78%</strong><small>tercapai</small></div></div><p><b>47</b> daripada sasaran <b>60 laporan</b> telah disediakan.</p><button onClick={() => notify("Paparan analitik penuh akan dibuka")}>Lihat analitik <span>→</span></button></section>
    </div>
    <section className="recent-opr"><div className="dash-section-title"><div><span>LAPORAN TERKINI</span><h3>Aktiviti baru-baru ini</h3></div><div className="report-filters"><button className={filter === "Semua" ? "active" : ""} onClick={() => setFilter("Semua")}>Semua</button><button onClick={() => notify("Carian laporan dibuka")}>⌕ Cari</button></div></div><div className="report-list">{visible.length ? visible.map((report) => <button key={report.title} onClick={() => notify(`${report.title} dipilih`)}><span className="report-file">▤</span><div><strong>{report.title}</strong><small>{report.owner} · {report.date}</small></div><b>{report.category}</b><em className={report.status === "Draf" ? "draft" : ""}><i></i>{report.status}</em><span className="report-arrow">›</span></button>) : <p className="empty-report">Belum ada laporan untuk bidang ini.</p>}</div></section>
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
    const navy = [22, 54, 82] as const, headerBlue = [190, 220, 239] as const, maroon = [116, 37, 52] as const, gold = [183, 137, 48] as const;
    const muted = [92, 103, 116] as const, pale = [244, 246, 248] as const;
    const x = 12, pageWidth = 210, contentWidth = 186;
    pdf.setFillColor(...headerBlue); pdf.rect(0, 0, pageWidth, 39, "F");
    pdf.setFillColor(...maroon); pdf.rect(0, 36.5, pageWidth, 2.5, "F");
    pdf.setFillColor(...gold); pdf.rect(0, 39, pageWidth, 1.1, "F");
    pdf.setFillColor(255, 255, 255); pdf.roundedRect(8, 5.5, 64, 21, 2, 2, "F");
    try {
      const logoData = await fileToDataUrl(await (await fetch("/logo-smkap.png")).blob());
      pdf.addImage(logoData, "PNG", 10, 8.5, 60, 15, undefined, "FAST");
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

    const photoY = contentY + 85, photoH = 62;
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
    pdf.setFillColor(...navy); pdf.rect(0, 289, pageWidth, 8, "F"); pdf.setTextColor(255, 255, 255); pdf.setFontSize(6.5);
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
