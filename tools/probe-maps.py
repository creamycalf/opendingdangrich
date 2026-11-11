"""Read original archives and decode PCX previews; no game writes.

Format reference: lhuthng/doraemon-monopoly-localization,
apps/resource-studio/docs/map-dat-format.md (retrieved 2026-11-01).
"""
from pathlib import Path
import struct, json, zlib

def png(p, width, height, rgb):
    def chunk(t,b):
        return struct.pack('>I',len(b))+t+b+struct.pack('>I',zlib.crc32(t+b)&0xffffffff)
    raw=b''.join(b'\0'+rgb[y*width*3:(y+1)*width*3] for y in range(height))
    p.write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',width,height,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b''))

def pcx(b):
    assert b[0]==10 and b[2]==1 and b[3]==8 and b[65]==1 and b[-769]==12
    x0,y0,x1,y1=struct.unpack_from('<4H',b,4)
    w,h=x1-x0+1,y1-y0+1
    stride=struct.unpack_from('<H',b,66)[0]
    assert 0<w<=2048 and 0<h<=2048 and stride>=w
    pixels=bytearray(); pos=128
    while len(pixels)<stride*h:
        assert pos<len(b)-769
        v=b[pos]; pos+=1; count=1
        if v&192==192:
            count=v&63; v=b[pos]; pos+=1
        assert count>0 and len(pixels)+count<=stride*h
        pixels.extend(bytes([v])*count)
    palette=b[-768:]
    rgb=b''.join(palette[v*3:v*3+3] for y in range(h) for v in pixels[y*stride:y*stride+w])
    return w,h,rgb

root = Path(r'D:\Game\old\哆啦a梦大富翁\Dora')
out = Path('research/map-previews')
out.mkdir(parents=True, exist_ok=True)
rows, thumbs = [], []
for p in sorted(root.glob('map[0-9][0-9][0-9][0-9].dat')):
    data = p.read_bytes()
    assert data.startswith(b'\0\0GameOne Systems Limited\nWritten by Samme NG\0')
    count = struct.unpack_from('<I', data, 0x42)[0]
    assert count == 4
    offsets = struct.unpack_from('<5I', data, 0x66)
    assert offsets[-1] == len(data)
    assert all(a < b for a,b in zip(offsets, offsets[1:]))
    header = data[offsets[0]:offsets[1]]
    width, height = struct.unpack_from('<II', header, 4)
    iw,ih,rgb = pcx(data[offsets[1]:offsets[2]])
    png(out / (p.stem+'.png'),iw,ih,rgb)
    rows.append(dict(file=p.name, width=width, height=height, children=count,
                     terrainCount=struct.unpack_from('<I',header,0x30)[0],preview=[iw,ih]))
    thumbs.append((iw,ih,rgb))
tw=max(t[0] for t in thumbs)+8; th=max(t[1] for t in thumbs)+8
sw,sh=tw*4,th*2
sheet=bytearray(bytes([24,36,54])*sw*sh)
for i,(iw,ih,rgb) in enumerate(thumbs):
    for y in range(ih):
        start=(((i//4)*th+y+4)*sw+(i%4)*tw+4)*3
        sheet[start:start+iw*3]=rgb[y*iw*3:(y+1)*iw*3]
png(out/'contact-sheet.png',sw,sh,sheet)
(out/'maps.json').write_text(json.dumps(rows,indent=2),encoding='utf-8')
print(json.dumps(rows,indent=2))
