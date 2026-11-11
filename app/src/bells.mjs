import {effectCapabilities} from './effects.mjs';
import {itemKey} from './inventory.mjs';
const cache=new WeakMap();
function config(map){
 if(cache.has(map))return cache.get(map);
 const a=Uint8Array.from(map.rawConfig.match(/../g),v=>parseInt(v,16)),d=new DataView(a.buffer),region=i=>Array.from({length:6},(_,j)=>d.getInt32(0x68+i*24+j*4,true));
 const conf={count:d.getUint32(0x114,true),bounds:region(0),excluded:[region(1),region(3)]};cache.set(map,conf);return conf;
}
export const initialBellCount=map=>config(map).count;
export function bellPositionAllowed(map,g,at){
 const c=map.cells[at];if(!c||!(c.flags&128)||(c.flags&64)||c.event!==0||g.roadItems.some(o=>o.at===at)||(g.bells??[]).includes(at))return false;
 const {bounds:b,excluded}=config(map),{x,y}=c;
 return x+y>b[0]+b[1]&&x+y<b[3]+b[4]&&x-y>b[0]-b[1]&&x-y<b[3]-b[4]&&!excluded.some(r=>x>=r[0]&&x<=r[3]&&y>=r[1]&&y<=r[4]);
}
export function spawnBells(map,g,count,draw){
 g.bells??=[];
 for(let n=0;n<count;n++){
  if(!map.cells.some((c,i)=>bellPositionAllowed(map,g,i)))break;
  let at=-1;for(let tries=0;tries<100000;tries++){const x=draw(map.width),y=draw(map.height),i=y*map.width+x;if(bellPositionAllowed(map,g,i)){at=i;break;}}
  if(at<0)throw Error('铃铛位置抽取失败');g.bells.push(at);draw(20); // original per-bell animation delay
 }
}
const pool=[2,5,7,8,10,13,15,18,20,21,23,24,29,33,35,36,39,40],weights=[60,55,60,55,60,55,60,55,60,65,55,55,60,10,60,55,55,65];
export function bellItem(draw){
 if(!Number.isInteger(draw)||draw<0||draw>=1000)throw Error('铃铛抽取无效');
 let total=0;for(let i=0;i<pool.length;i++){total+=weights[i];if(draw<total)return pool[i];}throw Error('铃铛概率表不完整');
}
export function collectBell(map,g,at,draw){
 const p=g.players[g.turn];if(!g.bells.includes(at)||!(effectCapabilities(p)&0x80))return null;
 let id;for(let n=0;n<100000;n++){id=bellItem(draw(1000));if(![10,19,27].includes(id))break;if(n===99999)throw Error('铃铛道具抽取失败');}
 const key=itemKey(id);p.inventory.push(key);g.bells=g.bells.filter(i=>i!==at);spawnBells(map,g,1,draw);return key;
}
