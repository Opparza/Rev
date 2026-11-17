import { describe, expect, it } from 'vitest';
import { evaluateLines, playRound, resolveSpin, freshState } from '../src/engine/engine';
import { PRESETS } from '../src/engine/presets';
import { PAYLINES } from '../src/engine/config';
import { mulberry32 } from '../src/engine/rng';
import { MAX_WIN_X, SYM } from '../src/engine/types';

const rng = (s = 1) => mulberry32(s);
const blank = () => Array.from({ length: 6 }, () => [SYM.L4, SYM.L3, SYM.L2, SYM.L1]);

describe('paylines', () => {
  it('has 30 lines, each 6 reels with rows 0-3', () => {
    expect(PAYLINES).toHaveLength(30);
    for (const l of PAYLINES) { expect(l).toHaveLength(6); for (const r of l) expect(r >= 0 && r <= 3).toBe(true); }
  });
});

describe('evaluateLines', () => {
  it('pays 3 of a kind left to right on line 2 only', () => {
    const g = blank();
    for (let r = 0; r < 3; r++) g[r][1] = SYM.H2;
    g[3][1] = SYM.L4;
    const w = evaluateLines(g).filter(x => x.symbol === SYM.H2);
    expect(w.some(x => x.line === 1 && x.count === 3)).toBe(true);
  });
  it('does not pay 2 of a kind or right-anchored runs', () => {
    const g = blank();
    g[0][1] = SYM.H1; g[1][1] = SYM.H1;
    g[3][1] = SYM.H1; g[4][1] = SYM.H1; g[5][1] = SYM.H1;
    expect(evaluateLines(g).filter(x => x.symbol === SYM.H1 && x.line === 1)).toHaveLength(0);
  });
  it('wild substitutes and extends runs', () => {
    const g = blank();
    g[0][1] = SYM.H1; g[1][1] = SYM.WILD; g[2][1] = SYM.WILD; g[3][1] = SYM.H1; g[4][1] = SYM.L4;
    const w = evaluateLines(g).find(x => x.line === 1 && x.symbol === SYM.H1)!;
    expect(w.count).toBe(4);
  });
  it('wild does not substitute for scatter and scatter stops a line', () => {
    const g = blank();
    g[0][1] = SYM.H1; g[1][1] = SYM.H1; g[2][1] = SYM.SCATTER; g[3][1] = SYM.H1;
    expect(evaluateLines(g).filter(x => x.line === 1 && x.symbol === SYM.H1)).toHaveLength(0);
  });
});

describe('engine behaviour', () => {
  it('is deterministic for a seed', () => {
    const a = playRound(rng(7)); const b = playRound(rng(7));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
  it('forced presets produce the described outcome', () => {
    const r = (k: string) => resolveSpin(rng(3), { isFree: false, state: freshState(), force: PRESETS[k].force });
    expect(r('noWin').win).toBe(0);
    expect(r('smallWin').win).toBeGreaterThan(0);
    expect(r('bigWin').lineWins.some(w => w.count === 6 && w.symbol === SYM.H1)).toBe(true);
    expect(r('scatter3').freeSpinsAwarded).toBe(8);
    expect(r('scatter5').freeSpinsAwarded).toBe(12);
    const dl = r('duelLeft'); expect(dl.duel?.outcome).toBe('left'); expect(dl.multiplier).toBe(5);
    expect(dl.doorsAfter).toEqual([5, 0]);
    const dr = r('duelRight'); expect(dr.multiplier).toBe(10); expect(dr.doorsAfter).toEqual([0, 10]);
    const db = r('duelBoth'); expect(db.multiplier).toBe(15);
    for (const reel of [2, 3]) for (let y = 0; y < 3; y++) expect(db.wild[reel][y] || db.wild[reel][y + 1]).toBe(true);
    expect(db.doorsAfter).toEqual([0, 0]);
  });
  it('multiplier applies to win', () => {
    const s = resolveSpin(rng(3), { isFree: false, state: freshState(), force: PRESETS.duelWinning.force });
    expect(s.win).toBeCloseTo(s.baseWin * 50, 6);
  });
  it('shots on reels 1,2,5,6 add posters; door shots set then double', () => {
    const s = resolveSpin(rng(3), { isFree: false, state: freshState(), force: PRESETS.shotsPosters.force });
    expect(s.shots.every(x => x.effect === 'poster')).toBe(true);
    for (const r of [0, 1, 4, 5]) expect(s.wild[r].filter(Boolean).length).toBe(1);
    const d = resolveSpin(rng(3), { isFree: false, state: freshState(), force: PRESETS.doorStack.force });
    expect(d.shots.map(x => x.effect)).toEqual(['door-new', 'door-double', 'door-double']);
    expect(d.doorsBefore[0]).toBe(d.shots[0].value * 4);
  });
  it('free spins run to completion and persist state', () => {
    const r = playRound(rng(5), 'freespins');
    expect(r.spins.length).toBeGreaterThan(8);
    expect(r.spins[0].freeSpinsAwarded).toBeGreaterThanOrEqual(10);
    expect(r.spins.slice(1).every(s => s.isFree)).toBe(true);
  });
  it('never exceeds the win cap and win >= 0 over many rounds', () => {
    const g = rng(99);
    for (let i = 0; i < 3000; i++) { const r = playRound(g, i % 2 ? 'super' : 'base'); expect(r.totalWin).toBeLessThanOrEqual(MAX_WIN_X); expect(r.totalWin).toBeGreaterThanOrEqual(0); }
  });
  it('grid invariants: 6x4, at most one scatter per reel in natural draws', () => {
    const g = rng(11);
    for (let i = 0; i < 500; i++) {
      const s = resolveSpin(g, { isFree: false, state: freshState() });
      expect(s.grid).toHaveLength(6);
      for (const c of s.grid) { expect(c).toHaveLength(4); expect(c.filter(x => x === SYM.SCATTER).length).toBeLessThanOrEqual(1); }
    }
  });
});
