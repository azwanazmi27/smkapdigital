"use client";
import {useEffect,useRef,useState} from 'react';
import {FolderOpen,ArrowLeft,ExternalLink,Plus,Search,FileText} from 'lucide-react';
import {managementFolders,managementSections,managementPath,inManagementFolder,managementDocumentTypes} from './management-catalog';
import {isManagementAdmin} from './management-model';
import {skasStandards} from './skas-catalog';

type Material={id:string;schoolYear:number;folderId:string;title:string;documentType:string;sourceUrl:string;openUrl:string;uploaded:boolean;canDelete:boolean;notes:string;visibility:string;ownerName:string;createdAt:string;mappingStatus?:string;standardCode?:string};
export function ManagementCentre({user,notify,initialFolder='',openSkas}:{user:{email:string;name:string;role:string}|null;notify:(s:string)=>void;initialFolder?:string;openSkas:()=>void}){
 const [year,setYear]=useState(new Date().getFullYear()),[years,setYears]=useState<Array<{year:number;status:string}>>([]),[docs,setDocs]=useState<Material[]>([]),[folder,setFolder]=useState(initialFolder),[kind,setKind]=useState(''),[query,setQuery]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[adding,setAdding]=useState(false),[mode,setMode]=useState('link'),[file,setFile]=useState<File|null>(null),[title,setTitle]=useState(''),[url,setUrl]=useState(''),[notes,setNotes]=useState(''),[visibility,setVisibility]=useState('private'),[docType,setDocType]=useState(managementDocumentTypes[0]),[requestId,setRequestId]=useState(''),[mapping,setMapping]=useState<Material|null>(null),[standard,setStandard]=useState('2'),[unit,setUnit]=useState('');
 const sequence=useRef(0),heading=useRef<HTMLHeadingElement>(null);
 const admin=Boolean(user&&isManagementAdmin(user.role)),node=managementFolders.find(f=>f.id===folder),children=managementFolders.filter(f=>f.parent===folder),yearOpen=years.some(y=>y.year===year&&y.status!=='closed');
 const selectedDocs=docs.filter(d=>inManagementFolder(d.folderId,folder)&&(!kind||d.documentType===kind)&&(!query||[d.title,d.ownerName,managementPath(d.folderId)].join(' ').toLowerCase().includes(query.toLowerCase())));
 async function load(next?:number){
  const version=++sequence.current;setLoading(true);setError('');
  try{const r=await fetch('/api/pengurusan'+(next===undefined?'':'?year='+next),{cache:'no-store',signal:AbortSignal.timeout(20000)}),data=await r.json();if(version!==sequence.current)return;if(!r.ok)throw Error(data.error);setYear(data.year);setYears(data.years);setDocs(data.materials);}catch(e){if(version===sequence.current)setError(e instanceof Error?e.message:'Bahan belum dapat dibaca.');}finally{if(version===sequence.current)setLoading(false);}
 }
 useEffect(()=>{void load();return()=>{sequence.current++;};},[]);
 function navigate(id:string){setFolder(id);setKind('');setQuery('');setAdding(false);setMapping(null);heading.current?.scrollIntoView({block:'start'});}
 async function remove(doc:Material){
  if(busy||!window.confirm('Padam bahan “'+doc.title+'”?\n\n'+(doc.uploaded?'Fail akan dipindahkan ke Trash Google Drive sekolah.':'Hanya rekod pautan dibuang. Fail asal tidak disentuh.')+'\nEvidens SK@S berkaitan akan ditarik balik.'))return;
  setBusy(true);setError('');
  try{const r=await fetch('/api/pengurusan?id='+encodeURIComponent(doc.id),{method:'DELETE',signal:AbortSignal.timeout(55000)}),data=await r.json();if(!r.ok)throw Error(data.error);setMapping(null);notify(data.message||'Bahan sudah dipadam.');await load(year);}catch(e){setError(e instanceof Error?e.message:'Pemadaman belum disahkan. Cuba semula.');}finally{setBusy(false);}
 }
 async function save(e:React.FormEvent){
  e.preventDefault();if(busy)return;setBusy(true);setError('');
  try{
   const data=new FormData();Object.entries({id:requestId,schoolYear:String(year),folderId:folder,title,documentType:docType,sourceUrl:mode==='link'?url:'',notes,visibility}).forEach(([k,v])=>data.append(k,v));
   if(mode==='file'){if(!file)throw Error('Pilih satu fail dahulu.');if(file.size>8000000)throw Error('Maksimum 8 MB. Gunakan pautan Drive untuk fail lebih besar.');data.append('file',file);}
   const r=await fetch('/api/pengurusan',{method:'POST',body:data,signal:AbortSignal.timeout(55000)}),result=await r.json();if(!r.ok)throw Error(result.error);
   setAdding(false);setTitle('');setUrl('');setFile(null);setNotes('');notify('Bahan berjaya disimpan.');await load(year);
  }catch(e){setError(e instanceof Error?e.message:'Simpanan belum dapat disahkan. Cuba semula dengan borang yang sama.');}finally{setBusy(false);}
 }
 async function map(e:React.FormEvent){
  e.preventDefault();if(!mapping||busy)return;setBusy(true);setError('');
  try{const r=await fetch('/api/pengurusan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'map',id:mapping.id,standardCode:standard,unitName:unit}),signal:AbortSignal.timeout(20000)}),data=await r.json();if(!r.ok)throw Error(data.error);setMapping(null);notify('Pemetaan disimpan untuk perakuan di Pusat SK@S.');await load(year);}catch(e){setError(e instanceof Error?e.message:'Pemetaan gagal.');}finally{setBusy(false);}
 }
 if(!user)return <section><h2 id="folder-title">PENGURUSAN SEKOLAH</h2><p>Sila log masuk dengan akaun sekolah.</p></section>;
 return <div className="management-centre">
 <header><div><span>FAIL PENGURUSAN MENGIKUT TAHUN</span><h2 id="folder-title" ref={heading}>PENGURUSAN SEKOLAH</h2><p>Simpan dokumen atau pautan lama dalam unit yang berkenaan.</p></div><label>Tahun<select value={year} disabled={busy||loading} onChange={e=>{setYear(Number(e.target.value));setAdding(false);setMapping(null);void load(Number(e.target.value));}}>{years.length?years.map(y=><option key={y.year} value={y.year}>{y.year} · {y.status==='active'?'Aktif':y.status==='closed'?'Ditutup':'Draf'}</option>):<option>{year}</option>}</select></label></header>
 <nav aria-label="Folder pengurusan"><button disabled={busy} onClick={()=>navigate('')}>Semua bahagian</button>{folder&&<><span>› {managementPath(folder)}</span><button disabled={busy} onClick={()=>navigate(node?.parent||'')}><ArrowLeft/> Kembali satu tahap</button></>}</nav>
 {error&&<div className="management-error" role="alert"><p>{error}</p>{!adding&&!mapping&&<button onClick={()=>void load(year)}>Cuba semula</button>}</div>}
 {loading?<p role="status">Sedang membaca bahan pengurusan…</p>:<>
 {!folder?<div className="management-folders">{managementSections.map(s=><button key={s.id} onClick={()=>navigate(s.id)}><FolderOpen/><strong>{s.name}</strong><span>{docs.filter(d=>inManagementFolder(d.folderId,s.id)).length} bahan boleh diakses</span></button>)}</div>:<>
 <h3>{node?.name||managementSections.find(s=>s.id===folder)?.name}</h3>
 {node?.driveUrl&&node.sourceYear===year&&<aside><a href={node.driveUrl} target="_blank" rel="noopener noreferrer"><ExternalLink/> Buka folder Drive lama ({node.sourceYear})</a><p>Rujukan asal. Untuk memasukkan bahan ke daftar portal, tambah pautan fail atau folder yang berkenaan.</p></aside>}
 {children.length>0&&<div className="management-folders">{children.map(f=><button key={f.id} onClick={()=>navigate(f.id)}><FolderOpen/><strong>{f.name}</strong><span>{docs.filter(d=>inManagementFolder(d.folderId,f.id)).length} bahan boleh diakses</span></button>)}</div>}
 {node&&<><div className="management-toolbar"><button disabled={busy||!yearOpen} onClick={()=>{setAdding(true);setMapping(null);setRequestId(crypto.randomUUID());setDocType(kind||managementDocumentTypes[0]);}}><Plus/> Tambah fail / pautan</button>{admin&&<button onClick={openSkas}>Buka Pusat SK@S</button>}</div>{!yearOpen&&<p>Tahun ditutup atau belum dibuka. Dokumen masih boleh dibaca.</p>}<div className="management-types">{managementDocumentTypes.map(t=><button key={t} aria-pressed={kind===t} onClick={()=>setKind(kind===t?'':t)}>{t}<b>{docs.filter(d=>inManagementFolder(d.folderId,folder)&&d.documentType===t).length}</b></button>)}</div></>}
 </>}
 {adding&&node&&<form onSubmit={save} className="management-form"><h3>Tambah bahan · {node.name}</h3><p>Destinasi fail: Google Drive sekolah → PENGURUSAN SEKOLAH → {year} → {managementPath(folder)}.</p><fieldset disabled={busy}>
 <label>Tajuk bahan<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={180} required/></label>
 <label>Jenis dokumen<select value={docType} onChange={e=>setDocType(e.target.value)}>{managementDocumentTypes.map(t=><option key={t}>{t}</option>)}</select></label>
 <label>Cara simpan<select value={mode} onChange={e=>setMode(e.target.value)}><option value="link">Pautan Drive / fail / folder / laman web</option><option value="file">Muat naik fail ke Drive sekolah</option></select></label>
 {mode==='link'?<label>Pautan HTTPS<input type="url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://drive.google.com/..." required/></label>:<label>Fail · maksimum 8 MB<input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx,.pptx" onChange={e=>setFile(e.target.files?.[0]||null)} required/></label>}
 <label>Siapa boleh melihat dalam portal?<select value={visibility} onChange={e=>setVisibility(e.target.value)}><option value="private">Saya dan pentadbir sahaja</option><option value="staff">Semua warga sekolah yang log masuk</option></select></label>
 <p>Pilih akses terhad bagi data peribadi murid atau staf. Kebenaran fail di Google Drive mengikut tetapan folder Drive; pilihan ini mengawal paparan dalam portal sahaja.</p>
 <label>Catatan<textarea rows={3} value={notes} maxLength={1800} onChange={e=>setNotes(e.target.value)}/></label>
 <div className="management-toolbar"><button type="submit">Simpan bahan</button><button type="button" onClick={()=>setAdding(false)}>Batal</button></div></fieldset>{busy&&<p role="status">Sedang menyimpan dan menunggu pengesahan Drive… Jangan hantar kali kedua.</p>}</form>}
 {mapping&&<form className="management-form" onSubmit={map}><h3>Petakan bahan ke SK@S</h3><p>{mapping.title}</p><p>Cadangan awal berdasarkan folder, bukan analisis kandungan. Semak dokumen sebelum memilih standard.</p><fieldset disabled={busy}><label>Standard<select value={standard} onChange={e=>setStandard(e.target.value)}>{skasStandards.map(([c,n])=><option key={c} value={c}>{c} · {n}</option>)}</select></label><label>Unit / pecahan evidens<input value={unit} maxLength={120} onChange={e=>setUnit(e.target.value)} required/></label><div className="management-toolbar"><button type="submit">Simpan pemetaan untuk semakan</button><button type="button" onClick={()=>setMapping(null)}>Batal</button></div></fieldset>{busy&&<p role="status">Sedang menyimpan pemetaan…</p>}</form>}
 <section><h3>Bahan dalam pilihan ini ({selectedDocs.length})</h3><label className="management-search"><Search/>Cari tajuk, unit atau nama<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Taip untuk mencari"/></label>
 {!selectedDocs.length?<p className="management-empty">Belum ada bahan yang boleh diakses dalam pilihan ini. Folder Drive lama tidak diimport secara automatik.</p>:<div className="management-materials">{selectedDocs.map(doc=><article key={doc.id}><FileText/><div><h4>{doc.title}</h4><p>{managementPath(doc.folderId)}</p><p>{doc.documentType} · {doc.ownerName} · {new Date(doc.createdAt).toLocaleDateString('ms-MY')}</p><p>{doc.visibility==='private'?'Akses terhad':'Warga sekolah'}</p>{doc.notes&&<p>{doc.notes}</p>}<div className="management-toolbar"><a href={doc.openUrl} target="_blank" rel="noopener noreferrer">Buka dokumen <ExternalLink/></a>{doc.uploaded&&<a href={doc.sourceUrl} target="_blank" rel="noopener noreferrer">Buka di Google Drive</a>}{doc.canDelete&&<button className="management-delete" disabled={busy||(!admin&&!yearOpen)} onClick={()=>void remove(doc)}>{busy?'Sedang memproses…':'Padam'}</button>}{admin&&(doc.mappingStatus?<span>{doc.mappingStatus==='approved'?'Diperakui':doc.mappingStatus==='pending'?'Menunggu perakuan':'Perlu semakan'} · Standard {doc.standardCode}</span>:<button disabled={busy||!yearOpen} onClick={()=>{setAdding(false);setMapping(doc);setStandard(managementFolders.find(f=>f.id===doc.folderId)?.standard||'2');setUnit(managementPath(doc.folderId).slice(0,120));}}>Petakan ke SK@S</button>)}</div></div></article>)}</div>}</section>
 </>}
 </div>;
}
