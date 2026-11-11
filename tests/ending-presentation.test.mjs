import test from 'node:test';import assert from 'node:assert/strict';
import {createGameOverMotion,tickGameOverMotion,gameOverWave,gameOverX} from '../app/src/ending-motion.mjs';
import {monthlyLeader,monthlyBackground,monthlyBarHeight,monthlyPanelY} from '../app/src/monthly-presentation.mjs';
test('GAME OVER retains staggered entrance then finite native 19-sample wave without modifying prior state',()=>{
 let state=createGameOverMotion();assert.deepEqual(state.counters,[-44,-54,-64,-74,-84,-94,-104,-114]);assert.deepEqual(gameOverX,[1,81,158,253,337,424,499,568]);
 const original=structuredClone(state);let firstReady=-1;for(let n=0;n<1000;n++){state=tickGameOverMotion(state);if(state.phase===1&&firstReady<0)firstReady=n+1;assert.ok(state.y.every(Number.isFinite));if(n>60)assert.ok(state.y.every(y=>y>=182&&y<=189));}
 assert.equal(firstReady,32);assert.deepEqual(original,createGameOverMotion());assert.equal(gameOverWave.length,19);
});
test('monthly winner backgrounds preserve first-seat tie, eliminated exclusion and yellow special bitmap',()=>{
 const players=['doraemon','nobita','dorami','yellow'].map(character=>({character,eliminated:false}));
 assert.equal(monthlyLeader(players,[100,100,50,0]),0);players[0].eliminated=true;assert.equal(monthlyLeader(players,[1000,100,50,0]),1);
 assert.equal(monthlyBackground('doraemon',3),71);assert.equal(monthlyBackground('dorami',2),66);assert.equal(monthlyBackground('yellow',3),54);
 assert.equal(monthlyLeader(players,[-4,-3,-5,-6]),1);
});
test('native monthly slide and damped bounce settle; bars use four-pixel increments and 216 max',()=>{
 assert.equal(monthlyPanelY(0),480);assert.equal(monthlyPanelY(15),0);assert.equal(monthlyPanelY(45),0);assert.ok(monthlyPanelY(16)<0);
 assert.equal(monthlyBarHeight(100,100,1),4);assert.equal(monthlyBarHeight(100,100,54),216);assert.equal(monthlyBarHeight(25,100,54),56);assert.equal(monthlyBarHeight(-5,100,20),0);assert.equal(monthlyBarHeight(0,0,50),0);
});
