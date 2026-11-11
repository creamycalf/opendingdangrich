import fs from 'node:fs';import assert from 'node:assert/strict';
import * as E from '../app/src/engine.mjs';import {chooseAiAction} from '../app/src/ai-action.mjs';
const report={status:'running',pcEconomyVersion:'pc-v126',sessions:[]},start=Date.now();
for(let id=0;id<8;id++)for(const stress of [false,true]){
 if(process.env.QA_MAP!==undefined&&Number(process.env.QA_MAP)!==id||process.env.QA_STRESS!==undefined&&(process.env.QA_STRESS==='true')!==stress)continue;
 const map=JSON.parse(fs.readFileSync(new URL(`../app/public/assets/maps-v126/${id}.json`,import.meta.url)));
 const players=[{character:'yellow',control:'human'},{character:'nobita',control:'ai'},{character:'dorami',control:'human'},{character:'suneo',control:'ai'}];
 let g=E.createGame(map,{seed:11001+id*173+Number(stress)*997,maxRounds:120,startDate:'2000-01-29',players}),commands=0,negativeSnapshots=0,negativeSteps=0;
 if(stress){g.players[0].cash=-100000;g.players[0].bank=5000;}
 while(g.phase!=='gameover'&&commands++<Number(process.env.QA_COMMAND_LIMIT??2000000)){
  const negative=g.players.some(p=>p.cash<0||p.bank<0);if(negative)negativeSteps++;
  if(commands%997===0||negative&&commands%101===0){g=E.restore(map,JSON.stringify(g));if(negative)negativeSnapshots++;}
  if(g.phase==='ready'){if(!E.beginTurn(g))continue;const c=chooseAiAction(map,g);if(c.type==='roll'){E.roll(g,map);delete g.rollPlan;if(!g.remaining)g.phase='end';}else E.useItem(map,g,c.item,c.target);}
  else if(g.phase==='moving'){if(g.dicePending)g.dicePending=false;else if(E.choices(map,g).length)E.step(map,g,E.aiDirection(map,g));else{g.remaining=0;g.phase='landed';}}
  else if(g.phase==='resolving')E.advance(map,g);
  else if(g.phase==='landed')E.landing(map,g);
  else if(g.phase==='end')E.nextTurn(map,g);
  else if(g.pending.kind==='minigame'&&g.pending.session.stage==='playing')E.miniTick(g,[0,0,0,0]);
  else E.answer(map,g,...E.aiAnswer(map,g));
 }
 if(g.phase!=='gameover')fs.writeFileSync('test-results/pc-economy-soak-failure.json',JSON.stringify({id,stress,commands,g}));
 assert.equal(g.phase,'gameover',`map ${id} stress ${stress}`);assert.deepEqual(E.restore(map,JSON.stringify(g)),g);
 report.sessions.push({map:id,stress,commands,days:g.round,negativeSteps,negativeSnapshots,eliminated:g.players.filter(p=>p.eliminated).length,winners:g.winners});
 fs.writeFileSync('test-results/pc-economy-soak.json',JSON.stringify({...report,elapsedMs:Date.now()-start},null,2));console.log(id,stress,commands,negativeSnapshots,'passed');
}
report.status='passed';fs.writeFileSync('test-results/pc-economy-soak.json',JSON.stringify({...report,elapsedMs:Date.now()-start},null,2));
