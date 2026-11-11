import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGame,restore,random} from '../app/src/engine.mjs';
import {certificateGrade,winnerCertificate,awardCertificate,permanentYellowUnlocked,validUnlockRecords} from '../app/src/certificate.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/pc-v126-certificate.json',import.meta.url)));
const map=JSON.parse(fs.readFileSync(new URL('../app/public/assets/maps-v126/4.json',import.meta.url)));
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};
test('certificate grades match original x87 boundaries and zero-day cases',()=>{
  for(const row of fixture.rows)assert.equal(certificateGrade(row.assets,row.days),row.grade,JSON.stringify(row));
});
test('certificate counts only ordinary buildings and selects first seat on ties',()=>{
  const g=createGame(map);g.phase='gameover';g.winners=[2,0];g.round=1;
  const lots=map.cells.map((c,i)=>c.event===1?i:-1).filter(i=>i>=0).slice(0,3);
  lots.forEach((lot,i)=>{g.owners[lot]=0;g.levels[lot]=i;g.kinds[lot]=i===2?3:1;});
  const c=winnerCertificate(map,g);assert.equal(c.seat,0);assert.equal(c.grade,'S');assert.deepEqual(c.buildings,[1,1,0,0,0]);
  g.players[0].control='ai';assert.equal(winnerCertificate(map,g),null);
});
test('permanent unlock is idempotent across reopening, restart and restored older saves',()=>{
  const g=createGame(map,{seed:123});g.phase='gameover';g.winners=[0];g.round=2;
  const old=restore(map,JSON.stringify(g)),c=winnerCertificate(map,old),store=storage();
  assert.equal(c.grade,'S');assert.equal(awardCertificate(store,old,c),true);
  const record=store.getItem('dingdang.certificate-awards.v1');
  assert.equal(awardCertificate(store,old,c),true);assert.equal(store.getItem('dingdang.certificate-awards.v1'),record);
  assert.equal(permanentYellowUnlocked(store),true);
  const before=JSON.stringify(old);awardCertificate(store,old,c);assert.equal(JSON.stringify(old),before);
  const twoHumans=structuredClone(g);twoHumans.players[1].control='human';
  assert.equal(awardCertificate(storage(),twoHumans,c),false);
  assert.equal(awardCertificate(storage(),g,{...c,grade:'A'}),false);
  assert.equal(awardCertificate(storage(),g,{...c,character:'nobita'}),false);
});
test('unlock checksum follows all seven original selection cases',()=>{
  const original=JSON.parse(fs.readFileSync(new URL('../research/v126-yellow/catalog.json',import.meta.url)));
  for(const row of original.unlockCases)if(!row.flags)assert.equal(validUnlockRecords(row.records),row.selectionMask===128);
});
test('an original zero record stays locked and is never rerolled by reopening',()=>{
  const g=createGame(map);g.phase='gameover';g.winners=[0];g.round=2;
  let seed=0;while(random({seed,randomVersion:'pc-v126'},100)!==0)seed++;
  g.seed=seed;const c=winnerCertificate(map,g),store=storage();
  assert.equal(awardCertificate(store,g,c),false);
  const before=store.getItem('dingdang.certificate-awards.v1');
  assert.equal(awardCertificate(store,g,c),false);
  assert.equal(store.getItem('dingdang.certificate-awards.v1'),before);
});
test('term settlement awards the first tied seat on new v1.26 boards and retains legacy replay behavior',async()=>{
  const {executeCommand}=await import('../app/src/commands.mjs');
  const board=JSON.parse(fs.readFileSync(new URL('../app/public/assets/maps-v126/4.json',import.meta.url)));
  const g=createGame(board,{maxRounds:30,startDate:'2000-04-03'});
  g.phase='end';g.turn=3;g.round=30;
  assert.deepEqual(executeCommand(board,g,{type:'nextTurn'}).state.winners,[0]);
  delete g.firstSeatBreaksTie;
  assert.deepEqual(executeCommand(board,g,{type:'nextTurn'}).state.winners,[0,1,2,3]);
});
