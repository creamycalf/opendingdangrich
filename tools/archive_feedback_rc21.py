"""Archive the verified RC21 APK and its bounded comparison evidence."""
from pathlib import Path
import hashlib,json,re,shutil
R=Path(__file__).resolve().parents[1]
def read(p):return json.loads((R/p).read_text('utf-8-sig'))
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
p=read('test-results/rc21-package.json')
board=read('test-results/rc21-ground-overlay-ui.json');assert board['passed']
reports={}
for name,path in {
 'hermitBrowser':'test-results/rc21-hermit-production/result.json',
 'hermitAndroid':'test-results/rc21-hermit-production-android/result.json',
 'hermitAndroidBad':'test-results/rc21-hermit-production-android-seed1/result.json',
 'cashBrowser':'test-results/rc21-cash-ui/report.json',
 'cashAndroid':'test-results/rc21-cash-ui-android/report.json',
}.items():
 d=read(path);assert d['checks'] and not d['errors'];assert not d.get('missing',[]);reports[name]=d
 if name=='cashAndroid':assert d['apkSha256']==p['sha256']
assert read('test-results/rc21-cash-ui-android/storage-restored.json')['verified']
rules=(R/'test-results/rc21-all-rules.log').read_text('utf-8-sig');assert re.search(r'fail 0\b',rules)
targeted=(R/'test-results/rc21-targeted-rules.log').read_text('utf-8-sig');assert re.search(r'fail 0\b',targeted)
sig=(R/'test-results/rc21-signature.log').read_text('utf-8-sig');old=(R/'test-results/rc20-signature.log').read_text('utf-8-sig')
pattern=r'Signer #1 certificate SHA-256 digest: (\w+)';assert 'Verifies' in sig and re.search(pattern,sig)[1]==re.search(pattern,old)[1]
apk=R/'app/android/app/build/outputs/apk/debug/app-debug.apk';assert digest(apk)==p['sha256']
device=read('test-results/rc21-installed.json');assert device['apkSha256']==p['sha256'] and device['versionName']=='1.0.0-rc21' and device['versionCode']==52
out=R/'releases/1.0.0-rc21';out.mkdir(exist_ok=True);target=out/'DingdangTouch-1.0.0-rc21.apk'
if target.exists():assert digest(target)==p['sha256']
else:shutil.copy2(apk,target)
patterns=['test-results/rc21-*.json','test-results/rc21-*.png','test-results/rc21-*.log','test-results/rc21-hermit*/result.json','test-results/rc21-hermit*/*.png','test-results/rc21-hermit*/initial-navigation-failure.json','test-results/rc21-hermit*/recovery-evidence.json','test-results/rc21-cash*/report.json','test-results/rc21-cash*/storage-restored.json','test-results/rc21-cash*/early-attempts.json','test-results/rc21-cash*/*.png','test-results/rc20-ground-overlay-*',
 'docs/audits/rc21*','docs/audits/RC21*','docs/rules/BOARD-RENDER-RC21.md','docs/rules/CASH-PRESENTATION.md',
 'research/rc21*.json','research/rc21*.txt','tests/rc21-*','tests/hermit-result-save.test.mjs','tests/rent-presentation.test.mjs','tests/cash-presentation-ui.cjs','tests/ground-overlay-*.cjs',
 'tools/extract_v126_hermit.py','tools/extract_cash_animations.py','tools/archive_feedback_rc21.py','tools/verify-installed-rc21.py',
 'app/src/main.ts','app/src/engine.mjs','app/src/map-art.mjs','app/src/hermit-view*','app/src/rent-presentation.mjs',
 'app/public/assets/pc-hermit/catalog.json','app/public/assets/cash-animations/catalog.json','app/package.json','app/android/app/build.gradle']
files=set()
for pattern in patterns:files.update(f for f in R.glob(pattern) if f.is_file() and 'backup' not in f.name.lower())
manifest=[]
for f in sorted(files):
 dest=out/'evidence'/f.relative_to(R);dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(f,dest);manifest.append(dict(file=dest.relative_to(out).as_posix(),sha256=digest(dest)))
report=dict(version='1.0.0-rc21',versionCode=52,appName='叮当大富翁',apk=dict(file=target.name,sha256=p['sha256'],bytes=target.stat().st_size),
 ruleTests=int(re.search(r'pass (\d+)\b',rules)[1]),targetedTests=int(re.search(r'pass (\d+)\b',targeted)[1]),package=p,device=device,board=board,ui=reports,
 limitations=['No physical ARM phone verification','Original monthly/ending entrance, hermit NPC tracks and some item cash/status-end feedback remain different','PC comparison is evidence-based by subsystem, not proof of whole-game or frame-perfect equivalence','PC binary saves cannot be imported'],
 sourceHashes={f.name:digest(f) for f in (R/'app/src').iterdir() if f.is_file()},evidence=manifest)
(out/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n','utf8')
(out/'SHA256SUMS.txt').write_text(p['sha256']+'  '+target.name+'\n','utf8')
(out/'README.md').write_text('''# 叮当大富翁 RC21

可覆盖安装，保留存档；不要先卸载旧版。独立触屏版，VM本轮未改。

- 修复点击地产后黄色轮廓压在人物腰部；保留原人物脚底锚点。恢复恐龙图漏画商店牌，修正宽图锚点及高楼提前裁剪。
- 仙人改用原版宝箱、红箭头、仙人图片。点宝箱选中，再点打开；补好运/恶运开箱、合箱及原音效。结果保存后重开不会再次抽签或发奖。
- 租金补原豆沙包方向动画、付款动作和金额；奖励/罚款/奖金池及买地、升级、卖地一并补可见反馈。暂停与存档不重复扣款。
- 重新用REA检查原PC状态流程，整理逐项差异，见 evidence/docs/audits/RC21-PC-FLOW-AUDIT.md。

验证包括正式RC20 APK同场景前后像素对比、三种手机尺寸宝箱生产界面、现金真实绘制与存档回归、最终APK触屏和原生存档恢复、全部打包资源逐文件核验。详细范围、次数和哈希见verification.json。

仍有原月结/终局开场、仙人后续NPC演出及部分道具资金/状态结束反馈差异；尚无实体ARM手机结果，不声称与PC全流程完全一致。
''','utf8')
print(json.dumps(dict(apk=str(target),sha256=p['sha256'],evidence=len(manifest)),ensure_ascii=False))
