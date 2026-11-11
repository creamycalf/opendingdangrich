import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {originalDirectionMask} from '../app/src/navigation.mjs';
import * as E from '../app/src/engine.mjs';
const map=JSON.parse(fs.readFileSync(new URL('../app/public/assets/town.json',import.meta.url)));
const oracle=JSON.parse(fs.readFileSync(new URL('./fixtures/original-town-navigation.json',import.meta.url)));
test('navigation agrees with original x86 for all town road cells and headings',()=>{
  const free=(x,y)=>x>=0&&y>=0&&x<map.width&&y<map.height&&E.walkable(map.cells[y*map.width+x]);
  for(const [at,...masks] of oracle.rows){
    const c=map.cells[at];
    for(let d=0;d<4;d++)assert.equal(originalDirectionMask(c.x,c.y,d,free),masks[d],`(${c.x},${c.y}), heading ${d}`);
  }
});
test('town northbound player does not turn into the other lane after the start junction',()=>{
  const g=E.createGame(map);g.turn=1;
  const p=g.players[1];p.at=23*map.width+24;p.previous=24*map.width+24;p.direction=0;
  assert.deepEqual(E.choices(map,g),[22*map.width+24]);
});
test('all eight extracted maps match their original machine-code navigation oracle',()=>{
  let cases=0,shops=0;
  for(let number=0;number<8;number++){
    const board=JSON.parse(fs.readFileSync(new URL(`../app/public/assets/maps/${number}.json`,import.meta.url)));
    const expected=JSON.parse(fs.readFileSync(new URL(`./fixtures/original-map-${number}-navigation.json`,import.meta.url)));
    assert.equal(board.cells.length,board.width*board.height);
    assert.equal(board.starts.length,4);
    assert.equal(board.rawConfig.length,0x118*2);
    for(const s of board.starts)assert.ok(E.walkable(board.cells[s.y*board.width+s.x]));
    for(const s of board.shops){assert.equal(board.cells[s.y*board.width+s.x].event,5);assert.equal(s.rawParameters.length,84);shops++;}
    const free=(x,y)=>x>=0&&y>=0&&x<board.width&&y<board.height&&E.walkable(board.cells[y*board.width+x]);
    for(const [at,...masks] of expected.rows){
      const c=board.cells[at];
      for(let d=0;d<4;d++){
        assert.equal(originalDirectionMask(c.x,c.y,d,free),masks[d],`map ${number}, (${c.x},${c.y}), heading ${d}`);cases++;
      }
    }
  }
  assert.equal(cases,4684);assert.equal(shops,23);
});
test('all eight map sessions can finish and resume under the currently implemented rules',()=>{
  for(let number=0;number<8;number++){
    const board=JSON.parse(fs.readFileSync(new URL(`../app/public/assets/maps/${number}.json`,import.meta.url)));
    let g=E.createGame(board,{seed:100+number,maxRounds:30,startDate:'2000-04-03'}),ticks=0;
    while(g.phase!=='gameover'&&ticks++<100000){
      if(ticks%37===0)g=E.restore(board,JSON.stringify(g));
      if(g.phase==='ready'){if(E.beginTurn(g))E.roll(g);}
      else if(g.phase==='moving'&&g.dicePending)g.dicePending=false;
  else if(g.phase==='moving'){assert.ok(E.choices(board,g).length,`map ${number} stranded`);E.step(board,g,E.aiDirection(board,g));}
      else if(g.phase==='landed')E.landing(board,g);
      else if(g.phase==='resolving')E.advance(board,g);
      else if(g.phase==='prompt'&&g.pending.kind==='minigame'&&g.pending.session.stage==='playing')E.miniTick(g,[0,0,0,0]);
  else if(g.phase==='prompt')E.answer(board,g,...E.aiAnswer(board,g));
      else if(g.phase==='end')E.nextTurn(board,g);
    }
    assert.equal(g.phase,'gameover',`map ${number} did not finish`);
    assert.deepEqual(E.restore(board,JSON.stringify(g)),g);
  }
});
