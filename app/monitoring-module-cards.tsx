'use client';
import {Search,ShieldCheck,ArrowUpRight} from 'lucide-react';
export function MonitoringModuleCards({onSelect}:{onSelect:(module:'legacy'|'reform')=>void}){
 return <div className="reform-module-grid glass-module-grid">{[
 {id:'legacy' as const,Icon:Search,number:'01',label:'PEMERHATIAN & DOKUMENTASI',title:'e-Pemantauan',description:'Rekod pemerhatian di lokasi, lampirkan gambar dan hasilkan OPR.',tags:'Pemerhatian · Gambar · OPR'},
 {id:'reform' as const,Icon:ShieldCheck,number:'02',label:'PEMANTAUAN PENGURUSAN',title:'Immediate Reform',description:'Semak keselamatan, kebersihan, guru bertugas dan pengurusan asrama.',tags:'14 aspek · 4 bahagian'},
 ].map(({id,Icon,number,label,title,description,tags})=><button type="button" key={id} className={`glass-module-card glass-module-${id}`} onClick={()=>onSelect(id)}><div className="glass-module-top"><span className="glass-module-icon"><Icon aria-hidden="true"/></span><span className="glass-module-number">{number}</span></div><span className="glass-module-eyebrow">{label}</span><strong>{title}</strong><span className="glass-module-description">{description}</span><span className="glass-module-tags">{tags}</span><span className="glass-module-footer"><span>Buka dashboard</span><ArrowUpRight aria-hidden="true"/></span></button>)}</div>;
}
