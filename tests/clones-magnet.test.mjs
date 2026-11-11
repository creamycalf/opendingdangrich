import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as E from '../app/src/engine.mjs';import {CLONE_ITEMS,planClones,cloneNodes,actorCells,relocateClones} from '../app/src/clones.mjs';import {applyEffect,tickPlayerEffects,canAttackPlayer} from '../app/src/effects.mjs';import {gameRoadPlacement} from '../app/src/road-items.mjs';import {magnetDirection} from '../app/src/magnet.mjs';import {executeCommand,replayCommands} from '../app/src/commands.mjs';import {originalLandItemNeighbor} from '../app/src/land-items.mjs';
const maps=Array.from({length:8},(_,i)=>JSON.parse(fs.readFileSync(new URL(`../app/public/assets/maps/${i}.json`,import.meta.url)))),map=maps[4],make=()=>E.createGame(map,{startDate:'2000-05-02'});
test('follower placement helper agrees with 4684 original x86 map and heading cases',()=>{
 const fx=JSON.parse(fs.readFileSync(new URL('./fixtures/original-clone-placement.json',import.meta.url)));
 for(const row of fx.cases){let k=0;const got=planClones(maps[row.map],{turn:0,players:[{at:row.at,direction:row.direction}],roadItems:[]},'original-32',()=>row.draws[k++]?.[1])?.[0];assert.equal(!!got,row.allowed,JSON.stringify(row));if(got){assert.equal(got.at,row.y*maps[row.map].width+row.x);assert.equal(got.direction,row.heading);}assert.equal(k,row.draws.length);}
});
test('both clone tools create visible saved followers, occupy roads, follow bends, relocate and expire',()=>{
 for(const item of CLONE_ITEMS){let g=make();g.players[0].inventory=[item];const initial=structuredClone(g),cmd={type:'useItem',item};g=executeCommand(map,g,cmd).state;const p=g.players[0];assert.equal(cloneNodes(p).length,item==='original-24'?3:1);assert.deepEqual(E.restore(map,JSON.stringify(g)),g);assert.deepEqual(replayCommands(map,{format:'dingdang-replay-v1',initial,commands:[cmd]}),g);
  for(const node of cloneNodes(p))assert.deepEqual(gameRoadPlacement(map,g,node.at),[]);
  g.phase='moving';g.remaining=1;const old=actorCells(p),to=E.choices(map,g)[0];E.step(map,g,to);assert.deepEqual(cloneNodes(p).map(n=>n.at),old.slice(0,-1));assert.deepEqual(E.restore(map,JSON.stringify(g)),g);
  p.at=map.jail.y*map.width+map.jail.x;p.direction=map.jail.direction;relocateClones(map,p);assert.equal(cloneNodes(p).length,item==='original-24'?3:1);
  for(let i=0;i<5;i++){p.effectTickPending=true;tickPlayerEffects(p);}assert.equal(cloneNodes(p).length,0);
 }
});
test('every follower stop uses its own property context; save/replay can resume between purchase decisions',()=>{
 let g=make();g.players[0].inventory=['original-24'];g=executeCommand(map,g,{type:'useItem',item:'original-24'}).state;
 const positions=map.cells.flatMap((c,i)=>E.walkable(c)&&c.event===0&&map.cells[originalLandItemNeighbor(map,i)]?.event===1?[i]:[]),unique=[];
 for(const at of positions)if(!unique.some(i=>originalLandItemNeighbor(map,i)===originalLandItemNeighbor(map,at)))unique.push(at);
 g.players[0].at=unique[0];cloneNodes(g.players[0]).forEach((n,i)=>n.at=unique[i+1]);g.phase='landed';const initial=structuredClone(g),commands=[];let bought=0;
 for(let i=0;i<30&&g.phase!=='end';i++){const cmd=g.phase==='landed'?{type:'landing'}:g.phase==='resolving'?{type:'advance'}:{type:'answer',action:'yes'};if(g.pending){assert.equal(g.pending.kind,'buy');assert.equal(g.pending.lot,originalLandItemNeighbor(map,unique[bought++]));}commands.push(cmd);g=executeCommand(map,g,cmd).state;assert.deepEqual(E.restore(map,JSON.stringify(g)),g);}
 assert.equal(bought,4);assert.equal(E.ownedLots(g).length,4);assert.deepEqual(replayCommands(map,{format:'dingdang-replay-v1',initial,commands}),g);
});
test('paired magnet rejects another badge, repels both endpoints, reflects, expires and replays',()=>{
 let g=make();g.players[0].inventory=['original-3'];const initial=structuredClone(g),cmd={type:'useItem',item:'original-3',target:1};g=executeCommand(map,g,cmd).state;assert.deepEqual(E.restore(map,JSON.stringify(g)),g);assert.deepEqual(replayCommands(map,{format:'dingdang-replay-v1',initial,commands:[cmd]}),g);assert.equal(canAttackPlayer(g.players[2],g.players[1],2,'original-3',1),false);
 const at=map.cells.findIndex((c,i)=>E.walkable(c)&&E.neighbors(map,i).length===4),p=g.players[0];p.at=at;p.direction=3;g.players[1].at=at+1;assert.equal(magnetDirection(map,g,3),null);g.turn=1;g.players[1].direction=2;assert.equal(magnetDirection(map,g,2),null);
 g.turn=0;g.phase='moving';g.remaining=2;E.step(map,g,at+1);assert.equal(g.players[0].at,at);assert.equal(g.remaining,0);assert.deepEqual(E.restore(map,JSON.stringify(g)),g);
 for(const p of g.players)for(let i=0;i<5;i++){p.effectTickPending=true;tickPlayerEffects(p);}assert.equal(g.players.some(p=>p.effects.some(e=>e.id==='original-3')),false);
 const reflected=make();reflected.players[0].inventory=['original-3'];applyEffect(reflected.players[1],'original-7',1);reflected.players[1].effects[0].target=2;const used=executeCommand(map,reflected,cmd).state;assert.equal(used.players[0].effects.find(e=>e.id==='original-3').target,2);assert.ok(used.players[2].effects.some(e=>e.id==='original-3'));assert.equal(used.players[1].effects.length,0);
});
