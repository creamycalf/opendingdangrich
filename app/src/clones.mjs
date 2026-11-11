import {DIRECTIONS,originalDirectionMask} from './navigation.mjs';
export const CLONE_ITEMS=['original-24','original-32'];
export const cloneEffect=p=>p.effects.find(e=>CLONE_ITEMS.includes(e.id));
export const cloneNodes=p=>cloneEffect(p)?.nodes??[];
export const actorCells=p=>[p.at,...cloneNodes(p).map(n=>n.at)];
const free=(map,x,y)=>x>=0&&y>=0&&x<map.width&&y<map.height&&!!(map.cells[y*map.width+x].flags&128)&&!(map.cells[y*map.width+x].flags&64);
// 0x405785 / 0x498d7f place followers behind their predecessor. If the
// backwards cell is blocked, the original direction builder supplies a detour.
export function planClones(map,g,id,draw){
 const p=g.players[g.turn],nodes=[],occupied=new Set(g.roadItems.map(o=>o.at));let prev={at:p.at,direction:p.direction};
 for(let n=0;n<(id==='original-24'?3:1);n++){
  const c=map.cells[prev.at],back=prev.direction^1,[dx,dy]=DIRECTIONS[back];let x=c.x+dx,y=c.y+dy;
  if(!free(map,x,y)||occupied.has(y*map.width+x)){
   const mask=originalDirectionMask(c.x,c.y,back,(x,y)=>free(map,x,y))&~(1<<back),ds=DIRECTIONS.flatMap(([dx,dy],d)=>(mask&(1<<d))&&!occupied.has((c.y+dy)*map.width+c.x+dx)?[d]:[]);
   if(!ds.length)return null;let d=ds[0];if(draw){for(let tries=0;tries<100000;tries++){d=draw(4);if(ds.includes(d))break;if(tries===99999)throw Error('分身位置抽取失败');}}
   x=c.x+DIRECTIONS[d][0];y=c.y+DIRECTIONS[d][1];
  }
  const direction=Math.abs(c.x-x)>Math.abs(c.y-y)?c.x<x?2:3:c.y<y?0:1;
  prev={at:y*map.width+x,direction};nodes.push(prev);
 }
 return nodes;
}
export function followClones(map,p,oldAt){
 let previous=oldAt;for(const node of cloneNodes(p)){const at=node.at,a=map.cells[at],b=map.cells[previous];node.at=previous;node.direction=Math.abs(b.x-a.x)>Math.abs(b.y-a.y)?b.x>a.x?3:2:b.y>a.y?1:0;previous=at;}
}
export function relocateClones(map,p){
 p.straightDistance=1;
 let at=p.at;for(const node of cloneNodes(p)){const c=map.cells[at],[dx,dy]=DIRECTIONS[p.direction^1],x=c.x+dx,y=c.y+dy;node.at=x>=0&&y>=0&&x<map.width&&y<map.height?y*map.width+x:at;node.direction=p.direction;at=node.at;}
}
export function validClones(map,p){
 const e=cloneEffect(p);if(!e)return true;
 return Array.isArray(e.nodes)&&e.nodes.length===(e.id==='original-24'?3:1)&&e.nodes.every(n=>n&&Number.isInteger(n.at)&&n.at>=0&&n.at<map.cells.length&&Number.isInteger(n.direction)&&n.direction>=0&&n.direction<4);
}
