from pathlib import Path
R=Path(__file__).resolve().parents[1];p=R/'app/src/engine.mjs';s=p.read_text('utf8')
s=s.replace("import {landItemStatus,applyLandItem}","import {originalLandItemNeighbor,landItemStatus,applyLandItem}")
start=s.index('  for(const lot of adjacent(map,p.at))if(g.owners[lot]!==undefined')
end=s.index('  for(let i=0;i<g.players.length;i++){const other=',start)
s=s[:start]+s[end:]
start=s.index('function eligible(map,g){');end=s.index('\nfunction destination',start)
s=s[:start]+'''// Original landing controller 0x44072b chooses the first non-road neighbor.
// Ordinary rent is a landing transaction; merely passing a property is free.
function eligible(map,g){const i=originalLandItemNeighbor(map,g.players[g.turn].at);if(i===null)return [];const c=map.cells[i];return [4,5,6].includes(c.event)||(c.event===1&&(g.owners[i]===undefined||g.owners[i]===g.turn&&propertyKind(g,i)<2))?[i]:[];}
function landingRent(map,g){
 const p=g.players[g.turn],lot=originalLandItemNeighbor(map,p.at),owner=g.owners[lot];
 if(lot===null||owner===undefined||owner===g.turn||propertyKind(g,lot)>=2)return false;
 const charge=originalPropertyCharge(map,g.owners,g.levels,lot,g.inflation);
 if(!canCollectRent(g.players[owner]))record(g,g.players[owner].name+'受道具影响，无法收取地产租金。');
 else if(mustPayRent(p)&&charge.amount>0){
  const receiver=rentRecipient(p,owner),reverse=hasEffect(p,'original-9'),debtor=reverse?receiver:g.turn,creditor=reverse?g.turn:receiver,amount=f32(charge.amount*((effectCapabilities(p)&0x8000)?2:1)*((effectCapabilities(g.players[receiver])&0x4000)?2:1));
  requestCharge(g,{kind:'charge',rent:true,amount,debtor,creditor,...(!reverse&&hasEffect(p,'original-8')?{armyTarget:owner}:{}),text:(reverse?'颠倒笔生效：':'')+g.players[debtor].name+'向'+g.players[creditor].name+'支付租金 '+moneyText(amount)+'。'});
 }else record(g,p.name+'受到道具保护，本次免交地产租金。');
 return true;
}'''+s[end:]
s=s.replace("return;}const ns=eligible(map,g);","return;}if(landingRent(map,g))return;const ns=eligible(map,g);")
s=s.replace("town-flow-24';","town-flow-25';")
s=s.replace("'town-flow-22','town-flow-23'].includes", "'town-flow-22','town-flow-23','town-flow-24'].includes")
p.write_text(s,'utf8')
