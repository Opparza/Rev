import { Force, SYM } from './types';

const fill = (s: number) => Array.from({ length: 6 }, () => [s, s, s, s]);
/** Dead filler: each reel is one low symbol, adjacent reels differ, so no line can pay. */
const mixedLow = (): number[][] => Array.from({ length: 6 }, (_, r) => Array(4).fill(r % 4));

/** Named forced outcomes for the test environment. */
export const PRESETS: Record<string, { label: string; force: Force }> = {
  smallWin: { label: 'Small win (3x Sheriff on row 2)', force: { noShots: true, grid: (() => { const g = mixedLow(); for (let r = 0; r < 3; r++) g[r][1] = SYM.H2; g[3][1] = SYM.L1; g[4][1] = SYM.L4; g[5][1] = SYM.L3; return g; })() } },
  bigWin: { label: 'Big win (6x Outlaw row 1)', force: { noShots: true, grid: (() => { const g = mixedLow(); for (let r = 0; r < 6; r++) g[r][0] = SYM.H1; return g; })() } },
  fullScreen: { label: 'Full screen Outlaw', force: { noShots: true, grid: fill(SYM.H1) } },
  scatter3: { label: '3 scatters → free spins', force: { noShots: true, scatters: 3 } },
  scatter5: { label: '5 scatters → free spins', force: { noShots: true, scatters: 5 } },
  shotsPosters: { label: 'Shots: posters on reels 1,2,5,6', force: { shots: [{ reel: 0 }, { reel: 1 }, { reel: 4 }, { reel: 5 }] } },
  duelLeft: { label: 'Duel: left wins (doors 5x/10x)', force: { noShots: true, doors: [5, 10], duelOutcome: 'left' } },
  duelRight: { label: 'Duel: right wins (doors 5x/10x)', force: { noShots: true, doors: [5, 10], duelOutcome: 'right' } },
  duelBoth: { label: 'Duel: both die → 2x3 wild', force: { noShots: true, doors: [5, 10], duelOutcome: 'both' } },
  doorStack: { label: 'Shots: door multiplier chain (reel 3 x3)', force: { shots: [{ reel: 2 }, { reel: 2 }, { reel: 2 }] } },
  duelWinning: { label: 'Duel + winning line (x multiplier)', force: { noShots: true, doors: [20, 50], duelOutcome: 'right', grid: (() => { const g = mixedLow(); for (let r = 0; r < 5; r++) g[r][2] = SYM.H3; g[5][2] = SYM.L1; return g; })() } },
  noWin: { label: 'Dead spin', force: { noShots: true, grid: mixedLow() } },
};
