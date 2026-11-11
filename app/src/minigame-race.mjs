// MGame02 parent 0x422b4b and player update 0x423535.
export function createRacePlayer(slot){return {slot,y:226,sway:0,score:0,bonus:0,animationClock:0,speed:0,rankSpeed:16,strokes:0,mode:1,world:8850,armed:1,finished:false,animation:slot*2,age:0};}
function transition(p,mode){if(p.mode!==mode){p.mode=mode;p.animation=p.slot*2+(mode===2?1:0);p.age=0;}}
function tickPlayer(p,input,camera,remaining,draw){
  if(input===1)p.armed=1;
  if(input===2&&p.armed===1){p.strokes=(p.strokes+1)&65535;p.speed+=p.speed<16?8:2;p.armed=0;transition(p,2);}
  if(p.finished)p.speed++;
  if(p.speed>0){
    p.world-=p.speed;p.y=p.world-camera;p.speed--;p.animationClock++;
    if(p.animationClock>=(p.rankSpeed+2-p.speed)*2){p.animationClock=0;p.age=(p.age+1)%(p.mode===2?12:1);}
    p.sway=Math.max(-30,Math.min(30,p.sway+[-4,-2,0,2,4][draw(5)]));
  }else transition(p,1);
  p.y=p.world-camera;
  if(!p.finished){p.score=p.strokes>>2;if(p.y<112){p.finished=true;p.bonus=remaining;}}
}
export function tickRace(s,players,inputs,draw){
  const order=[0,1,2,3].sort((a,b)=>(s.players[a]?.y??999999)-(s.players[b]?.y??999999));
  const leader=order.find(i=>s.players[i]&&s.players[i].y>0)??0;
  const candidate=s.players[leader]?s.players[leader].world-224:0;
  if(candidate>0&&s.camera>candidate)s.camera=candidate;
  if(candidate>0&&candidate>s.camera+32)s.camera+=32;
  order.forEach((slot,rank)=>{
    const p=s.players[slot];if(!p)return;p.rankSpeed=16+rank;
    const input=players[slot].control==='ai'?(draw(3)===0?(p.armed?2:1):0):inputs[slot];
    tickPlayer(p,input,s.camera,s.remaining,draw);
  });
  s.remaining--;
  s.players.forEach((p,i)=>{if(p&&p.y<112&&!s.finishOrder.includes(i))s.finishOrder.push(i);});
  if(s.remaining===0||s.players.every(p=>!p||p.y<=-100))s.stage='result';
}
export function raceRewards(s){return s.players.map((p,i)=>p?p.score*6+(s.finishOrder.indexOf(i)>=0&&s.finishOrder.indexOf(i)<3?(3-s.finishOrder.indexOf(i))*100:0):0);}
const int=(n,a,b)=>Number.isInteger(n)&&n>=a&&n<=b;
export function validRace(s,players){
  return int(s.camera,0,8626)&&Array.isArray(s.finishOrder)&&s.finishOrder.length<=4&&new Set(s.finishOrder).size===s.finishOrder.length&&s.finishOrder.every(i=>int(i,0,3)&&s.players[i]?.finished)&&
    s.players.every((p,i)=>players[i].eliminated?p===null:p&&p.slot===i&&int(p.y,-1000000,9000)&&int(p.sway,-30,30)&&int(p.score,0,225)&&int(p.bonus,0,900)&&int(p.animationClock,0,100)&&int(p.speed,0,1000)&&int(p.rankSpeed,16,19)&&int(p.strokes,0,900)&&[1,2].includes(p.mode)&&int(p.world,-1000000,8850)&&[0,1].includes(p.armed)&&typeof p.finished==='boolean'&&p.animation===i*2+(p.mode===2?1:0)&&int(p.age,0,11));
}

