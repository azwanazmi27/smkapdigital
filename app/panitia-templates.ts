import {moneyCents,type PcgLedger} from './panitia-pcg-model';
// Section labels and the ten primary templates were checked against the live
// SMKAP e-Panitia interface on 10 September 2026. No live documents are seeded.
export const panitiaSections=[
 {id:'01',name:'Pengurusan Am',items:['Carta organisasi','Surat lantikan AJK','Bidang tugas','Profil panitia']},
 {id:'02',name:'Perancangan Strategik',items:['Pelan strategik','Pelan taktikal','Pelan operasi']},
 {id:'03',name:'Mesyuarat',items:['Surat panggilan','Agenda mesyuarat','Minit mesyuarat','Tindakan susulan']},
 {id:'04',name:'Kurikulum dan Pentaksiran',items:['Dokumen kurikulum','Takwim pentaksiran','Analisis pentaksiran','Post-mortem']},
 {id:'05',name:'Perancangan dan Program',items:['Takwim tahunan','Kertas kerja program','Laporan OPR']},
 {id:'06',name:'Kewangan PCG',items:['Nota minta','Perancangan perbelanjaan','Dokumen sokongan perolehan']},
 {id:'07',name:'Pembangunan Profesional',items:['Perancangan PLC / LADAP','Rekod perkongsian amalan','Laporan pembangunan profesional']},
 {id:'08',name:'Laporan dan Penilaian',items:['Laporan tahunan','Penilaian program','Tindakan penambahbaikan']},
] as const;
export type TemplateField={key:string;label:string;type?:'date'|'time'|'textarea'|'number'|'person';options?:string[];suggestions?:string[];required?:boolean};
export type Template={id:string;name:string;section:string;description:string;kind:string;fields:TemplateField[];external?:'chart'|'opr'};
const date:TemplateField={key:'date',label:'Tarikh',type:'date',required:true};
const letterDate:TemplateField={key:'letterDate',label:'Tarikh surat',type:'date',required:true};
const fileCode:TemplateField={key:'fileCode',label:'Kod fail rasmi (jika telah disahkan)'};
const signatory:TemplateField[]=[{key:'signatory',label:'Pegawai penandatangan yang dicadangkan',type:'person'},{key:'signatoryPosition',label:'Jawatan / kuasa penandatangan'},{key:'copies',label:'Salinan kepada',type:'textarea'}];
const author:TemplateField={key:'author',label:'Disediakan oleh',type:'person',required:true};
const venue:TemplateField={key:'venue',label:'Tempat',options:['Bilik Mesyuarat','Bilik Guru','Pusat Sumber Sekolah','Makmal Komputer','Google Meet'],required:true};
export const meetingAgendas=['Ucapan pengerusi','Pengesahan minit mesyuarat','Perkara berbangkit','Analisis pencapaian murid','Perancangan program panitia','Pengurusan PCG','Hal-hal lain'];
export const templates:Template[]=[
 {id:'assessment-calendar',name:'Takwim Pentaksiran / PBD',section:'04',description:'Pilih jenis pentaksiran, tarikh dan penyelaras.',kind:'Dokumen sokongan lain',fields:[{key:'assessment',label:'Jenis pentaksiran',options:['Pentaksiran Bilik Darjah (PBD)','Ujian diagnostik','Ujian pertengahan tahun','Peperiksaan akhir tahun','Percubaan SPM'],required:true},date,{key:'class',label:'Kelas / tingkatan',required:true},{key:'scope',label:'Topik dan instrumen pentaksiran',type:'textarea',required:true},{key:'coordinator',label:'Penyelaras',type:'person',required:true},author]},
 {id:'tactical',name:'Pelan Taktikal Panitia',section:'02',description:'Tetapkan program, KPI, sasaran dan tanggungjawab.',kind:'Pelan strategik, taktikal atau operasi',fields:[{key:'programme',label:'Program / inisiatif',required:true},{key:'objective',label:'Objektif',required:true},{key:'kpi',label:'KPI dan sasaran yang dipersetujui',required:true},{key:'period',label:'Tempoh pelaksanaan',required:true},{key:'owner',label:'Pegawai bertanggungjawab',type:'person',required:true},{key:'resources',label:'Sumber dan anggaran kos',type:'textarea',required:true},author]},
 {id:'operational',name:'Pelan Operasi Program',section:'02',description:'Susun langkah kerja, tempoh dan penilaian program.',kind:'Pelan strategik, taktikal atau operasi',fields:[{key:'programme',label:'Nama program',required:true},date,venue,{key:'target',label:'Kumpulan sasaran',required:true},{key:'steps',label:'Langkah pelaksanaan dan pegawai tindakan',type:'textarea',suggestions:['Persediaan dan penyelarasan program.','Pelaksanaan aktiviti mengikut jadual.','Penilaian keberkesanan dan tindakan susulan.'],required:true},{key:'evaluation',label:'Kaedah penilaian / ukuran kejayaan',type:'textarea',required:true},author]},
 {id:'circular',name:'Daftar Pekeliling',section:'01',description:'Rekod rujukan pekeliling sebenar untuk carian fail.',kind:'Dokumen sokongan lain',fields:[{key:'reference',label:'Nombor pekeliling sebenar',required:true},{key:'title',label:'Tajuk pekeliling',required:true},date,{key:'source',label:'Penerbit',options:['KPM','JPN Pahang','PPD','Sekolah'],required:true},{key:'link',label:'Pautan / lokasi dokumen asal',required:true},{key:'action',label:'Tindakan / perkara berkaitan panitia',type:'textarea',required:true},author]},
 {id:'chart',name:'Carta Organisasi Panitia',section:'01',description:'Susun jawatan dan ahli panitia.',kind:'Carta organisasi',fields:[],external:'chart'},
 {id:'appointment',name:'Surat Lantikan AJK',section:'01',description:'Pilih penerima dan jawatan; ayat surat disediakan.',kind:'Surat lantikan dan bidang tugas',fields:[letterDate,fileCode,{key:'reference',label:'No. rujukan rasmi (jika telah diperuntukkan)'},{key:'effectiveFrom',label:'Tarikh mula lantikan',type:'date',required:true},{key:'effectiveTo',label:'Tarikh tamat lantikan',type:'date',required:true},{key:'recipient',label:'Penerima',type:'person',required:true},{key:'role',label:'Jawatan lantikan',options:['Ketua Panitia','Setiausaha','Bendahari','Ahli Jawatankuasa'],required:true},{key:'duties',label:'Bidang tugas',type:'textarea',suggestions:['Menyelaras pelaksanaan aktiviti panitia.','Menyediakan dan menyimpan dokumentasi panitia.','Membantu perancangan serta penilaian program.'],required:true},...signatory,author]},
 {id:'meeting',name:'Surat Panggilan Mesyuarat',section:'03',description:'Pilih bilangan, tempat dan agenda dengan satu klik.',kind:'Dokumen sokongan lain',fields:[letterDate,fileCode,{key:'reference',label:'No. rujukan rasmi (jika telah diperuntukkan)'},{key:'chair',label:'Pengerusi mesyuarat',type:'person'},{key:'number',label:'Bilangan mesyuarat',options:['1','2','3','4'],required:true},{...date,label:'Tarikh mesyuarat'},{key:'time',label:'Masa',type:'time',required:true},venue,{key:'recipient',label:'Penerima',options:['Semua ahli panitia','Ahli jawatankuasa panitia','Guru mata pelajaran'],required:true},...signatory,author]},
 {id:'minutes',name:'Minit Mesyuarat',section:'03',description:'Guna surat terdahulu, tandakan kehadiran dan rekod keputusan.',kind:'Minit mesyuarat dan tindakan susulan',fields:[{key:'number',label:'Bilangan mesyuarat',options:['1','2','3','4'],required:true},date,{key:'time',label:'Masa',type:'time',required:true},venue,{key:'chair',label:'Pengerusi',type:'person',required:true},{key:'endTime',label:'Masa tamat',type:'time'},author]},
 {id:'calendar',name:'Takwim Tahunan',section:'05',description:'Pilih aktiviti lazim dan tetapkan tarikh pelaksanaan.',kind:'Pelan strategik, taktikal atau operasi',fields:[{key:'activities',label:'Aktiviti, tarikh dan penyelaras',type:'textarea',suggestions:['Mesyuarat Panitia Bil. 1','Program intervensi akademik','PLC / perkongsian amalan','Penilaian dan laporan tahunan'],required:true},author]},
 {id:'programme',name:'Kertas Kerja Program',section:'05',description:'Templat cadangan program dengan objektif dan belanjawan.',kind:'Program, aktiviti atau OPR',fields:[{key:'programme',label:'Nama program',required:true},date,venue,{key:'target',label:'Kumpulan sasaran',options:['Semua murid','Murid Tingkatan 1','Murid Tingkatan 2','Murid Tingkatan 3','Murid Tingkatan 4','Murid Tingkatan 5','Guru mata pelajaran'],required:true},{key:'objectives',label:'Objektif program',type:'textarea',suggestions:['Meningkatkan penguasaan kemahiran mata pelajaran.','Mengukuhkan minat dan penglibatan murid.','Membantu murid yang memerlukan intervensi.'],required:true},{key:'implementation',label:'Pelaksanaan dan belanjawan',type:'textarea',required:true},author]},
 {id:'pcg',name:'Nota Minta PCG',section:'06',description:'Isi butiran item; jumlah permohonan dikira automatik.',kind:'Dokumen sokongan lain',fields:[date,fileCode,{key:'purpose',label:'Tujuan permohonan',options:['Bahan pengajaran dan pembelajaran','Pelaksanaan program panitia','Bahan pentaksiran'],required:true},author]},
 {id:'opr',name:'Laporan OPR',section:'05',description:'Gunakan pembina laporan sedia ada di Pusat OPR.',kind:'Program, aktiviti atau OPR',fields:[],external:'opr'},
 {id:'postmortem',name:'Post-mortem Pentaksiran',section:'04',description:'Rekod pencapaian sebenar dan pilih tindakan intervensi.',kind:'Analisis, laporan atau keberhasilan',fields:[{key:'exam',label:'Pentaksiran',options:['Ujian diagnostik','Ujian pertengahan tahun','Peperiksaan akhir tahun','Percubaan SPM'],required:true},{key:'class',label:'Kelas / tingkatan',required:true},{key:'findings',label:'Dapatan sebenar dan analisis',type:'textarea',required:true},{key:'actions',label:'Tindakan intervensi',type:'textarea',suggestions:['Bimbingan kumpulan kecil mengikut tahap penguasaan.','Latihan berfokus bagi topik yang belum dikuasai.','Pemantauan kemajuan murid secara berkala.'],required:true},author]},
 {id:'annual',name:'Laporan Tahunan',section:'08',description:'Ringkaskan program, pencapaian dan cadangan tahun hadapan.',kind:'Analisis, laporan atau keberhasilan',fields:[{key:'activities',label:'Program dan aktiviti yang dilaksanakan',type:'textarea',required:true},{key:'outcomes',label:'Pencapaian dan kekangan sebenar',type:'textarea',required:true},{key:'actions',label:'Cadangan penambahbaikan',type:'textarea',suggestions:['Memperkukuh pemantauan pelaksanaan program.','Menambah baik dokumentasi dan perkongsian bahan.'],required:true},author]},
 {id:'strategic',name:'Pelan Strategik Panitia',section:'02',description:'Pilih fokus, kemudian tetapkan sasaran dan pelaksanaan.',kind:'Pelan strategik, taktikal atau operasi',fields:[{key:'focus',label:'Fokus strategik',options:['Peningkatan pencapaian akademik','Penguasaan kemahiran asas','Peningkatan kualiti PdP'],required:true},{key:'target',label:'Sasaran yang dipersetujui',required:true},{key:'actions',label:'Strategi dan pelaksanaan',type:'textarea',suggestions:['Analisis keperluan dan pencapaian semasa.','Pelaksanaan intervensi mengikut kumpulan sasaran.','Pemantauan kemajuan dan penilaian keberkesanan.'],required:true},author]},
 {id:'plc',name:'Rekod PLC / LADAP',section:'07',description:'Rekod perkongsian profesional dan tindakan susulan.',kind:'Pemantauan dan penambahbaikan',fields:[{key:'activity',label:'Jenis aktiviti',options:['Perkongsian amalan terbaik','Lesson Study','Peer Coaching','Bengkel dalaman'],required:true},date,{key:'topic',label:'Tajuk perkongsian',required:true},{key:'outcomes',label:'Dapatan dan tindakan susulan',type:'textarea',required:true},author]},
];
export type PersonRef={id:string;name:string};
export type Attendance=PersonRef & {category:'Hadir'|'Tidak hadir bersebab'|'Tidak hadir'|'Turut hadir'};
export type RequestItem={sourceItemId?:string;id:string;item:string;quantity:string;price:string};
export type Decision={topic:string;decision:string;owner:string;ownerId?:string;due:string;status:string};
export type TemplateInput={values:Record<string,string>;agendas:string[];decisions:Decision[];people?:Record<string,PersonRef>;attendance?:Attendance[];items?:RequestItem[];sourceMeetingId?:string;sourceMeetingVersion?:number;pcgSource?:{ledgerId:string;revision:number}};
export type DocumentBlock={heading:string;body:string;table?:string[][]};
export function templateDocument(t:Template,subject:string,year:number,input:TemplateInput):{title:string;blocks:DocumentBlock[]}{
 const v=input.values,title=`${t.name} Panitia ${subject}${['meeting','minutes'].includes(t.id)&&v.number?' Bil. '+v.number:''} ${year}`;
 const blocks:DocumentBlock[]=[];
 const person=(key:string)=>input.people?.[key]?.name||'[Belum dipilih daripada direktori berdaftar]';
 const ref=v.reference||'[Belum diperuntukkan]';
 if(t.id==='meeting'||t.id==='appointment'){
  blocks.push({heading:'Rujukan surat',body:`No. rujukan: ${ref}\nKod fail: ${v.fileCode||'[Belum disahkan]'}\nTarikh surat: ${v.letterDate||'[Belum diisi]'}`},
   {heading:'Kepada',body:t.id==='appointment'?person('recipient'):v.recipient});
  if(t.id==='meeting')blocks.push(
   {heading:'Jemputan mesyuarat',body:`Dengan hormatnya perkara di atas dirujuk.\n2. Tuan/puan dijemput menghadiri mesyuarat Panitia ${subject} Bil. ${v.number}/${year} seperti ketetapan berikut:`},
   {heading:'Ketetapan mesyuarat',body:`Tarikh mesyuarat: ${v.date}\nMasa: ${v.time}\nTempat: ${v.venue}\nPengerusi: ${person('chair')}`},
   {heading:'3. Agenda',body:input.agendas.filter(a=>a.trim()).map((a,i)=>`${i+1}. ${a}`).join('\n')},
   {heading:'Penutup',body:'4. Kehadiran dan kerjasama tuan/puan amat dihargai.\nSekian, terima kasih.'});
  else blocks.push({heading:'Cadangan pelantikan',body:`Dengan hormatnya perkara di atas dirujuk.\n2. Pelantikan sebagai ${v.role} Panitia ${subject} dicadangkan bagi tempoh ${v.effectiveFrom} hingga ${v.effectiveTo}. Draf ini belum mengesahkan pelantikan.`},
   {heading:'3. Bidang tugas',body:v.duties},{heading:'Penutup',body:'Kerjasama tuan/puan amat dihargai.\nSekian, terima kasih.'});
  blocks.push({heading:'Pegawai penandatangan yang dicadangkan',body:`${person('signatory')}\n${v.signatoryPosition||'[Jawatan / kuasa belum disahkan]'}\nTiada tandatangan atau kelulusan direkodkan.`});
  if(v.copies)blocks.push({heading:'Salinan kepada',body:v.copies});
 }else if(t.id==='minutes'){
  blocks.push({heading:'Ketetapan mesyuarat',body:`Tarikh: ${v.date}\nMasa mula: ${v.time}\nMasa tamat: ${v.endTime||'[Belum direkodkan]'}\nTempat: ${v.venue}\nPengerusi: ${person('chair')}`});
  for(const category of ['Hadir','Tidak hadir bersebab','Tidak hadir','Turut hadir'])blocks.push({heading:category,body:(input.attendance||[]).filter(a=>a.category===category).map((a,i)=>`${i+1}. ${a.name}`).join('\n')||'Belum direkodkan.'});
  input.decisions.forEach((d,i)=>blocks.push({heading:`${i+1}. ${d.topic}`,body:`Keputusan / catatan sebenar: ${d.decision}\n${d.status==='Makluman sahaja'?'Makluman sahaja; tiada tugasan.':`Tindakan: ${d.owner}\nTarikh sasaran: ${d.due||'Belum ditetapkan'}\nStatus: ${d.status}`}`}));
  blocks.push({heading:'Semakan dan pengesahan',body:'Semakan pengerusi untuk edaran: belum direkodkan.\nPengesahan dalam mesyuarat berikutnya: belum direkodkan.'});
 }else{
  if(t.id==='plc')blocks.push({heading:'Peserta',body:(input.attendance||[]).filter(a=>a.category==='Hadir').map(a=>a.name).join('\n')||'Belum direkodkan.'});
  for(const f of t.fields.filter(f=>f.key!=='author'))blocks.push({heading:f.label,body:f.type==='person'?person(f.key):v[f.key]||'Belum diisi.'});
  if(t.id==='pcg'){
   blocks.push({heading:'Butiran barang / perkhidmatan',body:'',table:requestItems(input).map((item,i)=>[String(i+1),item.item,item.quantity,(moneyCents(item.price)/100).toFixed(2),(Number(item.quantity)*moneyCents(item.price)/100).toFixed(2)])});
   blocks.push({heading:'Jumlah permohonan',body:'RM '+(requestTotal(input)/100).toFixed(2)+'\nPermohonan sahaja; bukan kelulusan, perbelanjaan sebenar atau bukti pembayaran.'},{heading:'Semakan / kelulusan',body:'Belum direkodkan. Format perlu dipadankan dengan borang Nota Minta sekolah yang diluluskan.'});
  }
 }
 blocks.push({heading:'Disediakan oleh',body:person('author')});return {title,blocks};
}
export function templateErrors(t:Template,input:TemplateInput){
 const errors:Record<string,string>={};for(const f of t.fields){const v=input.values[f.key]?.trim();if(f.required&&f.type!=='person'&&!v)errors[f.key]='Lengkapkan '+f.label.toLowerCase()+'.';if(f.type==='number'&&v&&(!Number.isFinite(Number(v))||Number(v)<0||(f.key==='quantity'&&(!Number.isInteger(Number(v))||Number(v)<1))))errors[f.key]='Masukkan nombor yang sah.';}
 for(const f of t.fields.filter(f=>f.type==='person'))if(input.values[f.key]&&!input.people?.[f.key]?.id)errors[f.key]='Pilih guru daripada direktori berdaftar.';
 for(const key of ['reference','fileCode'])if(/^kurikulum-|^e-panitia:/i.test(input.values[key]||''))errors[key]='ID menu aplikasi bukan kod fail atau nombor rujukan rasmi.';
 if(t.id==='appointment'&&input.values.effectiveTo<input.values.effectiveFrom)errors.effectiveTo='Tarikh tamat mesti selepas atau sama dengan tarikh mula.';
 if(t.id==='meeting'&&input.values.letterDate>input.values.date)errors.letterDate='Tarikh surat tidak boleh selepas tarikh mesyuarat.';
 if(t.id==='pcg')try{requestTotal(input);}catch{errors.items='Lengkapkan sekurang-kurangnya satu item, kuantiti bulat positif dan harga sah (maksimum dua perpuluhan).';}
 if(t.id==='meeting'&&!input.agendas.some(a=>a.trim()))errors.agendas='Pilih sekurang-kurangnya satu agenda.';
 if(t.id==='minutes'&&(!input.decisions.length||input.decisions.some(d=>!d.topic.trim()||!d.decision.trim()||(d.status!=='Makluman sahaja'&&(!d.owner.trim()||!d.ownerId)))))errors.decisions='Lengkapkan perkara, catatan sebenar dan pegawai berdaftar untuk tindakan; makluman tidak memerlukan pegawai.';
 return errors;
}

export function requestItems(input:TemplateInput):RequestItem[]{return input.items|| (input.values.item?[{id:'legacy',item:input.values.item,quantity:input.values.quantity,price:input.values.price}]:[]);}
export function requestTotal(input:TemplateInput){
 const items=requestItems(input);if(!items.length)throw new Error('Item diperlukan');
 let total=0;for(const i of items){const qty=Number(i.quantity);if(!i.item.trim()||!Number.isSafeInteger(qty)||qty<1||qty>100000)throw new Error('Item tidak sah');total+=qty*moneyCents(i.price);}
 if(!Number.isSafeInteger(total)||total>10000000000)throw new Error('Jumlah tidak sah');return total;
}
export function documentSection(doc:{section?:string;templateId?:string;documentType?:string;notes?:string}){
 if(doc.section&&panitiaSections.some(s=>s.id===doc.section))return doc.section;
 const template=templates.find(t=>t.id===doc.templateId);if(template)return template.section;
 const explicit=/\[e-panitia:(\d{2})\]/.exec(doc.notes||'')?.[1];if(explicit&&panitiaSections.some(s=>s.id===explicit))return explicit;
 const unique:Record<string,string>={'Carta organisasi':'01','Surat lantikan dan bidang tugas':'01','Minit mesyuarat dan tindakan susulan':'03','Program, aktiviti atau OPR':'05','Pemantauan dan penambahbaikan':'07'};
 return unique[doc.documentType||'']||'review';
}
export function meetingToMinutes(doc:{id:string;version?:number;input:TemplateInput},current:TemplateInput):TemplateInput{
 const v=doc.input.values,people={...current.people};delete people.chair;if(doc.input.people?.chair)people.chair=doc.input.people.chair;
 return {...current,values:{...current.values,number:v.number||'',date:v.date||'',time:v.time||'',venue:v.venue||'',chair:doc.input.people?.chair?.name||'',endTime:''},people,attendance:[],sourceMeetingId:doc.id,sourceMeetingVersion:doc.version||1,agendas:[...doc.input.agendas],decisions:doc.input.agendas.filter(a=>a.trim()).map(topic=>({topic,decision:'',owner:'',due:'',status:'Makluman sahaja'}))};
}

export function pcgRequestFromLedger(ledger:PcgLedger,selectedIds:string[],input:TemplateInput,panitiaId:string,year:number):TemplateInput{
 if(ledger.id!==panitiaId+':'+year)throw new Error('Rekod PCG bukan untuk panitia dan tahun ini.');
 const ids=new Set(selectedIds),items=ledger.items.filter(i=>ids.has(i.id));
 if(!items.length||items.length!==ids.size||items.some(i=>i.status!=='planned'))throw new Error('Pilih item dirancang yang masih tersedia sahaja.');
 return {...input,pcgSource:{ledgerId:ledger.id,revision:ledger.revision},values:{...input.values,purpose:[...new Set(items.map(i=>i.purpose))].join('; ')},items:items.map(i=>({id:i.id,sourceItemId:i.id,item:i.item,quantity:String(i.quantity),price:(i.unitCents/100).toFixed(2)}))};
}
