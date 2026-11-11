// 0x47d913: stop at the first non-walkable cell in N,S,W,E order,
// BEFORE checking ownership. Single layer, no dynamic road blockers.
export function originalLandItemNeighbor(map,at){
  const c=map.cells[at];if(!c)return null;
  for(const [dx,dy] of [[0,-1],[0,1],[-1,0],[1,0]]){
    const x=c.x+dx,y=c.y+dy;
    if(x<0||y<0||x>=map.width||y>=map.height)return null;
    const lot=y*map.width+x,n=map.cells[lot];
    if(!(n.flags&128)||(n.flags&64))return lot;
  }
  return null;
}
export function originalLandItemAllowed(item,owner,level,actor){
  if(owner===undefined||owner===null)return false;
  if(item==='restoreRay')return level>0; // 0x48f83c includes own land
  if(item==='timeCloth')return owner!==actor; // 0x490336 excludes own land
  return false;
}
export function landItemStatus(map,g,item){
  const lot=originalLandItemNeighbor(map,g.players[g.turn].at);
  if(lot===null||g.owners[lot]===undefined)return {lot,allowed:false,reason:'身旁没有可作用的已购土地。'};
  const allowed=originalLandItemAllowed(item,g.owners[lot],g.levels[lot],g.turn);
  return {lot,allowed,reason:allowed?'':item==='timeCloth'?'时间布不能用于自己的土地。':'这块土地没有可降低等级的建筑。'};
}
export function applyLandItem(g,item,lot){
  if(item==='restoreRay'){g.levels[lot]=Math.max(0,g.levels[lot]-1);if(g.kinds)g.kinds[lot]=g.levels[lot]>0?1:0;}
  else if(item==='timeCloth'){delete g.owners[lot];delete g.levels[lot];if(g.kinds)delete g.kinds[lot];}
  else throw Error('未知地产道具');
}
