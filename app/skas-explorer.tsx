"use client";

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronRight, ExternalLink, FileText, FolderOpen, Search, ShieldCheck } from 'lucide-react';
import { skasStandards, skasEvidenceTypes } from './skas-catalog';
import { evidenceLink, evidenceScope, evidenceUnits, filterEvidence, type EvidenceRecord } from './skas-evidence-model';

const statuses: Record<string,string> = {approved:'Diperakui', pending:'Menunggu semakan', needs_info:'Perlu tindakan', rejected:'Ditolak'};
const dateLabel = (value: string) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleDateString('ms-MY', {day:'numeric', month:'long', year:'numeric'}) : 'Belum direkodkan';

export function SkasExplorer({records, year, loading, error, retry, manage, monitor, setMonitor}: {
  records: EvidenceRecord[]; year: number; loading: boolean; error: string; retry: () => void; manage: () => void;
  monitor: boolean; setMonitor: (value: boolean) => void;
}) {
  const [standard, setStandard] = useState('');
  const [unit, setUnit] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState('');
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

  useEffect(() => { if(firstRender.current){firstRender.current=false;return;} heading.current?.focus({preventScroll:true}); heading.current?.scrollIntoView({block:'start',behavior:'instant'}); }, [standard, unit, selected, monitor]);
  function resetFilters() { setUnit(''); setType(''); setStatus(''); setQuery(''); setSelected(''); }
  function openStandard(code: string) { setStandard(code); resetFilters(); }
  function switchMode() { setMonitor(!monitor); setStandard(''); resetFilters(); }
  function back() { if(selected) setSelected(''); else if(unit) {setUnit('');setType('');} else openStandard(''); }
  const summary = (value: string) => scoped.filter(item=>item.status===value).length;

  return <section className={`skas-explorer${monitor?' is-monitor':''}`} aria-label="Pelayar evidens mengikut standard">
    <div className="skas-view-controls"><button onClick={switchMode} aria-pressed={monitor}><ShieldCheck aria-hidden="true"/>{monitor?'Kembali ke paparan pentadbir':'Paparan pemantau'}</button>{!monitor&&<button onClick={manage}>Urus evidens & pemetaan</button>}</div>
    {monitor&&<p className="skas-monitor-note"><ShieldCheck aria-hidden="true"/>Paparan pemantau · Evidens diperakui sahaja · Tiada kawalan sunting atau padam</p>}
    <nav className="skas-breadcrumb" aria-label="Kedudukan evidens"><button onClick={()=>openStandard('')}>Semua standard</button>{standard&&<><ChevronRight aria-hidden="true"/><button onClick={()=>{resetFilters();}}>Standard {standard}</button></>}{unit&&<><ChevronRight aria-hidden="true"/><button onClick={()=>setSelected('')}>{selectedUnit?.name || 'Unit'}</button></>}{detail&&<><ChevronRight aria-hidden="true"/><span>Butiran evidens</span></>}</nav>
    <header className="skas-explorer-heading">{(standard||selected||unit)&&<button onClick={back}><ArrowLeft aria-hidden="true"/>Kembali</button>}<h3 ref={heading} tabIndex={-1}>{detail?detail.title:standard?`Standard ${standard} — ${label || 'Evidens sekolah'}`:`Evidens sekolah ${year}`}</h3><p>{detail?'Semak maklumat dan buka dokumen sumber.':standard?'Pilih pecahan unit atau jenis dokumen untuk melihat kandungannya.':'Tekan standard untuk melihat pecahan dan evidens yang telah dipetakan.'}</p></header>
    {loading?<div className="skas-load-state" role="status"><i className="skas-spinner"/>Sedang membaca evidens {year}…</div>:error?<div className="skas-load-state error" role="alert"><strong>{error}</strong><span>Data belum dapat disahkan. Ini tidak bermakna rekod telah dipadam.</span><button onClick={retry}>Cuba semula</button></div>:detail?<article className="skas-document-detail">
      <span className={`skas-status-label ${detail.status}`}>{statuses[detail.status] || detail.status}</span>
      <dl>{[['Standard',detail.standardCode],['Bidang',detail.domain],['Unit / subunit',detail.unitName],['Jenis evidens',detail.evidenceType],['Tahun',String(detail.schoolYear)],['Sumber',detail.sourceModule || (detail.sourceType==='upload'?'Muat naik manual':'Pautan manual')],['Dikemukakan oleh',detail.submittedByName],['Tarikh direkodkan',dateLabel(detail.createdAt)],['Disemak oleh',detail.verifiedByName || 'Belum disemak'],['Tarikh semakan',dateLabel(detail.verifiedAt)]].map(([name,value])=><div key={name}><dt>{name}</dt><dd>{value || 'Belum dinyatakan'}</dd></div>)}</dl>
      {detail.notes&&<div className="skas-detail-notes"><h4>Catatan</h4><p>{detail.notes}</p></div>}
      {evidenceLink(detail)?<div className="skas-source-open"><a href={evidenceLink(detail)} target="_blank" rel="noopener noreferrer"><ExternalLink aria-hidden="true"/>Buka dokumen asal <span>(tab baharu)</span></a><p>Dokumen dibuka pada sumber asal. Pautan Google Drive tertakluk kepada kebenaran pemilik fail.</p></div>:<p role="alert">Pautan dokumen belum tersedia. Hubungi pentadbir untuk melengkapkan sumber evidens.</p>}
    </article>:<>
      {!standard&&<>
        <div className="skas-summary-buttons">{(monitor?['approved']:['approved','pending','needs_info']).map(value=><button key={value} onClick={()=>{setStatus(value);heading.current?.parentElement?.parentElement?.querySelector('#skas-records')?.scrollIntoView({block:'start'});}}><span>{statuses[value]}</span><strong>{summary(value)}</strong><small>Lihat pecahan evidens <ChevronRight aria-hidden="true"/></small></button>)}</div>
        <div className="skas-standard-cards">{skasStandards.map(([code,name])=>{const entries=filterEvidence(scoped,{standard:code}),approved=entries.filter(item=>item.status==='approved').length;return <button key={code} onClick={()=>openStandard(code)} aria-label={`Buka Standard ${code}: ${name}, ${entries.length} evidens`}><span className="skas-standard-number">{code}</span><div><h4>{name}</h4><p>{entries.length?`${entries.length} evidens${monitor?'':` · ${approved} diperakui`}`:monitor?'Belum ada evidens diperakui':'Belum ada evidens dipetakan'}</p><span>Lihat pecahan <ChevronRight aria-hidden="true"/></span></div></button>;})}</div>
        <p className="skas-coverage-note">Bilangan ini ialah rekod evidens, bukan skor atau pengesahan bahawa sesuatu standard telah lengkap.</p>
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
