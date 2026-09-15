"use client";
import {useEffect,useRef,useState} from 'react';
import {Sparkles} from 'lucide-react';
import {AIUsageNote} from './ai-usage';
import {panitiaAIFields,panitiaAIContext,type PanitiaAIPatch} from './epanitia-ai-model';
import './evidence-ai.css';

export function PanitiaAIAssistant({template,panel,data,disabled,onApply}:{template:string;panel:string;data:Record<string,unknown>;disabled:boolean;onApply:(patch:PanitiaAIPatch)=>void}){
 const [notes,setNotes]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[result,setResult]=useState<{key:string;patch:PanitiaAIPatch}|null>(null);
 const abort=useRef<AbortController|null>(null),sequence=useRef(0),key=JSON.stringify([template,panel,panitiaAIContext(data),notes]);
 useEffect(()=>{sequence.current++;abort.current?.abort();setBusy(false);setError('');return()=>abort.current?.abort();},[key]);
 const patch=result?.key===key?result.patch:null;
 async function generate(){if(busy||disabled)return;setBusy(true);setError('');setResult(null);const id=++sequence.current,controller=new AbortController();abort.current=controller;const timer=setTimeout(()=>controller.abort(),360000);
  try{const r=await fetch('/api/ai/panitia-document',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({template,panel,data:panitiaAIContext(data),notes}),signal:controller.signal}),x=await r.json();if(!r.ok)throw Error(x.error||'Draf belum dapat dijana.');if(id===sequence.current)setResult({key,patch:x.patch});}
  catch(e){if(id===sequence.current)setError(e instanceof Error&&e.name!=='AbortError'?e.message:'Permintaan mengambil masa terlalu lama. Cuba semula.');}
  finally{clearTimeout(timer);window.dispatchEvent(new Event('ai-usage-changed'));if(id===sequence.current)setBusy(false);}
 }
 return <section className="evidence-ai"><div className="evidence-ai-heading"><Sparkles aria-hidden="true"/><strong>Bantu sediakan dokumen dengan AI</strong></div><AIUsageNote/><p>Terangkan isi yang diperlukan. Semak draf AI sebelum memasukkannya ke dalam borang.</p><label>Catatan untuk AI<textarea rows={3} maxLength={6000} value={notes} disabled={busy||disabled} onChange={e=>setNotes(e.target.value)} placeholder="Contoh: Sediakan bidang tugas setiausaha panitia untuk mengurus mesyuarat, minit dan dokumentasi."/></label><button type="button" onClick={()=>void generate()} disabled={busy||disabled||notes.trim().length<10}><Sparkles aria-hidden="true"/>{busy?'Sedang menyediakan draf…':'Jana draf AI'}</button>{error&&<p role="alert">{error}</p>}{patch&&<div className="evidence-ai-result"><strong>Draf untuk semakan</strong>{Object.entries(patch).map(([field,value])=><div key={field}><b>{panitiaAIFields[template][field]?.label}</b>{typeof value==='string'?<p>{value}</p>:<ol>{value.map((row,i)=><li key={i}>{typeof row==='string'?row:Object.entries(row).filter(([,v])=>v).map(([column,text])=><p key={column}><b>{panitiaAIFields[template][field]?.columns?.[column]}: </b>{text}</p>)}</li>)}</ol>}</div>)}<p>Nama, tarikh, angka, harga dan kelulusan perlu disemak sendiri. Kandungan teks berkaitan dalam borang akan diganti apabila draf ini digunakan.</p><button type="button" disabled={disabled} onClick={()=>{onApply(patch);setResult(null);}}>Gunakan draf dalam borang</button></div>}</section>;
}
