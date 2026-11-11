import { miniRewards } from './minigames.mjs';

// The title tournament advances DAT_004cd3cc from 0 through 7 (0x45c732).
export const TOURNAMENT_ORDER = Object.freeze([0, 1, 2, 3, 4, 5, 6, 7]);

export function tournamentPoints(session) {
  const primary = miniRewards(session);
  return session.players.map((player, seat) => {
    if (!player) return 0;
    let bonus = 0;
    if (session.id === 2 || session.id === 4) bonus = Math.trunc(player.bonus / 10);
    if (session.id === 7) bonus = player.collected * 20;
    // Title context starts at 1.0. The common tournament result stage multiplies
    // both score fields by 15 before 0x45c732 adds them to the running total.
    return (primary[seat] + bonus) * 15;
  });
}
