"""Archive measured RC9 checks; retain the actual RC7 competition provenance."""
from pathlib import Path
import json,hashlib,shutil
root=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((root/p).read_text(encoding='utf-8-sig'))
release=root/'releases/vm-0.9-rc9'
v=read('releases/vm-0.9-rc9/verification.json')
assert hashlib.file_digest((release/'DoraemonOriginal-0.9-rc9.apk').open('rb'),'sha256').hexdigest()==v['sha256']
before=read('test-results/vm-17-saved-before-restart.json');after=read('test-results/vm-17-saved-after-restart.json')
assert before==after
pause=read('test-results/vm-17-final-native-pause.json');assert pause['passed']
roll=read('test-results/vm-17-human-roll.json');assert not roll['error'] and roll['consumption'] is not None
competition=read('test-results/vm-15-android-competition/report.json')
review=read('test-results/vm-15-android-competition/visual-review.json')
record=read('test-results/vm-15-android-competition/record-flow.json')
assert [r['gameId'] for r in competition['rounds']]==list(range(8)) and not competition['errors']
assert review['returnedToCompetitionPracticeMenu'] and record['final']['menu']['context']=='mini-title'
assert 'Active default network: none' in (root/'test-results/vm-17-offline-connectivity-confirmed.txt').read_text(encoding='utf-8-sig')
paths=['vm-17-saved-before-restart.json','vm-17-saved-after-restart.json','vm-17-final-native-pause.json','vm-17-human-roll.json','vm-17-human-roll-before.png','vm-17-human-roll-after.png','vm-17-cold-ranking.png','vm-17-load-list.png','vm-17-loaded-board.png','vm-17-offline-boot-confirmed.json','vm-17-offline-connectivity-confirmed.txt','vm-17-input-tests.log']
paths+=['vm-15-android-competition/'+p for p in ['report.json','visual-review.json','record-flow.json','final.png','result-no-selected.png','celebration.png','name-0-entered.png','returned-menu.png']]
evidence=release/'evidence';evidence.mkdir(exist_ok=True);manifest=[]
for p in paths:
 src=root/'test-results'/p;dst=evidence/p.replace('/','-');shutil.copy2(src,dst)
 manifest.append(dict(source='test-results/'+p,file='evidence/'+dst.name,sha256=hashlib.file_digest(dst.open('rb'),'sha256').hexdigest()))
report={'version':'0.9-rc9','versionCode':17,'status':'test candidate; listed checks passed, limitations remain','apk':v,
 'device':'Android 15 x86_64 emulator-5580; host GPU; no physical ARM validation',
 'finalApkChecks':{'offlineColdBoot':read('test-results/vm-17-offline-boot-confirmed.json'),'saveReadbackHashesIdentical':True,'savedFiles':after,
 'rankingVisualReview':{'name':'FFF','score':23130,'rank':8,'visibleAfterColdRestart':True},
 'board':'Actual direct toolbar settings tap, original save confirmation, cold load, direct dice tap and original shop landing visually reviewed.',
 'humanRoll':{'frames':len(roll['frames']),'elapsedMs':roll['elapsed'],'fps':roll['fps'],'inputConsumptionMs':roll['consumption'],'scope':'15 second dice-to-shop interval includes landing UI, not moving-only FPS'},'pause':pause,'inputRegressionTests':29},
 'competitionRegression':{'apkVersion':'0.9-rc7','apkSha256':competition['apk']['sha256'],'games':list(range(8)),'finalReview':review,
 'scope':'Eight actual games, four human seats ready, P1 active play, total result No-to-Yes, winner, native name FFF, stable menu return. This is RC7 evidence, not a repeated RC9 full competition.',
 'laterChange':'RC9 changes only board toolbar hit testing relative to RC7; final board item 2 expands 5px native height to 37px. Failed RC8 offset translation was removed. Competition/record code unchanged.'},
 'engineChecks':{'typecheck':'passed','unitPass':1384,'unitFail':6,'log':'test-results/vm-14-engine-check-final.log','failures':'Windows process-group/POSIX launcher/signal and relay packaging tool assumptions','registryTests':3,'mixerTests':4},
 'limitations':['Physical ARM speed and compatibility unverified.','Finite coverage, not every map/item/long-game combination tested.','53.083s offline cold boot on this emulator; startup delay remains.','Some original dialogs use the on-screen direction/confirm controls.','No PC save import/export UI; independent edition uses separate saves.'], 'evidence':manifest}
(release/'acceptance.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(release/'SHA256SUMS.txt').write_text(v['sha256']+'  DoraemonOriginal-0.9-rc9.apk\n',encoding='utf-8')
print(json.dumps({'release':str(release),'evidenceFiles':len(manifest)}))
