type Field={label:string;kind:'text'|'list'|'rows';columns?:Record<string,string>};
export const panitiaAIFields:Record<string,Record<string,Field>>={
 org:{portfolios:{label:'Cadangan portfolio',kind:'rows',columns:{role:'Jawatan / portfolio'}}},
 appointment:{duties:{label:'Bidang tugas',kind:'list'}},
 'meeting-call':{agenda:{label:'Agenda mesyuarat',kind:'list'}},
 minutes:{matters:{label:'Perkara mesyuarat',kind:'rows',columns:{discussion:'Perbincangan',decision:'Keputusan'}}},
 calendar:{activities:{label:'Aktiviti takwim',kind:'rows',columns:{name:'Aktiviti',target:'Sasaran',notes:'Catatan'}}},
 'working-paper':{introduction:{label:'Pengenalan',kind:'text'},rationale:{label:'Rasional',kind:'text'},objectives:{label:'Objektif',kind:'list'},evaluation:{label:'Penilaian',kind:'text'},closing:{label:'Penutup',kind:'text'}},
 pcg:{purpose:{label:'Tujuan permohonan',kind:'text'},notes:{label:'Catatan',kind:'text'},items:{label:'Butiran keperluan',kind:'rows',columns:{item:'Item',unit:'Unit'}}},
 postmortem:{strengths:{label:'Kekuatan',kind:'text'},issues:{label:'Isu utama',kind:'text'},causes:{label:'Punca',kind:'text'},targetStudents:{label:'Murid sasaran',kind:'text'},interventions:{label:'Cadangan intervensi',kind:'rows',columns:{action:'Tindakan',indicator:'Indikator'}}},
 annual:{summary:{label:'Rumusan',kind:'text'},achievements:{label:'Pencapaian',kind:'text'},challenges:{label:'Cabaran',kind:'text'},recommendations:{label:'Cadangan tahun berikutnya',kind:'text'}},
};
export type PanitiaAIPatch=Record<string,string|string[]|Record<string,string>[]>;
export function parsePanitiaAIPatch(template:string,value:unknown):PanitiaAIPatch|null{
 const fields=Object.hasOwn(panitiaAIFields,template)?panitiaAIFields[template]:null;if(!fields||!value||typeof value!=='object'||Array.isArray(value))return null;
 const data=value as Record<string,unknown>,patch:PanitiaAIPatch={};
 const clean=(v:unknown)=>typeof v==='string'?v.trim().slice(0,4000):'';
 for(const [key,field] of Object.entries(fields)){
  const v=data[key];
  if(field.kind==='text'&&clean(v))patch[key]=clean(v);
  if(field.kind==='list'&&Array.isArray(v)){const rows=v.slice(0,20).map(clean).filter(Boolean);if(rows.length)patch[key]=rows;}
  if(field.kind==='rows'&&Array.isArray(v)){const rows=v.slice(0,20).filter(row=>row&&typeof row==='object'&&!Array.isArray(row)).map(row=>Object.fromEntries(Object.keys(field.columns||{}).map(col=>[col,clean(row[col])]))).filter(row=>Object.values(row).some(Boolean));if(rows.length)patch[key]=rows;}
 }
 return Object.keys(patch).length?patch:null;
}
const emptyRow:Record<string,Record<string,unknown>>={portfolios:{teacher:''},matters:{officer:'',dueDate:'',status:'Makluman sahaja'},activities:{month:'',startDate:'',endDate:'',coordinator:'',cost:0,status:'Dirancang'},items:{quantity:0,unitPrice:0},interventions:{teacher:'',startDate:'',reviewDate:'',status:'Dirancang'}};
export function applyPanitiaAIPatch(template:string,current:Record<string,unknown>,patch:PanitiaAIPatch){
 const safe=parsePanitiaAIPatch(template,patch);if(!safe)return current;
 const next={...current,_pendingDocument:null};
 for(const [key,value] of Object.entries(safe)){
  if(panitiaAIFields[template][key].kind==='rows'){
   const old=Array.isArray(current[key])?current[key] as Record<string,unknown>[]:[];
   // Keep existing dates, people and amounts at their row positions; retain trailing rows.
   const rows=value as Record<string,string>[];
   (next as Record<string,unknown>)[key]=Array.from({length:Math.max(old.length,rows.length)},(_,i)=>({...emptyRow[key],...old[i],...rows[i]}));
  }else (next as Record<string,unknown>)[key]=value;
 }
 return next;
}
export function panitiaAIContext(data:unknown){
 if(!data||typeof data!=='object'||Array.isArray(data))return {};
 const allowed=new Set(['title','year','role','meetingNo','meetingDate','time','venue','agenda','duties','matters','activities','programmeName','introduction','rationale','objectives','date','target','participants','expenses','funding','evaluation','closing','purpose','items','notes','assessmentType','form','className','subject','candidates','present','passed','gpmp','grades','strengths','issues','causes','targetStudents','interventions','summary','achievements','challenges','recommendations']);
 return Object.fromEntries(Object.entries(data).filter(([key])=>allowed.has(key)));
}
