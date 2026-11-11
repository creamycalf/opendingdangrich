import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {cashVisualPlan,cashAnimationIndex,cashDirection,cashPresentationSprites} from '../app/src/rent-presentation.mjs';
import {audioTurnFixtures,map} from './audio-turn-fixtures.mjs';
import {executeCommand} from '../app/src/commands.mjs';
import {animationFrame} from '../app/src/character-animation.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('../app/public/assets/cash-animations/catalog.json',import.meta.url)));
const fixtures=audioTurnFixtures();
test('real committed rent, reversed rent, fine, reward and property commands produce original feedback without mutations',()=>{
 const expected={'正常租金':['rent',-25,6],'颠倒租金':['rent',25,null],'征罚圈实际扣款':['fine',null,6],'奖励圈':['reward',null,5],'有奖金的奖金池':['pool',250,5],'确认升级':['upgrade',null,null],'确认卖地':['sell',null,null]};
 for(const f of fixtures){const snapshot=JSON.stringify(f),plan=cashVisualPlan(map,f.before,f.after,f.command),want=expected[f.name];
  if(want){assert.equal(plan.length,1,f.name);assert.equal(plan[0].kind,want[0]);assert.equal(plan[0].pose,want[2]);if(want[1]!==null)assert.equal(plan[0].delta,want[1]);assert.ok(cashPresentationSprites(catalog,plan).length>0);}
  else assert.deepEqual(plan,[],f.name);
  assert.equal(JSON.stringify(f),snapshot,'presentation never settles money, changes state or consumes RNG');
 }
});
test('native four directions, three height bands and incoming/outgoing animation groups',()=>{
 const origin={x:2,y:2},neighbors=[{x:2,y:1},{x:2,y:3},{x:1,y:2},{x:3,y:2}];
 for(let d=0;d<4;d++){assert.equal(cashDirection(origin,neighbors[d]),d);for(let h=0;h<3;h++){
  assert.equal(cashAnimationIndex(-5,d,h),55+d*3+h);assert.equal(cashAnimationIndex(5,d,h),67+d*3+h);
 }}assert.equal(cashAnimationIndex(-5),49);assert.equal(cashAnimationIndex(5),48);
});
test('rent exposes payer and actual recipient balances and does not animate exempt or uncommitted cash',()=>{
 const f=fixtures.find(f=>f.name==='正常租金'),plan=cashVisualPlan(map,f.before,f.after,f.command)[0];
 assert.deepEqual(plan.receipts,[{who:0,before:1000,after:975},{who:1,before:1000,after:1025}]);
 assert.deepEqual(cashVisualPlan(map,f.before,f.before,f.command),[]);
 const deferred=structuredClone(f.after);deferred.pending={kind:'debt'};assert.deepEqual(cashVisualPlan(map,f.before,deferred,f.command),[]);
 const before=structuredClone(f.before);before.queue[0].creditor=2;const after=executeCommand(map,before,f.command).state;
 assert.deepEqual(cashVisualPlan(map,before,after,f.command)[0].receipts.map(r=>r.who),[0,2]);
});
test('buy and decline are distinguished by committed property ownership; sale uses ground height',()=>{
 const own=fixtures.find(f=>f.name==='升级选项'),before=structuredClone(own.before),lot=Object.keys(before.owners)[0];
 delete before.owners[lot];before.phase='prompt';before.pending={kind:'buy',lot:Number(lot)};
 for(const action of ['yes','no']){const command={type:'answer',action},after=executeCommand(map,before,command).state,plan=cashVisualPlan(map,before,after,command);assert.equal(plan.length,action==='yes'?1:0);if(plan.length)assert.equal(plan[0].kind,'buy');}
 const sale=fixtures.find(f=>f.name==='确认卖地');assert.equal(cashVisualPlan(map,sale.before,sale.after,sale.command)[0].height,0);
});
test('original PC insufficient cash still commits rent immediately and presents one debit',()=>{
 const f=fixtures.find(f=>f.name==='正常租金'),before=structuredClone(f.before);before.pcEconomyVersion='pc-v126';before.players[0].cash=5;
 const after=executeCommand(map,before,f.command).state,plan=cashVisualPlan(map,before,after,f.command);
 assert.equal(after.players[0].cash,-20);assert.equal(after.pending,null);assert.equal(plan.length,1);assert.equal(plan[0].delta,-25);
 assert.deepEqual(plan[0].receipts[0],{who:0,before:5,after:-20});
});
test('upgrade height uses the pre-upgrade floor at 1→2 and 3→4 boundaries, as 442ffe explicitly subtracts one',()=>{
 const f=fixtures.find(f=>f.name==='确认升级');
 for(const level of [1,3]){
  const before=structuredClone(f.before),lot=before.pending.lot;before.levels[lot]=level;before.players[0].cash=100000;
  const after=executeCommand(map,before,f.command).state,step=cashVisualPlan(map,before,after,f.command)[0];
  assert.equal(after.levels[lot],level+1);assert.equal(step.kind,'upgrade');assert.equal(step.height,Math.floor(level/2));
  assert.equal(step.animation,55+step.direction*3+Math.floor(level/2));
  assert.notEqual(step.animation,55+step.direction*3+Math.floor((level+1)/2));
 }
});
test('all extracted native cash animation frames reference real PNGs and preserve DAT movement',()=>{
 let frames=0;for(const a of Object.values(catalog.animations)){assert.ok(a.frames>0);for(let tick=0;tick<a.frames;tick++)for(const c of animationFrame(a,tick,false)){
  const image=catalog.images[c.sprite];assert.ok(image);assert.ok(fs.existsSync(new URL('../app/public/'+image.url,import.meta.url)));assert.ok(Number.isFinite(c.x)&&Number.isFinite(c.y));frames++;
 }}assert.ok(frames>1000);assert.equal(Object.keys(catalog.animations).length,27);
});
