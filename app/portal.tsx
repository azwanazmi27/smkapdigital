"use client";

import { useMemo, useState } from "react";

type ModalKind = "opr" | "absence" | "visitor" | "admin" | "allOpr" | null;
type OprItem = { title: string; category: string; author: string; date: string; status: string };

const modules = [
  { id: "opr", icon: "▤", title: "OPR", desc: "Lapor, semak & jana laporan", count: "47 laporan", tone: "mint" },
  { id: "absence", icon: "✓", title: "E-Keberadaan", desc: "Rekod kehadiran guru", count: "3 tidak hadir", tone: "coral" },
  { id: "relief", icon: "↔", title: "E-Relief", desc: "Agihan guru ganti", count: "8 waktu hari ini", tone: "gold" },
  { id: "visitor", icon: "⌁", title: "E-Kunjung", desc: "Daftar & jejak pelawat", count: "12 pelawat hari ini", tone: "blue" },
];

const categoryData = [
  ["Pengurusan", 12, "#28624f"],
  ["Kurikulum", 15, "#df735f"],
  ["HEM", 8, "#e2aa3d"],
  ["Kokurikulum", 7, "#5c8fa0"],
  ["Tingkatan Enam", 5, "#8b6e9e"],
] as const;

const initialOpr: OprItem[] = [
  { title: "Program Jom Ke Sekolah", category: "HEM", author: "Pn. Nor Aini", date: "18 Ogos 2026", status: "Disahkan" },
  { title: "Bengkel Teknik Menjawab SPM", category: "Kurikulum", author: "En. Hafiz", date: "17 Ogos 2026", status: "Draf" },
  { title: "Kejohanan Merentas Desa", category: "Kokurikulum", author: "Pn. Salmah", date: "15 Ogos 2026", status: "Disahkan" },
  { title: "Mesyuarat Pengurusan Bil. 7", category: "Pengurusan", author: "En. Azlan", date: "14 Ogos 2026", status: "Disahkan" },
];

const Icon = ({ children }: { children: React.ReactNode }) => <span className="icon" aria-hidden="true">{children}</span>;

export function Portal() {
  const [modal, setModal] = useState<ModalKind>(null);
  const [activeNav, setActiveNav] = useState("Utama");
  const [oprItems, setOprItems] = useState(initialOpr);
  const [toast, setToast] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiText, setAiText] = useState("");
  const [adminMode, setAdminMode] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Semua bidang");

  const visibleOpr = useMemo(() => oprItems.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) || item.author.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "Semua bidang" || item.category === category;
    return matchesSearch && matchesCategory;
  }), [oprItems, search, category]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  };

  const openModule = (id: string) => {
    if (id === "opr") setModal("allOpr");
    if (id === "absence" || id === "relief") setModal("absence");
    if (id === "visitor") setModal("visitor");
  };

  const handleNav = (name: string) => {
    setActiveNav(name);
    if (name === "OPR") setModal("allOpr");
    if (name === "Keberadaan") setModal("absence");
    if (name === "E-Kunjung") setModal("visitor");
    if (name === "Pengurusan") setModal("admin");
  };

  const enhanceWithAi = () => {
    setAiBusy(true);
    window.setTimeout(() => {
      setAiText("Program ini telah dilaksanakan dengan lancar dan mencapai objektif yang ditetapkan. Penglibatan aktif peserta serta kerjasama semua pihak telah menyumbang kepada keberhasilan program. Susulan akan memberi fokus kepada pemantauan impak dan penambahbaikan berterusan.");
      setAiBusy(false);
      notify("Ayat OPR telah diperkemas oleh AI");
    }, 900);
  };

  const saveOpr = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") || "Program Baharu");
    const newItem = { title, category: String(data.get("category") || "Pengurusan"), author: "Cikgu Nurul", date: "18 Ogos 2026", status: "Draf" };
    setOprItems((items) => [newItem, ...items]);
    setModal(null);
    notify("OPR disimpan sebagai draf — sedia dihantar ke Google Drive");
  };

  return (
    <div className="portal-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">س</div>
          <div><strong>SMKAP</strong><span>Muadzam Shah</span></div>
        </div>
        <nav aria-label="Navigasi utama">
          {[
            ["Utama", "⌂"], ["OPR", "▤"], ["Keberadaan", "✓"], ["E-Relief", "↔"], ["E-Kunjung", "⌁"], ["Pengurusan", "♙"]
          ].map(([name, symbol]) => (
            <button key={name} className={activeNav === name ? "active" : ""} onClick={() => handleNav(name)}>
              <Icon>{symbol}</Icon><span>{name}</span>
              {name === "Keberadaan" && <em>3</em>}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <button onClick={() => setModal("admin")}><Icon>⚙</Icon><span>Tetapan Admin</span></button>
          <div className="help-card"><span>?</span><div><strong>Perlukan bantuan?</strong><small>Panduan langkah demi langkah</small></div></div>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div className="mobile-brand"><div className="brand-mark">س</div><strong>SMKAP</strong></div>
          <label className="search"><span>⌕</span><input aria-label="Cari dalam portal" placeholder="Cari laporan, guru atau modul..." value={search} onChange={(e) => setSearch(e.target.value)} /></label>
          <div className="top-actions">
            <button className="round" aria-label="Notifikasi">♢<b>3</b></button>
            <button className="profile" onClick={() => setModal("admin")}><span>NA</span><div><strong>Cikgu Nurul</strong><small>Pentadbir</small></div><i>⌄</i></button>
          </div>
        </header>

        <div className="content">
          <section className="welcome">
            <div>
              <span className="eyebrow">SELASA · 18 OGOS 2026</span>
              <h1>Assalamualaikum, <em>Cikgu Nurul</em></h1>
              <p>Selamat kembali. Semua urusan sekolah kini dalam satu portal.</p>
            </div>
            <div className="school-badge"><span>س</span><div><small>PORTAL RASMI</small><strong>SMK AGAMA PAHANG</strong><i>MUADZAM SHAH</i></div></div>
          </section>

          <section className="section-block">
            <div className="section-heading"><div><span>AKSES PANTAS</span><h2>Modul utama</h2></div><p>Pilih urusan yang ingin dilakukan</p></div>
            <div className="module-grid">
              {modules.map((item) => (
                <button key={item.id} className={`module-card ${item.tone}`} onClick={() => openModule(item.id)}>
                  <div className="module-icon"><Icon>{item.icon}</Icon></div>
                  <div className="module-copy"><h3>{item.title}</h3><p>{item.desc}</p><span>{item.count}</span></div>
                  <b>›</b>
                </button>
              ))}
            </div>
          </section>

          <div className="dashboard-grid">
            <section className="panel opr-panel">
              <div className="panel-head"><div><span>RINGKASAN OPR</span><h2>Laporan mengikut bidang</h2></div><button onClick={() => setModal("allOpr")}>Lihat semua <b>→</b></button></div>
              <div className="opr-summary">
                <div className="donut" aria-label="47 jumlah OPR"><div><strong>{oprItems.length + 43}</strong><span>Jumlah<br/>OPR</span></div></div>
                <div className="category-list">
                  {categoryData.map(([name, count, color]) => (
                    <button key={name} onClick={() => { setCategory(name); setModal("allOpr"); }}><i style={{ background: color }}></i><span>{name}</span><strong>{count}</strong></button>
                  ))}
                </div>
              </div>
              <button className="primary wide" onClick={() => setModal("opr")}><Icon>＋</Icon> Cipta OPR baharu</button>
            </section>

            <section className="panel today-panel">
              <div className="panel-head"><div><span>HARI INI</span><h2>Perlu perhatian</h2></div><time>18 Ogos</time></div>
              <div className="attention coral-line"><div className="att-icon">!</div><div><span>GURU TIDAK HADIR</span><h3>3 orang guru</h3><p>Agihan relief perlu dilengkapkan</p></div><button onClick={() => setModal("absence")}>Urus relief →</button></div>
              <div className="attention blue-line"><div className="att-icon">⌁</div><div><span>PELAWAT HARI INI</span><h3>12 orang berdaftar</h3><p>2 pelawat masih berada di sekolah</p></div><button onClick={() => setModal("visitor")}>Lihat rekod →</button></div>
              <div className="mini-note"><span>✓</span><p><strong>Semua waktu relief pagi telah diisi</strong><br/>Dikemas kini 10 minit lalu</p></div>
            </section>
          </div>

          <section className="panel recent-panel">
            <div className="panel-head"><div><span>AKTIVITI TERKINI</span><h2>OPR terbaharu</h2></div><button onClick={() => setModal("allOpr")}>Semua laporan <b>→</b></button></div>
            <div className="table-wrap">
              <table><thead><tr><th>Nama laporan</th><th>Bidang</th><th>Disediakan oleh</th><th>Tarikh</th><th>Status</th><th></th></tr></thead>
                <tbody>{visibleOpr.slice(0, 4).map((item, index) => <tr key={`${item.title}-${index}`}><td><strong>{item.title}</strong></td><td><span className={`tag tag-${item.category.toLowerCase().replaceAll(" ", "-")}`}>{item.category}</span></td><td>{item.author}</td><td>{item.date}</td><td><span className={`status ${item.status === "Draf" ? "draft" : ""}`}><i></i>{item.status}</span></td><td><button aria-label={`Menu ${item.title}`}>•••</button></td></tr>)}</tbody>
              </table>
            </div>
          </section>

          <footer><span>© 2026 SMK Agama Pahang, Muadzam Shah</span><span>Portal v1.0 · <button onClick={() => notify("Maklum balas anda amat dihargai")}>Beri maklum balas</button></span></footer>
        </div>
      </main>

      <nav className="bottom-nav" aria-label="Navigasi mudah alih">
        {[["Utama", "⌂"], ["OPR", "▤"], ["Hadir", "✓"], ["Kunjung", "⌁"], ["Lagi", "•••"]].map(([name, symbol]) => <button key={name} className={activeNav === name ? "active" : ""} onClick={() => handleNav(name === "Hadir" ? "Keberadaan" : name === "Kunjung" ? "E-Kunjung" : name)}><span>{symbol}</span>{name}</button>)}
      </nav>

      {modal && <Modal kind={modal} close={() => setModal(null)} saveOpr={saveOpr} aiBusy={aiBusy} aiText={aiText} setAiText={setAiText} enhance={enhanceWithAi} notify={notify} oprItems={visibleOpr} adminMode={adminMode} setAdminMode={setAdminMode} category={category} setCategory={setCategory} />}
      {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
    </div>
  );
}

function Modal({ kind, close, saveOpr, aiBusy, aiText, setAiText, enhance, notify, oprItems, adminMode, setAdminMode, category, setCategory }: {
  kind: Exclude<ModalKind, null>; close: () => void; saveOpr: (e: React.FormEvent<HTMLFormElement>) => void; aiBusy: boolean; aiText: string; setAiText: (v: string) => void; enhance: () => void; notify: (v: string) => void; oprItems: OprItem[]; adminMode: boolean; setAdminMode: (v: boolean) => void; category: string; setCategory: (v: string) => void;
}) {
  return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
    <section className={`modal ${kind === "allOpr" ? "modal-wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <button className="modal-close" onClick={close} aria-label="Tutup">×</button>
      {kind === "opr" && <form onSubmit={saveOpr}>
        <span className="modal-kicker">OPR BAHARU</span><h2 id="modal-title">Cipta laporan program</h2><p className="modal-lead">Isi maklumat asas. AI membantu mengemas ayat sebelum laporan disimpan.</p>
        <label>Nama program<input name="title" required placeholder="Contoh: Program Ihya’ Ramadan" /></label>
        <div className="form-row"><label>Bidang<select name="category"><option>Pengurusan</option><option>Kurikulum</option><option>HEM</option><option>Kokurikulum</option><option>Tingkatan Enam — Kurikulum</option><option>Tingkatan Enam — HEM</option><option>Tingkatan Enam — Kokurikulum</option></select></label><label>Tarikh program<input type="date" defaultValue="2026-08-18" /></label></div>
        <label>Rumusan pelaksanaan<textarea value={aiText} onChange={(e) => setAiText(e.target.value)} placeholder="Tulis isi ringkas atau poin penting di sini..." rows={6}></textarea></label>
        <button type="button" className="ai-button" onClick={enhance} disabled={aiBusy}><span>✦</span>{aiBusy ? "AI sedang mengemas ayat..." : "Perkemas dengan AI"}</button>
        <div className="drive-note"><span>◆</span><p><strong>Sedia disimpan ke Google Drive sekolah</strong><br/>PDF akhir akan difailkan mengikut bidang dan tahun.</p></div>
        <div className="modal-actions"><button type="button" className="secondary" onClick={close}>Batal</button><button className="primary">Simpan OPR</button></div>
      </form>}

      {kind === "absence" && <div>
        <span className="modal-kicker">E-KEBERADAAN → E-RELIEF</span><h2 id="modal-title">Urus guru tidak hadir</h2><p className="modal-lead">Satu rekod terus menjana keperluan relief. Tiada kemasukan data berulang.</p>
        <div className="flow"><div className="flow-step done"><span>1</span><p><strong>Rekod tidak hadir</strong><small>Nama, sebab & tempoh</small></p></div><i>→</i><div className="flow-step current"><span>2</span><p><strong>Semak jadual</strong><small>Waktu terlibat dijana</small></p></div><i>→</i><div className="flow-step"><span>3</span><p><strong>Agih relief</strong><small>Maklumkan guru ganti</small></p></div></div>
        {["Ustaz Ahmad Faiz · Cuti sakit · 5 waktu", "Pn. Suraya Ishak · Urusan rasmi · 3 waktu", "En. Muhamad Zaki · Kecemasan · 4 waktu"].map((name, i) => <div className="relief-row" key={name}><span>{name.charAt(0)}</span><div><strong>{name.split(" · ")[0]}</strong><small>{name.split(" · ").slice(1).join(" · ")}</small></div><button onClick={() => notify(`Jadual relief ${i === 0 ? "dibuka" : "sedia diurus"}`)}>Urus <b>→</b></button></div>)}
        <button className="primary wide" onClick={() => { notify("Borang ketidakhadiran baharu dibuka"); close(); }}><Icon>＋</Icon> Rekod guru tidak hadir</button>
      </div>}

      {kind === "visitor" && <div>
        <span className="modal-kicker">E-KUNJUNG</span><h2 id="modal-title">Daftar pelawat dengan QR</h2><p className="modal-lead">Pelawat imbas, isi maklumat ringkas dan rekod masa masuk secara automatik.</p>
        <div className="qr-layout"><div className="fake-qr" aria-label="Contoh kod QR"><span>▦</span><i>▦</i><b>▦</b><em>▦</em></div><div><span className="live-pill">● QR AKTIF</span><h3>Letakkan di pondok pengawal</h3><p>Maklumat lawatan, tujuan dan pegawai ditemui direkod tanpa memaparkan data sensitif kepada umum.</p><button className="secondary" onClick={() => notify("Kod QR sedia untuk dicetak")}>Cetak kod QR</button></div></div>
        <div className="visitor-stats"><div><span>12</span>Pelawat hari ini</div><div><span>2</span>Masih di sekolah</div><div><span>148</span>Bulan ini</div></div>
      </div>}

      {kind === "admin" && <div>
        <span className="modal-kicker">PENGURUSAN & ADMIN</span><h2 id="modal-title">Maklumat sekolah</h2><p className="modal-lead">Carta organisasi dan direktori guru. Tiada nombor peribadi atau data sensitif dipaparkan.</p>
        <div className="admin-toggle"><div><strong>Mod suntingan admin</strong><small>Tambah, ubah atau buang kandungan portal</small></div><button className={adminMode ? "on" : ""} onClick={() => setAdminMode(!adminMode)} aria-pressed={adminMode}><i></i></button></div>
        <div className="org-chart"><div className="org-top"><span>AZ</span><strong>Pengetua</strong><small>Tn. Haji Ahmad Zulkifli</small>{adminMode && <button>Ubah</button>}</div><div className="org-line"></div><div className="org-branches">{[["NR", "PK Pentadbiran"], ["SH", "PK HEM"], ["MK", "PK Kokurikulum"]].map(([initial, role]) => <div key={role}><span>{initial}</span><strong>{role}</strong><small>Maklumat rasmi</small>{adminMode && <button>Ubah</button>}</div>)}</div></div>
        <div className="admin-actions"><button className="secondary" onClick={() => notify("Direktori guru dibuka")}>Lihat senarai guru</button>{adminMode && <button className="primary" onClick={() => notify("Ahli baharu boleh ditambah")}>＋ Tambah ahli</button>}</div>
      </div>}

      {kind === "allOpr" && <div>
        <span className="modal-kicker">PUSAT OPR</span><div className="opr-modal-head"><div><h2 id="modal-title">Semua laporan</h2><p className="modal-lead">Cari, semak dan urus laporan mengikut bidang.</p></div><button className="primary" onClick={() => { close(); document.querySelector<HTMLElement>('.opr-panel .primary')?.click(); }}>＋ OPR baharu</button></div>
        <div className="filter-row"><label>Bidang<select value={category} onChange={(e) => setCategory(e.target.value)}><option>Semua bidang</option>{categoryData.map(([name]) => <option key={name}>{name}</option>)}</select></label><span>{oprItems.length} laporan ditemui</span></div>
        <div className="opr-list">{oprItems.map((item, i) => <article key={`${item.title}-${i}`}><div className="file-icon">▤</div><div><h3>{item.title}</h3><p>{item.author} · {item.date}</p><span className={`tag tag-${item.category.toLowerCase().replaceAll(" ", "-")}`}>{item.category}</span></div><span className={`status ${item.status === "Draf" ? "draft" : ""}`}><i></i>{item.status}</span><button aria-label={`Pilihan ${item.title}`}>•••</button></article>)}</div>
      </div>}
    </section>
  </div>;
}
