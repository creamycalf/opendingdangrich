"""Operate observed original-game controls in the optional headless play diagnostic."""
import json
import os
import time
from pathlib import Path
from PIL import Image, ImageChops, ImageStat

out = Path(__file__).resolve().parents[1] / 'test-results/doraemon-vm/play'
controls = [
    ('human-ready.png', (148, 430, 174, 457), (161, 442)),
    ('human-landed.png', (194, 332, 239, 364), (215, 348)),
    ('human-turn.png', (377, 326, 405, 359), (390, 346)),
]
templates = [(Image.open(out / name).convert('RGB').crop(box), box, target)
             for name, box, target in controls]
last = 0
for _ in range(600):
    time.sleep(1)
    state = json.loads((out / 'live-state.json').read_text())
    if state['polls'] < last + 5:
        continue
    pix = (out / 'live.raw').read_bytes()
    pal = (out / 'live.palette').read_bytes()
    if len(pix) != 307200 or len(pal) != 1024:
        continue
    frame = Image.frombytes('P', (640, 480), pix)
    frame.putpalette(b''.join(pal[i:i+3] for i in range(0, 1024, 4)))
    frame = frame.convert('RGB')
    for reference, box, target in templates:
        delta = ImageStat.Stat(ImageChops.difference(reference, frame.crop(box))).mean
        if max(delta) < 9:
            path = out / 'touch-command.json'
            taps = json.loads(path.read_text(encoding='utf-8-sig'))
            taps.append(target)
            tmp = path.with_suffix('.tmp')
            tmp.write_text(json.dumps(taps))
            os.replace(tmp, path)
            last = state['polls']
            print(state['frames'], target, flush=True)
            break
