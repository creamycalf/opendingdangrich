const {chromium}=require('../app/node_modules/playwright');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs'),assert=require('node:assert/strict');
const revision=process.env.QA_REVISION||'rc11';
const adb='F:/aiworkspace/codexworkspace/aichatbox/.toolchain/android-sdk/platform-tools/adb.exe';
const run=(...args)=>execFileSync(adb,['-s','emulator-5580',...args],{encoding:'utf8'}).trim();
(async()=>{
 run('forward','tcp:9223','localabstract:webview_devtools_remote_'+run('shell','pidof','local.dingdang.touch'));
 const browser=await chromium.connectOverCDP('http://127.0.0.1:9223',{noDefaults:true});
 try{
  const page=browser.contexts()[0].pages()[0],cdp=await page.context().newCDPSession(page),actions=[];
  async function tap(button){const r=await button.boundingBox();if(!r)return;actions.push(await button.getAttribute('aria-label')||await button.innerText());await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  const deadline=Date.now()+240000;
  while(Date.now()<deadline){
   const s=await page.evaluate(()=>window.__game.snapshot());
   if(!s.busy&&['shop','hermit'].includes(s.game?.pending?.kind)){
    const disk=await page.evaluate(async()=>JSON.parse((await window.Capacitor.Plugins.GameSave.read()).value));assert.deepEqual(disk,s.game);
    fs.writeFileSync(`test-results/${revision}-stable-prompt.json`,JSON.stringify({kind:s.game.pending.kind,round:s.game.round,turn:s.game.turn,actions,exactDiskMatch:true},null,2));return;
   }
   if(!s.busy){
    const roll=page.locator('#roll');const route=page.locator('#routes button:visible').first();
    if(await roll.isEnabled())await tap(roll);
    else if(await route.count())await tap(route);
    else if(await page.locator('#modal').isVisible()){
      const buttons=page.locator('#modalContent button:visible:enabled');
      const shop=buttons.filter({hasText:'商店'}).first();
      if(await shop.count())await tap(shop);else if(await buttons.count())await tap(buttons.first());
    }
   }
   await page.waitForTimeout(200);
  }
  throw Error('No stable shop/hermit reached through normal touch actions');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
