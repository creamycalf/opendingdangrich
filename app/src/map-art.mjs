// Native v1.26 47ad69: static objects share the tile's left edge, and the
// bitmap bottom lies 20px below its projected centre. Width is not an anchor.
export function mapSpritePoint(center,image,terrain=false){
 return {x:center.x-40,y:terrain?center.y-20:center.y+20-image.h};
}
const bounds=new WeakMap();
export function mapSpriteReach(map){
 if(!bounds.has(map)){
  const art=Object.values(map.art);
  // Include tall buildings whose ground tile is below the screen. Fixed 340px
  // clipping previously removed visible tops of the future world's 480px art.
  bounds.set(map,{x:Math.max(120,...art.map(a=>a.w+40)),y:Math.max(340,...art.map(a=>a.h+40))});
 }
 return bounds.get(map);
}
