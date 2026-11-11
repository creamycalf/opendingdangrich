import {applyEffect,hasEffect} from './effects.mjs';
import {playerPosition} from './movement-position.mjs';
// 0x43d7c2: tunnels reject side entry, ghosts and linked actor chains.
export function canEnterTunnel(p,tunnel,direction){
 return (tunnel.direction&2)===(direction&2)&&!hasEffect(p,'original-35')&&!p.effects.some(e=>['original-24','original-32'].includes(e.id)||e.id==='original-14'&&e.active)&&(p.small||(tunnel.direction&1)!==(direction&1));
}
// Applied at a completed movement node (0x65), never at the halfway 0x66.
export function crossTunnel(map,g,tunnel){
 const p=g.players[g.turn],pos=playerPosition(map,p);
 if(!Number.isInteger(pos.x)||!Number.isInteger(pos.y)||p.effects.some(e=>e.id==='original-14'&&e.active)||p.events.some(e=>e.id===22))return '';
 g.remaining++;
 if(!p.small&&(tunnel.direction&1)!==(p.direction&1)){
  p.effects=p.effects.filter(e=>!['original-1','original-8','original-14','original-23','original-24','original-32','original-35'].includes(e.id));
  if(!hasEffect(p,'original-43'))applyEffect(p,'original-43',g.turn,true,false);
  p.small=true;g.remaining++;return '穿过缩形隧道后变小，步幅减半。';
 }
 if(p.small&&(tunnel.direction&1)===(p.direction&1)){
  p.effects=p.effects.filter(e=>!['original-43','original-39'].includes(e.id));p.small=false;return '从缩形隧道的小口穿出，恢复原来大小。';
 }
 return '';
}
