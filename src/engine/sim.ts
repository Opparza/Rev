import { playRound } from './engine';
import { mulberry32 } from './rng';
import { SpinMode } from './types';

export interface SimStats {
  rounds: number; rtp: number; hitFreq: number; featureFreq: number; maxWinX: number; avgFreeSpins: number;
  duelFreq: number; cappedCount: number; costPerRound: number; baseRtp: number; bonusRtp: number;
}

export function simulate(rounds: number, mode: SpinMode = 'base', seed = 12345): SimStats {
  const rng = mulberry32(seed);
  let baseWin = 0, cost = 0, win = 0, hits = 0, feat = 0, max = 0, fsTotal = 0, duels = 0, capped = 0;
  for (let i = 0; i < rounds; i++) {
    const r = playRound(rng, mode);
    cost += r.cost; win += r.totalWin; baseWin += r.spins[0].win;
    if (r.totalWin > 0) hits++;
    if (r.freeSpinsPlayed > 0) { feat++; fsTotal += r.freeSpinsPlayed; }
    if (r.totalWin > max) max = r.totalWin;
    if (r.spins.some(s => s.duel)) duels++;
    if (r.spins.some(s => s.capped)) capped++;
  }
  return {
    rounds, rtp: win / cost, hitFreq: hits / rounds, featureFreq: feat / rounds, maxWinX: max,
    avgFreeSpins: feat ? fsTotal / feat : 0, duelFreq: duels / rounds, cappedCount: capped,
    costPerRound: cost / rounds, baseRtp: baseWin / cost, bonusRtp: (win - baseWin) / cost,
  };
}
