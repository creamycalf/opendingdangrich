const {chromium}=require('../app/node_modules/playwright');
const ts=require('../app/node_modules/typescript');
const fs=require('node:fs'),assert=require('node:assert/strict');
let browser;
(async()=>{
 const {selectionAudio}=await import('../app/src/selection-audio.mjs');
 const code=ts.transpileModule(fs.readFileSync('app/src/pc-selection.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage({viewport:{width:740,height:412},hasTouch:true,isMobile:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setContent('<form id="setup"></form>');
 await page.addScriptTag({content:'window.exports={};'+code});
 await page.evaluate(()=>{
  const chars=['doraemon','nobita','dorami','shizuka','suneo','gian','yellow'].map(id=>({id,name:id,description:id+' detail'}));
  const form=document.querySelector('form');
  for(let i=0;i<4;i++)for(const type of ['character','control']){
   const s=document.createElement('select');s.id=type+i;
   for(const value of type==='character'?chars.map(c=>c.id):['human','ai'])s.add(new Option(value,value));
   s.value=type==='character'?chars[i].id:i===0?'human':'ai';form.append(s);
  }
  window.actions=[];window.exports.mountSelection(form,chars,a=>window.actions.push(a));
 });
 assert.deepEqual(await page.evaluate(()=>actions),[]);
 await page.getByRole('button',{name:'选择玩家 2',exact:true}).tap();
 await page.getByRole('button',{name:'选择doraemon',exact:true}).tap();
 assert.deepEqual(await page.evaluate(()=>[document.querySelector('#character0').value,document.querySelector('#character1').value]),['nobita','doraemon']);
 let actions=await page.evaluate(()=>actions);
 assert.equal(actions.length,2);assert.deepEqual(selectionAudio(actions[0]),[]);
 assert.deepEqual(actions[1],{type:'character',slot:1,character:'doraemon',control:'ai',previousCharacter:'nobita'});
 assert.deepEqual(selectionAudio(actions[1]),[{kind:'sfx',clip:77},{kind:'voice',character:0,bank:0,clip:59}]);
 await page.getByRole('button',{name:'选择doraemon',exact:true}).tap();
 assert.deepEqual(selectionAudio((await page.evaluate(()=>actions)).at(-1)),[{kind:'voice',character:0,bank:0,clip:59}]);
 await page.getByRole('button',{name:'切换玩家 2 真人或电脑',exact:true}).tap();
 assert.equal((await page.evaluate(()=>actions)).at(-1).control,'human');
 assert.deepEqual(selectionAudio((await page.evaluate(()=>actions)).at(-1)),[]);
 await page.evaluate(()=>document.querySelector('#character1').dispatchEvent(new Event('change')));
 assert.equal((await page.evaluate(()=>actions)).length,4);
 for(const character of ['nobita','dorami','shizuka','suneo','gian','yellow'])await page.getByRole('button',{name:'选择'+character,exact:true}).tap();
 actions=await page.evaluate(()=>actions);
 assert.deepEqual(selectionAudio(actions.at(-1)),[{kind:'sfx',clip:77}]);
 assert.equal(actions.length,10);assert.deepEqual(errors,[]);
 const report={date:new Date().toISOString(),checks:['initial render silent','touch slot uses no original sound','character swap emits one action for tapped slot','same-character Ready emits voice without movement sound','human/AI toggle silent','passive change/refresh silent','all seven character taps emit explicit mapping; yellow has no substitute voice'],actions,errors};
 fs.writeFileSync('test-results/selection-touch-ui-report.json',JSON.stringify(report,null,2));console.log(report.checks);
 await browser.close();
})().catch(async e=>{console.error(e);await browser?.close();process.exit(1);});
