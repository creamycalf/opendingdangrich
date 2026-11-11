import {mapRegion,insideRegion} from './map-regions.mjs';
import {originalDoorDestination} from './road-items.mjs';
import {relocateClones} from './clones.mjs';
export function specialRegionPoint(map,exit=false){
 const bytes=Uint8Array.from(map.rawConfig.match(/../g),x=>parseInt(x,16)),v=new DataView(bytes.buffer),offset=exit?0x5c:0x50;
 return {x:v.getInt32(offset,true),y:v.getInt32(offset+4,true)};
}
// Landing 0x44072b: only a small player with no poorer living opponent may
// enter. The supplied maps define this entrance on composite maps 6 and 7.
export function specialRegionTransition(map,g,worth,draw){
 const p=g.players[g.turn],c=map.cells[p.at],entry=specialRegionPoint(map),exit=specialRegionPoint(map,true);
 if(!entry.x&&!entry.y)return '';
 if(p.bonusArea){
  if(c.x!==exit.x||c.y!==exit.y)return '';
  const target=originalDoorDestination(map,p.at,draw,i=>g.roadItems.some(o=>o.at===i),{minimumDistance:0,ordinaryOnly:true});
  p.at=target.to;p.direction=target.direction;p.half=null;p.previous=-1;p.bonusArea=false;relocateClones(map,p);return '离开特殊区域，回到主地图。';
 }
 if(!p.small||!insideRegion(mapRegion(map,1),c.x,c.y)||g.players.some((q,i)=>!q.eliminated&&i!==g.turn&&worth(i)<worth(g.turn)))return '';
 p.at=entry.y*map.width+entry.x;p.half=null;p.previous=-1;p.direction=3;p.small=false;
 p.effects=p.effects.filter(e=>e.id!=='original-39');p.events=p.events.filter(e=>e.id!==22);p.bonusArea=true;relocateClones(map,p);
 return '缩小后通过入口，进入特殊区域，并恢复原来大小。';
}
