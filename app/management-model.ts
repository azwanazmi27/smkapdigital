export const managementSource='PENGURUSAN SEKOLAH';
export const validSchoolYear=(value:unknown)=>Number.isInteger(Number(value))&&Number(value)>=2020&&Number(value)<=2100;
export const isManagementAdmin=(role:string)=>['admin','super_admin'].includes(role);
export function canReadMaterial(row:{visibility:string;ownerEmail:string},actor:{email:string;role:string}){
 return row.visibility==='staff'||row.ownerEmail===actor.email||isManagementAdmin(actor.role);
}
export function safeMaterialUrl(value:string){
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:'';}catch{return '';}
}
export function mappingDomain(code:string){
 return code==='1'||code==='2'?'Pengurusan':code==='3.1'?'Kurikulum':code==='3.2'?'Kokurikulum':code==='3.3'?'Hal Ehwal Murid':code==='4'?'Pengajaran dan Pembelajaran':code.startsWith('5.')?'Pencapaian':'';
}
