// Production Worker desktop QA. Observation only; all game input uses touch UI.
import {chromium} from '../app/node_modules/playwright/index.mjs';
import {writeFile,readFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const browser=await chromium.connectOverCDP('http://127.0.0.1:9332',{noDefaults:true});
const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes(':9358/'));
if(!page)throw Error('No production QA page');
const [command='state',...args]=process.argv.slice(2),dir='test-results/vm-original-mini';
await mkdir(dir,{recursive:true});
async function snapshot(){
 const state=await page.evaluate(()=>({mini:globalThis.workerMiniState,selection:globalThis.workerSelectionState,inputs:globalThis.workerInputCount,status:document.querySelector('output').textContent}));
 const memory=await(await fetch('http://127.0.0.1:9358/__qa/state')).json();return {...state,memory};
}
const report={command,args,start:new Date().toISOString(),before:await snapshot()};
const targetSession=await browser.newBrowserCDPSession();
const targets=await targetSession.send('Target.getTargets');await targetSession.detach();
report.workerBundles=await Promise.all(targets.targetInfos.filter(t=>t.type==='worker'&&t.url.includes(':9358/')).map(async t=>{
 const pathname=new URL(t.url).pathname;try{const bytes=await readFile((process.env.QA_VM_ASSETS||'vm-app/src/main/assets')+pathname);return {url:t.url,sha256:createHash('sha256').update(bytes).digest('hex')};}catch{return {url:t.url,sha256:null};}
}));
report.hostBundles=await Promise.all((await page.evaluate(()=>Array.from(document.scripts,s=>s.src).filter(Boolean))).map(async url=>{const bytes=await readFile((process.env.QA_VM_ASSETS||'vm-app/src/main/assets')+new URL(url).pathname);return {url,sha256:createHash('sha256').update(bytes).digest('hex')};}));
if(command==='menu-debug'){
 const source=(await readFile('vm-app/web/menuControls.mjs','utf8')).replace("import { ORIGINAL_SHA, KEY_GROUPS } from './originalControls.mjs';",`const ORIGINAL_SHA='b99f70be2a703b7f20e5d7dbf6d29f2ffca86303f4be420bf9fb334cbe792eb1',KEY_GROUPS=[[38,40,37,39,46,34],[87,83,65,68,81,69],[73,75,74,76,85,79]];`);
 const inspect=async source=>{
  const mod=await import('data:text/javascript;base64,'+btoa(source)),mem=globalThis.__qaCore.emulator;
  const u32=a=>{const b=mem.read_memory(a,4);return new DataView(b.buffer,b.byteOffset,4).getUint32(0,true)},p=u32(0x4cda30),s=p?u32(p+0x54):0,c=p?u32(p+0x58):0;
  return {decoded:mod.readOriginalMenuState(mem),surface:s?Array.from(mem.read_memory(s,24)):[],direct:p?mod.readMenu(mem,p):null,children:c?Array.from({length:4},(_,i)=>{const a=u32(c+0x1c+i*4);return {address:a,words:a?Array.from({length:12},(_,j)=>u32(a+j*4)):[]}}):[],mainGate:u32(0x4cd09c),mainSurface:u32(0x4cdad4)};
 };
 const version=await(await fetch('http://127.0.0.1:9332/json/version')).json(),ws=new WebSocket(version.webSocketDebuggerUrl);
 await new Promise((ok,no)=>{ws.onopen=ok;ws.onerror=no;});let sequence=0;const waiting=new Map();
 ws.onmessage=e=>{const r=JSON.parse(e.data);if(r.id){const p=waiting.get(r.id);waiting.delete(r.id);r.error?p?.reject(r.error):p?.resolve(r.result);}};
 const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++sequence;waiting.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params,sessionId}));});
 let debug;
 try{const target=(await send('Target.getTargets')).targetInfos.find(t=>t.type==='worker'&&t.url.includes(':9358/'));const {sessionId}=await send('Target.attachToTarget',{targetId:target.targetId,flatten:true});const result=await send('Runtime.evaluate',{expression:`(${inspect.toString()})(${JSON.stringify(source)})`,awaitPromise:true,returnByValue:true},sessionId);if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));debug=result.result.value;}finally{ws.close();}
 report.menuDebug=debug;console.log(JSON.stringify(debug,null,2));
}
async function tap(x,y){const cdp=await page.context().newCDPSession(page);try{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}finally{await cdp.detach();}}
try{
 if(command==='reload'){await page.reload();await page.waitForTimeout(Number(args[0]||15000));}
 else if(command==='tap'){
  const [x,y,wait='1500']=args;const r=await page.locator('canvas').boundingBox();
  await tap(r.x+Number(x)*r.width/640,r.y+Number(y)*r.height/480);await page.waitForTimeout(Number(wait));
 }else if(command==='select'){
  const [seat='0',action='confirm',wait='800']=args;
  const b=page.locator(`.doraSelection button[data-seat="${seat}"][data-action="${action}"]`);
  if(await b.isDisabled())throw Error('Original selection control disabled');
  const r=await b.boundingBox();if(!r)throw Error('Selection controls unavailable');
  await tap(r.x+r.width/2,r.y+r.height/2);await page.waitForTimeout(Number(wait));
 }else if(command==='hold'){
  const [seat='0',action='left',duration='2000']=args;
  const button=page.locator(`.doraTouchPair button[data-seat="${seat}"][data-action="${action}"]`);
  const r=await button.boundingBox();if(!r)throw Error('No active touch button');
  const cdp=await page.context().newCDPSession(page);
  try{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:r.x+r.width/2,y:r.y+r.height/2}]});await page.waitForTimeout(Number(duration));report.held=await snapshot();await page.screenshot({path:`${dir}/game-${report.before.mini?.gameId}-${action}-held.png`});}
  finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
  await page.waitForTimeout(700);
 }else if(command==='alternate'){
  const [seat='0',count='16']=args;
  for(let n=0;n<Number(count);n++){const r=await page.locator(`.doraTouchPair button[data-seat="${seat}"][data-action="${n%2?'right':'left'}"]`).boundingBox();if(!r)break;await tap(r.x+r.width/2,r.y+r.height/2);await page.waitForTimeout(150);}
 }else if(command==='wait')await page.waitForTimeout(Number(args[0]||1000));
 report.after=await snapshot();
 const name=`${Date.now()}-${command}`;await page.screenshot({path:`${dir}/${name}.png`});await writeFile(`${dir}/${name}.json`,JSON.stringify(report,null,2));
 console.log(JSON.stringify({report:`${dir}/${name}.json`,screenshot:`${dir}/${name}.png`,state:report.after.mini,selection:report.after.selection,status:report.after.status,inputs:report.after.inputs,cursor:report.after.memory?.cursor,menu:report.after.memory?.menu,players:report.after.memory?.players},null,2));
}finally{await browser.close();}
