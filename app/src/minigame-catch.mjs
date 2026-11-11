// MGame00 0x41d77d / 0x41e411 / 0x41e846 / 0x41f203.
const lengths=[12,12,15,15,6,6,12,12,40,40];
const length=a=>a<40?lengths[a%10]:a%2?1:8;
function animate(o,a){o.animation=a;o.age=0;o.ended=0;}
function animationTick(o){const n=length(o.animation);o.age++;if(o.age+1>=n)o.ended=1;if(o.age>=n)o.age=0;}
function ended(o){const e=o.ended;o.ended=0;return !!e;}
function transition(p,mode){if(p.mode===mode)return;p.mode=mode;if(mode===2)p.clock=0;animate(p,p.slot*10+({1:2,2:0,4:4,8:6,16:8}[mode])+(p.direction===1?0:1));}
export function createCatchPlayer(slot){return {slot,x:100+slot*100,y:196,clock:0,score:0,mode:1,direction:1,animation:slot*10+2,age:0,ended:0};}
function dropTransition(o,mode){if(o.mode===mode)return;o.mode=mode;animate(o,40+o.kind*2+([32,128].includes(mode)?1:0));}
function resetDrop(o,draw){o.x=48+draw(544);o.y=-60;o.counter=1+draw(40);o.mode=1;o.kind=draw(4)===0?3:0;dropTransition(o,64);}
export function createCatch(draw){return {drops:Array.from({length:8},(_,slot)=>{const o={slot,speed:6};resetDrop(o,draw);return o;})};}
function dropTick(o,draw){
  if(o.mode===2){o.counter=0;o.y+=o.speed;if(o.y>279)dropTransition(o,128);}
  else if(o.mode===32){if(o.counter++>19){resetDrop(o,draw);o.counter=0;}}
  else if(o.mode===64){if(o.counter--===0){dropTransition(o,2);o.counter=0;}}
  else if(o.mode===128&&ended(o)){dropTransition(o,32);o.counter=0;}
}
export function catchAI(p,targets){
  const weights=targets.map(o=>{
    let n=0;const x=o.x,y=o.y;
    if(y<p.y+66&&y>20&&o.kind===0){
      n=10;if(x>=p.x-80&&x<=p.x+200)n+=5;if(x>=p.x-28&&x<=p.x+130)n+=10;
      if(y<p.y+46&&y>p.y-20)n+=15;if(y<p.y-20&&y>p.y-88)n+=10;if(y<p.y-88)n+=5;
      if(x>=p.x+24&&x<=p.x+124)n+=10;
    }
    return x<p.slot*160||x>p.slot*160+160?0:n;
  });
  let best=0;for(let i=0;i<8;i++)if(weights[i]>weights[best])best=i;
  const x=targets[best].x;
  if(p.direction===1){if(x>=p.x+24&&x<=p.x+68)return 8;if(x<p.x+24)return 4;if(x>p.x+124)return 8;}
  else{if(x>=p.x+76&&x<=p.x+124)return 4;if(x>p.x+124)return 8;if(x<p.x+24)return 4;}
  return 0;
}
function playerTick(p,input,drops,draw){
  if(p.mode!==16)for(const o of drops){const x=o.x+28,y=o.y+28;
    if(y>=p.y+46&&y<=p.y+66&&((p.direction===2&&x>=p.x+24&&x<=p.x+68)||(p.direction===1&&x>=p.x+76&&x<=p.x+124))){
      if(o.kind===0){p.score=(p.score+1)&255;transition(p,8);}else transition(p,16);
      resetDrop(o,draw);break;
    }
  }
  p.clock++;
  if(p.mode===1){
    if(input===4){if(p.direction===1)transition(p,2);else{transition(p,4);p.direction=1;}}
    else if(input===8){if(p.direction===2)transition(p,2);else{transition(p,4);p.direction=2;}}
  }else if(p.mode===2){
    if(input===0)transition(p,1);
    else if(input===4){if(p.direction===1){if(p.x>6)p.x-=6;}else{transition(p,4);p.direction=1;}}
    else if(input===8){if(p.direction===2){if(p.x<534)p.x+=6;}else{transition(p,4);p.direction=2;}}
  }
  if([4,8,16].includes(p.mode)&&ended(p))transition(p,1);
}
export function tickCatch(s,players,inputs,draw){
  const final=s.remaining===0;
  for(const o of s.drops)dropTick(o,draw);
  const targets=s.drops.map(o=>o.mode===2?{x:o.x+28,y:o.y+28,kind:o.kind}:{x:1024,y:480,kind:2});
  // The original makes one ascending bubble pass, not a complete sort.
  for(let i=0;i<7;i++)if(targets[i+1].y<targets[i].y)[targets[i],targets[i+1]]=[targets[i+1],targets[i]];
  const order=[0,1,2,3].sort((a,b)=>(s.players[b]?.clock??0)-(s.players[a]?.clock??0));
  for(const i of order){const p=s.players[i];if(p)playerTick(p,players[i].control==='ai'?catchAI(p,targets):inputs[i],s.drops,draw);}
  if(final){for(const p of s.players)if(p)transition(p,1);s.stage='result';}
  else{s.remaining--;for(const o of [...s.drops,...s.players])if(o)animationTick(o);}
}
export const catchRewards=s=>s.players.map(p=>p?p.score*22:0);
const int=(n,a,b)=>Number.isInteger(n)&&n>=a&&n<=b;
export function validCatch(s,players){
  const validAnimation=o=>int(o.animation,0,47)&&int(o.age,0,length(o.animation)-1)&&[0,1].includes(o.ended);
  return Array.isArray(s.drops)&&s.drops.length===8&&s.drops.every((o,i)=>o&&o.slot===i&&int(o.x,48,591)&&int(o.y,-60,282)&&o.speed===6&&[0,3].includes(o.kind)&&[2,32,64,128].includes(o.mode)&&int(o.counter,0,40)&&validAnimation(o)&&o.animation===40+o.kind*2+([32,128].includes(o.mode)?1:0))&&s.players.every((p,i)=>players[i].eliminated?p===null:p&&p.slot===i&&int(p.x,1,539)&&p.y===196&&int(p.clock,0,1351)&&int(p.score,0,255)&&[1,2,4,8,16].includes(p.mode)&&[1,2].includes(p.direction)&&validAnimation(p)&&Math.floor(p.animation/10)===i);
}
