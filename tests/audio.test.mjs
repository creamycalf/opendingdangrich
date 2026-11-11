import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {musicForGame,commandAudio,miniAnimationAudio,voiceCharacter} from '../app/src/audio-rules.mjs';
import {createGame} from '../app/src/engine.mjs';
import {executeCommand} from '../app/src/commands.mjs';
import {audioTurnFixtures,map as turnMap} from './audio-turn-fixtures.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url)));
const map=read('../app/public/assets/maps/4.json'),catalog=read('../app/public/assets/audio/catalog.json');
test('minigame settlement voices preserve the original strict award ordering and zero-award default',()=>{
 for(const [scores,turn,clip] of [[[3,1,0,0],0,17],[[1,3,0,0],0,18],[[3,3,0,0],1,18],[[0,0,0,0],1,17]]){
  const before=createGame(map,{startDate:'2000-04-03'});before.turn=turn;before.phase='prompt';
  before.pending={kind:'minigame',session:{id:6,stage:'result',remaining:0,players:scores.map(score=>({score}))}};
  const command={type:'answer',action:'collect'},after=executeCommand(map,before,command).state;
  assert.deepEqual(commandAudio(before,after,command).filter(e=>e.kind==='voice').map(e=>e.clip),[clip]);
 }
});
test('original music scene IDs and month parity survive a year boundary',()=>{
 const g=createGame(map,{startDate:'2000-12-31'});assert.equal(musicForGame(g),2);g.round++;assert.equal(musicForGame(g),3);
 for(const [kind,track] of [['bank',7],['shop',8],['hermit',3],['minigame',5]]){g.pending={kind};assert.equal(musicForGame(g),track);assert.ok(catalog.music[track]);}
 assert.equal(musicForGame(g,false),2);
});
test('voices use original character/bank/item IDs without consuming game RNG',()=>{
 assert.deepEqual(voiceCharacter,{doraemon:0,nobita:1,dorami:2,shizuka:3,suneo:4,gian:5,yellow:6});
 const before=createGame(map,{startDate:'2000-04-03'}),after=executeCommand(map,before,{type:'roll'}).state;
 const copy=structuredClone(after),sounds=commandAudio(before,after,{type:'roll'},()=>0);
 assert.deepEqual(sounds,[]);assert.deepEqual(after,copy);assert.ok(catalog.sfx[77]);assert.ok(catalog.sfx[78]);
 // The two source voice archives contain entries for factory IDs 0 through 5.
 for(const bank of Object.values(catalog.voices)){
   assert.deepEqual([...new Set(Object.keys(bank).map(k=>Number(k.split('-')[0])))].sort(),[0,1,2,3,4,5]);
   for(let id=0;id<6;id++)for(const item of [0,4,13,25,30,36,37])assert.ok(bank[[id,2,item].join('-')]);
 }
});
test('minigame sounds follow processed DAT frames, not repeated display renders',()=>{
 const c=read('../app/public/assets/minigames/catalog.json')['6'];
 const before={players:[{animation:0,age:4,mode:2}]},after={players:[{animation:0,age:5,mode:2}]};
 assert.deepEqual(miniAnimationAudio(before,after,c),[{kind:'sfx',clip:31}]);assert.deepEqual(miniAnimationAudio(after,after,c),[]);
 const c0=read('../app/public/assets/minigames/catalog.json')['0'];
 assert.deepEqual(miniAnimationAudio({players:[{animation:2,age:3,mode:1}]},{players:[{animation:8,age:1,mode:16}]},c0),[{kind:'sfx',clip:21}]);
});
test('original purchase voice alternatives and confirmation do not mutate the game RNG',()=>{
 const before=createGame(map,{startDate:'2000-04-03'}),after=structuredClone(before);
 after.pending={kind:'buy',lot:3};
 assert.deepEqual(commandAudio(before,after,{type:'advance'},()=>2),[{kind:'voice',character:0,bank:0,clip:46}]);
 const accepted=structuredClone(after);accepted.pending=null;accepted.owners[3]=0;
 assert.deepEqual(commandAudio(after,accepted,{type:'answer',action:'buy'}),[{kind:'voice',character:0,bank:0,clip:47}]);
 const declined=structuredClone(after);declined.pending=null;
 assert.deepEqual(commandAudio(after,declined,{type:'aiAnswer'}),[{kind:'voice',character:0,bank:0,clip:48},{kind:'sfx',clip:82}]);
 assert.equal(before.seed,after.seed);assert.equal(after.seed,accepted.seed);
});
test('ordinary turn audio follows committed gameplay including rent, upgrades, circles, hermit and bankruptcy',()=>{
 for(const f of audioTurnFixtures()){
  const before=structuredClone(f.before),after=structuredClone(f.after),events=commandAudio(f.before,f.after,f.command,()=>0,turnMap);
  assert.deepEqual(events.filter(e=>e.kind==='voice').map(e=>e.clip),f.clips,f.name);
  assert.deepEqual(events.filter(e=>e.kind==='sfx').map(e=>e.clip),f.sfx,f.name);
  if(f.name.startsWith('地主无法收租'))assert.deepEqual(events.filter(e=>e.kind==='voice').map(e=>e.character),[0,1],f.name);
  assert.deepEqual(f.before,before);assert.deepEqual(f.after,after);
 }
});
test('consecutive clone buy prompts use lot identity and preserve confirmation before the next opening',()=>{
 const before=createGame(map,{startDate:'2000-04-03'});before.pending={kind:'buy',lot:3};
 const after=structuredClone(before);after.owners[3]=0;after.pending={kind:'buy',lot:4};
 assert.deepEqual(commandAudio(before,after,{type:'answer',action:'yes'},()=>0).map(e=>e.clip),[47,44]);
 assert.deepEqual(commandAudio(after,structuredClone(after),{type:'miniTick'},()=>0),[]);
});
test('all extracted audio files have complete RIFF/OGG headers and match their recorded hashes',async()=>{
 const {createHash}=await import('node:crypto');let count=0;
 for(const [kind,entries] of Object.entries({sfx:catalog.sfx,...catalog.voices,music:catalog.music}))for(const meta of Object.values(entries)){
  const b=fs.readFileSync(new URL('../app/public/'+meta.url,import.meta.url));assert.equal(createHash('sha256').update(b).digest('hex'),meta.sha256);
  if(kind==='music')assert.equal(b.toString('ascii',0,4),'OggS');else{assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.readUInt32LE(4)+8,b.length);assert.ok(meta.frames>0);}
  count++;
 }
 assert.equal(count,2249);
});
