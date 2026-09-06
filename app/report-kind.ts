/** Listing policy only: never removes or changes the original Drive files. */
export function isPrimaryReport(record:{name:string;category:string}){
 const name=record.name.trim();
 // Archive images are standalone evidence, unlike images attached to an OPR.
 if(record.category==='Lain-lain · Arkib Kejayaan')return /\.(pdf|png|jpe?g)$/i.test(name);
 if(!/\.pdf$/i.test(name))return false;
 if(/__LAMPIRAN__/i.test(name))return false;
 if(/__PENYEDIA__/i.test(name))return true;
 // Original uploader's attachment naming convention, including PDF certificates.
 return !/[-_](?:Gambar[ _-]+aktiviti|Sijil[ _-]+pencapaian|Keputusan[ _-]+rasmi|Surat[ _-]+pengesahan|Dokumen[ _-]+lain|Sijil[ _-]+dokumen[ _-]+PDF)[-_ ]+\d+\.pdf$/i.test(name);
}
