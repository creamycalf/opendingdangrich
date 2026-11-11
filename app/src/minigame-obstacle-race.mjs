import {createObstacles,tickObstacles,obstacleCollision,collectObstacle} from './minigame-obstacles.mjs';
import {raceRewards} from './minigame-race.mjs';
export {raceRewards as obstacleRaceRewards};
export function createObstacleRunner(slot){return {slot,y:226,sway:0,score:0,bonus:0,clock:0,rankSpeed:12,speed:0,strokes:0,mode:1,world:8850,armed:0,finished:false,animation:slot,age:0};}
export function createObstacleRace(draw){const obstacles=createObstacles(629,draw);obstacles.mode=1;return {camera:8624,finishOrder:[],obstacles};}
function transition(p,mode){if(p.mode===mode)return;p.mode=mode;p.animation=p.slot+({1:0,2:12,4:0,8:8,16:4}[mode]);p.age=0;if(mode===16)p.speed=0;}
function animationTick(p){const length=({1:2,2:12,4:2,8:6,16:21})[p.mode];p.age=p.mode===8?Math.min(length-1,p.age+1):(p.age+1)%length;}
function playerTick(p,input,camera,remaining,draw){
  if(p.mode!==16&&p.mode!==4){
    if(input===0){p.armed=0;if(p.mode===8)transition(p,1);}
    else if(input===1&&!p.armed){p.strokes++;p.speed+=p.speed<16?8:2;transition(p,2);p.armed=1;}
    else if(input===2){transition(p,8);p.speed=Math.max(0,p.speed-2);}
  }
  if(p.finished)p.speed++;
  if(p.speed>0){
    p.world-=p.speed;p.speed--;p.clock++;
    if(p.clock>=(p.rankSpeed+2-p.speed)*2){p.clock=0;animationTick(p);}
    p.sway=Math.max(-30,Math.min(30,p.sway+[-4,-2,0,2,4][draw(5)]));
  }else if(p.mode!==8&&p.mode!==16)transition(p,1);
  p.y=p.world-camera;
  if(!p.finished){p.score=p.strokes>>2;if(p.y<112){p.finished=true;p.bonus+=remaining;}}
  if(p.mode===16&&p.age===20)transition(p,1);
}
export function tickObstacleRace(s,players,inputs,draw){
  const order=[0,1,2,3].sort((a,b)=>(s.players[a]?.y??999999)-(s.players[b]?.y??999999));
  const leader=order.find(i=>s.players[i]&&s.players[i].y>0)??0,candidate=s.players[leader]?s.players[leader].world-224:0;
  if(candidate>0&&s.camera>candidate)s.camera=candidate;
  if(candidate>0&&candidate>s.camera+32)s.camera+=32;
  s.players.forEach((p,i)=>{
    if(!p)return;let input=inputs[i];
    if(players[i].control==='ai'&&p.mode!==16&&p.mode!==4){
      input=draw(3)===0?(p.armed?0:1):0;
      if(!s.obstacles.good[i]&&p.y-80<s.obstacles.y[i]&&s.obstacles.y[i]<p.y+32)input=2;
    }
    playerTick(p,input,s.camera,s.remaining,draw);
  });
  tickObstacles(s.obstacles,draw);
  s.players.forEach((p,i)=>{if(p&&obstacleCollision(s.obstacles,i,100+120*i,p.y,p.mode)){if(collectObstacle(s.obstacles,i))p.bonus+=20;else transition(p,16);}});
  s.remaining--;s.players.forEach((p,i)=>{if(p&&p.y<112&&!s.finishOrder.includes(i))s.finishOrder.push(i);});
  if(s.remaining===0||s.players.every(p=>!p||p.y<=-100))s.stage='result';
  // 0x426ed8 advances animation during rendering as well as movement updates.
  if(s.stage!=='result')for(const p of s.players)if(p)animationTick(p);
}
const int=(n,a,b)=>Number.isInteger(n)&&n>=a&&n<=b;
export function validObstacleRace(s,players){
  const o=s.obstacles;
  return int(s.camera,0,8626)&&Array.isArray(s.finishOrder)&&s.finishOrder.length<=4&&new Set(s.finishOrder).size===s.finishOrder.length&&s.finishOrder.every(i=>int(i,0,3)&&s.players[i]?.finished)&&
    !!o&&[1,2,4,16].includes(o.mode)&&o.width===629&&int(o.delay,-1,151)&&int(o.x,-800,640)&&int(o.horizontalSpeed,8,132)&&['y','speed','good'].every(k=>Array.isArray(o[k])&&o[k].length===4)&&o.y.every(n=>int(n,-80,490))&&o.speed.every((n,i)=>int(n,14,21)||(i===0&&n===-40))&&o.good.every(n=>n===0||n===1)&&
    s.players.every((p,i)=>players[i].eliminated?p===null:p&&p.slot===i&&int(p.y,-1000000,9000)&&int(p.world,-1000000,8850)&&int(p.sway,-30,30)&&int(p.score,0,225)&&int(p.bonus,0,2000)&&int(p.clock,0,100)&&p.rankSpeed===12&&int(p.speed,0,1000)&&int(p.strokes,0,900)&&[0,1].includes(p.armed)&&typeof p.finished==='boolean'&&[1,2,8,16].includes(p.mode)&&p.animation===i+({1:0,2:12,8:8,16:4}[p.mode])&&int(p.age,0,({1:1,2:11,8:5,16:20}[p.mode])));
}

