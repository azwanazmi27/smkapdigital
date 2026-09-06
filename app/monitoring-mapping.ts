export const monitoringCategory = 'Lain-lain · e-Pemantauan';
export const monitoringTopics = [
 {id:'pdp',label:'Pengajaran dan pembelajaran (PdP)',folderId:'kurikulum-2',domain:'Pengajaran dan Pembelajaran',standard:'4',unit:'Pencerapan dan Pemantauan'},
 {id:'canteen',label:'Pengurusan kantin dan makanan',folderId:'hem-9',domain:'Hal Ehwal Murid',standard:'3.3',unit:'Kantin dan Pemakanan'},
 {id:'3k',label:'Kebersihan, kesihatan dan keselamatan (3K)',folderId:'hem-10',domain:'Hal Ehwal Murid',standard:'3.3',unit:'Kesihatan, 3K dan Keselamatan'},
 {id:'hostel',label:'Pengurusan asrama',folderId:'hem-14',domain:'Hal Ehwal Murid',standard:'3.3',unit:'Asrama'},
 {id:'discipline',label:'Disiplin dan sahsiah murid',folderId:'hem-3',domain:'Hal Ehwal Murid',standard:'3.3',unit:'Disiplin dan Pengawas'},
 {id:'attendance',label:'Kehadiran murid',folderId:'hem-6',domain:'Hal Ehwal Murid',standard:'3.3',unit:'Kehadiran dan Keciciran'},
 {id:'assets',label:'Aset dan inventori',folderId:'pengurusan-3',domain:'Pengurusan',standard:'2',unit:'Aset dan Stok'},
 {id:'curriculum',label:'Pengurusan kurikulum',folderId:'kurikulum-1',domain:'Kurikulum',standard:'3.1',unit:'Pengurusan Kurikulum'},
 {id:'cocurriculum',label:'Pengurusan kokurikulum',folderId:'koko-1',domain:'Kokurikulum',standard:'3.2',unit:'Pengurusan Kokurikulum'},
] as const;

export function monitoringTitle(name:string) {
 // Legacy filenames also contain venue and author: never classify those fields.
 return name.replace(/^\d{4}-\d{2}-\d{2}-E-PEMANTAUAN-/i,'').split('__')[0].replace(/\.pdf$/i,'').trim();
}
export function resolveMonitoring(title:string,metadata:unknown) {
 const data=metadata&&typeof metadata==='object'?metadata as Record<string,unknown>:{};
 const focus=typeof data.monitoringFocus==='string'?data.monitoringFocus:'';
 if(focus)return monitoringTopics.find(t=>t.id===focus)||null;
 // Legacy records: only an explicit subject in the title; ambiguous titles need review.
 const subject=monitoringTitle(title).toLowerCase().split(/\s+(?:di|bertempat|lokasi)\s+/)[0];
 const rules:Record<string,RegExp>={pdp:/\b(?:pdp|pengajaran|pembelajaran|pencerapan)\b/,canteen:/\bkantin\b/,hostel:/\b(?:asrama|aspura|aspuri)\b/,'3k':/\b(?:3k|kebersihan|kesihatan|keselamatan)\b/,discipline:/\b(?:disiplin|sahsiah)\b/,attendance:/\bkehadiran\b/,assets:/\b(?:aset|inventori)\b/,curriculum:/\bkurikulum\b/,cocurriculum:/\bkokurikulum\b/};
 const found=monitoringTopics.filter(t=>rules[t.id].test(subject));
 return found.length===1?found[0]:null;
}
