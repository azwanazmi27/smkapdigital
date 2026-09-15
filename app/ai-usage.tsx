"use client";
import {useEffect,useState} from 'react';
type Usage={used:number;limit:number|null;remaining:number|null;exempt:boolean};
export function AIUsageNote(){
 const [usage,setUsage]=useState<Usage|null>(null);
 useEffect(()=>{let alive=true;const read=()=>{fetch('/api/ai/usage',{cache:'no-store'}).then(async r=>{if(r.ok){const x=await r.json();if(alive)setUsage(x);}}).catch(()=>{});};read();window.addEventListener('ai-usage-changed',read);return()=>{alive=false;window.removeEventListener('ai-usage-changed',read);};},[]);
 return <small className="ai-usage-note" aria-live="polite">{usage?(usage.exempt?`Akaun pentadbir: tiada had harian · ${usage.used} permintaan hari ini`:`Baki AI hari ini: ${usage.remaining} daripada ${usage.limit} permintaan`):'Baki AI akan dipaparkan selepas semakan akaun.'} · Had harian dikongsi antara fungsi AI selain OPR dan diperbaharui pada 12 tengah malam waktu Malaysia.</small>;
}
