from pathlib import Path
r=Path(__file__).resolve().parents[1]
p=r/'app/src/engine.mjs';s=p.read_text('utf8');s="import {retaliateRent} from './target-items.mjs';\n"+s
s=s.replace("events.push({kind:'charge',rent:true,amount,debtor,creditor,text:","events.push({kind:'charge',rent:true,amount,debtor,creditor,...(!reverse&&hasEffect(p,'original-8')?{armyTarget:g.owners[lot]}:{}),text:")
s=s.replace("function requestCharge(g,e){", "function afterCharge(g,e,debtor){if(e.armyTarget!==undefined&&retaliateRent(g,debtor,e.armyTarget))record(g,'玩具军队攻击了'+g.players[e.armyTarget].name+'。');}\nfunction requestCharge(g,e){")
s=s.replace("pay(g,e.amount,e.creditor,debtor);record(g,e.text);", "pay(g,e.amount,e.creditor,debtor);record(g,e.text);afterCharge(g,e,debtor);")
s=s.replace("creditor:e.creditor,text:e.text});", "creditor:e.creditor,text:e.text,...(e.armyTarget!==undefined?{armyTarget:e.armyTarget}:{})});")
s=s.replace("pay(g,q.amount,q.creditor,debtor);record(g,q.text);done();", "pay(g,q.amount,q.creditor,debtor);record(g,q.text);afterCharge(g,q,debtor);done();")
s=s.replace("(e.rent===undefined||typeof e.rent==='boolean')&&", "(e.rent===undefined||typeof e.rent==='boolean')&&(e.armyTarget===undefined||integer(e.armyTarget,0,3))&&")
s=s.replace("if(g.pending?.kind==='debt'", "if(g.pending?.kind==='debt'")
# Pending debt is also persisted while player raises funds.
s=s.replace("if(q.kind==='debt'&&", "if(q.kind==='debt'&&(q.armyTarget!==undefined&&!integer(q.armyTarget,0,3)||") if False else s
p.write_text(s,'utf8')
p=r/'app/src/inventory.mjs';s=p.read_text('utf8').replace('const available={', '''const available={
  'original-8':{name:'玩具军队',description:'五天内支付正常地租后，军队攻击该土地的地主，使其昏睡五天，然后消耗。地主已经在睡眠中时保留军队；颠倒笔支付的反向租金不会触发。'},
  'original-14':{name:'机械小矮人',description:'在身上待命直到睡眠发生。睡着后由小矮人代替行动，可买地和升级，期间不能使用道具、进入商店或小游戏；醒来后小矮人消失。'},''');p.write_text(s,'utf8')
p=r/'app/src/effects.mjs';s=p.read_text('utf8').replace("(e.id!=='original-12'||typeof e.lucky==='boolean')", "(e.id!=='original-12'||typeof e.lucky==='boolean')&&(e.id!=='original-14'||typeof e.active==='boolean')");p.write_text(s,'utf8')
