import * as E from '../app/src/engine.mjs';
// Drive the real landing state machine up to (but not through) rent payment.
export function reachLandingCharge(map,g){
 for(let n=0;n<30;n++){
  if(g.queue[0]?.rent||g.phase==='end'||g.phase==='prompt')return;
  if(g.phase==='resolving')E.advance(map,g);
  else if(g.phase==='landed')E.landing(map,g);
  else throw Error('Fixture must finish its movement before landing');
 }
 throw Error('Arrival did not settle');
}
