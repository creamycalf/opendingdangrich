import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { pcAvailableInputs, pcDefaultInputs } from '../app/src/pc-controller-settings.mjs';

const native = JSON.parse(readFileSync(new URL('./fixtures/pc-v126-controller-settings.json', import.meta.url)));
test('all five hardware configurations match the PC controller menu and Reset button', () => {
  for (const {pads, choices, reset} of native.rows) {
    assert.deepEqual(pcAvailableInputs(pads), choices);
    assert.deepEqual(pcDefaultInputs(pads), reset);
  }
});
