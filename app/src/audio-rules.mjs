import {originalUpgradeCost} from './property.mjs';
import {effectCapabilities,hasEffect} from './effects.mjs';
import {originalLandItemNeighbor} from './land-items.mjs';
import {miniRewards} from './minigames.mjs';
// Original wa.exe: 0x403dd0 CD playback; 0x4739c0 monthly board theme;
// 0x4450e5 bank, 0x4455c6 shop, 0x4459d7 minigame, 0x45855d title.
export function musicForGame(game,active=true){
  if(!active)return 2;
  if(game.phase==='gameover'){
    // New PC: state 0x10e (0x46f0e8) celebrates the first human winner
    // with track 4; state 0x122 (0x473ca6) uses track 6 otherwise.
    const winner=game.winners?.slice().sort((a,b)=>a-b)[0];
    return game.players?.[winner]?.control==='human'?4:6;
  }
  const kind=game.pending?.kind;
  if(kind==='minigame')return game.pending.session?.stage==='result'?11:5;
  if(kind==='bank')return 7;
  if(kind==='shop')return 8;
  // 0x475a8d starts the monthly entrance with 9; 0x483d4c switches
  // the four-player paid-results page to 10. Early claim exits before it.
  // The visible monthly scene now starts at the original entrance; its
  // result-stage callback selects 10 only after the first panel leaves.
  if(kind==='monthly')return 9;
  const d=new Date(game.startDate+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+game.round-1);
  return 2+(d.getUTCMonth()+1)%2;
}
// Original player vtable +8 returns these IDs (0x454c70, 0x407a00..40).
export const voiceCharacter={doraemon:0,nobita:1,dorami:2,shizuka:3,suneo:4,gian:5,yellow:6};
// No game RNG is consumed for presentation. Voice alternatives use cosmetic RNG.
export function commandAudio(before,after,command,draw=n=>Math.floor(Math.random()*n),map){
  const p=before.players[before.turn],character=voiceCharacter[p.character],events=[];
  const voice=(bank,clip)=>events.push({kind:'voice',character,bank,clip});
  const entered=before.pending?.kind!==after.pending?.kind||before.pending?.lot!==after.pending?.lot;
  // Roll ticks 77/78 are scheduled by presentation (new PC 0x43c8eb).
  // Bank 1 clips 0/22 and sfx 11 belong to the title, not rolling.
  // 0x48e33b uses bank 2, item ID, on the common item activation path.
  if(command.type==='useItem'){
    const known={restoreRay:0,timeCloth:2,charm:28,air:36,door:37};
    const id=known[command.item]??Number(command.item?.replace('original-',''));
    if(Number.isInteger(id)&&id>=0&&id<42)voice(2,id);
  }
  if(before.pending?.kind==='buy'&&['answer','aiAnswer'].includes(command.type)&&entered){
    const bought=after.owners[before.pending.lot]===before.turn;
    voice(0,bought?47:48);
    if(!bought)events.push({kind:'sfx',clip:82});
  }
  if(['answer','aiAnswer'].includes(command.type)){
    const q=before.pending;
    // 0x4459d7 chooses the first strictly greatest positive award among active
    // players, starting with the current player when all awards are zero.
    if(q?.kind==='minigame'&&q.session.stage==='result'&&after.pending?.kind!=='minigame'){
      let winner=before.turn,best=0;
      miniRewards(q.session).forEach((amount,i)=>{
        if(!before.players[i].eliminated&&amount>best){best=amount;winner=i;}
      });
      voice(0,winner===before.turn?17:18);
    }
    if(['property','upgrade'].includes(q?.kind)&&entered){
      if(after.levels[q.lot]>before.levels[q.lot]){voice(0,51);events.push({kind:'sfx',clip:11});}
      else if(before.owners[q.lot]===before.turn&&after.owners[q.lot]===undefined){voice(0,52);events.push({kind:'sfx',clip:11});}
    }
    // Original hermit selection 0x41652d explicitly plays 0x52 on confirmation.
    // Its NPC text is not evidence for a character voice; don't invent one.
    if(q?.kind==='hermit'&&after.pending?.kind!=='hermit')events.push({kind:'sfx',clip:82});
    if(q?.kind==='shop'){
      if(after.players[before.turn].inventory.length>p.inventory.length)voice(0,14);
      else if(after.pending?.kind!=='shop')voice(0,15);
    }
  }
  if(entered){
    if(after.pending?.kind==='minigame')voice(0,16);
    if(after.pending?.kind==='shop')voice(0,13);
    // Identity includes lot: consecutive clone stops may both be buy dialogs.
    // Preserve confirmation before the next dialog's opening line.
    if(after.pending?.kind==='buy')voice(0,44+draw(3));
    if(['property','upgrade'].includes(after.pending?.kind)&&(effectCapabilities(p)&0x10)){
      const lot=after.pending.lot,level=after.levels[lot]??0;
      const unaffordable=level<4&&map&&after.players[before.turn].cash<=originalUpgradeCost(map.cells[lot],level,after.inflation);
      voice(0,level>=4||unaffordable?53:49+draw(2));
    }
  }
  if(command.type==='advance'){
    const e=before.queue?.[0];
    // New PC 0x443bb1: an unable-to-collect owner answers the visitor.
    // The payer's own rent exemption exits earlier without this dialogue.
    if(e?.kind==='destination'&&map&&(effectCapabilities(p)&0x20)&&!after.pending){
      const lot=originalLandItemNeighbor(map,before.visitAt??p.at),owner=before.owners[lot];
      if(owner!==undefined&&(owner!==before.turn||hasEffect(p,'original-15'))&&(before.kinds[lot]??0)<2&&!(effectCapabilities(before.players[owner])&4)){
        voice(0,78);
        const recipient=before.players[owner];
        events.push({kind:'voice',character:voiceCharacter[recipient.character],bank:0,clip:recipient.jail?75:hasEffect(recipient,'original-25')?70:10});
      }
    }
    if(e?.kind==='event'){
      if(e.event===7)voice(0,12);
      if([8,9].includes(e.event)&&after.players[before.turn].at!==p.at)voice(0,54);
      if(e.event===10)voice(0,1+draw(4));
      if(e.event===11&&after.pending?.kind==='notice')voice(0,1+draw(4)); // original exemption branch
      if(e.event===12)voice(0,before.pool>0?1+draw(4):83);
      if(e.event===13&&before.rentPool>0)voice(0,1+draw(4));
    }
    if(e?.kind==='charge'){
      const who=e.debtor??before.turn;
      if(after.players[who].cash!==before.players[who].cash){
        if(e.rent){
          if(who!==before.turn)voice(0,64); // 0x4438fb reversed rent
          else{voice(0,5+draw(4));events.push({kind:'sfx',clip:74});}
        }else if(e.creditor===-1)voice(0,9+draw(3));
      }
    }
    // Original bell pickup dialogue is text index 0x3d (bank0 index60).
    if(e?.kind==='visit'&&after.players[before.turn].inventory.length>p.inventory.length)voice(0,60);
  }
  // Original 0x453a1b: bankrupt player category16 -> bank0/25, then each survivor/58.
  const eliminated=after.players.map((p,i)=>!before.players[i].eliminated&&p.eliminated?i:-1).filter(i=>i>=0);
  for(const who of eliminated){events.push({kind:'voice',character:voiceCharacter[before.players[who].character],bank:0,clip:25});
    after.players.forEach((p,i)=>{if(!p.eliminated)events.push({kind:'voice',character:voiceCharacter[p.character],bank:0,clip:58});});}
  return events;
}
// Collect the current original DAT animation commands once per simulation tick.
// Rendering may run at 60/120 Hz; it must never repeat a 30 Hz sound command.
export function miniAnimationAudio(previous,current,catalog){
  const events=[];
  if(current.id===0)current.drops.forEach((o,i)=>{if([32,128].includes(o.mode)&&o.mode!==previous.drops[i].mode)events.push({kind:'sfx',clip:o.kind===0?104:103});});
  function visit(now,old){
    if(!now||typeof now!=='object')return;
    if(Number.isInteger(now.animation)&&Number.isInteger(now.age)){
      if(!old||now.animation!==old.animation||now.age!==old.age||now.mode!==old.mode){
        const a=catalog.animations[now.animation];
        // The reducer has already advanced the animation after its draw/event
        // phase. Play the frame it just processed, including frame 0 on restart.
        const frame=a?(now.age+(now.forward===0?1:-1)+a.frames)%a.frames:-1;
        for(const c of a?.commands??[])if(c[0]===frame&&c[1]===0x8000)events.push({kind:'sfx',clip:c[2]});
      }
    }
    for(const key of Object.keys(now))if(now[key]&&typeof now[key]==='object')visit(now[key],old?.[key]);
  }
  visit(current,previous);return events;
}
