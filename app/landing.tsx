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
      <section className={`folder-modal ${open === "oprgenerator" ? "generator-modal" : ""}`} role="dialog" aria-modal="true" aria-labelledby="folder-title">
        <button className="folder-close" onClick={() => setOpen(null)} aria-label="Tutup">×</button>
        {open === "admin" ? <AdminPanel notify={notify} /> : open === "oprgenerator" ? <OprGenerator notify={notify} close={() => setOpen("oprhub")} /> : <>
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
  const [preview, setPreview] = useState(false);
  const [details, setDetails] = useState("");
  const [form, setForm] = useState({
    title: "", category: "Kurikulum", date: "", venue: "", organiser: "", objective: "", outcome: "",
  });

  const setField = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const enhance = () => {
    if (!details.trim()) return notify("Masukkan ringkasan program dahulu");
    setEnhancing(true);
    window.setTimeout(() => {
      setDetails(`Program ini telah dilaksanakan dengan teratur dan lancar. ${details.trim()} Pelaksanaan aktiviti memberi pengalaman bermakna kepada peserta serta menyokong objektif yang telah ditetapkan.`);
      setEnhancing(false);
      notify("Ringkasan OPR telah diperkemas");
    }, 700);
  };

  const complete = Boolean(form.title && form.date && form.venue && details);
  return <div className="opr-generator">
    <span className="modal-overline">PENJANA OPR RASMI SMKAP</span>
    <h2 id="folder-title">Cipta OPR baharu</h2>
    <p>Isi maklumat program, kemaskan penulisan dan semak laporan sebelum disimpan.</p>
    <div className="generator-steps" aria-label="Aliran penciptaan OPR"><b>1</b><span>Maklumat</span><i></i><b>2</b><span>Perincian</span><i></i><b>3</b><span>Semakan</span></div>

    {!preview ? <form className="generator-form" onSubmit={(event) => { event.preventDefault(); if (complete) setPreview(true); }}>
      <div className="generator-row">
        <label>Tajuk program<input value={form.title} onChange={(e) => setField("title", e.target.value)} placeholder="Contoh: Program Ihya' Ramadan" required /></label>
        <label>Bidang<select value={form.category} onChange={(e) => setField("category", e.target.value)}><option>Pengurusan</option><option>Kurikulum</option><option>HEM</option><option>Kokurikulum</option><option>Tingkatan Enam · Kurikulum</option><option>Tingkatan Enam · HEM</option><option>Tingkatan Enam · Kokurikulum</option><option>Lain-lain</option></select></label>
      </div>
      <div className="generator-row generator-three">
        <label>Tarikh<input type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} required /></label>
        <label>Tempat<input value={form.venue} onChange={(e) => setField("venue", e.target.value)} placeholder="Dewan / lokasi" required /></label>
        <label>Anjuran<input value={form.organiser} onChange={(e) => setField("organiser", e.target.value)} placeholder="Unit / panitia" /></label>
      </div>
      <label>Ringkasan pelaksanaan<textarea rows={5} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Terangkan aktiviti yang dijalankan, kumpulan sasaran dan perjalanan program..." required /></label>
      <button type="button" className="generator-ai" onClick={enhance} disabled={enhancing}><span>✦</span>{enhancing ? "Sedang mengemas ayat..." : "Perkemas penulisan dengan AI"}</button>
      <div className="generator-row">
        <label>Objektif<input value={form.objective} onChange={(e) => setField("objective", e.target.value)} placeholder="Objektif utama program" /></label>
        <label>Hasil / impak<input value={form.outcome} onChange={(e) => setField("outcome", e.target.value)} placeholder="Hasil yang dicapai" /></label>
      </div>
      <label className="photo-drop">Gambar program<input type="file" accept="image/*" multiple /><span>＋ Pilih gambar daripada peranti</span><small>Maksimum 6 gambar · JPG atau PNG</small></label>
      <div className="generator-actions"><button type="button" onClick={close}>Kembali</button><button className="save" disabled={!complete}>Semak OPR <span>→</span></button></div>
    </form> : <article className="opr-preview">
      <div className="preview-school"><strong>SMK AGAMA PAHANG</strong><small>MUADZAM SHAH</small></div>
      <span>ONE PAGE REPORT</span><h3>{form.title}</h3>
      <div className="preview-meta"><div><small>Bidang</small><strong>{form.category}</strong></div><div><small>Tarikh</small><strong>{form.date}</strong></div><div><small>Tempat</small><strong>{form.venue}</strong></div><div><small>Anjuran</small><strong>{form.organiser || "—"}</strong></div></div>
      <section><h4>Pelaksanaan program</h4><p>{details}</p></section>
      <div className="preview-columns"><section><h4>Objektif</h4><p>{form.objective || "Belum dinyatakan."}</p></section><section><h4>Hasil / impak</h4><p>{form.outcome || "Belum dinyatakan."}</p></section></div>
      <div className="generator-actions"><button onClick={() => setPreview(false)}>Ubah maklumat</button><button className="save" onClick={() => notify("Draf OPR disediakan — sambungan storan sekolah diperlukan untuk simpan kekal")}>Simpan draf OPR</button></div>
    </article>}
  </div>;
}
