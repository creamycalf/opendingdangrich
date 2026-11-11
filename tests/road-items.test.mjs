import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {roadItemPlacement,originalDoorDestination,gameRoadPlacement} from '../app/src/road-items.mjs';
import {createGame,restore,choices,step,nextTurn} from '../app/src/engine.mjs';
import {executeCommand,replayCommands} from '../app/src/commands.mjs';
const maps=Array.from({length:8},(_,i)=>JSON.parse(fs.readFileSync(new URL(`../app/public/assets/maps/${i}.json`,import.meta.url))));
const fixture=JSON.parse(fs.readFileSync(new URL('fixtures/original-road-items.json',import.meta.url)));
test('door/cannon eligibility matches original across eight maps and runtime occupancy',()=>{
  for(const r of fixture.placements){const map=maps[r.map];
    assert.deepEqual([true,false].map(door=>Number(roadItemPlacement(map,r.at,()=>false,()=>false,door).length>0)),r.empty,`map ${r.map} at ${r.at}`);
    for(const expected of r.occupied)assert.deepEqual([true,false].map(door=>Number(roadItemPlacement(map,r.at,i=>i===r.at,()=>false,door).length>0)),expected);
    const adjacent=[r.at-map.width,r.at+map.width,r.at-1,r.at+1];
    r.neighbor.forEach((expected,i)=>{if(expected!==null)assert.equal(Number(roadItemPlacement(map,r.at,()=>false,j=>j===adjacent[i]).length>0),expected);});
  }
});
test('door distance, excluded strips, occupied slots and RNG consumption match original',()=>{
  for(const r of fixture.traces){const map=maps[r.map],draws=structuredClone(r.draws),occupied=new Set(r.occupied);
    assert.deepEqual(originalDoorDestination(map,r.start.y*map.width+r.start.x,n=>{const d=draws.shift();assert.ok(d);assert.equal(n,d[0]);return d[1];},i=>occupied.has(i)),{to:r.y*map.width+r.x,direction:r.direction});assert.equal(draws.length,0);
  }
});
test('placed door saves, transports without spending a step, expires on the fifth date change and replays',()=>{
  const map=maps[4];let g=createGame(map,{startDate:'2000-05-02'});g.players.forEach(p=>p.control='human');g.players[0].inventory=['door'];
  const at=map.cells.findIndex((c,i)=>gameRoadPlacement(map,g,i).length),initial=structuredClone(g),commands=[{type:'useItem',item:'door',target:at}];
  g=executeCommand(map,g,commands[0]).state;assert.equal(g.players[0].at,initial.players[0].at);assert.equal(g.phase,'end');assert.equal(g.roadItems[0].remaining,5);
  assert.deepEqual(replayCommands(map,{format:'dingdang-replay-v1',initial,commands}),g);g=restore(map,JSON.stringify(g));
  const door=g.roadItems[0],d=door.direction,delta=[-map.width,map.width,-1,1][d];g.players[0].at=at-delta;g.players[0].direction=d;g.phase='moving';g.dice=1;g.remaining=1;
  assert.ok(choices(map,g).includes(at));const before=g.players[0].cash;
  const moved=executeCommand(map,g,{type:'step',to:at});g=moved.state;
  assert.deepEqual(moved.walk,{x:map.cells[at].x,y:map.cells[at].y,direction:d,stride:1});
  assert.notEqual(g.players[0].at,at);assert.equal(g.remaining,1);assert.equal(g.afterQueue,'moving');assert.equal(g.roadItems.length,1);assert.equal(g.players[0].cash,before);assert.deepEqual(restore(map,JSON.stringify(g)),g);
  for(let day=1;day<=5;day++){g.turn=3;g.phase='end';nextTurn(map,g);g=restore(map,JSON.stringify(g));assert.equal(g.roadItems.length,day===5?0:1);if(day<5)assert.equal(g.roadItems[0].remaining,5-day);}
});
test('cannon moves only its user, rejects occupied targets atomically and ends the action',()=>{
  const map=maps[4];let g=createGame(map,{startDate:'2000-05-02'});g.players[0].inventory=['original-13'];
  const initial=structuredClone(g);assert.throws(()=>executeCommand(map,g,{type:'useItem',item:'original-13',target:g.players[1].at}));assert.deepEqual(g,initial);
  const at=map.cells.findIndex((c,i)=>gameRoadPlacement(map,g,i,false).length),command={type:'useItem',item:'original-13',target:at};g=executeCommand(map,g,command).state;
  assert.equal(g.players[0].at,at);assert.equal(g.phase,'end');assert.equal(g.roadItems.length,0);assert.deepEqual(g.players.slice(1),initial.players.slice(1));assert.deepEqual(restore(map,JSON.stringify(g)),g);assert.deepEqual(replayCommands(map,{format:'dingdang-replay-v1',initial,commands:[command]}),g);
});
