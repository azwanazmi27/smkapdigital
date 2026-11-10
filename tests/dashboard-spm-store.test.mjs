import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as S from '../app/dashboard-spm-store.ts';

// D1 tiruan di atas SQLite sebenar, dan R2 tiruan dalam memori.
function d1(){
 const db=new DatabaseSync(':memory:');
 db.exec(`CREATE TABLE portal_users (id TEXT PRIMARY KEY,email TEXT NOT NULL DEFAULT '',name TEXT NOT NULL,position TEXT NOT NULL DEFAULT '',grade TEXT NOT NULL DEFAULT '',role TEXT NOT NULL DEFAULT 'teacher',status TEXT NOT NULL DEFAULT 'active',deleted_at TEXT);
 CREATE TABLE admin_module_permissions (user_id TEXT NOT NULL,module_key TEXT NOT NULL,enabled INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL,PRIMARY KEY(user_id,module_key));`);
 const stmt=(sql,args=[])=>({bind:(...a)=>stmt(sql,a),first:async()=>{const r=db.prepare(sql).get(...args);return r?{...r}:null;},all:async()=>({results:db.prepare(sql).all(...args).map(r=>({...r}))}),run:async()=>{const r=db.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}};}});
 return {raw:db,prepare:sql=>stmt(sql),batch:async list=>{for(const s of list)await s.run();}};
}
function r2(){const m=new Map();return {m,put:async(k,v)=>{m.set(k,String(v));},get:async k=>m.has(k)?{body:new Response(m.get(k)).body,text:async()=>m.get(k)}:null,delete:async k=>{for(const x of [].concat(k))m.delete(x);}};}
function sekolah(){
 S.setSemula();const db=d1(),fail=r2();
 const tambah=(id,name,role='teacher',status='active')=>db.raw.prepare('INSERT INTO portal_users(id,name,role,status) VALUES(?,?,?,?)').run(id,name,role,status);
 tambah('sa','SUPER ADMIN','super_admin');tambah('ad','ADMIN BIASA','admin');tambah('ad2','ADMIN DIBERI','admin');tambah('su','SU PEPERIKSAAN');tambah('g1','GURU SATU');tambah('g2','GURU DUA');tambah('lama','GURU BERSARA','teacher','inactive');
 db.raw.prepare("INSERT INTO admin_module_permissions VALUES('ad2','dashboardspm',1,'x')").run();
 return {db,fail,p:id=>({id,name:db.raw.prepare('SELECT name FROM portal_users WHERE id=?').get(id).name,role:db.raw.prepare('SELECT role FROM portal_users WHERE id=?').get(id).role})};
}
const padat=n=>JSON.stringify({rek:Array.from({length:n},(_,i)=>({id:'r'+i})),settings:{},_v:2});

test('access: super admin and assigned admins manage; staff default to view; levels and default can be changed',async()=>{
 const {db,p}=sekolah();
 assert.deepEqual(await S.aksesWarga(db,p('sa')),{tahap:'edit',urus:true});
 assert.deepEqual(await S.aksesWarga(db,p('ad2')),{tahap:'edit',urus:true});
 assert.deepEqual(await S.aksesWarga(db,p('ad')),{tahap:'view',urus:false});
 assert.deepEqual(await S.aksesWarga(db,p('g1')),{tahap:'view',urus:false});
 assert.equal(await S.tetapAkses(db,p('sa'),'su','edit'),true);assert.equal(await S.tetapAkses(db,p('sa'),'g2','none'),true);
 assert.equal((await S.aksesWarga(db,p('su'))).tahap,'edit');assert.equal((await S.aksesWarga(db,p('g2'))).tahap,'none');
 await S.tetapLalai(db,'none');assert.equal((await S.aksesWarga(db,p('g1'))).tahap,'none');assert.equal((await S.aksesWarga(db,p('su'))).tahap,'edit');
 await S.tetapAkses(db,p('sa'),'g2',null);await S.tetapLalai(db,'view');assert.equal((await S.aksesWarga(db,p('g2'))).tahap,'view');
 await S.tetapAkses(db,p('sa'),'sa','none');assert.deepEqual(await S.aksesWarga(db,p('sa')),{tahap:'edit',urus:true},'pengurus tidak boleh terkunci keluar');
 assert.equal(await S.tetapAkses(db,p('sa'),'tiada','edit'),false);assert.equal(await S.tetapAkses(db,p('sa'),'lama','edit'),false);
 const s=await S.senaraiAkses(db);assert.equal(s.lalai,'view');assert.equal(s.warga.length,6,'warga tidak aktif tidak disenaraikan');
 assert.deepEqual(s.warga.find(w=>w.id==='su'),{id:'su',nama:'SU PEPERIKSAAN',jawatan:'',tahap:'edit',urus:false});
 assert.equal(s.warga.find(w=>w.id==='ad2').urus,true);assert.equal(s.warga.find(w=>w.id==='ad').urus,false);
});
test('access works before the portal has created the admin permission table',async()=>{
 S.setSemula();const db=d1();db.raw.exec('DROP TABLE admin_module_permissions');db.raw.prepare("INSERT INTO portal_users(id,name,role) VALUES('ad','A','admin')").run();
 assert.deepEqual(await S.aksesWarga(db,{id:'ad',name:'A',role:'admin'}),{tahap:'view',urus:false});
 assert.equal((await S.senaraiAkses(db)).warga[0].urus,false);
});
test('shared data: versioned saves, conflicts instead of overwrites, readable by everyone',async()=>{
 const {db,fail,p}=sekolah();
 assert.deepEqual({...(await S.bacaData(db,fail)),body:null},{versi:0,oleh:'',pada:'',body:null,rosak:false});
 const a=await S.simpanData(db,fail,p('su'),padat(3),0);assert.equal(a.versi,1);
 const b=await S.bacaData(db,fail);assert.equal(b.versi,1);assert.equal(b.oleh,'SU PEPERIKSAAN');assert.equal(await new Response(b.body).text(),padat(3));
 const lewat=await S.simpanData(db,fail,p('sa'),padat(1),0);assert.deepEqual(Object.keys(lewat),['konflik']);assert.equal(lewat.konflik.versi,1);assert.equal(lewat.konflik.oleh,'SU PEPERIKSAAN');
 assert.equal(fail.m.size,1,'simpanan yang ditolak tidak meninggalkan fail');
 const [x,y]=await Promise.all([S.simpanData(db,fail,p('su'),padat(4),1),S.simpanData(db,fail,p('sa'),padat(5),1)]);
 assert.equal([x,y].filter(r=>'versi' in r).length,1,'hanya satu simpanan serentak diterima');assert.equal([x,y].filter(r=>'konflik' in r).length,1);
 assert.equal((await S.bacaData(db,fail)).versi,2);assert.equal(fail.m.size,2);
});
test('history keeps the last 30 versions, deletes older files, and restore adds a new version',async()=>{
 const {db,fail,p}=sekolah();
 for(let i=0;i<35;i++)await S.simpanData(db,fail,p('su'),padat(i+1),i);
 const h=await S.sejarahData(db);assert.equal(h.length,30);assert.equal(h[0].versi,35);assert.equal(h.at(-1).versi,6);assert.equal(fail.m.size,30);
 const r=await S.pulihData(db,fail,p('sa'),10);assert.equal(r.versi,36);
 const now=await S.bacaData(db,fail);assert.equal(await new Response(now.body).text(),padat(10));
 assert.equal((await S.sejarahData(db))[0].nota,'Dipulihkan daripada versi 10');
 assert.deepEqual(await S.pulihData(db,fail,p('sa'),2),{tiada:true});
});
test('a missing stored file is reported instead of looking like empty data',async()=>{
 const {db,fail,p}=sekolah();await S.simpanData(db,fail,p('su'),padat(2),0);fail.m.clear();
 assert.equal((await S.bacaData(db,fail)).rosak,true);
});
test('only compact Dashboard SPM data and photo maps are accepted',()=>{
 assert.equal(S.dataSah(padat(1)),true);assert.equal(S.dataSah('{"rek":[],"_v":1}'),false);assert.equal(S.dataSah('[1]'),false);assert.equal(S.dataSah('null'),false);
 assert.equal(S.dataSah('{"rek":[],"_v":2'),false);assert.equal(S.fotoSah('{}'),true);assert.equal(S.fotoSah('[]'),false);
});
test('photos: latest map is kept and the previous file removed',async()=>{
 const {db,fail,p}=sekolah();
 await S.simpanFoto(db,fail,p('su'),'{"AG:1":"data:image/jpeg;base64,AA"}');await S.simpanFoto(db,fail,p('su'),'{"AG:2":"data:image/jpeg;base64,BB"}');
 const f=await S.bacaData(db,fail,'foto');assert.equal(f.versi,2);assert.equal(await new Response(f.body).text(),'{"AG:2":"data:image/jpeg;base64,BB"}');
 assert.equal([...fail.m.keys()].filter(k=>k.startsWith('dashboard-spm/foto/')).length,1);
});

// Laluan HTTP: kod route.ts sebenar dengan import digantikan oleh D1/R2 tiruan.
function laluan(fail,ganti){let src=readFileSync(fail,'utf8');for(const re of [/^import \{ env \}.*$/m,/^import \{ portalActor \}.*$/m,/^import \{[^}]*\} from "\.\.\/\.\.\/\.\.\/dashboard-spm-store";$/m])src=src.replace(re,'');
 const out=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,ctx={exports:{},Response,Request,URL,Number,JSON,encodeURIComponent,...S,...ganti};vm.runInNewContext(out,ctx);return ctx.exports;}
const URLDATA='https://portal.test/api/dashboard-spm/data';
const put=(body,versi,origin='https://portal.test')=>new Request(URLDATA,{method:'PUT',headers:{origin,'x-dspm-versi':String(versi),'content-type':'application/json'},body});
test('data API: login, view-only, edit, conflict, caching and history permissions',async()=>{
 const {db,fail,p}=sekolah();let siapa=null;const env={DB:db,FILES:fail};
 const api=laluan('app/api/dashboard-spm/data/route.ts',{env,portalActor:async()=>siapa?p(siapa):null});
 assert.equal((await api.GET(new Request(URLDATA))).status,401);
 siapa='g1';let r=await api.GET(new Request(URLDATA));assert.equal(r.status,200);assert.equal(await r.text(),'null');assert.equal(r.headers.get('x-dspm-tahap'),'view');assert.equal(r.headers.get('x-dspm-versi'),'0');
 assert.equal((await api.PUT(put(padat(1),0))).status,403,'lihat sahaja tidak boleh simpan');
 await S.tetapAkses(db,p('sa'),'su','edit');siapa='su';
 assert.equal((await api.PUT(put(padat(1),0,'https://lain.test'))).status,403,'asal lain ditolak');
 assert.equal((await api.PUT(put('{"x":1}',0))).status,400);assert.equal((await api.PUT(put(padat(1),-1))).status,400);
 r=await api.PUT(put(padat(2),0));assert.equal(r.status,200);assert.equal((await r.json()).versi,1);
 r=await api.PUT(put(padat(3),0));assert.equal(r.status,409);const k=await r.json();assert.equal(k.konflik,true);assert.equal(k.versi,1);assert.equal(k.oleh,'SU PEPERIKSAAN');
 siapa='g1';r=await api.GET(new Request(URLDATA));assert.equal(await r.text(),padat(2));assert.equal(decodeURIComponent(r.headers.get('x-dspm-oleh')),'SU PEPERIKSAAN');
 const tag=r.headers.get('etag');assert.equal((await api.GET(new Request(URLDATA,{headers:{'if-none-match':`W/${tag}`}}))).status,304);
 await S.tetapAkses(db,p('sa'),'g1','edit');assert.equal((await api.GET(new Request(URLDATA,{headers:{'if-none-match':tag}}))).status,200,'tahap berubah = ETag berubah');
 await S.tetapAkses(db,p('sa'),'g2','none');siapa='g2';assert.equal((await api.GET(new Request(URLDATA))).status,403);
 siapa='su';assert.equal((await api.GET(new Request(URLDATA+'?view=sejarah'))).status,403,'sejarah untuk pengurus sahaja');
 siapa='sa';const h=await (await api.GET(new Request(URLDATA+'?view=sejarah'))).json();assert.equal(h.sejarah.length,1);
 const pulih=b=>new Request(URLDATA,{method:'POST',headers:{origin:'https://portal.test','content-type':'application/json'},body:JSON.stringify(b)});
 assert.equal((await api.POST(pulih({pulih:1}))).status,200);assert.equal((await api.POST(pulih({pulih:99}))).status,404);assert.equal((await api.POST(pulih({pulih:'x'}))).status,400);
 siapa='su';assert.equal((await api.POST(pulih({pulih:1}))).status,403);
});
test('access API is for managers only and validates levels',async()=>{
 const {db,fail,p}=sekolah();let siapa='g1';const api=laluan('app/api/dashboard-spm/akses/route.ts',{env:{DB:db,FILES:fail},portalActor:async()=>siapa?p(siapa):null});
 const req=(b,origin='https://portal.test')=>new Request('https://portal.test/api/dashboard-spm/akses',{method:'PUT',headers:{origin,'content-type':'application/json'},body:JSON.stringify(b)});
 assert.equal((await api.GET(new Request('https://portal.test/api/dashboard-spm/akses'))).status,403);
 assert.equal((await api.PUT(req({userId:'g1',tahap:'edit'}))).status,403,'guru tidak boleh beri diri sendiri akses');
 siapa='ad2';assert.equal((await api.GET(new Request('https://portal.test/api/dashboard-spm/akses'))).status,200);
 assert.equal((await api.PUT(req({userId:'g1',tahap:'edit'},'https://lain.test'))).status,403);
 assert.equal((await api.PUT(req({userId:'g1',tahap:'admin'}))).status,400);assert.equal((await api.PUT(req({lalai:'edit'}))).status,400);assert.equal((await api.PUT(req({userId:'tiada',tahap:'view'}))).status,404);
 const r=await (await api.PUT(req({userId:'g1',tahap:'edit'}))).json();assert.equal(r.warga.find(w=>w.id==='g1').tahap,'edit');
 assert.equal((await (await api.PUT(req({lalai:'none'}))).json()).lalai,'none');
 assert.equal((await (await api.PUT(req({userId:'g1',tahap:null}))).json()).warga.find(w=>w.id==='g1').tahap,null);
});
test('photo API: viewers read, editors save, others refused',async()=>{
 const {db,fail,p}=sekolah();let siapa='g1';const api=laluan('app/api/dashboard-spm/foto/route.ts',{env:{DB:db,FILES:fail},portalActor:async()=>siapa?p(siapa):null});
 const u='https://portal.test/api/dashboard-spm/foto',req=b=>new Request(u,{method:'PUT',headers:{origin:'https://portal.test'},body:b});
 assert.equal(await (await api.GET(new Request(u))).text(),'{}');assert.equal((await api.PUT(req('{"a":"b"}'))).status,403);
 siapa='sa';assert.equal((await api.PUT(req('[]'))).status,400);assert.equal((await api.PUT(req('{"AG:1":"data:image/jpeg;base64,AA"}'))).status,200);
 siapa='g1';const r=await api.GET(new Request(u));assert.equal(await r.text(),'{"AG:1":"data:image/jpeg;base64,AA"}');assert.equal((await api.GET(new Request(u,{headers:{'if-none-match':r.headers.get('etag')}}))).status,304);
 await S.tetapAkses(db,p('sa'),'g1','none');assert.equal((await api.GET(new Request(u))).status,403);
});
