import test from 'node:test';
import assert from 'node:assert/strict';
import {reminderNameCache} from '../app/reminder-name-cache.ts';
import {teachingDay,documentNameKey} from '../app/staff-work-model.ts';
test('cached matching preserves confirmed names, ambiguity and timetable ownership',()=>{
 const users=[{id:'a',name:'Noor Azwan bin Azmi'},{id:'b',name:'Ali bin Ahmad'},{id:'c',name:'Ali bin Ahmad'}];
 const teachers=[{name:'Noor Azwan Azmi',schedule:{Isnin:[{start:1,end:2,subject:'SEJ',className:'6 A'}]}},{name:'Ali Ahmad',schedule:{Isnin:[]}}];
 const now=new Date('2026-10-05T07:25:00+08:00'),cache=reminderNameCache(teachers.map(t=>t.name),users,{});
 assert.equal(cache[documentNameKey('Ali Ahmad')],'__unmatched__');
 for(const user of users)assert.deepEqual(teachingDay(teachers,user,users,now,cache),teachingDay(teachers,user,users,now,{}));
 const override=reminderNameCache(['Noor Azwan Azmi'],users,{[documentNameKey('Noor Azwan Azmi')]:'b'});assert.equal(override[documentNameKey('Noor Azwan Azmi')],'b');
});
