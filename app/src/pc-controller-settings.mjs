/** Controller identifiers from the PC 操控設定 screen (v1.26 handler 0x460ae4). */
export const PC_INPUTS = Object.freeze([
  '手柄 1', '手柄 2', '手柄 3', '手柄 4',
  '方向键、Del、Page Down', 'WASD、Q、E', 'IJKL、U、O', '鼠标',
]);

function checkedPadCount(count) {
  if (!Number.isInteger(count) || count < 0 || count > 4)
    throw new RangeError('PC controller count must be 0–4');
  return count;
}

/** Visible controller choices, in the original order. */
export function pcAvailableInputs(padCount) {
  return Array.from({length: checkedPadCount(padCount)}, (_, i) => i).concat([4, 5, 6, 7]);
}

/** The PC Reset button prioritizes attached gamepads, then arrows, mouse and letter keys. */
export function pcDefaultInputs(padCount) {
  return Array.from({length: checkedPadCount(padCount)}, (_, i) => i).concat([4, 7, 5, 6]).slice(0, 4);
}
