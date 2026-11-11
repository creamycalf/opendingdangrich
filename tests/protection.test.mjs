import {reachLandingCharge} from './arrival-helper.mjs';
import {originalLandItemNeighbor} from '../app/src/land-items.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as E from '../app/src/engine.mjs';
import {itemKey} from '../app/src/inventory.mjs';
import {effectCapabilities,mustPayRent,canBeAttacked,canAttackPlayer,originalEffectPairConflict,applyEffect,tickPlayerEffects} from '../app/src/effects.mjs';
import {executeCommand,replayCommands} from '../app/src/commands.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url)));
const fixture=read('./fixtures/original-protection.json'),map=read('../app/public/assets/maps/4.json');
const game=()=>E.createGame(map,{startDate:'2000-04-03'});

test('defensive masks, rent gates, attack eligibility and shop filtering match original instructions',()=>{
  for(const c of fixture.masks){const p={effects:[{id:itemKey(c.item),source:0,remaining:5}]};const actual=effectCapabilities(p,c.base);assert.equal(actual,c.after);assert.equal(!(actual&0x20),c.rentExempt);}
  for(const c of fixture.targets){
    const target={eliminated:!c.alive,character:c.shizuka?'shizuka':'gian',effects:c.item===null?[]:[{id:itemKey(c.item),source:0,remaining:3}]};
    assert.equal(canAttackPlayer({character:c.nobita?'nobita':'doraemon'},target,0,itemKey(c.attack??36)),c.allowed,JSON.stringify(c));
  }
  for(const c of fixture.shop)assert.equal(E.canBuyItem({character:c.restricted?'suneo':'shizuka'},itemKey(c.item)),c.allowed);
});

test('all implemented effect pairs match original self-use and attack conflict queries',()=>{
  for(const c of fixture.conflicts)assert.equal(originalEffectPairConflict(itemKey(c.old),itemKey(c.new),c.sameSource,c.attack,'legacy'),c.result,JSON.stringify(c));
});
test('phone sleep is guaranteed, compensated at attachment and wakes once at the original boundary',()=>{
  let g=game();g.players[0].inventory=['original-4'];g.players[1].effectClockStarted=true;
  const initial=structuredClone(g),command={type:'useItem',item:'original-4',target:1};g=executeCommand(map,g,command).state;
  assert.equal(g.seed,initial.seed);assert.equal(g.players[1].itemSleeping,true);assert.deepEqual(g.players[1].effects,[{id:'original-4',source:0,remaining:4}]);
  assert.deepEqual(E.restore(map,JSON.stringify(g)),g);assert.deepEqual(replayCommands(map,{format:'dingdang-replay-v1',initial,commands:[command]}),g);
  g.phase='ready';g.turn=1;for(let n=1;n<=4;n++){g.players[1].effectTickPending=true;assert.equal(E.beginTurn(g),n===4);g=E.restore(map,JSON.stringify(g));g.queue=[];g.phase='ready';}
  assert.equal(g.players[1].itemSleeping,false);assert.deepEqual(g.players[1].effects,[]);
});
test('amnesia disables the target property collection through save and expires independently',()=>{
  const g=game();g.players[0].inventory=['original-25'];const seed=g.seed;E.useItem(map,g,'original-25',1);
  assert.equal(g.seed,seed);assert.equal(effectCapabilities(g.players[1])&4,0);assert.equal(mustPayRent(g.players[1]),true);assert.equal(g.players[1].itemSleeping,false);
  assert.deepEqual(E.restore(map,JSON.stringify(g)),g);g.players[1].effects[0].remaining=1;g.players[1].effectTickPending=true;tickPlayerEffects(g.players[1]);assert.equal(effectCapabilities(g.players[1])&4,4);
});
test('exchange cloth swaps location and heading but preserves balances, effects and ownership',()=>{
  let g=game();g.players[0].inventory=['original-30'];g.players[0].direction=2;g.players[1].direction=1;applyEffect(g.players[1],'original-20',1);
  const initial=structuredClone(g),command={type:'useItem',item:'original-30',target:1};g=executeCommand(map,g,command).state;
  for(const i of [0,1]){assert.equal(g.players[i].at,initial.players[1-i].at);assert.equal(g.players[i].direction,initial.players[1-i].direction);assert.equal(g.players[i].cash,initial.players[i].cash);assert.equal(g.players[i].bank,initial.players[i].bank);assert.deepEqual(g.players[i].effects,initial.players[i].effects);}
  assert.equal(g.phase,'end');assert.deepEqual(g.owners,initial.owners);assert.deepEqual(E.restore(map,JSON.stringify(g)),g);assert.deepEqual(replayCommands(map,{format:'dingdang-replay-v1',initial,commands:[command]}),g);
  const protectedGame=game();protectedGame.players[0].inventory=['original-30'];applyEffect(protectedGame.players[1],'original-19',1);assert.throws(()=>executeCommand(map,protectedGame,command),/攻击/);
});

test('defensive effects expire at the original counter boundary and restore capabilities',()=>{
  for(const c of fixture.clocks){
    const id=itemKey(c.item),p={effects:[{id,source:0,remaining:c.remaining}],effectTickPending:c.pending};let remaining=c.remaining,expired=false;
    for(const expected of c.sequence){
      if(expected.action==='end')p.effectTickPending=true;
      else if(tickPlayerEffects(p).includes(id)){remaining=0;expired=true;}
      if(p.effects.length)remaining=p.effects[0].remaining;
      assert.equal(remaining,expected.remaining);assert.equal(expired,expected.expired);assert.equal(p.effectTickPending,expected.pending);
    }
    assert.equal(mustPayRent(p),true);assert.equal(canBeAttacked(p),true);
  }
});

test('friendship replaces robot, popularity replaces friendship; independent robot protection remains',()=>{
  const p=game().players[0];applyEffect(p,'original-1');assert.equal(mustPayRent(p),false);assert.equal(canBeAttacked(p),true);
  applyEffect(p,'original-10');assert.deepEqual(p.effects.map(e=>e.id),['original-10']);assert.equal(canBeAttacked(p),false);
  applyEffect(p,'original-19');assert.deepEqual(p.effects.map(e=>e.id),['original-19']);assert.equal(mustPayRent(p),true);assert.equal(canBeAttacked(p),false);
  applyEffect(p,'original-1');assert.equal(p.effects.length,2);assert.equal(mustPayRent(p),false);
  assert.throws(()=>applyEffect(p,'original-1'),/已经/);
});

test('using a defensive item ends the action, survives replay/save, and rejects protected shots without consumption',()=>{
  const initial=game();initial.players[0].inventory=['original-10'];
  const command={type:'useItem',item:'original-10'},used=executeCommand(map,initial,command).state;
  assert.equal(used.phase,'end');assert.deepEqual(used.players[0].inventory,[]);assert.equal(used.players[0].effects[0].remaining,5);
  assert.deepEqual(E.restore(map,JSON.stringify(used)),used);
  assert.deepEqual(replayCommands(map,{format:'dingdang-replay-v1',initial,commands:[command]}),used);
  used.phase='ready';used.turn=1;used.players[1].inventory=['air'];const before=structuredClone(used);
  assert.throws(()=>executeCommand(map,used,{type:'useItem',item:'air',target:0}),/攻击/);assert.deepEqual(used,before);
  used.players[0].effects[0].remaining=1;used.players[0].effectTickPending=true;tickPlayerEffects(used.players[0]);
  assert.equal(canAttackPlayer(used.players[1],used.players[0],1),true);
});

test('actual final stop waives protected rent while keeping normal charges and ownership unchanged',()=>{
  let found;
  outer:for(let at=0;at<map.cells.length;at++)if(E.walkable(map.cells[at]))for(let direction=0;direction<4;direction++){
    const g=game();g.turn=1;Object.assign(g.players[1],{at,direction});
    for(const to of E.choices(map,g)){const lot=originalLandItemNeighbor(map,to);if(map.cells[lot]?.event===1&&map.cells[to].event===0&&!g.players.some((p,i)=>i!==1&&p.at===to)){found={at,direction,to,lot};break outer;}}
  }
  assert.ok(found);const {at,direction,to,lot}=found;
  for(const protectedRent of [false,true]){
    const g=game();g.turn=1;Object.assign(g.players[1],{at,direction});g.owners[lot]=0;g.levels[lot]=3;g.phase='moving';g.remaining=1;
    if(protectedRent)applyEffect(g.players[1],'original-10',1);
    E.step(map,g,to);reachLandingCharge(map,g);const rents=g.queue.filter(q=>q.kind==='charge'&&q.creditor===0);
    assert.equal(rents.length,protectedRent?0:1);assert.equal(g.owners[lot],0);assert.equal(g.levels[lot],3);
    if(protectedRent){g.phase='resolving';g.queue=[{kind:'charge',amount:50,creditor:-1,text:'罚款'}];E.advance(map,g);assert.equal(g.players[1].cash,950);}
  }
});
