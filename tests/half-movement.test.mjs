import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as E from '../app/src/engine.mjs';
import {playerPosition,halfStepTarget,movePosition} from '../app/src/movement-position.mjs';
import {applyEffect,effectCapabilities} from '../app/src/effects.mjs';
import {executeCommand} from '../app/src/commands.mjs';
const map=JSON.parse(fs.readFileSync(new URL('../app/public/assets/maps/4.json',import.meta.url)));
test('size expiration between nodes finishes the half step before allowing a turn',()=>{
 const p={at:510,small:false,direction:3,half:{x:10.5,y:10,at:510},straightDistance:2};
 assert.equal(halfStepTarget(map,p),511);assert.equal(movePosition(map,p,3),.5);
 assert.equal(p.half,null);assert.equal(p.at,511);
});
test('496 original half-grid direction cases force the saved heading',()=>{
 const fx=JSON.parse(fs.readFileSync(new URL('./fixtures/original-half-navigation.json',import.meta.url)));
 for(const c of fx.cases){assert.equal(c.mask,1<<c.direction);const at=Math.trunc(c.y)*map.width+Math.trunc(c.x),p={at,small:true,direction:c.direction,half:{x:c.x,y:c.y,at}};
  const [dx,dy]=[[0,-1],[0,1],[-1,0],[1,0]][c.direction];assert.equal(halfStepTarget(map,p),Math.trunc(c.y+dy*.5)*map.width+Math.trunc(c.x+dx*.5));}
});
test('shrunk dice points move exactly half a tile and stay on their heading between nodes',()=>{
 for(let d=0;d<4;d++){const g=E.createGame(map,{startDate:'2000-04-03'}),p=g.players[0];
  const at=map.cells.findIndex((c,i)=>E.walkable(c)&&E.adjacent(map,i).filter(n=>E.walkable(map.cells[n])).length===4);p.at=at;p.direction=d;applyEffect(p,'original-39',1,false);
  g.phase='moving';g.remaining=2;const target=E.choices(map,g).find(n=>{const c=map.cells[n],a=map.cells[at];return d===0?c.y<a.y:d===1?c.y>a.y:d===2?c.x<a.x:c.x>a.x;});assert.notEqual(target,undefined);
  const before={...playerPosition(map,p)};E.step(map,g,target);const half=playerPosition(map,p);assert.equal(Math.abs(half.x-before.x)+Math.abs(half.y-before.y),.5);assert.equal(p.walkPoints,.5);
  assert.deepEqual(E.restore(map,JSON.stringify(g)),g);g.phase='moving';assert.equal(E.choices(map,g).length,1);assert.equal(E.choices(map,g)[0],halfStepTarget(map,p));E.step(map,g,E.choices(map,g)[0]);
  const end=playerPosition(map,p);assert.equal(Math.abs(end.x-before.x)+Math.abs(end.y-before.y),1);assert.equal(p.walkPoints,1);assert.equal(p.half,null);
 }
});
test('shrink gun rejects already small players and protected targets without consumption',()=>{
 const g=E.createGame(map,{startDate:'2000-04-03'});g.players[0].inventory=['original-39'];g.players[1].small=true;
 assert.throws(()=>executeCommand(map,g,{type:'useItem',item:'original-39',target:1}));assert.deepEqual(g.players[0].inventory,['original-39']);g.players[1].small=false;
 const h=executeCommand(map,g,{type:'useItem',item:'original-39',target:1}).state;assert.equal(h.players[1].small,true);assert.equal(effectCapabilities(h.players[1])&0x141,0);assert.deepEqual(E.restore(map,JSON.stringify(h)),h);
});
