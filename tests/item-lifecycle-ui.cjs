const {chromium}=require('../app/node_modules/playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const E=await import('../app/src/engine.mjs'),C=await import('../app/src/commands.mjs'),F=await import('../app/src/effects.mjs'),{itemFixture}=await import('./item-fixture.mjs');
 const map=JSON.parse(fs.readFileSync('app/public/assets/maps-v126/4.json')),checks=[];
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  for(const id of ['original-24','original-32','original-38','original-1','original-14','original-35','original-6','door']){
   let game=E.createGame(map,{startDate:'2000-04-03',players:['doraemon','nobita','shizuka','gian'].map(character=>({character,control:'human'}))});
   if(id==='original-6'||id==='door'){
    game=itemFixture(map,id).after;game.players.forEach(p=>p.control='human');game.turn=3;game.phase='end';game.roadItems[0].remaining=1;
    while(C.executeCommand(map,game,{type:'nextTurn'}).state.roadItems.length){game=C.executeCommand(map,game,{type:'nextTurn'}).state;game.turn=3;game.phase='end';}
   }else if(id==='original-14'){
    const p=game.players[0];F.applyEffect(p,id);F.applyEffect(p,'original-4');p.effects.find(e=>e.id==='original-4').remaining=1;p.at=map.starts[1].y*map.width+map.starts[1].x;p.effectTickPending=true;
   }else{
    game.players[0].inventory=[id];game=C.executeCommand(map,game,{type:'useItem',item:id,...(id==='original-35'?{target:1}:{})}).state;
    game.turn=id==='original-35'?1:0;game.phase='ready';game.queue=[];game.pending=null;
    const p=game.players[game.turn];p.effects.find(e=>e.id===id).remaining=1;p.effectTickPending=true;
   }
   E.restore(map,JSON.stringify(game));
   const page=await browser.newPage({viewport:{width:915,height:412},hasTouch:true}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(({game,scale})=>{
    localStorage.setItem('dingdang.touch.v2',JSON.stringify(game));
    const now=performance.now.bind(performance);performance.now=()=>now()*scale;
    window.__lifeImages=[];const draw=CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage=function(im,...args){if(this.canvas.id==='board'&&im.src?.includes('/item-lifecycle/'))window.__lifeImages.push(im.src);return draw.call(this,im,...args);};
   },{game,scale:['original-24','original-32','original-38'].includes(id)?.25:1});
   await page.goto(process.env.TEST_ORIGIN||'http://127.0.0.1:5185');await page.waitForFunction(()=>!!window.__game);
   await page.locator('#titleGate').tap();await page.getByRole('button',{name:'大富翁',exact:true}).tap();await page.locator('#continueGame').tap();
   const frame=['original-1','original-14','original-35'].includes(id)?62:3;
   await page.waitForFunction(frame=>{const v=window.__game.snapshot().visual;return v?.kind==='lifecycle'&&v.loaded&&v.frame>=frame;},frame);
   const during=await page.evaluate(()=>window.__game.snapshot());
   assert.equal(during.visual.step.item,id);assert.equal(during.busy,true);
   await page.screenshot({path:`test-results/rc22-lifecycle-${id}.png`});
   await page.waitForFunction(()=>{const s=window.__game.snapshot();return !s.visual&&!s.busy;});
   const result=await page.evaluate(()=>({snapshot:window.__game.snapshot(),images:[...new Set(window.__lifeImages)]}));
   assert.ok(result.images.length,'exit sprites painted to real board');assert.deepEqual(errors,[]);
   if(id==='original-6'||id==='door')assert.equal(result.snapshot.game.roadItems.length,0);
   else assert.equal(result.snapshot.game.players[game.turn].effects.some(e=>e.id===id),false);
   checks.push({item:id,frames:during.visual.step.frames,capturedFrame:during.visual.frame,tracks:during.visual.step.tracks.map(t=>t.animation),paintedImages:result.images.length,errors});await page.close();
  }
  fs.writeFileSync('test-results/rc22-item-lifecycle-ui.json',JSON.stringify({passed:true,checks},null,2));console.log(checks);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
