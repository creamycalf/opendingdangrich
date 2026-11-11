import fs from 'node:fs';import assert from 'node:assert/strict';
import * as E from '../app/src/engine.mjs';import {chooseAiAction} from '../app/src/ai-action.mjs';
const report={status:'running',sessions:[],items:new Set(),minigames:new Set()},start=Date.now();
for(let id=0;id<8;id++)for(let sample=0;sample<3;sample++){
 const map=JSON.parse(fs.readFileSync(new URL(`../app/public/assets/maps/${id}.json`,import.meta.url)));
 const players=Array.from({length:4},(_,i)=>({character:E.CHARACTERS[(i+sample*2)%6].id,control:'ai'}));
 let g=E.createGame(map,{seed:1001+id*173+sample*997,maxRounds:120,startDate:'2000-01-29',players}),commands=0;
 while(g.phase!=='gameover'&&commands++<2000000){
  if(commands%997===0)g=E.restore(map,JSON.stringify(g));
  if(g.phase==='ready'){if(!E.beginTurn(g))continue;const c=chooseAiAction(map,g);if(c.type==='roll')E.roll(g);else{E.useItem(map,g,c.item,c.target);report.items.add(c.item);}}
  else if(g.phase==='moving'){if(g.dicePending)g.dicePending=false;else if(E.choices(map,g).length)E.step(map,g,E.aiDirection(map,g));else{g.remaining=0;g.phase='landed';}}
  else if(g.phase==='resolving')E.advance(map,g);
  else if(g.phase==='landed')E.landing(map,g);
  else if(g.phase==='end')E.nextTurn(map,g);
  else if(g.pending.kind==='minigame'&&g.pending.session.stage==='playing'){report.minigames.add(g.pending.session.id);E.miniTick(g,[0,0,0,0]);}
  else E.answer(map,g,...E.aiAnswer(map,g));
 }
 assert.equal(g.phase,'gameover',`map ${id} sample ${sample} stuck in ${g.phase}`);assert.deepEqual(E.restore(map,JSON.stringify(g)),g);
 report.sessions.push({map:id,sample,characters:players.map(p=>p.character),commands,days:g.round,eliminated:g.players.filter(p=>p.eliminated).length,winners:g.winners,reason:g.endReason});
 fs.writeFileSync('test-results/full-game-soak.json',JSON.stringify({...report,items:[...report.items],minigames:[...report.minigames],elapsedMs:Date.now()-start},null,2));console.log(id,sample,commands,g.round,'passed');
}
report.status='passed';fs.writeFileSync('test-results/full-game-soak.json',JSON.stringify({...report,items:[...report.items],minigames:[...report.minigames],elapsedMs:Date.now()-start},null,2));
