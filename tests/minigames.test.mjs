import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tickMatchPlayer,createMiniGame,tickMiniGame,miniRewards,validMiniGame} from '../app/src/minigames.mjs';
import {createGame,restore,RULESET} from '../app/src/engine.mjs';
import {executeCommand,replayCommands} from '../app/src/commands.mjs';
import {tickRace,raceRewards} from '../app/src/minigame-race.mjs';
import {tickGrow,growRewards,createGrowPlayer} from '../app/src/minigame-grow.mjs';
import {createObstacles,tickObstacles} from '../app/src/minigame-obstacles.mjs';
import {tickObstacleRace,obstacleRaceRewards,validObstacleRace} from '../app/src/minigame-obstacle-race.mjs';
import {rpsWins,rpsAI,createRpsPlayer,tickRps,rpsRewards,validRps} from '../app/src/minigame-rps.mjs';
import {createJumpPlayer,tickJump,jumpRewards,validJump} from '../app/src/minigame-jump.mjs';
import {createCatchPlayer,createCatch,tickCatch,catchRewards,validCatch} from '../app/src/minigame-catch.mjs';
import {createPosePlayer,createPose,tickPose,poseRewards,validPose} from '../app/src/minigame-pose.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('fixtures/original-minigame6.json',import.meta.url)));
const map=JSON.parse(fs.readFileSync(new URL('../app/public/assets/maps/4.json',import.meta.url)));

test('MGame01 complete rounds match original real/fake actions, reverse animations, falls and AI',()=>{
  const f=JSON.parse(fs.readFileSync(new URL('fixtures/original-minigame1.json',import.meta.url)));
  for(const trace of f.traces){
    const players=['doraemon','nobita','dorami','shizuka'].map(character=>({character,control:trace.pattern==='ai'?'ai':'human',eliminated:false}));
    const s={id:1,stage:'playing',remaining:1800,...createPose(),players:players.map((_,i)=>createPosePlayer(i))};
    const observed=()=>{const {id,stage,...state}=structuredClone(s);state.done=stage==='result';if(state.done)state.players.forEach(p=>p.score*=20);return state;};
    assert.deepEqual(observed(),trace.initial);
    for(const [t,row] of trace.rows.entries()){
      const draws=structuredClone(row.draws);tickPose(s,players,row.inputs,n=>{const d=draws.shift();assert.ok(d,`${trace.pattern} draw ${t}`);assert.equal(n,d[0]);return d[1];});
      assert.deepEqual(observed(),row.state,`${trace.pattern} tick ${t}`);assert.equal(draws.length,0);assert.ok(validPose(s,players),`${trace.pattern} validation ${t}`);
    }
    assert.deepEqual(poseRewards(s),trace.rows.at(-1).state.players.map(p=>p.score));
  }
});

test('MGame01 early elimination and zero-clock finish persist every frame and replay payout once',()=>{
  for(const follow of [false,true]){
    let g=createGame(map,{seed:42,startDate:'2000-05-02'});g.players.forEach(p=>p.control='human');g.players[3].eliminated=true;
    g.phase='prompt';g.pending={kind:'minigame',session:createMiniGame(1,g.players,()=>0)};
    const initial=structuredClone(g),commands=[];const send=c=>{commands.push(c);g=executeCommand(map,g,c).state;};send({type:'answer',action:'start'});
    let zeroPlaying=false;
    for(let t=0;g.pending.session.stage==='playing';t++){
      assert.ok(t<2000);const s=g.pending.session;
      const inputs=s.players.map(p=>!follow||!p||s.phase!==2||p.mode===3||p.mode===4||p.mode===6?0:(p.pose^1)===s.leader.pose?4:(p.pose^2)===s.leader.pose?8:0);
      send({type:'miniTick',inputs});g=restore(map,JSON.stringify(g));
      if(g.pending.session.remaining===0&&g.pending.session.stage==='playing')zeroPlaying=true;
    }
    const s=g.pending.session;if(follow){assert.ok(zeroPlaying);assert.ok(s.players[0].score>10);}else assert.ok(s.remaining>0);
    const awards=miniRewards(s),cash=g.players.map(p=>p.cash);assert.equal(awards[3],0);
    send({type:'answer',action:'collect'});g.players.forEach((p,i)=>assert.equal(p.cash,cash[i]+awards[i]));assert.throws(()=>executeCommand(map,g,{type:'answer',action:'collect'}));assert.deepEqual(replayCommands(map,{format:'dingdang-replay-v1',initial,commands}),g);
  }
});

test('MGame00 full rounds match original food/bomb spawns, turn locks, collision priority and AI',()=>{
  const f=JSON.parse(fs.readFileSync(new URL('fixtures/original-minigame0.json',import.meta.url)));
  for(const trace of f.traces){
    const players=Array.from({length:4},()=>({control:trace.pattern==='ai'?'ai':'human',eliminated:false}));
    let draws=structuredClone(trace.setup);const draw=n=>{const d=draws.shift();assert.ok(d);assert.equal(n,d[0]);return d[1];};
    const s={id:0,stage:'playing',remaining:1350,...createCatch(draw),players:players.map((_,i)=>createCatchPlayer(i))};
    assert.deepEqual(s.drops,trace.initial.drops);assert.deepEqual(s.players,trace.initial.players);assert.equal(draws.length,0);
    for(const [t,row] of trace.rows.entries()){
      draws=structuredClone(row.draws);tickCatch(s,players,row.inputs,draw);
      assert.deepEqual({remaining:s.remaining,done:s.stage==='result',players:s.players,drops:s.drops,rewards:s.stage==='result'?catchRewards(s):s.players.map(p=>p.score)},row.state,`${trace.pattern} tick ${t}`);
      assert.equal(draws.length,0);assert.ok(validCatch(s,players),`${trace.pattern} validation ${t}`);
    }
  }
});

test('MGame00 held directions and zero-clock settlement survive saves, eliminated players and replay',()=>{
  let g=createGame(map,{startDate:'2000-05-02'});g.players[2].eliminated=true;let r=0;
  g.phase='prompt';g.pending={kind:'minigame',session:createMiniGame(0,g.players,n=>(r++*13)%n)};
  const initial=structuredClone(g),commands=[];const send=c=>{commands.push(c);g=executeCommand(map,g,c).state;};send({type:'answer',action:'start'});
  for(let t=0;t<1350;t++){send({type:'miniTick',inputs:[t%200<100?4:8,0,0,0]});g=restore(map,JSON.stringify(g));}
  assert.equal(g.pending.session.remaining,0);assert.equal(g.pending.session.stage,'playing');send({type:'miniTick',inputs:[0,0,0,0]});
  assert.equal(g.pending.session.stage,'result');g=restore(map,JSON.stringify(g));const awards=miniRewards(g.pending.session),cash=g.players.map(p=>p.cash);assert.equal(awards[2],0);
  send({type:'answer',action:'collect'});g.players.forEach((p,i)=>assert.equal(p.cash,cash[i]+awards[i]));assert.throws(()=>executeCommand(map,g,{type:'answer',action:'collect'}));assert.deepEqual(replayCommands(map,{format:'dingdang-replay-v1',initial,commands}),g);
});

test('MGame07 complete rounds match original jump physics, spring timing, food collision and AI',()=>{
  const f=JSON.parse(fs.readFileSync(new URL('fixtures/original-minigame7.json',import.meta.url)));
  for(const trace of f.traces){
    const players=Array.from({length:4},()=>({control:trace.pattern==='ai'?'ai':'human',eliminated:false}));
    const s={id:7,stage:'playing',remaining:1350,food:trace.initial.food,foodIndex:[0,0,0,0],players:players.map((_,i)=>createJumpPlayer(i))};
    assert.deepEqual(s.players,trace.initial.players);
    for(const [t,row] of trace.rows.entries()){
      const draws=structuredClone(row.draws);tickJump(s,players,row.inputs,n=>{const d=draws.shift();assert.ok(d);assert.equal(n,d[0]);return d[1];});
      const expected=structuredClone(row.state.players);if(row.state.done)expected.forEach(p=>p.score/=10);
      assert.deepEqual(s.players,expected,`${trace.pattern} tick ${t}`);assert.deepEqual(s.foodIndex,row.state.foodIndex);assert.equal(s.remaining,row.state.remaining);assert.equal(draws.length,0);assert.ok(validJump(s,players),`${trace.pattern} validation ${t}`);
    }
    assert.equal(s.stage,'result');assert.deepEqual(jumpRewards(s),trace.rows.at(-1).state.players.map(p=>p.score));
  }
});

test('MGame07 serializes every frame including grabbing, returns rewards once and replays',()=>{
  for(const seed of [1,42,987654321]){
    let g=createGame(map,{seed,startDate:'2000-05-02'}),n=0;g.players[3].eliminated=true;
    g.phase='prompt';g.pending={kind:'minigame',session:createMiniGame(7,g.players,limit=>(n++)%limit)};
    const initial=structuredClone(g),commands=[];const send=c=>{commands.push(c);g=executeCommand(map,g,c).state;};send({type:'answer',action:'start'});
    for(let t=0;t<1350;t++){
      const p=g.pending.session.players[0],input=p.mode===8&&p.spring.age===10?4:p.mode!==8?8:0;
      send({type:'miniTick',inputs:[input,0,0,0]});g=restore(map,JSON.stringify(g));
    }
    assert.ok(g.pending.session.players[0].score>30);const awards=miniRewards(g.pending.session),cash=g.players.map(p=>p.cash);assert.equal(awards[3],0);
    send({type:'answer',action:'collect'});g.players.forEach((p,i)=>assert.equal(p.cash,cash[i]+awards[i]));assert.throws(()=>executeCommand(map,g,{type:'answer',action:'collect'}));assert.deepEqual(replayCommands(map,{format:'dingdang-replay-v1',initial,commands}),g);
  }
});

test('MGame05 full rounds match original targets, animation flags, cooldown, character AI and delayed score',()=>{
  const f=JSON.parse(fs.readFileSync(new URL('fixtures/original-minigame5.json',import.meta.url)));
  for(const trace of f.traces){
    const players=['doraemon','nobita','dorami','shizuka'].map(character=>({character,control:trace.pattern==='ai'?'ai':'human',eliminated:false}));
    const s={id:5,stage:'playing',remaining:1350,players:players.map((_,i)=>createRpsPlayer(i))};
    assert.deepEqual(s.players.map(({slot,...p})=>p),trace.initial.players);
    for(const [t,row] of trace.rows.slice(0,1350).entries()){
      const draws=structuredClone(row.draws);tickRps(s,players,row.inputs,n=>{const d=draws.shift();assert.ok(d);assert.equal(n,d[0]);return d[1];});
      assert.equal(s.remaining,row.state.remaining);assert.equal(draws.length,0);
      assert.deepEqual(s.players.map(({slot,...p})=>p),row.state.players,`${trace.pattern} tick ${t}`);
      assert.ok(validRps(s,players),`${trace.pattern} validation ${t}`);
    }
    assert.equal(s.stage,'result');assert.deepEqual(rpsRewards(s),trace.rows.at(-1).state.players.map(p=>p.score));
  }
});

test('MGame05 choice outcome and AI decisions match original x86 across character parameters',()=>{
  const f=JSON.parse(fs.readFileSync(new URL('fixtures/original-minigame5-rules.json',import.meta.url)));
  for(const [choice,target,result] of f.pairs)assert.equal(Number(rpsWins(choice,target)),result);
  for(const row of f.rows){const draws=structuredClone(row.draws);assert.equal(rpsAI(row.choice,row.target,row.recognition,row.decision,n=>{const d=draws.shift();assert.equal(n,d[0]);return d[1];}),row.action);assert.equal(draws.length,0);}
});

test('MGame05 touch commands persist every frame, exclude eliminated players and pay once after replay',()=>{
  for(const eliminated of [false,true]){
    let g=createGame(map,{startDate:'2000-05-02'});g.players[3].eliminated=eliminated;
    g.phase='prompt';g.pending={kind:'minigame',session:createMiniGame(5,g.players,()=>0)};
    const initial=structuredClone(g),commands=[];const send=c=>{commands.push(c);g=executeCommand(map,g,c).state;};send({type:'answer',action:'start'});
    for(let t=0;t<1350;t++){
      const p=g.pending.session.players[0],input=p.actor.mode===2&&p.target.mode===1?(rpsWins(p.selector.choice,p.target.choice)?4:8):0;
      send({type:'miniTick',inputs:[input,0,0,0]});g=restore(map,JSON.stringify(g));
    }
    assert.ok(g.pending.session.players[0].score>30);const rewards=miniRewards(g.pending.session),cash=g.players.map(p=>p.cash);if(eliminated)assert.equal(rewards[3],0);
    send({type:'answer',action:'collect'});g.players.forEach((p,i)=>assert.equal(p.cash,cash[i]+rewards[i]));
    assert.throws(()=>executeCommand(map,g,{type:'answer',action:'collect'}));assert.deepEqual(replayCommands(map,{format:'dingdang-replay-v1',initial,commands}),g);
  }
});

test('MGame04 entire active rounds match original movement, draw ticks, collisions, rank and reward',()=>{
  const f=JSON.parse(fs.readFileSync(new URL('fixtures/original-minigame4.json',import.meta.url)));
  for(const trace of f.traces){
    const s={...structuredClone(trace.initial),stage:'playing'};s.players.forEach((p,i)=>p.slot=i);
    for(const [i,row] of trace.rows.entries()){
      const draws=structuredClone(row.draws);tickObstacleRace(s,Array.from({length:4},()=>({control:'human'})),row.inputs,n=>{const d=draws.shift();assert.ok(d);assert.equal(n,d[0]);return d[1];});
      assert.deepEqual({camera:s.camera,remaining:s.remaining,finishOrder:s.finishOrder,obstacles:s.obstacles,players:s.players.map(({slot,...p})=>p),done:s.stage==='result',rewards:s.stage==='result'?obstacleRaceRewards(s):s.players.map(p=>p.score)},row.state,trace.pattern+' tick '+i);assert.equal(draws.length,0);
      assert.ok(validObstacleRace(s,Array.from({length:4},()=>({eliminated:false}))),trace.pattern+' validation '+i);
    }
  }
});

test('MGame04 obstacle controller matches 1200 original updates including 20 regeneration cycles',()=>{
  const f=JSON.parse(fs.readFileSync(new URL('fixtures/original-minigame4-obstacles.json',import.meta.url)));
  let draws=structuredClone(f.setup);const draw=n=>{const d=draws.shift();assert.ok(d);assert.equal(n,d[0]);return d[1];};
  const o=createObstacles(f.initial.width,draw);assert.deepEqual(o,f.initial);assert.equal(draws.length,0);
  for(const [i,row] of f.rows.entries()){draws=structuredClone(row.draws);tickObstacles(o,draw);assert.deepEqual(o,row.state,'tick '+i);assert.equal(draws.length,0);}
});

test('MGame04 AI and human games persist every frame and collect rewards exactly once',()=>{
  for(const controls of [['human','ai','ai','ai'],['ai','ai','ai','ai']]){
    let g=createGame(map,{startDate:'2000-05-02'});g.players.forEach((p,i)=>p.control=controls[i]);
    let seed=123;const draw=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return Math.floor(seed*n/4294967296);};
    g.phase='prompt';g.pending={kind:'minigame',session:createMiniGame(4,g.players,draw)};
    const initial=structuredClone(g),commands=[];const send=c=>{commands.push(c);g=executeCommand(map,g,c).state;};
    send({type:'answer',action:'start'});
    for(let t=0;g.pending.session.stage==='playing';t++){assert.ok(t<900);send({type:'miniTick',inputs:[t%2?4:0,0,0,0]});g=restore(map,JSON.stringify(g));}
    const rewards=miniRewards(g.pending.session),cash=g.players.map(p=>p.cash);send({type:'answer',action:'collect'});
    g.players.forEach((p,i)=>assert.equal(p.cash,cash[i]+rewards[i]));assert.throws(()=>executeCommand(map,g,{type:'answer',action:'collect'}));
    assert.deepEqual(replayCommands(map,{format:'dingdang-replay-v1',initial,commands}),g);
  }
});

test('MGame03 full sessions match original alternating keys, growth cap, character AI and reward lag',()=>{
  const f=JSON.parse(fs.readFileSync(new URL('fixtures/original-minigame3.json',import.meta.url)));
  for(const trace of f.traces){
    const players=['doraemon','nobita','dorami','shizuka'].map(character=>({character,control:trace.pattern==='ai'?'ai':'human',eliminated:false}));
    const s={id:3,stage:'playing',remaining:450,players:players.map((_,i)=>createGrowPlayer(i))};
    for(const [t,row] of trace.rows.slice(0,450).entries()){
      const draws=structuredClone(row.draws);tickGrow(s,players,row.inputs,n=>{const d=draws.shift();assert.ok(d);assert.equal(n,d[0]);return d[1];});
      assert.equal(s.remaining,row.state.remaining);assert.equal(draws.length,0);assert.ok(validMiniGame(s,players));
      assert.deepEqual(s.players.map(({slot,beamAge,...p})=>p),row.state.players,`${trace.pattern} tick ${t}`);
    }
    assert.equal(s.stage,'result');assert.deepEqual(growRewards(s),trace.rows.at(-1).state.players.map(p=>p.score));
  }
});
test('MGame02 full races match original physics, input edge handling, ranking, timer and payout',()=>{
  const raceFixture=JSON.parse(fs.readFileSync(new URL('fixtures/original-minigame2.json',import.meta.url)));
  for(const trace of raceFixture.traces){
    const s={...structuredClone(trace.initial),stage:'playing',id:2};s.players.forEach((p,i)=>p.slot=i);
    for(const [index,row] of trace.rows.entries()){
      const draws=structuredClone(row.draws);
      tickRace(s,Array.from({length:4},()=>({control:'human'})),row.inputs,n=>{const d=draws.shift();assert.ok(d);assert.equal(n,d[0]);return d[1];});
      const actual={camera:s.camera,remaining:s.remaining,finishOrder:s.finishOrder,players:s.players.map(({slot,...p})=>p),done:s.stage==='result',rewards:s.stage==='result'?raceRewards(s):s.players.map(p=>p.score)};
      assert.deepEqual(actual,row.state,`${trace.pattern} tick ${index}`);assert.equal(draws.length,0);
    }
  }
});
test('MGame06 input, ring scroll, scoring and animation lock match 520 original x86 updates',()=>{
  for(const trace of fixture.traces){
    const p={...structuredClone(trace.initial),slot:0,age:0};delete p.frame;
    for(const row of trace.rows){
      const draws=structuredClone(row.draws);tickMatchPlayer(p,row.input,n=>{const d=draws.shift();assert.ok(d);assert.equal(n,d[0]);return d[1];});
      const actual={...p};delete actual.age;delete actual.slot;const expected={...row.state};delete expected.frame;
      assert.deepEqual(actual,expected,`tick ${row.tick}`);assert.equal(draws.length,0);
    }
  }
});
test('game room runs timed game, persists mid-play, pays every survivor once and replays',()=>{
  let g=createGame(map,{startDate:'2000-05-02'});g.players[2].eliminated=true;
  let seed=1;const draw=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return Math.floor(seed/4294967296*n);};
  g.phase='prompt';g.pending={kind:'minigame',session:createMiniGame(6,g.players,draw)};
  const initial=structuredClone(g),commands=[];
  const send=c=>{commands.push(c);g=executeCommand(map,g,c).state;};
  send({type:'answer',action:'start'});
  for(let i=0;i<600;i++){
    const s=g.pending.session,p=s.players[0];const left=p.ring[(p.start+6)%14]===p.ring[p.target];
    send({type:'miniTick',inputs:[left?4:8,0,0,0]});
    if(i===250)g=restore(map,JSON.stringify(g));
  }
  assert.equal(g.pending.session.stage,'result');assert.ok(g.pending.session.players[0].score>40);
  assert.ok(validMiniGame(g.pending.session,g.players));const awards=miniRewards(g.pending.session),before=g.players.map(p=>p.cash);
  const failed=structuredClone(g);assert.throws(()=>executeCommand(map,g,{type:'miniTick',inputs:[0,0,0,0]}));assert.deepEqual(g,failed);
  send({type:'answer',action:'collect'});g.players.forEach((p,i)=>assert.equal(p.cash,before[i]+awards[i]));
  assert.throws(()=>executeCommand(map,g,{type:'answer',action:'collect'}));
  assert.deepEqual(replayCommands(map,{format:'dingdang-replay-v1',initial,commands}),g);
});
test('damaged minigame state and malformed inputs cannot mutate a saved round',()=>{
  let g=createGame(map);let r=0;g.phase='prompt';g.pending={kind:'minigame',session:createMiniGame(6,g.players,n=>(r++)%n)};
  assert.equal(restore(map,JSON.stringify(g)).ruleset,RULESET);
  const copy=structuredClone(g);copy.pending.session.players[0].ring[0]=500;assert.throws(()=>restore(map,JSON.stringify(copy)));
  g=executeCommand(map,g,{type:'answer',action:'start'}).state;
  for(const inputs of [null,[],[0,0,0,16],[0,0,0,0,0]])assert.throws(()=>executeCommand(map,g,{type:'miniTick',inputs}));
  assert.equal(g.pending.session.remaining,600);
});
