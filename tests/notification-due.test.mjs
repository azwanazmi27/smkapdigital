import test from 'node:test';
import assert from 'node:assert/strict';
import {notificationJobsDue} from '../app/notification-due-model.ts';
import {defaultNotificationSettings as settings} from '../app/notification-settings-model.ts';
const main=[{day:'Khamis',startTime:'07:40'}],sixth=[{day:'Khamis',startTime:'10:40'}];
const at=t=>new Date(`2026-10-08T${t}+08:00`);
test('idle minutes skip directory processing without losing reminder recovery windows',()=>{
 assert.deepEqual(notificationJobsDue(at('07:24:59'),settings,main,sixth),{class:false,relief:false,morning:false});
 assert.deepEqual(notificationJobsDue(at('07:25:00'),settings,main,sixth),{class:false,relief:false,morning:true});
 for(const time of ['07:30:00','07:31:00','07:32:59'])assert.deepEqual(notificationJobsDue(at(time),settings,main,sixth),{class:true,relief:true,morning:true});
 assert.deepEqual(notificationJobsDue(at('07:33:00'),settings,main,sixth),{class:false,relief:false,morning:true});
 assert.deepEqual(notificationJobsDue(at('10:30:00'),settings,main,sixth),{class:true,relief:false,morning:false});
 assert.deepEqual(notificationJobsDue(at('10:33:00'),settings,main,sixth),{class:false,relief:false,morning:false});
});
test('admin changes to lead time, clock and enabled switches are respected',()=>{
 assert.equal(notificationJobsDue(at('07:35:00'),{...settings,leadMinutes:5},main,[]).class,true);
 assert.equal(notificationJobsDue(at('10:30:00'),{...settings,classEnabled:false},main,sixth).class,false);
 assert.equal(notificationJobsDue(at('10:30:00'),settings,[],[{day:'Jumaat',startTime:'10:40'}]).class,false);
 assert.equal(notificationJobsDue(at('08:00:00'),{...settings,morningTime:'08:00'},[],[]).morning,true);
});
