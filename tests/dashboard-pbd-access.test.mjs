import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import * as A from '../app/dashboard-pbd-access.ts';

// D1 tiruan di atas SQLite sebenar.
function d1(){
 const db=new DatabaseSync(':memory:');
 db.exec(`CREATE TABLE portal_users (id TEXT PRIMARY KEY,email TEXT NOT NULL DEFAULT '',name TEXT NOT NULL,position TEXT NOT NULL DEFAULT '',grade TEXT NOT NULL DEFAULT '',role TEXT NOT NULL DEFAULT 'teacher',status TEXT NOT NULL DEFAULT 'active',deleted_at TEXT);
 CREATE TABLE admin_module_permissions (user_id TEXT NOT NULL,module_key TEXT NOT NULL,enabled INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL,PRIMARY KEY(user_id,module_key));`);
 const stmt=(sql,args=[])=>({bind:(...a)=>stmt(sql,a),first:async()=>{const r=db.prepare(sql).get(...args);return r?{...r}:null;},all:async()=>({results:db.prepare(sql).all(...args).map(r=>({...r}))}),run:async()=>db.prepare(sql).run(...args)});
 return {raw:db,prepare:sql=>stmt(sql),batch:async list=>{for(const s of list)await s.run();}};
}
function sekolah(){
 A.setSemula();const db=d1();
 const tambah=(id,name,role='teacher',status='active')=>db.raw.prepare('INSERT INTO portal_users(id,name,role,status) VALUES(?,?,?,?)').run(id,name,role,status);
 tambah('sa','SUPER ADMIN','super_admin');tambah('ad','ADMIN BIASA','admin');tambah('ad2','ADMIN PBD','admin');tambah('adspm','ADMIN SPM','admin');tambah('g1','GURU SATU');tambah('g2','GURU DUA');tambah('gp','GURU DIBERI MODUL');tambah('lama','GURU BERSARA','teacher','inactive');
 db.raw.prepare("INSERT INTO admin_module_permissions VALUES('ad2','dashboardpbd',1,'x')").run();
 db.raw.prepare("INSERT INTO admin_module_permissions VALUES('adspm','dashboardspm',1,'x')").run();
 db.raw.prepare("INSERT INTO admin_module_permissions VALUES('gp','dashboardpbd',1,'x')").run();
 return {db,p:id=>({id,role:db.raw.prepare('SELECT role FROM portal_users WHERE id=?').get(id).role})};
}

test('PBD access: super admin and admins given Dashboard PBD manage; others default to view only',async()=>{
 const {db,p}=sekolah();
 assert.deepEqual(await A.aksesWarga(db,p('sa')),{tahap:'edit',urus:true});
 assert.deepEqual(await A.aksesWarga(db,p('ad2')),{tahap:'edit',urus:true});
 assert.deepEqual(await A.aksesWarga(db,p('ad')),{tahap:'view',urus:false});
 assert.deepEqual(await A.aksesWarga(db,p('adspm')),{tahap:'view',urus:false},'modul Dashboard SPM tidak memberi akses PBD');
 assert.deepEqual(await A.aksesWarga(db,p('gp')),{tahap:'view',urus:false},'seperti SPM: modul hanya berkesan untuk peranan Admin');
 assert.deepEqual(await A.aksesWarga(db,p('g1')),{tahap:'view',urus:false});
});

test('PBD access: per-staff levels, default level, and managers cannot be locked out',async()=>{
 const {db,p}=sekolah();
 assert.equal(await A.tetapAkses(db,p('sa'),'g1','edit'),true);assert.equal(await A.tetapAkses(db,p('sa'),'g2','none'),true);
 assert.equal((await A.aksesWarga(db,p('g1'))).tahap,'edit');assert.equal((await A.aksesWarga(db,p('g2'))).tahap,'none');
 await A.tetapLalai(db,'none');assert.equal((await A.aksesWarga(db,p('ad'))).tahap,'none');assert.equal((await A.aksesWarga(db,p('g1'))).tahap,'edit');
 await A.tetapAkses(db,p('sa'),'g2',null);await A.tetapLalai(db,'view');assert.equal((await A.aksesWarga(db,p('g2'))).tahap,'view');
 await A.tetapAkses(db,p('sa'),'ad2','none');assert.deepEqual(await A.aksesWarga(db,p('ad2')),{tahap:'edit',urus:true});
 assert.equal(await A.tetapAkses(db,p('sa'),'tiada','edit'),false);assert.equal(await A.tetapAkses(db,p('sa'),'lama','edit'),false);
 const s=await A.senaraiAkses(db);assert.equal(s.lalai,'view');assert.equal(s.warga.length,7,'warga tidak aktif tidak disenaraikan');
 assert.deepEqual(s.warga.find(w=>w.id==='g1'),{id:'g1',nama:'GURU SATU',jawatan:'',tahap:'edit',urus:false});
 assert.equal(s.warga.find(w=>w.id==='ad2').urus,true);assert.equal(s.warga.find(w=>w.id==='g2').tahap,null);
});

test('PBD access is separate from Dashboard SPM access',async()=>{
 const {db,p}=sekolah();
 await A.tetapAkses(db,p('sa'),'g1','edit');
 assert.equal(db.raw.prepare("SELECT count(*) n FROM sqlite_master WHERE name='dashboard_spm_access'").get().n,0);
 assert.equal(db.raw.prepare("SELECT level FROM dashboard_pbd_access WHERE user_id='g1'").get().level,'edit');
});

test('PBD page route wires access, SPM palette, in-frame scrolling and the access manager',()=>{
 const route=readFileSync('app/api/dashboard-pbd/route.ts','utf8'),lib=readFileSync('app/lib/dashboard-pbd.ts','utf8'),akses=readFileSync('app/api/dashboard-pbd/akses/route.ts','utf8'),data=readFileSync('app/api/dashboard-pbd/data/route.ts','utf8');
 assert.match(lib,/aksesWarga\(env\.DB, actor\)/);assert.match(lib,/canView: akses\.tahap !== "none"/);
 assert.match(route,/:root\[data-palet="smkap"\]\{--hero-1/);assert.match(route,/html\.terbenam \.side\{position:relative/);
 assert.match(route,/canManage: access\.canManage/);assert.match(route,/\/api\/dashboard-pbd\/akses/);
 assert.match(route,/delete st\.tema;delete st\.gelap;/,'tema peribadi tidak dihantar ke portal');
 assert.match(akses,/Hanya pentadbir Dashboard PBD boleh menetapkan akses/);assert.match(akses,/origin/);
 assert.match(data,/request\.headers\.get\("origin"\)/);
});

test('PBD cannot be zoomed, and the assessment menu floats mid-screen on phones',()=>{
 const route=readFileSync('app/api/dashboard-pbd/route.ts','utf8'),landing=readFileSync('app/landing.tsx','utf8'),css=readFileSync('app/globals.css','utf8');
 assert.match(route,/html,body,\*\{touch-action:pan-x pan-y\}/);assert.match(route,/"gesturestart","gesturechange","gestureend"/);assert.match(route,/maximum-scale=1, user-scalable=no/);
 assert.match(landing,/open === "assessment" \|\| open === "arusperdana" \? "menu-centre-modal"/);
 assert.match(css,/\.folder-backdrop:has\(\.menu-centre-modal\)\{align-items:center/);
});
