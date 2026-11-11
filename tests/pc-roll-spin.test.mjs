import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { pcRollSpin, pcTerrainSpin, finishPcRoll } from '../app/src/pc-roll-spin.mjs';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/pc-v126-roll-spin.json', import.meta.url)));
test('disabled animation resolves all 39 PC cases in one update, including blocked roads', () => {
  assert.equal(fixture.instant.length, 39);
  for (const {draw, startDirection, ranges, faces, directions, result, direction} of fixture.instant) {
    assert.deepEqual(finishPcRoll(draw+1,startDirection,(n,d)=>n<=ranges[d]), {faces,directions,result,direction});
  }
});
test('each update and final handoff match the v1.26 animated roll handler', () => {
  assert.equal(fixture.rows.length, 36);
  for (const {limit, draw, faces, result} of fixture.rows) {
    const trajectory = pcRollSpin(limit, draw);
    assert.deepEqual(trajectory, faces, 'limit '+limit+' draw '+draw);
    assert.equal(trajectory.at(-1), result);
  }
});

test('restricted routes reproduce each PC face, reversal and movement handoff', () => {
  for (const row of fixture.restricted) {
    const {limit, draw, startDirection, ranges, faces, directions, result, direction} = row;
    const track = pcTerrainSpin(limit, draw, startDirection, (face, heading) => face <= ranges[heading]);
    assert.deepEqual(track, {faces, directions, result, direction});
    assert.equal(row.nextMessage, result > 0 ? 7 : 9);
  }
});
