import {test} from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const html=readFileSync('app/api/dashboard-spm/dashboard-spm.html','utf8');
const source=readFileSync('app/api/dashboard-spm/route.ts','utf8').replace('import { env } from "cloudflare:workers";','').replace('import { portalActor } from "../../server-auth";','').replace('import { aksesWarga } from "../../dashboard-spm-store";','').replace('import html from "./dashboard-spm.html?raw";','');
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
function route(actor,tahap='view'){const context={exports:{},crypto,TextEncoder,btoa,Response,Request,html,env:{DB:{}},portalActor:async()=>actor,aksesWarga:async()=>({tahap,urus:false})};vm.runInNewContext(compiled,context);return context.exports.GET;}
const staff={id:'u1',email:'guru@moe-dl.edu.my',name:'Guru Ujian',position:'Guru',grade:'DG44',role:'teacher',status:'active'};
const url='https://portal.test/api/dashboard-spm';
test('Dashboard SPM is served only to signed-in staff with access and only inside the portal',async()=>{
 const anon=await route(null)(new Request(url));
 assert.equal(anon.status,401);assert.equal(anon.headers.get('cache-control'),'no-store');
 const text=await anon.text();assert.match(text,/log masuk/i);assert.doesNotMatch(text,/PORTAL_MODE|PRESET/);
 const tiada=await route(staff,'none')(new Request(url));
 assert.equal(tiada.status,403);const t2=await tiada.text();assert.match(t2,/Tiada akses/);assert.doesNotMatch(t2,/PORTAL_MODE|PRESET/);
 const ok=await route(staff)(new Request(url));
 assert.equal(ok.status,200);assert.match(ok.headers.get('content-type'),/^text\/html/);
 assert.equal(ok.headers.get('x-frame-options'),'SAMEORIGIN');assert.match(ok.headers.get('content-security-policy'),/frame-ancestors 'self'/);
 assert.match(ok.headers.get('cache-control'),/private/);assert.equal(await ok.text(),html);
});
test('unchanged Dashboard SPM revalidates without resending the file, including weak ETags after compression',async()=>{
 const get=route(staff),first=await get(new Request(url)),tag=first.headers.get('etag');assert.match(tag,/^"dspm-[A-Za-z0-9]+"$/);
 for(const header of [tag,`W/${tag}`,`"lain", ${tag}`]){const again=await get(new Request(url,{headers:{'if-none-match':header}}));assert.equal(again.status,304);assert.equal(await again.text(),'');}
 assert.equal((await get(new Request(url,{headers:{'if-none-match':'"dspm-lama"'}}))).status,200);
 assert.equal((await route(null)(new Request(url,{headers:{'if-none-match':tag}}))).status,401);
});
test('bundled file is the SMK Agama Pahang portal edition, not the demo or a shared copy',()=>{
 assert.match(html,/<script>window\.PORTAL_MODE=true;<\/script>/);
 const preset=JSON.parse(html.match(/<script>window\.PRESET=(\{.*?\});<\/script>/)[1]);
 assert.equal(preset.sekolah,'SMK AGAMA PAHANG');assert.match(preset.logo,/^data:image\/png;base64,/);assert.match(preset.kod,/^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
 assert.doesNotMatch(html,/window\.DEMO_MODE=true/);assert.doesNotMatch(html,/<script id="snapshot">/);
});
test('Arus Perdana opens Dashboard SPM and every module list knows it',()=>{
 const landing=readFileSync('app/landing.tsx','utf8'),home=readFileSync('app/campus-home.tsx','utf8'),quick=readFileSync('app/api/quick-access/route.ts','utf8');
 assert.match(landing,/title: "Arus Perdana", text: "[^"]+", folder: "arusperdana"/);
 assert.match(landing,/title: "Dashboard SPM", text: "[^"]+", folder: "dashboardspm"/);
 assert.match(landing,/portalHistoryFolders = new Set[^;]*"arusperdana", "dashboardspm"/s);
 assert.match(landing,/if \(open === "dashboardspm"\) return returnTo\("arusperdana"\);/);
 assert.match(landing,/if \(open === "arusperdana"\) return returnTo\("assessment"\);/);
 assert.match(landing,/src="\/api\/dashboard-spm"/);
 assert.match(landing.match(/\["etempahan","oprhub",[^\]]*\]\.includes\(open\)/)[0],/"dashboardspm"/);
 assert.match(quick,/'dashboardspm'/);assert.match(home,/id:'dashboardspm'/);
});
test('Super Admin can delegate Dashboard SPM management to an Admin in the Akses Admin tab',()=>{
 const landing=readFileSync('app/landing.tsx','utf8'),admin=readFileSync('app/api/admin-users/route.ts','utf8');
 assert.match(landing.match(/accessModules=\[[^;]*\];/)[0],/\["dashboardspm","Dashboard SPM"\]/);
 assert.match(admin.match(/modules=\[[^\]]*\]/)[0],/"dashboardspm"/);
 assert.match(readFileSync('app/dashboard-spm-store.ts','utf8'),/module_key='dashboardspm' AND enabled=1/);
});
