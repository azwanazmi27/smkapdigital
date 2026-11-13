import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {blockConflict,bookingWindowOnDate,bookingInUse} from '../app/booking-block-model.ts';
const code=readFileSync('integrations/production-bridge.gs','utf8');
const ctx=vm.createContext({});vm.runInContext(code,ctx);
const booking=(extra={})=>({startDate:'2026-12-01',endDate:'2026-12-10',startTime:'08:00',endTime:'10:00',usageMode:'daily',...extra});
const slot=(startTime,endTime,date='2026-12-02')=>booking({startDate:date,endDate:date,startTime,endTime});
test('daily bookings free the afternoon, reject overlap, allow touching boundaries',()=>{
 const overlap=ctx.bookingIntervalsOverlap_,a=booking();
 for(const [b,want] of [[slot('15:00','17:00'),false],[slot('09:00','11:00'),true],[slot('10:00','12:00'),false],[slot('07:00','08:00'),false],[slot('08:00','10:00','2026-12-10'),true],[slot('08:00','10:00','2026-12-11'),false],[booking({startTime:'10:00',endTime:'12:00'}),false]]){
  assert.equal(overlap(a,b),want);assert.equal(overlap(b,a),want);
 }
});
test('continuous and legacy records keep nights blocked, including a shared interior day',()=>{
 for(const usageMode of ['continuous',undefined]){
  const a=booking({usageMode});assert.equal(ctx.bookingIntervalsOverlap_(a,slot('15:00','17:00')),true);
  assert.equal(ctx.bookingIntervalsOverlap_(a,slot('10:00','12:00','2026-12-10')),false);
 }
 const a=booking({usageMode:'continuous',startTime:'23:00',endTime:'01:00'});
 assert.equal(ctx.bookingIntervalsOverlap_(a,booking()),true);
});
test('bounded overlap algorithm agrees with day-by-day oracle across mixed modes',()=>{
 const rows=[];for(const mode of ['daily','continuous',undefined])for(let first=1;first<=4;first++)for(let last=first;last<=5;last++)for(const [startTime,endTime] of [['08:00','10:00'],['10:00','12:00'],['15:00','17:00']])rows.push(booking({usageMode:mode,startDate:`2026-12-0${first}`,endDate:`2026-12-0${last}`,startTime,endTime}));
 for(const a of rows)for(const b of rows){let expected=false;for(let day=1;day<=5;day++){const date=`2026-12-0${day}`,x=bookingWindowOnDate(a,date),y=bookingWindowOnDate(b,date);if(x&&y&&x.startTime<y.endTime&&x.endTime>y.startTime)expected=true;}assert.equal(ctx.bookingIntervalsOverlap_(a,b),expected);}
});
test('weekly admin blocks apply only to the daily occupied time',()=>{
 const block={weekday:3,effectiveFrom:'2026-12-01',startTime:'15:00',endTime:'16:00',reason:'ASK'};
 assert.equal(blockConflict(block,booking()),null);
 assert.equal(blockConflict({...block,startTime:'09:00',endTime:'10:00'},booking()).date,'2026-12-02');
 assert.equal(blockConflict(block,booking({usageMode:'continuous'})).date,'2026-12-02');
 assert.equal(blockConflict({...block,effectiveFrom:'2027-01-01'},booking()),null);
});
test('room display is not in use between daily slots and uses Malaysia time',()=>{
 assert.equal(bookingInUse(booking(),Date.parse('2026-12-02T09:00:00+08:00')),true);
 assert.equal(bookingInUse(booking(),Date.parse('2026-12-02T10:00:00+08:00')),false);
 assert.equal(bookingInUse(booking(),Date.parse('2026-12-02T15:00:00+08:00')),false);
 assert.equal(bookingInUse(booking({usageMode:'continuous'}),Date.parse('2026-12-02T15:00:00+08:00')),true);
});
function bridgeFixture(){
 const rows=[['ID','Bilik','Nama','Email','Mula','Masa','Tamat','Masa','Tujuan','Peserta','Status','Dicipta','Cara']];let locked=false,mails=0;
 const sheet={getDataRange:()=>({getDisplayValues:()=>rows}),getLastRow:()=>rows.length,appendRow:r=>{assert.ok(locked);rows.push(r)},getRange:(r,c)=>({getDisplayValues:()=>rows.slice(r-1).map(x=>[x[c-1]]),setValue:value=>{rows[r-1][c-1]=value}})};
 const c=vm.createContext({LockService:{getScriptLock:()=>({waitLock:()=>{assert.equal(locked,false);locked=true},releaseLock:()=>locked=false})},SpreadsheetApp:{openById:()=>({getSheetByName:()=>sheet}),flush:()=>{}},Utilities:{formatDate:()=> '2026-11-13',getUuid:()=>String(rows.length).padStart(6,'0')},MailApp:{sendEmail:()=>mails++}});vm.runInContext(code,c);vm.runInContext('json_=function(value){return value}',c);
 return {c,rows,get mails(){return mails},get locked(){return locked},create:(extra={})=>c.createEtempahan_({...booking(),room:'Makmal',applicantName:'Guru Ujian',email:'test@example.invalid',participants:1,purpose:'PdPC',...extra})};
}
test('actual bridge creates one row, retains mode when read, rejects conflicting writes, and cancellation frees slot',()=>{
 const f=bridgeFixture();const first=f.create();assert.equal(first.ok,true);assert.equal(f.rows.length,2);assert.equal(f.rows[1][12],'daily');
 assert.equal(f.c.listEtempahan_({date:'2026-12-02'}).bookings[0].usageMode,'daily');
 assert.equal(f.create(slot('15:00','17:00')).ok,true);assert.equal(f.create(slot('09:00','11:00')).ok,false);assert.equal(f.rows.length,3);assert.equal(f.mails,2);assert.equal(f.locked,false);
 assert.equal(f.create(slot('10:00','12:00')).ok,true);
 f.c.deleteEtempahan_({id:first.id});assert.equal(f.create(slot('09:00','10:00')).ok,true);
});
test('bridge excludes different rooms and validates daily reversed times without writes',()=>{
 const f=bridgeFixture();f.create();assert.equal(f.create({room:'Bilik lain'}).ok,true);
 const count=f.rows.length;assert.equal(f.create({startTime:'16:00',endTime:'08:00'}).ok,false);assert.equal(f.rows.length,count);
});
