// MGame01 0x41fe66 / 0x420698 / 0x420880 / 0x4215be / 0x42181e.
const difficulty={doraemon:[3,4],nobita:[5,5],dorami:[1,1],shizuka:[4,2],suneo:[3,3],gian:[2,4],yellow:[3,4]};
const base=[[25,20],[30,35],[15,10],[40,45]];
const object=(animation,extra={})=>({mode:0,pose:0,animation,age:0,event:0,forward:1,once:0,...extra});
export function createPosePlayer(slot){return {slot,score:0,wins:0,fallY:170,...object(slot),gate:object(54+slot,{age:3,forward:0,once:1})};}
export const createPose=()=>({phase:0,elapsed:0,ready:0,delay:0,attempts:0,leader:object(4,{wait:0,hold:0,real:1})});
function length(a){return a<5?32:a<10?11:a<50?([15,35,40,45].includes(Math.floor(a/5)*5)?8:10):a<54?9:a<58?8:1;}
function animation(o){
  if(o.animation<0)return;
  // Rendering emits DAT events before the base animation tick (0x418d25).
  if(o.animation>=10&&o.animation<50&&o.age>=1&&o.age<=3)o.event=300+o.age;
  const n=length(o.animation);o.age+=o.forward?1:-1;
  if(o.forward?(o.age+1>=n):(o.age===0))o.event=101;
  if(n===1)o.event=101;
  if(o.age>=n||o.age<0)o.age=o.once?(o.forward?n-1:0):(o.forward?0:n-1);
}
function read(o){const e=o.event;o.event=0;return e;}
function transition(o,slot,mode,pose=-1,animBase=-1){
  if(pose!==-1)o.pose=pose;if(mode!==-1)o.mode=mode;
  if(animBase!==-1){o.animation=slot+animBase;o.age=0;o.event=0;o.forward=1;o.once=0;}
}
function action(o,slot,input){if(input===4||input===8){const side=input===4?0:1,b=base[o.pose][side];transition(o,slot,3,o.pose^(side?2:1),b);}o.once=1;}
function gate(o,open){o.mode=open?1:0;o.age=open?0:3;o.event=0;o.forward=open?1:0;o.once=1;}
function fail(p){gate(p.gate,true);transition(p,p.slot,4,-1,50);p.once=1;}
function compare(s,p,award){if(p.mode===6||p.mode===4)return;if(p.pose!==s.leader.pose)fail(p);else if(award)p.wins++;}
export function poseAI(p,leader,character,draw){
  const [recognition,decision]=difficulty[character],a=recognition*2+({2:8,3:6,5:0}[leader.mode]??0),b=(6-decision)*(leader.real?60:20);
  const first=draw(a),second=draw(b);let input=0;
  if(first===0||second===0){if((p.pose^1)===leader.pose)input=4;else if((p.pose^2)===leader.pose)input=8;if(second===0&&input)input=4;}
  return input;
}
export function tickPose(s,players,inputs,draw){
  s.elapsed++;s.remaining=Math.max(0,s.remaining-1);const l=s.leader;
  if(s.phase===0){
    if(s.elapsed===25){transition(l,4,1,-1,5);l.once=1;}
    if(s.elapsed>39)for(const p of s.players)if(p&&p.mode!==6){transition(p,p.slot,1,-1,5);p.once=1;s.ready=0;draw(20);s.phase=1;}
  }else if(s.phase===1){
    if(++s.ready>39){s.ready=40;
      if(s.elapsed<1801){l.wait=0;l.hold=0;l.real=draw(3)===0?0:1;const old=l.pose,side=draw(2),b=base[old][side];transition(l,4,3,old^(side?2:1),b);l.forward=1;l.age=0;l.once=1;if(!l.real)transition(l,4,2,old);}
      if(l.real===1)s.attempts++;s.phase=s.remaining===0?3:2;
    }
  }else if(s.phase===2){
    let event=0;
    if(l.mode===5){if(++l.hold>=20){transition(l,4,2);l.hold=0;l.wait=0;event=1;}}
    else if(l.mode===2&&++l.wait>=s.delay+20){s.delay=draw(20);l.hold=0;l.wait=0;event=2;}
    if(event===1){for(const p of s.players)if(p)compare(s,p,false);}
    if(event===2)s.phase=1;
    draw(2);
    if(l.real===0){if(read(l)===303){l.forward=0;l.once=1;}else read(l);}
    if(l.mode===3&&read(l)===101){l.hold=0;transition(l,4,5);}
    for(const p of s.players)if(p){
      p.score=p.wins;
      if(p.mode===3&&read(p)===101){transition(p,p.slot,2);compare(s,p,true);}
      if(p.mode===4){p.fallY+=5;if(p.fallY>=300){p.fallY=170;p.mode=6;gate(p.gate,false);}}
      if(p.mode===6){p.animation=-1;p.age=0;p.event=0;p.forward=1;p.once=1;}
    }
    s.players.forEach((p,i)=>{if(p&&p.mode!==6&&p.mode!==4)action(p,i,players[i].control==='ai'?poseAI(p,l,players[i].character,draw):inputs[i]);});
    if(s.players.every(p=>!p||p.mode===6))s.phase=3;
  }else if(s.phase===3){s.stage='result';return;}
  animation(l);for(const p of s.players)if(p){animation(p.gate);animation(p);}
}
export const poseRewards=s=>s.players.map(p=>p?p.score*20:0);
const int=(n,a,b)=>Number.isInteger(n)&&n>=a&&n<=b;
export function validPose(s,players){
  const validObject=o=>o&&int(o.mode,0,6)&&int(o.pose,0,3)&&int(o.animation,-1,58)&&int(o.age,0,o.animation<0?0:length(o.animation)-1)&&[0,101,301,302,303].includes(o.event)&&[0,1].includes(o.forward)&&[0,1].includes(o.once);
  const l=s.leader;
  return int(s.phase,0,3)&&int(s.elapsed,0,2000)&&int(s.ready,0,40)&&int(s.delay,0,19)&&int(s.attempts,0,100)&&validObject(l)&&int(l.wait,0,39)&&int(l.hold,0,19)&&[0,1].includes(l.real)&&s.players.every((p,i)=>players[i].eliminated?p===null:p&&p.slot===i&&validObject(p)&&validObject(p.gate)&&int(p.score,0,500)&&int(p.wins,p.score,p.score+1)&&int(p.fallY,170,295));
}
