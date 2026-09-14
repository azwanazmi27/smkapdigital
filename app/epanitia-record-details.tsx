"use client";
import {useEffect,useState} from 'react';
import {managementFolders} from './management-catalog';
type Version={id:string;number:number;filename:string;url:string;status:string;createdAt:string};
type Mapping={id:string;module:string;category:string;standard:string;status:string;versionId:string};
const statusName=(s:string)=>({draft:'Draf',approved:'Diluluskan',active:'Aktif',pending:'Menunggu semakan',pending_review:'Menunggu semakan',rejected:'Ditolak'}[s]||s);
const moduleName=(s:string)=>({epanitia:'Fail Panitia',management:'Pengurusan Sekolah',skas:'Pusat SK@S'}[s]||s);
export function EPanitiaRecordDetails({documentId}:{documentId:string}){
 const [result,setResult]=useState<{versions:Version[];mappings:Mapping[]}|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{const controller=new AbortController();setResult(null);setError('');fetch('/api/documents?view=record&documentId='+encodeURIComponent(documentId),{signal:controller.signal,cache:'no-store'}).then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.error||'Rekod tidak dapat dibaca.');setResult(data);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});return()=>controller.abort();},[documentId,retry]);
 if(error)return <div role="alert"><p>{error}</p><button onClick={()=>setRetry(n=>n+1)}>Cuba semula</button></div>;
 if(!result)return <p role="status">Membaca sejarah versi dan pemetaan…</p>;
 const mappings=result.mappings.filter(m=>m.module==='epanitia'||Boolean(m.category||m.standard));
 return <div className="epanitia-record-details"><details open><summary>Sejarah versi ({result.versions.length})</summary>{result.versions.map(v=><article key={v.id}><strong>Versi {v.number} · {statusName(v.status)}</strong><p>{v.filename}</p><small>{new Date(v.createdAt).toLocaleString('ms-MY')}</small>{/^https:\/\//i.test(v.url)&&<a href={v.url} target="_blank" rel="noreferrer">Buka versi {v.number}</a>}</article>)}</details><details open><summary>Pemetaan dokumen ({mappings.length})</summary>{mappings.length?mappings.map(m=><article key={m.id}><strong>{moduleName(m.module)}</strong><p>{m.category?(m.module==='management'?managementFolders.find(f=>f.id===m.category)?.name||m.category:'Bahagian '+m.category):m.standard}</p><small>{m.module==='epanitia'?'Dipetakan automatik':statusName(m.status)} · {result.versions.find(v=>v.id===m.versionId)?'Versi '+result.versions.find(v=>v.id===m.versionId)!.number:'Versi belum ditetapkan'}</small></article>):<p>Belum ada pemetaan direkodkan.</p>}</details></div>;
}
