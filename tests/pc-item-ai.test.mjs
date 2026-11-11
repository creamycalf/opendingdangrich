import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {initialItemAi,scoreOriginalItem,prepareOriginalItemRanks,updateOriginalItemWeights,originalItemGroup,selectOriginalItem,originalAiAttacked,originalAiRent} from '../app/src/pc-item-ai.mjs';
import * as E from '../app/src/engine.mjs';
import {executeCommand,replayCommands} from '../app/src/commands.mjs';
import {originalItemContext} from '../app/src/pc-item-ai-adapter.mjs';
const evidence=JSON.parse(fs.readFileSync(new URL('../research/pc-v126-item-ai.json',import.meta.url)));
const hostility=JSON.parse(fs.readFileSync(new URL('../research/pc-v126-ai-hostility.json',import.meta.url)));
const maps=Array.from({length:8},(_,id)=>JSON.parse(fs.readFileSync(new URL(`../app/public/assets/maps-v126/${id}.json`,import.meta.url))));
test('42 original item score/target branches match 14112 native executions',()=>{
 for(const {context,results} of evidence.rows)for(let id=0;id<42;id++){
  const calls=[],actual=scoreOriginalItem(id,{...context,pickRoad:()=>{calls.push(20,20);return [20,20];}}),{randomCalls,...want}=results[id];
  delete actual.scanStop;
  assert.deepEqual(actual,want,`${context.character} item ${id}`);assert.deepEqual(calls,randomCalls);
 }
});
test('native wealth/opponent ranking, eliminated seats and low-bank preference mutations',()=>{
 for(const {character,who,players,opponents,...want} of evidence.ranks){const state=initialItemAi(character);assert.deepEqual(prepareOriginalItemRanks({character,who,players},state),want);assert.deepEqual(state.opponents,opponents);}
});
test('native persistent item weights and opponent updates match 336 contextual passes',()=>{
 for(const {row,weights,opponents} of evidence.weights){const c=evidence.rows[row].context,state=initialItemAi(c.character);assert.deepEqual(updateOriginalItemWeights(c,state),{weights,opponents});}
});
test('native random grouping matches all 8400 profile/draw/property-boundary/capability combinations',()=>{
 for(const [character,propertyCount,canUse,draw,bit,group,calls] of evidence.groups){const actual=[];assert.equal(originalItemGroup(character,propertyCount,canUse,n=>{actual.push(n);return n===100?draw:bit;}),group);assert.deepEqual(actual,calls);}
});
test('complete native sort/group/two-pass scan/legality/weight lifecycle matches 1008 decisions',()=>{
 for(const row of evidence.selections){
  const c={...evidence.rows[row.row].context,propertyCount:row.propertyCount,inventory:row.inventory},state={weights:[...evidence.weights[row.row].weights],opponents:[]},calls=[],attempts=[];
  c.pickRoad=()=>{calls.push(20,20);return [20,20];};
  const selected=selectOriginalItem(c,state,n=>{calls.push(n);return n===100?row.draw:row.bit;},id=>{attempts.push(id);return row.legalMode===2||row.legalMode===1&&id%2===0;});
  if(selected){delete selected.score;delete selected.scanStop;}
  assert.deepEqual(selected,row.selected,`row ${row.row}, legal ${row.legalMode}`);assert.deepEqual(state.weights,row.weights);assert.deepEqual(calls,row.randomCalls);assert.deepEqual(attempts,row.attempts);
 }
});
test('native attachment hostility and connected-rent preference increments',()=>{
 for(const [character,source,item,want] of hostility.attack){const p={character,itemAi:{...initialItemAi(character),seat:0}};originalAiAttacked(p,source,item);assert.deepEqual(p.itemAi.opponents,want);}
 for(const [character,owner,ownerCharacter,count,want] of hostility.rent){const p={character,itemAi:{...initialItemAi(character),seat:0}};if(owner!==0)originalAiRent(p,ownerCharacter,count);assert.deepEqual(p.itemAi.opponents,want);}
});
test('aiAction chooses and executes atomically, returns visual action, and restores all new state',()=>{
 let used=0,rolled=0;
 for(const map of maps)for(let seed=1;seed<=16;seed++){
  const g=E.createGame(map,{seed,players:['yellow','gian','suneo','dorami'].map(character=>({character,control:'ai'}))}),before=JSON.stringify(g);
  const result=executeCommand(map,g,{type:'aiAction',animated:false});assert.equal(JSON.stringify(g),before);
  assert.ok(['useItem','roll'].includes(result.action.type));assert.deepEqual(E.restore(map,JSON.stringify(result.state)),result.state);
  if(result.action.type==='roll'){rolled++;assert.equal(result.action.animated,false);assert.equal(result.state.phase,'moving');}
  else{used++;assert.ok(['end','prompt'].includes(result.state.phase));}
  const again=executeCommand(map,g,{type:'aiAction',animated:false});assert.deepEqual(again,result);
 }
 assert.ok(used>0&&rolled>0);
});
test('real adapter retains default capability masks and distinguishes sleep from skip/dwarf state',()=>{
 const g=E.createGame(maps[4]),state=g.players[0].itemAi;
 let c=originalItemContext(maps[4],g,state);assert.deepEqual(c.capabilities,[0xfff,0xfff,0xfff,0xfff]);
 g.players[1].skip=1;g.players[2].itemSleeping=true;g.players[3].effects.push({id:'original-14',source:3,remaining:5,active:true});
 c=originalItemContext(maps[4],g,state);assert.deepEqual(c.sleeping,[false,false,true,false]);assert.deepEqual(c.flags,[0,0,0,0x1000]);
});
test('new AI metadata validates while old saves do not acquire strategy state',()=>{
 const map=maps[4],g=E.createGame(map);assert.equal(g.itemAiVersion,'pc-v126');
 for(const corrupt of [p=>p.weights.pop(),p=>p.opponents.push(0),p=>p.weights[0]=0.5,p=>p.seat=3,p=>p.propertyOrder=[-1]]){const bad=structuredClone(g);corrupt(bad.players[0].itemAi);assert.throws(()=>E.restore(map,JSON.stringify(bad)),/存档/);}
 const old=structuredClone(g);delete old.itemAiVersion;for(const p of old.players)delete p.itemAi;old.history.slots.fill(null);const loaded=E.restore(map,JSON.stringify(old));assert.equal(loaded.itemAiVersion,undefined);assert.equal(loaded.players[0].itemAi,undefined);
 const before=JSON.stringify(old);executeCommand(map,old,{type:'aiAction',animated:false});assert.equal(JSON.stringify(old),before);
});
test('complete new-AI game is reproducible from atomic commands, including saved RNG and weights',()=>{
 const map=maps[4],initial=E.createGame(map,{seed:141314,maxRounds:30,players:['yellow','gian','suneo','dorami'].map(character=>({character,control:'ai'}))});
 const commands=[];let g=initial;
 for(let steps=0;g.phase!=='gameover'&&steps<100000;steps++){
  let command;
  if(g.phase==='ready')command={type:'aiAction',animated:false};
  else if(g.phase==='moving')command=g.dicePending?{type:'dicePresented'}:E.choices(map,g).length?{type:'aiStep'}:{type:'noExit'};
  else if(g.phase==='landed')command={type:'landing'};
  else if(g.phase==='resolving')command={type:'advance'};
  else if(g.phase==='end')command={type:'nextTurn'};
  else command=g.pending.kind==='minigame'&&g.pending.session.stage==='playing'?{type:'miniTick',inputs:[0,0,0,0]}:{type:'aiAnswer'};
  commands.push(command);g=executeCommand(map,g,command).state;
  if(steps%997===0)g=E.restore(map,JSON.stringify(g));
 }
 assert.equal(g.phase,'gameover');assert.deepEqual(replayCommands(map,{format:'dingdang-replay-v1',initial,commands}),g);
});
