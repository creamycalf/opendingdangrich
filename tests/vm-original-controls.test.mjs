import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ORIGINAL_SHA,MINI_VTABLES,KEY_GROUPS,MINI_INPUTS,readOriginalMiniState,createSampledKeys,createSampledTaps,createOriginalControls} from '../vm-app/web/originalControls.mjs';
import {createTouchState} from '../vm-app/web/touchControls.mjs';
function fixture(id=0,owner=0x4cc598){
 const bytes=new Uint8Array(0x900000),d=new DataView(bytes.buffer),put=(at,n)=>d.setUint32(at,n,true),memory={read_memory:(at,n)=>bytes.slice(at,at+n)};
 const object=0x800000;put(owner,object);put(object,MINI_VTABLES[id]);put(object+8,id);put(object+0x14,0x801000);put(0x801020,0x802000);put(0x802008,4);
 for(let seat=0;seat<4;seat++){
  const p=0x810000+seat*0x1000,c=0x820000+seat*0x1000;put(0x4cda04+seat*4,p);put(object+0xdc+seat*4,1);put(p+0xc,0);put(p+0x10c,c);
  if(seat===1)put(c,0x4b93cc);else{put(c,0x4b9384);const group=seat===0?0:seat-1;put(c+0x1c,group);KEY_GROUPS[group].forEach((key,i)=>d.setUint16(c+0x20+i*2,key,true));}
 }
 return {put,d,memory,object};
}
test('three VK maps and 768 held/edge combinations match original x86 execution',()=>{
 const oracle=JSON.parse(readFileSync(new URL('./fixtures/pc-v126-controller-input.json',import.meta.url)));
 assert.equal(oracle.sha256,ORIGINAL_SHA);assert.deepEqual(KEY_GROUPS,oracle.groups);assert.equal(oracle.rows.length,768);
 for(const row of oracle.rows){const direction=row.mask&15,button=row.mask>>4;assert.deepEqual(row.values,[direction,direction&~row.previousDirection,button,button&~row.previousButtons]);}
});
test('all eight games and three natural entry owners resolve real human controllers',()=>{
 for(let id=0;id<8;id++)for(const owner of [0x4cc598,0x4cdafc,0x4cdb00]){
  const f=fixture(id,owner),s=readOriginalMiniState(f.memory);assert.equal(s.active,true);assert.equal(s.gameId,id);assert.deepEqual(s.humanSeats,[0,1,2,3]);assert.deepEqual(s.seats.map(p=>p.kind),['keyboard','mouse','keyboard','keyboard']);
  f.put(0x81000c,1);f.put(f.object+0xdc+2*4,0);assert.deepEqual(readOriginalMiniState(f.memory).humanSeats,[1,3]);
 }
});
test('nonplaying, bad image pointers, stale/wrong vtables and unknown key maps fail closed',()=>{
 const f=fixture();f.put(0x802008,2);const intro=readOriginalMiniState(f.memory);assert.equal(intro.active,false);assert.equal(intro.gameId,0);assert.equal(intro.stageId,2);assert.equal(intro.context,'board');f.put(0x802008,4);f.put(f.object,0);assert.equal(readOriginalMiniState(f.memory).active,false);
 f.put(f.object,MINI_VTABLES[0]);f.d.setUint16(0x820020,99,true);assert.deepEqual(readOriginalMiniState(f.memory).humanSeats,[1,2,3]);
 assert.equal(readOriginalMiniState({read_memory(){throw Error('unavailable');}}).active,false);
});
test('fast taps survive real down and up samples; holds never time out',()=>{
 const calls=[],q=createSampledKeys((...args)=>calls.push(args));q.set('keyboard',0x25,true);q.set('keyboard',0x25,false);q.set('keyboard',0x25,true);q.set('keyboard',0x25,false);
 assert.deepEqual(calls,[['keyboard',0x25,true]]);q.sampled('keyboard',0x26);assert.equal(calls.length,1);
 q.sampled('keyboard',0x25);q.sampled('keyboard',0x25);q.sampled('keyboard',0x25);assert.deepEqual(calls.map(c=>c[2]),[true,false,true,false]);
 q.set('mouse',1,true);q.sampledMouse();q.sampledMouse();assert.deepEqual(calls.at(-1),['mouse',1,true]);q.set('mouse',1,false);assert.deepEqual(calls.at(-1),['mouse',1,false]);q.clear();
});

test('rapid alternating taps remain separate full native polls, including arrival halfway through a poll',()=>{
 const f=fixture(2),down=new Set(),masks=[];
 const shim={setKeyState:(k,v)=>v?down.add(k):down.delete(k),dispatch:call=>({eax:down.has(call.args[0])?0x8000:0})};
 const a=createOriginalControls({...f,shim,executableSha256:ORIGINAL_SHA});a.refresh();
 const key=k=>shim.dispatch({imported:{dll:'USER32.DLL',name:'GetAsyncKeyState'},args:[k]}).eax;
 // An input arrives after the first action VK has already been read.
 for(const k of KEY_GROUPS[0].slice(0,5))key(k);
 for(let n=0;n<12;n++){const action=n%2?'right':'left';a.onAction({seat:0,action,down:true,behavior:'tap'});a.onAction({seat:0,action,down:false,behavior:'tap'});}
 assert.equal(key(KEY_GROUPS[0][5]),0);
 for(let n=0;n<25;n++){let mask=0;KEY_GROUPS[0].forEach((k,i)=>{if(key(k)&&i>=4)mask|=1<<(i-4);});masks.push(mask);}
 assert.deepEqual(masks.filter(Boolean),Array.from({length:12},(_,i)=>i%2?2:1));
 assert(!masks.includes(3));assert.equal(down.size,0);a.dispose();
});

test('quick mouse pulses preserve alternation and old backlogs expire instead of playing themselves after input stops',()=>{
 let now=0;const levels=new Map(),q=createSampledTaps((_k,c,v)=>levels.set(c,v),{now:()=>now}),device={controller:1,kind:'mouse'};
 q.push(device,0);q.push(device,1);const masks=[];
 for(let n=0;n<5;n++){masks.push((levels.get(0)?1:0)|(levels.get(1)?2:0));q.sampledMouse();}
 assert.deepEqual(masks,[0,1,0,2,0]);
 q.push(device,0);now=501;q.sampledMouse();assert.equal(levels.get(0),false);
 q.push(device,1);q.sampledMouse();q.clear();assert.equal(levels.get(1),false);
});
test('four independent seats map direction/action to VKs and both mouse buttons',()=>{
 for(let id=0;id<8;id++){
  const f=fixture(id),calls=[],shim={setKeyState:(key,down)=>calls.push(['keyboard',key,down]),directInput:(_kind,_method,key,down)=>calls.push(['mouse',key,down]),dispatch:()=>({eax:0x8000})};
  const a=createOriginalControls({...f,shim,executableSha256:ORIGINAL_SHA});a.refresh();
  for(let seat=0;seat<4;seat++)for(const action of ['left','right'])assert(a.onAction({seat,action,down:true}));
  const offset=MINI_INPUTS[id].channel==='direction'?2:4;assert.deepEqual(calls.map(c=>c[1]),[...KEY_GROUPS[0].slice(offset,offset+2),0,1,...KEY_GROUPS[1].slice(offset,offset+2),...KEY_GROUPS[2].slice(offset,offset+2)]);
  a.clear();assert.equal(calls.filter(c=>!c[2]).length,8);a.dispose();
 }
});
test('dispatch observer preserves eax and only the queried VK advances',()=>{
 const f=fixture(),calls=[],original=()=>({eax:32768}),shim={setKeyState:(...a)=>calls.push(a),dispatch:original};const a=createOriginalControls({...f,shim,executableSha256:ORIGINAL_SHA});a.refresh();a.onAction({seat:0,action:'left',down:true});a.onAction({seat:0,action:'left',down:false});assert.deepEqual(calls,[[0x25,true]]);
 assert.deepEqual(shim.dispatch({imported:{dll:'USER32.DLL',name:'GetAsyncKeyState'},args:[0x25]}),{eax:32768});assert.deepEqual(calls.at(-1),[0x25,false]);a.dispose();assert.equal(shim.dispatch,original);
 assert.throws(()=>createOriginalControls({...f,shim,executableSha256:'wrong'}),/Unverified/);
});
test('changing activity releases all held keys and cannot target AI/nonparticipants',()=>{
 const f=fixture(),calls=[],shim={setKeyState:(...a)=>calls.push(a)};const a=createOriginalControls({...f,shim,executableSha256:ORIGINAL_SHA});a.refresh();a.onAction({seat:0,action:'left',down:true});f.put(0x802008,2);a.refresh();assert.deepEqual(calls.at(-1),[0x25,false]);assert.equal(a.onAction({seat:0,action:'left',down:true}),false);a.dispose();
});
test('touch state supports eight fingers, shared-button reference counts and cancellation',()=>{
 const calls=[],s=createTouchState(e=>calls.push(e));for(let seat=0;seat<4;seat++)for(const [side,action] of ['left','right'].entries())s.press(seat*2+side,seat,action,'hold');assert.equal(calls.length,8);s.press(10,0,'left','hold');s.release(0);assert.equal(calls.length,8);s.release(10);assert.equal(calls.length,9);s.clear();assert.equal(calls.filter(c=>!c.down).length,8);s.clear();assert.equal(calls.length,16);
});

test('original ready page needs each human action; result accepts action only in native wait substate',()=>{
 const f=fixture(),calls=[],shim={setKeyState:(...a)=>calls.push(a),directInput:(...a)=>calls.push(a)};
 f.put(0x802008,10);const a=createOriginalControls({...f,shim,executableSha256:ORIGINAL_SHA});
 let s=a.refresh();assert.equal(s.active,false);assert.equal(s.ready,true);assert.deepEqual(s.humanSeats,[0,1,2,3]);
 for(let seat=0;seat<4;seat++){assert.equal(a.onAction({seat,action:'left',down:true}),false);assert(a.onAction({seat,action:'confirm',down:true}));}
 assert.deepEqual(calls.slice(0,4),[[46,true],['mouse','button',0,true],[81,true],[85,true]]);
 f.put(0x802008,6);f.put(f.object+4,3<<8);s=a.refresh();assert.equal(s.ready,undefined);assert.equal(a.onAction({seat:0,action:'confirm',down:true}),false);
 f.put(f.object+4,4<<8);s=a.refresh();assert.equal(s.ready,true);assert.deepEqual(s.humanSeats,[0]);assert(a.onAction({seat:0,action:'confirm',down:true}));a.dispose();
});
