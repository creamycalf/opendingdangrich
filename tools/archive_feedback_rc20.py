from pathlib import Path
import hashlib,json,re,shutil
R=Path(__file__).resolve().parents[1]
def read(p):return json.loads((R/p).read_text('utf-8-sig'))
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
p=read('test-results/rc20-package.json');android=read('test-results/rc20-android-feedback.json')
assert android['passed'] and not android['errors'] and android['apkSha256']==p['sha256']
items=read('test-results/rc20-all-items-ui-report.json');assert items['status']=='passed' and len(items['checks'])==42 and not items['errors']
for f in ['test-results/rc20-property-art-ui.json','test-results/rc20-shop-touch/result.json','test-results/rc20-inventory-touch/result.json','test-results/rc20-obstacle-touch-report.json']:
 d=read(f);assert not d['errors'],f
rules=(R/'test-results/rc20-all-rules.log').read_text('utf-8-sig');assert re.search(r'fail 0\b',rules)
tests=int(re.search(r'pass (\d+)\b',rules)[1])
sig=(R/'test-results/rc20-signature.log').read_text('utf-8-sig');old=(R/'test-results/rc19-signature.log').read_text('utf-8-sig')
pattern=r'Signer #1 certificate SHA-256 digest: (\w+)';assert 'Verifies' in sig and re.search(pattern,sig)[1]==re.search(pattern,old)[1]
out=R/'releases/1.0.0-rc20';out.mkdir(exist_ok=True);apk=R/'app/android/app/build/outputs/apk/debug/app-debug.apk';assert digest(apk)==p['sha256']
target=out/'DingdangTouch-1.0.0-rc20.apk'
if target.exists():assert digest(target)==p['sha256']
else:shutil.copy2(apk,target)
patterns=['test-results/rc20-*.json','test-results/rc20-*.png','test-results/rc20-all-rules.log','test-results/rc20-build.log','test-results/rc20-signature.log','test-results/rc20-shop-touch/*','test-results/rc20-inventory-touch/*',
 'docs/audits/rc20*','docs/rules/PROPERTY-ART.md','docs/design/launcher-icon-preview.png',
 'tests/fixtures/original-property-art.json','tests/property-art*','tests/obstacle-touch-ui.cjs','tests/rc20-inventory-touch.cjs','tests/shop-touch.cjs','tests/android-feedback-rc20.cjs','tests/all-items-ui.cjs',
 'tools/verify_property_art.py','app/src/main.ts','app/src/property-art.mjs','app/src/board-cell-info.mjs','app/src/shop-view*','app/src/minigame-view.ts','app/src/minigame-touch.css','app/src/inventory.mjs',
 'app/android/app/src/main/res/mipmap*/*','app/android/app/src/main/res/drawable/ic_launcher*','app/android/app/src/main/res/values/strings.xml','app/package.json','app/capacitor.config.json','app/android/app/build.gradle']
files=set()
for pattern in patterns:files.update(f for f in R.glob(pattern) if f.is_file())
manifest=[]
for f in sorted(files):
 dest=out/'evidence'/f.relative_to(R);dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(f,dest);manifest.append(dict(file=dest.relative_to(out).as_posix(),sha256=digest(dest)))
report=dict(version='1.0.0-rc20',versionCode=51,appName='叮当大富翁',apk=dict(file=target.name,sha256=p['sha256'],bytes=target.stat().st_size),ruleTests=tests,android=android,package=p,
 validation=dict(propertyDirections=497,propertyCombinations=69580,itemsTouch=42,shopViewports=3,pocketViewports=2),
 limitations=['No physical ARM phone verification','PC comparison is targeted to reported faults; not proof of full game equivalence','Original ending/monthly entrance animations and some hermit audio remain different'],
 sourceHashes={f.name:digest(f) for f in (R/'app/src').iterdir() if f.is_file()},evidence=manifest)
(out/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n','utf8')
(out/'SHA256SUMS.txt').write_text(p['sha256']+'  '+target.name+'\n','utf8')
(out/'README.md').write_text(f'''# 叮当大富翁 RC20

可直接覆盖安装，保留已有存档，不要先卸载。应用包名和签名保持一致。

- 商店改为滑动图文目录，购买/出售后留在目录，保留位置并刷新现金与持有数量，可连续买多种或多件。
- 口袋改为滑动图文目录，显示道具图、数量、效果；返回保留位置，长按不再选择文字。
- 障碍竞速保留落后真人的动画小窗，显示速度、加速次数、防守/受击状态，单人按钮占整行。
- 修复未来地图升级误取黑色占位图；地产朝向按原版道路算法计算，空地基不再覆盖角色。
- 点击红色/黑色铜锣烧地格显示奖励/征罚效果，其他事件格也补说明；澄清徽章等文案。
- 应用名称改为“叮当大富翁”，使用新的铃铛骰子图标。

{tests}项规则/输入回归、42道具触屏施放、三种屏幕商店测试、两种屏幕全42种口袋检查通过。497块地产朝向与原x86一致，69580组合检查通过；未来图五级截图、真实升级/冷重载通过。最终APK验证连续购买、真实滑动口袋、P4小游戏点击/防守（暂停另有浏览器回归）。全部资源与签名核验通过。

本轮针对反馈逐项核对，不代表已经与PC全流程完全一致。部分结局/月结演出及仙人音轨仍有差异，尚无实体ARM手机验收。详见verification.json与evidence。
''','utf8')
print(json.dumps(dict(apk=str(target),sha256=p['sha256'],tests=tests,evidence=len(manifest)),ensure_ascii=False))
