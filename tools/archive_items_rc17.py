from pathlib import Path
import json,hashlib,shutil,re
root=Path(__file__).resolve().parents[1]
def read(file):return json.loads((root/file).read_text('utf-8-sig'))
def sha(file):return hashlib.sha256(file.read_bytes()).hexdigest()
package=read('test-results/rc17-package.json')
ui=read('test-results/rc17-all-items-ui-report.json')
android=read('test-results/rc17-android-items.json')
audit=read('docs/audits/PC-V126-ITEMS-2026-11-07.json')
assert ui['status']=='passed' and len(ui['checks'])==42 and ui['errors']==[]
assert android['passed'] and len(android['checks'])==6 and android['apkSha256']==package['sha256']
assert [r['id'] for r in audit['rows']]==list(range(42))
rules=(root/'test-results/rc17-all-rules.log').read_text('utf-8-sig')
assert re.search(r'fail 0\b',rules) and re.search(r'pass 302\b',rules)
signature=(root/'test-results/rc17-signature.log').read_text('utf-8-sig')
old_signature=(root/'test-results/rc17-previous-signature.log').read_text('utf-8-sig')
pattern=r'Signer #1 certificate SHA-256 digest: (\w+)'
assert re.search(pattern,signature)[1]==re.search(pattern,old_signature)[1]
apk=root/'app/android/app/build/outputs/apk/debug/app-debug.apk'
assert sha(apk)==package['sha256']
dest=root/'releases/1.0.0-rc17';dest.mkdir(exist_ok=True)
target=dest/'DingdangTouch-1.0.0-rc17.apk'
if target.exists():assert sha(target)==package['sha256'],'Refuse to overwrite a different archived APK'
else:shutil.copy2(apk,target)
files=[
 'docs/audits/PC-V126-ITEMS-2026-11-07.md','docs/audits/PC-V126-ITEMS-2026-11-07.json',
 'tests/fixtures/v126-item-common.json','tests/v126-item-common.test.mjs','tests/v126-items-a.test.mjs',
 'tests/items-part-b.test.mjs','tests/v126-items-part-c.test.mjs','tests/android-item-audit-rc17.cjs',
 'tools/audit_item_common_v126.py','tools/audit_items_part_a.py','tools/audit_items_part_c.py','tools/audit_item_b_native.py',
 'tools/write_item_audit_v126.mjs','app/src/effects.mjs','app/src/v126-effect-tables.mjs',
 'app/src/target-items.mjs','app/src/inventory.mjs','app/src/engine.mjs',
 'research/v126-restore-impact.json',
]
for pattern in ['docs/audits/items-2026-11-07-*.json','research/items-b-*-20261107.json','research/v126-items-a-*.json','test-results/rc17-*']:
 files.extend(p.relative_to(root).as_posix() for p in root.glob(pattern) if p.is_file() and p.name not in ['rc17-http.log','rc17-gradle-threads.txt','rc17-emulator.log','rc17-emulator.err','items-b-critical-20261107.json'])
manifest=[]
for file in sorted(set(files)):
 src=root/file;assert src.is_file(),file
 out=dest/'evidence'/file;out.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,out)
 manifest.append(dict(file=out.relative_to(dest).as_posix(),sha256=sha(out)))
report=dict(version='1.0.0-rc17',versionCode=48,status='item-audit fixes, packaged and emulator-verified',apk=dict(file=target.name,sha256=sha(target),bytes=target.stat().st_size),sameSigningCertificateAsRC16=True,package=package,checks=dict(ruleAndInputTests=302,itemTouchScenarios=42,androidFixScenarios=6,nativeAudit=audit['coverage']),changes=audit['changes'],limitations=audit['limitations'],evidence=manifest)
(dest/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n','utf8')
(dest/'SHA256SUMS.txt').write_text(sha(target)+'  '+target.name+'\n','utf8')
(dest/'README.md').write_text('''# 独立触屏版 RC17 · 道具核查修正版

直接覆盖安装 DingdangTouch-1.0.0-rc17.apk，保留存档；不要先卸载。签名与 RC16 相同。无需外部 Winlator。

42 种道具均已建立新 PC 原程序核查记录。本轮修正：

- 幸运枪的好运概率改为新 PC 的 74.9%。
- 睡意枪允许大雄吸取静香的睡意，接收攻击限制保留。
- 机械小矮人与竹蜻蜓互斥，不能同时生效。
- 交换布清除目标的玩具军队。
- 处境掉换枪清除目标的怨恨头带。

复原光线作用于炮台、导弹的原实现正确，补充了验证。应用内道具说明同步修订。

302 项规则/输入回归、42 道具触屏场景、最终 APK 的 6 个修复场景通过；完整原版证据、逐项核查和验证范围见 evidence/docs/audits/PC-V126-ITEMS-2026-11-07.md 及 verification.json。

本轮已逐项核查，不表示穷尽所有叠加状态、地图、仙人事件和逐帧演出。安卓验证使用 x86_64 模拟器，尚未在实体 ARM 手机上验收。

原引擎版仍为 RC11，本轮没有更改或重新发布。
''','utf8')
print(json.dumps(dict(apk=str(target),sha256=sha(target),evidenceFiles=len(manifest)),ensure_ascii=False))
