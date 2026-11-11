"""Export six characters' directional frames and original menu/calendar art."""
from extract_assets import *

def main():
    bm=archive((SOURCE/'bitmaps.dat').read_bytes())
    _,_,_,pal=pcx(decompress(bm[(1,)]))
    sp=archive((SOURCE/'Sprite1.dat').read_bytes())
    an=archive((SOURCE/'anime.dat').read_bytes())
    # Four direction records, inspected against the actual decoded artwork.
    groups={'doraemon':[0,1,2,3],'nobita':[8,9,10,11],
            'dorami':[16,17,18,19],'shizuka':[12,13,14,15],
            'suneo':[228,229,230,231],'gian':[300,301,302,303]}
    result={}
    for name,records in groups.items():
        result[name]=[]
        for record in records:
            d=decompress(an[(record,)])
            ids=[u32(d,20+i*4) for i in range(8)]
            result[name].append(ids)
            for n in ids:
                w,h,hx,hy,rgba=sprite(decompress(sp[(n,)]),pal)
                png(OUT/'characters'/f'{n}.png',w,h,rgba)
    for n in range(23,47):
        w,h,rgba,_=pcx(decompress(bm[(n,)]))
        png(OUT/'ui'/f'portrait-{n}.png',w,h,rgba)
    w,h,rgba,_=pcx(decompress(bm[(53,)]))
    png(OUT/'ui/title.png',w,h,rgba)
    s2=archive((SOURCE/'sprite2.dat').read_bytes())
    for n in [90,94,101,113,202,*range(138,177)]:
        w,h,_,_,rgba=sprite(decompress(s2[(n,)]),pal)
        png(OUT/'ui'/f'{n}.png',w,h,rgba)
    m=archive((SOURCE/'map0004.dat').read_bytes());conf=m[(2,)]
    result['jail']={'x':u32(conf,0x44),'y':u32(conf,0x48),'direction':u32(conf,0x4c)}
    result['source']='Original anime.dat references; first eight body frames per direction. Timing approximated.'
    (OUT/'flow-assets.json').write_text(json.dumps(result,ensure_ascii=False),encoding='utf8')
    print('Six character frame sets, title, calendar and jail configuration exported')

if __name__=='__main__': main()
