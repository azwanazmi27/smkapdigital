'use client';
import {useEffect,useState} from 'react';
import {inManagementFolder,managementPath} from './management-catalog';
type Linked={sourceModule:string;id:string;title:string;category:string;folderId:string;openUrl:string;mappingStatus:string;standardCode:string};
export function OprManagementLinks({year,folder,admin,openSkas}:{year:number;folder:string;admin:boolean;openSkas:()=>void}){
 const [reports,setReports]=useState<Linked[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[refresh,setRefresh]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);setError('');fetch('/api/opr-management?year='+year,{cache:'no-store',signal:AbortSignal.timeout(20000)}).then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error);if(active)setReports(data.reports);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[year,refresh]);
 const shown=reports.filter(r=>!folder||inManagementFolder(r.folderId,folder));
 return <section className="management-materials"><h3>OPR dan e-Pemantauan berkaitan ({shown.length})</h3><p>Rujukan kepada laporan asal. Tidak perlu muat naik semula. Pemetaan SK@S masih memerlukan perakuan.</p><button onClick={()=>setRefresh(n=>n+1)} disabled={loading}>Segarkan rujukan laporan</button>
 {loading?<p role="status">Membaca rujukan laporan…</p>:error?<p role="alert">{error}</p>:shown.length?shown.map(r=><article key={r.id}><div><h4>{r.title}</h4><p>{r.folderId?managementPath(r.folderId):'Perlu semakan: kategori belum mempunyai padanan folder yang jelas.'}</p><p>{r.sourceModule} · {r.category}</p><p>{r.mappingStatus==='approved'?'Evidens diperakui':r.mappingStatus?'Pemetaan SK@S: perlu semakan / perakuan':'Calon evidens SK@S'}{r.standardCode?' · Standard '+r.standardCode:''}</p><div className="management-toolbar">{r.openUrl&&<a href={r.openUrl} target="_blank" rel="noopener noreferrer">Buka laporan asal</a>}{admin&&<button onClick={openSkas}>Semak pemetaan di SK@S</button>}</div></div></article>):<p>Tiada laporan yang mempunyai padanan bagi folder dan tahun ini.</p>}
 </section>;
}
