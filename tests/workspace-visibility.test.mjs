import {test} from 'node:test';
import assert from 'node:assert/strict';
import {showRoomWorkspace} from '../app/workspace-visibility.ts';
const empty={loaded:true,error:'',supervised:false,isCoordinator:false,activeCount:0};
test('hide rooms only after confirmed empty results; keep loading, errors, bookings and assigned coordinators visible',()=>{
 assert.equal(showRoomWorkspace(empty),false);
 assert.equal(showRoomWorkspace({...empty,supervised:true}),false);
 assert.equal(showRoomWorkspace({...empty,loaded:false}),true);
 assert.equal(showRoomWorkspace({...empty,loaded:false,supervised:true}),true);
 assert.equal(showRoomWorkspace({...empty,error:'Offline'}),true);
 assert.equal(showRoomWorkspace({...empty,error:'Offline',supervised:true}),true);
 assert.equal(showRoomWorkspace({...empty,activeCount:1}),true);
 assert.equal(showRoomWorkspace({...empty,supervised:true,isCoordinator:true}),true);
});
test('empty workspace reappears on booking or coordinator assignment and hides after the last booking expires',()=>{
 assert.equal(showRoomWorkspace(empty),false);
 assert.equal(showRoomWorkspace({...empty,activeCount:1}),true);
 assert.equal(showRoomWorkspace({...empty,activeCount:0}),false);
 assert.equal(showRoomWorkspace({...empty,supervised:true,isCoordinator:true}),true);
});
