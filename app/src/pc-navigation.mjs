// Original v1.26 movement decision in 43daf5, at 43dc9f and 43f3d2.
// Directions are native 0=up, 1=down, 2=left, 3=right.
// Input overrides are a cheat-enabled branch; ordinary play uses rejection RNG.
export function originalDirection(mask,current,random,input=0,cheat=false){
  if(!Number.isInteger(mask)||mask<0||mask>15||!Number.isInteger(current)||current<0||current>3)throw Error('Invalid native direction context');
  if(input&&cheat){
    if(!(mask&input))return -1; // Native handler returns without advancing.
    let selected=-1;for(let d=0;d<4;d++)if(input&(1<<d))selected=d;
    return selected;
  }
  if(!mask)mask=1<<(current^1);
  for(;;){const selected=random(4);if(mask&(1<<selected))return selected;}
}
// Native checks the old heading on entry, selected heading on subsequent nodes.
export function originalRoadDirection({first,mask,current,selected,item,itemDirection,ghost=false,headband=false,clones=false,small=false}){
  const heading=first?current:selected;
  const blocked=(item===6||item===37)&&((itemDirection&2)!==(heading&2)||ghost||item===6&&(headband||clones||!first&&!small&&(itemDirection&1)===(selected&1)));
  if(!blocked)return {direction:selected,bounced:false};
  const reverse=selected^1;
  return {direction:first&&(mask&(1<<reverse))?reverse:current^1,bounced:true};
}
