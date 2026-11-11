const {chromium}=require('../app/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const p=await b.newPage();const pending=new Set();let done=0;const errors=[];const start=Date.now();
 p.on('request',r=>pending.add(r.url()));p.on('requestfinished',r=>{pending.delete(r.url());done++;});p.on('requestfailed',r=>{pending.delete(r.url());errors.push([r.url(),r.failure()]);});p.on('pageerror',e=>errors.push(e.message));
 await p.goto(process.env.STARTUP_URL||'http://127.0.0.1:5178');
 for(let i=0;i<12;i++){
  await p.waitForTimeout(5000);const state=await p.evaluate(()=>({ready:!!window.__game,loading:document.querySelector('#loading')?.textContent}));
  console.log(JSON.stringify({elapsed:Date.now()-start,done,pending:pending.size,sample:[...pending].slice(0,3),errors,state}));if(state.ready)break;
 }
 await b.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
