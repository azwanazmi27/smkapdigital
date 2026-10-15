'use client';
import {useEffect,useState,useRef} from 'react';
import {ShieldCheck,CalendarDays,Clock3} from 'lucide-react';
import {bookingDay} from './booking-model';
import {bookingWeekdays,type BookingBlock} from './booking-block-model';
export function BookingBlockSettings({rooms}:{rooms:{id:string;name:string}[]}){
 const empty=()=>({roomId:'',weekday:1,startTime:'08:00',endTime:'09:00',effectiveFrom:bookingDay(),reason:''});
 const [rows,setRows]=useState<BookingBlock[]>([]),[form,setForm]=useState(empty),[editing,setEditing]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[failed,setFailed]=useState(false),[removing,setRemoving]=useState<BookingBlock|null>(null),dialog=useRef<HTMLDialogElement>(null),formRef=useRef<HTMLFormElement>(null);
 const load=async()=>{try{const response=await fetch('/api/booking-blocks',{cache:'no-store'}),data=await response.json();if(!response.ok)throw Error(data.error);setRows(data.blocks);}catch(e){setFailed(true);setMessage(e instanceof Error?e.message:'Sekatan belum dapat dimuatkan.');}};
 useEffect(()=>{void load();},[rooms]);
 const change=async(method:'POST'|'PUT'|'DELETE',body:object)=>{setBusy(true);setMessage('');setFailed(false);try{
  const response=await fetch('/api/booking-blocks',{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),data=await response.json();if(!response.ok)throw Error(data.error);
  setMessage(method==='DELETE'?'Sekatan dibatalkan. Slot ini boleh ditempah semula jika tiada tempahan lain.':'Sekatan mingguan disimpan dan berulang sehingga diubah atau dibatalkan.');
  if(method!=='DELETE'){setForm(empty());setEditing('');}dialog.current?.close();setRemoving(null);await load();window.dispatchEvent(new Event('booking-rooms-changed'));
 }catch(e){setFailed(true);setMessage(e instanceof Error?e.message:'Perubahan belum dapat disahkan.');dialog.current?.close();}finally{setBusy(false);}};
 return <section className="booking-block-settings" aria-label="Sekatan mingguan bilik"><header><span className="booking-block-icon"><ShieldCheck aria-hidden="true"/></span><div><span className="modal-overline">ADMIN & SUPER ADMIN</span><h3>Sekatan mingguan</h3><p>Khususkan slot tetap untuk kelas ASK atau aktiviti berkala. Semua waktu mengikut Malaysia.</p></div></header>
 <form ref={formRef} className="admin-content-form" onSubmit={e=>{e.preventDefault();void change(editing?'PUT':'POST',{...form,id:editing});}}>
 <h4>{editing?'Ubah sekatan':'Tambah sekatan'}</h4>
 <div className="booking-block-fields"><label>Bilik<select required disabled={!!editing||busy} value={form.roomId} onChange={e=>setForm({...form,roomId:e.target.value})}><option value="">Pilih bilik</option>{rooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label><label>Berulang setiap<select value={form.weekday} disabled={busy} onChange={e=>setForm({...form,weekday:Number(e.target.value)})}>{[1,2,3,4,5,6,0].map(day=><option key={day} value={day}>{bookingWeekdays[day]}</option>)}</select></label></div>
 <div className="booking-block-fields"><label>Masa mula<input type="time" required disabled={busy} value={form.startTime} onChange={e=>setForm({...form,startTime:e.target.value})}/></label><label>Masa tamat<input type="time" required min={form.startTime} disabled={busy} value={form.endTime} onChange={e=>setForm({...form,endTime:e.target.value})}/></label></div>
 <div className="booking-block-fields"><label>Berkuat kuasa mulai<input type="date" required disabled={busy} value={form.effectiveFrom} onChange={e=>setForm({...form,effectiveFrom:e.target.value})}/></label><label>Tujuan sekatan<input required maxLength={200} placeholder="Contoh: Kelas ASK · 2 Amanah" disabled={busy} value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})}/></label></div>
 <p className="booking-block-hint">Berulang setiap minggu tanpa tarikh tamat. Tempahan sedia ada yang bertindih perlu diselesaikan dahulu.</p>
 <div className="booking-block-actions"><button disabled={busy}>{busy?'Menyemak slot…':editing?'Simpan perubahan':'Simpan sekatan mingguan'}</button>{editing&&<button type="button" disabled={busy} onClick={()=>{setEditing('');setForm(empty());}}>Batal suntingan</button>}</div>
 </form>
 {message&&<p className={`booking-block-message ${failed?'failed':''}`} role={failed?'alert':'status'}>{message}{failed&&<button type="button" onClick={()=>void load()}>Segarkan senarai</button>}</p>}
 <div className="booking-block-list">{rows.map(block=><article key={block.id}><div><span className="booking-block-badge"><ShieldCheck/> Disekat setiap minggu</span><h4>{rooms.find(r=>r.id===block.roomId)?.name||'Bilik'}</h4><p>{block.reason}</p><div className="booking-block-slot"><span><CalendarDays/>{bookingWeekdays[block.weekday]}</span><span><Clock3/>{block.startTime}–{block.endTime}</span></div><small>Mulai {block.effectiveFrom.split('-').reverse().join('/')} · sehingga dibatalkan</small></div><div className="booking-block-actions"><button disabled={busy} onClick={()=>{setEditing(block.id);setForm(block);formRef.current?.scrollIntoView({block:'nearest'});}}>Ubah slot</button><button className="danger" disabled={busy} onClick={()=>{setRemoving(block);dialog.current?.showModal();}}>Batalkan sekatan</button></div></article>)}</div>
 {!rows.length&&!message&&<p className="booking-block-hint">Belum ada sekatan mingguan.</p>}
 <dialog ref={dialog} className="booking-result-dialog" aria-labelledby="cancel-block-title"><h3 id="cancel-block-title">Batalkan sekatan mingguan?</h3><p>{removing?.reason}<br/>{removing&&bookingWeekdays[removing.weekday]} · {removing?.startTime}–{removing?.endTime}</p><p>Semua ulangan slot ini akan dibuka semula untuk tempahan.</p><button disabled={busy} onClick={()=>dialog.current?.close()}>Kekalkan</button><button disabled={busy} onClick={()=>removing&&void change('DELETE',{id:removing.id,confirm:true})}>Ya, batalkan sekatan</button></dialog>
 </section>;
}
