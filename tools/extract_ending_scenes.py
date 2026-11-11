"""New PC 473ca6 GAME OVER background/palette and eight Sprite2 letters."""
from extract_assets import *

def main():
    src=BASE/'work/vm-original-verified';out=OUT/'ending-scenes'
    bm=archive((src/'bitmaps.dat').read_bytes());sp=archive((src/'sprite2.dat').read_bytes())
    w,h,rgba,pal=pcx(decompress(bm[(121,)]));png(out/'gameover-background.png',w,h,rgba)
    result={'source':{n:hashlib.sha256((src/n).read_bytes()).hexdigest() for n in ['bitmaps.dat','sprite2.dat']},'background':{'url':'assets/ending-scenes/gameover-background.png','w':w,'h':h},'letters':[]}
    for i,x in enumerate([1,81,158,253,337,424,499,568]):
        n=550+i;w,h,hx,hy,rgba=sprite(decompress(sp[(n,)]),pal);png(out/f'letter-{n}.png',w,h,rgba)
        result['letters'].append(dict(id=n,x=x,w=w,h=h,url=f'assets/ending-scenes/letter-{n}.png'))
    result['motion']={'start':-44,'staggerY':-10,'fallStep':10,'waveStart':186,'phaseSwitch':194,'waveEnd':204,'waveSamples':19,'amplitude':4,'radians':6.28}
    (out/'catalog.json').write_text(json.dumps(result,separators=(',',':')),'utf8')
    monthly=OUT/'monthly-scenes';catalog={'source':result['source'],'bitmaps':{},'sprites':{}}
    for n in [54,119,*range(64,88)]:
        w,h,rgba,palette=pcx(decompress(bm[(n,)]));png(monthly/f'bitmap-{n}.png',w,h,rgba)
        catalog['bitmaps'][n]=dict(w=w,h=h,url=f'assets/monthly-scenes/bitmap-{n}.png')
        if n==119:monthly_palette=palette
    for n in [*range(304,318),*range(433,476)]:
        w,h,hx,hy,rgba=sprite(decompress(sp[(n,)]),monthly_palette);png(monthly/f'sprite-{n}.png',w,h,rgba)
        catalog['sprites'][n]=dict(w=w,h=h,hx=hx,hy=hy,url=f'assets/monthly-scenes/sprite-{n}.png')
    (monthly/'catalog.json').write_text(json.dumps(catalog,separators=(',',':')),'utf8')
    print('Original GAME OVER scene extracted')

if __name__=='__main__':main()
