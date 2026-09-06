import {managementFolders,managementPath} from './management-catalog';
import {skasDomains,skasStandards} from './skas-catalog';
import {resolveSkasManagement} from './opr-management-routing';
export type ManagementSuggestion={standardCode:string;unitName:string;standardLabel:string;reason:string};
export function suggestManagementMaterial(doc:{folderId:string;documentType:string;title:string}):ManagementSuggestion|null{
 const folder=managementFolders.find(f=>f.id===doc.folderId);
 if(!folder)return null;
 let standardCode=folder.standard;
 let unitName=skasDomains.find(d=>d.name===folder.domain)?.units.find(unit=>resolveSkasManagement(folder.domain,unit)?.id===folder.id)||managementPath(folder.id).slice(0,120);
 let basis=`Folder “${managementPath(folder.id)}” dan jenis “${doc.documentType}”`;
 const subject=doc.title.toLowerCase().split(/\s+(?:di|bertempat|lokasi)\s+/)[0];
 if(doc.documentType==='Sijil, keputusan atau pengiktirafan'){
  standardCode='5.4';unitName=folder.domain==='Kurikulum'?'Akademik':folder.domain==='Kokurikulum'?'Kokurikulum':folder.domain==='Hal Ehwal Murid'?'Sahsiah':'Arkib Kejayaan';
  basis='Jenis dokumen ialah sijil, keputusan atau pengiktirafan; kesesuaian pencapaian perlu disemak';
 }else if(doc.documentType==='Pemantauan dan penambahbaikan'&&/\b(pdp|pengajaran|pembelajaran|pencerapan)\b/.test(subject)){
  standardCode='4';unitName='Pencerapan dan Pemantauan';basis='Jenis pemantauan dan tajuk berkaitan pengajaran atau pembelajaran';
 }else if(doc.documentType==='Pelan strategik, taktikal atau operasi'&&/\b(pengetua|kepimpinan)\b/.test(subject)&&folder.domain==='Pengurusan'){
  standardCode='1';unitName='Perancangan Strategik';basis='Pelan strategik dengan tajuk berkaitan kepimpinan sekolah';
 }
 return {standardCode,unitName,standardLabel:skasStandards.find(([c])=>c===standardCode)?.[1]||'',reason:basis+'. Cadangan awal sahaja; buka dan semak kandungan sebelum perakuan.'};
}
