"use client";

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, BarChart3, CheckCircle2, ChevronDown, ChevronRight, Clock3, ExternalLink, FilePlus2, FileText, FolderInput, FolderOpen, Search, ShieldCheck } from 'lucide-react';
import { skasStandards, skasEvidenceTypes } from './skas-catalog';
import { evidenceLink, evidenceScope, evidenceUnits, filterEvidence, type EvidenceRecord } from './skas-evidence-model';

const statuses: Record<string,string> = {approved:'Diperakui', pending:'Menunggu semakan', needs_info:'Perlu tindakan', rejected:'Ditolak'};
const dateLabel = (value: string) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleDateString('ms-MY', {day:'numeric', month:'long', year:'numeric'}) : 'Belum direkodkan';

export function SkasExplorer({records, year, loading, error, retry, manage, add, candidates, unmappedCount, canManage, initialStatus='', monitor, setMonitor}: {
  records: EvidenceRecord[]; year: number; loading: boolean; error: string; retry: () => void; manage: () => void; add: () => void; candidates: () => void; unmappedCount: number; canManage: boolean; initialStatus?: string;
  review: (id: string, status: string, notes?: string) => Promise<boolean>;
  monitor: boolean; setMonitor: (value: boolean) => void;
}) {
  const [standard, setStandard] = useState('');
  const [unit, setUnit] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState(initialStatus);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState('');
  const [reviewChecks, setReviewChecks] = useState<boolean[]>([false,false,false,false]);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [openStandards, setOpenStandards] = useState<string[]>([]);
  const heading = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  const scoped = evidenceScope(records, year, monitor);
  const standardRecords = filterEvidence(scoped, {standard});
  const units = evidenceUnits(standardRecords);
  const filtered = filterEvidence(standardRecords, {unit, type, status, query});
  const detail = scoped.find(item => item.id === selected);
  const label = skasStandards.find(([code]) => code === standard)?.[1];
  const selectedUnit = units.find(item => item.key === unit);
  const types = [...new Set(filterEvidence(standardRecords,{unit}).map(item=>item.evidenceType))].sort();

  useEffect(() => { setReviewChecks([false,false,false,false]); setReviewNotes(''); setReviewError(''); if(firstRender.current){firstRender.current=false;return;} heading.current?.focus({preventScroll:true}); heading.current?.scrollIntoView({block:'start',behavior:'instant'}); }, [standard, unit, selected, monitor]);
  function resetFilters() { setUnit(''); setType(''); setStatus(''); setQuery(''); setSelected(''); }
  function openStandard(code: string) { setStandard(code); resetFilters(); }
  function switchMode() { setMonitor(!monitor); setStandard(''); resetFilters(); }
  function back() { if(selected) setSelected(''); else if(unit) {setUnit('');setType('');} else openStandard(''); }
  const summary = (value: string) => scoped.filter(item=>item.status===value).length;
  const showStatus = (value: string) => { setStatus(value); setStandard(''); setUnit(''); setType(''); setSelected(''); window.setTimeout(()=>document.querySelector('#skas-records')?.scrollIntoView({block:'start',behavior:'smooth'}),0); };
  const toggleStandard = (code: string) => setOpenStandards(current=>current.includes(code)?current.filter(item=>item!==code):[...current,code]);
  const reviewItems = ['Dokumen boleh dibuka dan kandungannya jelas','Tajuk, tarikh serta nama penyedia adalah betul','Kandungan benar-benar membuktikan aktiviti atau urusan','Standard, bidang dan unit yang dipilih adalah sesuai'];
  const allChecked = reviewChecks.every(Boolean);
  async function submitReview(nextStatus: 'approved'|'needs_info') {
    if(nextStatus==='approved'&&!allChecked){setReviewError('Sahkan semua perkara dalam senarai semak sebelum memperakui eviden.');return;}
    if(nextStatus==='needs_info'&&!reviewNotes.trim()){setReviewError('Nyatakan perkara yang perlu dilengkapkan sebelum mengembalikan eviden.');return;}
    setReviewError('');setReviewing(true);
    const saved=await review(detail!.id,nextStatus,reviewNotes);
    setReviewing(false);
    if(saved)setSelected('');
  }

  return <section className={`skas-explorer${monitor?' is-monitor':''}${canManage?'':' is-viewer'}`} aria-label="Pelayar evidens mengikut standard">
    <div className="skas-view-controls"><button onClick={switchMode} aria-pressed={monitor}><ShieldCheck aria-hidden="true"/>{monitor?'Kembali ke paparan evidens':'Paparan diperakui'}</button>{canManage&&!monitor&&<button onClick={manage}>Pengurusan lanjutan</button>}</div>
    {monitor&&<p className="skas-monitor-note"><ShieldCheck aria-hidden="true"/>Paparan pemantau · Evidens diperakui sahaja · Tiada kawalan sunting atau padam</p>}
    <nav className="skas-breadcrumb" aria-label="Kedudukan evidens"><button onClick={()=>openStandard('')}>Evidens</button>{standard&&<><ChevronRight aria-hidden="true"/><button onClick={()=>{resetFilters();}}>Standard {standard}</button></>}{unit&&<><ChevronRight aria-hidden="true"/><button onClick={()=>setSelected('')}>{selectedUnit?.name || 'Unit'}</button></>}{detail&&<><ChevronRight aria-hidden="true"/><span>Butiran evidens</span></>}</nav>
    <header className="skas-explorer-heading">{(standard||selected||unit)&&<button onClick={back}><ArrowLeft aria-hidden="true"/>Kembali</button>}<h3 ref={heading} tabIndex={-1}>{detail?detail.title:standard?`Standard ${standard} — ${label || 'Evidens sekolah'}`:initialStatus==='pending'?'Evidens menunggu semakan':`Evidens sekolah ${year}`}</h3><p>{detail?'Semak maklumat dan buka dokumen sumber.':standard?'Pilih pecahan unit atau jenis dokumen untuk melihat kandungannya.':initialStatus==='pending'?'Semak rekod berikut dan ambil tindakan yang diperlukan.':'Pilih tugasan untuk bermula. Pemetaan standard tersedia di bahagian bawah.'}</p></header>
    {loading?<div className="skas-load-state" role="status"><i className="skas-spinner"/>Sedang membaca evidens {year}…</div>:error?<div className="skas-load-state error" role="alert"><strong>{error}</strong><span>Data belum dapat disahkan. Ini tidak bermakna rekod telah dipadam.</span><button onClick={retry}>Cuba semula</button></div>:detail?<article className="skas-document-detail">
      <span className={`skas-status-label ${detail.status}`}>{statuses[detail.status] || detail.status}</span>
      <dl>{[['Standard',detail.standardCode],['Bidang',detail.domain],['Unit / subunit',detail.unitName],['Jenis evidens',detail.evidenceType],['Tahun',String(detail.schoolYear)],['Sumber',detail.sourceModule || (detail.sourceType==='upload'?'Muat naik manual':'Pautan manual')],['Dikemukakan oleh',detail.submittedByName],['Tarikh direkodkan',dateLabel(detail.createdAt)],['Disemak oleh',detail.verifiedByName || 'Belum disemak'],['Tarikh semakan',dateLabel(detail.verifiedAt)]].map(([name,value])=><div key={name}><dt>{name}</dt><dd>{value || 'Belum dinyatakan'}</dd></div>)}</dl>
      {detail.notes&&<div className="skas-detail-notes"><h4>Catatan</h4><p>{detail.notes}</p></div>}
      {evidenceLink(detail)?<div className="skas-source-open"><a href={evidenceLink(detail)} target="_blank" rel="noopener noreferrer"><ExternalLink aria-hidden="true"/>Buka dokumen asal <span>(tab baharu)</span></a><p>Dokumen dibuka pada sumber asal. Pautan Google Drive tertakluk kepada kebenaran pemilik fail.</p></div>:<p role="alert">Pautan dokumen belum tersedia. Hubungi pentadbir untuk melengkapkan sumber evidens.</p>}
      {canManage&&!monitor&&detail.status!=="approved"&&<form className="skas-review-panel" onSubmit={event=>event.preventDefault()}>
        <div className="skas-review-heading"><span>LANGKAH SEMAKAN</span><h4>Tindakan semakan eviden</h4><p>Buka dokumen asal, kemudian sahkan perkara berikut sebelum membuat keputusan.</p></div>
        <fieldset><legend>Senarai semak</legend>{reviewItems.map((item,index)=><label key={item}><input type="checkbox" checked={reviewChecks[index]} onChange={event=>setReviewChecks(current=>current.map((value,itemIndex)=>itemIndex===index?event.target.checked:value))}/><span>{item}</span></label>)}</fieldset>
        <label className="skas-review-notes"><span>Catatan tindakan <small>(wajib jika eviden perlu dilengkapkan)</small></span><textarea rows={4} value={reviewNotes} onChange={event=>{setReviewNotes(event.target.value);setReviewError('');}} placeholder="Contoh: Sila tambah tarikh program dan gambar aktiviti yang lebih jelas."/></label>
        {reviewError&&<p className="skas-review-error" role="alert">{reviewError}</p>}
        <div className="skas-review-actions"><button type="button" onClick={()=>void submitReview('needs_info')} disabled={reviewing}>Kembalikan untuk tindakan</button><button type="button" className="approve" onClick={()=>void submitReview('approved')} disabled={reviewing||!allChecked}>{reviewing?'Sedang menyimpan…':'Perakui eviden'}</button></div>
        {!allChecked&&<p className="skas-review-help">Tandakan keempat-empat pengesahan untuk mengaktifkan butang “Perakui eviden”.</p>}
      </form>}
    </article>:<>
      {!standard&&<>
        {!monitor&&<section className="skas-task-panel" aria-labelledby="skas-task-title"><div><span>MULA DI SINI</span><h4 id="skas-task-title">Apa yang anda mahu lakukan?</h4><p>Pilih tugasan anda. Istilah dan pemetaan SK@S akan dipaparkan hanya apabila diperlukan.</p></div><div className="skas-task-grid"><button className="primary-task" onClick={add}><FilePlus2/><span><strong>Tambah evidens</strong><small>Muat naik fail atau pautan</small></span><ChevronRight/></button><button onClick={()=>showStatus('pending')}><Clock3/><span><strong>Semak evidens</strong><small>{summary('pending')} menunggu semakan</small></span><ChevronRight/></button><button onClick={()=>showStatus('needs_info')}><CheckCircle2/><span><strong>Menunggu tindakan</strong><small>{summary('needs_info')} perlu dilengkapkan</small></span><ChevronRight/></button><button onClick={candidates}><FolderInput/><span><strong>Calon daripada portal</strong><small>Petakan laporan sedia ada</small></span><ChevronRight/></button></div></section>}
        <section className="skas-overview" aria-label="Ringkasan evidens"><div className="skas-overview-title"><div><span>RINGKASAN {year}</span><h4>Status evidens sekolah</h4></div><BarChart3 aria-hidden="true"/></div><div className="skas-summary-buttons">{(monitor?['approved']:['approved','pending','needs_info']).map(value=><button key={value} onClick={()=>showStatus(value)}><span>{statuses[value]}</span><strong>{summary(value)}</strong><small>Lihat senarai <ChevronRight aria-hidden="true"/></small></button>)}</div></section>
        {!monitor&&<section className="skas-unmapped" aria-label="Evidens belum dipetakan"><div className="skas-unmapped-icon"><FolderInput aria-hidden="true"/></div><div><span>PERLU PEMETAAN</span><h4>Evidens belum dipetakan</h4><p>{unmappedCount?`${unmappedCount} laporan portal menunggu standard dan unit ditetapkan.`:'Semua laporan portal telah dipetakan.'}</p></div><strong>{unmappedCount}</strong><button onClick={candidates} disabled={!unmappedCount}>{unmappedCount?'Semak & petakan':'Tiada tindakan'}<ChevronRight aria-hidden="true"/></button></section>}
        <section className="skas-standards-accordion"><div className="skas-accordion-heading"><div><span>PEMETAAN SK@S</span><h4>Standard dan pecahan evidens</h4><p>Buka standard apabila anda mahu melihat pemetaannya.</p></div></div>{skasStandards.map(([code,name])=>{const entries=filterEvidence(scoped,{standard:code}),approved=entries.filter(item=>item.status==='approved').length,isOpen=openStandards.includes(code);return <article key={code} className={isOpen?'open':''}><button className="skas-accordion-trigger" onClick={()=>toggleStandard(code)} aria-expanded={isOpen}><span className="skas-standard-number">{code}</span><span><strong>{name}</strong><small>{entries.length?`${entries.length} evidens${monitor?'':` · ${approved} diperakui`}`:monitor?'Belum ada evidens diperakui':'Belum ada evidens dipetakan'}</small></span><ChevronDown aria-hidden="true"/></button>{isOpen&&<div className="skas-accordion-body"><p>{entries.length?'Lihat pecahan unit, jenis dokumen dan rekod yang dipetakan kepada standard ini.':'Pecahan akan dipaparkan selepas evidens pertama dipetakan.'}</p><button onClick={()=>openStandard(code)}>Buka Standard {code}<ChevronRight aria-hidden="true"/></button></div>}</article>})}<p className="skas-coverage-note">Bilangan ini ialah rekod evidens, bukan skor atau pengesahan bahawa sesuatu standard telah lengkap.</p></section>
      </>}
      {standard&&<section className="skas-unit-section"><h4>Pecahan unit / subunit</h4>{units.length?<div className="skas-unit-cards"><button aria-pressed={!unit} onClick={()=>{setUnit('');setType('');setSelected('');}}><FolderOpen aria-hidden="true"/><span>Semua unit<strong>{standardRecords.length} evidens</strong></span></button>{units.map(group=><button key={group.key} aria-pressed={unit===group.key} onClick={()=>{setUnit(group.key);setType('');setSelected('');}}><FolderOpen aria-hidden="true"/><span>{group.name}<small>{group.domain}</small><strong>{group.count} evidens</strong></span></button>)}</div>:<p className="skas-empty-message">{monitor?'Belum ada evidens diperakui bagi standard ini.':'Belum ada evidens dipetakan kepada standard ini. Pecahan unit akan muncul apabila rekod dipetakan.'}</p>}<p className="skas-coverage-note">Pecahan mengikut unit dalam rekod sedia ada; bukan senarai aspek/TUMS rasmi atau ukuran kelengkapan standard.</p></section>}
      {standard&&<section className="skas-type-section"><h4>Pecahan jenis dokumen</h4><div className="skas-type-cards">{skasEvidenceTypes.map(name=><button key={name} aria-pressed={type===name} onClick={()=>setType(type===name?'':name)}><span>{name}</span><strong>{filterEvidence(standardRecords,{unit,type:name}).length}</strong></button>)}</div></section>}
      <section id="skas-records" className="skas-record-section"><h4>{selectedUnit?`Evidens — ${selectedUnit.name}`:'Senarai evidens'} <span>({filtered.length})</span></h4><div className="skas-explorer-filters"><label><span><Search aria-hidden="true"/>Cari evidens</span><input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Cari tajuk, unit atau nama penyedia"/></label><label>Jenis dokumen<select value={type} onChange={event=>setType(event.target.value)}><option value="">Semua jenis</option>{[...new Set([...types,...skasEvidenceTypes])].map(value=><option key={value}>{value}</option>)}</select></label>{!monitor&&<label>Status<select value={status} onChange={event=>setStatus(event.target.value)}><option value="">Semua status</option>{Object.entries(statuses).map(([value,name])=><option key={value} value={value}>{name}</option>)}</select></label>}</div>
      {(query||type||status)&&<button className="skas-reset-filter" onClick={()=>{setQuery('');setType('');setStatus('');}}>Kosongkan carian & penapis</button>}
      <p className="skas-result-count" role="status">{filtered.length} evidens dalam pilihan ini</p>
      {filtered.length?<div className="skas-record-cards">{filtered.map(item=><button key={item.id} onClick={()=>setSelected(item.id)}><FileText aria-hidden="true"/><div><span className={`skas-status-label ${item.status}`}>{statuses[item.status]||item.status}</span><h4>{item.title}</h4><p>Standard {item.standardCode} · {item.unitName}</p><p>{item.evidenceType} · {item.submittedByName || 'Penyedia belum dinyatakan'}</p><span>Lihat butiran & dokumen <ChevronRight aria-hidden="true"/></span></div></button>)}</div>:<p className="skas-empty-message">{query||type||status?'Tiada evidens sepadan. Cuba kosongkan penapis.':monitor?'Belum ada evidens diperakui dalam pilihan ini.':'Belum ada evidens dalam pilihan ini.'}</p>}</section>
    </>}
  </section>;
}
