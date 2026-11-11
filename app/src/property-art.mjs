const vectors=[[0,-1],[0,1],[-1,0],[1,0]];
const characters=['doraemon','nobita','dorami','shizuka','suneo','gian','yellow'];
// v1.26 47edd1: buildings face the surrounding road, not a terrain ID.
// At a corner, compare the uninterrupted non-road spans on both axes.
export function propertyDirection(map,lot){
 const {x,y}=map.cells[lot];
 const road=(x,y)=>{const c=x>=0&&y>=0&&x<map.width&&y<map.height?map.cells[y*map.width+x]:null;return !!c&&!!(c.flags&128)&&!(c.flags&64);};
 let mask=vectors.reduce((bits,[dx,dy],d)=>bits|(road(x+dx,y+dy)?1<<d:0),0);
 if(![1,2,4,8].includes(mask)){
  const spans=vectors.map(([dx,dy])=>{let n=1,count=0;do{if(road(x+dx*n,y+dy*n))break;count++;n++;}while(x+dx*n>=0&&y+dy*n>=0&&x+dx*n<map.width&&y+dy*n<map.height);return count;});
  mask&=spans[2]+spans[3]>spans[0]+spans[1]?3:12;
 }
 return vectors.findIndex((_,d)=>mask&(1<<d))<0?4:vectors.findIndex((_,d)=>mask&(1<<d));
}
// Upgrade selection at 443278..4432e0; player colour owns a 57-sprite block.
export function propertySprite({owner,level,character,direction,kind=1}){
 if(kind===3)return 266+direction*4+owner;
 if(kind===2)return 282+owner;
 if(level===0)return owner*57;
 const characterIndex=characters.indexOf(character);
 if(characterIndex<0)throw Error('未知地主角色');
 return owner*57+(level===4?13+characterIndex*4:1+(level-1)*4)+direction;
}
