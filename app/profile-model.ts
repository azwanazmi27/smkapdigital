// Pegawai Perkhidmatan Pendidikan: JPA SSPA Lampiran B.
export const sspaGrades=['DG5','DG6','DG7','DG8','DG9','DG10','DG12','DG13','DG14'];
export function permittedProfileUpdate(body:Record<string,unknown>,current:{name:string;email:string;position:string;grade:string}) {
 for(const field of ['name','email','position'] as const) if(body[field]!==undefined&&body[field]!==current[field]) throw new Error('Nama, e-mel dan jawatan hanya boleh diubah oleh pentadbir melalui Pengurusan Pengguna.');
 const grade=typeof body.grade==='string'?body.grade.trim():current.grade;
 if(grade!==current.grade&&!sspaGrades.includes(grade)) throw new Error('Pilih gred SSPA yang sah.');
 return {grade};
}
