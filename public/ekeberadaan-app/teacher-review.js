export function createTeacherReview(React) {
 const h=React.createElement;
 return function TeacherReview({adminPin,onRefresh}) {
  const [data,setData]=React.useState({candidates:[],teachers:[]});
  const [busy,setBusy]=React.useState(false),[message,setMessage]=React.useState(''),[choices,setChoices]=React.useState({});
  const headers={'Content-Type':'application/json','x-admin-pin':adminPin};
  const call=async(body)=>{
   const response=await fetch('/api/teacher-review',{method:body?'POST':'GET',headers,cache:'no-store',...(body?{body:JSON.stringify(body)}:{})});
   const result=await response.json(); if(!response.ok) throw Error(result.error||'Senarai tidak dapat dibaca.');return result;
  };
  const refresh=async()=>setData(await call());
  const sync=async()=>{setBusy(true);try{const result=await call({action:'sync'});await refresh();setMessage(result.message);}catch(error){setMessage(error.message);}finally{setBusy(false);}};
  React.useEffect(()=>{void sync();},[adminPin]);
  const choose=(key,change)=>setChoices(current=>({...current,[key]:{...current[key],...change}}));
  const save=async(candidate,action)=>{
   const choice=choices[candidate.nameKey]||{};
   if(action==='approve'&&!choice.category){setMessage('Pilih kumpulan guru dahulu.');return;}
   setBusy(true);
   try{const result=await call({action,nameKey:candidate.nameKey,category:choice.category,teacherId:choice.teacherId||''});await refresh();await onRefresh();setMessage(result.message);}catch(error){setMessage(error.message);}finally{setBusy(false);}
  };
  const pending=data.candidates.filter(c=>c.status==='pending');
  const rejected=data.candidates.filter(c=>c.status==='rejected');
  const card=(candidate)=>{
   const choice=choices[candidate.nameKey]||{};
   return h('article',{key:candidate.nameKey,className:'teacher-review-row'},
    h('strong',null,candidate.name),h('small',null,'Sumber: '+candidate.sourceLabel),
    h('label',null,'Padanan nama',h('select',{value:choice.teacherId||'',disabled:busy,onChange:event=>{
     const teacher=data.teachers.find(t=>t.id===event.target.value);choose(candidate.nameKey,{teacherId:event.target.value,category:teacher?.category||''});
    }},h('option',{value:''},'Guru baharu — tambah selepas disahkan'),...data.teachers.map(t=>h('option',{key:t.id,value:t.id},'Guru sedia ada: '+t.name)))),
    h('label',null,'Kumpulan guru',h('select',{value:choice.category||'',disabled:busy,onChange:event=>choose(candidate.nameKey,{category:event.target.value})},
     h('option',{value:''},'Pilih kumpulan'),h('option',{value:'mainstream'},'Guru Arus Perdana'),h('option',{value:'form6'},'Guru Tingkatan Enam'))),
    choice.teacherId&&h('small',null,'Nama guru sedia ada akan diselaraskan dengan nama jadual. Rekod ketidakhadiran lama dikekalkan.'),
    h('div',{className:'teacher-review-actions'},h('button',{type:'button',disabled:busy||!choice.category,onClick:()=>save(candidate,'approve')},busy?'Memproses…':'Sahkan dan simpan kumpulan'),
     candidate.status==='pending'&&h('button',{type:'button',disabled:busy,onClick:()=>save(candidate,'reject')},'Abaikan nama ini')));
  };
  return h('section',{className:'teacher-review-panel','aria-label':'Pengesahan nama daripada jadual waktu guru aSc'},
   h('h2',null,'Nama daripada jadual waktu guru (aSc)'),h('p',null,'Sumber ialah PDF jadual waktu guru aSc yang dimuat naik, bukan jadual guru ganti. Nama baharu perlu disahkan dan dikategorikan sebelum muncul dalam pilihan e-Keberadaan. Kumpulan guru sedia ada tidak diubah secara automatik.'),
   h('button',{type:'button',disabled:busy,onClick:sync},busy?'Menyemak…':'Semak jadual waktu aSc aktif'),
   h('p',{role:'status','aria-live':'polite'},message),h('h3',null,`Menunggu pengesahan (${pending.length})`),
   ...pending.map(card),!pending.length&&!busy&&h('p',null,'Tiada nama baharu menunggu pengesahan.'),
   rejected.length>0&&h('details',null,h('summary',null,`Nama diabaikan (${rejected.length}) — semak semula`),...rejected.map(card)));
 };
}
