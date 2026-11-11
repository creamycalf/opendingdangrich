import {rollEndpoints} from './roll-preview.mjs';
import {decorateAction,installTouchSurface} from './action-art';
installTouchSurface();
import {mountShopCatalog,type ShopEntry} from './shop-view';
import {bankTransfer} from './bank-transfer.mjs';
import {winnerCertificate,awardCertificate,permanentYellowUnlocked} from './certificate.mjs';
import {mountCertificate} from './certificate-view';
import {random} from './engine.mjs';
import './board-dialog.css';
import {mountMapChoice} from './pc-map-choice';
import {selectableCharacters,acceptHiddenCode} from './hidden-character.mjs';
import {mountSelection} from './pc-selection';
import {selectionAudio} from './selection-audio.mjs';
import {mountPcTitle} from './pc-title';
import {tournamentPoints} from './arcade-scoring.mjs';
import {mountPcControls} from './pc-controls';
import {CLONE_ITEMS,planClones,cloneNodes} from './clones.mjs';
import {chooseAiAction} from './ai-action.mjs';
import {mapAnimationTick,triggeredMapAnimation} from './map-animation.mjs';
import {itemVisualPlan} from './item-presentation.mjs';
import {cashVisualPlan,cashFrame,cashDuration,bankMineFrame} from './rent-presentation.mjs';
import {itemLifecyclePlan,itemLifecycleFrame} from './item-lifecycle-presentation.mjs';
import {mountMonthlyPresentation} from './monthly-view';
import {mountGameOverPresentation} from './ending-view';
import {mountVictoryPresentation,mountVictoryAfterword} from './victory-view';
import {mountHermitChoices,mountHermitResult} from './hermit-view';
import {mountHermitStatusView} from './hermit-status-view';
import {createSpriteLoader,drawSprite} from './sprite-loader.mjs';
import {characterAnimation,animationFrame,boardCharacterSprites,boardActorSpritePoint} from './character-animation.mjs';
import {SPECIAL_BUILDINGS,specialBuildStatus,missileTargets} from './special-buildings.mjs';
import {propertyKind,canSwapBuilding,movableBuildings} from './property-items.mjs';
import {propertyDirection,propertySprite} from './property-art.mjs';
import {boardEventNames,boardEventDescription} from './board-cell-info.mjs';
import {mapSpritePoint,mapSpriteReach} from './map-art.mjs';
import {canTakeSleep,canGiveSleep,sleepTransferAvailable} from './target-items.mjs';
import {REDIRECT_ITEMS} from './effects.mjs';
import {playerPosition} from './movement-position.mjs';
import {effectCapabilities} from './effects.mjs';
import './style.css';
import {mountMiniGame} from './minigame-view';
import {createMiniGame,tickMiniGame,miniRewards,MINI_GAMES} from './minigames.mjs';
import {Capacitor,registerPlugin} from '@capacitor/core';
import {createSaveStore} from './save-store.mjs';
import {createGame,choices,restore,walkable,landPrice,CHARACTERS,ITEMS,LEVEL_NAMES,rent,upgradeCost,ownedLots,saleValue,liquidity,netWorth,dateParts,teleportAllowed,moneyText,itemPrice,canBuyItem} from './engine.mjs';
import {executeCommand} from './commands.mjs';
import {hasEffect,hasEffectFrom,effectText,SELF_EFFECTS,effectApplicationStatus,mustPayRent,canBeAttacked,canAttackPlayer} from './effects.mjs';
import {landItemStatus} from './land-items.mjs';
import {gameRoadPlacement} from './road-items.mjs';
import {TARGET_ITEMS} from './effects.mjs';
import {audio} from './audio';
type Cell={x:number;y:number;terrain:number;object:number;flags:number;event:number;price:number;layer:number};
type Art={w:number;h:number;hx:number;hy:number;url:string};
type MapData={id:number;revision?:string;name:string;width:number;height:number;cells:Cell[];starts:{x:number;y:number;direction:number}[];art:Record<string,Art>;animations:Record<string,any>};
const MAP_NAMES=['恐龙世界','冰雪世界','树木世界','西部世界','大雄的小镇','未来世界','综合地图一','综合地图二'];
const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const canvas=$<HTMLCanvasElement>('board'),ctx=canvas.getContext('2d')!,modal=$<HTMLDialogElement>('modal');
let map:MapData,g:any,images:Record<string,any>={},ordered:Cell[]=[];
let width=1,height=1,camera={x:0,y:960,z:1},selected=-1,busy=false,routeResolve:((n:number)=>void)|null=null;
let pcTitle:Awaited<ReturnType<typeof mountPcTitle>>;
let active=false,paused=false,spectating=false,drivingEpoch=-1,plannedStep:number|null=null,teleporting=false,speed=1;
let roadArt:any,characterArt:any,animationClock=0;
let mapAnimationStarts:Record<number,number>={};
let lifecycleArt:any,presentationQueue:any[]=[],sceneAbort:AbortController|null=null,endingShown=false;
let hermitStatuses:ReturnType<typeof mountHermitStatusView>|undefined;
function stopScene(){sceneAbort?.abort();sceneAbort=null;audio.scene(null);}
function sceneSignal(){stopScene();sceneAbort=new AbortController();return sceneAbort.signal;}
let itemArt:any,cashArt:any,presentation:any=null,loadSprites:any;
let previousFit=0;
let rollMarkers:any[]=[];
let roadSelection='door',propertyFirst=-1;
const selectionAllowed=(i:number)=>roadSelection==='original-21'?canSwapBuilding(g,i,propertyFirst):gameRoadPlacement(map,g,i,roadSelection!=='original-13').length>0;
let mapLoading=false;
let moving:{x:number;y:number;actor:any;tick:number;direction:number}|null=null,dirty=true,toastTimer=0,loadEpoch=0;
const SAVE='dingdang.touch.v2';
const saveStore=createSaveStore(localStorage,SAVE,Capacitor.isNativePlatform()?registerPlugin('GameSave'):null);
let replayRecord:any=null;
let miniAutoStart=false;
let miniDispose:(()=>void)|null=null;
function stopMini(){miniDispose?.();miniDispose=null;modal.classList.remove('miniModal');}
function dispatch(command:any){
  if(['roll','aiAction'].includes(command.type)&&g.pcAnimatedRoll&&localStorage.getItem('dingdang.roll-animation')==='off')command={...command,animated:false};
  const result=executeCommand(map,g,command);
  const action=result.action??command;
  const rewound=g.pending?.kind==='hermit'&&result.state.pending?.kind==='notice'&&result.state.pending.resume==='ready';
  const visuals:any[]=[];
  if(action.type==='useItem')visuals.push({item:action.item,steps:itemVisualPlan(map,g,result.state,action,itemArt)});
  const cashSteps=cashVisualPlan(map,g,result.state,action);
  if(cashSteps.length)visuals.push({kind:'cash',steps:cashSteps});
  const lifecycle=rewound?[]:itemLifecyclePlan(map,g,result.state,command,lifecycleArt);
  const beforeAction=lifecycle.filter((s:any)=>s.timing==='before-action'),afterAction=lifecycle.filter((s:any)=>s.timing!=='before-action');
  if(beforeAction.length)visuals.unshift({kind:'lifecycle',steps:beforeAction});
  if(afterAction.length)visuals.push({kind:'lifecycle',steps:afterAction});
  for(const visual of visuals)if(visual.steps.length){const next={...visual,index:0,frame:0,loaded:false,sounded:-1,bankSounded:-1};if(!presentation)presentation=next;else presentationQueue.push(next);}
  const animatedLot=triggeredMapAnimation(map,g,result.state,action);
  if(animatedLot!==null)mapAnimationStarts[animatedLot]=animationClock;
  audio.command(g,result.state,action,map);
  if(active&&replayRecord){
    if(replayRecord.commands.length>=50000)replayRecord={format:'dingdang-replay-v1',initial:JSON.parse(JSON.stringify(g)),commands:[]};
    replayRecord.commands.push(JSON.parse(JSON.stringify(command)));
  }
  g=result.state;if(rewound){selected=-1;moving=null;plannedStep=null;teleporting=false;center();}$('lastEvent').textContent=g.log.at(-1)?.text??'';return command.type==='step'||command.type==='aiStep'?result.walk:result.value;
}
const project=(x:number,y:number)=>({x:(x-y)*40,y:(x+y)*20});
const world=(x:number,y:number)=>({x:(x-width/2)/camera.z+camera.x,y:(y-height/2)/camera.z+camera.y});
function toast(s:string){$('toast').textContent=s;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=window.setTimeout(()=>$('toast').classList.remove('show'),2600);}
async function save(){try{await saveStore.save(JSON.stringify(g));return true;}catch{toast('存档写入失败，请检查剩余空间');return false;}}
async function persist(){if(!await save())throw Error('进度尚未写入磁盘，游戏已暂停，请重试保存。');}
function clampCamera(){camera.x=Math.max(-map.height*40-100,Math.min(map.width*40+100,camera.x));camera.y=Math.max(-180,Math.min((map.width+map.height)*20+180,camera.y));dirty=true;}
function center(){const c=Number.isInteger(g.visitAt)&&['prompt','resolving'].includes(g.phase)?map.cells[g.visitAt]:playerPosition(map,g.players[g.turn]);Object.assign(camera,project(c.x,c.y));dirty=true;}
function zoom(z:number,x=width/2,y=height/2){const p=world(x,y);camera.z=Math.max(.22,Math.min(3.5,z));camera.x=p.x-(x-width/2)/camera.z;camera.y=p.y-(y-height/2)/camera.z;clampCamera();}
function resize(){const r=canvas.getBoundingClientRect();width=r.width;height=r.height;const fit=Math.min(width/480,height/480);camera.z=previousFit?camera.z*fit/previousFit:fit;previousFit=fit;document.documentElement.style.setProperty('--hud-scale',String(Math.min(width/640,height/480)));const dpr=Math.min(devicePixelRatio,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);dirty=true;}
function diamond(x:number,y:number){ctx.beginPath();ctx.moveTo(x,y-20);ctx.lineTo(x+40,y);ctx.lineTo(x,y+20);ctx.lineTo(x-40,y);ctx.closePath();}
function art(key:string,x:number,y:number,terrain=false){const im=images[key];if(!im)return;const p=mapSpritePoint({x,y},{h:im.h??im.naturalHeight},terrain);drawSprite(ctx,im,p.x,p.y);}
function drawCharacter(p:any,xy:{x:number;y:number},direction:number,movingNow=false,tick=animationClock){
 const dwarf=p.effects.some((e:any)=>e.id==='original-14'&&e.active),catalog=dwarf?roadArt:characterArt;
 const cash= presentation?.kind==='cash'&&presentation.loaded?presentation.steps[presentation.index]:null;
 const cp=cash&&project(cash.point.x,cash.point.y),pose=cash&&cash.actor===g.players.indexOf(p)&&cp&&Math.abs(cp.x-xy.x)<1&&Math.abs(cp.y-xy.y)<1?cash.pose:null;
 const index=dwarf?(movingNow?117:113)+direction:pose!==null&&pose!==undefined?characterArt.characters[p.character][p.small?'1':'0'][pose][direction]:characterAnimation(characterArt,p,direction,movingNow),a=catalog.animations[index];
 if(pose!==null&&pose!==undefined)tick=presentation.frame;
 for(const cmd of animationFrame(a,tick)){
  const im=images[(dwarf?'road-':'pose-')+cmd.sprite];if(!im)continue;
  const point=boardActorSpritePoint(xy,cmd,catalog.images[cmd.sprite]);
  drawSprite(ctx,im,point.x,point.y);
 }
}
function draw(){
  requestAnimationFrame(draw);const clock=Math.floor(performance.now()/33.333);if(active&&!paused&&clock!==animationClock){animationClock=clock;dirty=true;}if(!dirty||!map)return;dirty=false;
  const d=canvas.width/width;ctx.setTransform(d,0,0,d,0,0);ctx.fillStyle='#d4e7d8';ctx.fillRect(0,0,width,height);
  ctx.translate(width/2,height/2);ctx.scale(camera.z,camera.z);ctx.translate(-camera.x,-camera.y);ctx.imageSmoothingEnabled=false;
  const reach=mapSpriteReach(map),left=camera.x-width/2/camera.z-reach.x,right=camera.x+width/2/camera.z+reach.x,top=camera.y-height/2/camera.z-80,bottom=camera.y+height/2/camera.z+reach.y;
  const visible=ordered.filter(c=>{const p=project(c.x,c.y);return p.x>left&&p.x<right&&p.y>top&&p.y<bottom;});
  for(const c of visible){const p=project(c.x,c.y);art(`0-${c.terrain}`,p.x,p.y,true);}
  for(const c of visible){const p=project(c.x,c.y),i=c.y*map.width+c.x;if((c.flags&7)===5)art(`2-${c.object}`,p.x,p.y);const owner=g.owners[i];if(owner!==undefined){diamond(p.x,p.y);ctx.fillStyle=['#009fca66','#2db63e66','#d8383166','#edcb1466'][owner];ctx.fill();if((g.levels[i]??0)===0&&propertyKind(g,i)<2)art('2-'+owner*57,p.x,p.y);}}
  for(const marker of rollMarkers){const p=project(Math.trunc(marker.x),Math.trunc(marker.y));art('roll-'+marker.sprite,p.x,p.y,true);}
  // These are painted on the ground. Drawing them after actors makes a rear
  // property's diamond cross a foreground character's waist (RC21 town825).
  if(selected>=0){const c=map.cells[selected],p=project(c.x,c.y);diamond(p.x,p.y);ctx.strokeStyle='#fff1a4';ctx.lineWidth=3/camera.z;ctx.stroke();}
  if(teleporting)for(const c of visible){if(selectionAllowed(c.y*map.width+c.x)){const p=project(c.x,c.y);diamond(p.x,p.y);ctx.strokeStyle='#9df4bb';ctx.lineWidth=2/camera.z;ctx.stroke();}}
  if(active&&g.pcNavigationVersion!=='pc-v126'&&g.phase==='moving'&&!busy){for(const i of choices(map,g)){const c=map.cells[i],p=project(c.x,c.y);diamond(p.x,p.y);ctx.fillStyle='#ffdc7588';ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2/camera.z;ctx.stroke();}}
  const sprites:{depth:number;render:()=>void}[]=[];
  const cashStep=presentation?.kind==='cash'&&presentation.loaded?presentation.steps[presentation.index]:null;
  const lifecycle=presentation?.kind==='lifecycle'&&presentation.loaded?itemLifecycleFrame(presentation.steps[presentation.index],presentation.frame,lifecycleArt):null;
  for(const c of visible){const p=project(c.x,c.y);if((c.flags&7)===6){
    const a=map.animations[c.object],at=c.y*map.width+c.x;if(!a)continue;
    const tick=cashStep?.kind==='bank'&&cashStep.lot===at?bankMineFrame(cashStep,presentation.frame):mapAnimationTick(c,a,animationClock,mapAnimationStarts[at]);
    sprites.push({depth:c.x+c.y,render:()=>{for(const command of animationFrame(a,tick,false)){const key='3-'+command.sprite,meta=map.art[key],im=images[key];if(im)drawSprite(ctx,im,p.x-40+command.x+meta.hx,p.y-20+command.y+meta.hy);}}});
  }else if(c.object!==65535&&(c.flags&7)===7)sprites.push({depth:c.x+c.y,render:()=>art(`2-${c.object}`,p.x,p.y)});}
  for(const c of visible){const i=c.y*map.width+c.x;if(g.owners[i]===undefined||(presentation?.kind==='cash'&&presentation.loaded&&presentation.steps[presentation.index].lot===i))continue;const p=project(c.x,c.y),owner=g.owners[i],level=g.levels[i]??0,kind=propertyKind(g,i);if(level===0&&kind<2)continue;const base=propertySprite({owner,level,kind,character:g.players[owner].character,direction:propertyDirection(map,i)});sprites.push({depth:c.x+c.y+.01,render:()=>art('2-'+base,p.x,p.y)});}
  g.players.forEach((p:any,i:number)=>{if(p.eliminated||lifecycle?.replaceActors.includes(i))return;const c=playerPosition(map,p),leg=i===g.turn?moving:null,xy=leg??project(c.x,c.y);sprites.push({depth:xy.y/20+.05,render:()=>drawCharacter(leg?.actor??p,xy,leg?.direction??p.direction,!!leg,leg?.tick??animationClock)});if(p.dwarfBody){const body={...p,...p.dwarfBody,itemSleeping:true,effects:p.effects.filter((e:any)=>e.id!=='original-14')},pos=playerPosition(map,body),bxy=project(pos.x,pos.y);sprites.push({depth:pos.x+pos.y+.04,render:()=>drawCharacter(body,bxy,body.direction)});}});
  g.players.forEach((p:any)=>{if(p.eliminated)return;for(const n of cloneNodes(p)){const c=map.cells[n.at],xy=project(c.x,c.y);sprites.push({depth:c.x+c.y+.05,render:()=>drawCharacter(p,xy,n.direction)});}});
  g.players.forEach((p:any,i:number)=>{if(p.eliminated)return;let offset=0;for(const effect of p.effects){const id=ITEMS[effect.id]?.originalId,poses=itemArt.companions[id];if(!poses||id===14&&effect.active)continue;
    offset++;const c=playerPosition(map,p),xy=i===g.turn&&moving?moving:project(c.x,c.y),[dx,dy]=[[0,1],[0,-1],[1,0],[-1,0]][p.direction],back=project(dx*offset,dy*offset),point={x:xy.x+back.x,y:xy.y+back.y};
    const a=itemArt.animations[(i===g.turn&&moving?poses.walk:poses.idle)+p.direction];sprites.push({depth:point.y/20+.05,render:()=>{for(const cmd of animationFrame(a,animationClock)){const meta=itemArt.images[cmd.sprite],im=images['item-'+cmd.sprite];if(im)drawSprite(ctx,im,point.x-40+cmd.x+meta.hx,point.y-20+cmd.y+meta.hy);}}});
  }});
  for(const at of g.bells){const c=map.cells[at],p=project(c.x,c.y),a=roadArt.animations[274],tick=Math.floor(performance.now()/100)%a.frames;for(const command of a.commands.filter((v:number[])=>v[0]===tick&&v[1]<a.sprites.length)){const id=a.sprites[command[1]],meta=roadArt.images[id];sprites.push({depth:c.x+c.y-.01,render:()=>drawSprite(ctx,images['road-'+id],p.x-40+command[2]+meta.hx,p.y-20+command[3]+meta.hy)});}}
  for(const o of g.roadItems){const c=map.cells[o.at],p=project(c.x,c.y),a=roadArt.animations[o.id==='original-6'?21+o.direction:47+(o.direction>>1)],command=a.commands.filter((v:number[])=>v[0]===a.frames-1&&v[1]<a.sprites.length).at(-1);
    if(command){const id=a.sprites[command[1]],meta=roadArt.images[id];sprites.push({depth:c.x+c.y+.04,render:()=>drawSprite(ctx,images['road-'+id],p.x-40+command[2]+meta.hx,p.y-20+command[3]+meta.hy)});}
  }
  if(lifecycle){
    for(const ghost of lifecycle.ghosts){const point=project(ghost.point.x,ghost.point.y);sprites.push({depth:ghost.point.x+ghost.point.y+.05,render:()=>{if(ghost.kind==='character')drawCharacter(ghost.player,point,ghost.direction,false,presentation.frame);else for(const cmd of animationFrame(itemArt.animations[ghost.animation],presentation.frame)){const meta=itemArt.images[cmd.sprite],im=images['item-'+cmd.sprite];if(im){const p=boardActorSpritePoint(point,cmd,meta);drawSprite(ctx,im,p.x,p.y);}}}});}
    for(const cmd of lifecycle.sprites)sprites.push({depth:cmd.point.x+cmd.point.y+.06,render:()=>{const meta=lifecycleArt.images[cmd.sprite],im=images['lifecycle-'+cmd.sprite];if(im){const p=boardActorSpritePoint(project(cmd.point.x,cmd.point.y),cmd,meta);drawSprite(ctx,im,p.x,p.y);}}});
  }
  sprites.sort((a,b)=>a.depth-b.depth).forEach(s=>s.render());
  if(presentation?.loaded&&presentation.kind!=='lifecycle'){
    const step=presentation.steps[presentation.index],cash=presentation.kind==='cash',catalog=cash?cashArt:itemArt,prefix=cash?'cash-':'item-';
    const a=catalog.animations[step.animation],p=step.screenCentered?{x:camera.x,y:camera.y}:project(step.point.x,step.point.y);
    const tick=cash?cashFrame(step,presentation.frame):presentation.frame,visible=!cash||presentation.frame>=(step.preFrames??0)&&tick<a.frames;
    if(visible)for(const command of animationFrame(a,tick,false)){const meta=catalog.images[command.sprite],im=images[prefix+command.sprite];if(im)drawSprite(ctx,im,p.x-40+command.x+meta.hx,p.y-20+command.y+meta.hy);}
    if(cash&&visible){ctx.save();ctx.font=`bold ${16/camera.z}px sans-serif`;ctx.textAlign='center';ctx.lineWidth=3/camera.z;ctx.strokeStyle='#fff';ctx.fillStyle=step.delta<0?'#a41312':'#136c22';const y=p.y-80-tick*.35;ctx.strokeText(step.amountText,p.x,y);ctx.fillText(step.amountText,p.x,y);ctx.restore();}
  }
}
function digits(id:string,value:number,base:number,pad=1){
  const whole=Math.trunc(value),panel=$(id),text=String(Math.abs(whole)).padStart(pad,'0');
  if(base===145&&whole<0)base=539;
  const key=base+':'+text;
  if(panel.dataset.digits===key)return;
  panel.replaceChildren(...[...text].map(d=>{const im=document.createElement('img');im.src='assets/ui/'+(base+Number(d))+'.png';im.alt=d;return im;}));
  panel.dataset.digits=key;
}
function refresh(){
  if(!g)return;const p=g.players[g.turn],date=dateParts(g),character=CHARACTERS.find(c=>c.id===p.character)!;
  hermitStatuses?.update({player:g.turn,events:p.events??[],active:active&&!paused&&g.phase!=='gameover'});
  audio.sync(g,active,paused);
  digits('roundDigits',date.day,155);$<HTMLImageElement>('monthArt').src='assets/ui/'+(164+date.month)+'.png';$<HTMLImageElement>('weekdayArt').src='assets/ui/'+(138+date.weekday)+'.png';
  digits('bells',Math.min(999,p.walkPoints),145,3);$('bells').setAttribute('aria-label','步行积分 '+Math.trunc(p.walkPoints));digits('cashDigits',Math.max(-999999,Math.min(999999,p.cash)),145,6);$('cashDigits').setAttribute('aria-label','豆沙包 '+moneyText(p.cash));
  $<HTMLImageElement>('portraitArt').src='assets/ui/portrait-'+(character.portrait+g.turn)+'.png';$<HTMLImageElement>('portraitArt').alt=p.name;
  $('round').textContent='第 '+g.round+' 天';$('status').textContent=p.name+' · '+(p.control==='ai'?'电脑行动':'轮到你了');
  $('turnBanner').textContent='P'+(g.turn+1)+' '+p.name+' · '+(paused?'已暂停':g.dicePending?'正在掷骰':p.control==='ai'?'电脑行动':g.phase==='moving'?(busy?'正在前进':'请选择前进方向'):'轮到你了')+(g.remaining?' · 剩余 '+g.remaining+' 步':'');
  if(g.pcEconomyVersion==='pc-v126'&&p.cash<0)$('turnBanner').textContent+=' · 负现金第 '+p.cashDebtDays+' 天（满15天破产）';
  $<HTMLButtonElement>('roll').disabled=!active||paused||busy||p.control==='ai'||g.phase!=='ready';
  const rollArt=$('roll').querySelector('img')!;
  const rollImage='assets/ui/'+($<HTMLButtonElement>('roll').disabled?177:178)+'.png';
  if(rollArt.getAttribute('src')!==rollImage)rollArt.src=rollImage;
  $<HTMLButtonElement>('items').disabled=!active||paused||busy||p.control==='ai'||g.phase!=='ready'||p.jail;
  $<HTMLImageElement>('itemsArt').src='assets/ui/'+(p.inventory.length&&!p.jail?202:201)+'.png';
  dirty=true;
}
const eventNames:Record<number,string>=boardEventNames;
function inspect(i:number){selected=i;const c=map.cells[i];$('inspect').replaceChildren();const title=document.createElement('strong');title.textContent=eventNames[c.event]||'地图格';const info=document.createElement('small');info.textContent=c.event===1?`地价（豆沙包） ${landPrice(c,g).toLocaleString()} · ${g.owners[i]===undefined?'未购买':g.players[g.owners[i]].name+' · '+LEVEL_NAMES[g.levels[i]]+' · 租金 '+moneyText(rent(map,g,i))}`:boardEventDescription(c.event,g)??(walkable(c)?'沿着街道继续探索小镇。':'小镇里的风景。');const close=document.createElement('button');close.textContent='×';close.setAttribute('aria-label','关闭地块信息');close.onclick=()=>{$('inspect').hidden=true;selected=-1;dirty=true;};$('inspect').append(title,info,close);$('inspect').hidden=false;dirty=true;}
function pick(x:number,y:number){if(!active)return;const p=world(x,y);const cx=Math.round(p.x/80+p.y/40),cy=Math.round(p.y/40-p.x/80);if(cx<0||cy<0||cx>=map.width||cy>=map.height)return;const i=cy*map.width+cx;if(teleporting){if(selectionAllowed(i)){if(roadSelection==='original-21'&&propertyFirst<0){propertyFirst=i;selected=i;dirty=true;toast('已选第一座，请点击第二座绿色建筑');return;}teleporting=false;$('routes').replaceChildren();dispatch({type:'useItem',item:roadSelection,target:roadSelection==='original-21'?{first:propertyFirst,second:i}:i});propertyFirst=-1;save();center();void drive();}else toast(roadSelection==='original-21'?'请选择另一座绿色标出的普通建筑':'请选择绿色标出的空闲道路');}else if(g.pcNavigationVersion!=='pc-v126'&&g.phase==='moving'&&!busy&&g.players[g.turn].control==='human'){if(choices(map,g).includes(i)){plannedStep=i;$('routes').replaceChildren();void drive();}}else inspect(i);}
const pointers=new Map<number,{x:number;y:number}>();let start:{x:number;y:number;time:number;dragged:boolean}|null=null;let gesture:{x:number;y:number;wx:number;wy:number;dist:number;z:number}|null=null;
function snapshot(){const ps=[...pointers.values()];if(!ps.length){gesture=null;return;}const a=ps[0],b=ps[1],x=b?(a.x+b.x)/2:a.x,y=b?(a.y+b.y)/2:a.y,p=world(x,y);gesture={x,y,wx:p.x,wy:p.y,dist:b?Math.hypot(a.x-b.x,a.y-b.y):0,z:camera.z};}
canvas.onpointerdown=e=>{if(!map||!active)return;const r=canvas.getBoundingClientRect(),p={x:e.clientX-r.left,y:e.clientY-r.top};canvas.setPointerCapture(e.pointerId);if(!pointers.size)start={...p,time:performance.now(),dragged:false};else if(start)start.dragged=true;pointers.set(e.pointerId,p);snapshot();};
const tapSlop=7;
canvas.onpointermove=e=>{
  if(!pointers.has(e.pointerId)||!gesture)return;
  const r=canvas.getBoundingClientRect();pointers.set(e.pointerId,{x:e.clientX-r.left,y:e.clientY-r.top});
  const [a,b]=[...pointers.values()],x=b?(a.x+b.x)/2:a.x,y=b?(a.y+b.y)/2:a.y;
  if(!b&&start&&!start.dragged&&Math.hypot(x-start.x,y-start.y)<=tapSlop)return;
  if(start)start.dragged=true;
  if(b&&gesture.dist>0)camera.z=Math.max(.22,Math.min(3.5,gesture.z*Math.hypot(a.x-b.x,a.y-b.y)/gesture.dist));
  camera.x=gesture.wx-(x-width/2)/camera.z;camera.y=gesture.wy-(y-height/2)/camera.z;clampCamera();
};
function release(e:PointerEvent){
  if(!pointers.delete(e.pointerId))return;
  if(pointers.size){if(start)start.dragged=true;snapshot();return;}
  if(start&&!start.dragged&&e.type==='pointerup'&&performance.now()-start.time<700){
    const r=canvas.getBoundingClientRect();
    if(Math.hypot(e.clientX-r.left-start.x,e.clientY-r.top-start.y)<=tapSlop)pick(start.x,start.y);
  }
  start=null;gesture=null;
}
canvas.onpointerup=release;canvas.onpointercancel=release;canvas.onlostpointercapture=e=>{if(pointers.has(e.pointerId)){pointers.delete(e.pointerId);start=null;snapshot();}};
canvas.addEventListener('wheel',e=>{e.preventDefault();const r=canvas.getBoundingClientRect();zoom(camera.z*Math.exp(-e.deltaY*.001),e.clientX-r.left,e.clientY-r.top);},{passive:false});
import { arrangeDialogActions, mountSetupPages } from './touch-dialog';
type Action={label:string;run:()=>void;primary?:boolean;disabled?:boolean};
let modalRequired=false;
function show(title:string,body:string,actions:Action[],required=false){
  if(sceneAbort)stopScene();
  stopMini();modalRequired=required;$('modalContent').replaceChildren();
  const h=document.createElement('h2');h.textContent=title;h.tabIndex=-1;h.autofocus=true;const p=document.createElement('p');p.textContent=body;$('modalContent').append(h,p);
  for(const a of actions){const b=document.createElement('button');b.textContent=a.label;b.className=a.primary?'primary':'';b.disabled=!!a.disabled;b.onclick=async()=>{try{modal.close();if(sceneAbort)stopScene();await a.run();}catch(e){toast(String(e));if(active&&g.phase==='prompt')renderPrompt();else if(active)openMenu();}};$('modalContent').append(b);}
  const itemArtFor=(label:string)=>{const item=Object.values(ITEMS).find((item:any)=>label===item.name||label.startsWith(item.name+' ×')||label.startsWith(item.name+' ·')) as any;return item?`assets/pc-shop/${item.originalId}.png`:undefined;};
  decorateAction(h,title,itemArtFor(title));
  for(const b of Array.from($('modalContent').querySelectorAll<HTMLButtonElement>(':scope > button'))){
    const label=b.textContent||'',player=g?.players?.find((p:any)=>p.name===label),character=player&&CHARACTERS.find((c:any)=>c.id===player.character);
    decorateAction(b,label,itemArtFor(label)||(character?`assets/ui/portrait-${character.portrait}.png`:undefined));
  }
  arrangeDialogActions($('modalContent'));
  if(!modal.open)modal.showModal();
  h.focus({preventScroll:true});modal.scrollTop=0;
}
modal.oncancel=e=>{if(modalRequired)e.preventDefault();else{paused=false;queueMicrotask(()=>void drive());}};
const delay=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
async function showDice(epoch:number){
  const display=$('diceDisplay'),face=$('diceFace'),label=$('diceText');
  display.hidden=false;label.textContent=g.players[g.turn].name+' · 掷骰中';center();
  // Presentation only: never draw another random number or move during the animation.
  const plan=g.rollPlan;
  display.classList.toggle('pcSpin',!!plan);
  if(plan){
    const p=g.players[g.turn],endpoints=new Map<string,any[]>();let sound=0;
    for(let tick=0;tick<plan.faces.length;tick++){
      if(epoch!==loadEpoch||!active||paused){display.hidden=true;rollMarkers=[];dirty=true;return;}
      const value=plan.faces[tick],direction=plan.directions[tick],key=direction+':'+value;
      if(!endpoints.has(key))endpoints.set(key,value?rollEndpoints(map,{...p,direction},value):[]);
      rollMarkers=endpoints.get(key)!;face.textContent=String(value);dirty=true;
      if(tick&&value!==plan.faces[tick-1])void audio.play({kind:'sfx',clip:77+(sound++%2)});
      await delay(1000/(30*speed));
    }
  }else for(let i=0;i<10;i++){
    const p=g.players[g.turn],value=1+i%(p.jail?3:p.character==='gian'?4:6);
    face.textContent=String(value);rollMarkers=rollEndpoints(map,p,value);dirty=true;
    void audio.play({kind:'sfx',clip:77+i%2});
    await delay((50+i*12)/speed);if(epoch!==loadEpoch||!active||paused){display.hidden=true;rollMarkers=[];dirty=true;return;}
  }
  face.textContent=String(g.dice);rollMarkers=rollEndpoints(map,g.players[g.turn],g.dice);dirty=true;label.textContent=g.dice+' 点 · 前进 '+g.dice+' 格';
  if(!plan)await delay(650/speed);display.hidden=true;rollMarkers=[];dirty=true;
  if(epoch===loadEpoch&&active&&!paused){dispatch({type:'dicePresented'});await persist();}
}
function setRoutes(ns:number[]){const at=map.cells[g.players[g.turn].at];$('routes').replaceChildren(...ns.map(n=>{const c=map.cells[n],b=document.createElement('button');b.textContent=c.x>at.x?'右下 ↘':c.x<at.x?'左上 ↖':c.y>at.y?'左下 ↙':'右上 ↗';b.onclick=()=>{if(busy)return;plannedStep=n;$('routes').replaceChildren();void drive();};return b;}));dirty=true;}
async function animate(a:{x:number;y:number},b:{x:number;y:number;direction:number;stride:number},actor:any,epoch:number){
 const p=project(a.x,a.y),q=project(b.x,b.y),startCamera={x:camera.x,y:camera.y};
 const walk=characterArt.animations[characterArt.characters[actor.character][actor.small?'1':'0'][0][b.direction]];
 const count=Math.max(1,Math.round(walk.frames*b.stride));
 const first=Number.isInteger(a.x)&&Number.isInteger(a.y)?0:Math.floor(walk.frames/2);
 await new Promise<void>(resolve=>{
  const t=performance.now();
  function frame(now:number){
   if(epoch!==loadEpoch||!active||paused){moving=null;resolve();return;}
   const elapsed=Math.max(0,(now-t)*30*speed/1000),f=Math.min(1,elapsed/count);
   moving={x:p.x+(q.x-p.x)*f,y:p.y+(q.y-p.y)*f,actor,direction:b.direction,tick:first+Math.min(count-1,Math.floor(elapsed))};
   camera.x=startCamera.x+(q.x-startCamera.x)*f;camera.y=startCamera.y+(q.y-startCamera.y)*f;
   dirty=true;if(f<1)requestAnimationFrame(frame);else{moving=null;resolve();}
  }
  requestAnimationFrame(frame);
 });
}
function describeCell(i:number){const c=map.cells[i];return (c.event===1?(g.owners[i]===undefined?'空地':propertyKind(g,i)===3?'无敌炮台':propertyKind(g,i)===2?'自制导弹':LEVEL_NAMES[g.levels[i]]):eventNames[c.event])+'（'+c.x+','+c.y+'）';}
function respond(action:string,value?:any){dispatch({type:'answer',action,value});save();refresh();void drive();}
function bankAmount(){
  const player=g.players[g.turn];
  const withdrawOnly=g.pcEconomyVersion==='pc-v126'&&g.pending?.withdrawOnly===true;
  const slider=document.createElement('input');slider.type='range';slider.min=withdrawOnly?'50':'0';slider.max='100';slider.step='1';slider.value='50';slider.setAttribute('aria-label','矿山存取比例');
  let preview=bankTransfer(player.cash,player.bank,50);
  show('矿山',withdrawOnly?'路过矿山时仅可提取。向右选择取款比例。':'向左存入，向右取出。',[
    {label:'确认存取',primary:true,run:()=>{
      if(g.pcEconomyVersion==='pc-v126'){
        respond('bankPosition',Number(slider.value));return;
      }
      if(Math.trunc(preview.cash)!==Math.trunc(player.cash)&&preview.amount>0)dispatch({type:'answer',action:preview.action,value:preview.amount});
      respond('leave');
    }},
    {label:'离开矿山',run:()=>respond('leave')},
    {label:'保存并返回主菜单',run:async()=>{await persist();titleScreen();}},
  ],true);
  const form=document.createElement('section'),hint=document.createElement('p');form.className='bankTransfer';
  const balances=document.createElement('p');balances.setAttribute('aria-live','polite');
  const update=()=>{
    preview=bankTransfer(player.cash,player.bank,Number(slider.value));
    balances.textContent='手持 '+moneyText(preview.cash)+' · 矿山 '+moneyText(preview.bank);
    hint.textContent=preview.amount?(preview.action==='deposit'?'存入 ':'取出 ')+moneyText(preview.amount)+' 豆沙包':'保持原金额';
  };
  slider.oninput=update;update();form.append(balances,slider,hint);
  $('modalContent').querySelector('.dialogChoices')!.before(form);
}
function renderPrompt(shopMode?:'buy'|'sell',shopSelection?:string,shopScroll=0){
  const q=g.pending;if(!q)return;const debtor=q.kind==='debt'?(q.debtor??g.turn):g.turn,p=g.players[debtor];
  const followers=cloneNodes(g.players[g.turn]);
  const visiting=Number.isInteger(g.visitAt)&&followers.length>0;
  const visitLabel=visiting?(g.visitAt===g.players[g.turn].at?'本体':'分身 '+(followers.findIndex((n:any)=>n.at===g.visitAt)+1))+'停靠 · 地图 '+(map.cells[g.visitAt].x+1)+','+(map.cells[g.visitAt].y+1):'';
  if(visiting)center();
  if(q.kind==='minigame'){void renderMini();return;}
  const a=(label:string,action:string,value?:any,disabled=false):Action=>({label,run:()=>respond(action,value),disabled});
  let title='',body='',actions:Action[]=[];
  if(q.kind==='hermit'){show('仙人的三个宝箱','点选宝箱后确认打开。',[{label:'保存并返回主菜单',run:async()=>{await persist();titleScreen();}}],true);mountHermitChoices($('modalContent'),{onSound:clip=>void audio.play({kind:'sfx',clip}),onSelect:()=>void audio.play({kind:'sfx',clip:76}),onChoose:index=>{modal.close();respond('chest',index);}});return;}
  if(q.kind==='notice'&&q.hermitResult){show('仙人的礼物与考验','',[{label:'保存并返回主菜单',run:async()=>{await persist();titleScreen();}}],true);mountHermitResult($('modalContent'),{...q.hermitResult,text:q.text,onSound:clip=>void audio.play({kind:'sfx',clip}),onContinue:()=>{modal.close();respond('ok');}});return;}
  if(q.kind==='notice'){title='小镇消息';body=q.text;actions=[a('继续','ok')];}
  if(q.kind==='monthly'){
    title=q.converter<0?'月末结算':'日期转换仪 · 提前月结';
    body=(q.converter<0?'地产、步行奖励已加入手持豆沙包，利息已存入矿山。':'奖励已加入手持豆沙包，全局日期不变。')+'\n地价倍率：'+g.inflation.toFixed(2)+'\n\n'+q.rows.filter((r:any)=>!g.players[r.who].eliminated&&(q.converter<0||r.who===q.converter)).map((r:any)=>g.players[r.who].name+'：'+(!r.eligible?'本月已提前领取\n':'地产 '+moneyText(r.property)+' · 步行 '+moneyText(r.walking)+'\n')+'利息 '+moneyText(r.interest)+' · 合计 '+moneyText(r.total)).join('\n\n');
    show(title,'正在展开月结明细…',[{label:'保存并返回主菜单',run:async()=>{await persist();titleScreen();}}],true);const signal=sceneSignal();audio.scene(9);
    void mountMonthlyPresentation($('modalContent'),{rows:q.rows,players:g.players,totals:g.players.map((_:any,i:number)=>netWorth(map,g,i)),converter:q.converter,signal,onStage:stage=>audio.scene(stage==='intro'?9:10),onSfx:clip=>void audio.play({kind:'sfx',clip}),onDone:()=>{stopScene();modal.close();respond('ok');}}).then(()=>{if(!signal.aborted)$('modalContent').querySelector('p')?.remove();}).catch(e=>{if(signal.aborted)return;stopScene();show(title,body+'\n演出暂不可用：'+String(e),[a('确认月结，继续游戏','ok')],true);});return;
  }
  if(q.kind==='missile'){title='自制导弹 · 选择目标';body='停靠自己的导弹基地，选择要送往倒霉区域的角色。咒语相机可能转移攻击。';actions=missileTargets(g).map((i:number)=>a(g.players[i].name,'fire',i));}
  if(q.kind==='destination'){title='选择到访地点';body='路旁有多个地点，请选择本次要到访的一处。';actions=q.options.map((i:number)=>a(describeCell(i),'select',i));actions.push(a('这次先路过','skip'));}
  if(q.kind==='buy'||q.kind==='upgrade'){
    const cost=q.kind==='buy'?landPrice(map.cells[q.lot],g):upgradeCost(map,g,q.lot);selected=q.lot;dirty=true;
    title=q.kind==='buy'?'购买土地':'升级地产';body=describeCell(q.lot)+'\n费用：'+cost+' 豆沙包\n手持：'+moneyText(p.cash)+' · 矿山：'+moneyText(p.bank);
    if(q.kind==='upgrade')body+='\n升级为：'+LEVEL_NAMES[g.levels[q.lot]+1];
    actions=[a(q.kind==='buy'?'购买地块':'升级建筑','yes',undefined,(g.pcEconomyVersion==='pc-v126'?p.cash<=cost:p.cash<cost)||!(effectCapabilities(p)&(q.kind==='buy'?8:0x10))),a('这次先路过','no')];
    if(q.kind==='buy'){
      show(p.name+' · '+title,(visitLabel?visitLabel+'\n':'')+`只要 ${moneyText(cost)} 个豆沙包，要买下这里吗？`,actions,true);
      $('modalContent').querySelector('p')!.classList.add('landOffer');
      const exit=document.createElement('button');exit.className='landSave';exit.textContent='保存并返回主菜单';
      exit.onclick=async()=>{if(await save()){modal.close();titleScreen();}};$('modalContent').append(exit);
      return;
    }
  }
  if(q.kind==='bank'){
    bankAmount();return;
  }
  if(q.kind==='property'){
    selected=q.lot;dirty=true;const level=g.levels[q.lot],cost=level<4?upgradeCost(map,g,q.lot):0;
    title='管理地产';body=describeCell(q.lot)+'\n手持：'+moneyText(p.cash)+' 豆沙包\n'+(level<4?'升级费用：'+cost+' 豆沙包':'建筑已经升到最高级');
    actions=[a('升级建筑','upgrade',undefined,level>=4||(g.pcEconomyVersion==='pc-v126'?p.cash<=cost:p.cash<cost)||!(effectCapabilities(p)&0x10)),a('出售地产 · 获得 '+saleValue(map,g,q.lot),'sell'),a('这次先路过','leave')];
  }
  if(q.kind==='shop'){
    title='道具商店';body='手持 '+moneyText(p.cash)+' 豆沙包 · 口袋 '+p.inventory.length+' 件';
    const entry=(id:string,mode:'buy'|'sell'):ShopEntry=>{
      const item=ITEMS[id as keyof typeof ITEMS],price=itemPrice(map,q.lot,id,mode,g);
      return {id,originalId:item.originalId,name:item.name,description:item.description,price:moneyText(price),count:p.inventory.filter((held:string)=>held===id).length,
        label:mode==='buy'?'购买 '+item.name+' · '+moneyText(price)+' 豆沙包':'卖出 '+item.name+' · 获得 '+moneyText(price),
        disabled:mode==='buy'&&p.cash<price,run:()=>{const scroll=document.querySelector('.shopItems')?.scrollTop??0;dispatch({type:'answer',action:mode,value:id});save();refresh();renderPrompt(mode,id,scroll);}};
    };
    const stock=Object.entries(ITEMS).filter(([id,item])=>item.implemented&&canBuyItem(p,id)&&itemPrice(map,q.lot,id,'buy',g)>0).map(([id])=>entry(id,'buy'));
    const bag=[...new Set<string>(p.inventory)].map(id=>entry(id,'sell'));
    const catalog=(name:string,items:ShopEntry[],mode:'buy'|'sell')=>{
      show(name,body,[],true);
      mountShopCatalog($('modalContent'),items,mode,()=>renderPrompt(),()=>{modal.close();respond('leave');},{selected:shopSelection,scroll:shopScroll});
    };
    if(shopMode){catalog(shopMode==='buy'?'购买道具':'卖出道具',shopMode==='buy'?stock:bag,shopMode);return;}
    actions=[
      {label:'购买道具',disabled:!stock.length,run:()=>catalog('购买道具',stock,'buy')},
      {label:'卖出道具',disabled:!bag.length,run:()=>catalog('卖出道具',bag,'sell')},
      a('离开商店','leave'),
    ];
  }
  if(q.kind==='hermit'){title='仙人的三个宝箱';body=hasEffect(p,'charm')||p.charm?'护身符生效，这次三个宝箱都是好运。':'选择一个宝箱，仙人会赐予礼物或考验。好运、恶运和保护状态都会影响结果。';actions=[a('左边的宝箱','chest',0),a('中间的宝箱','chest',1),a('右边的宝箱','chest',2)];}
  if(q.kind==='debt'){
    title='需要支付豆沙包';body=q.text+'\n应付：'+moneyText(q.amount)+' · 手持：'+moneyText(p.cash)+' · 矿山：'+moneyText(p.bank)+'\n可以提取存款，或出售地产筹款。';
    actions=[a('支付 '+moneyText(q.amount),'pay',undefined,p.cash<q.amount),a('从矿山提取欠缺金额','withdraw',undefined,!p.bank||p.cash>=q.amount)];
    actions.push(...ownedLots(g,debtor).map((i:number)=>a('出售 '+describeCell(i)+' · 回收 '+saleValue(map,g,i),'sell',i)));
    if(liquidity(map,g,debtor)<q.amount)actions.push(a('资产不足，确认破产','bankrupt'));
  }
  actions.push({label:'保存并返回主菜单',run:async()=>{await persist();titleScreen();}});
  show(p.name+' · '+title,(visitLabel?visitLabel+'\n':'')+body,actions,true);
}
async function renderMini(){
  const session=g.pending.session,title=MINI_GAMES[session.id as keyof typeof MINI_GAMES].name;
  if(session.stage==='intro'){
    show(title,'四人同时挑战。'+MINI_GAMES[session.id as keyof typeof MINI_GAMES].instructions,[{label:'开始小游戏',primary:true,run:()=>{miniAutoStart=true;respond('start');}},{label:'保存并返回主菜单',run:async()=>{await persist();titleScreen();}}],true);return;
  }
  if(session.stage==='result'){
    const rewards=miniRewards(session);show(title+' · 比赛结束',session.players.map((p:any,i:number)=>p?g.players[i].name+'：'+p.score+' 分，获得 '+rewards[i]+' 豆沙包':'').filter(Boolean).join('\n'),[{label:'领取奖励，返回棋盘',primary:true,run:()=>respond('collect')},{label:'保存并返回主菜单',run:async()=>{await persist();titleScreen();}}],true);return;
  }
  const epoch=loadEpoch,autostart=miniAutoStart;miniAutoStart=false;show(title,'正在加载原版小游戏图片…',[],true);modal.classList.add('miniModal');
  try{
    const cleanup=await mountMiniGame($('modalContent'),{read:()=>g,valid:()=>epoch===loadEpoch&&active,autostart,tick:inputs=>dispatch({type:'miniTick',inputs}),save:persist,exit:titleScreen,finish:()=>{refresh();renderPrompt();},error:e=>{stopMini();paused=true;show('小游戏已暂停',String(e),[{label:'继续小游戏',run:()=>{paused=false;void drive();}},{label:'保存并返回主菜单',run:async()=>{await persist();titleScreen();}}],true);}});
    if(epoch!==loadEpoch||!active)cleanup();else miniDispose=cleanup;
  }catch(e){stopMini();show('小游戏资源加载失败',String(e),[{label:'重试',run:()=>renderMini()},{label:'保存并返回主菜单',run:async()=>{await persist();titleScreen();}}],true);}
}
type ScoreEntry={match:string;name:string;assets:number};
function scores():ScoreEntry[]{
  try{const entries=JSON.parse(localStorage.getItem('dingdang.finished-scores')??'[]');return Array.isArray(entries)?entries.filter(e=>e&&typeof e.match==='string'&&typeof e.name==='string'&&Number.isFinite(e.assets)):[];}catch{return [];}
}
function showRanking(){
  audio.scene(2);
  const list=scores();show('排行榜',list.length?list.map((e,i)=>`${i+1}. ${e.name}　${e.assets} 豆沙包`).join('\n'):'本机还没有已结算的对局。',[{label:'返回主菜单',run:titleScreen}],true);
}
function results(){
  const certificate=winnerCertificate(map,g);
  let unlockedNow=false;
  try{const unlocked=awardCertificate(localStorage,g,certificate);unlockedNow=unlocked&&!yellowUnlocked;yellowUnlocked ||= unlocked;}catch{toast('证书解锁记录未能保存，请重试打开结算。');}
  const ranking=g.players.map((p:any,i:number)=>({p,i,value:netWorth(map,g,i)})).sort((a:any,b:any)=>Number(a.p.eliminated)-Number(b.p.eliminated)||b.value-a.value);
  const match=JSON.stringify([g.map,g.seed,g.turnSerial,g.winners,ranking.map((r:any)=>r.value)]);
  const previous=scores();if(!previous.some(e=>e.match===match)){
    const winners=ranking.filter((r:any)=>g.winners.includes(r.i)).map((r:any)=>({match,name:r.p.name,assets:r.value}));
    try{localStorage.setItem('dingdang.finished-scores',JSON.stringify([...previous,...winners].sort((a,b)=>b.assets-a.assets).slice(0,8)));}catch{/* A full store must not prevent match settlement. */}
  }
  const certificateText=certificate?'\n\n'+certificate.name+'的证书 · Rank '+certificate.grade+'\n经过 '+certificate.days+' 天 · 总资产 '+moneyText(certificate.assets)+'\n'+certificate.buildings.map((count:number,level:number)=>LEVEL_NAMES[level]+' '+count).join(' · '):'';
  const afterword=()=>{
    show('胜利片尾','正在加载原版片尾…',[{label:'保存并返回主菜单',run:async()=>{await persist();titleScreen();}}],true);const signal=sceneSignal();audio.scene(4);
    void mountVictoryAfterword($('modalContent'),{signal,onSfx:clip=>void audio.play({kind:'sfx',clip}),onDone:titleScreen}).then(()=>{if(!signal.aborted)$('modalContent').querySelector('p')?.remove();}).catch(e=>{if(signal.aborted)return;stopScene();toast('片尾图片未加载：'+String(e));results();});
  };
  const viewCertificate=(continueEnding=false)=>{
    show('游戏证书','',[
      {label:'文字成绩',run:results},continueEnding?{label:'继续原版片尾',primary:true,run:afterword}:{label:'再玩一局',primary:true,run:setup}
    ],true);
    const signal=sceneSignal();audio.scene(4);
    void mountCertificate($('modalContent'),certificate!,match,signal).catch(e=>{if(signal.aborted)return;console.warn(e);toast('证书图片暂未加载，请重试。');results();});
  };
  if(!endingShown){
    show(certificate?'恭喜获胜':'游戏结束','正在加载原版结局…',[{label:'保存并返回主菜单',run:async()=>{await persist();titleScreen();}}],true);const signal=sceneSignal();audio.scene(certificate?4:6);
    const scene=certificate?mountVictoryPresentation($('modalContent'),{certificate,signal,onSfx:clip=>void audio.play({kind:'sfx',clip}),onDone:()=>{endingShown=true;stopScene();audio.scene(4);if(certificate.character==='yellow')afterword();else viewCertificate(true);}}):mountGameOverPresentation($('modalContent'),{signal,onDone:()=>{endingShown=true;titleScreen();}});
    void scene.then(()=>{if(!signal.aborted)$('modalContent').querySelector('p')?.remove();}).catch(e=>{if(signal.aborted)return;endingShown=true;stopScene();toast('结局图片未加载：'+String(e));results();});return;
  }
  const actions:Action[]=[{label:'再玩一局',primary:true,run:()=>setup()},{label:'返回主菜单',run:()=>titleScreen()}];
  if(certificate&&certificate.character!=='yellow')actions.unshift({label:'查看证书',run:()=>viewCertificate()});
  const outcome=g.winners.length?g.winners.map((i:number)=>g.players[i].name).join('、')+'获胜':'本局无人获胜';
  show('游戏结束 · '+outcome,g.endReason+'\n\n'+ranking.map((r:any,i:number)=>(i+1)+'. '+r.p.name+'　'+(r.p.eliminated?'已破产':r.value+' 豆沙包资产')).join('\n')+certificateText+(unlockedNow?'\n\n已解锁黄耳叮当，可在新游戏选择。':''),actions,true);
}
async function playItemPresentation(epoch:number){
 const current=presentation;if(!current)return;
 const lifecycle=current.kind==='lifecycle',cash=current.kind==='cash';
 const catalog=lifecycle?lifecycleArt:cash?cashArt:itemArt,prefix=lifecycle?'lifecycle-':cash?'cash-':'item-';
 if(!current.loaded){
  const sprites=new Set<number>(current.steps.flatMap((s:any)=>lifecycle?s.tracks.flatMap((t:any)=>catalog.animations[t.animation].sprites):catalog.animations[s.animation].sprites));
  const sources=[...sprites].map(n=>[prefix+n,catalog.images[n].url]);
  if(current.kind==='cash')for(const step of current.steps)if(step.pose!==null){const p=g.players[step.actor],index=characterArt.characters[p.character][p.small?'1':'0'][step.pose][p.direction];for(const n of characterArt.animations[index].sprites)sources.push(['pose-'+n,characterArt.images[n].url]);}
  await loadSprites(sources,images,images);
  if(epoch!==loadEpoch||presentation!==current)return;current.loaded=true;
 }
 const soundFrame=(step:any,frame:number)=>{
  if(current.sounded===frame)return;current.sounded=frame;
  const play=(a:any,tick:number,opcode=0x8000)=>{if(tick<0||tick>=a.frames)return;for(const c of a.commands)if(c[0]===tick&&c[1]===opcode)void audio.play({kind:'sfx',clip:c[2]});};
  if(lifecycle){for(const t of step.tracks)play(catalog.animations[t.animation],frame-t.delayFrames);return;}
  const tick=cash?frame-(step.preFrames??0):frame;play(catalog.animations[step.animation],tick);
  if(cash&&step.kind==='bank'){
   if(frame===(step.preFrames??0))void audio.play({kind:'sfx',clip:11});
   const a=map.animations[map.cells[step.lot].object];
   if(a&&frame<step.mineFrames)play(a,bankMineFrame(step,frame),step.delta>0?0x80c8:0x8000);
  }
 };
 let last=performance.now(),elapsed=0;
 while(presentation===current&&epoch===loadEpoch&&active&&!paused){
  const step=current.steps[current.index],a=lifecycle?null:catalog.animations[step.animation],duration=lifecycle?step.frames:cash?cashDuration(step,a):a.frames;
  Object.assign(camera,project(step.point.x,step.point.y));camera.y-=40;dirty=true;
  soundFrame(step,current.frame);
  await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
  if(paused||epoch!==loadEpoch||!active)return;
  const now=performance.now();elapsed+=Math.min(100,now-last)*speed;last=now;
  while(elapsed>=1000/30){elapsed-=1000/30;current.frame++;current.sounded=-1;
   if(current.frame>=duration){current.index++;current.frame=0;elapsed=0;if(current.index>=current.steps.length){presentation=presentationQueue.shift()??null;center();return;}break;}
   soundFrame(step,current.frame);
  }
 }
}
async function drive(){
  const epoch=loadEpoch;if(drivingEpoch===epoch||!active||paused)return;drivingEpoch=epoch;busy=true;refresh();
  try{
    await persist();if(epoch!==loadEpoch||!active||paused)return;
    while(active&&!paused&&epoch===loadEpoch){
      if(presentation){await playItemPresentation(epoch);continue;}
      const p=g.players[g.turn];
      if(g.phase==='gameover'){await persist();if(epoch!==loadEpoch||!active||paused)return;results();return;}
      if(g.phase==='ready'){
        if(!dispatch({type:'beginTurn'})){await persist();if(epoch!==loadEpoch||!active||paused)return;continue;}
        await persist();if(epoch!==loadEpoch||!active||paused)return; // Persist an expired effect even while waiting for human input.
        if(presentation)continue;
        if(p.control==='human')return;
        await delay(450/speed);if(paused||epoch!==loadEpoch||!active)return;
        dispatch(g.itemAiVersion==='pc-v126'?{type:'aiAction'}:chooseAiAction(map,g));
        await persist();if(epoch!==loadEpoch||!active||paused)return;refresh();continue;
      }
      if(g.phase==='moving'){
        if(g.dicePending){await showDice(epoch);if(epoch!==loadEpoch||paused||!active)return;continue;}
        const ns=choices(map,g);if(!ns.length){dispatch({type:'noExit'});await persist();if(epoch!==loadEpoch||!active||paused)return;continue;}
        if(p.control==='human'&&g.pcNavigationVersion!=='pc-v126'&&ns.length>1&&plannedStep===null){setRoutes(ns);return;}
        const from=playerPosition(map,p);
        const walk=dispatch(plannedStep===null&&(p.control==='ai'||g.pcNavigationVersion==='pc-v126')?{type:'aiStep'}:{type:'step',to:plannedStep??ns[0]});
        plannedStep=null;$('routes').replaceChildren();
        if(walk)moving={...project(from.x,from.y),actor:p,tick:0,direction:walk.direction};
        dirty=true;await persist();
        if(epoch!==loadEpoch||!active||paused){moving=null;return;}
        refresh();if(walk)await animate(from,walk,p,epoch);if(epoch!==loadEpoch)return;
        center();continue;
      }
      if(g.phase==='landed'){dispatch({type:'landing'});await persist();if(epoch!==loadEpoch||!active||paused)return;continue;}
      if(g.phase==='resolving'){const before=g.log.length,last=g.log.at(-1)?.text,from=p.at;dispatch({type:'advance'});if(g.players[g.turn].at!==from)center();await persist();if(epoch!==loadEpoch||!active||paused)return;refresh();if(g.log.length!==before||g.log.at(-1)?.text!==last){$('lastEvent').textContent=g.log.at(-1)?.text??'';}continue;}
      if(g.phase==='prompt'){
        if(g.pending.kind==='minigame'){await renderMini();return;}
        if(g.players[g.pending.debtor??g.turn].control==='human'||g.pending.kind==='monthly'&&g.players.some((q:any)=>q.control==='human')){renderPrompt();return;}
        $('lastEvent').textContent=p.name+'正在'+({buy:'购买土地',upgrade:'升级建筑',property:'管理地产',bank:'办理存取款',shop:'购买道具',hermit:'选择宝箱',debt:'处理欠款',notice:'查看消息',destination:'选择到访地点',missile:'选择导弹目标'} as Record<string,string>)[g.pending.kind];
        await delay(220/speed);if(paused||epoch!==loadEpoch||!active)return;
        dispatch({type:'aiAnswer'});await persist();if(epoch!==loadEpoch||!active||paused)return;$('lastEvent').textContent=g.log.at(-1)?.text??'';refresh();continue;
      }
      if(g.phase==='end'){
        if(!spectating&&g.players.filter((q:any)=>q.control==='human').every((q:any)=>q.eliminated)){
          show('真人玩家已破产','可以继续观看电脑完成这局游戏，或保存后返回主菜单。',[{label:'继续观战',run:()=>{spectating=true;void drive();}},{label:'保存并返回主菜单',run:async()=>{await persist();titleScreen();}}],true);return;
        }
        dispatch({type:'nextTurn'});await persist();if(epoch!==loadEpoch||!active||paused)return;center();refresh();continue;
      }
      throw Error('未知回合状态');
    }
  }catch(e){paused=true;show('游戏已暂停',String(e),[{label:'保存并返回主菜单',run:async()=>{await persist();titleScreen();}}],true);}
  finally{if(epoch===loadEpoch){busy=false;refresh();}if(drivingEpoch===epoch)drivingEpoch=-1;}
}
function titleScreen(){
  stopScene();presentation=null;presentationQueue=[];
  hermitStatuses?.update({player:null,events:[],active:false});
  audio.scene(null);
  stopMini();
  active=false;paused=false;loadEpoch++;busy=false;plannedStep=null;teleporting=false;moving=null;$('routes').replaceChildren();modal.close();
  $('titleScreen').hidden=false;pcTitle?.show();$<HTMLButtonElement>('continueGame').disabled=!saveStore.hasSave();$('inspect').hidden=true;refresh();
}
function localDate(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
function enter(game:any){stopScene();presentation=null;presentationQueue=[];hermitStatuses?.update({player:null,events:[],active:false});endingShown=false;miniAutoStart=false;loadEpoch++;g=game;replayRecord={format:'dingdang-replay-v1',initial:JSON.parse(JSON.stringify(g)),commands:[]};active=true;paused=false;spectating=false;plannedStep=null;teleporting=false;modal.close();$('titleScreen').hidden=true;audio.scene(null);save();center();refresh();void drive();}
let yellowUnlocked=permanentYellowUnlocked(localStorage);
function attachSecretEntry(form:HTMLFormElement,refresh:()=>void){
  if(yellowUnlocked)return;
  const choices=form.querySelector<HTMLElement>('.pcCharacterChoices')!;
  const secret=document.createElement('button');
  secret.type='button';secret.style.left='43.75%';secret.textContent='？';secret.setAttribute('aria-label','隐藏角色');
  const entry=document.createElement('dialog'),input=document.createElement('input'),submit=document.createElement('button'),cancel=document.createElement('button');
  input.setAttribute('aria-label','输入秘籍');input.placeholder='输入秘籍';input.autocomplete='off';
  submit.type=cancel.type='button';submit.textContent='确定';cancel.textContent='返回';
  const close=()=>{entry.close();entry.remove();};
  const unlock=()=>{
    if(!acceptHiddenCode(input.value)){input.setCustomValidity('秘籍不正确');input.reportValidity();return;}
    const saved=Array.from(form.querySelectorAll('select[id]'),el=>[el.id,(el as HTMLSelectElement).value]);
    close();yellowUnlocked=true;refresh();
    for(const [id,value] of saved){
      const select=document.getElementById(id) as HTMLSelectElement|null;
      if(select){select.value=value;select.dispatchEvent(new Event('change'));}
    }
  };
  input.oninput=()=>input.setCustomValidity('');input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();unlock();}};
  submit.onclick=unlock;cancel.onclick=close;entry.oncancel=()=>entry.remove();
  entry.append(input,submit,cancel);secret.onclick=()=>{document.body.append(entry);entry.showModal();input.focus();};choices.append(secret);
}
function addPlayerFields(form:HTMLFormElement,defaults:string[],candidates:typeof CHARACTERS){
  defaults.forEach((id,i)=>{const row=document.createElement('div');row.className='setupRow';const label=document.createElement('label');label.textContent='P'+(i+1);const select=document.createElement('select');select.id='character'+i;select.setAttribute('aria-label','P'+(i+1)+'角色');for(const c of candidates){const option=document.createElement('option');option.value=c.id;option.textContent=c.name;select.append(option);}select.value=id;const control=document.createElement('select');control.id='control'+i;control.setAttribute('aria-label','P'+(i+1)+'控制方式');for(const [value,text] of [['human','真人'],['ai','电脑']]){const option=document.createElement('option');option.value=value;option.textContent=text;control.append(option);}control.value=i?'ai':'human';const description=document.createElement('small');const update=()=>{description.textContent=CHARACTERS.find(c=>c.id===select.value)!.description;if(document.getElementById('setupError'))$('setupError').textContent='';};select.onchange=update;update();row.append(label,select,control,description);form.append(row);});
}
function setup(){
  const candidates=selectableCharacters(CHARACTERS,yellowUnlocked);
  audio.sync(g,false,false);audio.scene(null);
  active=false;loadEpoch++;busy=false;show('开始新游戏','四人对局\n可以选择 1～4 名真人，其他位置由电脑控制。',[],true);
  const defaults=['doraemon','nobita','shizuka','gian'];const form=document.createElement('form');form.id='setupForm';
  const mapSelect=document.createElement('select');mapSelect.id='mapChoice';mapSelect.setAttribute('aria-label','选择地图');
  MAP_NAMES.forEach((name,id)=>{const option=document.createElement('option');option.value=String(id);option.textContent=name;mapSelect.append(option);});mapSelect.value=String(map?.id??4);form.append(mapSelect);
  const preview=document.createElement('img');preview.id='mapPreview';preview.alt='地图预览';preview.style.cssText='display:block;max-height:150px;max-width:100%;margin:8px auto;image-rendering:pixelated';
  mapSelect.onchange=()=>{preview.src=`assets/maps/${mapSelect.value}/preview.png`;};mapSelect.onchange(new Event('change'));form.append(preview);
  addPlayerFields(form,defaults,candidates);
  const duration=document.createElement('select');duration.id='duration';duration.setAttribute('aria-label','胜利条件');for(let year=1;year<=9;year++){const option=document.createElement('option');option.value=year===9?'0':String(year);option.textContent=year===9?'不限年期':year+' 年';duration.append(option);}form.append(duration);
  const note=document.createElement('p');note.className='setupNote';note.textContent='日期从今天开始，每轮过一天。初始手持与矿山各 1000，小夫各 2000。年期届满后按总资产结算。';form.append(note);
  const error=document.createElement('p');error.id='setupError';error.setAttribute('role','alert');form.append(error);
  const start=document.createElement('button');start.type='submit';start.className='primary';start.textContent='开始游戏';form.append(start);
  form.onsubmit=async e=>{e.preventDefault();if(mapLoading)return;try{
    const players=defaults.map((_,i)=>({character:$<HTMLSelectElement>('character'+i).value,control:$<HTMLSelectElement>('control'+i).value}));
    if(!players.some(p=>p.control==='human'))throw Error('至少选择一位真人玩家。');
    const options={players,maxYears:Number(duration.value),startDate:localDate(),seed:crypto.getRandomValues(new Uint32Array(1))[0]};
    if(new Set(players.map(p=>p.character)).size!==4)throw Error('请选择四名不同角色');
    playSelection({type:'confirm'});
    mapLoading=true;for(const el of Array.from(form.querySelectorAll('button,select')))(el as HTMLButtonElement).disabled=true;
    start.textContent='正在打开地图…';
    const prepared=await prepareMap(Number(mapSelect.value),players.map(p=>p.character));const game=createGame(prepared.map,options);
    commitMap(prepared);enter(game);
  }catch(e){error.textContent=String(e);}finally{mapLoading=false;start.textContent='开始游戏';for(const el of Array.from(form.querySelectorAll('button,select')))(el as HTMLButtonElement).disabled=false;}};
  const back=document.createElement('button');back.textContent='返回';back.type='button';back.onclick=()=>{playSelection({type:'cancel'});titleScreen();};form.append(back);$('modalContent').append(form);mountSelection(form,candidates,playSelection);mountMapChoice(form,MAP_NAMES);
  mountSetupPages(form);
  attachSecretEntry(form,setup);
}
async function resume(){if(mapLoading)return;mapLoading=true;paused=true;loadEpoch++;try{
  const text=await saveStore.load();if(!text)throw Error('没有当前版本的存档');
  const saved=JSON.parse(text),id=saved?.map;const prepared=await prepareMap(id,saved.players.map((p:any)=>p.character),saved.mapRevision??'legacy');const game=restore(prepared.map,text);
  commitMap(prepared);enter(game);
}catch(e){show('无法读取进度',String(e)+'\n存档保留在本机。',[{label:'返回主菜单',run:()=>titleScreen()}],true);}finally{mapLoading=false;}}
function openMenu(){
  if(!active)return;paused=true;refresh();show('游戏菜单','第 '+g.round+' 天 · '+g.players[g.turn].name+'\n'+(g.maxRounds?(g.maxYears?g.maxYears+' 年期':g.maxRounds+' 天短局'):'经典胜负')+' · 游戏已暂停',[
    {label:'继续游戏',primary:true,run:()=>{paused=false;refresh();void drive();}},
    {label:'保存进度',run:async()=>{await persist();toast('进度已保存');paused=false;void drive();}},
    {label:'读取进度',run:()=>resume()},
    {label:'动画设置',run:animationSettings},
    {label:'声音设置',run:()=>audioSettings(openMenu)},
    {label:'本局记录',run:()=>show('本局记录',g.log.slice(-25).map((e:any)=>'第 '+e.round+' 天 · '+e.text).join('\n'),[{label:'返回菜单',run:openMenu}],true)},
    {label:'保存并返回主菜单',run:async()=>{await persist();titleScreen();}},
  ],true);
}
function animationSettings(){
  const rollOn=localStorage.getItem('dingdang.roll-animation')!=='off';
  const actions:Action[]=[{label:'动画速度：'+speed+'×',run:()=>{speed=speed===1?3:1;animationSettings();}}];
  if(g.pcAnimatedRoll)actions.push({label:'掷骰动画：'+(rollOn?'开':'关'),run:()=>{
    localStorage.setItem('dingdang.roll-animation',rollOn?'off':'on');animationSettings();
  }});
  actions.push({label:'返回菜单',run:openMenu});
  show('动画设置','',actions,true);
}
function playerInfo(){
 if(!active)return;paused=true;show('玩家与地产','',[{label:'返回游戏',run:()=>{paused=false;void drive();}}],true);
 const cards=document.createElement('section');cards.className='playerSummary';cards.setAttribute('aria-label','四位玩家资产');
 g.players.forEach((p:any,i:number)=>{const card=document.createElement('article'),heading=document.createElement('strong'),portrait=document.createElement('img'),values=document.createElement('p');
  portrait.src=`assets/ui/portrait-${CHARACTERS.find(c=>c.id===p.character)!.portrait+i}.png`;portrait.alt='';
  heading.textContent='P'+(i+1)+' '+p.name+(p.eliminated?' · 已破产':p.control==='ai'?' · 电脑':' · 真人');
  values.textContent='手持 '+moneyText(p.cash)+'\n矿山 '+moneyText(p.bank)+' · 地产 '+ownedLots(g,i).length+'\n总资产 '+moneyText(netWorth(map,g,i))+(effectText(p)?'\n'+effectText(p):'');
  card.append(portrait,heading,values);cards.append(card);
 });$('modalContent').querySelector('p')!.replaceWith(cards);
}
function audioSettings(back:()=>void){
  show('声音设置','分别调节原版音乐、音效与角色语音。',[{label:'返回',run:back}],true);
  const form=document.createElement('div');form.className='audioSettings';
  for(const [key,label] of [['music','音乐'],['sfx','音效'],['voice','语音']] as const){
    const row=document.createElement('label'),value=document.createElement('span'),slider=document.createElement('input');
    slider.type='range';slider.min='0';slider.max='100';slider.step='5';slider.value=String(Math.round(audio.settings[key]*100));slider.setAttribute('aria-label',label+'音量');
    const change=()=>{audio.set(key,Number(slider.value)/100);value.textContent=label+' '+slider.value+'%';};slider.oninput=change;value.textContent=label+' '+slider.value+'%';row.append(value,slider);form.append(row);
  }
  const row=document.createElement('label'),select=document.createElement('select');row.textContent='角色语音';select.setAttribute('aria-label','角色语音');
  for(const [value,label] of [['mandarin','普通话'],['cantonese','粤语']]){const o=document.createElement('option');o.value=value;o.textContent=label;select.append(o);}
  select.value=audio.settings.language;select.onchange=()=>audio.set('language',select.value as 'mandarin'|'cantonese');row.append(select);form.append(row);$('modalContent').append(form);
}
function sleepSelection(showAll:boolean,donor?:number){
 const p=g.players[g.turn],first=donor===undefined;
 show('睡意枪 · '+(first?'选择睡眠来源':'选择接收者'),first?'先吸走一名对手的睡意。':'将睡意交给另一名对手，持续五天。',[
  ...g.players.map((q:any,i:number)=>({label:q.name,disabled:i===g.turn||(first?!canTakeSleep(p,q):!canGiveSleep(g,donor,i)),run:()=>{
   if(first)sleepSelection(showAll,i);else{dispatch({type:'useItem',item:'original-26',target:{donor,recipient:i}});save();center();void drive();}
  }})),{label:first?'取消':'返回选择来源',run:()=>first?inventory(showAll):sleepSelection(showAll)}
 ],true);
}
function inventory(showAll=false,selectedItem?:string,scroll=0){
  if(!active||busy||g.phase!=='ready'||g.players[g.turn].control!=='human')return;const p=g.players[g.turn];
  
  const ids=[...new Set<string>(p.inventory)].filter(id=>showAll||ITEMS[id].implemented).sort((a,b)=>Number(ITEMS[b].implemented)-Number(ITEMS[a].implemented)||ITEMS[a].originalId-ITEMS[b].originalId);
  const itemActions=ids.map((id:string)=>({label:ITEMS[id as keyof typeof ITEMS].name+' × '+p.inventory.filter((v:string)=>v===id).length+(ITEMS[id].implemented?'':' · 效果待还原'),run:()=>{
      const pocketScroll=document.querySelector('.shopItems')?.scrollTop??0;
      const land=SPECIAL_BUILDINGS.includes(id)?specialBuildStatus(map,g,id):['restoreRay','timeCloth'].includes(id)?landItemStatus(map,g,id):null;
      const effect=CLONE_ITEMS.includes(id)&&!planClones(map,g,id)?{allowed:false,replaced:[],reason:'身后没有足够道路放置分身'}:id==='original-21'&&movableBuildings(g).length<2?{allowed:false,replaced:[],reason:'地图上需要两座普通建筑'}:id==='original-5'&&p.monthlyClaimed?{allowed:false,replaced:[],reason:'这个月已经使用过日期转换仪'}:id==='original-16'&&g.slowDays?{allowed:false,replaced:[],reason:'疯狂时间器仍在生效'}:id==='original-26'&&!sleepTransferAvailable(g)?{allowed:false,replaced:[],reason:'需要一名有睡意的对手，以及另一名可攻击的清醒对手'}:(id==='original-3'||SELF_EFFECTS.includes(id)||REDIRECT_ITEMS.includes(id))?effectApplicationStatus(p,id,g.turn,false):null;
      const detail=land?(land.allowed?'\n\n目标：'+g.players[g.owners[land.lot!]].name+'的土地（'+map.cells[land.lot!].x+','+map.cells[land.lot!].y+'）': '\n\n'+land.reason):effect?(!effect.allowed?'\n\n'+effect.reason:effect.replaced.length?'\n\n将替换：'+effect.replaced.map((e:any)=>ITEMS[e.id].name).join('、'):''):'';
      show(ITEMS[id as keyof typeof ITEMS].name,ITEMS[id as keyof typeof ITEMS].description+detail,[{label:'使用道具',primary:true,disabled:!(effectCapabilities(p)&1)||p.jail||p.itemSleeping||!!p.skip||!ITEMS[id].implemented||!!(effect&&!effect.allowed)||!!(land&&!land.allowed),run:()=>{
      if(id==='door'||id==='original-6'||id==='original-13'||id==='original-21'){teleporting=true;roadSelection=id;propertyFirst=-1;dirty=true;toast(id==='original-21'?'依次点击两座绿色建筑，拖动或缩放地图寻找目标':id==='original-6'?'点击绿色道路放置缩形隧道':id==='door'?'点击绿色道路放置任意门':'点击绿色道路选择大炮落点');const cancel=document.createElement('button');cancel.textContent='取消选位置';cancel.onclick=()=>{teleporting=false;propertyFirst=-1;dirty=true;$('routes').replaceChildren();};$('routes').replaceChildren(cancel);}
      else if(id==='original-26'){sleepSelection(showAll);}
      else if(TARGET_ITEMS.includes(id)){show(ITEMS[id].name+' · 选择对手','大雄不能攻击静香；处于免攻击保护或互斥状态的对手不可选择。',g.players.map((q:any,i:number)=>({label:q.name,disabled:i===g.turn||!canAttackPlayer(p,q,g.turn,id,i),run:()=>{dispatch({type:'useItem',item:id,target:i});save();center();void drive();}})).concat([{label:'取消',run:()=>inventory(showAll,id,pocketScroll)}]),true);}
      else{dispatch({type:'useItem',item:id});save();void drive();}
    }},{label:'返回口袋',run:()=>inventory(showAll,id,pocketScroll)}],true);}}));
  show('四次元口袋',`共 ${p.inventory.length} 件 · 上下滑动选择道具，查看用法后施放。`,[],true);
  mountShopCatalog($('modalContent'),ids.map((id,index)=>({id,originalId:ITEMS[id].originalId,name:ITEMS[id].name,description:ITEMS[id].description,price:'',count:p.inventory.filter((held:string)=>held===id).length,label:'查看用法 · '+ITEMS[id].name,run:itemActions[index].run})), 'use',()=>{},()=>modal.close(),{selected:selectedItem,scroll});
}
$('roll').onclick=()=>{if(!active||busy||paused||g.phase!=='ready'||g.players[g.turn].control!=='human')return;teleporting=false;$('routes').replaceChildren();dispatch({type:'roll'});save();void drive();};
$('home').onclick=()=>center();$('zoomIn').onclick=()=>zoom(camera.z*1.25);$('zoomOut').onclick=()=>zoom(camera.z/1.25);$('overview').onclick=()=>{camera={x:(map.width-map.height)*20,y:(map.width+map.height-2)*10,z:Math.max(.08,Math.min(width/((map.width+map.height)*40+160),height/((map.width+map.height)*20+320)))};dirty=true;};
$('mapButton').onclick=()=>$('overview').click();$('items').onclick=()=>inventory();$('stats').onclick=playerInfo;$('portrait').onclick=playerInfo;$('menu').onclick=openMenu;$('pause').onclick=openMenu;
$('newGame').onclick=()=>{if(saveStore.hasSave())show('开始新的一局？','开始游戏后会替换当前版本的自动存档。',[{label:'设置新游戏',primary:true,run:setup},{label:'返回',run:titleScreen}],true);else setup();};$('continueGame').onclick=resume;
$('soundSettings').onclick=()=>audioSettings(titleScreen);
for(const id of ['soundSettings','instructions'])decorateAction($(id),$(id).textContent||'');
type ArcadePlayer={name:string;character:string;control:string;eliminated:boolean};
type ArcadeMatch={players:ArcadePlayer[];totals:number[];competition:boolean};
function playSelection(action:any){for(const event of selectionAudio(action))void audio.play(event);}
function arcadePlayers(competition:boolean){
  audio.sync(g,false,false);audio.scene(null);
  show('选择参赛角色','',[],true);
  const form=document.createElement('form'),defaults=['doraemon','nobita','shizuka','gian'];
  const candidates=selectableCharacters(CHARACTERS,yellowUnlocked);
  addPlayerFields(form,defaults,candidates);mountSelection(form,candidates,playSelection);$('modalContent').append(form);
  const play=document.createElement('button'),back=document.createElement('button');
  play.type='submit';play.textContent='确定角色';play.className='primary';back.type='button';back.textContent='返回';back.onclick=()=>{playSelection({type:'cancel'});titleScreen();};
  const footer=document.createElement('footer');footer.className='setupFooter';footer.append(back,play);form.append(footer);
  form.onsubmit=e=>{e.preventDefault();
    const players=defaults.map((_,i)=>{const id=$<HTMLSelectElement>('character'+i).value;return {character:id,name:CHARACTERS.find(c=>c.id===id)!.name,control:$<HTMLSelectElement>('control'+i).value,eliminated:false};});
    if(!players.some(p=>p.control==='human')){toast('至少选择一位真人玩家。');return;}
    playSelection({type:'confirm'});
    const match={players,totals:[0,0,0,0],competition};if(competition)void startArcade(0,match);else arcadeMenu(match);
  };
  attachSecretEntry(form,()=>arcadePlayers(competition));
}
function arcadeMenu(match:ArcadeMatch){
  audio.scene(5);
  ++loadEpoch;
  const games=Object.entries(MINI_GAMES).map(([id,game])=>({label:game.name,run:()=>startArcade(Number(id),match)}));
  show('练习模式','选择小游戏。', [...games,{label:'返回主菜单',run:titleScreen}],true);
}
async function startArcade(id:number,match:ArcadeMatch,ready=false){
  audio.scene(5);
  const epoch=++loadEpoch;
  const info=MINI_GAMES[id as keyof typeof MINI_GAMES];
  if(!ready){
    show(info.name+' · 准备',info.instructions+'\n准备好后点击开始。倒计时从进入赛场才开始；中途可暂停。'+(id===1?'\n模仿错误会掉下去并出局，等待其他玩家结束后结算。':''),[
      {label:'开始小游戏',primary:true,run:()=>startArcade(id,match,true)},
      {label:match.competition?'退出比赛':'返回小游戏列表',run:()=>match.competition?titleScreen():arcadeMenu(match)}
    ],true);return;
  }
  const players=match.players;
  const stream={randomVersion:'pc-v126',seed:crypto.getRandomValues(new Uint32Array(1))[0]};
  const draw=(n:number)=>random(stream,n);
  let session=createMiniGame(id,players,draw);
  session.stage='playing';
  show(info.name,'正在加载小游戏…',[],true);
  modal.classList.add('miniModal');
  const leave=()=>match.competition?titleScreen():arcadeMenu(match);
  const finish=()=>{
    audio.scene(11);
    if(!match.competition){show(info.name+' · 练习结束',session.players.map((p:any,i:number)=>players[i].name+'：'+p.score+' 分').join('\n'),[
      {label:'再玩一次',primary:true,run:()=>startArcade(id,match)},{label:'选择小游戏',run:leave},{label:'返回主菜单',run:titleScreen}],true);return;}
    const points=tournamentPoints(session),totals=match.totals.map((sum,i)=>sum+points[i]);
    const standings=players.map((p,i)=>({name:p.name,total:totals[i],points:points[i]})).sort((a,b)=>b.total-a.total);
    const actions:Action[]=id===7?[]:[{label:'下一场',primary:true,run:()=>startArcade(id+1,{...match,totals})}];
    show(id===7?'比赛总成绩':info.name+' · 第 '+(id+1)+' 场',standings.map(p=>p.name+'　+'+p.points+'　总分 '+p.total).join('\n'),[...actions,{label:'返回主菜单',run:titleScreen}],true);
  };
  const error=(e:unknown)=>show('小游戏未能继续',String(e),[{label:'重试',run:()=>startArcade(id,match)},{label:'返回',run:leave}],true);
  try{
    const cleanup=await mountMiniGame($('modalContent'),{
      read:()=>({players,pending:{session}}),valid:()=>epoch===loadEpoch,autostart:true,
      tick:inputs=>{session=structuredClone(session);tickMiniGame(session,players,inputs,draw);},
      save:async()=>{},exitLabel:match.competition?'退出比赛':'返回小游戏列表',exit:leave,finish,error,
      retry:match.competition?undefined:()=>startArcade(id,match)
    });
    if(epoch===loadEpoch)miniDispose=cleanup;else cleanup();
  }catch(e){if(epoch===loadEpoch)error(e);}
}
$('instructions').onclick=()=>show('玩法说明','买地、升级、收租，在对局结束时争取最高总资产，或成为最后留下的角色。\n点击红色太阳掷骰，角色按点数沿道路自动前进；停下后选择路旁的土地、矿山或商店。口袋道具代替本回合掷骰。早期版本的存档在路口仍需点方向。\n现金可暂时为负，连续负现金15天会破产。路过矿山可取款，停靠可存取款，周日休息。\n八张地图、六名常规角色、可解锁的黄耳哆啦A梦、八款小游戏和42种道具。拖动地图、双指缩放，点定位按钮回到当前角色；小游戏按屏幕下方的按钮操作。暂停菜单可保存退出、调节动画速度和声音，主菜单可继续上次进度。',[{label:'返回主菜单',run:titleScreen}],true);
function backgroundPause(){if(active){if(g.pending?.kind!=='minigame')openMenu();void save();}}
document.addEventListener('visibilitychange',()=>{if(document.hidden)backgroundPause();});window.addEventListener('dingdangPause',backgroundPause);new ResizeObserver(resize).observe(canvas);
async function prepareMap(id:number,characters:string[],revision='pc-v126'){
  if(!Number.isInteger(id)||id<0||id>=MAP_NAMES.length)throw Error('存档中的地图编号无效');
  if(!['legacy','pc-v126'].includes(revision))throw Error('未知地图版本');
  const poses=boardCharacterSprites(characterArt,characters).map(n=>['pose-'+n,characterArt.images[n].url]);
  if(map?.id===id&&(map.revision??'legacy')===revision){
    await loadSprites(poses,images,images);
    return {map,images};
  }
  const response=await fetch(`assets/${revision==='legacy'?'maps':'maps-v126'}/${id}.json`);
  if(!response.ok)throw Error('地图资源缺失：'+MAP_NAMES[id]);
  const next:MapData=await response.json();next.name=MAP_NAMES[id];
  if(next.id!==id||next.cells.length!==next.width*next.height||next.starts.length!==4)throw Error('地图数据损坏');
  const used=new Set<string>();
  for(const c of next.cells){used.add('0-'+c.terrain);if(c.object>=228&&c.object<65535)used.add('2-'+c.object);}
  for(let i=0;i<228;i++)used.add('2-'+i);
  for(let i=266;i<286;i++)used.add('2-'+i);
  for(const a of Object.values(next.animations))for(const n of a.sprites)used.add('3-'+n);
  const sources=[...used].filter(k=>next.art[k]).map(k=>[k,next.art[k].url]);
  for(const [n,a] of Object.entries(roadArt.images) as [string,Art][])sources.push(['road-'+n,a.url]);
  sources.push(...poses);
  const companionSprites=new Set<number>();for(const poses of Object.values(itemArt.companions) as any[])for(const base of [poses.idle,poses.walk])for(let d=0;d<4;d++)for(const n of itemArt.animations[base+d].sprites)companionSprites.add(n);
  for(const n of companionSprites)sources.push(['item-'+n,itemArt.images[n].url]);
  for(const n of [2,75,76,77,78])sources.push(['roll-'+n,`assets/pc-roll/${n}.png`]);
  const nextImages:Record<string,any>={};
  const shared=Object.fromEntries(Object.entries(images).filter(([key])=>/^(pose|road|item)-/.test(key)));
  await loadSprites(sources,nextImages,shared);
  return {map:next,images:nextImages};
}
function commitMap(prepared:{map:MapData;images:Record<string,any>}){
  mapAnimationStarts={};presentation=null;presentationQueue=[];
  map=prepared.map;images=prepared.images;ordered=[...map.cells].sort((a,b)=>a.x+a.y-b.x-b.y||a.x-b.x);
  selected=-1;moving=null;plannedStep=null;teleporting=false;pointers.clear();start=null;gesture=null;dirty=true;
}
async function init(){try{
  await saveStore.load();
  await audio.init();
  const statusHost=document.createElement('div');statusHost.id='hermitStatusHost';document.querySelector('main')!.append(statusHost);
  hermitStatuses=mountHermitStatusView(statusHost,{onSound:clip=>void audio.play({kind:'sfx',clip}),onInspect:event=>{paused=true;refresh();show(event.name,(event.good?'仙人的好运效果':'仙人的恶运效果')+'\n剩余 '+event.remaining+' 回合。',[{label:'返回游戏',run:()=>{paused=false;refresh();void drive();}}],true);}});
  pcTitle=await mountPcTitle($('titleScreen'),showRanking,()=>show('离开游戏','要离开游戏吗？',[{label:'离开',run:async()=>{if(Capacitor.isNativePlatform())await registerPlugin<{exit():Promise<void>}>('GameSave').exit();else{titleScreen();pcTitle.show(true);}}},{label:'返回',run:titleScreen}],true),()=>{
    show('操控设定','',[],true);mountPcControls($('modalContent'),()=>{modal.close();});
  },arcadePlayers);
  const atlas=await fetch('assets/sprite-atlas/index.json');if(!atlas.ok)throw Error('动画图集缺失');loadSprites=createSpriteLoader(await atlas.json());
  const roads=await fetch('assets/road-items/catalog.json');if(!roads.ok)throw Error('道路道具资源缺失');roadArt=await roads.json();
  const poses=await fetch('assets/character-poses/catalog.json');if(!poses.ok)throw Error('角色动作资源缺失');characterArt=await poses.json();
  const cashAnimations=await fetch('assets/cash-animations/catalog.json');if(!cashAnimations.ok)throw Error('豆沙包动画资源缺失');cashArt=await cashAnimations.json();
  const itemAnimations=await fetch('assets/item-animations/catalog.json');if(!itemAnimations.ok)throw Error('道具动画资源缺失');itemArt=await itemAnimations.json();
  const lifecycleAnimations=await fetch('assets/item-lifecycle/catalog.json');if(!lifecycleAnimations.ok)throw Error('道具结束动画资源缺失');lifecycleArt=await lifecycleAnimations.json();
  resize();$('loading').style.display='none';draw();titleScreen();pcTitle.show(true);
  (window as any).__game={audio:()=>audio.diagnostics(),replay:()=>JSON.parse(JSON.stringify(replayRecord)),snapshot:()=>JSON.parse(JSON.stringify({game:g,camera,selected,busy,active,paused,visual:presentation?{kind:presentation.kind??'item',step:presentation.steps[presentation.index],item:presentation.item,index:presentation.index,frame:presentation.frame,loaded:presentation.loaded}:null,loaded:Object.keys(images).length})),cellScreen:(i:number)=>{const c=map.cells[i],p=project(c.x,c.y),r=canvas.getBoundingClientRect();return {x:r.left+width/2+(p.x-camera.x)*camera.z,y:r.top+height/2+(p.y-camera.y)*camera.z};}};
}catch(e){$('loading').textContent='小镇加载失败：'+String(e);}}
void init();


