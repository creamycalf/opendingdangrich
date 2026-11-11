// MGame07 0x42bad7 / 0x42c480 / 0x42c2a3 / 0x42c910.
const anim=(animation,age=0)=>({animation,age,ended:0});
export function createJumpPlayer(slot){return {slot,score:0,maxHeight:0,collected:0,height:216,speed:5,power:5,mode:8,grabbing:0,armed:0,actor:null,spring:anim(16+slot,1)};}
export const createJump=draw=>({food:Array.from({length:10},()=>draw(6)),foodIndex:[0,0,0,0]});
function length(a){return [2,3,2,18,20,2][Math.floor(a.animation/4)];}
function animationTick(a){if(!a)return;const n=length(a);a.age++;if(a.age+1>=n)a.ended=1;if(a.age>=n)a.age=a.animation>=12&&a.animation<16?n-1:0;}
function ended(a){if(!a)return false;const e=a.ended;a.ended=0;return !!e;}
function transition(p,mode){
  if(p.mode===mode)return;p.mode=mode;p.actor=null;p.grabbing=0;p.armed=0;
  if(mode===8)animationTick(p.spring);else p.actor=anim(p.slot+({1:0,2:4,4:8,16:12}[mode]));
}
export function jumpAI(p,target,draw){
  let input=0;if(p.mode===8&&!p.armed&&p.spring.age>8&&draw(3)===0)input=1;
  if(target<p.height+32&&p.height-120<target)input=2;
  return input;
}
function playerTick(p,input){
  if(p.mode===1||p.mode===4){
    p.armed=input===1?1:0;
    if(input===2&&!p.grabbing){p.actor=anim(12+p.slot);p.grabbing=1;}
  }else if(p.mode===8&&input===1&&!p.armed){
    const f=p.spring.age;p.power+=Math.max(0,f<10?f*2+10:f<12?40:30-f*2);p.armed=1;
  }
  if(p.mode===1){p.height+=Math.min(48,p.speed);if(--p.speed<1){transition(p,2);p.speed=1;}}
  else if(p.mode===2){if(ended(p.actor))transition(p,4);}
  else if(p.mode===4){p.height-=Math.min(48,p.speed);p.speed++;if(p.height<217){transition(p,8);p.power=p.power<15?5:p.power-10;}}
  else if(p.mode===8&&ended(p.spring)){p.spring.age=0;animationTick(p.spring);transition(p,1);p.speed=p.power;}
  const high=Math.trunc(p.height/33);if(high>p.maxHeight&&high>9)p.maxHeight=high;
  animationTick(p.mode===8?p.spring:p.actor);
}
export function tickJump(s,players,inputs,draw){
  s.players.forEach((p,i)=>{if(!p)return;const target=s.foodIndex[i]<10?(s.food[s.foodIndex[i]]+1)*334-37:Infinity;
    playerTick(p,players[i].control==='ai'?jumpAI(p,target,draw):inputs[i]);});
  s.players.forEach((p,i)=>{if(!p)return;const target=(s.food[s.foodIndex[i]]+2)*334-37;
    if(s.foodIndex[i]<10&&p.grabbing&&p.actor.age>5&&p.actor.age<11&&target<p.height+32&&p.height-120<target){p.collected++;s.foodIndex[i]++;}
    p.score=p.maxHeight>>2;
  });
  if(--s.remaining===0)s.stage='result';
}
export const jumpRewards=s=>s.players.map(p=>p?p.score*10:0);
const int=(n,a,b)=>Number.isInteger(n)&&n>=a&&n<=b;
export function validJump(s,players){
  return Array.isArray(s.food)&&s.food.length===10&&s.food.every(n=>int(n,0,5))&&Array.isArray(s.foodIndex)&&s.foodIndex.length===4&&s.foodIndex.every(n=>int(n,0,10))&&s.players.every((p,i)=>{
    if(players[i].eliminated)return p===null;
    if(!p||p.slot!==i||!int(p.height,160,20000)||!int(p.maxHeight,0,606)||!int(p.speed,1,1500)||!int(p.power,5,1500)||p.score!==(p.maxHeight>>2)||![1,2,4,8].includes(p.mode)||![0,1].includes(p.grabbing)||![0,1].includes(p.armed)||p.collected!==s.foodIndex[i])return false;
    const validAnim=a=>a&&int(a.animation,0,23)&&a.animation%4===i&&int(a.age,0,length(a)-1)&&[0,1].includes(a.ended);
    return validAnim(p.spring)&&p.spring.animation===16+i&&(p.mode===8?p.actor===null&&!p.grabbing:validAnim(p.actor)&&p.actor.animation===i+(p.grabbing?12:{1:0,2:4,4:8}[p.mode]));
  });
}
