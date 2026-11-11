import * as E from '../app/src/engine.mjs';
import {TARGET_ITEMS,applyEffect} from '../app/src/effects.mjs';
import {originalLandItemNeighbor} from '../app/src/land-items.mjs';
import {gameRoadPlacement} from '../app/src/road-items.mjs';

export function itemFixture(map,item){
 const id=E.ITEMS[item].originalId,base=E.createGame(map,{startDate:'2000-05-02',seed:1234});
 base.players.forEach(p=>p.control='human');base.players[0].inventory=[item];
 const roads=map.cells.flatMap((c,i)=>E.walkable(c)?[i]:[]);
 const lots=map.cells.flatMap((c,i)=>c.event===1?[i]:[]);
 for(const at of roads){
  const g=structuredClone(base),p=g.players[0];p.at=at;const lot=originalLandItemNeighbor(map,at);
  if(map.cells[lot]?.event!==1)continue;
  g.owners[lot]=[40,41].includes(id)?0:1;g.levels[lot]=[40,41].includes(id)?0:2;g.kinds[lot]=[40,41].includes(id)?0:1;
  let target=TARGET_ITEMS.includes(item)?1:undefined;
  if(id===21){const c=map.cells[at],second=lots.filter(i=>i!==lot).sort((a,b)=>Math.abs(map.cells[a].x-c.x)+Math.abs(map.cells[a].y-c.y)-Math.abs(map.cells[b].x-c.x)-Math.abs(map.cells[b].y-c.y))[0];g.owners[second]=2;g.levels[second]=1;g.kinds[second]=1;target={first:lot,second};}
  if(id===26){applyEffect(g.players[1],'original-4',0,false);target={donor:1,recipient:2};}
  if([6,13,37].includes(id)){const c=map.cells[at];target=roads.filter(i=>gameRoadPlacement(map,g,i,id!==13).length).sort((a,b)=>Math.abs(map.cells[a].x-c.x)+Math.abs(map.cells[a].y-c.y)-Math.abs(map.cells[b].x-c.x)-Math.abs(map.cells[b].y-c.y))[0];}
  const command={type:'useItem',item,...(target===undefined?{}:{target})},after=structuredClone(g);
  try{E.useItem(map,after,item,target);return {g,after,command};}catch{}
 }
 throw Error('No legal fixture for '+item);
}
