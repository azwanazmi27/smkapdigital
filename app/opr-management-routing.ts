import {managementFolders} from './management-catalog';
import {sixthFormMapping} from './skas-catalog';

const normal=(s:string)=>s.toLowerCase().replace(/&/g,'dan').replace(/^(kelab|persatuan|panitia)\s+/,'').replace(/[^a-z0-9]+/g,' ').trim();
const aliases:Record<string,string>={
 'hem · kantin':'hem-9','hem · disiplin':'hem-3','hem · spbt':'hem-5','hem · asrama':'hem-14',
 'hem · kebajikan':'hem-8','hem · bantuan persekolahan':'hem-7','hem · rekod murid & kehadiran':'hem-6',
 'hem · bimbingan & kaunseling':'hem-12','hem · 3k (kebersihan, kesihatan & keselamatan)':'hem-10',
 'pengurusan · data & maklumat':'pengurusan-5','pengurusan · dokumentasi':'pengurusan-9',
 'pengurusan · aset & stok':'pengurusan-3','pengurusan · kewangan & audit':'pengurusan-4',
 'pengurusan · mesyuarat & taklimat guru':'pengurusan-10','pengurusan · perkembangan staf':'pengurusan-11',
 'tingkatan enam · pengurusan tingkatan enam':'enam-1',
};

/** Subject/category only. Deliberately never consumes location or venue fields. */
export function resolveOprManagement(category:string,title:string){
  const parts=category.split(' · ').map(s=>s.trim()),root=parts[0]?.toLowerCase();
  // Duty and assembly reports have a fixed administrative owner.  Their
  // report type, rather than the venue named in the report, chooses the folder.
  if(/laporan perhimpunan/i.test(category))return managementFolders.find(f=>f.id==='pengurusan-17-3')||null;
  if(/laporan guru bertugas/i.test(category)||/laporan[- ](?:harian|mingguan)[- ]guru[- ]bertugas/i.test(title)){
   const weekly=/mingguan/i.test(category)||/mingguan/i.test(title);
   return managementFolders.find(f=>f.id===(weekly?'pengurusan-17-2':'pengurusan-17-1'))||null;
  }
  const prefix=({'pengurusan':'pengurusan-','kurikulum':'kurikulum-','hem':'hem-','kokurikulum':'koko-','tingkatan enam':'enam-'} as Record<string,string>)[root];
 if(!prefix)return null;
 // The activity purpose refines a Sixth Form academic programme; a venue in
 // the title does not change its owning division.
 if(root==='tingkatan enam'&&/kecemerlangan/i.test(title)&&!/kokurikulum|hal ehwal murid/i.test(category))return managementFolders.find(f=>f.id==='enam-2-3')!;
 const explicit=aliases[category.toLowerCase()];
 const sixth=sixthFormMapping(category);
 if(sixth)return managementFolders.find(f=>f.id===sixth[1])||null;
 if(explicit)return managementFolders.find(f=>f.id===explicit)||null;
 if(parts.length<2)return null;
 const tail=normal(parts.at(-1)||'');
 const matches=managementFolders.filter(f=>f.id.startsWith(prefix)&&normal(f.name)===tail);
 if(matches.length===1)return matches[0];
 if(matches.length>1&&parts.length>2){
  const group=normal(parts.at(-2)||'');
  const scoped=matches.filter(f=>normal(managementFolders.find(p=>p.id===f.parent)?.name||'')===group);
  if(scoped.length===1)return scoped[0];
 }
 return null;
}

export function oprSchoolYear(payload:Record<string,unknown>,name:string):number|null{
 const date=typeof payload.programDate==='string'?payload.programDate:'';
 const match=(date||name).match(/^(20\d{2})(?:-\d{2}-\d{2}(?:\D|$)|-Minggu-)/);
 return match?Number(match[1]):null;
}

/** Exact saved SK@S unit to Management, without guessing from programme titles. */
export function resolveSkasManagement(domain:string,unit:string){
 const sixth=sixthFormMapping(unit);
 if(sixth&&sixth[2]===domain)return managementFolders.find(f=>f.id===sixth[1])||null;
 const known:Record<string,string>={
  'Hal Ehwal Murid|Kantin dan Pemakanan':'hem-9',
  'Hal Ehwal Murid|Disiplin dan Pengawas':'hem-3',
  'Hal Ehwal Murid|Kehadiran dan Keciciran':'hem-6',
  'Hal Ehwal Murid|Bimbingan dan Kaunseling':'hem-12',
  'Hal Ehwal Murid|Kebajikan dan Bantuan':'hem-8',
  'Hal Ehwal Murid|Kesihatan, 3K dan Keselamatan':'hem-10',
  'Hal Ehwal Murid|Asrama':'hem-14',
  'Hal Ehwal Murid|Pengurusan HEM':'hem-1',
  'Pengurusan|Data dan Dokumentasi':'pengurusan-9',
  'Pengurusan|Pengurusan Induk':'pengurusan-1',
  'Kurikulum|Pengurusan Kurikulum':'kurikulum-1',
  'Kurikulum|Intervensi Akademik':'kurikulum-4',
  'Kurikulum|Pentaksiran dan Peperiksaan':'kurikulum-5',
  'Kurikulum|Jadual Waktu':'kurikulum-7',
  'Pengajaran dan Pembelajaran|Pencerapan dan Pemantauan':'kurikulum-2',
  'Kokurikulum|Pengurusan Kokurikulum':'koko-1',
  'Kokurikulum|Kejohanan dan Pencapaian':'koko-6',
 };
 const id=known[domain+'|'+unit];
 if(id)return managementFolders.find(f=>f.id===id)||null;
 const root=domain==='Hal Ehwal Murid'?'HEM':domain;
 const category=domain==='Kurikulum'?root+' · '+unit.replace(/^Panitia · /,''):root+' · '+unit;
 return resolveOprManagement(category,'');
}

export function linkedManagementFolder(automatic:string,mapping:{domain:string;unit:string;notes:string;status:string}){
 const manual=/^Pemetaan manual\b/i.test(mapping.notes||'')&&['pending','approved','needs_info'].includes(mapping.status);
 // Outcome standards classify the achievement, not the organisational owner.
 if(!manual||mapping.domain==='Pencapaian')return {folderId:automatic,basis:'source'};
 return {folderId:resolveSkasManagement(mapping.domain,mapping.unit)?.id||'',basis:'manual'};
}
