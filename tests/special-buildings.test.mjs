import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as E from '../app/src/engine.mjs';import * as S from '../app/src/special-buildings.mjs';
import {applyEffect} from '../app/src/effects.mjs';import {applyLandItem,originalLandItemNeighbor} from '../app/src/land-items.mjs';
import {executeCommand,replayCommands} from '../app/src/commands.mjs';
const oracle=JSON.parse(fs.readFileSync(new URL('./fixtures/original-special-buildings.json',import.meta.url)));
const map=JSON.parse(fs.readFileSync(new URL('../app/public/assets/maps/4.json',import.meta.url)));
const start=()=>{const g=E.createGame(map,{startDate:'2000-05-02'});g.players.forEach(p=>p.control='human');return g;};
function position(g,kind,owner=0){const at=map.cells.findIndex((c,i)=>E.walkable(c)&&c.event===0&&map.cells[originalLandItemNeighbor(map,i)]?.event===1);const lot=originalLandItemNeighbor(map,at);g.players[0].at=at;g.players[0].half=null;g.owners[lot]=owner;g.levels[lot]=kind?1:0;g.kinds[lot]=kind;return lot;}
test('480 construction gates and both original impact results agree with isolated x86',()=>{
 for(const row of oracle.construction){const m={width:3,height:3,cells:Array.from({length:9},(_,i)=>({x:i%3,y:Math.floor(i/3),flags:128}))},g=start();g.players[0].at=4;
  for(const [bit,i]of [1,7,3,5].entries()){m.cells[i].flags=row.mask&(1<<bit)?0:128;if(row.owner>=0)g.owners[i]=row.owner;g.levels[i]=row.level;}
  assert.equal(S.specialBuildStatus(m,g,'original-'+row.item).allowed,row.allowed,JSON.stringify(row));
 }
 for(const row of oracle.mutations){const g=start(),lot=position(g,0);S.buildSpecial(map,g,'original-'+row.item);assert.equal(g.levels[lot],row.level);assert.equal(g.kinds[lot],row.kind);assert.equal(row.actorInserted,true);}
});
test('missile selection follows 32 original eligibility combinations and friendship direction',()=>{
 for(const row of oracle.targets){const g=start(),p=g.players[0],q=g.players[1];p.character=row.nobita?'nobita':'doraemon';q.character=row.shizuka?'shizuka':'gian';q.eliminated=!row.alive;q.itemSleeping=row.sleep;if(row.protected)applyEffect(q,'original-19',1);assert.equal(S.canMissileTarget(g,0,1),row.allowed,JSON.stringify(row));}
 const g=start();applyEffect(g.players[0],'original-27',1);assert.equal(S.canMissileTarget(g,0,1),false);assert.equal(S.canMissileTarget(g,1,0),true);
});
test('construction consumes inventory and ends turn, saves/replays, cannot build on existing buildings',()=>{
 for(const id of S.SPECIAL_BUILDINGS){let g=start();const lot=position(g,0);g.players[0].inventory=[id];const initial=structuredClone(g),cmd={type:'useItem',item:id};g=executeCommand(map,g,cmd).state;
  assert.equal(g.phase,'end');assert.equal(g.players[0].inventory.length,0);assert.equal(g.kinds[lot],id==='original-40'?3:2);assert.deepEqual(E.restore(map,JSON.stringify(g)),g);assert.deepEqual(replayCommands(map,{format:'dingdang-replay-v1',initial,commands:[cmd]}),g);
  assert.equal(E.propertyValue(map,g,lot),E.landPrice(map.cells[lot],g));assert.throws(()=>E.upgradeCost(map,g,lot));assert.throws(()=>S.buildSpecial(map,g,id));
  applyLandItem(g,'restoreRay',lot);assert.equal(g.levels[lot],0);assert.equal(g.kinds[lot],0);assert.equal(g.owners[lot],0);
 }
});
function arrival(g){g.phase='landed';E.landing(map,g);while(g.phase==='resolving')E.advance(map,g);}
test('enemy cannon triggers only at arrival, bypasses normal protection, preserves base and dwarf exception',()=>{
 const g=start(),lot=position(g,3,1);applyEffect(g.players[0],'original-19');arrival(g);assert.equal(g.pending.kind,'notice');assert.equal(g.players[0].jail,true);assert.equal(g.players[0].at,map.jail.y*map.width+map.jail.x);assert.equal(g.kinds[lot],3);assert.deepEqual(E.restore(map,JSON.stringify(g)),g);
 for(const own of [false,true]){const h=start();position(h,3,own?0:1);if(!own){applyEffect(h.players[0],'original-14');h.players[0].effects[0].active=true;}arrival(h);assert.equal(h.players[0].jail,false);assert.equal(h.phase,'end');}
 const tanuki=start();position(tanuki,3);applyEffect(tanuki.players[0],'original-15',1);arrival(tanuki);assert.equal(tanuki.players[0].jail,true);
});
test('own missile prompts, rejects invalid target atomically, redirects one hop and consumes camera, persists after firing',()=>{
 let g=start();const lot=position(g,2);applyEffect(g.players[1],'original-7',1);g.players[1].effects.at(-1).target=0;arrival(g);assert.equal(g.pending.kind,'missile');assert.deepEqual(E.restore(map,JSON.stringify(g)),g);
 const initial=structuredClone(g);assert.throws(()=>executeCommand(map,g,{type:'answer',action:'fire',value:0}));assert.deepEqual(g,initial);
 const cmd={type:'answer',action:'fire',value:1};g=executeCommand(map,g,cmd).state;assert.equal(g.players[0].jail,true);assert.equal(g.players[1].jail,false);assert.equal(g.players[1].effects.some(e=>e.id==='original-7'),false);assert.equal(g.kinds[lot],2);assert.deepEqual(E.restore(map,JSON.stringify(g)),g);assert.deepEqual(replayCommands(map,{format:'dingdang-replay-v1',initial,commands:[cmd]}),g);
 const none=start();position(none,2);for(const p of none.players.slice(1))applyEffect(p,'original-19',0);arrival(none);assert.equal(none.phase,'end');
 const enemy=start();position(enemy,2,1);arrival(enemy);assert.equal(enemy.phase,'end');assert.equal(enemy.players[0].jail,false);
});

