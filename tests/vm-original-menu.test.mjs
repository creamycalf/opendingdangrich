import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ORIGINAL_SHA, KEY_GROUPS } from '../vm-app/web/originalControls.mjs';
import { readMenu, menuNeighbor, menuRoute, hitMenu, readOriginalMenuState, readOriginalStackSpeech, createMenuControls } from '../vm-app/web/menuControls.mjs';

function fixture() {
  const bytes = new Uint8Array(0x900000), d = new DataView(bytes.buffer);
  const put = (at, n) => d.setUint32(at, n >>> 0, true);
  const memory = { read_memory: (at, n) => bytes.slice(at, at + n) };
  const menu = 0x800000, items = 0x801000, controller = 0x802000, child = 0x803000, surface = 0x804000;
  put(0x4cda30, menu); put(0x4cdad4, surface); put(0x4cd09c, 1);
  put(menu + 0x30, 5); put(menu + 0x34, items); put(menu + 0x38, 0); put(menu + 0x54, surface); put(menu + 0x58, controller);
  put(controller, 0x4b93f4); put(controller + 0x1c, child); put(child, 0x4b9384); put(child + 0x1c, 0);
  KEY_GROUPS[0].forEach((key, i) => d.setUint16(child + 0x20 + 2 * i, key, true));
  for (let i = 0; i < 5; i++) { put(items + i * 0x34, 248); put(items + i * 0x34 + 4, 168 + i * 32); put(items + i * 0x34 + 8, 23); put(items + i * 0x34 + 12, 15); }
  for (const [at, n] of [[0, 173], [2, 264], [8, 226], [10, 148], [16, 173], [18, 264]]) d.setUint16(surface + at, n, true);
  const writes = [], acknowledgements = [];
  const shim = { setKeyState: (key, down) => writes.push([key, down]), dispatch: () => ({ eax: 0x8000 }) };
  const adapter = createMenuControls({ memory, shim, executableSha256: ORIGINAL_SHA, onTapComplete: () => acknowledgements.push(true) });
  const sample = key => shim.dispatch({ imported: { dll: 'USER32.DLL', name: 'GetAsyncKeyState' }, args: [key] });
  return { memory, bytes, d, put, menu, items, surface, controller, child, shim, writes, acknowledgements, adapter, sample };
}

function stackSpeechFixture(thread = 0) {
 const f=fixture(),frame=0x6ff000,owner=0x805000;
 f.put(0x60058,0x700000);f.put(0x60068,thread);f.put(thread===0?0x70000:0x73500,frame);
 f.put(frame,0xffffffff);f.put(frame+4,0x4b715c);f.put(frame+8,0xffffffff);
 f.put(frame-0x44,f.menu);f.put(frame-0x68,f.menu);f.put(frame-0x78,owner);
 f.put(f.menu+0x24,0x56);f.put(f.menu+0x30,1);f.put(owner+0xc,0);f.put(owner+0x10c,f.child);
 f.put(f.menu+0x58,f.child);f.put(f.menu+0x74,1);f.put(f.menu+0xd0,0x808000);
 return {...f,frame,owner};
}

test('native stack speech follows verified SEH registration and its actual owner, including a preempted main thread',()=>{
 for(const thread of [0,2]){
  const f=stackSpeechFixture(thread),m=readOriginalMenuState(f.memory);
  assert.equal(m.context,'dialog');assert.equal(m.speechOwner,f.owner);assert.equal(m.ready,true);
  assert(f.adapter.routeTap(320,240));assert.deepEqual(f.writes,[[46,true]]);
  f.sample(46);assert.deepEqual(f.writes.at(-1),[46,false]);
  f.put(thread===0?0x70000:0x73500,0xffffffff);
  assert.equal(readOriginalStackSpeech(f.memory),null);f.adapter.refresh();assert.equal(f.adapter.snapshot().busy,false);
 }
});

test('stack speech rejects wrong handler, stale object, wrong owner, AI and malformed exception chains',()=>{
 for(const invalidate of [f=>f.put(f.frame+4,0x4b715d),f=>f.put(f.frame-0x68,0),
  f=>f.put(f.owner+0x10c,0),f=>f.put(f.owner+0xc,1),f=>f.put(f.menu+0x24,0),
  f=>f.put(f.frame+8,0),f=>f.put(0x60058,0x600000),f=>f.put(0x60068,64)]){
  const f=stackSpeechFixture();invalidate(f);assert.equal(readOriginalStackSpeech(f.memory),null);
 }
 const f=stackSpeechFixture();f.put(f.frame+4,0);f.put(f.frame,f.frame);
 assert.equal(readOriginalStackSpeech(f.memory),null);
});

test('stack speech typing consumes a tap and no old speech survives its native SEH unlink',()=>{
 const f=stackSpeechFixture();f.bytes[0x808000]=65;
 assert.equal(readOriginalStackSpeech(f.memory).ready,false);
 assert(f.adapter.routeTap(320,240));assert.deepEqual(f.writes,[]);
 f.put(0x70000,0xffffffff);assert.equal(readOriginalStackSpeech(f.memory),null);
});

test('full speech page with remaining text advances on a normal tap through its own controller',()=>{
 const f=fixture();f.put(0x4cc574,f.menu);f.put(f.menu+0x30,1);f.put(f.menu+0x74,1);
 f.put(f.menu+0xd0,0x808000);f.bytes[0x808000]=65;
 f.put(f.menu+0xe4,160);f.put(f.menu+0xe8,32);f.put(f.menu+0xd8,2);f.put(f.menu+0xd4,144);
 assert.equal(readOriginalMenuState(f.memory).ready,true);
 assert(f.adapter.routeTap(500,250));assert.deepEqual(f.writes,[[46,true]]);
});
test('typing speech consumes touches instead of queuing a click for the following screen',()=>{
 const f=fixture();f.put(0x4cc574,f.menu);f.put(f.menu+0x30,1);f.put(f.menu+0x74,1);
 f.put(f.menu+0xd0,0x808000);f.bytes[0x808000]=65;f.put(f.menu+0xe4,160);f.put(f.menu+0xe8,32);
 assert.equal(readOriginalMenuState(f.memory).ready,false);
 assert(f.adapter.routeTap(320,240));assert.deepEqual(f.writes,[]);
});

test('eight-picture practice selector routes taps through its native grid controller and blocks transition taps',()=>{
 const f=fixture(),cursor=0x806000;
 f.put(0x4cc974,f.surface);f.put(f.surface,0x01e00280);f.put(0x4cd8b8,cursor);f.put(cursor,0x4b92c0);
 f.put(0x4cc7e0,255);f.put(0x4cd608,0);f.put(0x4cc8e0,51);f.put(0x4cd8cc,222);f.put(0x4cda70,f.child);
 const m=readOriginalMenuState(f.memory);assert.equal(m.context,'practice-select');assert.equal(hitMenu(m,386,230),2);
 assert.deepEqual(menuRoute(m,2),[{direction:3,selected:1},{direction:3,selected:2}]);
 assert(f.adapter.routeTap(386,230));assert.deepEqual(f.writes,[[39,true]]);
 f.adapter.clear();f.put(0x4cd1b4,1);assert.equal(readOriginalMenuState(f.memory).ready,false);
 const count=f.writes.length;assert(f.adapter.routeTap(386,230));assert.equal(f.writes.length,count);
 f.put(0x4cd8b8,0);assert.notEqual(readOriginalMenuState(f.memory)?.context,'practice-select');
});

test('1680 menu edges agree with original 0x43497d x86 execution', () => {
  const oracle = JSON.parse(readFileSync(new URL('./fixtures/pc-v126-menu-navigation.json', import.meta.url)));
  assert.equal(oracle.sha256, ORIGINAL_SHA); assert.equal(oracle.rows.length, 1680);
  for (const row of oracle.rows) {
    const menu = { selected: row.selected, neighbors: row.neighbors, items: row.points.map(([x, y]) => ({ x, y, enabled: x >= 0 })) };
    const next = menuNeighbor(menu, row.selected, row.direction);
    assert.equal(next < 0 ? row.selected : next, row.result, JSON.stringify(row));
  }
});

test('title touch follows the tapped label, and gaps/outside never confirm another row', () => {
  const f = fixture(), m = readOriginalMenuState(f.memory);
  assert.equal(m.context, 'title'); assert.equal(hitMenu(m, 320, 207), 1);
  assert.equal(hitMenu(m, 450, 207), -1); assert.equal(hitMenu(m, 320, 400), -1);
  assert.equal(hitMenu(m, 320, 191), -1);
  assert.deepEqual(menuRoute(m, 3), [{ direction: 1, selected: 1 }, { direction: 1, selected: 2 }, { direction: 1, selected: 3 }]);
  assert.equal(f.adapter.routeTap(450, 207), true); assert.equal(f.writes.length, 0);
  assert.equal(f.adapter.routeTap(320, 207), true); assert.deepEqual(f.writes, [[0x28, true]]);
});

test('no direction or confirm advances on elapsed frames; each requires real down/up samples and observed selection', () => {
  const f = fixture(); f.adapter.routeTap(320, 239);
  for (let i = 0; i < 20; i++) f.adapter.refresh();
  assert.deepEqual(f.writes, [[0x28, true]]);
  f.sample(0x26); assert.equal(f.writes.length, 1);
  assert.deepEqual(f.sample(0x28), { eax: 0x8000 });
  assert.deepEqual(f.writes.at(-1), [0x28, false]);
  f.put(f.menu + 0x38, 1); f.adapter.refresh(); assert.equal(f.writes.length, 2);
  f.sample(0x28); f.adapter.refresh(); assert.deepEqual(f.writes.at(-1), [0x28, true]);
  f.sample(0x28); f.put(f.menu + 0x38, 2); f.sample(0x28); f.adapter.refresh();
  assert.deepEqual(f.writes.at(-1), [0x2e, true]); assert.equal(f.acknowledgements.length, 0);
  f.sample(0x2e); assert.deepEqual(f.writes.at(-1), [0x2e, false]); assert.equal(f.acknowledgements.length, 1);
  // Original handler may destroy the menu immediately after confirmation.
  f.put(0x4cda30, 0); f.adapter.refresh(); assert.equal(f.adapter.snapshot().busy, false);
  assert.equal(f.acknowledgements.length, 1);
});

test('rejected navigation, menu replacement, blur and disposal release keys without confirming', () => {
  for (const reason of ['rejected', 'replaced', 'clear', 'disposed']) {
    const f = fixture(); f.adapter.routeTap(320, 207); f.sample(0x28);
    if (reason === 'rejected') { f.sample(0x28); f.adapter.refresh(); }
    if (reason === 'replaced') { f.put(f.menu + 0x34, f.items + 0x1000); f.adapter.refresh(); }
    if (reason === 'clear') f.adapter.clear();
    if (reason === 'disposed') f.adapter.dispose();
    assert.equal(f.adapter.snapshot().busy, false);
    assert(f.writes.every(([key]) => key === 0x28));
    assert.equal(f.writes.at(-1)[1], false); assert.equal(f.acknowledgements.length, 0);
  }
});

test('cancel uses the bound original second action, duplicate taps do not queue stale actions', () => {
  const f = fixture(); assert(f.adapter.routeTap(320, 240, 1)); assert.deepEqual(f.writes, [[0x22, true]]);
  f.adapter.routeTap(320, 207); assert.equal(f.writes.length, 1);
  f.sample(0x22); f.sample(0x22); f.adapter.refresh();
  assert.equal(f.adapter.snapshot().busy, false); assert.equal(f.acknowledgements.length, 1);
});

test('stale title states, wrong surfaces, corrupt pointers and unknown controllers fail closed', () => {
  const f = fixture(); f.put(0x4cd09c, 2); assert.equal(readOriginalMenuState(f.memory), null);
  f.put(0x4cd09c, 1); f.put(0x4cdad4, f.surface + 0x100); assert.equal(readOriginalMenuState(f.memory), null);
  f.put(f.menu + 0x30, 129); assert.equal(readMenu(f.memory, f.menu), null);
  f.put(f.menu + 0x30, 5); f.put(f.child, 0); assert.equal(readMenu(f.memory, f.menu), null);
  assert.equal(readMenu({ read_memory() { throw Error('unavailable'); } }, f.menu), null);
  assert.throws(() => createMenuControls({ memory: f.memory, shim: f.shim, executableSha256: 'wrong' }), /Unverified/);
});

test('popups are routed only with verified owner vtable and active state', () => {
  const f = fixture(), owner = 0x805000;
  f.put(0x4cda30, 0); f.put(0x4cc558, owner); f.put(owner, 0x4ba3d8); f.put(owner + 0x128, f.menu);
  f.put(owner + 0x10c, 2); assert.equal(readOriginalMenuState(f.memory), null);
  f.put(owner + 0x10c, 3); assert.equal(readOriginalMenuState(f.memory).context, 'popup');
  f.put(owner, 0x4ba3d9); assert.equal(readOriginalMenuState(f.memory), null);
});

test('competition Yes/No uses the composite keyboard and verifies selection before confirming',()=>{
 const f=fixture();f.put(0x4cda6c,f.controller);f.put(0x4cd310,4);f.put(0x4cd0e4,1);f.put(0x4cd0f0,0x805000);f.put(0x4cd1a8,0x806000);f.put(0x4cd304,0x807000);
 assert.equal(readOriginalMenuState(f.memory).context,'competition-result');
 assert(f.adapter.routeTap(280,425));assert.deepEqual(f.writes,[[37,true]]);
 f.sample(37);f.put(0x4cd0e4,0);f.sample(37);f.adapter.refresh();assert.deepEqual(f.writes.at(-1),[46,true]);
 f.sample(46);assert.equal(f.acknowledgements.length,1);
 f.put(0x4cd0f0,0);assert.equal(readOriginalMenuState(f.memory).context,'title');
});

test('competition label recreation cannot fall through to a mouse click; entrance animation consumes early taps',()=>{
 const f=fixture();f.put(0x4cda6c,f.controller);f.put(0x4cd0e4,1);f.put(0x4cd0f0,0x805000);
 f.put(0x4cd310,3);
 assert.equal(f.adapter.routeTap(280,425),true);assert.deepEqual(f.writes,[]);
 // Both label pointers can be zero while the original callback rebuilds them.
 f.put(0x4cd310,4);assert.equal(readOriginalMenuState(f.memory).context,'competition-result');
 assert(f.adapter.routeTap(280,425));assert.deepEqual(f.writes,[[37,true]]);
 f.sample(37);f.put(0x4cd0e4,0);f.sample(37);f.adapter.refresh();
 assert.deepEqual(f.writes.at(-1),[46,true]);
});

test('original board runtime rectangles include the surface offset and the native 5px settings item',()=>{
 const f=fixture(),player=0x805000,scheduler=0x806000,entry=0x807000;
 f.put(0x4cd09c,0);f.put(0x4cda14,player);f.put(player+0xc,0);f.put(player+0x144,scheduler);f.put(0x4cc544,scheduler);
 f.put(scheduler+0x20,entry);f.put(entry+4,0x43c3b6);f.put(entry+8,0);f.put(0x4c6cf4,0);f.put(0x4cda7c,f.surface);
 f.d.setInt16(f.surface+8,137,true);f.d.setInt16(f.surface+10,425,true);
 // Original RVA 0xc89e0 table after menu construction adds the surface offset.
 const rectangles=[[144,425,35,35],[182,425,50,37],[235,425,35,5],[273,425,35,35],[311,425,35,35]];
 rectangles.forEach((values,i)=>values.forEach((v,j)=>f.put(f.items+i*0x34+j*4,v)));
 const m=readOriginalMenuState(f.memory);assert.equal(m.context,'board');
 for(const [index,x] of [161,206,250,290,328].entries())assert.equal(hitMenu(m,x,443),index);
 assert.equal(hitMenu(m,250,480),-1);assert.equal(hitMenu(m,98,0),-1);
 assert(f.adapter.routeTap(250,443));assert.deepEqual(f.writes,[[39,true]]);
 f.sample(39);f.put(f.menu+0x38,1);f.sample(39);f.adapter.refresh();
 f.sample(39);f.put(f.menu+0x38,2);f.sample(39);f.adapter.refresh();assert.deepEqual(f.writes.at(-1),[46,true]);
 f.put(0x4c6cf4,1);assert.equal(readOriginalMenuState(f.memory),null);
});

