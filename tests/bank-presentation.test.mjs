import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as E from '../app/src/engine.mjs';import {executeCommand} from '../app/src/commands.mjs';
import {cashVisualPlan,cashFrame,cashDuration,bankMineFrame} from '../app/src/rent-presentation.mjs';
const map=JSON.parse(fs.readFileSync(new URL('../app/public/assets/maps-v126/4.json',import.meta.url)));
const cash=JSON.parse(fs.readFileSync(new URL('../app/public/assets/cash-animations/catalog.json',import.meta.url)));
function fixture(){const g=E.createGame(map,{seed:72,startDate:'2000-04-03'}),lot=map.cells.findIndex(c=>c.event===6);g.phase='prompt';g.pending={kind:'bank',lot};g.players[0].at=E.adjacent(map,lot).find(i=>E.walkable(map.cells[i]));return g;}
test('native mine withdraw reverses before incoming cash; deposit closes alongside outgoing cash',()=>{
 for(const position of [0,25,75,100]){const g=fixture(),before=JSON.stringify(g),command={type:'answer',action:'bankPosition',value:position},after=executeCommand(map,g,command).state;
  const [step]=cashVisualPlan(map,g,after,command),a=cash.animations[step.animation],frames=map.animations[map.cells[g.pending.lot].object].frames;
  assert.equal(step.kind,'bank');assert.equal(step.height,1);assert.equal(step.delta,after.players[0].cash-g.players[0].cash);assert.equal(JSON.stringify(g),before);
  assert.equal(step.mineFrames,frames);assert.equal(step.preFrames,position>50?frames:0);
  assert.equal(bankMineFrame(step,0),position>50?frames-1:0);assert.equal(bankMineFrame(step,frames-1),position>50?0:frames-1);
  assert.equal(cashFrame(step,step.preFrames),0);assert.equal(cashDuration(step,a),position>50?frames+a.frames:Math.max(frames,a.frames));
  const restored=E.restore(map,JSON.stringify(after));assert.deepEqual(restored,after);
 }
});
test('cancel, neutral slider and mere preview never trigger a successful bank effect',()=>{
 const g=fixture();for(const command of [{type:'answer',action:'leave'},{type:'answer',action:'bankPosition',value:50}]){const after=executeCommand(map,g,command).state;assert.deepEqual(cashVisualPlan(map,g,after,command),[]);}
 assert.deepEqual(cashVisualPlan(map,g,g,{type:'answer',action:'bankPosition',value:0}),[]);
});
