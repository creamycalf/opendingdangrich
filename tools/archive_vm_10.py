"""Archive the measured candidate only after the real Android competition ends."""
import hashlib
import json
from pathlib import Path
import shutil

root = Path(__file__).resolve().parent.parent
release = root / 'releases/vm-0.9-rc2'
read = lambda name: json.loads((root / name).read_text(encoding='utf-8-sig'))
verification = read('test-results/vm-10-apk-validation-final.json')
apk = release / 'DoraemonOriginal-0.9-rc2.apk'
assert hashlib.file_digest(apk.open('rb'), 'sha256').hexdigest() == verification['sha256']
competition = read('test-results/vm-10-android-competition/report.json')
assert competition['status'] == 'completed-awaiting-review', competition['status']
assert [r['gameId'] for r in competition['rounds']] == list(range(8))
assert competition['apk']['sha256'] == verification['sha256']
assert not competition['errors']
assert all(r['actions'] > 0 for r in competition['rounds'])
review = read('test-results/vm-10-android-competition/visual-review.json')
assert review['originalTotalScoreVisible'] and review['returnedToCompetitionPracticeMenu']
assert review['apkSha256'] == verification['sha256']
saves_before = read('test-results/vm-10-saved-before-restart.json')
saves_after = read('test-results/vm-10-saved-after-restart.json')
assert saves_before == saves_after
pause = read('test-results/vm-10-final-native-pause.json')
assert pause['passed']
roll = read('test-results/vm-10-human-roll.json')
assert not roll['error']
offline = read('test-results/vm-10-offline-review.json')
assert offline['apkSha256'] == verification['sha256'] and offline['passed']
record_flow = read('test-results/vm-10-android-competition/record-flow.json')
assert any(e['context'] == 'record-name' for e in record_flow['events'])
assert record_flow['final']['record'] is None and not record_flow['final']['error']
evidence = release / 'evidence'
evidence.mkdir(exist_ok=True)
files = [
 'test-results/vm-10-final-native-pause.json',
 'test-results/vm-10-saved-before-restart.json',
 'test-results/vm-10-saved-after-restart.json',
 'test-results/vm-10-human-roll.json',
 'test-results/vm-10-human-roll-before.png',
 'test-results/vm-10-human-roll-after.png',
 'test-results/vm-10-load-list.png',
 'test-results/vm-10-loaded-board.png',
 'test-results/vm-10-android-competition/report.json',
 'test-results/vm-10-android-competition/final.png',
 'test-results/vm-10-android-competition/visual-review.json',
 'test-results/vm-10-android-competition/returned-menu.png',
 'test-results/vm-10-android-competition/record-flow.json',
 'test-results/vm-10-offline-review.json',
 'test-results/vm-record-layout.json',
]
files += [f'test-results/vm-10-android-competition/game-{i}-finish.png' for i in range(8)]
files += [str(p.relative_to(root)).replace('\\','/') for p in (root/'test-results/vm-10-android-competition').glob('name-*-entered.png')]
archived = []
for file in files:
 source = root / file
 dest = evidence / source.name
 shutil.copy2(source, dest)
 archived.append({'source':file, 'file':str(dest.relative_to(release)).replace('\\','/'),
                  'sha256':hashlib.file_digest(dest.open('rb'),'sha256').hexdigest()})
report = {
 'version':'0.9-rc2', 'versionCode':10,
 'status':'passed-listed-checks; test candidate with stated limitations',
 'apk':verification, 'device':{'serial':'emulator-5580','android':15,'abi':'x86_64','renderer':'host GPU, Vulkan disabled','physicalArmTested':False},
 'originalExecutableSha256':'b99f70be2a703b7f20e5d7dbf6d29f2ffca86303f4be420bf9fb334cbe792eb1',
 'offline':{**offline,'savedFilesUnchanged':True,'saves':saves_after},
 'lifecycle':pause,
 'humanGameplay':{'frames':len(roll['frames']),'elapsedMs':roll['elapsed'],'fps':roll['fps'],'inputConsumptionMs':roll['consumption'],
                  'scope':'Actual dice tap from loaded human turn to original shop. Includes shop screen; not moving-only FPS.'},
 'competition':{'gameIds':[r['gameId'] for r in competition['rounds']],
                'actions':[r['actions'] for r in competition['rounds']],
                'scope':'Final production APK. Four human seats joined and readied; P1 played each round through ADB touchscreen. Other three not actively played in every round.',
                'bundles':competition['bundles'], 'visualReview':review},
 'tests':{'nativeDirectionalMenuCases':1680,'inputUnitTests':24,'fileRangeRegressionTests':2,
          'recordOwnerCombinations':56,'recordLayouts':6,
          'miniTouchLayoutChecks':61,'selectionLayoutSizes':3,'mixerAndAuxTests':4,
          'engineTypecheck':'passed','engineFullCheck':{'passed':1381,'failed':6,
            'failureScope':'Windows CI process groups/POSIX control CLI launcher and signals/relay sh pnpm lookup',
            'log':'test-results/vm-09-engine-check.log'}},
 'limitations':['Physical ARM phone speed and compatibility untested.',
                'Finite gameplay coverage; not every long game/map/item combination has been played.',
                'Windows hardware mixer unavailable; use Android volume keys for total volume.',
                'Original saves persist inside this app; no PC save import/export UI. Independent edition saves are incompatible.'],
 'evidence':archived,
}
(release / 'acceptance.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(release / 'SHA256SUMS.txt').write_text(verification['sha256']+'  '+apk.name+'\n',encoding='utf-8')
print(json.dumps({'apk':str(apk),'evidenceFiles':len(archived),'rounds':8}))


