import {managementFolders} from './management-catalog';
import {templates,templateDocument,templateErrors,type TemplateInput,type Attendance} from './panitia-templates';
import {templatePdf} from './panitia-template-pdf';
export type Staff={id:string;name:string;position?:string};
type Data=Record<string,any>;
const fields=managementFolders.filter(f=>f.parent==='kurikulum-3');
export const registeredPanitia=managementFolders.filter(f=>fields.some(b=>b.id===f.parent));
export const panelName=(id:string)=>registeredPanitia.find(p=>p.id===id)?.name||id;
export const coreId=(id:string)=>id==='meeting-call'?'meeting':id;
const personKeys=new Set(['preparedBy','reviewedBy','approvedBy','recipient','signatory','chair','requester','approver','principal','seniorAssistant','gkmp','head','secretary','teacher','coordinator','officer']);
const peopleArrays=new Set(['members','attendance','excused','absent','inAttendance']);
export function snapshotStaff(data:Data,users:Staff[]){const ids=new Set<string>();const visit=(v:any,k='')=>{if(personKeys.has(k)&&typeof v==='string'&&v)ids.add(v);else if(peopleArrays.has(k)&&Array.isArray(v))v.filter(Boolean).forEach(id=>ids.add(id));else if(Array.isArray(v))v.forEach(x=>visit(x));else if(v&&typeof v==='object')Object.entries(v).forEach(([key,x])=>visit(x,key));};visit(data);const invalid=[...ids].filter(id=>!users.some(u=>u.id===id));if(invalid.length)throw new Error('Pilih semula guru melalui direktori berdaftar. Nama lama tidak dianggap ID guru.');return Object.fromEntries(users.filter(u=>ids.has(u.id)).map(u=>[u.id,{id:u.id,name:u.name}]));}
export function displayData(data:Data,users:Staff[]):Data{const name=(id:string)=>users.find(u=>u.id===id)?.name||'—';const visit=(v:any,k=''):any=>personKeys.has(k)&&typeof v==='string'?name(v):peopleArrays.has(k)&&Array.isArray(v)?v.map(name):Array.isArray(v)?v.map(x=>visit(x)):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([key,x])=>[key,visit(x,key)])):v;return {...visit(data),panelId:panelName(data.panelId)};}
export function coreInput(id:string,d:Data,users:Staff[]):TemplateInput{
 const values:Record<string,string>={};for(const [k,v]of Object.entries(d))if(['string','number'].includes(typeof v))values[k]=String(v);
 Object.assign(values,{date:d.meetingDate||d.requestDate||'',letterDate:d.letterDate||'',number:d.meetingNo||'',effectiveFrom:d.startDate||'',effectiveTo:d.endDate||'',duties:(d.duties||[]).join('\n'),author:'',copies:(d.copies||[]).join('\n'),signatoryPosition:d.signatoryPosition||'',recipient:id==='meeting-call'?d.recipients||'':''});
 const people:TemplateInput['people']={};for(const [target,key] of Object.entries({author:'preparedBy',recipient:'recipient',chair:'chair',signatory:'signatory'})){if(id==='meeting-call'&&target==='recipient')continue;const user=users.find(u=>u.id===d[key]);if(user){people[target]={id:user.id,name:user.name};values[target]=user.name;}}
 const attendance:Attendance[]=[];for(const [key,category]of Object.entries({attendance:'Hadir',excused:'Tidak hadir bersebab',absent:'Tidak hadir',inAttendance:'Turut hadir'})){for(const sid of d[key]||[]){const u=users.find(u=>u.id===sid);if(u)attendance.push({id:u.id,name:u.name,category:category as Attendance['category']});}}
 return {values,people,attendance,agendas:d.agenda||[],decisions:(d.matters||[]).map((x:Data)=>({topic:x.discussion||'',decision:x.decision||'',owner:users.find(u=>u.id===x.officer)?.name||'',ownerId:x.officer||'',due:x.dueDate||'',status:x.status||'Makluman sahaja'})),items:(d.items||[]).map((x:Data,i:number)=>({id:x.id||String(i),item:x.item||'',quantity:String(x.quantity??''),price:String(x.unitPrice??'')}))};
}
export function validateBuilder(id:string,d:Data,users:Staff[]){
 if(!registeredPanitia.some(p=>p.id===d.panelId))throw new Error('Pilih panitia daripada senarai sekolah.');if(!Number.isInteger(+d.year)||+d.year<2020||+d.year>2100)throw new Error('Tahun tidak sah.');
 snapshotStaff(d,users);
 if(id==='appointment'&&d.allAjk){if(!Array.isArray(d.recipients)||!d.recipients.length)throw new Error('Pilih penerima lantikan daripada organisasi panitia.');for(const r of d.recipients)validateBuilder(id,{...d,allAjk:false,recipient:r.teacher,role:r.role},users);return;}
 if(['appointment','meeting-call','minutes','pcg'].includes(id)){const t=templates.find(t=>t.id===coreId(id))!;const errors=templateErrors(t,coreInput(id,d,users));if(Object.keys(errors).length)throw new Error(Object.values(errors).join(' '));}
 const attendance=[...(d.attendance||[]),...(d.excused||[]),...(d.absent||[]),...(d.inAttendance||[])];if(new Set(attendance).size!==attendance.length)throw new Error('Seorang guru hanya boleh mempunyai satu kategori kehadiran.');
}
export function migratedCorePdf(id:string,d:Data,users:Staff[]){
 validateBuilder(id,d,users);const t=templates.find(t=>t.id===coreId(id))!,input=coreInput(id,d,users),content=templateDocument(t,panelName(d.panelId),+d.year,input);return templatePdf(content.title,panelName(d.panelId),+d.year,content.blocks).output('blob');
}
