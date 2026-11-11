// Recovered from local wa.exe 0x47db4d; see docs/rules/NAVIGATION.md.
import {mapRegion,insideRegion} from './map-regions.mjs';
export const DIRECTIONS = [[0,-1],[0,1],[-1,0],[1,0]];
const RIGHT = [3,2,0,1], LEFT = [2,3,1,0];

// free(x,y) is the normal free-navigation query. Keep occupancy/layers outside
// this routine so they can be supplied without changing the recovered branches.
export function originalDirectionMask(x,y,direction,free){
  const f=direction,r=RIGHT[f],l=LEFT[f];
  if(!DIRECTIONS[f])return 0;
  const probe=(d,n=1)=>free(x+DIRECTIONS[d][0]*n,y+DIRECTIONS[d][1]*n);
  const forward=probe(f),right=probe(r),left=probe(l);
  let mask=forward?1<<f:0;
  if(left&&right){
    if(probe(r,2))mask|=1<<r;
    if(probe(l,2))mask|=1<<l;
  }else if(!left&&!right&&!forward){
    if(probe(f,2))mask|=1<<f;
  }else{
    const side=left?l:r;
    if(probe(side,2))mask|=1<<side;
  }
  return mask;
}

// Original movement wrapper 0x439ac4, including the one-tile straight
// distance before another perpendicular turn and the jail entry restriction.
export function movementDirectionMask(map,p,free){
 const pos=p.half?.at===p.at?p.half:map.cells[p.at],{x,y}=pos;
 let mask=(!Number.isInteger(x)||!Number.isInteger(y))?1<<p.direction:originalDirectionMask(Math.trunc(x),Math.trunc(y),p.direction,free);
 mask&=~(1<<(p.direction^1));
 for(let d=0;d<4;d++)if(d!==p.direction){
  const [dx,dy]=DIRECTIONS[d];
  if((p.straightDistance??1)<1||!p.jail&&insideRegion(mapRegion(map,3),x+dx,y+dy))mask&=~(1<<d);
 }
 return mask;
}
