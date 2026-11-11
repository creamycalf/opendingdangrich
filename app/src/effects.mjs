// Original factory +0x70 and tick 0x48dadf. Normal end-turn arms bit 0x10;
// 0x439fea consumes it once before the owner's next action.
import {EFFECT_CONFLICTS} from './original-effect-tables.mjs';
import {V126_EFFECT_CONFLICTS} from './v126-effect-tables.mjs';
import {HERMIT_EVENTS,HERMIT_CONFLICTS} from './hermit-data.mjs';
import {originalAiAttacked} from './pc-item-ai.mjs';
export const EFFECTS={
  'original-24':{originalId:24,name:'分身药水',duration:5,mask:0xffffffff,value:0},
  'original-32':{originalId:32,name:'一分为二刀',duration:5,mask:0xfff,value:0},
  'original-3':{originalId:3,name:'南北极徽章',duration:5,mask:0xfff,value:0x400000},
  'original-43':{originalId:43,name:'缩形隧道造成的缩小',duration:5,mask:0xfffffebe,value:0},
  'original-1':{originalId:1,name:'机器人小姐',duration:5,mask:0xffffffdf,value:0},
  'original-4':{originalId:4,name:'传染伤风纸电话',duration:3,mask:0xffffffff,value:0},
  'original-7':{originalId:7,name:'咒语相机',duration:10,mask:0xffffffff,value:0x2000},
  'original-8':{originalId:8,name:'玩具军队',duration:5,mask:0xffffffff,value:0x1000},
  'original-9':{originalId:9,name:'颠倒笔',duration:5,mask:0xfff,value:0x40000},
  'original-10':{originalId:10,name:'友情药袋',duration:5,mask:0xfffffbdf,value:0},
  'original-11':{originalId:11,name:'石头帽',duration:8,mask:0xffffffdb,value:0},
  'original-12':{originalId:12,name:'幸运枪',duration:8,mask:0xffffffff,value:0},
  'original-14':{originalId:14,name:'机械小矮人',duration:99,mask:0xffffffff,value:0},
  'original-15':{originalId:15,name:'狸猫套装',duration:5,mask:0xffffffff,value:0},
  'original-16':{originalId:16,name:'疯狂时间器',duration:5,mask:0xffffffff,value:0},
  'original-17':{originalId:17,name:'恶运钻石',duration:8,mask:0xffffffff,value:0x2000},
  'original-18':{originalId:18,name:'隐形眼药水',duration:5,mask:0xffffffdf,value:0},
  'original-19':{originalId:19,name:'人见人爱丸',duration:5,mask:0xfffffbff,value:0},
  'original-20':{originalId:20,name:'储钱蜜蜂',duration:5,mask:0xffffffff,value:0x80000},
  'original-22':{originalId:22,name:'蜗牛屋',duration:5,mask:0xfffff7ff,value:0},
  'original-23':{originalId:23,name:'灵魂守卫',duration:5,mask:0xfffff39f,value:0x80000},
  'original-25':{originalId:25,name:'失忆棒',duration:5,mask:0xfffffffb,value:0},
  'original-26':{originalId:26,name:'睡意枪',duration:5,mask:0xffffffff,value:0},
  'original-27':{originalId:27,name:'朋友圈',duration:5,mask:0xffffffff,value:0},
  'original-29':{originalId:29,name:'盲点星星',duration:8,mask:0xffffffdb,value:0},
  'original-31':{originalId:31,name:'失物回归机器',duration:5,mask:0xffffffff,value:0x80000},
  'original-34':{originalId:34,name:'倒霉咪表',duration:8,mask:0xffffffff,value:0x100000},
  'original-35':{originalId:35,name:'怨恨头带',duration:8,mask:0xffffffff,value:0x18000},
  'original-38':{originalId:38,name:'竹蜻蜓',duration:5,mask:0xf07,value:0x200000},
  'original-39':{originalId:39,name:'缩小电筒',duration:5,mask:0xfffffebe,value:0},
  'original-42':{originalId:42,name:'玩具军队造成的昏睡',duration:5,mask:0xffffffff,value:0},
  charm:{originalId:28,name:'护身符',duration:5,mask:0xffffffff,value:0x20000},
  air:{originalId:36,name:'空气枪',duration:3,mask:0xffffffff,value:0},
};
export const REDIRECT_ITEMS=['original-7','original-17'];
export const TARGET_ITEMS=['original-3','air','original-4',...REDIRECT_ITEMS,'original-15','original-25','original-26','original-27','original-30','original-33','original-35','original-39'];
const sleeping=id=>['air','original-4','original-26','original-42'].includes(id);
export const SELF_EFFECTS=Object.keys(EFFECTS).filter(id=>!['original-42','original-43'].includes(id)&&!TARGET_ITEMS.includes(id));
const originalId=id=>EFFECTS[id]?.originalId??Number(id.slice('original-'.length));
// Exact subset of original 0x43904b + the two conflict tables for these IDs.
export function originalEffectPairConflict(oldId,newId,sameSource,attack,version='pc-v126'){
  if(oldId===newId&&sameSource)return 3;
  const tables=version==='legacy'?EFFECT_CONFLICTS:V126_EFFECT_CONFLICTS;
  return 1+tables[attack?'attack':'self'][originalId(oldId)][originalId(newId)];
}
export function effectApplicationStatus(player,id,source,attack=TARGET_ITEMS.includes(id)){
  const replaced=[];
  for(const old of player.effects){
    const result=originalEffectPairConflict(old.id,id,old.source===source,attack);
    if(result===3)return {allowed:false,replaced:[],reason:old.id===id&&old.source===source?'这个道具状态已经生效':'当前状态不能使用这个道具'};
    if(result===2)replaced.push(old);
  }
  const eventsReplaced=[];
  for(const old of player.events??[]){const result=HERMIT_CONFLICTS[attack?'attack':'self'][old.id][originalId(id)];if(result===2)return {allowed:false,replaced:[],eventsReplaced:[],reason:'当前仙人状态不能使用这个道具'};if(result===1)eventsReplaced.push(old);}
  return {allowed:true,replaced,eventsReplaced,reason:''};
}
export function effectCapabilities(player,base=0xfff){
  if(player.itemSleeping)base&=0xfffff2db;
  const items=player.effects.reduce((value,e)=>{const dwarf=e.id==='original-14'&&e.active;return ((value&((dwarf?0xfffff2be:EFFECTS[e.id].mask)|0xfffff000))|(dwarf?0x200000:e.id==='original-12'&&typeof e.lucky==='boolean'?(e.lucky?0x24000:0x18000):EFFECTS[e.id].value))>>>0;},base>>>0);
  return (player.events??[]).reduce((value,e)=>((value&(HERMIT_EVENTS[e.id].mask|0xfffff000))|HERMIT_EVENTS[e.id].value)>>>0,items);
}
export const mustPayRent=player=>!!(effectCapabilities(player)&0x20);
export const canCollectRent=player=>!!(effectCapabilities(player)&4);
export const canVisitShop=player=>!!(effectCapabilities(player)&0x40);
export const affectedByHermit=player=>!!(effectCapabilities(player)&0x800);
export const protectedFromFine=player=>!!(effectCapabilities(player)&0x80000);
export const canBeAttacked=player=>!!(effectCapabilities(player)&0x400);
export const canAttackPlayer=(caster,target,source,id='air',targetSlot=-1)=>!target.eliminated&&canBeAttacked(target)&&!(id==='original-3'&&hasEffect(target,id))&&!(['original-35','original-39'].includes(id)&&target.small)&&!(caster.character==='nobita'&&target.character==='shizuka')&&effectApplicationStatus(target,id,source,true).allowed&&!(caster.effects??[]).some(e=>e.id==='original-27'&&e.source===targetSlot);
export const rentRecipient=(player,owner)=>player.effects.find(e=>e.id==='original-15')?.source??owner;
export function replaceConflictingEffects(player,id,source,attack){
  const status=effectApplicationStatus(player,id,source,attack);
  player.effects=player.effects.filter(e=>!status.replaced.includes(e));player.events=(player.events??[]).filter(e=>!status.eventsReplaced?.includes(e));return status;
}
export function tickOriginalCounter(remaining){
  if(!Number.isInteger(remaining)||remaining<1||remaining>0xffffffff)throw Error('道具计时无效');
  const next=remaining>=10?remaining:remaining-1;
  return {remaining:next,expired:next===0};
}
export const hasEffect=(player,id)=>player.effects.some(e=>e.id===id);
export const hasEffectFrom=(player,id,source)=>player.effects.some(e=>e.id===id&&e.source===source);
export const sleepSource=player=>player.itemSleeping||player.effects.some(e=>e.id==='original-14'&&e.active);
export function fallAsleep(player){const dwarf=player.effects.find(e=>e.id==='original-14');player.itemSleeping=!dwarf;if(dwarf){if(!dwarf.active&&Number.isInteger(player.at))player.dwarfBody={at:player.at,direction:player.direction,half:player.half?{...player.half}:null};dwarf.active=true;}}
// 0x438cf9 switches the active actor back to the sleeping body, whose position
// did not follow the mechanical dwarf. Removing the helper is not a teleport
// of the body to the helper's last square.
export function wakePlayer(player){player.itemSleeping=false;if(player.dwarfBody){Object.assign(player,player.dwarfBody);player.previous=-1;player.straightDistance=1;delete player.dwarfBody;}player.effects=player.effects.filter(e=>e.id!=='original-14');}
export function originalLuckyShot(draw){if(!Number.isInteger(draw)||draw<0||draw>=1000)throw Error('幸运枪随机值无效');return draw>=751;}
// Doraemon.exe v1.26 0x495b30: draw < 251 is bad luck, otherwise good.
export function originalLuckyShotV126(draw){if(!Number.isInteger(draw)||draw<0||draw>=1000)throw Error('幸运枪随机值无效');return draw>=251;}
export function originalAirHit(expert,random){
  if(expert)return true;
  if(!Number.isInteger(random)||random<0||random>=1000)throw Error('命中随机值无效');
  return random>=700;
}
export const originalAttachmentCount=(duration,acting,clockStarted)=>duration+(!acting&&clockStarted?1:0);
export function tickPlayerEffects(player){
  if(!player.effectTickPending)return [];
  player.effectTickPending=false;player.effectClockStarted=true;const expired=[],retained=[];let woke=false;
  for(const effect of player.effects){
    const next=tickOriginalCounter(effect.remaining);
    if(next.expired){expired.push(effect.id);if(sleeping(effect.id))woke=true;}
    else retained.push({...effect,remaining:next.remaining});
  }
  player.effects=retained;
  player.events=(player.events??[]).filter(e=>{if(--e.remaining>0)return true;expired.push('hermit-'+e.id);if(e.id===21)woke=true;return false;});
  if(woke)wakePlayer(player);
  player.small=player.events.some(e=>e.id===22)||player.effects.some(e=>['original-39','original-43'].includes(e.id));
  return expired;
}
export function applyEffect(player,id,source=0,acting=true,attack=TARGET_ITEMS.includes(id)){
  if(!Object.hasOwn(EFFECTS,id))throw Error('未知道具状态');
  const status=effectApplicationStatus(player,id,source,attack);if(!status.allowed)throw Error(status.reason);
  player.effects=player.effects.filter(e=>!status.replaced.includes(e));
  player.events=(player.events??[]).filter(e=>!status.eventsReplaced?.includes(e));
  originalAiAttacked(player,source,EFFECTS[id].originalId);
  player.effects.push({id,source,remaining:originalAttachmentCount(EFFECTS[id].duration,acting,player.effectClockStarted)});
  if(id==='original-14')player.effects.at(-1).active=false;
  if(sleeping(id))fallAsleep(player);
  if(['original-39','original-43'].includes(id))player.small=true;
}
export function validEffects(player){
  return ['effectTickPending','effectClockStarted','itemSleeping'].every(k=>typeof player[k]==='boolean')&&Array.isArray(player.effects)&&player.effects.length<=Object.keys(EFFECTS).length*4&&player.effects.every(e=>e&&Object.hasOwn(EFFECTS,e.id)&&Number.isInteger(e.source)&&e.source>=0&&e.source<4&&(!['original-3',...REDIRECT_ITEMS].includes(e.id)||(Number.isInteger(e.target)&&e.target>=0&&e.target<4))&&(e.id!=='original-12'||typeof e.lucky==='boolean')&&(e.id!=='original-14'||typeof e.active==='boolean')&&Number.isInteger(e.remaining)&&e.remaining>0&&e.remaining<=EFFECTS[e.id].duration+1)&&new Set(player.effects.map(e=>e.id+':'+e.source)).size===player.effects.length&&(!player.itemSleeping||(player.effects.some(e=>sleeping(e.id))||(player.events??[]).some(e=>e.id===21)));
}
export function effectText(player){
  return (player.itemSleeping?'昏睡中；':'')+[...player.effects.map(e=>EFFECTS[e.id].name+' · 剩余 '+e.remaining),...(player.events??[]).map(e=>HERMIT_EVENTS[e.id].name+' · 剩余 '+e.remaining)].join('；');
}
