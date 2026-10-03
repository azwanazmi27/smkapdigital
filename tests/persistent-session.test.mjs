import {test} from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync('app/server-auth.ts','utf8').replace('import { env } from "cloudflare:workers";','');
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
function setup(){let present=true;const queries=[];const actor={id:'u',status:'active'};const context={exports:{},crypto,TextEncoder,btoa,Date,fetch,env:{DB:{batch:async()=>[],prepare(sql){queries.push(sql);return {bind(){return this;},first:async()=>present?actor:null,run:async()=>{if(sql.startsWith('DELETE'))present=false;}};}}}};vm.runInNewContext(compiled,context);return {...context.exports,queries};}
test('persistent cookie keeps secure HttpOnly flags and can renew',()=>{const a=setup();const cookie=a.sessionCookie('abc');assert.match(cookie,/Max-Age=34560000/);assert.match(cookie,/HttpOnly; Secure; SameSite=Lax/);assert.equal(a.renewSessionCookie(new Request('https://portal.test',{headers:{cookie:'smkap_session=abc'}})),cookie);});
test('server session has no time cutoff and explicit logout revokes it',async()=>{const a=setup(),request=new Request('https://portal.test',{headers:{cookie:'smkap_session=abc'}});assert.equal((await a.portalActor(request)).id,'u');const query=a.queries.find(q=>q.startsWith('SELECT'));assert.ok(!query.includes('s.expires_at>'));assert.ok(query.includes("u.status='active'"));assert.ok(query.includes('u.deleted_at IS NULL'));await a.deletePortalSession(request);assert.equal(await a.portalActor(request),null);assert.match(a.clearSessionCookie(),/Max-Age=0/);});
