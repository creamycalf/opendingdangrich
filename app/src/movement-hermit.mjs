import {effectCapabilities} from './effects.mjs';
// 0x43d7c2 samples once on entering movement and once at each eligible node.
// Both draws must exceed 900. 0x439fea clears the once-per-turn runtime flag.
export function armMovementHermit(g,draw){g.hermitArmed=!!(effectCapabilities(g.players[g.turn])&0x800)&&!g.hermitSeen&&draw(1000)>900;}
export function movementHermit(g,roadTransition,draw){
 const p=g.players[g.turn];
 return !roadTransition&&!!(effectCapabilities(p)&0x800)&&!g.hermitSeen&&g.remaining>0&&!p.jail&&!!g.hermitArmed&&draw(1000)>900;
}
