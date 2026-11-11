import {originalLandItemNeighbor} from './land-items.mjs';
import {mapRegion,insideRegion} from './map-regions.mjs';

// 0x476950 constructs type 6 from mapElem groups 4/3. Banks and NPCs
// initially rest at the LAST frame; other map objects loop continuously.
export function mapAnimationTick(cell,animation,clock,started){
 if(cell.event!==6&&cell.event!==15)return clock%animation.frames;
 return started===undefined?animation.frames-1:Math.min(animation.frames-1,Math.max(0,clock-started));
}
export function triggeredMapAnimation(map,before,after,command){
 // The mine stays still while choosing a transfer. Its committed deposit /
 // withdrawal sequence is driven by the cash presentation (4453a7).
 if(command.type!=='advance'||before.queue[0]?.kind!=='destination')return null;
 const p=before.players[before.turn],at=before.visitAt??p.at,lot=originalLandItemNeighbor(map,at);
 if(map.cells[lot]?.event!==15)return null;
 const c=map.cells[p.at];
 return insideRegion(mapRegion(map,1),c.x,c.y)?null:lot;
}
