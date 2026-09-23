"use client";
import {useEffect,useRef,useState} from 'react';
import {AIUsageNote} from "./ai-usage";
import {Sparkles} from 'lucide-react';
import {evidencePanitiaCategories, type EvidenceAISuggestion} from './evidence-ai-model';
import './evidence-ai.css';

export function EvidenceAIAssistant({title,context='',notes='',panitia=false,disabled=false,onApply,applyLabel='Gunakan cadangan'}:{title:string;context?:string;notes?:string;panitia?:boolean;disabled?:boolean;onApply:(suggestion:EvidenceAISuggestion)=>void|Promise<void>;applyLabel?:string}) {
  const [summary,setSummary]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[result,setResult]=useState<{key:string;suggestion:EvidenceAISuggestion}|null>(null),[applied,setApplied]=useState(false),[open,setOpen]=useState(false);
  const controller=useRef<AbortController|null>(null),requestId=useRef(0);
  const key=JSON.stringify([title,context,notes,summary]);
  useEffect(()=>{requestId.current++;controller.current?.abort();setBusy(false);setError('');setApplied(false);return()=>controller.current?.abort();},[key]);
  const suggestion=result?.key===key?result.suggestion:null;
  async function suggest(){
    if(busy||disabled)return;setBusy(true);setError('');setResult(null);setApplied(false);
    const id=++requestId.current,abort=new AbortController();controller.current=abort;
    const timer=setTimeout(()=>abort.abort(),360000);
    try{const r=await fetch('/api/ai/evidence-mapping',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title,context,notes:[notes,summary].filter(Boolean).join('\n')}),signal:abort.signal}),data=await r.json();if(!r.ok)throw new Error(data.error||'Cadangan tidak dapat dijana.');if(id===requestId.current)setResult({key,suggestion:data.suggestion});}
    catch(e){if(id===requestId.current)setError(e instanceof Error&&e.name!=='AbortError'?e.message:'Permintaan mengambil masa terlalu lama. Cuba semula.');}
    finally{window.dispatchEvent(new Event("ai-usage-changed"));clearTimeout(timer);if(id===requestId.current)setBusy(false);}
  }
  async function apply(){if(!suggestion||busy||disabled)return;setBusy(true);setError('');try{await onApply(suggestion);setApplied(true);}catch(e){setError(e instanceof Error?e.message:'Pemetaan belum dapat disimpan.');}finally{setBusy(false);}}
  return <div className={`evidence-ai${open?'':' is-collapsed'}`}><button type="button" className="evidence-ai-toggle" aria-expanded={open} onClick={()=>setOpen(value=>!value)}><Sparkles aria-hidden="true"/>{open?'Tutup bantuan AI':'Bantuan AI'}</button>{open&&<><div className="evidence-ai-heading"><Sparkles aria-hidden="true"/><strong>Bantuan AI untuk eviden</strong></div><AIUsageNote/><p>AI mencadangkan pemetaan daripada tajuk dan ringkasan. Semak dokumen asal sebelum menggunakan cadangan.</p><label>Ringkasan kandungan untuk AI<textarea rows={3} maxLength={5000} value={summary} disabled={busy||disabled} onChange={e=>setSummary(e.target.value)} placeholder="Nyatakan kandungan, tujuan dan hasil yang dibuktikan. Boleh tampal petikan dokumen di sini."/></label><button type="button" disabled={busy||disabled||title.trim().length<3} onClick={()=>void suggest()}><Sparkles aria-hidden="true"/>{busy?'Sedang memproses…':'Cadangkan pemetaan AI'}</button>{title.trim().length<3&&<small>Lengkapkan tajuk dahulu.</small>}{error&&<p role="alert">{error}</p>}{suggestion&&<div className="evidence-ai-result" aria-live="polite"><strong>Standard {suggestion.standardCode} · {suggestion.standardLabel}</strong><span>{suggestion.domain} › {suggestion.unitName}</span><span>{suggestion.evidenceType}</span>{panitia&&<span>Folder panitia: {evidencePanitiaCategories.find(([id])=>id===suggestion.panitiaCategory)?.[1]}</span>}<p>{suggestion.reason}</p><small>Keyakinan {suggestion.confidence} · Cadangan untuk semakan</small><button type="button" disabled={busy||disabled||applied} onClick={()=>void apply()}>{applied?'Cadangan telah digunakan':applyLabel}</button></div>}</>}</div>;
}
