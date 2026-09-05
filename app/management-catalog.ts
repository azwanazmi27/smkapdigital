import { skasDomains } from './skas-catalog';

export type ManagementFolder={id:string;parent:string;name:string;domain:string;standard:string;driveUrl?:string;sourceYear?:number};
export const managementSections=[
 {id:'pengurusan',name:'Pengurusan Sekolah',domain:'Pengurusan',standard:'2'},
 {id:'kurikulum',name:'Kurikulum',domain:'Kurikulum',standard:'3.1'},
 {id:'hem',name:'Hal Ehwal Murid',domain:'Hal Ehwal Murid',standard:'3.3'},
 {id:'koko',name:'Kokurikulum',domain:'Kokurikulum',standard:'3.2'},
 {id:'enam',name:'Tingkatan Enam',domain:'Kurikulum',standard:'3.1'},
] as const;
const drive=(id:string)=>'https://drive.google.com/drive/folders/'+id;
const unitLists:Record<string,string[]>={
 pengurusan:['Pengurusan Induk','Perancangan dan Pengoperasian Sekolah','Aset dan Stok','Kewangan dan Audit','Data dan Maklumat','Penilaian Bersepadu','SKPM Kualiti @ Sekolah','Transformasi Sekolah TS25','Dokumentasi Sekolah','Minit Mesyuarat dan Taklimat','Perkembangan Staf dan LADAP','Buku Manual Pengurusan','Sarana dan PIBK','PIBG','Alumni','Anugerah Kecemerlangan dan Graduasi','Guru Bertugas dan Perhimpunan','Pengurusan Dewan','Bilik-bilik Khas','Prep Berkualiti','Pembangunan Sumber Manusia','Pengurusan Bencana','Pembangunan Fizikal Sekolah dan Asrama'],
 kurikulum:['Utama Kurikulum','SKPM Kurikulum','Pengurusan Panitia','Peningkatan Kecemerlangan Akademik','Pentaksiran dan Peperiksaan','Pentaksiran Berasaskan Sekolah (PBS)','Jadual Waktu dan Guru Ganti (MMI)','Pusat Sumber Sekolah','Teknologi Maklumat dan Komunikasi (TMK)','MBMMBI dan DLP'],
 hem:['Pengurusan Induk HEM','Lembaga Disiplin','Pengurusan Disiplin','Badan Kepimpinan Pelajar','SPBT','Pendaftaran, Rekod Murid dan Kehadiran','Bantuan Sekolah','Kebajikan','Kantin','Kebersihan, Kesihatan, Keselamatan (3K) dan Bencana','Buku Kawalan Kelas','Bimbingan dan Kaunseling / Psikometrik','SUMUR','Pengurusan Asrama'],
 koko:['Pengurusan Induk Kokurikulum','Pengurusan Unit Kokurikulum','Daftar Kokurikulum','Papan Maklumat (Board)','ARPRM','Kecemerlangan dan Pembangunan Kokurikulum','Kejurulatihan dan Pengurus Sukan Sekolah','Rumah Sukan','Koperasi','Majalah'],
 enam:['Pengurusan dan Pentadbiran','Kurikulum Tingkatan Enam','Hal Ehwal Murid Tingkatan Enam','Kokurikulum Tingkatan Enam'],
};
// Stable IDs preserve saved documents if the visible labels are refined later.
export const managementFolders:ManagementFolder[]=managementSections.flatMap(section=>unitLists[section.id].map((name,index)=>({id:section.id+'-'+(index+1),parent:section.id,name,domain:section.domain,standard:section.standard})));
for(const [id,domain,standard] of [['enam-1','Pengurusan','2'],['enam-3','Hal Ehwal Murid','3.3'],['enam-4','Kokurikulum','3.2']])Object.assign(managementFolders.find(f=>f.id===id)!,{domain,standard});
const add=(parent:string,names:string[],domain?:string,standard?:string)=>{
 const owner=managementFolders.find(f=>f.id===parent)!;
 names.forEach((name,i)=>managementFolders.push({id:parent+'-'+(i+1),parent,name,domain:domain||owner.domain,standard:standard||owner.standard}));
};
add('kurikulum-1',['Carta Organisasi Kurikulum','Headcount','Perancangan Strategik','Mesyuarat Kurikulum','Dialog Prestasi','Dialog Kecemerlangan','Cakna Pengetua Bersama Pelajar','Rekod Laporan Kurikulum']);
add('kurikulum-3',['Bidang Bahasa','Bidang Sains dan Matematik','Bidang Pendidikan Islam','Bidang Kemanusiaan','Bidang Teknik dan Vokasional']);
add('kurikulum-3-1',['Bahasa Melayu','Bahasa Inggeris','Bahasa Arab']);
add('kurikulum-3-2',['Sains','Matematik','Matematik Tambahan','Fizik','Kimia','Biologi']);
add('kurikulum-3-3',['Pendidikan Islam','Pendidikan Al-Quran dan As-Sunnah','Pendidikan Syariah Islamiah','KKQ']);
add('kurikulum-3-4',['Sejarah','Geografi','Pendidikan Seni Visual','Pendidikan Jasmani dan Kesihatan']);
add('kurikulum-3-5',['RBT','Sains Komputer']);
add('koko-2',['Badan Beruniform','Kelab dan Persatuan','Sukan dan Permainan','Pasukan Sekolah yang Tiada Kelab']);
const kokoUnits=skasDomains.find(d=>d.name==='Kokurikulum')!.units;
['Badan Beruniform','Kelab dan Persatuan','Sukan dan Permainan','Pasukan Sekolah'].forEach((prefix,i)=>add('koko-2-'+(i+1),kokoUnits.filter(u=>u.startsWith(prefix+' · ')).map(u=>u.split(' · ')[1])));
add('enam-1',['Perancangan Strategik','Takwim dan Agihan Tugas','Data Guru dan Murid','Kewangan dan Inventori'],'Pengurusan','2');
add('enam-2',['Peperiksaan STPM, MUET dan Dalaman','Kerja Kursus STPM','Kecemerlangan Akademik STPM','Jadual Waktu','Pengajian Am','Syariah','Bahasa Arab','Bahasa Melayu','Sejarah','Ekonomi','MUET']);
add('enam-3',['Disiplin dan Sahsiah','Biasiswa','Kebajikan Pelajar','Penyelarasan Tingkatan dan Guru Kelas'],'Hal Ehwal Murid','3.3');
add('enam-4',['Persatuan Tingkatan Enam','Pertahanan Awam Malaysia (JPAM)','Sukan dan Permainan'],'Kokurikulum','3.2');
// Links were read from the two supplied Drive trees; their contents remain on Drive.
const legacy:Record<string,string>={
 'kurikulum-1':'1PNq3IuG2R7IJvJ-EtlQmDtys6S1gDHTk','kurikulum-2':'12iFUJT5pwMxHthYjFoqtBQs--ucEEJ4F','kurikulum-3':'1xuKkYEosmnKpNFEdAFsTEPqLHVGy8RKk','kurikulum-4':'1eWctKyUqu60IAkRNlKJLTZ51hOoKpUHp','kurikulum-5':'1s3BAVsWVaH6so_dAP1W47GBALtgM5CZ5','kurikulum-6':'13K8NpUuVPOjvE1fN2poKCFOsje-jKYGR','kurikulum-7':'1MWQCTnk1m5K3CHP7RLH6ZJIgfcHHb3pu','kurikulum-8':'1bvCkiGpHNd4xFuApwx5fxBTvnjsuEXBO','kurikulum-9':'1YyRX6zlavsTm-IFFNq82Ts9Huzja5tr4','kurikulum-10':'19lcqigEXhd6s2EeTZ4fRO2FAmzGu8Pmp',
 'kurikulum-1-1':'1Y7U3EnUnKR3fa4sap9o0aJHUzdbmsfy3','kurikulum-1-2':'12r4hdMksl5HvANXWHH52fe2drK3EL_p6','kurikulum-1-3':'1PU3FdPKzPKTHOSDqPfFMy63gVKlATZsQ','kurikulum-1-4':'1NxrlV7zpv-FXM9BqDUgBhmOdteXPYbQb','kurikulum-1-5':'14DYvuXPdPWbyJNmuCIptGknER_dpvFUN','kurikulum-1-6':'1c0JUHrsTh4KsSZNZMhovvJhq9rScwVLS','kurikulum-1-7':'1144cl1dTHGbIfYubkiEpshDhQfWA2V1O','kurikulum-1-8':'17C_PAFFyz-o-3x8hxWXavAhhRsC1WWec',
 'kurikulum-3-1':'1ZlnN1EF3UrWe2kOE29Y2TkW6B4YvWYpN','kurikulum-3-2':'16m8PsX-mqW9qbLJtSEd-p82gBnetZt0i','kurikulum-3-3':'1IMfHDQvasHu65FucpE2lPbigmufWHbCS','kurikulum-3-4':'1XadmuHzsou77AIZhwGkZuwH1ARgEM1Ch','kurikulum-3-5':'1l5yxZGegIFCmaTQC7KG3kJGbdhFQq8Q2',
 'koko-1':'1CJdilmXEoeCR37u6fAply9GY0WODiHdR','koko-2':'15v_3pF1JSW6tvudQa5EN8yXtKHiJdQYr','koko-3':'1vQLX7PW7krudvbpzo47KL1024tNwhEdV','koko-4':'1ODEqtdc_YqOfrB9LBCLFeuOM7QdSGC4O','koko-2-1':'1diYIoDXaJ76YmBwDlpcvbfaG7d8ObyO6','koko-2-2':'1EOIdfpNKEI1OWvH_ZmmE4V-IQikwd7L5','koko-2-3':'1anB8ROQBJnRNYpUUc-7AZCic6AmMH98M',
};
managementFolders.forEach(f=>{if(legacy[f.id]){f.driveUrl=drive(legacy[f.id]);f.sourceYear=2026;}});
export const managementDocumentTypes=['Carta organisasi','Surat lantikan dan bidang tugas','Pelan strategik, taktikal atau operasi','Minit mesyuarat dan tindakan susulan','Program, aktiviti atau OPR','Pemantauan dan penambahbaikan','Analisis, laporan atau keberhasilan','Sijil, keputusan atau pengiktirafan','Dokumen sokongan lain'];
export function managementPath(id:string):string{
 const folder=managementFolders.find(f=>f.id===id);
 if(folder)return managementPath(folder.parent)+' › '+folder.name;
 return managementSections.find(s=>s.id===id)?.name||'';
}
export function inManagementFolder(id:string,parent:string):boolean{
 if(!parent||id===parent)return true;
 const folder=managementFolders.find(f=>f.id===id);
 return Boolean(folder&&inManagementFolder(folder.parent,parent));
}
