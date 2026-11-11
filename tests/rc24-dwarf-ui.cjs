const {chromium}=require('../app/node_modules/playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const E=await import('../app/src/engine.mjs'),F=await import('../app/src/effects.mjs');
 const map=JSON.parse(fs.readFileSync('app/public/assets/maps-v126/4.json'));
 const game=E.createGame(map,{startDate:'2000-04-03',players:['doraemon','nobita','shizuka','gian'].map(character=>({character,control:'human'}))});
 F.applyEffect(game.players[1],'original-14',1,false);game.players[0].inventory=['original-4'];E.restore(map,JSON.stringify(game));
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:915,height:412},hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(game=>{localStorage.setItem('dingdang.touch.v2',JSON.stringify(game));window.__lifeDraws=[];const draw=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(im,...args){if(this.canvas.id==='board'&&im.src?.includes('/item-lifecycle/'))window.__lifeDraws.push(im.src);return draw.call(this,im,...args);};},game);
  await page.goto(process.env.TEST_ORIGIN||'http://127.0.0.1:5185');await page.waitForFunction(()=>!!window.__game);await page.locator('#titleGate').tap();await page.getByRole('button',{name:'大富翁',exact:true}).tap();await page.locator('#continueGame').tap();await page.waitForFunction(()=>window.__game.snapshot().active&&!window.__game.snapshot().busy);
  await page.locator('#items').tap();await page.getByRole('button',{name:'查看 传染伤风纸电话',exact:true}).tap();await page.getByRole('button',{name:'查看用法 · 传染伤风纸电话',exact:true}).tap();await page.getByRole('button',{name:'使用道具',exact:true}).tap();await page.getByRole('button',{name:'大雄',exact:true}).tap();
  await page.waitForFunction(()=>{const v=window.__game.snapshot().visual;return v?.step?.reason==='activated'&&v.loaded&&v.frame>=5;});
  const during=await page.evaluate(()=>window.__game.snapshot());await page.screenshot({path:'test-results/rc24-dwarf-activation.png'});
  assert.equal(during.visual.step.tracks[0].animation,121);assert.equal(during.busy,true);assert.deepEqual(during.visual.step.tracks[0].ghostPoint,{x:24,y:24});
  await page.waitForFunction(()=>{const s=window.__game.snapshot();return !s.visual&&!s.busy;});
  const result=await page.evaluate(()=>({state:window.__game.snapshot().game,draws:[...new Set(window.__lifeDraws)]}));assert.ok(result.draws.length);assert.equal(result.state.players[1].effects.find(e=>e.id==='original-14').active,true);assert.deepEqual(errors,[]);
  fs.writeFileSync('test-results/rc24-dwarf-ui.json',JSON.stringify({passed:true,animation:121,frames:60,capturedFrame:during.visual.frame,paintedSprites:result.draws.length,errors},null,2));console.log('RC24 dwarf activation UI passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
