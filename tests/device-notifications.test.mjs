import test from 'node:test';
import assert from 'node:assert/strict';
import {activateDevicePush, inspectDevicePush, reminderDue, reminderKey} from '../app/services/device-notifications.ts';

function device(permission='default', subscription=null) {
  const calls=[];
  const registration={pushManager:{getSubscription:async()=>subscription,subscribe:async()=>{calls.push('subscribe');return {toJSON:()=>({endpoint:'https://push.test/new',keys:{auth:'a',p256dh:'b'}})};}}};
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{serviceWorker:{getRegistration:async()=>registration,register:async()=>{calls.push('register')},ready:Promise.resolve(registration)}}});
  globalThis.window={PushManager:class {},Notification:class {}};
  globalThis.Notification={permission,requestPermission:async()=>{calls.push('permission');return permission;}};
  globalThis.fetch=async(url,options)=>{calls.push(options?.body?JSON.parse(options.body):url);return {ok:true,json:async()=>({publicKey:'AQID',registered:true})};};
  return calls;
}
test('default permission needs reminder and never prompts during inspection',async()=>{
 const calls=device();assert.equal(await inspectDevicePush(),'idle');assert.deepEqual(calls,[]);
});
test('granted browser permission without subscription still needs activation',async()=>{
 device('granted');assert.equal(await inspectDevicePush(),'idle');
});
test('registered current device is enabled without resubscribing or prompting',async()=>{
 const calls=device('granted',{endpoint:'https://push.test/one',toJSON:()=>({endpoint:'https://push.test/one'})});
 assert.equal(await inspectDevicePush(),'enabled');assert.deepEqual(calls,[{action:'status',endpoint:'https://push.test/one'}]);
});
test('existing subscription missing on server is repaired before enabled',async()=>{
 const calls=device('granted',{endpoint:'https://push.test/one',toJSON:()=>({endpoint:'https://push.test/one'})});
 globalThis.fetch=async(_,options)=>{const body=JSON.parse(options.body);calls.push(body.action);return {ok:true,json:async()=>({registered:false})}};
 assert.equal(await inspectDevicePush(),'enabled');assert.deepEqual(calls,['status','subscribe']);
});
test('failed registration never claims enabled',async()=>{
 device('granted',{endpoint:'https://push.test/one',toJSON:()=>({endpoint:'https://push.test/one'})});
 globalThis.fetch=async()=>({ok:false});await assert.rejects(inspectDevicePush);
});
test('denied and unsupported devices do not call permission API',async()=>{
 const calls=device('denied');assert.equal(await inspectDevicePush(),'blocked');assert.equal(await activateDevicePush(),'blocked');assert.deepEqual(calls,[]);
 globalThis.window={};assert.equal(await inspectDevicePush(),'unsupported');
});
test('activation registers subscription only after explicit permission',async()=>{
 const calls=device('granted');assert.equal(await activateDevicePush(),'enabled');
 assert.equal(calls[0],'permission');assert.equal(calls.at(-1).action,'subscribe');
});
test('dismissed permission stays eligible instead of falsely showing denied',async()=>{
 const calls=device('default');assert.equal(await activateDevicePush(),'idle');assert.deepEqual(calls,['permission']);
});
test('reminder cooldown lasts 24h and is scoped by user on current browser',()=>{
 const now=1700000000000;assert.equal(reminderDue(null,now),true);assert.equal(reminderDue('bad',now),true);
 assert.equal(reminderDue(String(now+86400000),now+86399999),false);
 assert.equal(reminderDue(String(now+86400000),now+86400000),true);
 assert.notEqual(reminderKey('a'),reminderKey('b'));
});
