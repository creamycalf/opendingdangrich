// Selection mutates RNG and per-player AI state inside the aiAction transaction.
import * as E from './engine.mjs';
import {effectCapabilities,hasEffect} from './effects.mjs';
import {originalLandItemNeighbor} from './land-items.mjs';
import {gameRoadPlacement} from './road-items.mjs';
import {propertyKind} from './property-items.mjs';
import {mapRegion} from './map-regions.mjs';
import {playerPosition} from './movement-position.mjs';
import {itemKey} from './inventory.mjs';
import {syncItemAiProperties,prepareOriginalItemRanks,updateOriginalItemWeights,selectOriginalItem} from './pc-item-ai.mjs';
export function originalItemContext(map,g,state){
 const who=g.turn,p=g.players[who],pos=playerPosition(map,p),direction=p.direction,[dx,dy]=[[0,-1],[0,1],[-1,0],[1,0]][direction];
 const cell=(x,y)=>x>=0&&y>=0&&x<map.width&&y<map.height?map.cells[y*map.width+x]:null;
 const inv=q=>{const counts=Array(42).fill(0);for(const id of q.inventory)counts[E.ITEMS[id].originalId]++;return counts;};
 const players=g.players.map(q=>({cash:q.cash,bank:q.bank,alive:!q.eliminated,characterIndex:E.CHARACTERS.findIndex(c=>c.id===q.character)}));
 const rankings=prepareOriginalItemRanks({character:p.character,who,players},state);
 const lot=originalLandItemNeighbor(map,p.at),neighbor=lot===null?null:{owner:g.owners[lot]??null,level:g.levels[lot]??0,kind:propertyKind(g,lot)};
 const c={character:p.character,who,cash:p.cash,bank:p.bank,...rankings,position:[pos.x,pos.y],direction,neighbor,totalRoad:0,emptyRoad:0,ownRoad:0,otherRoad:0,aheadHermit:false,aheadJail:false,aheadFine:false,nearby:[false,false,false,false],gianNearby:0,
  mode:g.slowDays>0?2:1,alive:players.map(q=>q.alive),characterIndices:players.map(q=>q.characterIndex),capabilities:g.players.map(q=>effectCapabilities(q)),sleeping:g.players.map(q=>q.itemSleeping),flags:g.players.map(q=>q.effects.some(e=>e.id==='original-14'&&e.active)?0x1000:0),clones:g.players.map(q=>q.effects.some(e=>['original-24','original-32'].includes(e.id))),inventories:g.players.map(inv),hasItem15:g.players.map(q=>hasEffect(q,'original-15'))};
 c.inventory=c.inventories[who];
 for(let i=0;i<4;i++)if(i!==who&&players[i].alive){const q=playerPosition(map,g.players[i]);
  if((pos.x-8<q.x&&q.x<pos.x+8)||(pos.y-8<q.y&&q.y<pos.y+8)){
   c.nearby[i]=true;if(g.players[i].character==='gian'&&(pos.x===q.x||pos.y===q.y))c.gianNearby=i+1;
  }
 }
 for(let i=1;i<=8;i++){const road=cell(Math.trunc(pos.x)+dx*i,Math.trunc(pos.y)+dy*i);if(!road)break;if(road.event===9)c.aheadJail=true;if(road.event===11)c.aheadFine=true;if(road.event===14)c.aheadHermit=true;}
 if(lot!==null){const origin=map.cells[lot];for(let i=0;i<9;i++){const land=cell(origin.x+dx*i,origin.y+dy*i);if(!land)continue;c.totalRoad++;
  const owner=g.owners[land.y*map.width+land.x];if(owner===who)c.ownRoad++;else if(owner!==undefined)c.otherRoad++;else if(land.price>0)c.emptyRoad++;
 }}
 c.totalRoad||=1;
 const propertyOrder=state.propertyOrder??E.ownedLots(g,who);c.propertyCount=propertyOrder.filter(i=>g.owners[i]===who&&propertyKind(g,i)<2).length;
 const first=propertyOrder.find(i=>g.owners[i]===who&&propertyKind(g,i)===1&&g.levels[i]===1);c.firstOwnBell=first===undefined?null:[map.cells[first].x,map.cells[first].y];
 const front=cell(Math.trunc(pos.x)+dx,Math.trunc(pos.y)+dy);c.roadPlaceable=!!front&&gameRoadPlacement(map,g,front.y*map.width+front.x).length>0;
 const bounds=mapRegion(map,0),eligible=(x,y)=>{
  const road=cell(x,y);if(!road||!E.walkable(road)||x+y<=bounds[0]+bounds[1]||x+y>=bounds[3]+bounds[4]||x-y<=bounds[0]-bounds[1]||x-y>=bounds[3]-bounds[4])return false;
  const land=originalLandItemNeighbor(map,y*map.width+x);return land!==null&&(g.owners[land]===undefined||g.owners[land]===who)&&map.cells[land].price>0;
 };
 c.pickRoad=()=>{
  // Original has an unbounded rejection loop. Detect an empty search space
  // to avoid freezing an otherwise playable mobile game.
  let available=false;for(let x=-10;x<10&&!available;x++)for(let y=-10;y<10&&!available;y++)available=eligible(Math.trunc(pos.x+x),Math.trunc(pos.y+y));
  if(!available)return null;
  for(let attempt=0;attempt<100000;attempt++){const x=Math.trunc(pos.x+E.random(g,20)-10),y=Math.trunc(pos.y+E.random(g,20)-10);if(eligible(x,y))return [x,y];}
  return null;
 };
 return c;
}
function command(map,g,id,result){
 const item=itemKey(id),targetIds=[3,4,7,15,17,25,27,30,33,35,36,39];
 if(targetIds.includes(id))return {type:'useItem',item,target:result.target};
 if(id===26)return {type:'useItem',item,target:{donor:result.donor,recipient:result.target}};
 if(id===21){const lot=originalLandItemNeighbor(map,g.players[g.turn].at);return {type:'useItem',item,target:{first:lot,second:result.destination?.[1]*map.width+result.destination?.[0]}};}
 if([6,13,37].includes(id))return {type:'useItem',item,target:result.destination?.[1]*map.width+result.destination?.[0]};
 return {type:'useItem',item};
}
export function chooseOriginalItemAction(map,g){
 const p=g.players[g.turn];if(g.phase!=='ready'||p.jail||p.itemSleeping||p.skip)return {type:'roll'};
 syncItemAiProperties(g);const state=p.itemAi,c=originalItemContext(map,g,state);updateOriginalItemWeights(c,state);
 const result=selectOriginalItem(c,state,n=>E.random(g,n),(id,candidate)=>{
  const trial=structuredClone(g),action=command(map,g,id,candidate);
  try{E.useItem(map,trial,action.item,action.target);return true;}catch{return false;}
 });
 return result?command(map,g,result.id,result):{type:'roll'};
}
