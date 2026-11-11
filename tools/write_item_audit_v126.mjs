import fs from 'node:fs';
import assert from 'node:assert/strict';
import {ITEMS} from '../app/src/inventory.mjs';
const sha='b99f70be2a703b7f20e5d7dbf6d29f2ffca86303f4be420bf9fb334cbe792eb1';
const partFiles=['a','b','c'].map(p=>`docs/audits/items-2026-11-07-part-${p}.json`);
const rows=partFiles.flatMap(file=>{const part=JSON.parse(fs.readFileSync(file,'utf8'));assert.equal(part.sourceSha256,sha);assert.equal(part.rows.length,14);return part.rows.map(row=>({...row,partReport:file}));}).sort((a,b)=>a.id-b.id);
assert.deepEqual(rows.map(r=>r.id),Array.from({length:42},(_,i)=>i));
const changes=[
 {ids:[12],summary:'幸运枪：新版好运阈值改为 ≥251，即749/1000好运、251/1000恶运；旧地图版本保留旧算法。',test:'tests/v126-items-a.test.mjs'},
 {ids:[26],summary:'睡意枪：大雄可以吸走静香的睡意；攻击接收者的限制保留。',test:'tests/items-part-b.test.mjs；tests/target-items.test.mjs'},
 {ids:[14,38],summary:'机械小矮人与竹蜻蜓按新版规则互斥，禁止使用且不扣库存。',test:'tests/v126-item-common.test.mjs'},
 {ids:[8,30],summary:'交换布：交换位置时清除目标的玩具军队。',test:'tests/v126-item-common.test.mjs'},
 {ids:[33,35],summary:'处境掉换枪：交换处境时清除目标的怨恨头带。',test:'tests/v126-item-common.test.mjs'},
];
for(const row of rows){const item=Object.values(ITEMS).find(i=>i.originalId===row.id);assert.ok(item);row.name=item.name;row.currentRule=item.description;row.confirmedCorrections=changes.filter(c=>c.ids.includes(row.id)).map(c=>c.summary);row.fullPcEquivalence=false;}
const common=JSON.parse(fs.readFileSync('tests/fixtures/v126-item-common.json','utf8'));
const audit={date:'2026-11-07',version:'1.0.0-rc17',sourceSha256:sha,status:'42/42 item entries reviewed against new PC evidence; confirmed differences corrected',coverage:{items:42,nativeConstructorsIncludingInternal:44,nativePairQueries:common.conflicts.length,nativeCommonTargetQueries:common.targets.length,fullPcEquivalence:false},changes,rows,limitations:['原生局部执行与反编译可验证对应规则，不代表已在PC整机逐一执行所有道具组合。','未穷尽全部仙人子类转移、任意多重状态、所有地图和动画语音的逐帧时序。','安卓验证为x86_64模拟器；尚无实体ARM手机验证。']};
fs.writeFileSync('docs/audits/PC-V126-ITEMS-2026-11-07.json',JSON.stringify(audit,null,2)+'\n');
const header=`# 42 道具核查与修正 · RC17\n\n依据用户新PC副本 \`work/new-pc-v121/Doraemon.exe\`，SHA256 \`${sha}\`。\n\n本轮42项均建立原版入口与移植实现的核查记录。证据包含REA反编译、隔离执行原版x86指令、移植规则回归；触屏测试单独记录，不作为原版规则证据。\n\n## 确认并修正\n\n${changes.map(c=>'- '+c.summary).join('\n')}\n\n复原光线原逻辑正确：炮台、导弹的等级为1，复原后变为等级0地基并保留地主。时间布清除建筑及归属。本轮补充联动测试，没有把特殊建筑错误放宽为任意等级可作用。\n\n一分为二刀和分身药水仍按本体、跟随分身逐个结算；满足邻地可购买和资金条件时可连续购地。不是无条件增加购买次数。\n\n## 每项结果\n\n以下规则说明与应用内同步。分组原始报告包含入口地址、原生执行范围和未覆盖部分：${partFiles.map((p,i)=>`[${i*14}–${i*14+13}](${p.split('/').at(-1)})`).join('、')}。\n\n|ID|道具|核对后的规则|本轮修正|\n|---:|---|---|---|\n`;
const clean=s=>s.replaceAll('|','／').replaceAll('\n',' ');
fs.writeFileSync('docs/audits/PC-V126-ITEMS-2026-11-07.md',header+rows.map(r=>`|${r.id}|${r.name}|${clean(r.currentRule)}|${r.confirmedCorrections.length?clean(r.confirmedCorrections.join('；')):'所列核查范围内未发现新的差异'}|`).join('\n')+`\n\n## 证据与范围\n\n- 原版公共规则：44个构造器、7744个道具组合/来源/施用方式查询、4680个公共攻击资格样本。两个79×79冲突表全字节比较只发现所列5格差异；其中一格涉及不挂在人身上的道路门，另四格影响当前游戏状态。\n- 概率：幸运枪1000个原版分支样本；空气枪普通角色/大雄合计2000个样本。\n- 睡意枪：32个新PC睡意来源选择样本。14–27号道具另有490个原版能力掩码样本。\n- 原始数据与生成脚本随发布包保存；测试结果见发布包verification.json。\n\n${audit.limitations.map(x=>'- '+x).join('\n')}\n`);
console.log('42 item rows merged; 5 behavior corrections; source identity verified');
