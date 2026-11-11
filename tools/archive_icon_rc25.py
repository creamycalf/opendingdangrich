from pathlib import Path
import json,hashlib,zipfile,io,re,shutil
from PIL import Image
R=Path(__file__).resolve().parents[1]
p=json.loads((R/'test-results/rc25-package.json').read_text('utf8'))
sig=(R/'test-results/rc25-signature.log').read_text('utf-8-sig');old=(R/'test-results/rc24-signature.log').read_text('utf-8-sig')
pattern=r'Signer #1 certificate SHA-256 digest: (\w+)'
assert 'Verifies' in sig and re.search(pattern,sig)[1]==re.search(pattern,old)[1]
badging=(R/'test-results/rc25-badging.log').read_text('utf-8-sig');assert "versionCode='56'" in badging and "versionName='1.0.0-rc25'" in badging
apk=R/'app/android/app/build/outputs/apk/debug/app-debug.apk'
assert hashlib.sha256(apk.read_bytes()).hexdigest()==p['sha256']
checks=[]
with zipfile.ZipFile(apk) as z:
 for density in ['mdpi','hdpi','xhdpi','xxhdpi','xxxhdpi']:
  for name in ['ic_launcher.png','ic_launcher_round.png','ic_launcher_foreground.png']:
   matches=[s for s in z.namelist() if s.startswith('res/mipmap-'+density) and s.endswith('/'+name)];assert len(matches)==1,matches
   actual=Image.open(io.BytesIO(z.read(matches[0]))).convert('RGBA');expected=Image.open(R/'app/android/app/src/main/res'/('mipmap-'+density)/name).convert('RGBA')
   assert actual.size==expected.size and actual.tobytes()==expected.tobytes(),matches[0];checks.append(matches[0])
out=R/'releases/1.0.0-rc25';out.mkdir(exist_ok=True);target=out/'DingdangTouch-1.0.0-rc25.apk'
if target.exists():assert hashlib.sha256(target.read_bytes()).hexdigest()==p['sha256']
else:shutil.copy2(apk,target)
report=dict(version='1.0.0-rc25',versionCode=56,apk=target.name,sha256=p['sha256'],bytes=target.stat().st_size,package=p,iconPixelChecks=checks,signingCertificate=re.search(pattern,sig)[1],scope='New generated launcher icon and version bump. Build, complete bundled-file validation, signature continuity and 15 icon pixel checks; gameplay unchanged from RC24, not re-tested here.')
(out/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),'utf8')
(out/'SHA256SUMS.txt').write_text(p['sha256']+'  '+target.name+'\n','utf8')
(out/'README.md').write_text('叮当大富翁 RC25：换用新生成的哆啦A梦/骰子/金币图标。版本号56，可直接覆盖旧版安装保留存档，不要先卸载。游戏逻辑沿用RC24。包内资源、15份图标像素、签名连续性和版本号已核验。','utf8')
print(json.dumps(report,ensure_ascii=False))
