import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectionAudio} from '../app/src/selection-audio.mjs';
test('selection voices match the newly supplied PC archive byte-for-byte',()=>{
 const evidence=JSON.parse(fs.readFileSync(new URL('../research/audio-selection-v126-table.json',import.meta.url)));
 const catalog=JSON.parse(fs.readFileSync(new URL('../app/public/assets/audio/catalog.json',import.meta.url)));
 assert.equal(evidence.sha256,'b99f70be2a703b7f20e5d7dbf6d29f2ffca86303f4be420bf9fb334cbe792eb1');
 assert.deepEqual(evidence.selectionIndexToVoiceCharacter,[0,1,2,6,3,4,5]);
 for(const row of evidence.archives[0].bank0clip59){
  if(row.character===6)assert.equal(row.entryExists,false);
  else assert.equal(catalog.voices.mandarin[`${row.character}-0-59`].sha256,row.waveSha256);
 }
});
test('new PC selection table maps all seven character Ready voices without fallback',()=>{
 const c=JSON.parse(fs.readFileSync(new URL('../app/public/assets/audio/catalog.json',import.meta.url)));
 for(const [character,id] of [['doraemon',0],['nobita',1],['dorami',2],['yellow',6],['shizuka',3],['suneo',4],['gian',5]]){
  const a={type:'character',character,previousCharacter:character};
  assert.deepEqual(selectionAudio(a),id===6?[]:[{kind:'voice',character:id,bank:0,clip:59}]);
  for(const lang of Object.values(c.voices))assert.equal(!!lang[`${id}-0-59`],id!==6);
 }
});
test('touch selection merges native move and Ready, and does not voice passive refresh/control',()=>{
 assert.deepEqual(selectionAudio({type:'character',character:'nobita',previousCharacter:'doraemon'}),[{kind:'sfx',clip:77},{kind:'voice',character:1,bank:0,clip:59}]);
 for(const type of ['slot','control','refresh','init'])assert.deepEqual(selectionAudio({type,character:'doraemon'}),[]);
 assert.deepEqual(selectionAudio({type:'character',character:'invalid'}),[]);
 assert.deepEqual(selectionAudio(),[]);
});
test('new PC final confirmation and cancellation retain their distinct sound IDs',()=>{
 assert.deepEqual(selectionAudio({type:'confirm'}),[{kind:'sfx',clip:82}]);
 assert.deepEqual(selectionAudio({type:'cancel'}),[{kind:'sfx',clip:74}]);
});
