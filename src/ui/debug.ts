import { gsap } from 'gsap';
import { Game } from '../render/game';
import { BUY_COST } from '../engine/config';
import { PRESETS } from '../engine/presets';
import { simulate } from '../engine/sim';
import { Force, SpinMode, SpinResult } from '../engine/types';

const h = (html: string) => { const d = document.createElement('div'); d.innerHTML = html; return d; };

export function mountHud(game: Game, el: HTMLElement) {
  el.innerHTML = `
    <span>Balance: <b id="bal"></b></span>
    <span>Bet: <select id="bet"><option>1</option><option selected>10</option><option>50</option><option>100</option></select></span>
    <button id="spin">SPIN</button>
    <label><input type="checkbox" id="auto"> Auto</label>
    <span>Last win: <b id="lw"></b></span>`;
  const bal = el.querySelector<HTMLElement>('#bal')!;
  const lw = el.querySelector<HTMLElement>('#lw')!;
  const spin = el.querySelector<HTMLButtonElement>('#spin')!;
  const auto = el.querySelector<HTMLInputElement>('#auto')!;
  const bet = el.querySelector<HTMLSelectElement>('#bet')!;
  bet.onchange = () => { game.bet = Number(bet.value); };
  const refresh = () => {
    bal.textContent = game.balance.toFixed(2);
    lw.textContent = game.lastWin.toFixed(2);
    spin.disabled = game.busy;
    document.querySelectorAll<HTMLButtonElement>('#debug button').forEach(b => { b.disabled = game.busy && !b.dataset.always; });
  };
  const loop = async () => {
    await game.playMode('base');
    if (auto.checked) setTimeout(loop, 150);
  };
  spin.onclick = () => { void game.playMode('base'); };
  auto.onchange = () => { if (auto.checked && !game.busy) void loop(); };
  game.ev.onChange = refresh;
  // keep auto going after each round
  const origChange = game.ev.onChange;
  game.ev.onChange = () => { origChange(); if (auto.checked && !game.busy) setTimeout(() => { if (auto.checked && !game.busy) void game.playMode('base'); }, 200); };
  refresh();
  window.addEventListener('keydown', e => { if (e.code === 'Space' && !game.busy && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'SELECT') { e.preventDefault(); void game.playMode('base'); } });
}

export function mountDebug(game: Game, el: HTMLElement) {
  el.innerHTML = '<h2 style="margin:0 0 4px;font-size:15px">Test environment</h2><div style="color:#9a8566;font-size:11px">Forced rounds are free unless "forced costs bet" is on.</div>';
  const section = (title: string) => { const s = h(`<h3>${title}</h3><div class="sec"></div>`); el.append(...Array.from(s.childNodes)); return el.lastElementChild as HTMLElement; };
  const btn = (parent: HTMLElement, label: string, fn: () => void, always = false) => {
    const b = document.createElement('button'); b.textContent = label; if (always) b.dataset.always = '1'; b.onclick = fn; parent.append(b); return b;
  };

  // settings
  let s = section('Settings');
  s.append(h(`<label>Speed <select id="speed"><option value="1">1x</option><option value="2">2x</option><option value="4">4x</option></select></label>
    <label><input type="checkbox" id="instant"> Instant (skip anim)</label><br>
    <label><input type="checkbox" id="chg"> Forced costs bet</label><br>
    <label>Seed <input id="seed" size="10" value="12345"></label>`));
  (el.querySelector('#speed') as HTMLSelectElement).onchange = e => gsap.globalTimeline.timeScale(Number((e.target as HTMLSelectElement).value));
  (el.querySelector('#instant') as HTMLInputElement).onchange = e => { game.instant = (e.target as HTMLInputElement).checked; gsap.globalTimeline.timeScale(game.instant ? 8 : 1); };
  (el.querySelector('#chg') as HTMLInputElement).onchange = e => { game.chargeForced = (e.target as HTMLInputElement).checked; };
  btn(s, 'Apply seed', () => game.reseed(Number((el.querySelector('#seed') as HTMLInputElement).value) >>> 0), true);
  btn(s, 'Reset balance', () => { game.balance = 10000; game.ev.onChange(); }, true);

  // forced outcomes
  s = section('Forced outcomes');
  for (const [k, p] of Object.entries(PRESETS)) btn(s, p.label, () => void game.playMode('base', p.force, `preset:${k}`));

  // custom
  s = section('Custom forced spin');
  s.append(h(`<div>Scatters <input id="c-sc" size="2" value="0"> Doors L <input id="c-dl" size="3" value="0"> R <input id="c-dr" size="3" value="0">
    Duel <select id="c-do"><option value="">random</option><option>left</option><option>right</option><option>both</option></select><br>
    Shot reels (1-6, comma) <input id="c-sh" size="12" placeholder="e.g. 1,3,3,6"><br>
    Posters (6 nums) <input id="c-po" size="12" placeholder="e.g. 2,1,0,0,0,3"></div>`));
  btn(s, 'Play custom', () => {
    const v = (id: string) => (el.querySelector('#' + id) as HTMLInputElement).value.trim();
    const f: Force = {};
    if (Number(v('c-sc'))) f.scatters = Number(v('c-sc'));
    const dl = Number(v('c-dl')), dr = Number(v('c-dr'));
    if (dl || dr) f.doors = [dl, dr];
    if (v('c-do')) f.duelOutcome = v('c-do') as Force['duelOutcome'];
    if (v('c-sh')) f.shots = v('c-sh').split(',').map(x => ({ reel: Number(x) - 1 })).filter(x => x.reel >= 0 && x.reel < 6);
    else f.noShots = true;
    if (v('c-po')) f.posters = v('c-po').split(',').map(Number).slice(0, 6);
    void game.playMode('base', f, 'custom');
  });

  // bonus buys
  s = section('Bonus buy / bonus testing');
  const names: Record<string, string> = { hunt: 'Bonus Hunt', shots: 'Shots Fired', duel: 'Duel', freespins: 'Free Spins', super: 'Super Bonus' };
  for (const m of ['hunt', 'shots', 'duel', 'freespins', 'super']) btn(s, `${names[m]} (${BUY_COST[m]}x)`, () => void game.playMode(m as SpinMode, undefined, `buy:${m}`));

  // animation tests
  s = section('Animation testing');
  const idle = () => !game.busy;
  btn(s, 'Shot → poster r1', () => idle() && void game.playShot({ reel: 0, effect: 'poster', value: 2 }));
  btn(s, 'Shot → door L x10', () => idle() && void game.playShot({ reel: 2, effect: 'door-new', value: 10 }));
  btn(s, 'Shot → door R x20', () => idle() && void game.playShot({ reel: 3, effect: 'door-double', value: 20 }));
  btn(s, 'Shot → spin counter', () => idle() && void game.playShot({ reel: -1, effect: 'counter', value: 1 }));
  btn(s, 'Duel anim', () => idle() && void game.playDuel({ duel: { left: 5, right: 10, outcome: 'right', multiplier: 10 }, doorsAfter: [0, 10] } as unknown as SpinResult));
  btn(s, 'Banner: BIG WIN', () => idle() && void game.bigWinFx(40));
  btn(s, 'Banner: FREE SPINS', () => idle() && void game.showBanner('FREE SPINS\n10', 1, 0xd24dff));
  btn(s, 'Clear badges', () => game.syncBadges([0, 0, 0, 0, 0, 0], [0, 0]));

  // simulation
  s = section('Simulation (engine only)');
  const out = h('<div id="stats"></div>');
  btn(s, 'Simulate 100k base', () => {
    const st = simulate(100000, 'base', Number((el.querySelector('#seed') as HTMLInputElement).value) >>> 0);
    (out.firstElementChild as HTMLElement).textContent =
      `rounds ${st.rounds}\nRTP ${(st.rtp * 100).toFixed(2)}% (base ${(st.baseRtp * 100).toFixed(1)} + bonus ${(st.bonusRtp * 100).toFixed(1)})\nhit freq ${(st.hitFreq * 100).toFixed(1)}%\nfeature freq 1/${(1 / st.featureFreq).toFixed(0)}\nduel freq ${(st.duelFreq * 100).toFixed(2)}%\nmax ${st.maxWinX.toFixed(0)}x`;
  }, true);
  s.append(out);

  // log
  s = section('Log');
  s.append(h('<div id="log"></div>'));
  btn(s, 'Dump last round JSON', () => { const l = document.getElementById('log')!; l.textContent = JSON.stringify(game.lastRound, null, 1).slice(0, 6000); }, true);
}

export function log(msg: string) {
  const l = document.getElementById('log');
  if (!l) return;
  l.textContent = msg + '\n' + (l.textContent ?? '').slice(0, 4000);
}
