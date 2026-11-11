from extract_assets import *
entries=archive((SOURCE/'Sprite1.dat').read_bytes())
palettes=json.loads((OUT/'palettes.json').read_text())
# Compare palettes on the same real character image.
sw,sh=12*70,((len(palettes)+11)//12)*70
sheet=bytearray(bytes([45,60,70,255])*sw*sh)
for i,p in enumerate(palettes):
    w,h,hx,hy,rgba=sprite(decompress(entries[(1,)]),bytes(p['rgb']))
    for y in range(min(h,65)):
        for x in range(w):
            a=(y*w+x)*4
            if rgba[a+3]:
                z=(((i//12)*70+y)*sw+(i%12)*70+x)*4
                sheet[z:z+4]=rgba[a:a+4]
png(BASE/'research/palette-sheet.png',sw,sh,sheet)
print('palettes',len(palettes),'sprite records',len(entries))
print([(p['id'],i) for i,p in enumerate(palettes[:30])])
# Character candidates, every 20th frame.
pal=bytes(palettes[0]['rgb']); samples=[]
for key,b in list(entries.items())[::20]:
    try:
        w,h,hx,hy,rgba=sprite(decompress(b),pal)
        if w<130 and h<130:samples.append((key,w,h,rgba))
    except Exception:pass
sw=12*140;sh=((len(samples)+11)//12)*140
sheet=bytearray(bytes([45,60,70,255])*sw*sh)
for i,(key,w,h,rgba) in enumerate(samples):
    for y in range(h):
        for x in range(w):
            a=(y*w+x)*4
            if rgba[a+3]:
                z=(((i//12)*140+y)*sw+(i%12)*140+x)*4;sheet[z:z+4]=rgba[a:a+4]
png(BASE/'research/character-sheet.png',sw,sh,sheet)
(BASE/'research/character-samples.json').write_text(json.dumps([list(s[0]) for s in samples]))
