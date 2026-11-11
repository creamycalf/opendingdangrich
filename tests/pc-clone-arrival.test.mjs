import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as E from '../app/src/engine.mjs';
import {cloneNodes,actorCells,planClones} from '../app/src/clones.mjs';
import {originalLandItemNeighbor} from '../app/src/land-items.mjs';
import {applyEffect} from '../app/src/effects.mjs';
import {executeCommand,replayCommands} from '../app/src/commands.mjs';
const map=JSON.parse(fs.readFileSync(new URL('../app/public/assets/maps-v126/4.json',import.meta.url)));
import {cloneArrivalFixture} from './helpers/pc-clone-fixture.mjs';

function runArrival(initial,to,decide){
 const commands=[],prompts=[];let g=structuredClone(initial);
 const send=c=>{commands.push(c);g=executeCommand(map,g,c).state;assert.deepEqual(E.restore(map,JSON.stringify(g)),g);};
 send({type:'roll',animated:false});send({type:'dicePresented'});const old=g.players[0].at;
 send({type:'step',to});assert.deepEqual(actorCells(g.players[0]),[to,old]);
 for(let n=0;n<40&&g.phase!=='end';n++){
  if(g.phase==='landed')send({type:'landing'});
  else if(g.phase==='resolving')send({type:'advance'});
  else {prompts.push({at:g.visitAt,...g.pending});send({type:'answer',action:decide(g.pending,prompts.length)});}
 }
 assert.equal(g.phase,'end');assert.equal(g.visitAt,undefined);assert.equal(g.turn,0);
 assert.deepEqual(replayCommands(map,{format:'dingdang-replay-v1',initial,commands}),g);
 send({type:'nextTurn'});assert.equal(g.turn,1);return {g,prompts};
}
test('PC split knife: one real dice move gives two sequential purchases and resumes exactly between them',()=>{
 const {initial,to,lots}=cloneArrivalFixture();const {g,prompts}=runArrival(initial,to,()=> 'yes');
 assert.deepEqual(prompts.map(p=>p.kind),['buy','buy']);assert.deepEqual(prompts.map(p=>p.lot),lots);
 assert.deepEqual(E.ownedLots(g,0).sort((a,b)=>a-b),[...lots].sort((a,b)=>a-b));
});
test('declining the body purchase does not skip follower purchase',()=>{
 const {initial,to,lots}=cloneArrivalFixture();const {g,prompts}=runArrival(initial,to,(_,n)=>n===1?'no':'yes');
 assert.equal(prompts.length,2);assert.equal(g.owners[lots[0]],undefined);assert.equal(g.owners[lots[1]],0);
});
test('body and clone each pay ordinary rent at their own stop',()=>{
 const {initial,to,lots}=cloneArrivalFixture();lots.forEach((lot,i)=>{initial.owners[lot]=i+1;initial.levels[lot]=1;initial.kinds[lot]=1;});
 const before=initial.players.map(p=>p.cash),rents=lots.map(l=>E.rent(map,initial,l));const {g,prompts}=runArrival(initial,to,()=> 'ok');
 // Doraemon also eats one bun on this movement, independently of rent.
 assert.equal(prompts.length,0);assert.equal(g.players[0].cash,before[0]-1-rents[0]-rents[1]);
 assert.equal(g.players[1].cash,before[1]+rents[0]);assert.equal(g.players[2].cash,before[2]+rents[1]);
});
test('v1.26 tanuki also charges own land instead of offering upgrades, including clone stops',()=>{
 const {initial,to,lots}=cloneArrivalFixture();applyEffect(initial.players[0],'original-15',1,false);
 lots.forEach(lot=>{initial.owners[lot]=0;initial.levels[lot]=1;initial.kinds[lot]=1;});
 const before=initial.players.map(p=>p.cash),rent=lots.reduce((sum,l)=>sum+E.rent(map,initial,l),0);
 const {g,prompts}=runArrival(initial,to,()=> 'ok');assert.equal(prompts.length,0);
 assert.equal(g.players[0].cash,before[0]-1-rent);assert.equal(g.players[1].cash,before[1]+rent);
});
