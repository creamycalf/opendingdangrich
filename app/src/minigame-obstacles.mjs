// MGame04 obstacle controller 0x42728a / 0x4273c6, not yet exposed in game room.
export function resetObstacles(o,draw){
  o.good=[1,0,1,0];
  for(let i=0;i<3;i++)if(draw(2)===0)[o.good[i],o.good[i+1]]=[o.good[i+1],o.good[i]];
  o.y=[];o.speed=[];
  for(let i=0;i<4;i++){o.y.push(-80);o.speed.push(14+draw(8));}
  o.x=640;o.horizontalSpeed=8+4*draw(32);o.delay=1+30*draw(6);
}
export function createObstacles(width,draw){const o={mode:4,width};resetObstacles(o,draw);return o;}
export function tickObstacles(o,draw){
  switch(o.mode){
    // The shipped branch tests the OLD counter >= 0, not countdown expiry.
    case 1:if(o.delay-->=0)o.mode=2;break;
    case 2:o.x-=o.horizontalSpeed;if(o.x< -o.width)o.mode=16;break;
    case 4:resetObstacles(o,draw);o.mode=1;break;
    case 16:{let all=true;for(let i=0;i<4;i++)if(o.y[i]<336){o.y[i]+=o.speed[i];all=false;}
      if(all){o.mode=4;o.speed[0]=-40;}break;
    }
  }
}
export function obstacleCollision(o,slot,x,y,mode){
  const center=120+slot*120,oy=o.y[slot];
  return o.mode===16&&mode!==8&&mode!==16&&center-24<x&&x<center+48&&oy-36<y&&y<oy&&y<336;
}
export function collectObstacle(o,slot){o.y[slot]=490;return !!o.good[slot];}
