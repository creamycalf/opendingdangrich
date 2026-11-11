import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as E from '../app/src/engine.mjs';
import {executeCommand} from '../app/src/commands.mjs';
import {applyEffect} from '../app/src/effects.mjs';
import {itemFixture} from './item-fixture.mjs';
import {itemLifecyclePlan,itemLifecycleFrame,itemLifecycleEventFrame} from '../app/src/item-lifecycle-presentation.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url)));
const map=read('../app/public/assets/maps-v126/4.json'),art=read('../app/public/assets/item-lifecycle/catalog.json');
function expiring(id){
 let g=E.createGame(map,{startDate:'2000-04-03'});g.players[0].inventory=[id];
 g=executeCommand(map,g,{type:'useItem',item:id,...(id==='original-35'?{target:1}:{})}).state;
 const actor=id==='original-35'?1:0;g.turn=actor;g.phase='ready';g.queue=[];g.pending=null;
 const p=g.players[actor];p.effects.find(e=>e.id===id).remaining=1;p.effectTickPending=true;
 return g;
}
test('original clone exit events remove each actual spawned node in reverse stagger order',()=>{
 for(const id of ['original-24','original-32']){
  const before=expiring(id),command={type:'beginTurn'},after=executeCommand(map,before,command).state;
  const snapshot=JSON.stringify({before,after}),[group]=itemLifecyclePlan(map,before,after,command,art);
  assert.equal(JSON.stringify({before,after}),snapshot);
  assert.equal(group.tracks.length,id==='original-24'?3:1);
  assert.equal(group.timing,'before-action');
  assert.deepEqual(group.tracks.map(t=>t.delayFrames),id==='original-24'?[10,5,0]:[0]);
  assert.deepEqual(group.tracks.map(t=>t.point),before.players[0].effects.find(e=>e.id===id).nodes.map(n=>({x:map.cells[n.at].x,y:map.cells[n.at].y})));
  assert.equal(itemLifecycleFrame(group,4,art).ghosts.length,group.tracks.length);
  assert.equal(itemLifecycleFrame(group,5,art).ghosts.length,group.tracks.length-1);
  assert.equal(itemLifecycleFrame(group,group.frames,art).sprites.length,0);
  assert.deepEqual(itemLifecyclePlan(map,after,executeCommand(map,after,command).state,command,art),[]);
 }
});
test('bamboo copter retains flying pose until Tools42 event111, then shows committed ground pose',()=>{
 const before=expiring('original-38'),after=executeCommand(map,before,{type:'beginTurn'}).state,[group]=itemLifecyclePlan(map,before,after,{type:'beginTurn'},art);
 assert.equal(group.tracks[0].animation,42);assert.equal(group.tracks[0].hideAtFrame,2);
 assert.deepEqual(itemLifecycleFrame(group,1,art).replaceActors,[0]);
 assert.deepEqual(itemLifecycleFrame(group,2,art).replaceActors,[]);
 assert.ok(itemLifecycleFrame(group,1,art).ghosts[0].player.effects.some(e=>e.id==='original-38'));
});
test('directional companions preserve delayed idle then their verified exit; candy overlays until111',()=>{
 for(const id of [1,8,23,35])for(let dir=0;dir<4;dir++){
  const before=expiring('original-'+id),actor=id===35?1:0;before.players[actor].direction=dir;
  const after=executeCommand(map,before,{type:'beginTurn'}).state,[group]=itemLifecyclePlan(map,before,after,{type:'beginTurn'},art),t=group.tracks[0];
  assert.equal(t.animation,id===35?181:{1:1,8:92,23:126}[id]+dir);
  assert.equal(itemLifecycleFrame(group,59,art).ghosts.length,1);assert.equal(itemLifecycleFrame(group,59,art).sprites.length,0);
  assert.ok(itemLifecycleFrame(group,60,art).sprites.length>0);
  assert.equal(itemLifecycleFrame(group,60,art).ghosts.length,id===35?1:0);
  if(id===35)assert.equal(itemLifecycleFrame(group,66,art).ghosts.length,0);
 }
});
test('mechanical dwarf waking exits at helper position, while body returns to its own saved tile',()=>{
 let before=E.createGame(map,{startDate:'2000-04-03'}),p=before.players[0];
 applyEffect(p,'original-14');applyEffect(p,'original-4');p.effects.find(e=>e.id==='original-4').remaining=1;
 const body=p.at;p.at=map.starts[1].y*map.width+map.starts[1].x;p.effectTickPending=true;
 const after=executeCommand(map,before,{type:'beginTurn'}).state,[group]=itemLifecyclePlan(map,before,after,{type:'beginTurn'},art);
 assert.equal(group.item,'original-14');assert.equal(group.tracks[0].animation,109+p.direction);
 assert.deepEqual(group.point,{x:map.cells[p.at].x,y:map.cells[p.at].y});assert.equal(after.players[0].at,body);
});
test('no fabricated effects on expiry of bee or tanuki, and every generated frame resolves resources',()=>{
 const before=E.createGame(map,{startDate:'2000-04-03'}),p=before.players[0];
 applyEffect(p,'original-15',1);applyEffect(p,'original-20');for(const e of p.effects)e.remaining=1;p.effectTickPending=true;
 const after=executeCommand(map,before,{type:'beginTurn'}).state;assert.deepEqual(itemLifecyclePlan(map,before,after,{type:'beginTurn'},art),[]);
 for(const a of Object.values(art.animations))for(const n of a.sprites){assert.ok(art.images[n]);assert.ok(fs.existsSync(new URL('../app/public/'+art.images[n].url,import.meta.url)));}
 assert.equal(itemLifecycleEventFrame(art.animations[33],111),5);assert.equal(itemLifecycleEventFrame(art.animations[181],111),6);
});
test('road item daily expiry replaces original object with direction-specific exit',()=>{
 for(const id of ['door','original-6'])for(let direction=0;direction<4;direction++){
  let before=itemFixture(map,id).after;before.turn=3;before.phase='end';before.extraTurn=false;
  const road=before.roadItems[0];road.remaining=1;road.direction=direction;
  // Both supported calendar formats reach a full day after at most four wraps.
  let after,groups;
  for(let n=0;n<4;n++){
   after=executeCommand(map,before,{type:'nextTurn'}).state;groups=itemLifecyclePlan(map,before,after,{type:'nextTurn'},art);
   if(groups.length)break;before=after;before.turn=3;before.phase='end';
  }
  assert.equal(groups.length,1);assert.equal(groups[0].timing,'after-action');
  assert.equal(groups[0].tracks[0].animation,id==='door'?53+(direction>>1):29+direction);
  assert.equal(itemLifecycleFrame(groups[0],0,art).ghosts.length,0);
  assert.ok(itemLifecycleFrame(groups[0],0,art).sprites.length);
 }
});
test('AI command natural expiry precedes its action; a direct replacement is after-action',()=>{
 const before=expiring('original-24');before.players[0].control='ai';
 const ai=executeCommand(map,before,{type:'aiAction'}).state;
 assert.equal(itemLifecyclePlan(map,before,ai,{type:'aiAction'},art)[0].timing,'before-action');
 before.players[0].effects[0].remaining=3;before.players[0].effectTickPending=false;before.players[0].inventory=['original-32'];
 const command={type:'useItem',item:'original-32'},after=executeCommand(map,before,command).state;
 assert.equal(itemLifecyclePlan(map,before,after,command,art)[0].timing,'after-action');
});
test('first sleep with an existing dwarf plays121+direction while retaining the sleeping body; repeat and reload do not replay',()=>{
 for(let direction=0;direction<4;direction++){
  const before=E.createGame(map,{startDate:'2000-04-03'});before.players[1].direction=direction;applyEffect(before.players[1],'original-14',1,false);before.players[0].inventory=['original-4'];
  const command={type:'useItem',item:'original-4',target:1},after=executeCommand(map,before,command).state,unchanged=JSON.stringify({before,after});
  const [group]=itemLifecyclePlan(map,before,after,command,art);assert.equal(JSON.stringify({before,after}),unchanged);
  assert.equal(group.reason,'activated');assert.equal(group.timing,'after-action');assert.equal(group.frames,60);assert.equal(group.tracks[0].animation,121+direction);
  const p=before.players[1],cell=map.cells[p.at],[dx,dy]=[[0,1],[0,-1],[1,0],[-1,0]][direction];assert.deepEqual(group.point,{x:cell.x+dx,y:cell.y+dy});
  for(const frame of [0,55,59]){const shown=itemLifecycleFrame(group,frame,art);assert.deepEqual(shown.replaceActors,[1]);assert.deepEqual(shown.ghosts[0].point,{x:cell.x,y:cell.y});assert.equal(shown.ghosts[0].player.itemSleeping,true);assert.ok(!shown.ghosts[0].player.effects.some(e=>e.id==='original-14'));assert.ok(shown.sprites.length);}
  assert.deepEqual(itemLifecycleFrame(group,60,art),{sprites:[],ghosts:[],replaceActors:[]});
  const again=structuredClone(after);applyEffect(again.players[1],'air',2,false);assert.deepEqual(itemLifecyclePlan(map,after,again,{type:'useItem',item:'air',target:1},art),[]);
  assert.deepEqual(itemLifecyclePlan(map,after,E.restore(map,JSON.stringify(after)),{type:'beginTurn'},art),[]);
 }
});
