// Original MGame06: 0x42a3c8 / 0x42a6a5 / 0x42a910. See binary fixtures.
import {createRacePlayer,tickRace,raceRewards,validRace} from './minigame-race.mjs';
import {createGrowPlayer,tickGrow,growRewards,validGrow} from './minigame-grow.mjs';
import {createRpsPlayer,tickRps,rpsRewards,validRps} from './minigame-rps.mjs';
import {createJumpPlayer,createJump,tickJump,jumpRewards,validJump} from './minigame-jump.mjs';
import {createCatchPlayer,createCatch,tickCatch,catchRewards,validCatch} from './minigame-catch.mjs';
import {createPosePlayer,createPose,tickPose,poseRewards,validPose} from './minigame-pose.mjs';
import {createObstacleRunner,createObstacleRace,tickObstacleRace,obstacleRaceRewards,validObstacleRace} from './minigame-obstacle-race.mjs';
export const MINI_GAMES={
  0:{name:'接豆沙包',ticks:1350,points:22,instructions:'45 秒内按住左右按钮移动，接住落下的豆沙包，避开炸弹。接到豆沙包或转身时会短暂停顿；每个豆沙包奖励 22 个豆沙包。'},
  1:{name:'模仿动作',ticks:1800,points:20,instructions:'看上方领队的动作，点击左右按钮分别切换两边的手臂，使姿势保持一致。小心领队的假动作！完成正确模仿得 1 分，每分奖励 20 个豆沙包；姿势不符会掉落出局。最多 60 秒。'},
  2:{name:'交替按键竞速',ticks:900,points:6,instructions:'左右交替点击加速，重复按同一边不会持续加速。共 30 秒，每 4 次有效加速记 1 分，每分奖励 6 个豆沙包；前三名额外获得 300、200、100 个豆沙包。'},
  3:{name:'放大光线比赛',ticks:450,points:7,instructions:'15 秒内左右交替点击，让放大光线照射玩偶。连续按同一边不计数，每 4 次有效点击记 1 分，每分奖励 7 个豆沙包。'},
  4:{name:'障碍竞速',ticks:900,points:6,instructions:'连续点击加速，按住防守躲避落下的障碍，但防守会减速。共 30 秒，每 4 次加速记 1 分，每分奖励 6 个豆沙包；前三名额外获得 300、200、100 个豆沙包。'},
  5:{name:'猜拳比赛',ticks:1350,points:25,instructions:'45 秒内看上方的手势，用“换拳”选择手势，再按“出拳”。石头胜剪刀，布胜石头，剪刀胜布。赢一次得 1 分，平局或输掉需要等待 2 秒；每分奖励 25 个豆沙包。'},
  6:{name:'左右选图案',ticks:600,points:25,instructions:'共 20 秒。看上方目标，点击左右按钮选择相同图案。选对得 1 分，选错需要等待恢复；每分奖励 25 个豆沙包。'},
  7:{name:'弹簧跳高',ticks:1350,points:10,instructions:'共 45 秒。在弹簧压缩时点击“蓄力”，接近压到底的时机跳得更高。飞起后可点击“抓取”收集豆沙包。按最高高度计分，每分奖励 10 个豆沙包。'}
};
const int=(n,a,b)=>Number.isInteger(n)&&n>=a&&n<=b;
export function createMatchPlayer(draw,slot=0){
  const target=6+draw(2),side=draw(2)?1:0,ring=[draw(16)];
  for(let i=1;i<14;i++){let n;do{n=draw(16);}while(n===ring[i-1]);ring.push(n);}
  return {slot,start:0,target,previous:0,scroll:0,mode:1,offset:0,score:0,side,ring,animation:(side?16:20)+slot,age:0};
}
function transition(p,mode,draw,side=p.side){
  p.mode=mode;p.age=0;
  if(mode===2){
    p.scroll+=10;p.start=(p.start+12)%14;p.previous=p.target;p.target=(p.start+6)%14+draw(2);
    p.animation=(p.side?(side?0:12):(side?8:4))+p.slot;p.side=side;
  }else p.animation=(mode===4?(p.side?24:28):(p.side?16:20))+p.slot;
}
export function matchAI(p,draw){
  // Preserve original AI's comparison against its previous target (0x42ae33).
  return draw(2)===0?(p.ring[(p.start+9)%14]===p.ring[p.previous]?8:4):(draw(2)===0?8:4);
}
export function tickMatchPlayer(p,input,draw){
  if(p.mode===1&&p.scroll===0&&[4,8].includes(input))transition(p,2,draw,input===4?1:0);
  if(p.scroll>0){p.scroll--;p.offset+=p.offset>=0?-54:6;}
  p.age++;
  if(p.mode===2&&p.age>=((p.animation-p.slot)>=8?10:9)){
    const at=(p.start+12)%14;p.ring[at]=draw(16);
    do{p.ring[at+1]=draw(16);}while(p.ring[at+1]===p.ring[at]);
    const correct=p.ring[(p.start+(p.side?8:9))%14]===p.ring[p.previous];
    if(correct){p.ring[p.previous]|=128;p.score++;}
    transition(p,correct?1:4,draw);
  }else if(p.mode===4&&p.age>=19)transition(p,1,draw);
  if(p.mode===1)p.age%=2;
}
export function createMiniGame(id,players,draw){
  if(!Object.hasOwn(MINI_GAMES,id))throw Error('小游戏尚未开放');
  return {id,stage:'intro',remaining:MINI_GAMES[id].ticks,...(id===0?createCatch(draw):id===1?createPose():id===2?{camera:8624,finishOrder:[]}:id===4?createObstacleRace(draw):id===7?createJump(draw):{}),players:players.map((p,i)=>p.eliminated?null:id===0?createCatchPlayer(i):id===1?createPosePlayer(i):id===2?createRacePlayer(i):id===4?createObstacleRunner(i):id===3?createGrowPlayer(i):id===5?createRpsPlayer(i):id===7?createJumpPlayer(i):createMatchPlayer(draw,i))};
}
export function tickMiniGame(session,players,inputs,draw){
  if(session.stage!=='playing'||(session.remaining<=0&&session.id!==0&&session.id!==1))throw Error('小游戏尚未开始或已结束');
  if(!Array.isArray(inputs)||inputs.length!==4||inputs.some(n=>![0,4,8].includes(n)))throw Error('小游戏输入无效');
  if(session.id===0){tickCatch(session,players,inputs,draw);return;}
  if(session.id===1){tickPose(session,players,inputs,draw);return;}
  if(session.id===2){tickRace(session,players,inputs.map(n=>n/4),draw);return;}
  if(session.id===3){tickGrow(session,players,inputs.map(n=>n/4),draw);return;}
  if(session.id===4){tickObstacleRace(session,players,inputs.map(n=>n/4),draw);return;}
  if(session.id===5){tickRps(session,players,inputs.map(n=>n/4),draw);return;}
  if(session.id===7){tickJump(session,players,inputs.map(n=>n/4),draw);return;}
  session.players.forEach((p,i)=>{if(p)tickMatchPlayer(p,players[i].control==='ai'&&p.mode===1&&!p.scroll?matchAI(p,draw):inputs[i],draw);});
  if(--session.remaining===0)session.stage='result';
}
export const miniRewards=s=>s.id===0?catchRewards(s):s.id===1?poseRewards(s):s.id===2?raceRewards(s):s.id===4?obstacleRaceRewards(s):s.id===3?growRewards(s):s.id===5?rpsRewards(s):s.id===7?jumpRewards(s):s.players.map(p=>p?p.score*MINI_GAMES[s.id].points:0);
export function validMiniGame(s,players){
  if(!s||!Object.hasOwn(MINI_GAMES,s.id)||!['intro','playing','result'].includes(s.stage)||!int(s.remaining,0,MINI_GAMES[s.id].ticks)||!Array.isArray(s.players)||s.players.length!==4)return false;
  if(s.remaining===0&&s.stage!=='result'&&s.id!==0&&s.id!==1||s.stage==='intro'&&s.remaining!==MINI_GAMES[s.id].ticks)return false;
  if(s.id===2)return validRace(s,players);
  if(s.id===4)return validObstacleRace(s,players);
  if(s.id===1)return validPose(s,players);
  if(s.stage==='result'&&s.remaining!==0)return false;
  if(s.id===3)return validGrow(s,players);
  if(s.id===5)return validRps(s,players);
  if(s.id===7)return validJump(s,players);
  if(s.id===0)return validCatch(s,players);
  return s.players.every((p,i)=>players[i].eliminated?p===null:p&&p.slot===i&&int(p.start,0,12)&&p.start%2===0&&int(p.target,0,13)&&int(p.previous,0,13)&&int(p.scroll,0,10)&&[1,2,4].includes(p.mode)&&int(p.offset,-54,0)&&p.offset%6===0&&int(p.score,0,67)&&[0,1].includes(p.side)&&int(p.animation,0,31)&&p.animation%4===i&&int(p.age,0,19)&&Array.isArray(p.ring)&&p.ring.length===14&&p.ring.every(n=>int(n,0,15)||int(n,128,143)));
}
