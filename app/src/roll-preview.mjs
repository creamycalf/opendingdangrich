import {movementDirectionMask,DIRECTIONS} from './navigation.mjs';
import {playerPosition} from './movement-position.mjs';
import {mapRegion,insideRegion} from './map-regions.mjs';
// PC 0x439744 enumerates endpoints, not the intermediate squares of one route.
export function rollEndpoints(map,player,count){
 const start=playerPosition(map,player);
 let nodes=[{x:start.x,y:start.y,direction:player.direction,straightDistance:player.straightDistance??1}];
 const free=(x,y)=>x>=0&&y>=0&&x<map.width&&y<map.height&&!!(map.cells[y*map.width+x]?.flags&128)&&!(map.cells[y*map.width+x]?.flags&64);
 for(let step=0;step<count;step++){
  const next=new Map();
  for(const n of nodes){const at=Math.trunc(n.y)*map.width+Math.trunc(n.x),p={...player,...n,at,half:{x:n.x,y:n.y,at}};
   const mask=movementDirectionMask(map,p,free);
   for(let d=0;d<4;d++)if(mask&(1<<d)){
    const stride=player.small||!Number.isInteger(n.x)||!Number.isInteger(n.y)?.5:1;
    const [dx,dy]=DIRECTIONS[d],v={x:n.x+dx*stride,y:n.y+dy*stride,direction:d,straightDistance:d===n.direction?n.straightDistance+stride:0};
    if(v.x>=0&&v.y>=0&&v.x<map.width&&v.y<map.height&&(player.jail||!insideRegion(mapRegion(map,3),v.x,v.y)))next.set(JSON.stringify(v),v);
   }
  }nodes=[...next.values()];
 }
 return [...new Map(nodes.map(n=>[`${n.x},${n.y},${n.direction}`,n])).values()].map(n=>({...n,sprite:!player.small?2:n.direction<2?(Number.isInteger(n.y)?75:76):(Number.isInteger(n.x)?77:78)}));
}
