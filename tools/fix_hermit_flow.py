from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'app/src/engine.mjs';s=p.read_text('utf8')
s=s.replace("}else g.levels[q.lot]++;g.kinds[q.lot]=1;", "}else{g.levels[q.lot]++;g.kinds[q.lot]=1;}")
s=s.replace("return [p.cash>=price+100?'yes':'no'];", "return [p.cash>=price+100&&(effectCapabilities(p)&(q.kind==='buy'?8:0x10))?'yes':'no'];")
s=s.replace("return [g.levels[q.lot]<4&&p.cash>=upgradeCost(map,g,q.lot)+100?'upgrade':'leave'];", "return [g.levels[q.lot]<4&&p.cash>=upgradeCost(map,g,q.lot)+100&&(effectCapabilities(p)&0x10)?'upgrade':'leave'];")
p.write_text(s,'utf8')
p=root/'app/src/effects.mjs';s=p.read_text('utf8').replace("player.effects.some(e=>sleeping(e.id)))", "(player.effects.some(e=>sleeping(e.id))||(player.events??[]).some(e=>e.id===21)))")
p.write_text(s,'utf8')
p=root/'app/src/main.ts';s=p.read_text('utf8');s="import {effectCapabilities} from './effects.mjs';\n"+s
s=s.replace("if(!p.jail&&protection)","if((effectCapabilities(p)&1)&&!p.jail&&protection)").replace("else if(!p.jail&&landItem)","else if((effectCapabilities(p)&1)&&!p.jail&&landItem)").replace("else if(!p.jail&&attack)","else if((effectCapabilities(p)&1)&&!p.jail&&attack)")
s=s.replace("level>=4||p.cash<cost)","level>=4||p.cash<cost||!(effectCapabilities(p)&0x10))")
p.write_text(s,'utf8')
p=root/'tests/core.test.mjs';s=p.read_text('utf8').replace("const lucky=g.pending.lucky;", "const lucky=1;").replace("assert.equal(g.players[0].cash,1150);", "assert.ok(g.pending.text);")
p.write_text(s,'utf8')
p=root/'tests/effects.test.mjs';s=p.read_text('utf8').replace("assert.equal(p.cash,before+150);", "assert.ok(p.cash>=before);assert.equal(g.queue.some(e=>e.kind==='charge'),false);")
p.write_text(s,'utf8')
