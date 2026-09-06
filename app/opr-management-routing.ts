import {managementFolders} from './management-catalog';

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
 const prefix=({'pengurusan':'pengurusan-','kurikulum':'kurikulum-','hem':'hem-','kokurikulum':'koko-','tingkatan enam':'enam-'} as Record<string,string>)[root];
 if(!prefix)return null;
 // The activity purpose refines a Sixth Form academic programme; a venue in
 // the title does not change its owning division.
 if(root==='tingkatan enam'&&/kecemerlangan|akademik|stpm/i.test(title)&&!/kokurikulum|hal ehwal murid/i.test(category))return managementFolders.find(f=>f.id==='enam-2-3')!;
 const explicit=aliases[category.toLowerCase()];
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
 const match=(date||name).match(/^(20\d{2})-\d{2}-\d{2}(?:\D|$)/);
 return match?Number(match[1]):null;
}
