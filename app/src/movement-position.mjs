import {DIRECTIONS} from './navigation.mjs';
export function playerPosition(map,p){return p.half?.at===p.at?p.half:map.cells[p.at];}
// wa.exe 0x439ac4 permits only the previous heading between half-grid nodes.
export function halfStepTarget(map,p){
 const pos=playerPosition(map,p);if(Number.isInteger(pos.x)&&Number.isInteger(pos.y))return null;
 const [dx,dy]=DIRECTIONS[p.direction];return Math.trunc(pos.y+dy*.5)*map.width+Math.trunc(pos.x+dx*.5);
}
export function movePosition(map,p,direction){
 const pos=playerPosition(map,p),[dx,dy]=DIRECTIONS[direction],stride=p.small||!Number.isInteger(pos.x)||!Number.isInteger(pos.y)?.5:1;
 const x=pos.x+dx*stride,y=pos.y+dy*stride;
 p.straightDistance=direction===p.direction?(p.straightDistance??1)+stride:0;
 p.previous=p.at;p.at=Math.trunc(y)*map.width+Math.trunc(x);p.direction=direction;
 p.half=Number.isInteger(x)&&Number.isInteger(y)?null:{x,y,at:p.at};return stride;
}
