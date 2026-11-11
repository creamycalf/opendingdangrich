const {chromium}=require('../app/node_modules/playwright');
const {build}=require('../app/node_modules/esbuild');
const fs=require('node:fs'),assert=require('node:assert/strict');let browser;
// Short audible PCM fixture makes natural HTMLAudio ended/repeat observable.
// This tests lifecycle, not the content of original music (audio-playback-ui does that).
const rate=22050,count=rate/5,wav=Buffer.alloc(44+count*2);
wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(count*2,40);
for(let i=0;i<count;i++)wav.writeInt16LE(Math.round(2000*Math.sin(i*2*Math.PI*440/rate)),44+i*2);
(async()=>{
 const js=await build({stdin:{contents:"import {GameAudio} from './app/src/audio.ts';window.audioTest=new GameAudio();",resolveDir:process.cwd()},bundle:true,write:false,format:'iife'});
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage({hasTouch:true}),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/music-lifecycle',r=>r.fulfill({contentType:'text/html',body:'<button>启用音频</button>'}));
 await page.route('**/assets/audio/catalog.json',r=>r.fulfill({json:{music:Object.fromEntries([2,4,6,11].map(n=>[n,{url:`/short-${n}.wav`}])),sfx:{},voices:{mandarin:{},cantonese:{}}}}));
 await page.route('**/short-*.wav',r=>r.fulfill({contentType:'audio/wav',body:wav}));
 await page.goto((process.env.TEST_ORIGIN||'http://127.0.0.1:5185')+'/music-lifecycle');
 await page.addScriptTag({content:js.outputFiles[0].text});await page.evaluate(async()=>{await audioTest.init();audioTest.scene(4);});await page.getByRole('button').tap();
 await page.waitForFunction(()=>audioTest.diagnostics().playing);await page.waitForTimeout(700);
 const state=()=>page.evaluate(()=>audioTest.diagnostics());
 assert.equal((await state()).musicLoop,true);assert.equal((await state()).musicEnded,false);assert.equal((await state()).playing,true);checks.push('victory track 4 repeats beyond three natural fixture durations');
 for(const track of [6,11]){
  await page.evaluate(n=>audioTest.scene(n),track);await page.waitForFunction(()=>audioTest.diagnostics().musicEnded);
  assert.equal((await state()).musicLoop,false);assert.equal((await state()).playing,false);
  await page.getByRole('button').tap();
  await page.evaluate(()=>{audioTest.pause(true);audioTest.pause(false);window.dispatchEvent(new Event('dingdangPause'));window.dispatchEvent(new Event('dingdangResume'));audioTest.set('music',0);audioTest.set('music',.4);audioTest.sync(null,false);});
  await page.waitForTimeout(350);assert.equal((await state()).musicEnded,true);assert.equal((await state()).playing,false);
  checks.push(`track ${track} naturally ends once and touch/pause/native resume/volume/sync do not restart it`);
  await page.evaluate(n=>{audioTest.scene(2);audioTest.scene(n);},track);await page.waitForFunction(()=>audioTest.diagnostics().playing&&!audioTest.diagnostics().musicEnded);await page.waitForFunction(()=>audioTest.diagnostics().musicEnded);
  checks.push(`leaving then reentering track ${track} creates a fresh playback`);
 }
 assert.deepEqual(errors,[]);assert.deepEqual((await state()).errors,[]);
 const out='test-results/audio-'+(process.env.QA_REVISION||'rc19');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/music-lifecycle.json',JSON.stringify({fixture:'synthetic 0.2-second PCM, real browser HTMLAudio playback',checks,errors,diagnostics:await state()},null,2));console.log(JSON.stringify({checks,errors},null,2));await browser.close();
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1;});
