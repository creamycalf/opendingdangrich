// Read-only product audit: run our JS engine, never the original PC executable.
import fs from 'node:fs';
import * as E from '../app/src/engine.mjs';
import {applyEffect} from '../app/src/effects.mjs';
import {executeCommand} from '../app/src/commands.mjs';
import {itemVisualPlan} from '../app/src/item-presentation.mjs';
import {itemLifecyclePlan} from '../app/src/item-lifecycle-presentation.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url)));
const map=read('../app/public/assets/maps-v126/4.json'),art=read('../app/public/assets/item-animations/catalog.json'),life=read('../app/public/assets/item-lifecycle/catalog.json');
const before=E.createGame(map,{startDate:'2000-04-03'});applyEffect(before.players[1],'original-14',1,false);before.players[0].inventory=['original-4'];
const command={type:'useItem',item:'original-4',target:1},after=executeCommand(map,before,command).state;
const brief=p=>({at:p.at,direction:p.direction,itemSleeping:p.itemSleeping,dwarfBody:p.dwarfBody??null,dwarf:p.effects.find(e=>e.id==='original-14')});
const result={kind:'authored-engine-read-only-probe',command,before:brief(before.players[1]),after:brief(after.players[1]),initialAnimations:itemVisualPlan(map,before,after,command,art).map(s=>s.animation),lifecycle:itemLifecyclePlan(map,before,after,command,life),resources:[121,122,123,124].map(index=>{const a=life.animations[index];return {index,frames:a.frames,events:a.commands.filter(c=>c[1]>=32768),motion:[...new Set(a.commands.filter(c=>c[1]<a.sprites.length).map(c=>c[5]+','+c[6]))]};})};
fs.mkdirSync(new URL('../research/rc24-dwarf/',import.meta.url),{recursive:true});
fs.writeFileSync(new URL('../research/rc24-dwarf/current-engine-probe.json',import.meta.url),JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
