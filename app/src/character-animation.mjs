const frames=new WeakMap();
const signed16=n=>n>=32768?n-65536:n;
// Actor animation offsets are relative to the 80 x 40 ground tile's top left.
// The projection and movement interpolator both supply its center.
export function boardActorSpritePoint(center,command,image){
 return {x:center.x-40+command.x+image.hx,y:center.y-20+command.y+image.hy};
}
export function characterPose(p,moving=false){return p.itemSleeping?4:p.effects.some(e=>e.id==='original-38')?2:moving?0:3;}
export function characterAnimation(catalog,p,direction,moving=false){return catalog.characters[p.character][p.small?'1':'0'][characterPose(p,moving)][direction];}
export function animationFrame(animation,tick,removeMotion=true){
 if(!frames.has(animation)){
  const out=[];let previous=[];
  for(let n=0;n<animation.frames;n++){const group=animation.commands.filter(c=>c[0]===n&&c[1]<animation.sprites.length);if(group.length)previous=group;out.push(previous);}
  frames.set(animation,out);
 }
 return frames.get(animation)[Math.floor(tick)%animation.frames].map(c=>({sprite:animation.sprites[c[1]],x:c[2]-(removeMotion?signed16(c[5]):0),y:c[3]-(removeMotion?signed16(c[6]):0),layer:c[4]}));
}
export function boardCharacterSprites(catalog,characters=Object.keys(catalog.characters)){
 const ids=new Set();
 for(const character of characters){
  const poses=catalog.characters[character];
  if(!poses)throw Error('未知棋盘角色：'+character);
  for(const size of Object.values(poses))for(const pose of [0,2,3,4])for(const index of size[pose])for(const n of catalog.animations[index].sprites)ids.add(n);
 }
 return [...ids];
}
