/**
 * One face per update of the PC roll handler, including its final handoff
 * to movement. Assumes each preview face has at least one legal endpoint.
 * draw is the result of the original bounded random call with bound 12.
 */
export function pcRollSpin(limit, draw) {
  return pcTerrainSpin(limit, draw, 0, () => true).faces;
}

// Both settings hand off at the same endpoint check in the PC handler.
export function finishPcRoll(face, direction, hasEndpoints) {
  while (face > 0 && !hasEndpoints(face, direction)) face--;
  if (face === 0) direction ^= 1;
  return {faces: [face], directions: [direction], result: face, direction};
}

/** hasEndpoints(face, direction) queries the original position, never advancing it. */
export function pcTerrainSpin(limit, draw, direction, hasEndpoints) {
  if (![3, 4, 6].includes(limit) || !Number.isInteger(draw) || draw < 0 || draw >= 12)
    throw new RangeError('Unsupported PC roll limit or delay draw');
  if (!Number.isInteger(direction) || direction < 0 || direction > 3)
    throw new RangeError('Expected an original compass direction (0–3)');

  const faces = [], directions = [];
  let face = 1;
  let speed = 15;
  let countdown = 1;
  // The first update starts the delay. The next 3+draw updates consume
  // it. One more switches to deceleration without yet reducing speed.
  const decelerationStarts = 5 + draw;
  for (let tick = 0; ; tick++) {
    if (tick >= decelerationStarts) {
      if (speed <= 0) {
        const final = finishPcRoll(face, direction, hasEndpoints);
        faces.push(final.result);
        directions.push(final.direction);
        return {...final, faces, directions};
      }
      speed = Math.fround(speed - Math.fround(0.4));
    }
    if (countdown > 0) {
      if (!hasEndpoints(face, direction)) {
        if (face < 2) direction ^= 1;
        else face = 1;
      }
      countdown = Math.fround(countdown - 1);
    } else {
      countdown = Math.fround(15 - speed + 2);
      face = face % limit + 1;
    }
    faces.push(face);
    directions.push(direction);
  }
}
