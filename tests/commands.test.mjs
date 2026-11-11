import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as E from '../app/src/engine.mjs';
import {executeCommand,replayCommands} from '../app/src/commands.mjs';

const board=id=>JSON.parse(fs.readFileSync(new URL(`../app/public/assets/maps/${id}.json`,import.meta.url)));
const map=board(4);
const game=()=>E.createGame(map,{seed:72,maxRounds:30,startDate:'2000-04-03'});

test('PC v1.26 draws match execution of the original RNG, including its maximum sample',()=>{
  const oracle=JSON.parse(fs.readFileSync(new URL('./fixtures/pc-v126-random.json',import.meta.url)));
  for(const [seed,range,draw,end] of oracle.rows){
    const g={seed,randomVersion:'pc-v126'};
    assert.equal(E.random(g,range),draw);assert.equal(g.seed,end);
  }
  const board=JSON.parse(fs.readFileSync(new URL('../app/public/assets/maps-v126/4.json',import.meta.url)));
  const fresh=E.createGame(board);
  assert.equal(fresh.randomVersion,'pc-v126');
  const resumed=E.restore(board,JSON.stringify(fresh));assert.equal(E.random(resumed,6),E.random(fresh,6));
  delete fresh.randomVersion;delete fresh.pcAnimatedRoll;
  const old=E.restore(board,JSON.stringify(fresh)),seed=old.seed;
  E.random(old,6);assert.equal(old.seed,(Math.imul(seed,1664525)+1013904223)>>>0);
});

test('PC animation resumes its saved faces and handles a fully blocked turn',()=>{
  const board=JSON.parse(fs.readFileSync(new URL('../app/public/assets/maps-v126/4.json',import.meta.url)));
  const initial=E.createGame(board,{startDate:'2000-04-03'});
  const rolled=executeCommand(board,initial,{type:'roll'}).state;
  assert.ok(rolled.rollPlan.faces.length>=44);
  assert.equal(rolled.dice,rolled.rollPlan.faces.at(-1));
  const restored=E.restore(board,JSON.stringify(rolled));
  assert.deepEqual(restored.rollPlan,rolled.rollPlan);
  const advanced=executeCommand(board,restored,{type:'dicePresented'}).state;
  assert.equal(advanced.seed,rolled.seed);assert.equal(advanced.rollPlan,undefined);
  assert.deepEqual(replayCommands(board,{format:'dingdang-replay-v1',initial,commands:[{type:'roll'},{type:'dicePresented'}]}),advanced);
  const blocked=structuredClone(board);
  blocked.cells.forEach((c,i)=>{if(i!==initial.players[0].at)c.flags&=~128;});
  const zero=executeCommand(blocked,initial,{type:'roll'}).state;
  assert.equal(zero.dice,0);assert.equal(zero.players[0].at,initial.players[0].at);
  const end=executeCommand(board,E.restore(board,JSON.stringify(zero)),{type:'dicePresented'}).state;
  assert.equal(end.phase,'end');assert.equal(end.rollPlan,undefined);
});

test('commands commit a new state; invalid AI movement rolls back its random draws',()=>{
  const initial=game(),before=JSON.stringify(initial),command={type:'roll'};
  const rolled=executeCommand(map,initial,command);
  assert.equal(JSON.stringify(initial),before);
  assert.deepEqual(command,{type:'roll'});
  assert.notEqual(rolled.state,initial);
  assert.equal(rolled.state.dicePending,true);
  assert.equal(rolled.value,rolled.state.dice);
  // aiDirection draws random numbers before step rejects the ready phase.
  assert.throws(()=>executeCommand(map,initial,{type:'aiStep'}),/不可走/);
  assert.equal(JSON.stringify(initial),before);
  assert.throws(()=>executeCommand(board(0),initial,command),/地图/);
  assert.throws(()=>executeCommand(map,initial,{type:'unknown'}),/未知/);
});

test('dice presentation gates movement and survives save and replay without rerolling',()=>{
  const initial=game();
  let state=executeCommand(map,initial,{type:'roll'}).state;
  const pending=JSON.stringify(state),dice=state.dice,seed=state.seed;
  assert.throws(()=>executeCommand(map,state,{type:'aiStep'}),/掷骰展示/);
  assert.throws(()=>executeCommand(map,state,{type:'step',to:E.choices(map,state)[0]}),/掷骰展示/);
  assert.throws(()=>executeCommand(map,state,{type:'noExit'}));
  assert.equal(JSON.stringify(state),pending);
  state=E.restore(map,pending);
  state=executeCommand(map,state,{type:'dicePresented'}).state;
  assert.equal(state.seed,seed);assert.equal(state.dice,dice);
  assert.throws(()=>executeCommand(map,state,{type:'dicePresented'}),/没有待展示/);
  assert.deepEqual(replayCommands(map,{format:'dingdang-replay-v1',initial,commands:[{type:'roll'},{type:'dicePresented'}]}),state);
});

test('every map completes a deterministic command replay, including intermediate save checkpoints',()=>{
  for(let id=0;id<8;id++){
    const map=board(id),initial=E.createGame(map,{seed:72+id,maxRounds:30,startDate:'2000-04-03'});
    const initialText=JSON.stringify(initial),commands=[];
    let state=initial,checkpoint;
    while(state.phase!=='gameover'&&commands.length<30000){
      let command;
      switch(state.phase){
        case 'ready':command={type:'roll'};break;
        case 'moving':command={type:state.dicePending?'dicePresented':'aiStep'};break;
        case 'landed':command={type:'landing'};break;
        case 'resolving':command={type:'advance'};break;
        case 'prompt':command=state.pending.kind==='minigame'&&state.pending.session.stage==='playing'?{type:'miniTick',inputs:[0,0,0,0]}:{type:'aiAnswer'};break;
        case 'end':command={type:'nextTurn'};break;
        default:assert.fail(state.phase);
      }
      state=executeCommand(map,state,command).state;commands.push(command);
      if(commands.length===137)checkpoint={state:E.restore(map,JSON.stringify(state)),offset:commands.length};
    }
    assert.equal(state.phase,'gameover',`map ${id}`);
    assert.equal(JSON.stringify(initial),initialText);
    const record=JSON.parse(JSON.stringify({format:'dingdang-replay-v1',initial,commands}));
    assert.deepEqual(replayCommands(map,record),state,`map ${id} full replay`);
    assert.deepEqual(replayCommands(map,{...record,initial:checkpoint.state,commands:commands.slice(checkpoint.offset)}),state,`map ${id} checkpoint replay`);
  }
});

test('replay rejects incompatible records and identifies the failing command',()=>{
  assert.throws(()=>replayCommands(map,{format:'unknown'}),/格式/);
  assert.throws(()=>replayCommands(map,{format:'dingdang-replay-v1',initial:game(),commands:[{type:'roll'},{type:'roll'}]}),/第 2 条命令/);
});
