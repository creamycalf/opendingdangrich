import {writeFile} from 'node:fs/promises';
const info=await(await fetch('http://127.0.0.1:9332/json/version')).json(),ws=new WebSocket(info.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
let n=0;const pending=new Map();ws.onmessage=e=>{const v=JSON.parse(e.data);if(pending.has(v.id)){pending.get(v.id)(v);pending.delete(v.id);}};
const call=(method,params={},sessionId)=>new Promise(ok=>{const id=++n;pending.set(id,ok);ws.send(JSON.stringify({id,method,params,sessionId}));});
try{
 const targets=await call('Target.getTargets'),worker=targets.result.targetInfos.find(t=>t.type==='worker');if(!worker)throw Error('Missing worker');
 const attached=await call('Target.attachToTarget',{targetId:worker.targetId,flatten:true});
 const result=await call('Runtime.evaluate',{returnByValue:true,expression:`(()=>{const m=__qaCore.emulator,u=a=>{const b=m.read_memory(a,4);return new DataView(b.buffer,b.byteOffset,4).getUint32(0,true)};const values=Object.fromEntries([0x4cd0f0,0x4cd0e4,0x4cda6c,0x4cd310,0x4cdafc,0x4cd1a8,0x4cd304].map(a=>[a.toString(16),u(a)]));const c=u(0x4cda6c);const controllers=Array.from({length:4},(_,i)=>{const a=u(c+0x1c+4*i);return {a,words:a?Array.from({length:12},(_,j)=>u(a+4*j)):[]}});return {values,controller:Array.from({length:12},(_,i)=>u(c+i*4)),controllers,keys:Object.keys(__qaCore)};})()`},attached.result.sessionId);
 const state=result.result?.result?.value;console.log(JSON.stringify(state??result,null,2));await writeFile(process.argv[2]||'test-results/vm-result-live.json',JSON.stringify(state??result,null,2));
}finally{ws.close();}
