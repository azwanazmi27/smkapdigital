export const defaultNotificationSettings={morningEnabled:true,morningTime:'07:25',morningTitle:'Ringkasan Tugasan Saya',morningGreeting:'Selamat pagi Cikgu {nama}, berikut merupakan tugasan yang ditugaskan kepada cikgu pada hari ini.',morningClosing:'Selamat berkhidmat untuk mendidik cikgu, Terima Kasih Cikgu {nama}.',classEnabled:true,reliefEnabled:true,leadMinutes:10};
export type NotificationSettings=typeof defaultNotificationSettings;
export function validateNotificationSettings(value:unknown):NotificationSettings{
 const v=value as NotificationSettings;
 if(!v||typeof v!=='object'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(v.morningTime)||!Number.isInteger(v.leadMinutes)||v.leadMinutes<5||v.leadMinutes>60)throw new Error('Masa tidak sah. Peringatan mestilah antara 5 hingga 60 minit.');
 for(const key of ['morningEnabled','classEnabled','reliefEnabled'] as const)if(typeof v[key]!=='boolean')throw new Error('Pilihan notifikasi tidak sah.');
 for(const key of ['morningTitle','morningGreeting','morningClosing'] as const)if(typeof v[key]!=='string'||!v[key].trim()||v[key].length>(key==='morningTitle'?100:300))throw new Error('Sila isi tajuk dan mesej dalam had panjang yang dibenarkan.');
 return Object.fromEntries(Object.keys(defaultNotificationSettings).map(k=>[k,v[k as keyof NotificationSettings]])) as NotificationSettings;
}
