import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame,daysInTerm,nextTurn,restore} from '../app/src/engine.mjs';
const map=JSON.parse(readFileSync(new URL('../app/public/assets/maps-v126/4.json',import.meta.url)));
test('calendar term crosses leap day, restores and settles on its anniversary',()=>{
  const startDate='2023-11-04';
  assert.equal(daysInTerm(startDate,1),366);
  const game=createGame(map,{maxYears:1,startDate});
  game.round=366; game.turn=3; game.phase='end';
  const saved=restore(map,JSON.stringify(game));
  nextTurn(map,saved);
  assert.equal(saved.phase,'gameover');
  assert.match(saved.endReason,/年期届满/);
  for(let years=1;years<=8;years++){
    const current=createGame(map,{startDate,maxYears:years});
    assert.equal(restore(map,JSON.stringify(current)).maxYears,years);
  }
});
test('unlimited games and existing 30-day mobile saves remain playable',()=>{
  for(const limit of [0,30,60,120]){
    const saved=createGame(map,{maxRounds:limit});
    assert.equal(restore(map,JSON.stringify(saved)).maxRounds,limit);
  }
});
