import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultNotificationSettings,validateNotificationSettings} from '../app/notification-settings-model.ts';
import {morningDue} from '../app/daily-notice-model.ts';
import {dueClasses} from '../app/class-reminder-model.ts';
test('custom MYT morning time respects weekday and retry window',()=>{
 assert.equal(morningDue(new Date('2026-10-06T23:24:59Z')),false);
 assert.equal(morningDue(new Date('2026-10-06T23:25:00Z')),true);
 assert.equal(morningDue(new Date('2026-10-07T00:00:00Z'),'08:00'),true);
 assert.equal(morningDue(new Date('2026-10-07T00:20:00Z'),'08:00'),false);
 assert.equal(morningDue(new Date('2026-10-10T00:00:00Z'),'08:00'),false);
});
test('custom settings reject invalid times, text and flags',()=>{
 assert.deepEqual(validateNotificationSettings(defaultNotificationSettings),defaultNotificationSettings);
 for(const patch of [{morningTime:'25:00'},{leadMinutes:0},{leadMinutes:10.5},{morningTitle:''},{classEnabled:'true'}])assert.throws(()=>validateNotificationSettings({...defaultNotificationSettings,...patch}));
});
test('custom class lead time changes due window',()=>{
 const d={date:'2026-10-07',day:'Rabu',state:'ready',lessons:[{start:1,end:2,startTime:'08:00',endTime:'09:00',className:'1 A',subject:'BM'}]};
 assert.equal(dueClasses(d,new Date('2026-10-07T07:45:00+08:00'),15).length,1);
 assert.equal(dueClasses(d,new Date('2026-10-07T07:45:00+08:00'),10).length,0);
});
