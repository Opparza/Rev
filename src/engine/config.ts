import { SYM } from './types';

/** Row index per reel for each of the 30 lines. ORIGINAL layouts (real game's line shapes unverified). */
export const PAYLINES: number[][] = [
  [0,0,0,0,0,0],[1,1,1,1,1,1],[2,2,2,2,2,2],[3,3,3,3,3,3],
  [0,1,2,3,2,1],[3,2,1,0,1,2],[0,1,0,1,0,1],[1,0,1,0,1,0],
  [2,3,2,3,2,3],[3,2,3,2,3,2],[1,2,1,2,1,2],[2,1,2,1,2,1],
  [0,0,1,1,2,2],[3,3,2,2,1,1],[1,1,2,2,3,3],[2,2,1,1,0,0],
  [0,1,1,1,1,0],[3,2,2,2,2,3],[1,2,2,2,2,1],[2,1,1,1,1,2],
  [0,0,0,1,2,3],[3,3,3,2,1,0],[1,0,0,0,0,1],[2,3,3,3,3,2],
  [0,1,2,2,1,0],[3,2,1,1,2,3],[1,1,0,0,1,1],[2,2,3,3,2,2],
  [0,2,0,2,0,2],[3,1,3,1,3,1],
];

/** Pays in x TOTAL bet per winning line, indexed [symbol][count-3]. PLACEHOLDER values, not the real game's. */
const PAY_SCALE = 1.13;
const RAW_PAYTABLE: Record<number, number[]> = {
  [SYM.L4]: [0.03, 0.08, 0.2, 0.5],
  [SYM.L3]: [0.04, 0.1, 0.25, 0.6],
  [SYM.L2]: [0.05, 0.12, 0.3, 0.8],
  [SYM.L1]: [0.06, 0.15, 0.4, 1],
  [SYM.H4]: [0.1, 0.25, 0.8, 2],
  [SYM.H3]: [0.15, 0.4, 1.2, 3],
  [SYM.H2]: [0.2, 0.6, 2, 5],
  [SYM.H1]: [0.3, 1, 3, 10],
};

export const PAYTABLE: Record<number, number[]> = Object.fromEntries(
  Object.entries(RAW_PAYTABLE).map(([k, v]) => [k, v.map(x => +(x * PAY_SCALE).toFixed(4))]),
);

export const SYMBOL_WEIGHTS: Record<number, number> = {
  [SYM.L4]: 20, [SYM.L3]: 20, [SYM.L2]: 18, [SYM.L1]: 18,
  [SYM.H4]: 8, [SYM.H3]: 6, [SYM.H2]: 5, [SYM.H1]: 4,
  [SYM.SCATTER]: 2.4,
};

export const SHOT_COUNT_BASE = { values: [0, 1, 2, 3, 4], weights: [55, 25, 12, 6, 2] };
export const SHOT_COUNT_FREE = { values: [0, 1, 2, 3], weights: [38, 34, 20, 8] };
export const DOOR_VALUES = { values: [2, 3, 4, 5, 10, 20, 50, 100], weights: [34, 24, 16, 10, 8, 4, 3, 1] };
export const DOOR_CAP = 100;
export const POSTER_MAX = 2; // tuning cap; real game's cap unverified
export const COUNTER_HIT_CHANCE = 0.12; // free spins only
export const DUEL_OUTCOME = { values: ['left', 'right', 'both'] as const, weights: [42, 42, 16] };

export const FREE_SPINS_AWARD: Record<number, number> = { 3: 8, 4: 10, 5: 12, 6: 15 };
export const RETRIGGER_SPINS = 5;
export const MAX_FREE_SPINS = 100;

/** Bonus buy cost (x bet). Costs per public reviews; effects are my approximation. */
export const BUY_COST: Record<string, number> = { base: 1, hunt: 3, shots: 10, duel: 25, freespins: 100, super: 500 };
export const HUNT_SCATTER_MULT = 1.65;
export const SHOTS_BUY_COUNT = 6;
export const DUEL_BUY_DOOR_DRAWS = 14; // best-of-N door draw for a bought duel
