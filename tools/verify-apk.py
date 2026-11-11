"""Check packaged game resources match the source build and emit a local report."""
from pathlib import Path
import zipfile,json,hashlib,argparse
root=Path(__file__).resolve().parents[1]
version=json.loads((root/'app/package.json').read_text(encoding='utf8'))['version']
parser=argparse.ArgumentParser()
parser.add_argument('--apk',type=Path,default=root/f'releases/DingdangTouch-{version}-debug.apk')
parser.add_argument('--report',type=Path,default=root/'test-results/apk-report.json')
args=parser.parse_args()
apk=args.apk.resolve()
with zipfile.ZipFile(apk) as z:
    assert z.testzip() is None
    names=z.namelist()
    assert 'classes.dex' in names
    config=json.loads(z.read('assets/capacitor.config.json'))
    assert config['appId']=='local.dingdang.touch'
    assert 'server' not in config, 'Release must use bundled assets, not a dev server'
    count=0
    for source in (root/'app/dist').rglob('*'):
        if source.is_file():
            key='assets/public/'+source.relative_to(root/'app/dist').as_posix()
            assert z.read(key)==source.read_bytes(),key
            count+=1
    game=json.loads(z.read('assets/public/assets/town.json'))
    assert len(game['cells'])==2500
    animations=json.loads(z.read('assets/public/assets/flow-assets.json'))
    characters=['doraemon','nobita','dorami','shizuka','suneo','gian']
    for character in characters:
        assert len(animations[character])==4
        for frames in animations[character]:
            assert len(frames)==8
            for frame in frames: assert f'assets/public/assets/characters/{frame}.png' in names
    board=json.loads(z.read('assets/public/assets/character-poses/catalog.json'))
    for sizes in board['characters'].values():
        for poses in sizes.values():
            for pose in (0,2,3,4):
                for animation in poses[str(pose)]:
                    for sprite in board['animations'][str(animation)]['sprites']:
                        z.getinfo('assets/public/'+board['images'][str(sprite)]['url'])
    report=dict(file=str(apk),sizeBytes=apk.stat().st_size,sha256=hashlib.sha256(apk.read_bytes()).hexdigest(),bundledFilesVerified=count,mapCells=2500,charactersVerified=len(characters),devServer=False,scope='Package integrity only; gameplay and device verification are recorded separately.')
report['boardCharactersVerified']=sorted(board['characters'])
args.report.write_text(json.dumps(report,indent=2),encoding='utf8')
print(json.dumps(report,indent=2))
