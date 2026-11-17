import {
  BUY_COST, COUNTER_HIT_CHANCE, DOOR_CAP, DOOR_VALUES, DUEL_OUTCOME, FREE_SPINS_AWARD, HUNT_SCATTER_MULT, SHOTS_BUY_COUNT, DUEL_BUY_DOOR_DRAWS,
  MAX_FREE_SPINS, PAYLINES, PAYTABLE, POSTER_MAX, RETRIGGER_SPINS, SHOT_COUNT_BASE, SHOT_COUNT_FREE, SYMBOL_WEIGHTS,
} from './config';
import { pickWeighted, randInt, Rng } from './rng';
import {
  DuelOutcome, Force, FreeState, LineWin, MAX_WIN_X, REELS, ROWS, RoundResult, Shot, SpinMode, SpinResult, SYM,
} from './types';

export const freshState = (): FreeState => ({ posters: [0, 0, 0, 0, 0, 0], doors: [0, 0] });
const cloneState = (s: FreeState): FreeState => ({ posters: [...s.posters], doors: [s.doors[0], s.doors[1]] });
const POSTER_REELS = new Set([0, 1, 4, 5]);

function drawSymbol(rng: Rng, scatterMult: number, allowScatter: boolean): number {
  const ids: number[] = [];
  const ws: number[] = [];
  for (const [k, w] of Object.entries(SYMBOL_WEIGHTS)) {
    const id = Number(k);
    if (id === SYM.SCATTER) {
      if (!allowScatter) continue;
      ids.push(id); ws.push(w * scatterMult);
    } else { ids.push(id); ws.push(w); }
  }
  return pickWeighted(rng, ids, ws);
}

function drawGrid(rng: Rng, scatterMult: number): number[][] {
  const g: number[][] = [];
  for (let r = 0; r < REELS; r++) {
    const col: number[] = [];
    let hasScatterInReel = false;
    for (let y = 0; y < ROWS; y++) {
      const s = drawSymbol(rng, scatterMult, !hasScatterInReel); // max one scatter per reel
      if (s === SYM.SCATTER) hasScatterInReel = true;
      col.push(s);
    }
    g.push(col);
  }
  return g;
}

function placeScatters(rng: Rng, grid: number[][], n: number) {
  for (const col of grid) for (let y = 0; y < ROWS; y++) if (col[y] === SYM.SCATTER) col[y] = SYM.L4;
  const reels = [0, 1, 2, 3, 4, 5].sort(() => rng.next() - 0.5).slice(0, Math.min(n, REELS));
  for (const r of reels) grid[r][randInt(rng, ROWS)] = SYM.SCATTER;
}

export function evaluateLines(grid: number[][]): LineWin[] {
  const wins: LineWin[] = [];
  PAYLINES.forEach((line, li) => {
    let paySym = -1;
    let count = 0;
    for (let r = 0; r < REELS; r++) {
      const s = grid[r][line[r]];
      if (s === SYM.SCATTER) break;
      if (s === SYM.WILD) { count++; continue; }
      if (paySym === -1) paySym = s;
      else if (s !== paySym) break;
      count++;
    }
    if (count < 3) return;
    const sym = paySym === -1 ? SYM.H1 : paySym; // all-wild line pays as top symbol
    const table = PAYTABLE[sym];
    if (!table) return;
    const pay = table[Math.min(count, 6) - 3];
    wins.push({ line: li, symbol: sym, count, pay, cells: Array.from({ length: count }, (_, r) => [r, line[r]] as [number, number]) });
  });
  return wins;
}

export interface SpinOpts { isFree: boolean; state: FreeState; mode?: SpinMode; force?: Force }

/** Resolve a single spin. Pure given the rng. */
export function resolveSpin(rng: Rng, opts: SpinOpts): SpinResult {
  const { isFree, force } = opts;
  const state = cloneState(opts.state);
  const mode = opts.mode ?? 'base';
  const scatterMult = !isFree && mode === 'hunt' ? HUNT_SCATTER_MULT : 1;

  // 1. base grid
  const grid = force?.grid ? force.grid.map(c => [...c]) : drawGrid(rng, scatterMult);
  if (force?.scatters !== undefined) placeScatters(rng, grid, force.scatters);
  if (force?.posters) state.posters = [...force.posters];
  if (force?.doors) state.doors = [...force.doors] as [number, number];

  // 2. Shots Fired
  const shots: Shot[] = [];
  let counterHits = 0;
  let planned: Array<{ reel: number }>;
  if (force?.shots) planned = force.shots;
  else if (force?.noShots) planned = [];
  else {
    let n = isFree
      ? pickWeighted(rng, SHOT_COUNT_FREE.values, SHOT_COUNT_FREE.weights)
      : pickWeighted(rng, SHOT_COUNT_BASE.values, SHOT_COUNT_BASE.weights);
    if (!isFree && mode === 'shots') n = SHOTS_BUY_COUNT;
    planned = Array.from({ length: n }, () => ({
      reel: isFree && rng.next() < COUNTER_HIT_CHANCE ? -1 : randInt(rng, REELS),
    }));
  }
  for (const p of planned) {
    if (p.reel === -1) { shots.push({ reel: -1, effect: 'counter', value: 1 }); counterHits++; continue; }
    if (POSTER_REELS.has(p.reel)) {
      state.posters[p.reel] = Math.min(POSTER_MAX, state.posters[p.reel] + 1);
      shots.push({ reel: p.reel, effect: 'poster', value: state.posters[p.reel] });
    } else {
      const di = p.reel === 2 ? 0 : 1;
      if (state.doors[di] === 0) {
        state.doors[di] = pickWeighted(rng, DOOR_VALUES.values, DOOR_VALUES.weights);
        shots.push({ reel: p.reel, effect: 'door-new', value: state.doors[di] });
      } else {
        state.doors[di] = Math.min(DOOR_CAP, state.doors[di] * 2);
        shots.push({ reel: p.reel, effect: 'door-double', value: state.doors[di] });
      }
    }
  }
  // Bought-duel mode guarantees both doors on the base spin.
  if (!isFree && mode === 'duel') for (const di of [0, 1] as const) if (!state.doors[di]) {
    let best = 0;
    for (let k = 0; k < DUEL_BUY_DOOR_DRAWS; k++) best = Math.max(best, pickWeighted(rng, DOOR_VALUES.values, DOOR_VALUES.weights));
    state.doors[di] = best;
  }
  const doorsBefore: [number, number] = [state.doors[0], state.doors[1]];

  // 3. wild posters: contiguous block of `h` wild cells on the reel at a random anchor
  const wild: boolean[][] = Array.from({ length: REELS }, () => Array(ROWS).fill(false));
  const posterRow = [0, 0, 0, 0, 0, 0];
  for (const r of POSTER_REELS) {
    const h = state.posters[r];
    if (!h) continue;
    const anchor = randInt(rng, ROWS - h + 1);
    posterRow[r] = anchor;
    for (let y = anchor; y < anchor + h; y++) { wild[r][y] = true; grid[r][y] = SYM.WILD; }
  }

  // 4. Duel / door multiplier
  let multiplier = 1;
  let duel: SpinResult['duel'];
  const doorsAfter: [number, number] = [doorsBefore[0], doorsBefore[1]];
  const [dl, dr] = doorsBefore;
  if (dl && dr) {
    const outcome: DuelOutcome = force?.duelOutcome ?? pickWeighted(rng, DUEL_OUTCOME.values, DUEL_OUTCOME.weights);
    if (outcome === 'left') { multiplier = dl; doorsAfter[1] = 0; }
    else if (outcome === 'right') { multiplier = dr; doorsAfter[0] = 0; }
    else {
      multiplier = dl + dr; doorsAfter[0] = 0; doorsAfter[1] = 0;
      const top = randInt(rng, ROWS - 3 + 1); // 2 wide x 3 tall wild block on reels 3-4
      for (const r of [2, 3]) for (let y = top; y < top + 3; y++) { wild[r][y] = true; grid[r][y] = SYM.WILD; }
    }
    duel = { left: dl, right: dr, outcome, multiplier };
  } else if (dl || dr) {
    multiplier = dl || dr; // single door: multiplier applies directly (approximation)
  }

  // 5. evaluate
  const lineWins = evaluateLines(grid);
  const baseWin = lineWins.reduce((a, w) => a + w.pay, 0);
  let win = baseWin * multiplier;
  let capped = false;
  if (win > MAX_WIN_X) { win = MAX_WIN_X; capped = true; }

  // 6. scatters
  const scatterCount = grid.reduce((a, c) => a + c.filter(s => s === SYM.SCATTER).length, 0);
  let freeSpinsAwarded = 0;
  if (!isFree && scatterCount >= 3) freeSpinsAwarded = FREE_SPINS_AWARD[Math.min(6, scatterCount)];
  if (isFree && scatterCount >= 3) freeSpinsAwarded = RETRIGGER_SPINS;
  freeSpinsAwarded += counterHits;

  // Persistence: posters + surviving doors carry through free spins only.
  const stateAfter: FreeState = isFree || freeSpinsAwarded > 0 || mode === 'freespins' || mode === 'super'
    ? { posters: [...state.posters], doors: [doorsAfter[0], doorsAfter[1]] }
    : freshState();

  return {
    isFree, grid, wild, shots, posters: [...state.posters], posterRow, doorsBefore, duel, doorsAfter,
    lineWins, baseWin, multiplier, win, capped, scatterCount, freeSpinsAwarded, counterHits, stateAfter,
  };
}

/** Play a full round: a base spin (or bought entry) and any resulting free spins. */
export function playRound(rng: Rng, mode: SpinMode = 'base', force?: Force): RoundResult {
  const spins: SpinResult[] = [];
  let state = freshState();
  let f = force;
  if (mode === 'freespins' || mode === 'super') {
    f = { ...force, scatters: force?.scatters ?? (mode === 'super' ? 3 : 4) };
    if (mode === 'super') f = { ...f, posters: [2, 2, 0, 0, 2, 2], doors: [20, 20] };
  }
  const first = resolveSpin(rng, { isFree: false, state, mode, force: f });
  spins.push(first);
  let remaining = first.freeSpinsAwarded;
  state = first.stateAfter;
  let played = 0;
  while (remaining > 0 && played < MAX_FREE_SPINS) {
    remaining--; played++;
    const s = resolveSpin(rng, { isFree: true, state });
    spins.push(s);
    state = s.stateAfter;
    remaining += s.freeSpinsAwarded;
  }
  const totalWin = Math.min(MAX_WIN_X, spins.reduce((a, s) => a + s.win, 0));
  return { mode, cost: BUY_COST[mode], spins, totalWin, freeSpinsPlayed: played };
}
