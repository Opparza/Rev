import { simulate } from '../src/engine/sim';
const n = Number(process.argv[2] ?? 200000);
for (const m of ['base', 'hunt', 'shots', 'duel', 'freespins', 'super'] as const) {
  const k = m === 'base' || m === 'hunt' || m === 'shots' ? n : Math.max(2000, Math.floor(n / 20));
  const s = simulate(k, m);
  console.log(m.padEnd(10), `rounds=${k}`, `RTP=${(s.rtp * 100).toFixed(2)}%`, `(base ${(s.baseRtp * 100).toFixed(1)} + bonus ${(s.bonusRtp * 100).toFixed(1)})`, `hit=${(s.hitFreq * 100).toFixed(1)}%`,
    `feature=${(s.featureFreq * 100).toFixed(2)}%`, `duel=${(s.duelFreq * 100).toFixed(2)}%`, `avgFS=${s.avgFreeSpins.toFixed(1)}`, `max=${s.maxWinX.toFixed(0)}x`, `capped=${s.cappedCount}`);
}
