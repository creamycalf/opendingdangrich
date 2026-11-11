"""Decode owned strings.dat using the upstream manually identified glyph table.
Unmapped glyphs remain explicit; this is research text, not a translation.
"""
import hashlib,json,re
from extract_assets import BASE,SOURCE,archive,decompress

def main():
    mapping_path=BASE/'research/upstream-v053/chifont-map.ts'
    mapping_text=mapping_path.read_text(encoding='utf8')
    glyphs=json.loads(re.search(r'=\s*(\{.*\});',mapping_text).group(1))
    source=(SOURCE/'strings.dat').read_bytes()
    rows=[];missing=set()
    for path,packed in archive(source).items():
        data=decompress(packed);i=0;parts=[];unknown=[]
        while i<len(data):
            b=data[i];i+=1
            if not b:break
            if b&128:
                assert i<len(data)
                glyph=((b&127)<<8)|data[i];i+=1
                if str(glyph) not in glyphs:unknown.append(glyph);missing.add(glyph)
                parts.append(glyphs.get(str(glyph),f'[glyph:{glyph}]'))
            else:parts.append(chr(b))
        text=''.join(parts).replace('\\N','\n').replace('\\n','\n')
        rows.append({'id':'/'.join(f'{x:03}' for x in path),'text':text,'unmapped':unknown,'rawHex':data.hex()})
    report={'sourceSha256':hashlib.sha256(source).hexdigest(),
            'glyphMapSource':'https://github.com/lhuthng/doraemon-monopoly-localization/blob/36347b25bb487968d344dfa7dd9d90ae9c7d8f24/packages/dubbing-core/src/chifont-map.ts',
            'glyphMapSha256':hashlib.sha256(mapping_path.read_bytes()).hexdigest(),
            'unmappedGlyphs':sorted(missing),'records':rows}
    (BASE/'research/original-strings.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
    (BASE/'research/original-strings-decoded.txt').write_text('\n'.join(r['id']+' '+r['text'].replace('\n',' / ') for r in rows),encoding='utf8')
    print(json.dumps({'records':len(rows),'unmappedGlyphs':sorted(missing)}))

if __name__=='__main__':main()
