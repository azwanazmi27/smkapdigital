"use client";
import {useEffect,useRef} from 'react';
import {Check,Trash2} from 'lucide-react';
export function PortfolioDeletePopup({title,success,busy,error,onCancel,onConfirm}:{title:string;success:boolean;busy:boolean;error:string;onCancel:()=>void;onConfirm:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const dialog=ref.current!,previous=document.activeElement as HTMLElement|null;dialog.showModal();return()=>{dialog.close();if(previous?.isConnected)previous.focus({preventScroll:true});};},[]);
 return <dialog ref={ref} className={`portfolio-delete-popup ${success?'is-success':''}`} aria-labelledby="portfolio-delete-title" aria-describedby="portfolio-delete-description" onCancel={e=>{e.preventDefault();if(!busy)onCancel();}} onKeyDown={e=>{if(e.key==='Escape')e.stopPropagation();}}>
 <div className="portfolio-delete-symbol">{success?<Check aria-hidden="true"/>:<Trash2 aria-hidden="true"/>}</div>
 <h2 id="portfolio-delete-title">{success?'Portfolio berjaya dipadam':'Padam portfolio ini?'}</h2><strong className="portfolio-delete-name">{title}</strong>
 <p id="portfolio-delete-description">{success?'Portfolio telah dikeluarkan daripada senarai dan lencana kepakaran profil.':'Portfolio akan dikeluarkan daripada profil dan evidens berkaitan ditandakan sebagai dipadam. Fail sijil dipindahkan ke tong sampah Google Drive.'}</p>
 {error&&<p className="portfolio-delete-error" role="alert">{error}</p>}
 <div className="portfolio-delete-actions">{success?<button type="button" className="portfolio-delete-done" onClick={onCancel}>Selesai</button>:<><button type="button" disabled={busy} onClick={onCancel}>Batal</button><button type="button" className="portfolio-delete-confirm" disabled={busy} onClick={onConfirm}>{busy?'Sedang memadam…':'Ya, padam'}</button></>}</div></dialog>;
}
