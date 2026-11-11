import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {tournamentPoints,TOURNAMENT_ORDER} from '../app/src/arcade-scoring.mjs';

const fixture=JSON.parse(readFileSync(new URL('./fixtures/pc-v126-tournament.json',import.meta.url)));
test('all eight competition result conversions match v1.26 machine-code fixtures',()=>{
  assert.deepEqual(fixture.rows.map(row=>row.session.id),TOURNAMENT_ORDER);
  for(const row of fixture.rows)assert.deepEqual(tournamentPoints(row.session),row.points,'game '+row.session.id);
});
