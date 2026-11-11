const {chromium}=require('../app/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const {cloneArrivalFixture}=await import('./helpers/pc-clone-fixture.mjs');
 const E=await import('../app/src/engine.mjs'),C=await import('../app/src/commands.mjs');
 const map=JSON.parse(fs.readFileSync('app/public/assets/maps-v126/4.json'));
 const {initial,to,lots}=cloneArrivalFixture();let g=initial;
 for(const c of [{type:'roll',animated:false},{type:'dicePresented'},{type:'step',to}])g=C.executeCommand(map,g,c).state;
 while(g.phase==='resolving'||g.phase==='landed')g=C.executeCommand(map,g,{type:g.phase==='landed'?'landing':'advance'}).state;
 assert.equal(g.pending.kind,'buy');
 const bundled=await require('../app/node_modules/esbuild').build({entryPoints:['app/src/main.ts'],bundle:true,format:'esm',write:false,outfile:'main.js',external:['/assets/*']});
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:915,height:412},hasTouch:true,isMobile:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route(/\/assets\/index-[^/]+\.js$/,r=>r.fulfill({contentType:'text/javascript',body:bundled.outputFiles.find(f=>f.path.endsWith('.js')).text}));
  await page.route(/\/assets\/index-[^/]+\.css$/,r=>r.fulfill({contentType:'text/css',body:bundled.outputFiles.find(f=>f.path.endsWith('.css')).text}));
  await context.addInitScript(save=>{if(!localStorage.getItem('clone-seeded')){localStorage.setItem('dingdang.touch.v2',JSON.stringify(save));localStorage.setItem('clone-seeded','yes');}},g);
  const open=async()=>{await page.goto(process.env.TEST_ORIGIN||'http://127.0.0.1:5185');await page.waitForFunction(()=>!!window.__game);await page.locator('#titleGate').tap();await page.getByRole('button',{name:'大富翁',exact:true}).tap();await page.locator('#continueGame').tap();};
  await open();await page.getByText(/本体停靠/).waitFor();
  await page.getByRole('button',{name:'购买地块',exact:true}).tap();
  await page.getByText(/分身 1停靠/).waitFor();
  const s=await page.evaluate(()=>window.__game.snapshot());
  assert.equal(s.game.owners[lots[0]],0);assert.equal(s.game.pending.lot,lots[1]);
  const cell=map.cells[s.game.visitAt];assert.equal(s.camera.x,(cell.x-cell.y)*40);assert.equal(s.camera.y,(cell.x+cell.y)*20);
  await page.screenshot({path:'test-results/rc16-clone-second-purchase.png'});
  await page.getByRole('button',{name:'保存并返回主菜单',exact:true}).tap();await open();
  await page.getByText(/分身 1停靠/).waitFor();
  await page.getByRole('button',{name:'购买地块',exact:true}).tap();
  await page.waitForFunction(lot=>window.__game.snapshot().game.owners[lot]===0,lots[1]);
  assert.deepEqual(errors,[]);
  fs.writeFileSync('test-results/rc16-clone-arrival-ui.json',JSON.stringify({passed:true,source:'current source bundled by esbuild over static-server entry',checks:['body purchase then clone purchase','camera centers active clone stop','save exit and cold reload resumes second purchase','both purchases retained'],pageErrors:errors},null,2));
  console.log('Clone two-purchase touch and cold resume passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
