import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as E from '../app/src/engine.mjs';import {executeCommand,replayCommands} from '../app/src/commands.mjs';
const map=JSON.parse(fs.readFileSync(new URL('../app/public/assets/maps/4.json',import.meta.url)));
test('relocation swaps building ownership and levels while fixed land prices remain unchanged',()=>{
 let g=E.createGame(map,{startDate:'2000-04-03'});g.players[0].inventory=['original-21'];const lots=map.cells.flatMap((c,i)=>c.event===1?[i]:[]),[first,second]=lots;
 g.owners[first]=1;g.levels[first]=4;g.kinds[first]=1;g.owners[second]=2;g.levels[second]=2;g.kinds[second]=1;
 const initial=structuredClone(g),cmd={type:'useItem',item:'original-21',target:{first,second}},prices=lots.slice(0,2).map(i=>E.landPrice(map.cells[i],g));
 g=executeCommand(map,g,cmd).state;assert.equal(g.owners[first],2);assert.equal(g.owners[second],1);assert.equal(g.levels[first],2);assert.equal(g.levels[second],4);assert.deepEqual(prices,lots.slice(0,2).map(i=>E.landPrice(map.cells[i],g)));
 assert.deepEqual(E.restore(map,JSON.stringify(g)),g);assert.deepEqual(replayCommands(map,{format:'dingdang-replay-v1',initial,commands:[cmd]}),g);
 for(const kind of [0,2,3]){const bad=structuredClone(initial);bad.kinds[second]=kind;assert.throws(()=>executeCommand(map,bad,cmd));assert.deepEqual(bad.players[0].inventory,['original-21']);}
 assert.throws(()=>executeCommand(map,initial,{...cmd,target:{first,second:first}}));
});
