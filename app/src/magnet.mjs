import {actorCells} from './clones.mjs';
import {DIRECTIONS,movementDirectionMask} from './navigation.mjs';
import {playerPosition} from './movement-position.mjs';
// The badge object on the occupied square stores both original endpoints.
export function repels(g,who,at){
 return g.players.some((p,i)=>i!==who&&!p.eliminated&&actorCells(p).includes(at)&&p.effects.some(e=>e.id==='original-3'&&(e.source===who||e.target===who)));
}
export function magnetDirection(map,g,direction){
 const p=g.players[g.turn],pos=playerPosition(map,p),stride=p.small?.5:1;
 if(p.effects.some(e=>e.id==='original-14'&&e.active))return direction;
 const target=d=>{const [dx,dy]=DIRECTIONS[d];return Math.trunc(pos.y+dy*stride)*map.width+Math.trunc(pos.x+dx*stride);};
 if(!repels(g,g.turn,target(direction)))return direction;
 const free=(x,y)=>x>=0&&y>=0&&x<map.width&&y<map.height&&!!(map.cells[y*map.width+x]?.flags&128)&&!(map.cells[y*map.width+x]?.flags&64);
 const mask=movementDirectionMask(map,p,free)||(1<<(p.direction^1));
 if(mask&(1<<(direction^1)))return direction^1;
 if(g.pcNavigationVersion==='pc-v126')return p.direction^1;
 if(mask&(1<<(p.direction^1)))return p.direction^1;
 return null;
}
