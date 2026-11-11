import test from 'node:test';
import assert from 'node:assert/strict';
import { ORIGINAL_SHA, KEY_GROUPS } from '../vm-app/web/originalControls.mjs';
import { readOriginalSelectionState, createSelectionControls } from '../vm-app/web/selectionControls.mjs';
function fixture() {
 const bytes=new Uint8Array(0x900000),d=new DataView(bytes.buffer),put=(a,n)=>d.setUint32(a,n,true),memory={read_memory:(a,n)=>bytes.slice(a,a+n)},marker=0x800000;
 put(0x4cd584,marker);d.setUint16(marker+8,5,true);d.setUint16(marker+10,7,true);
 for(let seat=0;seat<4;seat++){
  const c=0x801000+seat*0x100;put(0x4cc814+seat*4,c);put(c,seat===3?0x4b93cc:0x4b9384);put(c+0x1c,seat===3?0:seat);
  if(seat<3)KEY_GROUPS[seat].forEach((k,i)=>d.setUint16(c+0x20+i*2,k,true));else{put(c+0x28,320);put(c+0x2c,240);}
 }
 put(0x4cdbb8,320);put(0x4cdbb4,240);
 const calls=[],shim={dispatch:()=>({eax:32768}),setKeyState:(...a)=>calls.push(['keyboard',...a]),directInput:(...a)=>calls.push(a)},a=createSelectionControls({memory,shim,executableSha256:ORIGINAL_SHA});a.refresh();
 const sample=vk=>shim.dispatch({imported:{dll:'USER32.DLL',name:'GetAsyncKeyState'},args:[vk]});
 return {put,d,memory,marker,calls,shim,a,sample};
}
test('selection reads all four original devices and refuses stale scenes or invalid bindings',()=>{
 const f=fixture();assert.equal(readOriginalSelectionState(f.memory).active,true);assert.deepEqual(readOriginalSelectionState(f.memory).seats.map(s=>s.kind),['keyboard','keyboard','keyboard','mouse']);
 f.d.setUint16(f.marker+8,6,true);assert.equal(readOriginalSelectionState(f.memory).active,false);f.d.setUint16(f.marker+8,5,true);f.put(0x801000,0);assert.equal(readOriginalSelectionState(f.memory).active,false);
});
test('quick joins on three keyboard seats and mouse retain original sampled down/up edges',()=>{
 const f=fixture();for(let seat=0;seat<4;seat++){assert(f.a.onAction({seat,action:'confirm',down:true}));assert(f.a.onAction({seat,action:'confirm',down:false}));}
 assert.deepEqual(f.calls,[['keyboard',46,true],['keyboard',81,true],['keyboard',85,true],['mouse','button',0,true]]);
 for(const key of [46,81,85])assert.deepEqual(f.sample(key),{eax:32768});f.a.afterStateRead(0,'mouse');assert.equal(f.calls.filter(a=>a.at(-1)===false).length,4);
});
test('mouse selection arrows use original relative device motion and owner-only confirmation',()=>{
 const f=fixture();assert(f.a.onAction({seat:3,action:'right',down:true}));assert.deepEqual(f.calls.at(-1),['mouse','move',80,0]);f.a.onAction({seat:3,action:'right',down:false});
 f.put(0x4cd30c,2);f.put(0x4cca14,2);f.a.refresh();assert.equal(f.a.onAction({seat:0,action:'confirm',down:true}),false);assert(f.a.onAction({seat:2,action:'confirm',down:true}));assert.deepEqual(f.calls.at(-1),['keyboard',85,true]);
 f.put(0x4cd584,0);f.a.refresh();assert.deepEqual(f.calls.at(-1),['keyboard',85,false]);assert.equal(f.a.onAction({seat:2,action:'confirm',down:true}),false);
});
test('invalid inputs and disposal cannot retain or add guest keys',()=>{
 const f=fixture();for(const seat of [-1,4,1.5])assert.equal(f.a.onAction({seat,action:'confirm',down:true}),false);f.a.onAction({seat:0,action:'left',down:true});f.a.dispose();assert.deepEqual(f.calls.at(-1),['keyboard',37,false]);assert.equal(f.a.onAction({seat:0,action:'confirm',down:true}),false);
});
