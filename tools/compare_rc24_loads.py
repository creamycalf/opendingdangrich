from pathlib import Path
import json
R=Path(__file__).resolve().parents[1]
def read(path):return json.loads((R/path).read_text('utf8'))
def gate(path):
 p=read(path)['progress'];a=next(x for x in p if x['label']=='track4');b=next(x for x in p if x['label']=='gate-ready');return round(b['performanceNow']-a['performanceNow'],1)
rows=[dict(scene='human-victory',beforeMs=gate('test-results/rc23-idle-probe-ending-native/human-progress.json'),afterMs=gate('test-results/rc24-ending-native/human-progress.json'))]
for suffix in ['', '-seed1']:
 old=read('test-results/rc23-hermit-production-android'+suffix+'/result.json')['checks'][0];new=read('test-results/rc24-hermit-production-android'+suffix+'/result.json')['checks'][0]
 rows.append(dict(scene='hermit-bad' if suffix else 'hermit-good',beforeMs=old['assetsReadyMs'],afterMs=new['assetsReadyMs'],firstDialogueMs=new['firstDialogueMs']))
for row in rows:row['reductionPercent']=round((1-row['afterMs']/row['beforeMs'])*100,1)
report=dict(apkSha256=read('test-results/rc24-installed.json')['apkSha256'],rows=rows,scope='Same local Android emulator and fixture paths, observed runs rather than physical-phone benchmark; original animation time excluded from image-load values.')
(R/'test-results/rc24-load-comparison.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),'utf8');print(json.dumps(report,ensure_ascii=False))
