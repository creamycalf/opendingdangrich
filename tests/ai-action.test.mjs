import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as E from '../app/src/engine.mjs';import {chooseAiAction} from '../app/src/ai-action.mjs';import {executeCommand} from '../app/src/commands.mjs';
const maps=Array.from({length:8},(_,i)=>JSON.parse(fs.readFileSync(new URL(`../app/public/assets/maps/${i}.json`,import.meta.url))));
test('AI full-pocket eight-map sessions terminate with valid saves and legal item decisions',()=>{
 const used=new Set(),summaries=[];
 for(const map of maps){
  let g=E.createGame(map,{seed:700+map.id,maxRounds:30,startDate:'2000-05-02'}),ticks=0;
  for(const p of g.players){p.control='ai';p.inventory=Object.keys(E.ITEMS);}
  while(g.phase!=='gameover'&&ticks++<200000){
   if(ticks%113===0)g=E.restore(map,JSON.stringify(g));
   if(g.phase==='ready'){
    if(!E.beginTurn(g))continue;const before=JSON.stringify(g),cmd=chooseAiAction(map,g);assert.equal(JSON.stringify(g),before,'planning must not mutate state or RNG');g=executeCommand(map,g,cmd).state;if(cmd.type==='useItem')used.add(cmd.item);
   }else if(g.phase==='moving'){
    if(g.dicePending)g.dicePending=false;else if(E.choices(map,g).length)E.step(map,g,E.aiDirection(map,g));else{g.remaining=0;g.phase='landed';}
   }else if(g.phase==='resolving')E.advance(map,g);
   else if(g.phase==='landed')E.landing(map,g);
   else if(g.phase==='end')E.nextTurn(map,g);
   else if(g.pending.kind==='minigame'&&g.pending.session.stage==='playing')E.miniTick(g,[0,0,0,0]);
   else E.answer(map,g,...E.aiAnswer(map,g));
  }
  assert.equal(g.phase,'gameover',`map ${map.id} did not finish after ${ticks} commands`);assert.deepEqual(E.restore(map,JSON.stringify(g)),g);summaries.push({map:map.id,ticks,round:g.round});
 }
 assert.ok(used.size>=20,`only used ${used.size} distinct items`);
 fs.writeFileSync(new URL('../test-results/ai-full-pocket-sessions.json',import.meta.url),JSON.stringify({passed:true,used:[...used],sessions:summaries},null,2));
});
