// Isolate only the final yellow selection stroke, without changing game sprites.
const {chromium}=require('../app/node_modules/playwright'),fs=require('node:fs');
(async()=>{
 const E=await import('../app/src/engine.mjs'),map=JSON.parse(fs.readFileSync('app/public/assets/maps-v126/4.json'));
 const game=E.createGame(map,{startDate:'2000-04-03',players:['doraemon','nobita','shizuka','gian'].map(character=>({character,control:'human'}))});
 const lot=825;game.turn=3;game.players[3].at=lot+map.width;game.players[3].direction=1;game.owners[lot]=3;game.levels[lot]=0;game.kinds[lot]=0;
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:915,height:412},hasTouch:true});
  await page.addInitScript(g=>{localStorage.setItem('dingdang.touch.v2',JSON.stringify(g));performance.now=()=>1000;const stroke=CanvasRenderingContext2D.prototype.stroke;CanvasRenderingContext2D.prototype.stroke=function(...args){if(window.__hideGroundSelection&&this.strokeStyle==='#fff1a4')return;return stroke.apply(this,args);};},game);
  await page.goto(process.env.TEST_ORIGIN||'http://127.0.0.1:5185');await page.waitForFunction(()=>!!window.__game);await page.locator('#titleGate').tap();await page.getByRole('button',{name:'大富翁',exact:true}).tap();await page.locator('#continueGame').tap();await page.waitForFunction(()=>window.__game.snapshot().active&&!window.__game.snapshot().busy);
  const point=await page.evaluate(i=>window.__game.cellScreen(i),lot);
  await page.touchscreen.tap(point.x,point.y);await page.waitForTimeout(100);await page.screenshot({path:'test-results/rc21-selection-diagnostic-before.png'});
  await page.evaluate(()=>window.__hideGroundSelection=true);await page.touchscreen.tap(point.x,point.y);await page.waitForTimeout(100);await page.screenshot({path:'test-results/rc21-selection-diagnostic-hidden.png'});
  fs.writeFileSync('test-results/rc21-selection-diagnostic.json',JSON.stringify({map:4,lot,player:game.players[3].at,state:await page.evaluate(()=>window.__game.snapshot()),note:'Only selection stroke suppressed on second image. No game state, image, anchor or sprite order changed.'},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
