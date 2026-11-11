const {chromium}=require('../app/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const E=await import('../app/src/engine.mjs');
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const checks=[];
 try{for(let id=0;id<8;id++){
  const map=JSON.parse(fs.readFileSync('app/public/assets/maps-v126/'+id+'.json'));
  const game=E.restore(map,JSON.stringify(E.createGame(map,{startDate:'2000-04-03',seed:123})));
  const context=await browser.newContext({viewport:{width:915,height:412},hasTouch:true});
  await context.addInitScript(game=>localStorage.setItem('dingdang.touch.v2',JSON.stringify(game)),game);
  const page=await context.newPage(),requests=[],errors=[];
  page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
  await page.goto(process.env.TEST_ORIGIN||'http://127.0.0.1:5256');
  await page.waitForFunction(()=>!!window.__game,{},{timeout:60000});
  await page.locator('#titleGate').tap();await page.getByRole('button',{name:'大富翁',exact:true}).tap();
  const started=Date.now();await page.locator('#continueGame').tap();
  await page.waitForFunction(id=>window.__game.snapshot().active&&!window.__game.snapshot().busy&&window.__game.snapshot().game.map===id,id,{timeout:60000});
  const elapsed=Date.now()-started;await page.locator('#overview').tap();await page.waitForTimeout(100);
  const pixelColors=await page.locator('#board').evaluate(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;const colors=new Set();for(let i=0;i<d.length;i+=112)colors.add(d[i]+','+d[i+1]+','+d[i+2]);return colors.size;});
  assert(pixelColors>100,'map '+id+' board is blank');
  const sheets=requests.filter(u=>/\/sprite-atlas\/map-\d+-\d+\.png/.test(u));
  const tiles=requests.filter(u=>/\/maps\/\d+\/.*\.png/.test(u));
  assert(sheets.length>=2&&sheets.length<=4,'unexpected atlas count '+sheets.length);assert.equal(tiles.length,0);assert.deepEqual(errors,[]);
  await page.screenshot({path:'test-results/rc11-map-'+id+'.png'});
  checks.push({map:id,loadMs:elapsed,mapSheetRequests:sheets.length,individualTileRequests:tiles.length,distinctSampledColors:pixelColors,errors});
  console.log('map',id,'loaded',elapsed+'ms',sheets.length,'sheets');await context.close();
 }}finally{await browser.close();}
 fs.writeFileSync('test-results/rc11-maps-ui.json',JSON.stringify({checks},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
