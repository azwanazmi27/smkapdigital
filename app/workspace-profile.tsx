'use client';
import {useEffect,useState} from 'react';
export type WorkspaceUser={id:string;name:string;position:string;grade:string;avatarDataUrl?:string};
type Portfolio={id:string;title:string;featured:number};
export function WorkspaceProfile({user}:{user:WorkspaceUser}){
 const [items,setItems]=useState<Portfolio[]>([]),[error,setError]=useState(false),[photoFailed,setPhotoFailed]=useState(false);
 useEffect(()=>setPhotoFailed(false),[user.avatarDataUrl]);
 useEffect(()=>{
  let live=true,sequence=0;
  const load=async()=>{const request=++sequence;try{const response=await fetch('/api/portfolio',{cache:'no-store'}),data=await response.json();if(!response.ok||!Array.isArray(data.items))throw Error();if(live&&request===sequence){setItems(data.items);setError(false);}}catch{if(live&&request===sequence)setError(true);}};
  const refresh=()=>{if(!document.hidden)void load();};
  void load();window.addEventListener('focus',refresh);window.addEventListener('portfolio-changed',refresh);document.addEventListener('visibilitychange',refresh);
  return()=>{live=false;sequence++;window.removeEventListener('focus',refresh);window.removeEventListener('portfolio-changed',refresh);document.removeEventListener('visibilitychange',refresh);};
 },[user.id]);
 const featured=items.filter(item=>item.featured),portfolio=(featured.length?featured:items).slice(0,2);
 const teacher=/guru|pengetua|penolong kanan/i.test(user.position),initials=user.name.trim().split(/\s+/).slice(0,2).map(word=>word[0]).join('');
 return <header className="personal-welcome" aria-label={`Ruang kerja ${user.name}`}>
  <div className="compact-profile-copy"><span className="personal-greeting" lang="ar" dir="rtl">السَّلاَمُ عَلَيْكُمْ وَرَحْمَةُ اللهِ وَبَرَكَاتُهُ</span>
   <h2 className="personal-name">{teacher&&'Cikgu '}<span>{user.name}</span></h2>
   {(user.position||user.grade)&&<div className="profile-role">{user.position&&<span>{user.position}</span>}{user.grade&&<span className="profile-grade">{user.grade}</span>}</div>}
   {!!portfolio.length&&<div className="portfolio-compact" aria-label="Portfolio">{portfolio.map(item=><span key={item.id}>{item.title}</span>)}{items.length>portfolio.length&&<small>+{items.length-portfolio.length} portfolio</small>}</div>}
   {error&&<p className="profile-portfolio-error" role="status">Portfolio belum dapat dimuatkan. <button type="button" onClick={()=>window.dispatchEvent(new Event('portfolio-changed'))}>Cuba semula</button></p>}
  </div>
  <div className="personal-avatar" aria-hidden="true">{user.avatarDataUrl&&!photoFailed?<img src={user.avatarDataUrl} alt="" onError={()=>setPhotoFailed(true)}/>:<span>{initials}</span>}</div>
 </header>;
}
