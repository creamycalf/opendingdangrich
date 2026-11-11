import {DIRECTIONS,originalDirectionMask} from './navigation.mjs';
const cache=new WeakMap();
function candidates(map){
  if(cache.has(map))return cache.get(map);
  if(!/^[0-9a-f]{560}$/i.test(map.rawConfig??''))throw Error('地图缺少原版传送范围');
  const bytes=Uint8Array.from(map.rawConfig.match(/../g),n=>parseInt(n,16)),view=new DataView(bytes.buffer);
  const region=id=>Array.from({length:6},(_,i)=>view.getInt32(0x68+24*id+i*4,true));
  const bounds=region(0),excluded=[region(1),region(3)];
  const free=(x,y)=>x>=0&&y>=0&&x<map.width&&y<map.height&&!!(map.cells[y*map.width+x].flags&128)&&!(map.cells[y*map.width+x].flags&64);
  const result=new Map();
  for(const c of map.cells){
    const {x,y}=c;
    if(!free(x,y)||c.event!==0||x+y<=bounds[0]+bounds[1]||x+y>=bounds[3]+bounds[4]||x-y<=bounds[0]-bounds[1]||x-y>=bounds[3]-bounds[4])continue;
    // These two original tests reject a matching X OR Y strip, not just the
    // rectangle intersection (0x43b466 and 0x43b49c).
    if(excluded.some(r=>x>=r[0]&&x<=r[3]||y>=r[1]&&y<=r[4]))continue;
    const masks=DIRECTIONS.map((_,d)=>originalDirectionMask(x,y,d,free));
    const horizontal=(masks[0]|masks[1])&12,vertical=(masks[2]|masks[3])&3;
    const directions=horizontal===12?(vertical===3?[0,1,2,3]:[2,3]):vertical===3?[0,1]:[];
    if(directions.length)result.set(y*map.width+x,directions);
  }
  cache.set(map,result);return result;
}
export function originalBombDestination(map,from,draw){
  const eligible=candidates(map),source=map.cells[from];
  const far=(x,y)=>(source.x-x)**2+(source.y-y)**2>=20;
  if(![...eligible.keys()].some(i=>far(map.cells[i].x,map.cells[i].y)))throw Error('没有可用的原版传送落点');
  for(let attempts=0;attempts<100000;attempts++){
    const x=draw(map.width),y=draw(map.height),to=y*map.width+x;
    if(!far(x,y)||!eligible.has(to))continue;
    const directions=eligible.get(to);return {to,direction:directions[draw(directions.length)]};
  }
  throw Error('传送落点抽取超出安全次数');
}
