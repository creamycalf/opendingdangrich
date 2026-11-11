import fs from 'node:fs';import assert from 'node:assert/strict';
import * as E from '../../app/src/engine.mjs';
import {planClones} from '../../app/src/clones.mjs';
import {originalLandItemNeighbor} from '../../app/src/land-items.mjs';
import {executeCommand} from '../../app/src/commands.mjs';
const map=JSON.parse(fs.readFileSync(new URL('../../app/public/assets/maps-v126/4.json',import.meta.url)));
export function cloneArrivalFixture(){
 const g=E.createGame(map,{startDate:'2000-05-02'}),p=g.players[0];p.cash=10000;g.bells=[];
 for(let at=0;at<map.cells.length;at++)for(let d=0;d<4;d++){
  const lot=originalLandItemNeighbor(map,at);if(!E.walkable(map.cells[at])||map.cells[at].event!==0||map.cells[lot]?.event!==1)continue;
  p.at=at;p.direction=d;p.previous=-1;p.inventory=['original-32'];
  if(!planClones(map,g,'original-32'))continue;
  for(const to of E.choices(map,g)){
   const other=originalLandItemNeighbor(map,to);if(other===lot||map.cells[other]?.event!==1||map.cells[to].event!==0)continue;
   const made=executeCommand(map,g,{type:'useItem',item:'original-32'}).state;
   // Start the next playable turn with ordinary persisted split state. All
   // following movement and landing decisions use product commands.
   made.phase='ready';made.players[0].effectTickPending=false;
   const far=map.cells.findIndex((c,i)=>E.walkable(c)&&Math.abs(c.x-map.cells[at].x)+Math.abs(c.y-map.cells[at].y)>8);
   assert.ok(far>=0);made.players.slice(1).forEach(p=>p.at=far);
   for(let seed=1;seed<1000;seed++){
    made.seed=seed;const rolled=executeCommand(map,made,{type:'roll',animated:false}).state;
    if(rolled.dice===1&&E.choices(map,rolled).includes(to))return {initial:made,to,lots:[other,lot]};
   }
  }
 }
 throw Error('No adjacent double-purchase position on original map');
}
