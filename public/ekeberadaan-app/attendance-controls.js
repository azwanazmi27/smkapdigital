// Components composed into the retained attendance app; relief logic stays in its original bundle.
export function createAttendanceControls(React) {
  const {createElement:h,useState,useEffect,useRef}=React;
  function TeacherPicker({teachers,value,onChange,loading}) {
    const [query,setQuery]=useState(''),[open,setOpen]=useState(false),[active,setActive]=useState(0);
    const selected=teachers.find(t=>t.id===value), input=useRef(null);
    const matches=teachers.filter(t=>t.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
    const choose=t=>{onChange(t.id);setQuery('');setOpen(false);input.current?.focus();};
    useEffect(()=>{setQuery('');setOpen(false);setActive(0);},[value,teachers]);
    return h('div',{className:'smk-teacher-picker',onBlur:e=>{if(!e.currentTarget.contains(e.relatedTarget)){setOpen(false);setQuery('');}}},
      selected&&h('p',{className:'smk-selected-teacher'},'Dipilih: ',h('strong',null,selected.name)),
      h('div',{className:'smk-picker-input'},h('input',{
        id:'teacher',ref:input,type:'text',role:'combobox','aria-autocomplete':'list','aria-expanded':open,'aria-controls':'smk-teacher-options',
        'aria-activedescendant':open&&matches[active]?`smk-teacher-${active}`:undefined,
        autoComplete:'off',value:open?query:(selected?.name||''),disabled:loading,
        placeholder:loading?'Memuatkan nama…':'Taip nama guru untuk cari',
        onFocus:()=>setOpen(true),onClick:()=>setOpen(true),onChange:e=>{setQuery(e.target.value);setActive(0);setOpen(true);},
        onKeyDown:e=>{if(e.key==='Escape'){setOpen(false);setQuery('');}else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setOpen(true);setActive(i=>Math.max(0,Math.min(matches.length-1,i+(e.key==='ArrowDown'?1:-1))));}else if(e.key==='Enter'&&open){e.preventDefault();if(matches[active])choose(matches[active]);}}
      }),h('button',{type:'button','aria-label':open?'Tutup senarai guru':'Buka senarai guru',disabled:loading,onMouseDown:e=>e.preventDefault(),onClick:()=>{setQuery('');setOpen(v=>!v);}},'⌄')),
      open&&h('div',{className:'smk-picker-results'},h('div',{id:'smk-teacher-options',role:'listbox','aria-label':'Nama guru'},
        matches.length?matches.map((t,i)=>h('button',{key:t.id,id:`smk-teacher-${i}`,type:'button',role:'option','aria-selected':t.id===value,className:i===active?'is-active':'',onMouseDown:e=>e.preventDefault(),onClick:()=>choose(t)},t.name)):h('p',{role:'status'},'Tiada nama yang sepadan.')),
        h('button',{type:'button',className:'smk-picker-done',onMouseDown:e=>e.preventDefault(),onClick:()=>{setOpen(false);setQuery('');}},'Tutup senarai')));
  }
  function useReasons(){
    const [reasons,setReasons]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
    const load=async()=>{setLoading(true);setError('');try{const r=await fetch('/api/ekeberadaan?resource=reasons',{cache:'no-store'}),d=await r.json();if(!r.ok)throw Error(d.error||'Senarai sebab tidak dapat dibaca.');setReasons(d.reasons||[]);}catch(e){setError(e.message);}finally{setLoading(false);}};
    useEffect(()=>{void load();const refresh=()=>void load();window.addEventListener('smkap-reasons-changed',refresh);return()=>window.removeEventListener('smkap-reasons-changed',refresh);},[]);
    return {reasons,loading,error,load};
  }
  function ReasonPicker({value,onChange,allowHistorical=false}){
    const {reasons,loading,error,load}=useReasons();
    useEffect(()=>{if(!loading&&!error&&!allowHistorical&&value&&!reasons.includes(value))onChange('');},[reasons,loading,error,allowHistorical,value,onChange]);
    return h('div',null,h('div',{className:'select-wrap'},h('select',{id:'reason',value,onChange:e=>onChange(e.target.value),required:true,disabled:loading||!!error},
      h('option',{value:''},loading?'Memuatkan sebab…':'Pilih sebab ketidakhadiran'),
      allowHistorical&&value&&!reasons.includes(value)&&h('option',{value},`${value} (rekod terdahulu)`),
      reasons.map(reason=>h('option',{key:reason,value:reason},reason))),h('span',null,'⌄')),
      error?h('p',{role:'alert'},error,' ',h('button',{type:'button',onClick:load},'Cuba semula')):!loading&&!reasons.length&&h('p',{role:'status'},'Tiada sebab tersedia. Hubungi Admin untuk menambah pilihan.'));
  }
  function ReasonAdmin({adminPin}){
    const {reasons,loading,error,load}=useReasons(),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[target,setTarget]=useState(null);
    async function change(method,value){setBusy(true);setMessage('');try{
      const r=await fetch('/api/ekeberadaan?resource=reasons'+(method==='DELETE'?'&reason='+encodeURIComponent(value):''),{method,headers:{'Content-Type':'application/json','x-admin-pin':adminPin},...(method==='POST'?{body:JSON.stringify({reason:value})}:{})}),d=await r.json();
      if(!r.ok)throw Error(d.error||'Perubahan tidak dapat disimpan.');
      setReason('');setTarget(null);setMessage(method==='POST'?'Sebab telah ditambah.':'Sebab telah dibuang. Rekod lama dikekalkan.');window.dispatchEvent(new Event('smkap-reasons-changed'));
    }catch(e){setMessage(e.message);}finally{setBusy(false);}}
    return h('section',{className:'smk-reason-admin','aria-labelledby':'smk-reason-title'},
      h('h2',{id:'smk-reason-title'},'Sebab ketidakhadiran'),h('p',null,'Urus pilihan sebab dalam borang guru. Rekod terdahulu kekal apabila pilihan dibuang.'),
      h('form',{onSubmit:e=>{e.preventDefault();if(reason.trim())void change('POST',reason.trim());}},h('label',{htmlFor:'smk-new-reason'},'Sebab baharu'),h('div',{className:'smk-reason-add'},h('input',{id:'smk-new-reason',value:reason,required:true,maxLength:80,placeholder:'Contoh: Cuti Bersalin',onChange:e=>setReason(e.target.value),disabled:busy}),h('button',{disabled:busy||!reason.trim()},busy?'Menyimpan…':'Tambah sebab'))),
      message&&h('p',{role:'status'},message),error&&h('p',{role:'alert'},error,h('button',{type:'button',onClick:load},'Cuba semula')),
      loading?h('p',{role:'status'},'Memuatkan sebab…'):h('ul',null,reasons.map(item=>h('li',{key:item},h('span',null,item),h('button',{type:'button',disabled:busy,'aria-label':`Buang sebab ${item}`,onClick:()=>setTarget(item)},'Buang')))),
      !loading&&!error&&!reasons.length&&h('p',null,'Belum ada pilihan sebab. Tambah sebab baharu di atas.'),
      target&&h('div',{className:'smk-reason-confirm',role:'alertdialog','aria-labelledby':'smk-reason-confirm-title'},h('strong',{id:'smk-reason-confirm-title'},`Buang pilihan “${target}”?`),h('p',null,'Rekod ketidakhadiran lama tidak dipadam.'),h('div',null,h('button',{type:'button',disabled:busy,onClick:()=>setTarget(null)},'Batal'),h('button',{type:'button',disabled:busy,onClick:()=>void change('DELETE',target)},busy?'Membuang…':'Ya, buang'))));
  }
  return {TeacherPicker,ReasonPicker,ReasonAdmin};
}
