"""Decode the workspace copy's original LZW WAVs; keep archive IDs intact."""
from extract_assets import *
import wave,io,shutil

def main():
    out=OUT/'audio';out.mkdir(exist_ok=True)
    catalog={'sfx':{},'voices':{},'music':{},'sources':{}}
    for name,kind in [('Sfx.dat','sfx'),('voice1.dat','mandarin'),('voice2.dat','cantonese')]:
        source=(SOURCE/name).read_bytes()
        catalog['sources'][name]=hashlib.sha256(source).hexdigest()
        entries=archive(source);dest=catalog['sfx'] if kind=='sfx' else catalog['voices'].setdefault(kind,{})
        for key,packed in entries.items():
            # The original loader opens exactly three voice banks per character.
            if len(key)==3 and key[1]>=3:continue
            if packed==b'#':continue # Original empty-voice sentinel, not audio.
            raw=packed if packed[:4]==b'RIFF' else decompress(packed)
            assert raw[:4]==b'RIFF' and raw[8:12]==b'WAVE'
            with wave.open(io.BytesIO(raw),'rb') as wav:
                metadata=dict(channels=wav.getnchannels(),rate=wav.getframerate(),bits=wav.getsampwidth()*8,frames=wav.getnframes())
                assert wav.getcomptype()=='NONE'
            item='-'.join(map(str,key));path=out/kind/(item+'.wav');path.parent.mkdir(exist_ok=True)
            path.write_bytes(raw)
            dest[item]=dict(url='assets/audio/'+kind+'/'+item+'.wav',sha256=hashlib.sha256(raw).hexdigest(),**metadata)
        print(name,len(dest),'decoded WAVs',flush=True)
    for source in sorted((SOURCE.parent/'Music').glob('Track*.ogg')):
        target=out/source.name;shutil.copyfile(source,target)
        catalog['music'][int(source.stem[5:])]=dict(url='assets/audio/'+source.name,sha256=hashlib.sha256(source.read_bytes()).hexdigest())
    (out/'catalog.json').write_text(json.dumps(catalog,separators=(',',':')),'utf8')

if __name__=='__main__':main()
