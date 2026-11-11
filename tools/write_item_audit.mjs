import fs from 'node:fs';
import {ITEMS} from '../app/src/inventory.mjs';
const groups=[
 [[0,2],'research/propertyKinds.json；tests/fixtures/original-land-items.json','tests/land-items.test.mjs','地产降级/清除归属；新PC特殊建筑降级路径未重测'],
 [[1,10,11,18,19,20,22,23,25,28,29,31],'tests/fixtures/original-item-flags.json；tests/fixtures/original-effect-clock.json','tests/effects.test.mjs','状态位、互斥、持续期旧版夹具；新PC全组合未重测'],
 [[3],'research/cloneGates.json；research/attackRedirect.json','tests/clones-magnet.test.mjs','磁铁配对、排斥、反射；新PC实际相遇流程未重测'],
 [[4,7,8,17,26,35,36],'research/attackRedirect.json；research/sleepTransferDetails.json；research/rentRetaliation26.json','tests/target-items.test.mjs；tests/effects.test.mjs','攻击/转移/睡眠旧证据；新PC全角色命中及连锁未重测'],
 [[5,9,12,16,27,30,33,34],'rea-analysis/wa.exe-ec35d2f7d4b2e39f/evidence/economic-item-details.json；research/resumed-rentFull.json','tests/economic-items.test.mjs；tests/target-items.test.mjs','经济/交换/日期效果已有实现与旧证据；新PC对应道具入口未逐一重测'],
 [[6],'tests/fixtures/original-road-items.json；research/pc-v126-road-direction.json','tests/tunnel.test.mjs；tests/pc-navigation.test.mjs','新PC门/隧道方向片段已对照；变小状态全部交互未重测'],
 [[13,37],'tests/fixtures/original-road-items.json；research/pc-v126-road-direction.json','tests/road-items.test.mjs；tests/pc-navigation.test.mjs','道路目标和新PC门方向片段；新PC完整传送链未重测'],
 [[14,38,39],'research/itemsFlightSmallGhost.json；research/sleepFlags26.json','tests/target-items.test.mjs；tests/effects.test.mjs；tests/movement-flow.test.mjs','飞行/缩小/机械体旧证据；新PC买地权限与回体连锁未全覆盖'],
 [[15],'research/v126-clone-arrival-controller.json；research/v126-clone-rent-controller.json','tests/pc-clone-arrival.test.mjs；tests/economic-items.test.mjs','本轮确证并修复：自己地产也转入租金分支，款项交给施术者；相机反射后的同源极端组合未验证'],
 [[21],'research/propertyKinds.json；research/specialPropertyRules.json','tests/property.test.mjs','建筑搬迁与特殊建筑排除旧证据；新PC两地点UI未全覆盖'],
 [[24,32],'research/clonesLifecycle.json；tests/fixtures/original-clone-placement.json；research/v126-clone-arrival-controller.json','tests/clones-magnet.test.mjs；tests/pc-clone-arrival.test.mjs','本轮新PC确证逐个本体/分身停靠；新地图双购地、拒绝后继续、双租金及存档回放通过；三分身新PC整机录像/传送交互仍未覆盖'],
 [[40,41],'research/specialPropertyRules.json；research/v126-clone-arrival-controller.json','tests/special-buildings.test.mjs','新PC落地入口可辨识特殊建筑；建造/命中整条链新PC未重测']
];
const rows=Object.values(ITEMS).sort((a,b)=>a.originalId-b.originalId).map(i=>{
 const group=groups.find(g=>g[0].includes(i.originalId));if(!group)throw Error('missing '+i.originalId);
 return {id:i.originalId,name:i.name,implemented:i.implemented,evidence:group[1],tests:group[2],scope:group[3],fullPcEquivalence:false};
});
const head=`# 42 道具原版一致性审计（2026-11-06）\n\n本轮以新PC \`work/new-pc-v121/Doraemon.exe\` 为准，SHA256 \`b99f70be2a703b7f20e5d7dbf6d29f2ffca86303f4be420bf9fb334cbe792eb1\`。旧版 \`wa.exe\` SHA256 \`f190b35370d3efe3024b5105a90f85abf07f5915e7b7a431d93b756de03f65f3\` 的证据不能自动作为新版行为一致的结论。表中列出的旧证据与测试是定位入口，不代表本轮全部重新执行。\n\n状态分开记录：42项均有移植实现；**没有任何一项仅凭“已实现”就被标记为与新PC全部场景一致**。本轮新增REA（Ghidra 12.1.4）证据是新PC落地控制器 \`0x440a13\`、租金控制器 \`0x443bb1\`。\n\n一分为二刀不是额外掷一次骰子。落地处理从本体开始，调用 \`0x40637a\` 遍历跟随链，每个身体分别触发脚下事件和邻地处理。因此两个可购买邻地且余额足够时，会出现两次购买；落点旁无地、已有地主、资金不足、效果限制等条件会改变实际提示。镜头原先始终跟随本体，现已跟随正在结算的 \`visitAt\`，购买提示区分本体与分身。\n\n确定并修复的规则差异：狸猫套装原程序将穿戴者自己的普通地产也送入租金处理，再把租金交给施术者。旧移植版提前排除了自己的土地，错误进入地产管理。新回归包含本体和分身两次停靠。\n\n|ID|道具|证据入口|回归入口|已覆盖范围 / 未覆盖项|\n|---:|---|---|---|---|\n`;
// Paths remain repo-relative inside this portable audit document.
fs.mkdirSync('docs/audits',{recursive:true});
fs.writeFileSync('docs/audits/PC-V126-ITEMS-2026-11-06.md',head.replaceAll('\`','`')+rows.map(r=>`|${r.id}|${r.name}|${r.evidence}|${r.tests}|${r.scope}|`).join('\n')+'\n\n本轮执行结果：19项克隆/经济/移动规则回归通过（包括4项新PC地图用例）；TypeScript通过。UI回归另见 test-results/rc16-clone-arrival-ui.json。本报告保留整机PC动态演示、极端效果组合、42项新版逐道具流程仍未全部覆盖的限制。\n');
fs.writeFileSync('docs/audits/PC-V126-ITEMS-2026-11-06.json',JSON.stringify({sourceSha256:'b99f70be2a703b7f20e5d7dbf6d29f2ffca86303f4be420bf9fb334cbe792eb1',rows},null,2));
const reportPath='test-results/rc16-all-items-ui-report.json';
if(fs.existsSync(reportPath)){
 const report=JSON.parse(fs.readFileSync(reportPath,'utf8'));
 if(report.status==='passed'&&report.checks.length===42&&report.errors.length===0){
  const jsonPath='docs/audits/PC-V126-ITEMS-2026-11-06.json',audit=JSON.parse(fs.readFileSync(jsonPath,'utf8'));
  audit.touchUiRegression={report:reportPath,passedItems:42,pageErrors:0,scope:'actual touch use, original-asset animation, product-command replay and restore; not original PC behavioral equivalence'};
  audit.rows.forEach(row=>row.touchUiPassed=true);fs.writeFileSync(jsonPath,JSON.stringify(audit,null,2));
  fs.appendFileSync('docs/audits/PC-V126-ITEMS-2026-11-06.md','\n补充本轮执行：42/42道具已在静态构建的Chrome手机触屏场景中逐项使用，包含目标人物/地图点选、原资源动画、命令回放与恢复、幸运枪动画中途暂停/继续，页面与音频错误为0。报告 `'+reportPath+'`。这证明移植版上述路径可用，不等于42道具已与新PC全场景行为一致。\n');
 }
}
