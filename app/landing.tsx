"use client";

import { useState } from "react";

type Folder = "laporan" | "sekolah" | "cari" | "plc" | "admin" | null;

const folders = [
  { id: "laporan", no: "01", icon: "✎", title: "Hantar laporan", text: "Saya mahu isi laporan OPR", count: "6 pilihan", accent: "teal" },
  { id: "sekolah", no: "02", icon: "↔", title: "Urusan sekolah", text: "Saya mahu buat urusan harian", count: "4 pilihan", accent: "blue" },
  { id: "cari", no: "03", icon: "⌕", title: "Cari & semak", text: "Saya mahu cari maklumat", count: "3 pilihan", accent: "purple" },
  { id: "plc", no: "04", icon: "◎", title: "PLC guru", text: "Saya mahu rekod aktiviti PLC", count: "1 aplikasi", accent: "gold" },
] as const;

const folderContent: Record<Exclude<Folder, null | "admin">, { title: string; intro: string; items: { icon: string; title: string; text: string; badge?: string }[] }> = {
  laporan: {
    title: "Hantar laporan",
    intro: "Pilih bidang OPR. Penulisan boleh diperkemas oleh AI sebelum disimpan ke Google Drive sekolah.",
    items: [
      { icon: "◈", title: "Pengurusan", text: "12 laporan", badge: "12" },
      { icon: "▥", title: "Kurikulum", text: "15 laporan", badge: "15" },
      { icon: "♡", title: "Hal Ehwal Murid", text: "8 laporan", badge: "8" },
      { icon: "✦", title: "Kokurikulum", text: "7 laporan", badge: "7" },
      { icon: "⑥", title: "Tingkatan Enam", text: "Kurikulum, HEM & Kokurikulum", badge: "5" },
      { icon: "＋", title: "Cipta OPR baharu", text: "AI bantu kemaskan penulisan" },
    ],
  },
  sekolah: {
    title: "Urusan sekolah",
    intro: "Urusan rutin warga sekolah dalam satu aliran yang mudah.",
    items: [
      { icon: "✓", title: "E-Keberadaan", text: "Rekod guru tidak hadir", badge: "3" },
      { icon: "↔", title: "E-Relief", text: "Agih guru ganti secara terus", badge: "8" },
      { icon: "⌁", title: "E-Kunjung", text: "QR daftar masuk pelawat", badge: "12" },
      { icon: "?", title: "Bantuan & panduan", text: "Panduan penggunaan portal" },
    ],
  },
  cari: {
    title: "Cari & semak",
    intro: "Cari maklumat rasmi sekolah tanpa paparan data sensitif.",
    items: [
      { icon: "♙", title: "Carta organisasi", text: "Struktur pengurusan sekolah" },
      { icon: "◉", title: "Senarai guru", text: "Direktori nama dan jawatan" },
      { icon: "⌂", title: "Profil sekolah", text: "Maklumat dan hala tuju SMKAP" },
    ],
  },
  plc: {
    title: "PLC guru",
    intro: "Ruang khusus untuk merekod aktiviti Komuniti Pembelajaran Profesional guru.",
    items: [
      { icon: "◎", title: "E-PLC", text: "Rekod, semak dan simpan aktiviti PLC" },
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
      <section className="folder-modal" role="dialog" aria-modal="true" aria-labelledby="folder-title">
        <button className="folder-close" onClick={() => setOpen(null)} aria-label="Tutup">×</button>
        {open === "admin" ? <AdminPanel notify={notify} /> : <>
          <span className="modal-overline">PILIH SUBMODUL</span>
          <h2 id="folder-title">{folderContent[open].title}</h2>
          <p>{folderContent[open].intro}</p>
          <div className="submodule-grid">{folderContent[open].items.map((item) => <button key={item.title} onClick={() => notify(`${item.title} dipilih`)}>
            <span>{item.icon}</span><div><strong>{item.title}</strong><small>{item.text}</small></div>{item.badge && <b>{item.badge}</b>}<i>›</i>
          </button>)}</div>
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
