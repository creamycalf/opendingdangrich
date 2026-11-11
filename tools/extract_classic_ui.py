"""Decode original HUD artwork from the workspace PC copy."""
from extract_assets import *

def main():
    bitmaps=archive((SOURCE/'bitmaps.dat').read_bytes())
    _,_,_,pal=pcx(decompress(bitmaps[(1,)]))
    sprites=archive((SOURCE/'sprite2.dat').read_bytes())
    for n in [0,1,177,178,190,201,214,218,*range(145,165)]:
        w,h,_,_,rgba=sprite(decompress(sprites[(n,)]),pal)
        png(OUT/'ui'/f'{n}.png',w,h,rgba)
    for n in [26,30]:
        w,h,rgba,_=pcx(decompress(bitmaps[(n,)]))
        png(OUT/'ui'/f'portrait-{n}.png',w,h,rgba)
    print('Original HUD artwork exported')

if __name__=='__main__': main()
