import {reachLandingCharge} from './arrival-helper.mjs';
import {originalLandItemNeighbor} from '../app/src/land-items.mjs';
import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as E from '../app/src/engine.mjs';import {applyEffect} from '../app/src/effects.mjs';import {executeCommand,replayCommands} from '../app/src/commands.mjs';
const map=JSON.parse(fs.readFileSync(new URL('../app/public/assets/maps/4.json',import.meta.url)));
function crossing(){
 const g=E.createGame(map,{startDate:'2000-04-03'});g.turn=1;const p=g.players[1];applyEffect(p,'original-9',1,true);
 for(let i=0;i<map.cells.length;i++)if(E.walkable(map.cells[i])){p.at=i;p.previous=-1;for(const to of E.choices(map,g)){const lot=originalLandItemNeighbor(map,to);if(map.cells[lot]?.event===1&&map.cells[to].event===0){g.owners[lot]=2;g.levels[lot]=4;g.phase='moving';g.remaining=1;return {g,to,lot};}}}
 throw Error('missing rent crossing');
}
test('reverse rent reverses the transfer and still accrues the absolute amount in the rent pool',()=>{
 const {g,to,lot}=crossing(),before=structuredClone(g),amount=E.rent(map,g,lot);E.step(map,g,to);reachLandingCharge(map,g);const charge=g.queue.find(e=>e.rent);assert.equal(charge.debtor,2);assert.equal(charge.creditor,1);
 E.advance(map,g);assert.equal(g.players[2].cash,Math.fround(before.players[2].cash-amount));assert.equal(g.players[1].cash,Math.fround(before.players[1].cash+amount));assert.equal(g.rentPool,amount);assert.deepEqual(E.restore(map,JSON.stringify(g)),g);
});
test('opponent debt draws only their bank, survives reload, pays once and resumes the mover',()=>{
 const {g,to}=crossing();g.players[2].cash=0;const initial=structuredClone(g),commands=[{type:'step',to},{type:'advance'},{type:'landing'},{type:'advance'},{type:'advance'},{type:'advance'},{type:'advance'},{type:'answer',action:'withdraw'},{type:'answer',action:'pay'}];let next=initial;
 for(const c of commands){next=executeCommand(map,next,c).state;assert.deepEqual(E.restore(map,JSON.stringify(next)),next);}
 assert.equal(next.turn,1);assert.equal(next.players[2].cash,0);assert.ok(next.players[2].bank<initial.players[2].bank);assert.equal(next.players[1].bank,initial.players[1].bank);assert.equal(next.remaining,0);assert.equal(next.phase,'resolving');
 assert.deepEqual(replayCommands(map,{format:'dingdang-replay-v1',initial,commands}),next);
});
test('bankruptcy of the other payer preserves the mover and remaining events; own bankruptcy still stops movement',()=>{
 const {g,to,lot}=crossing();g.players[2].cash=0;g.players[2].bank=0;
 // A connected group increases the rent above the debtor land liquidation.
 for(const j of E.adjacent(map,lot))if(map.cells[j].event===1){g.owners[j]=2;g.levels[j]=4;}
 E.step(map,g,to);reachLandingCharge(map,g);E.advance(map,g);assert.equal(g.pending.kind,'debt');assert.ok(E.liquidity(map,g,2)<g.pending.amount);
 E.answer(map,g,'bankrupt');assert.equal(g.players[2].eliminated,true);assert.equal(g.players[1].eliminated,false);assert.equal(g.remaining,0);assert.equal(g.turn,1);assert.deepEqual(E.ownedLots(g,2),[]);assert.deepEqual(E.restore(map,JSON.stringify(g)),g);
});
test('reverse rent still respects actual owner exemption and tanuki source redirection',()=>{
 const a=crossing();applyEffect(a.g.players[2],'original-25',3,false);E.step(map,a.g,a.to);reachLandingCharge(map,a.g);assert.equal(a.g.queue.some(e=>e.rent),false);
 const b=crossing();applyEffect(b.g.players[1],'original-15',0,false);E.step(map,b.g,b.to);reachLandingCharge(map,b.g);const charge=b.g.queue.find(e=>e.rent);assert.equal(charge.debtor,0);assert.equal(charge.creditor,1);
});
