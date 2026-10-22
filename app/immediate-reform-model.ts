export const reformCategory = 'Lain-lain · Immediate Reform';
export const reformSections = [
 {id:'A',title:'Keselamatan murid & infrastruktur',items:[
 'Pintu pagar utama dikawal selia dengan baik.',
 'Kawasan berisiko tinggi (makmal, bengkel, stor) sentiasa berkunci apabila tiada PdP.',
 'Tiada ancaman fizikal yang berbahaya (contoh: pokok tumbang, siling runtuh, longkang pecah).',
 'Pendawaian/suis elektrik di koridor dan kelas dalam keadaan selamat serta tidak terdedah.']},
 {id:'B',title:'Kebersihan kawasan sekolah',items:[
 'Tandas murid dan guru bersih, berfungsi, serta tiada takungan air.',
 'Kawasan kantin bersih dan makanan ditutup dengan rapi sebelum/semasa waktu rehat.',
 'Sampah di tong telah dikosongkan dan tiada longgokan terbuka.',
 'Tiada kawasan air bertakung yang berpotensi menjadi tempat pembiakan nyamuk Aedes.']},
 {id:'C',title:'Guru bertugas mingguan',items:[
 'Guru bertugas mingguan hadir awal dan menguruskan keperluan murid (contoh: sakit, hal kecemasan).',
 'Guru bertugas memantau pergerakan murid secara aktif semasa waktu rehat.',
 'Buku Laporan Guru Bertugas Mingguan telah diisi dan dikemas kini.']},
 {id:'D',title:'Warden bertugas',items:[
 'Warden berada di asrama semasa bertugas.',
 'Pemeriksaan keselamatan bilik dilaksanakan (tiada barang terlarang).',
 'Rekod kesihatan murid asrama dikemas kini & tindakan kecemasan sentiasa bersiap sedia.']},
] as const;
export type ReformAnswer = {status:'Ada'|'Tiada';note:string};
export type ReformForm = {date:string;name:string;position:string;followUp:string;answers:Record<string,ReformAnswer>};
export const reformItems = reformSections.flatMap(section=>section.items.map((text,i)=>({id:`${section.id}${i+1}`,text})));
export function malaysiaDate(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export function freshReform(name='',position=''):ReformForm{return {date:malaysiaDate(),name,position,followUp:'',answers:Object.fromEntries(reformItems.map(({id})=>[id,{status:'Ada',note:''}]))};}
export function reformNotes(form:ReformForm){return reformItems.map(({id,text})=>`${id}. ${text}\n${form.answers[id].status}${form.answers[id].note?` | Catatan: ${form.answers[id].note}`:''}`).join('\n\n');}
