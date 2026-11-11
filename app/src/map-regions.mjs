const cache=new WeakMap();
export function mapRegion(map,id){
 if(!cache.has(map)){
  const bytes=Uint8Array.from(map.rawConfig.match(/../g),x=>parseInt(x,16)),v=new DataView(bytes.buffer);
  cache.set(map,Array.from({length:4},(_,r)=>Array.from({length:6},(_,n)=>v.getInt32(0x68+r*24+n*4,true))));
 }
 return cache.get(map)[id];
}
export const insideRegion=(r,x,y)=>x>=r[0]&&x<=r[3]&&y>=r[1]&&y<=r[4];
