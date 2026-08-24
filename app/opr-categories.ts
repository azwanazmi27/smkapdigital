export type OprFolderNode = { name: string; children?: readonly OprFolderNode[] };

export const oprFolderTree: readonly OprFolderNode[] = [
  { name: "Pengurusan", children: [
    { name: "Pengurusan", children: [{ name: "Data & Maklumat" }, { name: "Dokumentasi" }, { name: "Buku Manual Pengurusan" }, { name: "Jadual Guru Bertugas" }] },
    { name: "Perancang & Pengoperasian Sekolah", children: [{ name: "PBPPP" }, { name: "Mesyuarat & Taklimat Guru" }, { name: "PIBG, Sarana & PIBK" }, { name: "Pengurusan Dewan Sekolah" }] },
    { name: "Aset & Stok", children: [{ name: "SKPM Kualiti Sekolah" }, { name: "Perkembangan Staf" }, { name: "Alumni" }, { name: "PREP Berkualiti" }] },
    { name: "Kewangan & Audit", children: [{ name: "Program TS25" }, { name: "MAKA & Graduasi" }, { name: "Pembangunan Sumber Manusia" }, { name: "Pengurusan Bencana" }] },
    { name: "Pembangunan Fizikal Sekolah & Asrama" },
    { name: "Laporan Guru Bertugas", children: [{ name: "Laporan Harian" }, { name: "Laporan Mingguan" }] },
    { name: "Laporan Perhimpunan" },
  ] },
  { name: "Kurikulum", children: [
    { name: "Bahasa & Perpustakaan", children: [{ name: "Bahasa Melayu" }, { name: "Bahasa Inggeris" }, { name: "Bahasa Arab" }] },
    { name: "Sains & Matematik", children: [{ name: "Matematik" }, { name: "Matematik Tambahan" }, { name: "Sains" }, { name: "Fizik" }, { name: "Kimia" }, { name: "Biologi" }] },
    { name: "Kemanusiaan", children: [{ name: "Geografi" }, { name: "Sejarah" }, { name: "Pendidikan Seni" }, { name: "Pendidikan Jasmani & Pendidikan Kesihatan" }] },
    { name: "Teknik & Vokasional", children: [{ name: "Ekonomi" }, { name: "Prinsip Perakaunan" }, { name: "Reka Bentuk & Teknologi" }, { name: "Asas Sains Komputer & Sains Komputer" }] },
    { name: "Pendidikan Islam", children: [{ name: "Pendidikan Islam" }, { name: "Al-Quran & Al-Sunnah" }, { name: "Pendidikan Syariah Islamiah" }] },
    { name: "Sokongan Akademik", children: [{ name: "Pusat Sumber Sekolah" }, { name: "Pentaksiran & Peperiksaan" }, { name: "Jadual Waktu" }, { name: "Peningkatan Kecemerlangan Akademik" }, { name: "Teknologi Maklumat & Komunikasi" }] },
  ] },
  { name: "HEM", children: [{ name: "Disiplin" }, { name: "Badan Kepimpinan Pelajar" }, { name: "Rekod Murid & Kehadiran" }, { name: "SPBT" }, { name: "Bantuan Persekolahan" }, { name: "Kebajikan" }, { name: "Kantin" }, { name: "3K" }, { name: "Bimbingan, Kaunseling & Psikometrik" }, { name: "SUMUR" }, { name: "Asrama" }, { name: "Buku Kawalan Kelas" }] },
  { name: "Kokurikulum", children: [{ name: "Pengurusan Kokurikulum" }, { name: "Koperasi" }, { name: "Rumah Sukan" }, { name: "Unit Beruniform" }, { name: "Kelab & Persatuan" }, { name: "Sukan & Permainan" }, { name: "Majalah" }, { name: "Setiausaha Sukan" }] },
  { name: "Tingkatan Enam", children: [
    { name: "Kurikulum", children: [{ name: "Mata Pelajaran", children: [{ name: "Sejarah" }, { name: "Ekonomi" }, { name: "Pengajian Am" }, { name: "Syariah" }, { name: "Bahasa Inggeris" }, { name: "Bahasa Melayu" }, { name: "Bahasa Arab" }] }, { name: "Pentaksiran Dalaman" }, { name: "Kerja Kursus" }, { name: "Kecemerlangan STPM" }, { name: "Jadual Waktu" }] },
    { name: "HEM" },
    { name: "Kokurikulum", children: [{ name: "Unit Beruniform" }, { name: "Kelab & Persatuan" }, { name: "Sukan & Permainan" }] },
  ] },
  { name: "Lain-lain" },
] as const;

function leaves(nodes: readonly OprFolderNode[], prefix: string[] = []): string[] {
  return nodes.flatMap((node) => { const path = [...prefix, node.name]; return node.children?.length ? leaves(node.children, path) : [path.join(" · ")]; });
}

export const oprCategoryValues = leaves(oprFolderTree);
export const oprCategoryGroups = oprFolderTree.map((root) => ({ label: root.name, options: root.children?.length ? leaves(root.children) : [root.name] }));
export const legacyOprCategories = ["Pengurusan", "Kurikulum", "HEM", "Kokurikulum", "Tingkatan Enam · Kurikulum", "Tingkatan Enam · HEM", "Tingkatan Enam · Kokurikulum", "Laporan Guru Bertugas", "Laporan Perhimpunan", "Lain-lain"] as const;
