"use client";

import { useEffect, useState } from "react";

type Folder = "ibubapa" | "warga" | "tentang" | "pengunjung" | "ekunjung" | "oprhub" | "oprgenerator" | "admin" | null;
type SubItem = { icon: string; title: string; text: string; badge?: string; href?: string; folder?: Folder };

const folders = [
  { id: "tentang", no: "01", icon: "⌕", title: "Tentang Sekolah", text: "Kenali SMK Agama Pahang", count: "3 bahagian", accent: "purple" },
  { id: "warga", no: "02", icon: "◎", title: "Warga Sekolah", text: "Urusan guru dan kakitangan", count: "4 modul", accent: "blue" },
  { id: "ibubapa", no: "03", icon: "⌂", title: "Ibu Bapa", text: "Maklumat dan urusan penjaga", count: "3 pilihan", accent: "teal" },
  { id: "pengunjung", no: "04", icon: "⌁", title: "Pengunjung", text: "Daftar dan dapatkan panduan", count: "3 pilihan", accent: "gold" },
] as const;

const folderContent: Record<Exclude<Folder, null | "admin" | "oprgenerator" | "ekunjung">, { title: string; intro: string; items: SubItem[] }> = {
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
      { icon: "⌁", title: "E-Kunjung", text: "Imbas QR dan daftar masuk", folder: "ekunjung", badge: "QR" },
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
    if (open === "ekunjung") return setOpen("pengunjung");
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
        {open === "admin" ? <AdminPanel notify={notify} /> : open === "ekunjung" ? <VisitorForm notify={notify} close={() => setOpen("pengunjung")} /> : open === "oprgenerator" ? <OprGenerator notify={notify} close={() => setOpen("oprhub")} /> : open === "oprhub" ? <OprDashboard create={() => setOpen("oprgenerator")} notify={notify} /> : <>
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
  ["Pengurusan", "#79d4c5"], ["Kurikulum", "#78b9df"], ["HEM", "#dd8d78"],
  ["Kokurikulum", "#e2ba65"], ["Tingkatan Enam", "#a792d5"], ["Lain-lain", "#8ea3aa"],
] as const;

type OprReport = { id: string; name: string; category: string; createdAt: string; updatedAt: string; viewUrl: string; previewUrl: string; downloadUrl: string };

function OprDashboard({ create }: { create: () => void; notify: (message: string) => void }) {
  const [folderView, setFolderView] = useState<string | null>(null);
  const [folderSearch, setFolderSearch] = useState("");
  const [selected, setSelected] = useState<OprReport | null>(null);
  const [reports, setReports] = useState<OprReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [reportError, setReportError] = useState("");
  useEffect(() => {
    let active = true;
    void fetch("/api/drive", { cache: "no-store" }).then(async (response) => {
      const data = await response.json() as { files?: OprReport[]; error?: string };
      if (!response.ok || !data.files) throw new Error(data.error || "Senarai OPR tidak tersedia");
      if (active) setReports(data.files);
    }).catch((error) => { if (active) setReportError(error instanceof Error ? error.message : "Senarai OPR tidak tersedia"); })
      .finally(() => { if (active) setLoadingReports(false); });
    return () => { active = false; };
  }, []);
  const reportTitle = (report: OprReport) => report.name.replace(/\.pdf$/i, "").replace(/__PENYEDIA__.*/, "").replace(/^\d{4}-\d{2}-\d{2}-/, "");
  const reportPreparer = (report: OprReport) => report.name.match(/__PENYEDIA__(.+)\.pdf$/i)?.[1] || "Nama penyedia tidak direkodkan";
  const reportDate = (report: OprReport) => new Intl.DateTimeFormat("ms-MY", { day: "numeric", month: "long", year: "numeric" }).format(new Date(report.updatedAt));
  const belongsTo = (report: OprReport, category: string) => category === "Tingkatan Enam" ? report.category.startsWith("Tingkatan Enam") : report.category === category;
  const categoryCount = (category: string) => reports.filter((report) => belongsTo(report, category)).length;
  const visible = reports.slice(0, 3);
  const folderReports = reports.filter((report) => (folderView === "Semua" || (folderView && belongsTo(report, folderView))) && `${report.name} ${report.category}`.toLowerCase().includes(folderSearch.toLowerCase()));
  const openFolder = (name: string) => { setFolderSearch(""); setFolderView(name); };
  const counts = oprCategories.map(([name]) => categoryCount(name));
  const maxCount = Math.max(1, ...counts);
  const mostActiveIndex = counts.indexOf(Math.max(...counts));
  const thisMonth = reports.filter((report) => { const date = new Date(report.updatedAt); const now = new Date(); return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear(); }).length;
  if (selected) return <article className="saved-opr-preview drive-opr-preview" role="document" aria-label={`Pratonton ${reportTitle(selected)}`}>
    <button className="saved-preview-close" onClick={() => setSelected(null)} aria-label="Tutup pratonton">×</button>
    <header><span>PDF SEBENAR · GOOGLE DRIVE SEKOLAH</span><h2>{reportTitle(selected)}</h2><p>{reportDate(selected)} · {reportPreparer(selected)}</p></header>
    <div className="drive-pdf-frame"><iframe src={selected.previewUrl} title={`PDF ${reportTitle(selected)}`} /></div>
    <footer><button onClick={() => setSelected(null)}>Tutup pratonton</button><a href={selected.viewUrl} target="_blank" rel="noreferrer">Buka di Google Drive</a><a className="print-opr" href={selected.viewUrl} target="_blank" rel="noreferrer">▣ Buka untuk cetak</a></footer>
  </article>;
  return <div className="opr-dashboard">
    <div className="opr-dash-head"><div><span className="modal-overline">PUSAT OPR</span><h2 id="folder-title">Dashboard laporan sekolah</h2><p>Pantau, cari dan hasilkan One Page Report dalam satu ruang kerja.</p></div><button className="dash-create" onClick={create}><b>＋</b><span>Buat OPR Baharu<small>Tekan di sini untuk mula</small></span></button></div>
    <div className="opr-kpis">
      <article><span>JUMLAH OPR</span><strong>{reports.length}</strong><small>Laporan OPR yang telah dijana</small></article>
      <article><span>BULAN INI</span><strong>{thisMonth}</strong><small>Laporan lengkap disimpan</small></article>
      <article><span>PALING AKTIF</span><strong className="word">{reports.length ? oprCategories[mostActiveIndex][0] : "Belum ada"}</strong><small>{reports.length ? `${counts[mostActiveIndex]} laporan` : "Menunggu OPR pertama"}</small></article>
      <article className="ai-kpi"><span>AI GEMINI</span><strong className="word">Sedia</strong><small>Penulisan pintar OPR</small></article>
    </div>
    <section className="opr-folder-section"><div className="dash-section-title"><div><span>FOLDER BIDANG</span><h3>Tekan folder untuk membuka senarai OPR</h3></div><b>Google Drive</b></div><div className="opr-folder-grid"><button onClick={() => openFolder("Semua")}><span>▤</span><div><strong>Semua OPR</strong><small>{reports.length} laporan</small></div></button>{oprCategories.map(([name]) => <button key={name} onClick={() => openFolder(name)}><span>▰</span><div><strong>{name}</strong><small>{categoryCount(name)} laporan</small></div></button>)}</div></section>
    <section className="recent-opr"><div className="dash-section-title"><div><span>LAPORAN TERKINI</span><h3>3 laporan terkini</h3><small className="report-help">Tekan nama laporan untuk membuka PDF.</small></div><div className="report-filters"><button onClick={() => openFolder("Semua")}>Lihat semua</button><button onClick={() => openFolder("Semua")}>⌕ Cari</button></div></div>{loadingReports ? <p className="drive-list-state">Membaca OPR daripada Google Drive...</p> : reportError ? <p className="drive-list-state error">{reportError}</p> : <div className="report-list">{visible.length ? visible.map((report) => <button key={report.id} onClick={() => setSelected(report)}><span className="report-file">▤</span><div><strong>{reportTitle(report)}</strong><small>{reportDate(report)} · {reportPreparer(report)}</small></div><b>{report.category}</b><em><i></i>Lengkap</em><span className="report-arrow">›</span></button>) : <p className="empty-report">Belum ada OPR lengkap dalam Google Drive.</p>}</div>}</section>
    <div className="opr-dash-grid summary-only"><section className="opr-chart-card"><div className="dash-section-title"><div><span>RINGKASAN BIDANG</span><h3>Agihan Laporan</h3></div><b>{reports.length} OPR</b></div><div className="category-bars">{oprCategories.map(([name,color]) => { const count = categoryCount(name); return <button key={name} onClick={() => openFolder(name)}><span><i style={{backgroundColor:color}}></i>{name}</span><strong>{count}</strong><em><i style={{width:`${Math.max(count ? 4 : 0,(count/maxCount)*100)}%`,backgroundColor:color}}></i></em></button>; })}</div></section></div>
    {folderView && <div className="opr-folder-float-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setFolderView(null)}><section className="opr-folder-float" role="dialog" aria-modal="true" aria-label={`Senarai OPR ${folderView}`}>
      <button className="folder-float-close" onClick={() => setFolderView(null)} aria-label="Tutup senarai folder">×</button>
      <span className="modal-overline">FOLDER BIDANG</span><h3>{folderView === "Semua" ? "Semua OPR" : `OPR ${folderView}`}</h3><p>Cari dan pilih laporan untuk membuka pratonton.</p>
      <label className="folder-search"><span>⌕</span><input autoFocus value={folderSearch} onChange={(event) => setFolderSearch(event.target.value)} placeholder="Cari tajuk, unit atau nama penyedia..." /></label>
      <div className="folder-result-count">{folderReports.length} laporan ditemui</div>
      <div className="folder-scroll-list">{folderReports.length ? folderReports.map((report) => <button key={report.id} onClick={() => { setFolderView(null); setSelected(report); }}><span className="report-file">▤</span><div><strong>{reportTitle(report)}</strong><small>{reportDate(report)} · {reportPreparer(report)}</small></div><b>Lengkap</b><i>›</i></button>) : <p>{loadingReports ? "Sedang membaca Google Drive..." : "Tiada OPR lengkap sepadan dengan carian ini."}</p>}</div>
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

function VisitorForm({ notify, close }: { notify: (message: string) => void; close: () => void }) {
  const now = new Date();
  const [photo, setPhoto] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [review, setReview] = useState(false);
  const [visitMode, setVisitMode] = useState<"in" | "out">("in");
  const [checkoutName, setCheckoutName] = useState("");
  const [checkoutId, setCheckoutId] = useState("");
  const [checkoutTime, setCheckoutTime] = useState(now.toTimeString().slice(0, 5));
  const [checkoutDone, setCheckoutDone] = useState(false);
  const [activeRecords, setActiveRecords] = useState<Array<{ id: string; date: string; timeIn: string; name: string; vehicleNo: string }>>([]);
  const [loadingActive, setLoadingActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedRecord, setSavedRecord] = useState<{ id: string; status: string } | null>(null);
  const [form, setForm] = useState({
    date: now.toISOString().slice(0, 10), timeIn: now.toTimeString().slice(0, 5), timeOut: "", visitorName: "",
    phone: "", vehicleNo: "", organisation: "", purpose: "", staff: "", meetingPlace: "", notes: "",
  });
  const setVisitorField = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const tidyVisitorField = (field: keyof typeof form) => setForm((current) => ({ ...current, [field]: tidyTitleCase(current[field]) }));
  const complete = Boolean(form.date && form.timeIn && form.visitorName && form.phone && form.purpose && form.staff && photoFile);
  useEffect(() => {
    if (visitMode !== "out" || checkoutDone) return;
    setLoadingActive(true); setSaveError("");
    void fetch("/api/ekunjung", { cache: "no-store" }).then(async (response) => {
      const result = await response.json() as { records?: typeof activeRecords; error?: string };
      if (!response.ok) throw new Error(result.error || "Senarai pelawat tidak tersedia");
      setActiveRecords(result.records || []);
    }).catch((error) => setSaveError(error instanceof Error ? error.message : "Senarai pelawat tidak tersedia")).finally(() => setLoadingActive(false));
  }, [visitMode, checkoutDone]);
  const photoPayload = async (file: File) => {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas"); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", .82));
    if (!blob) throw new Error("Gambar tidak dapat diproses");
    const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("Gambar tidak dapat dibaca")); reader.readAsDataURL(blob); });
    return { mimeType: "image/jpeg", base64: dataUrl.split(",")[1] || "" };
  };
  const saveVisit = async () => {
    if (!photoFile) return;
    setSaving(true); setSaveError("");
    try {
      const response = await fetch("/api/ekunjung", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", ...form, photo: await photoPayload(photoFile) }) });
      const result = await response.json() as { id?: string; status?: string; error?: string };
      if (!response.ok || !result.id) throw new Error(result.error || "Rekod tidak dapat disimpan");
      setSavedRecord({ id: result.id, status: result.status || "DALAM KAWASAN" }); notify("Daftar masuk berjaya disimpan");
    } catch (error) { setSaveError(error instanceof Error ? error.message : "Rekod tidak dapat disimpan"); }
    finally { setSaving(false); }
  };
  const checkoutVisit = async () => {
    setSaving(true); setSaveError("");
    try {
      const response = await fetch("/api/ekunjung", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "checkout", id: checkoutId, timeOut: checkoutTime }) });
      const result = await response.json() as { name?: string; error?: string };
      if (!response.ok) throw new Error(result.error || "Masa keluar tidak dapat disimpan");
      if (result.name) setCheckoutName(result.name); setCheckoutDone(true); notify("Masa keluar telah disahkan");
    } catch (error) { setSaveError(error instanceof Error ? error.message : "Masa keluar tidak dapat disimpan"); }
    finally { setSaving(false); }
  };
  if (visitMode === "out") return <div className="visitor-form-shell">
    <span className="modal-overline">E-KUNJUNG SMKAP</span><h2 id="folder-title">Rekod masa keluar</h2><p>Pelawat atau pengawal boleh melengkapkan rekod keluar dengan dua langkah sahaja.</p>
    <div className="visitor-mode-tabs"><button onClick={() => setVisitMode("in")}>Daftar masuk</button><button className="active">Rekod keluar</button></div>
    <div className="visitor-checkout-card"><span>↗</span><div><strong>Daftar keluar pelawat</strong><small>Cari nama seperti dalam rekod daftar masuk</small></div></div>
    {checkoutDone ? <div className="visitor-complete"><span>✓</span><strong>SELESAI</strong><p>{checkoutName} telah direkod keluar pada {checkoutTime}.</p><button onClick={() => { setCheckoutDone(false); setCheckoutName(""); setCheckoutId(""); setCheckoutTime(new Date().toTimeString().slice(0, 5)); }}>Rekod pelawat lain</button></div> : <form className="visitor-form" onSubmit={(event) => { event.preventDefault(); void checkoutVisit(); }}>
      <label>Pilih pelawat *<select autoFocus value={checkoutId} onChange={(event) => { const id = event.target.value; setCheckoutId(id); setCheckoutName(activeRecords.find((record) => record.id === id)?.name || ""); }} required disabled={loadingActive}><option value="">{loadingActive ? "Membaca rekod..." : activeRecords.length ? "Pilih nama pelawat" : "Tiada pelawat aktif"}</option>{activeRecords.map((record) => <option key={record.id} value={record.id}>{record.name}{record.vehicleNo ? ` · ${record.vehicleNo}` : ""} · masuk {record.timeIn}</option>)}</select></label>
      <label>Masa keluar *<input type="time" value={checkoutTime} onChange={(event) => setCheckoutTime(event.target.value)} required /></label>
      {saveError && <p className="visitor-error">{saveError}</p>}
      <div className="visitor-actions"><button type="button" onClick={close}>Kembali</button><button className="visitor-primary" disabled={!checkoutId || !checkoutTime || saving}>{saving ? "Menyimpan..." : <>Sahkan masa keluar <span>→</span></>}</button></div>
    </form>}
    <p className="visitor-disclaimer"><span>ⓘ</span> Rekod keluar mesti disahkan oleh pelawat atau pengawal. Masa boleh dilaras jika pendaftaran dibuat lewat.</p>
  </div>;
  if (savedRecord) return <div className="visitor-form-shell"><span className="modal-overline">E-KUNJUNG SMKAP</span><div className="visitor-complete visitor-checkin-complete"><span>✓</span><strong>DAFTAR MASUK BERJAYA</strong><p>Rekod {form.visitorName} telah disimpan dalam Google Sheet sekolah.</p><small>{savedRecord.id} · {savedRecord.status}</small><button onClick={close}>Selesai</button></div><p className="visitor-disclaimer"><span>ⓘ</span> Sila patuhi arahan pengawal dan rekodkan masa keluar sebelum meninggalkan kawasan sekolah.</p></div>;
  if (review) return <article className="visitor-review">
    <span className="modal-overline">SEMAKAN E-KUNJUNG</span><h2 id="folder-title">Semak maklumat pelawat</h2><p>Pastikan semua maklumat betul sebelum rekod dihantar.</p>
    <div className="visitor-review-layout"><img src={photo} alt="Gambar pelawat" /><div>{[["Nama pelawat",form.visitorName],["Nombor telefon",form.phone],["Tujuan lawatan",form.purpose],["Staf ditemui",form.staff],["Tarikh & masa",`${form.date} · ${form.timeIn}`],...(form.vehicleNo ? [["Nombor kenderaan",form.vehicleNo.toUpperCase()]] : []),...(form.organisation ? [["Organisasi",form.organisation]] : []),...(form.meetingPlace ? [["Tempat perjumpaan",form.meetingPlace]] : []),...(form.notes ? [["Catatan",form.notes]] : [])].map(([label,value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div></div>
    {saveError && <p className="visitor-error">{saveError}</p>}
    <div className="visitor-actions"><button onClick={() => setReview(false)} disabled={saving}>Kembali ubah maklumat</button><button className="visitor-primary" onClick={() => void saveVisit()} disabled={saving}>{saving ? "Menyimpan..." : "Sahkan & daftar masuk"}</button></div>
  </article>;
  return <div className="visitor-form-shell">
    <span className="modal-overline">DAFTAR PELAWAT</span><h2 id="folder-title">E-Kunjung SMKAP</h2><p>Daftar masuk ke SMKAP dengan pantas.</p>
    <div className="visitor-mode-tabs"><button className="active">Daftar masuk</button><button onClick={() => setVisitMode("out")}>Rekod keluar</button></div>
    <div className="visitor-time-strip"><span>◷</span><div><small>Tarikh masuk</small><strong>{new Intl.DateTimeFormat("ms-MY", { dateStyle: "long" }).format(new Date(`${form.date}T12:00:00`))}</strong></div><label><small>Masa masuk — boleh dilaras</small><input type="time" value={form.timeIn} onChange={(event) => setVisitorField("timeIn",event.target.value)} required /></label></div>
    <form className="visitor-form" onSubmit={(event) => { event.preventDefault(); if (complete) setReview(true); }}>
      <label>Nama pelawat *<input autoFocus value={form.visitorName} onChange={(event) => setVisitorField("visitorName",event.target.value)} onBlur={() => tidyVisitorField("visitorName")} placeholder="Masukkan nama penuh" required /></label>
      <div className="visitor-row"><label>Nombor telefon *<input type="tel" inputMode="tel" value={form.phone} onChange={(event) => setVisitorField("phone",event.target.value.replace(/[^0-9+ -]/g, ""))} placeholder="Contoh: 012-345 6789" required /></label><label>Nombor kenderaan<input value={form.vehicleNo} onChange={(event) => setVisitorField("vehicleNo",event.target.value.toUpperCase())} placeholder="Contoh: CAA 1234" /></label></div>
      <label>Tujuan lawatan *<select value={form.purpose} onChange={(event) => setVisitorField("purpose",event.target.value)} required><option value="">Pilih tujuan</option><option>Urusan Rasmi</option><option>Berjumpa Guru / Staf</option><option>Penghantaran Barang</option><option>Mesyuarat / Program</option><option>Urusan Murid</option><option>Lain-lain</option></select></label>
      <label>Staf yang ingin ditemui *<input value={form.staff} onChange={(event) => setVisitorField("staff",event.target.value)} onBlur={() => tidyVisitorField("staff")} placeholder="Nama guru atau staf" required /></label>
      <label className="visitor-photo">Gambar pelawat *<input type="file" accept="image/jpeg,image/png" capture="environment" onChange={(event) => { const file = event.target.files?.[0]; if (file) { if (photo) URL.revokeObjectURL(photo); setPhotoFile(file); setPhoto(URL.createObjectURL(file)); } }} />{photo ? <div><img src={photo} alt="Pratonton gambar pelawat" /><span>Tekan untuk tukar gambar</span></div> : <div><b>⌁</b><strong>Ambil atau pilih satu gambar</strong><span>JPG atau PNG</span></div>}</label>
      <details className="visitor-optional"><summary><span>＋</span> Maklumat tambahan <small>Jika perlu sahaja</small></summary><div><div className="visitor-row"><label>Organisasi<input value={form.organisation} onChange={(event) => setVisitorField("organisation",event.target.value)} onBlur={() => tidyVisitorField("organisation")} placeholder="Syarikat / jabatan" /></label><label>Tempat perjumpaan<input value={form.meetingPlace} onChange={(event) => setVisitorField("meetingPlace",event.target.value)} onBlur={() => tidyVisitorField("meetingPlace")} placeholder="Pejabat / bilik" /></label></div><label>Catatan<input value={form.notes} onChange={(event) => setVisitorField("notes",event.target.value)} placeholder="Jika ada" /></label></div></details>
      <p className="visitor-disclaimer"><span>ⓘ</span> Dengan meneruskan, pelawat bersetuju maklumat dan gambar digunakan oleh pihak sekolah bagi rekod lawatan, keselamatan dan kecemasan sahaja. Pendaftaran ini bukan kebenaran automatik untuk memasuki kawasan larangan; pelawat hendaklah mematuhi arahan pengawal dan pihak sekolah.</p>
      <div className="visitor-actions"><button type="button" onClick={close}>Kembali</button><button className="visitor-primary" disabled={!complete}>Semak maklumat <span>→</span></button></div>
    </form>
  </div>;
}

const tidyAcronyms = new Set(["AI", "HEM", "ICT", "KPM", "OPR", "PAJSK", "PBD", "PIBG", "SMKAP", "SPM", "STEM", "STPM"]);
const tidyLowerWords = new Set(["bin", "binti", "dan", "dari", "daripada", "di", "ke", "serta", "untuk", "yang"]);
function tidyTitleCase(value: string) {
  const words = value.trim().replace(/\s+/g, " ").toLowerCase().split(" ");
  return words.map((word, index) => word.split(/([-’'])/).map((part) => {
    if (/^[-’']$/.test(part)) return part;
    const upper = part.toUpperCase();
    if (tidyAcronyms.has(upper)) return upper;
    if (index > 0 && tidyLowerWords.has(part)) return part;
    return part ? part.charAt(0).toUpperCase() + part.slice(1) : part;
  }).join("")).join(" ");
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
  const tidyField = (field: keyof typeof form) => setForm((current) => ({ ...current, [field]: tidyTitleCase(current[field]) }));
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
  const sendToDrive = async () => { if (!pdfBase64 || !pdfPreviewUrl) return notify("Sila jana dan semak pratonton PDF dahulu"); setSending(true); setDriveUrl(""); try { const base = `${form.date}-${safeName(form.title)}`; const pdfBase = `${base}__PENYEDIA__${safeName(form.preparedBy)}`; const files = [{ name: `${pdfBase}.pdf`, mimeType: "application/pdf", base64: pdfBase64 }]; for (let index = 0; index < photoFiles.length; index++) files.push({ name: `${base}-gambar-${index + 1}.${photoFiles[index].type === "image/png" ? "png" : "jpg"}`, mimeType: photoFiles[index].type || "image/jpeg", base64: await fileToBase64(photoFiles[index]) }); const response = await fetch("/api/drive", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category: form.category, files }) }); const result = await response.json() as { error?: string; files?: Array<{ url: string }> }; if (!response.ok || !result.files?.[0]) throw new Error(result.error || "Penghantaran tidak berjaya"); setDriveUrl(result.files[0].url); notify("OPR berjaya disimpan ke Google Drive sekolah"); } catch (error) { notify(error instanceof Error ? error.message : "OPR tidak dapat dihantar"); } finally { setSending(false); } };
  return <div className="opr-generator">
    <span className="modal-overline">PENJANA OPR RASMI SMKAP</span>
    <h2 id="folder-title">Cipta OPR baharu</h2>
    <p>Isi maklumat program, kemaskan penulisan dan semak laporan sebelum disimpan.</p>
    <div className="generator-steps" aria-label="Aliran penciptaan OPR"><b>1</b><span>Maklumat</span><i></i><b>2</b><span>Perincian</span><i></i><b>3</b><span>Semakan</span></div>

    {!preview ? <form className="generator-form" onSubmit={(event) => { event.preventDefault(); if (complete) void preparePreview(); }}>
      <div className="generator-row">
        <label>Tajuk program<input value={form.title} onChange={(e) => setField("title", e.target.value)} onBlur={() => tidyField("title")} placeholder="Contoh: Program Ihya' Ramadan" required /></label>
        <label>Bidang<select value={form.category} onChange={(e) => setField("category", e.target.value)}><option>Pengurusan</option><option>Kurikulum</option><option>HEM</option><option>Kokurikulum</option><option>Tingkatan Enam · Kurikulum</option><option>Tingkatan Enam · HEM</option><option>Tingkatan Enam · Kokurikulum</option><option>Lain-lain</option></select></label>
      </div>
      <div className="generator-row generator-four">
        <label>Tarikh<input type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} required /></label>
        <label>Hari<input value={dayName} readOnly aria-readonly="true" /></label>
        <label>Tempat<input value={form.venue} onChange={(e) => setField("venue", e.target.value)} onBlur={() => tidyField("venue")} placeholder="Dewan / lokasi" required /></label>
        <label>Anjuran<input value={form.organiser} onChange={(e) => setField("organiser", e.target.value)} onBlur={() => tidyField("organiser")} placeholder="Unit / panitia" /></label>
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
      <fieldset className="signatory-fields"><legend>Penyedia dan pengesah OPR</legend><div className="generator-row"><label>Nama penyedia<input value={form.preparedBy} onChange={(e) => setField("preparedBy", e.target.value)} onBlur={() => tidyField("preparedBy")} placeholder="Nama penuh penyedia" required /></label><label>Jawatan penyedia<input value={form.preparedRole} onChange={(e) => setField("preparedRole", e.target.value)} onBlur={() => tidyField("preparedRole")} placeholder="Contoh: Guru Mata Pelajaran" required /></label></div><label>Pilih pengesah<select value={form.verifier} onChange={(e) => setField("verifier", e.target.value)}>{verifiers.map(([name, role]) => <option key={name} value={`${name}|${role}`}>{name} — {role}</option>)}<option value="manual">Isi pengesah secara manual</option></select></label>{form.verifier === "manual" && <div className="generator-row manual-verifier"><label>Nama pengesah<input value={form.manualVerifier} onChange={(e) => setField("manualVerifier", e.target.value)} onBlur={() => tidyField("manualVerifier")} placeholder="Nama penuh pengesah" required /></label><label>Jawatan pengesah<input value={form.manualVerifierRole} onChange={(e) => setField("manualVerifierRole", e.target.value)} onBlur={() => tidyField("manualVerifierRole")} placeholder="Jawatan pengesah" required /></label></div>}</fieldset>
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
