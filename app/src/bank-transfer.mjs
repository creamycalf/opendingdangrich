// Original 0x403d7a: center 50 keeps balances, each step transfers 2%.
export function bankTransfer(cash,bank,position){
 if(!Number.isInteger(position)||position<0||position>100)throw Error('矿山滑条位置无效');
 const withdraw=position>=50;
 const ratio=Math.fround(Math.abs(position-50)/50);
 const amount=Math.fround(ratio*(withdraw?bank:cash));
 return {action:withdraw?'withdraw':'deposit',amount,
  cash:Math.fround(cash+(withdraw?amount:-amount)),bank:Math.fround(bank+(withdraw?-amount:amount))};
}
