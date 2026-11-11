import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {originalDirection,originalRoadDirection} from '../app/src/pc-navigation.mjs';
import {movementDirectionMask} from '../app/src/navigation.mjs';
import * as E from '../app/src/engine.mjs';
import {executeCommand,replayCommands} from '../app/src/commands.mjs';
test('both native direction blocks preserve rejection draws, reverse fallback and cheat gating',()=>{
 const {rows}=JSON.parse(fs.readFileSync(new URL('../research/pc-v126-direction.json',import.meta.url)));
 for(const row of rows){const [site,mask,current,seed,input,cheat,expected,draws]=row;let calls=0;
  const actual=originalDirection(mask,current,n=>{assert.equal(n,4);return(seed+Math.floor(calls++/2))%4;},input,cheat);
  assert.equal(actual,expected,JSON.stringify(row));assert.equal(calls,draws,JSON.stringify(row));
 }
 assert.equal(rows.length,16384);
});
test('v1.26 full navigation mask on all eight boards, half steps, straight distance and jail',()=>{
 const maps=Array.from({length:8},(_,id)=>JSON.parse(fs.readFileSync(new URL(`../app/public/assets/maps-v126/${id}.json`,import.meta.url))));
 const {rows}=JSON.parse(fs.readFileSync(new URL('../research/pc-v126-navigation-mask.json',import.meta.url)));
 for(const row of rows){const [mapid,at,direction,straightDistance,jail,half,expected]=row,map=maps[mapid],cell=map.cells[at];
  const p={at,direction,straightDistance,jail,small:half,half:half?{at,x:cell.x+(direction>=2?.5:0),y:cell.y+(direction<2?.5:0)}:null};
  const free=(x,y)=>x>=0&&y>=0&&x<map.width&&y<map.height&&(map.cells[y*map.width+x].flags&0xc0)===0x80;
  assert.equal(movementDirectionMask(map,p,free),expected,JSON.stringify(row));
 }
 assert.equal(rows.length,56304);
});
test('native post-selection tunnel and door reversal, including entry/node asymmetry',()=>{
 const {rows}=JSON.parse(fs.readFileSync(new URL('../research/pc-v126-road-direction.json',import.meta.url)));
 for(const row of rows){const [first,mask,current,selected,item,itemDirection,flags,expected,bounced]=row;
  const actual=originalRoadDirection({first,mask,current,selected,item,itemDirection,ghost:!!(flags&1),headband:!!(flags&2),clones:!!(flags&4),small:!!(flags&8)});
  assert.equal(actual.direction,expected,JSON.stringify(row));if(!first)assert.equal(actual.bounced,bounced,JSON.stringify(row));
 }
 assert.equal(rows.length,65536);
});
test('actual aiStep preserves native RNG for forks, single exits, mask-zero reverse and half steps',()=>{
 const maps=Array.from({length:8},(_,id)=>JSON.parse(fs.readFileSync(new URL(`../app/public/assets/maps-v126/${id}.json`,import.meta.url))));
 const {rows}=JSON.parse(fs.readFileSync(new URL('../research/pc-v126-navigation-mask.json',import.meta.url)));let total=0,zero=0,halfCases=0,forks=0;
 const seen=new Set();
 for(const row of rows){const [mapid,at,direction,straightDistance,jail,half,mask]=row,key=[mapid,mask,direction,half].join(':');if(seen.has(key))continue;
  const map=maps[mapid],g=E.createGame(map,{seed:193+at,startDate:'2000-04-03'}),p=g.players[0],c=map.cells[at];Object.assign(p,{at,direction,straightDistance,jail,small:half,half:half?{at,x:c.x+(direction>=2?.5:0),y:c.y+(direction<2?.5:0)}:null});Object.assign(g,{phase:'moving',remaining:3,hermitArmed:false});
  const choices=E.choices(map,g);if(!choices.length||half&&!E.walkable(map.cells[choices[0]]))continue;seen.add(key);const oracle=structuredClone(g),wanted=originalDirection(mask,direction,n=>E.random(oracle,n)),before=JSON.stringify(g),result=executeCommand(map,g,{type:'aiStep'});
  assert.equal(result.state.seed,oracle.seed,JSON.stringify(row));assert.equal(result.walk.direction,wanted,JSON.stringify(row));assert.equal(JSON.stringify(g),before);assert.equal(result.state.pcNavigationFirst,false);
  const record={format:'dingdang-replay-v1',initial:g,commands:[{type:'aiStep'}]};assert.deepEqual(replayCommands(map,record),result.state);assert.deepEqual(E.restore(map,JSON.stringify(result.state)),result.state);
  total++;if(mask===0)zero++;if(half)halfCases++;if(mask&&(mask&(mask-1)))forks++;
 }
 assert.ok(total>100&&zero>0&&halfCases>0&&forks>0,{total,zero,halfCases,forks});
});
test('navigation version is new-game-only and rejects malformed restore metadata',()=>{
 const map=JSON.parse(fs.readFileSync(new URL('../app/public/assets/maps-v126/4.json',import.meta.url))),g=E.createGame(map);
 assert.equal(g.pcNavigationVersion,'pc-v126');assert.equal(g.pcNavigationForced,null);
 for(const bad of [{pcNavigationVersion:'future'},{pcNavigationFirst:0},{pcNavigationForced:4},{pcNavigationForced:undefined}])assert.throws(()=>E.restore(map,JSON.stringify({...g,...bad})));
 delete g.pcNavigationVersion;delete g.pcNavigationFirst;delete g.pcNavigationForced;assert.equal(E.restore(map,JSON.stringify(g)).pcNavigationVersion,undefined);
});
test('road callback continuation keeps its heading without another random draw',()=>{
 const map=JSON.parse(fs.readFileSync(new URL('../app/public/assets/maps-v126/4.json',import.meta.url))),g=E.createGame(map),p=g.players[0];
 // Find a straight segment where the forced heading remains physically valid.
 let found=false;for(const cell of map.cells){if(!E.walkable(cell))continue;p.at=cell.y*map.width+cell.x;for(let direction=0;direction<4;direction++){p.direction=direction;g.pcNavigationForced=direction;if(E.choices(map,g).length){found=true;break;}}if(found)break;}
 assert.ok(found);g.phase='moving';g.remaining=2;g.hermitArmed=false;const seed=g.seed,to=E.aiDirection(map,g);assert.equal(g.seed,seed);const after=executeCommand(map,g,{type:'aiStep'}).state;assert.equal(after.seed,seed);assert.equal(after.pcNavigationForced,null);assert.ok(Number.isInteger(to));
});
test('actual new navigation selects before door/magnet reversal and carries tunnel heading through save',()=>{
 const map=JSON.parse(fs.readFileSync(new URL('../app/public/assets/maps-v126/4.json',import.meta.url)));
 const setup=()=>{const g=E.createGame(map),p=g.players[0];let found=false;
  for(const c of map.cells){if(!E.walkable(c))continue;const at=c.y*map.width+c.x;if(!E.walkable(map.cells[at-map.width])||!E.walkable(map.cells[at+map.width])||!E.walkable(map.cells[at-2*map.width]))continue;Object.assign(p,{at,direction:0,straightDistance:1});if(E.choices(map,g).includes(at-map.width)){found=true;break;}}
  assert.ok(found);Object.assign(g,{phase:'moving',remaining:3,hermitArmed:false});return g;
 };
 for(const first of [true,false]){const g=setup(),p=g.players[0],at=p.at;g.pcNavigationFirst=first;g.roadItems=[{id:'door',at:at-map.width,direction:2,source:1,remaining:5}];
  assert.ok(E.choices(map,g).includes(at-map.width),'blocked door must remain in draw mask');const r=executeCommand(map,g,{type:'step',to:at-map.width});assert.equal(r.walk.direction,1);assert.equal(r.state.players[0].at,at+map.width);assert.equal(r.state.players[0].straightDistance,first?0:2);
 }
 {const g=setup(),p=g.players[0],at=p.at;g.players[1].at=at-map.width;g.players[1].effects=[{id:'original-3',source:0,target:1,remaining:5}];const r=executeCommand(map,g,{type:'step',to:at-map.width});assert.equal(r.walk.direction,1);assert.equal(r.state.players[0].at,at+map.width);}
 {const g=setup(),p=g.players[0],at=p.at;g.roadItems=[{id:'original-6',at:at-map.width,direction:1,source:1,remaining:5}];const r=executeCommand(map,g,{type:'step',to:at-map.width}),saved=E.restore(map,JSON.stringify(r.state));assert.equal(saved.players[0].small,true);assert.equal(saved.pcNavigationForced,0);saved.phase='moving';saved.queue=[];const seed=saved.seed;executeCommand(map,saved,{type:'aiStep'});assert.equal(E.aiDirection(map,saved),E.choices(map,saved)[0]);assert.equal(saved.seed,seed);}
});
