import {chooseOriginalItemAction} from './pc-item-ai-adapter.mjs';
// Old saves retain the touch-port strategy and its original RNG behavior.
import {useItem,netWorth,ownedLots,propertyValue,landPrice,walkable,adjacent,ITEMS} from './engine.mjs';
import {TARGET_ITEMS,SELF_EFFECTS,hasEffect,effectCapabilities} from './effects.mjs';
import {gameRoadPlacement} from './road-items.mjs';
import {canSwapBuilding} from './property-items.mjs';
import {originalLandItemNeighbor} from './land-items.mjs';

export function chooseAiAction(map,g){
 if(g.itemAiVersion==='pc-v126')return chooseOriginalItemAction(map,g);
 const p=g.players[g.turn];
 if(g.phase!=='ready'||p.jail||p.itemSleeping||p.skip||!(effectCapabilities(p)&1))return {type:'roll'};
 const enemies=g.players.flatMap((q,i)=>i!==g.turn&&!q.eliminated?[i]:[]).sort((a,b)=>netWorth(map,g,b)-netWorth(map,g,a));
 const owns=ownedLots(g),opponentLots=Object.keys(g.owners).filter(i=>g.owners[i]!==g.turn);
 const distance=(a,b)=>Math.abs(map.cells[a].x-map.cells[b].x)+Math.abs(map.cells[a].y-map.cells[b].y);
 const positionScore=at=>{
  const lot=originalLandItemNeighbor(map,at),c=map.cells[lot];if(!c)return 0;
  if(c.event===1)return g.owners[lot]===undefined?landPrice(c,g):g.owners[lot]===g.turn?20:-propertyValue(map,g,lot);
  return c.event===6&&p.cash<300?100:c.event===4?40:c.event===5?20:0;
 };
 const legal=[];let roadCache;
 const roads=()=>roadCache??=map.cells.flatMap((c,i)=>walkable(c)&&c.event===0?[i]:[]);
 const targetItems=new Set(TARGET_ITEMS);
 for(const item of new Set(p.inventory)){
  if(!ITEMS[item]?.implemented)continue;
  const id=ITEMS[item].originalId;let score=30,targets=[undefined];
  if(targetItems.has(item))targets=enemies;
  if(id===26)targets=enemies.flatMap(donor=>enemies.filter(recipient=>recipient!==donor).map(recipient=>({donor,recipient})));
  if(id===21){
   const mine=owns.filter(i=>canSwapBuilding(g,i)).sort((a,b)=>propertyValue(map,g,a)-propertyValue(map,g,b));
   const theirs=opponentLots.map(Number).filter(i=>canSwapBuilding(g,i)).sort((a,b)=>propertyValue(map,g,b)-propertyValue(map,g,a));
   targets=mine.length&&theirs.length?[{first:mine[0],second:theirs[0]}]:[];score=55;
  }
  if([6,13,37].includes(id)){
   const legalRoads=roads().filter(at=>gameRoadPlacement(map,g,at,id!==13).length);
   legalRoads.sort((a,b)=>id===13?positionScore(b)-positionScore(a):Math.min(...enemies.map(i=>distance(a,g.players[i].at)))-Math.min(...enemies.map(i=>distance(b,g.players[i].at))));
   targets=legalRoads.slice(0,1);score=id===13?10:18;
  }
  if(id===0||id===2){const lot=originalLandItemNeighbor(map,p.at);if(g.owners[lot]===undefined||g.owners[lot]===g.turn)continue;score=65;}
  if(id===40||id===41)score=70;
  if(id===5){if(owns.length===0&&p.walkPoints<20)continue;score=p.cash<400?80:22;}
  if([1,9,10,18,23].includes(id))score=opponentLots.length?50:8;
  if([11,29].includes(id)&&owns.length)continue;
  if([8,20,31].includes(id))score=opponentLots.length?35:12;
  if(id===12)score=hasEffect(p,'original-34')?25:2;
  if(id===14)score=40;
  if(id===24||id===32)score=45;
  if(id===38){if(opponentLots.length<owns.length+3)continue;score=50;}
  if(SELF_EFFECTS.includes(item)&&p.effects.some(e=>e.id===item))continue;
  for(const target of targets){
   let value=score;
   if(id===33){if(netWorth(map,g,target)<=netWorth(map,g,g.turn)+100)continue;value=90;}
   if(id===30){if(positionScore(g.players[target].at)<=positionScore(p.at))continue;value=25;}
   if(id===25&&!ownedLots(g,target).length)continue;
   if([4,36].includes(id)){if(g.players[target].itemSleeping)continue;value=45;}
   if(id===35&&ownedLots(g,target).length===0)value=25;
   if([3,6,37].includes(id)&&!enemies.some(i=>distance(p.at,g.players[i].at)<10))continue;
   const trial=structuredClone(g);try{useItem(map,trial,item,target);}catch{continue;}
   legal.push({value,command:{type:'useItem',item,...(target===undefined?{}:{target})}});
  }
 }
 legal.sort((a,b)=>b.value-a.value);
 // Keep normal dice play even with a large original starting pocket.
 return legal.length&&(legal[0].value>=65||g.turnSerial%3!==2)?legal[0].command:{type:'roll'};
}
