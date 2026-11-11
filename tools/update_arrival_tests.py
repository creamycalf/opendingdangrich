from pathlib import Path
R=Path(__file__).resolve().parents[1]
for name in ['core','economic-items','protection','reverse-rent']:
 p=R/f'tests/{name}.test.mjs';s=p.read_text('utf8');s="import {reachLandingCharge} from './arrival-helper.mjs';\nimport {originalLandItemNeighbor} from '../app/src/land-items.mjs';\n"+s
 if name=='core':
  s=s.replace('passing rent transfers once per lot per turn and saves do not repeat it','passing property is free; stopping pays rent once and restore does not repeat it')
  a=s.index('  const total=g.players.reduce',s.index("test('passing property"));b=s.index('\n});',a)
  s=s[:a]+'''  const total=g.players.reduce((n,p)=>n+p.cash+p.bank,0),before=g.players[1].cash;E.step(map,g,road);resolve(g);assert.equal(g.phase,'moving');assert.equal(g.players[1].cash,before);assert.equal(g.players.reduce((n,p)=>n+p.cash+p.bank,0),total);
  // Model this same square as the final dice stop, then use the real landing queue.
  g.remaining=0;g.phase='landed';reachLandingCharge(map,g);const saved=clone(g);resolve(g);resolve(saved);assert.deepEqual(g,saved);assert.equal(g.players[1].cash,before+E.rent(map,g,lot));assert.equal(g.players.reduce((n,p)=>n+p.cash+p.bank,0),total);
'''+s[b:]
  s=s.replace('connected properties are charged as one group and cannot be charged twice at the same step','connected properties are charged once at the final stop')
  s=s.replace('if(E.choices(map,g).includes(road)){location=', 'if(originalLandItemNeighbor(map,road)===lot&&E.choices(map,g).includes(road)){location=')
  s=s.replace("g.remaining=1;E.step(map,g,road);\n  const rents", "g.remaining=1;E.step(map,g,road);reachLandingCharge(map,g);\n  const rents")
  s=s.replace('  assert.ok(g.chargedLots.includes(lot)&&g.chargedLots.includes(second));','  const before=g.players[1].cash;E.advance(map,g);assert.equal(g.players[1].cash,before+E.rent(map,g,lot));')
 if name=='economic-items':
  s=s.replace('const l=E.adjacent(map,n).find(j=>map.cells[j].event===1);if(l!==undefined)', "const l=originalLandItemNeighbor(map,n);if(map.cells[l]?.event===1&&map.cells[n].event===0)")
  s=s.replace('E.step(map,g,to);const charge=', 'E.step(map,g,to);reachLandingCharge(map,g);const charge=')
  s=s.replace('E.step(map,protectedGame,to);assert.equal', 'E.step(map,protectedGame,to);reachLandingCharge(map,protectedGame);assert.equal')
 if name=='protection':
  s=s.replace('actual road step waives protected rent','actual final stop waives protected rent')
  s=s.replace('const lot=E.adjacent(map,to).find(i=>map.cells[i].event===1);if(lot!==undefined&&',"const lot=originalLandItemNeighbor(map,to);if(map.cells[lot]?.event===1&&map.cells[to].event===0&&")
  s=s.replace('E.step(map,g,to);const rents=', 'E.step(map,g,to);reachLandingCharge(map,g);const rents=')
  s=s.replace("g.queue=[{kind:'charge',amount:50", "g.phase='resolving';g.queue=[{kind:'charge',amount:50")
 if name=='reverse-rent':
  s=s.replace('const lot=E.adjacent(map,to).find(j=>map.cells[j].event===1);if(lot!==undefined)', "const lot=originalLandItemNeighbor(map,to);if(map.cells[lot]?.event===1&&map.cells[to].event===0)")
  s=s.replace('g.remaining=2','g.remaining=1')
  s=s.replace('E.step(map,g,to);const charge=', 'E.step(map,g,to);reachLandingCharge(map,g);const charge=')
  s=s.replace("commands=[{type:'step',to},{type:'advance'},{type:'answer'", "commands=[{type:'step',to},{type:'advance'},{type:'landing'},{type:'advance'},{type:'advance'},{type:'advance'},{type:'answer'")
  s=s.replace('E.step(map,g,to);E.advance', 'E.step(map,g,to);reachLandingCharge(map,g);E.advance')
  s=s.replace('E.step(map,a.g,a.to);assert.equal','E.step(map,a.g,a.to);reachLandingCharge(map,a.g);assert.equal')
  s=s.replace('E.step(map,b.g,b.to);const charge=', 'E.step(map,b.g,b.to);reachLandingCharge(map,b.g);const charge=')
  s=s.replace('next.remaining,1','next.remaining,0').replace('g.remaining,1','g.remaining,0')
  s=s.replace('preserves movement and remaining events','preserves the mover and remaining events')
 p.write_text(s,'utf8')
import json
p=R/'app/package.json';j=json.loads(p.read_text('utf8'));j['scripts']['test']='node --test '+' '.join('../tests/'+f.name for f in sorted((R/'tests').glob('*.test.mjs')));p.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n','utf8')
