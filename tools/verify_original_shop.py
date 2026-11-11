"""Run the original human-shop price arithmetic, not reconstructed formulas.

Entry/exit are instruction boundaries inside 0x4a44xx's UI handler. Synthetic
locals select a real shop record/item; all arithmetic is original x86/x87.
This verifies quotes only, not the complete shop UI or item behavior.
"""
from pathlib import Path
import json, struct
from verify_original_economy import Oracle, SHA, pe, UC_X86_REG_EBP

ROOT = Path(__file__).resolve().parents[1]


def main():
    cases = []
    for number in range(8):
        board = json.loads((ROOT / f'app/public/assets/maps/{number}.json').read_text('utf8'))
        oracle = Oracle(board)
        u = oracle.uc
        frame, shop, ui = 0x20fe000, 0x10e0000, 0x10e1000
        assert struct.unpack('<f', pe.get_data(0xb6300, 4))[0] == 100
        oracle.put(ui + 0x178, shop)
        oracle.put(frame - 0x78, ui)
        u.reg_write(UC_X86_REG_EBP, frame)
        for index, record in enumerate(board['shops']):
            oracle.put(shop, record['x'], record['y'], record['z'], *record['rawParameters'])
            for multiplier in [1, 1.2, 1.44]:
                u.mem_write(0x4c54bc, struct.pack('<f', multiplier))
                for discount in [100, 60]:
                    u.mem_write(0x4c55e0, struct.pack('<f', discount))
                    for item in range(42):
                        oracle.put(frame - 0x40, item)
                        u.emu_start(0x4a45c3, 0x4a45fb, count=100)
                        buy = struct.unpack('<f', u.mem_read(frame - 0x38, 4))[0]
                        oracle.put(frame - 0x6c, item)
                        u.emu_start(0x4a4945, 0x4a4977, count=100)
                        sell = struct.unpack('<f', u.mem_read(frame - 0x64, 4))[0]
                        cases.append(dict(map=number, shop=index, item=item, multiplier=multiplier,
                                          purchasePercent=discount, buy=buy, sell=sell))
    result = dict(sourceSha256=SHA, scope='Original human-shop arithmetic instruction slices; no UI stubs',
                  buyRange=['0x4a45c3', '0x4a45fb'], sellRange=['0x4a4945', '0x4a4977'], cases=cases)
    (ROOT / 'tests/fixtures/original-shop-prices.json').write_text(json.dumps(result, separators=(',', ':')), 'utf8')
    print(f'Original shop quotes: {len(cases)} pairs across 8 maps')


if __name__ == '__main__':
    main()
