// Original 0x49f020, 0x4949fe, 0x49fed7; fixture executes the actual map queries.
import {actorCells} from './clones.mjs';
import {originalDirectionMask} from './navigation.mjs';
const cache=new WeakMap();
function config(map){
  if(cache.has(map))return cache.get(map);
  const bytes=Uint8Array.from(map.rawConfig.match(/../g),n=>parseInt(n,16)),view=new DataView(bytes.buffer);
  const region=id=>Array.from({length:6},(_,i)=>view.getInt32(0x68+24*id+i*4,true));
  const result={bounds:region(0),excluded:[region(1),region(3)]};cache.set(map,result);return result;
}
const free=(map,x,y)=>x>=0&&y>=0&&x<map.width&&y<map.height&&!!(map.cells[y*map.width+x].flags&128)&&!(map.cells[y*map.width+x].flags&64);
export function roadAxes(map,at){
  const c=map.cells[at];if(!c)return {horizontal:0,vertical:0};
  const m=[0,1,2,3].map(d=>originalDirectionMask(c.x,c.y,d,(x,y)=>free(map,x,y)));
  return {horizontal:(m[0]|m[1])&12,vertical:(m[2]|m[3])&3};
}
export function roadItemPlacement(map,at,occupied=()=>false,roadOccupied=()=>false,door=true){
  const c=map.cells[at];if(!c||!free(map,c.x,c.y)||c.event!==0||occupied(at))return [];
  if(config(map).excluded.some(r=>c.x>=r[0]&&c.x<=r[3]&&c.y>=r[1]&&c.y<=r[4]))return [];
  if(!door)return [0,1,2,3];
  const axes=roadAxes(map,at),directions=[];
  if(axes.vertical===3&&!roadOccupied(at-map.width)&&!roadOccupied(at+map.width))directions.push(0,1);
  if(axes.horizontal===12&&!roadOccupied(at-1)&&!roadOccupied(at+1))directions.push(2,3);
  return directions;
}
export function gameRoadPlacement(map,g,at,door=true){
  const roads=new Set(g.roadItems.map(o=>o.at)),actors=new Set(g.players.filter(p=>!p.eliminated).flatMap(actorCells));
  return roadItemPlacement(map,at,i=>roads.has(i)||actors.has(i)||(g.bells??[]).includes(i),i=>roads.has(i),door);
}
export function chooseDoorDirection(directions,draw){
  if(!directions.length)throw Error('这里不能放置任意门');
  for(let n=0;n<100000;n++){const d=draw(4);if(directions.includes(d))return d;}
  throw Error('任意门朝向抽取超出安全次数');
}
export function originalDoorDestination(map,from,draw,occupied=()=>false,options={}){
  const {bounds:b,excluded}=config(map),source=map.cells[from];
  const eligible=(x,y)=>{
    if(!free(map,x,y)||(source.x-x)**2+(source.y-y)**2<(options.minimumDistance??10)||options.ordinaryOnly&&map.cells[y*map.width+x].event!==0||x+y<=b[0]+b[1]||x+y>=b[3]+b[4]||x-y<=b[0]-b[1]||x-y>=b[3]-b[4]||excluded.some(r=>x>=r[0]&&x<=r[3]||y>=r[1]&&y<=r[4])||occupied(y*map.width+x))return [];
    const {horizontal:h,vertical:v}=roadAxes(map,y*map.width+x);return h===12?(v===3?[0,1,2,3]:[2,3]):v===3?[0,1]:[];
  };
  if(!map.cells.some(c=>eligible(c.x,c.y).length))throw Error('没有可用的任意门落点');
  for(let n=0;n<100000;n++){
    const x=draw(map.width),y=draw(map.height),directions=eligible(x,y);if(!directions.length)continue;
    return {to:y*map.width+x,direction:directions[draw(directions.length)]};
  }
  throw Error('任意门落点抽取超出安全次数');
}
export function originalCannonDirection(map,at,direction,draw){
  const {horizontal,vertical}=roadAxes(map,at),mask=horizontal|vertical;
  if(mask&(1<<direction))return direction;
  if(!mask)throw Error('目标没有可通行方向');
  for(let n=0;n<100000;n++){const d=draw(4);if(mask&(1<<d))return d;}
  throw Error('大炮朝向抽取超出安全次数');
}
