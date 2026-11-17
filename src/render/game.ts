import { Application, Container, Graphics, Text } from 'pixi.js';
import { gsap } from 'gsap';
import { PAYLINES, SYMBOL_WEIGHTS } from '../engine/config';
import { playRound } from '../engine/engine';
import { mulberry32, Rng } from '../engine/rng';
import { BUY_COST } from '../engine/config';
import { Force, REELS, ROWS, RoundResult, Shot, SpinMode, SpinResult, SYM } from '../engine/types';
import { CELL, GAP, makeSymbol, STEP } from './symbols';

export const DESIGN_W = 1000;
export const DESIGN_H = 660;
const GRID_X = (DESIGN_W - (REELS * STEP - GAP)) / 2;
const GRID_Y = 170;
const GRID_W = REELS * STEP - GAP;
const GRID_H = ROWS * STEP - GAP;

const sleep = (s: number) => new Promise<void>(res => gsap.delayedCall(s, res));
const tween = (target: object, vars: gsap.TweenVars) =>
  new Promise<void>(res => { gsap.to(target, { ...vars, onComplete: () => res() }); });

export interface GameEvents { onChange(): void; onLog(msg: string): void }

export class Game {
  readonly app: Application;
  readonly root = new Container();
  readonly reelLayer = new Container();
  readonly fxLayer = new Container();
  readonly badgeLayer = new Container();
  readonly reels: Container[] = [];
  readonly strips: Container[] = [];
  cells: Container[][] = [];
  grid: number[][] = [];
  rng: Rng;
  balance = 10000;
  bet = 10;
  lastWin = 0;
  roundWin = 0;
  busy = false;
  instant = false;
  chargeForced = false;
  lastRound: RoundResult | null = null;
  roundsPlayed = 0;
  ev: GameEvents;

  private doorBadges: Container[] = [];
  private doorTexts: Text[] = [];
  private posterBadges: Text[] = [];
  private winText!: Text;
  private infoText!: Text;
  private banner!: Text;

  constructor(app: Application, ev: GameEvents, seed = Date.now() >>> 0) {
    this.app = app;
    this.ev = ev;
    this.rng = mulberry32(seed);
    app.stage.addChild(this.root);
    this.buildScene();
    this.fitToScreen();
    window.addEventListener('resize', () => this.fitToScreen());
    // initial grid, no wilds
    this.grid = Array.from({ length: REELS }, () => Array.from({ length: ROWS }, () => this.randomSymbol()));
    this.drawStatic(this.grid);
  }

  reseed(seed: number) { this.rng = mulberry32(seed); }

  private randomSymbol(): number {
    const ids = Object.keys(SYMBOL_WEIGHTS).map(Number).filter(i => i !== SYM.SCATTER);
    return ids[Math.floor(Math.random() * ids.length)];
  }

  private fitToScreen() {
    const w = this.app.renderer.width / this.app.renderer.resolution;
    const h = this.app.renderer.height / this.app.renderer.resolution;
    const s = Math.min(w / DESIGN_W, (h - 56) / DESIGN_H);
    this.root.scale.set(s);
    this.root.position.set((w - DESIGN_W * s) / 2, 6);
  }

  private buildScene() {
    const r = this.root;
    const frame = new Graphics().roundRect(GRID_X - 16, GRID_Y - 16, GRID_W + 32, GRID_H + 32, 18).fill(0x1d130b).stroke({ width: 4, color: 0x8a5a2b });
    r.addChild(frame);
    r.addChild(this.reelLayer);
    const mask = new Graphics().rect(GRID_X - 10, GRID_Y - 10, GRID_W + 20, GRID_H + 20).fill(0xffffff);
    r.addChild(mask);
    this.reelLayer.mask = mask;
    for (let i = 0; i < REELS; i++) {
      const reel = new Container();
      reel.position.set(GRID_X + i * STEP, GRID_Y);
      const strip = new Container();
      reel.addChild(strip);
      this.reelLayer.addChild(reel);
      this.reels.push(reel);
      this.strips.push(strip);
    }
    r.addChild(this.badgeLayer);
    r.addChild(this.fxLayer);

    const title = new Text({ text: 'DEADEYE — experimental prototype', style: { fontFamily: 'system-ui', fontSize: 24, fontWeight: '800', fill: 0xd4a24c, letterSpacing: 2 } });
    title.anchor.set(0.5, 0); title.position.set(DESIGN_W / 2, 8);
    r.addChild(title);
    const sub = new Text({ text: 'Original placeholder art • simulated outcomes only • not real-money', style: { fontFamily: 'system-ui', fontSize: 12, fill: 0x9a8566 } });
    sub.anchor.set(0.5, 0); sub.position.set(DESIGN_W / 2, 40);
    r.addChild(sub);

    // reel badges: posters (reels 0,1,4,5) / doors (reels 2,3) above the grid
    for (let i = 0; i < REELS; i++) {
      const x = GRID_X + i * STEP + CELL / 2;
      if (i === 2 || i === 3) {
        const door = new Container();
        const g = new Graphics().roundRect(-48, -30, 96, 60, 10).fill(0x2a1a0c).stroke({ width: 3, color: 0x8a5a2b });
        const t = new Text({ text: 'SALOON', style: { fontFamily: 'system-ui', fontSize: 13, fontWeight: '800', fill: 0x8a7455 } });
        t.anchor.set(0.5);
        door.addChild(g, t);
        door.position.set(x, 118);
        this.badgeLayer.addChild(door);
        this.doorBadges.push(door);
        this.doorTexts.push(t);
      } else {
        const t = new Text({ text: '', style: { fontFamily: 'system-ui', fontSize: 14, fontWeight: '800', fill: 0xffd24d } });
        t.anchor.set(0.5); t.position.set(x, 118);
        this.badgeLayer.addChild(t);
        this.posterBadges[i] = t;
      }
    }

    this.winText = new Text({ text: '', style: { fontFamily: 'system-ui', fontSize: 30, fontWeight: '800', fill: 0xffe08a, stroke: { color: 0x000000, width: 5 } } });
    this.winText.anchor.set(0.5); this.winText.position.set(DESIGN_W / 2, GRID_Y + GRID_H + 52);
    r.addChild(this.winText);
    this.infoText = new Text({ text: '', style: { fontFamily: 'system-ui', fontSize: 16, fill: 0xd9c7a6 } });
    this.infoText.anchor.set(0.5); this.infoText.position.set(DESIGN_W / 2, 76);
    r.addChild(this.infoText);
    this.banner = new Text({ text: '', style: { fontFamily: 'system-ui', fontSize: 64, fontWeight: '900', fill: 0xffd24d, stroke: { color: 0x3a1a00, width: 8 }, align: 'center' } });
    this.banner.anchor.set(0.5); this.banner.position.set(DESIGN_W / 2, GRID_Y + GRID_H / 2); this.banner.alpha = 0; this.banner.zIndex = 99;
    this.fxLayer.addChild(this.banner);
  }

  // ---------- drawing ----------
  private fillStrip(reel: number, symbols: number[], offsetCells = 0) {
    const strip = this.strips[reel];
    for (const c of strip.removeChildren()) c.destroy({ children: true });
    const col: Container[] = [];
    symbols.forEach((id, i) => {
      const s = makeSymbol(id);
      s.position.x += 0;
      s.y += (i + offsetCells) * STEP;
      strip.addChild(s);
      col.push(s);
    });
    return col;
  }

  drawStatic(grid: number[][]) {
    this.cells = grid.map((col, r) => {
      this.strips[r].y = 0;
      return this.fillStrip(r, col);
    });
  }

  private setDoor(i: 0 | 1, value: number, pop = false) {
    const t = this.doorTexts[i];
    t.text = value ? `x${value}` : 'SALOON';
    t.style.fill = value ? 0xffd24d : 0x8a7455;
    t.style.fontSize = value ? 28 : 13;
    if (pop) gsap.fromTo(this.doorBadges[i].scale, { x: 1.5, y: 1.5 }, { x: 1, y: 1, duration: 0.35, ease: 'back.out(2)' });
  }
  private setPoster(reel: number, h: number, pop = false) {
    const t = this.posterBadges[reel];
    if (!t) return;
    t.text = h ? `POSTER ${'▮'.repeat(h)}` : '';
    if (pop) gsap.fromTo(t.scale, { x: 1.6, y: 1.6 }, { x: 1, y: 1, duration: 0.3, ease: 'back.out(2)' });
  }
  syncBadges(posters: number[], doors: [number, number]) {
    for (const r of [0, 1, 4, 5]) this.setPoster(r, posters[r]);
    this.setDoor(0, doors[0]); this.setDoor(1, doors[1]);
  }

  // ---------- animation primitives ----------
  async showBanner(text: string, hold = 1.0, color = 0xffd24d) {
    this.banner.text = text; this.banner.style.fill = color;
    this.banner.alpha = 0; this.banner.scale.set(0.4);
    await Promise.all([tween(this.banner, { alpha: 1, duration: 0.25 }), tween(this.banner.scale, { x: 1, y: 1, duration: 0.35, ease: 'back.out(2)' })]);
    await sleep(hold);
    await tween(this.banner, { alpha: 0, duration: 0.3 });
  }

  /** Animate a crosshair + muzzle flash at a reel, then apply visuals for the shot's effect. */
  async playShot(shot: Shot) {
    const x = shot.reel < 0 ? DESIGN_W - 90 : GRID_X + shot.reel * STEP + CELL / 2;
    const y = shot.reel < 0 ? 40 : GRID_Y + GRID_H / 2;
    const ch = new Graphics().circle(0, 0, 26).stroke({ width: 4, color: 0xff3b3b }).moveTo(-36, 0).lineTo(36, 0).moveTo(0, -36).lineTo(0, 36).stroke({ width: 3, color: 0xff3b3b });
    ch.position.set(DESIGN_W / 2, -40); ch.alpha = 0;
    this.fxLayer.addChild(ch);
    await Promise.all([tween(ch, { x, y, alpha: 1, duration: 0.28, ease: 'power2.out' })]);
    const flash = new Graphics().circle(0, 0, 30).fill({ color: 0xffffff, alpha: 0.9 });
    flash.position.set(x, y); this.fxLayer.addChild(flash);
    gsap.to(flash.scale, { x: 3, y: 3, duration: 0.25 });
    gsap.to(flash, { alpha: 0, duration: 0.25, onComplete: () => flash.destroy() });
    gsap.fromTo(ch.scale, { x: 1.4, y: 1.4 }, { x: 1, y: 1, duration: 0.2 });
    if (shot.effect === 'poster') this.setPoster(shot.reel, shot.value, true);
    else if (shot.effect === 'door-new' || shot.effect === 'door-double') this.setDoor(shot.reel === 2 ? 0 : 1, shot.value, true);
    else this.infoText.text = '+1 FREE SPIN (spin counter hit)';
    await sleep(0.12);
    await tween(ch, { alpha: 0, duration: 0.15 });
    ch.destroy();
  }

  private async spinReels(grid: number[][], fast: boolean) {
    const fill = 10;
    const proms: Promise<void>[] = [];
    for (let r = 0; r < REELS; r++) {
      const old = this.grid[r];
      // strip order top→bottom: NEW, FILLER..., OLD ; scroll downward
      const filler = Array.from({ length: fill }, () => this.randomSymbol());
      this.cells[r] = this.fillStrip(r, [...grid[r], ...filler, ...old]).slice(0, ROWS);
      const total = (ROWS + fill) * STEP;
      this.strips[r].y = -total;
      proms.push(tween(this.strips[r], { y: 0, duration: (fast ? 0.35 : 0.8) + r * (fast ? 0.05 : 0.14), ease: 'back.out(0.7)' }));
    }
    await Promise.all(proms);
    this.grid = grid.map(c => [...c]);
    this.drawStatic(this.grid);
  }

  private async pulseCells(cells: [number, number][]) {
    const targets = cells.map(([r, y]) => this.cells[r]?.[y]).filter(Boolean) as Container[];
    await Promise.all(targets.map(t => tween(t.scale, { x: 1.12, y: 1.12, duration: 0.18, yoyo: true, repeat: 1, ease: 'sine.inOut' })));
  }

  private drawLine(line: number): Graphics {
    const g = new Graphics();
    PAYLINES[line].forEach((row, r) => {
      const x = GRID_X + r * STEP + CELL / 2;
      const y = GRID_Y + row * STEP + CELL / 2;
      if (r === 0) g.moveTo(x, y); else g.lineTo(x, y);
    });
    g.stroke({ width: 5, color: 0xffe08a, alpha: 0.9 });
    this.fxLayer.addChild(g);
    return g;
  }

  private async countUp(from: number, to: number) {
    const o = { v: from };
    await tween(o, { v: to, duration: this.instant ? 0 : Math.min(1.2, 0.3 + (to - from) / 40), ease: 'power1.out', onUpdate: () => { this.winText.text = `WIN ${(o.v * this.bet).toFixed(2)}`; } });
    this.winText.text = `WIN ${(to * this.bet).toFixed(2)}`;
  }

  async playDuel(spin: SpinResult) {
    const d = spin.duel!;
    this.infoText.text = `DUEL!  ${d.left}x  vs  ${d.right}x`;
    await Promise.all([0, 1].map(i => tween(this.doorBadges[i].scale, { x: 1.4, y: 1.4, duration: 0.25, yoyo: true, repeat: 3 })));
    const label = d.outcome === 'both' ? 'BOTH FALL!\n2×3 WILD' : d.outcome === 'left' ? `LEFT WINS x${d.left}` : `RIGHT WINS x${d.right}`;
    await this.showBanner(label, 0.7, d.outcome === 'both' ? 0xff7a3b : 0xffd24d);
    this.setDoor(0, spin.doorsAfter[0]); this.setDoor(1, spin.doorsAfter[1]);
  }

  async bigWinFx(win: number) {
    const tier = win >= 100 ? 'MEGA WIN' : win >= 30 ? 'BIG WIN' : win >= 10 ? 'NICE WIN' : '';
    if (tier) await this.showBanner(tier, 0.8);
  }

  async animateWins(spin: SpinResult) {
    if (!spin.lineWins.length) return;
    const all = spin.lineWins.flatMap(w => w.cells);
    await this.pulseCells(all);
    const show = spin.lineWins.slice(0, this.instant ? 0 : 6);
    for (const w of show) {
      const g = this.drawLine(w.line);
      await this.pulseCells(w.cells);
      g.destroy();
    }
  }

  // ---------- spin / round orchestration ----------
  /** Animate one resolved spin. `runningTotal` is x-bet total accumulated before this spin. */
  async animateSpin(spin: SpinResult, runningTotal: number): Promise<number> {
    this.winText.text = this.roundWin ? this.winText.text : '';
    this.syncBadges(spin.isFree ? this.prevPosters : new Array(REELS).fill(0), spin.isFree ? this.prevDoors : [0, 0]);
    const fast = this.instant;
    // reels start spinning, shots land while they spin
    const spinning = this.spinReels(spin.grid, fast);
    if (!fast) await sleep(0.25);
    for (const s of spin.shots) await this.playShot(s);
    await spinning;
    this.syncBadges(spin.posters, spin.doorsBefore);
    if (spin.duel) await this.playDuel(spin);
    await this.animateWins(spin);
    const total = runningTotal + spin.win;
    if (spin.win > 0) {
      const mult = spin.multiplier > 1 ? `  (line wins ${spin.baseWin.toFixed(2)}x × ${spin.multiplier})` : '';
      this.infoText.text = `Spin win ${spin.win.toFixed(2)}x${mult}`;
      await this.countUp(runningTotal, total);
      if (!fast) await this.bigWinFx(spin.win);
    }
    if (spin.capped) this.infoText.text = 'MAX WIN CAP reached (10,000x)';
    this.prevPosters = [...spin.stateAfter.posters];
    this.prevDoors = [...spin.stateAfter.doors] as [number, number];
    if (spin.isFree || spin.freeSpinsAwarded > 0) this.syncBadges(spin.stateAfter.posters, spin.stateAfter.doors);
    return total;
  }
  private prevPosters = new Array(REELS).fill(0);
  private prevDoors: [number, number] = [0, 0];

  async playMode(mode: SpinMode, force?: Force, label = ''): Promise<RoundResult | null> {
    if (this.busy) return null;
    this.busy = true; this.ev.onChange();
    try {
      const forced = !!force && !label.startsWith('buy');
      const cost = forced && !this.chargeForced ? 0 : BUY_COST[mode] * this.bet;
      if (cost > this.balance) { this.infoText.text = 'Insufficient balance'; return null; }
      this.balance -= cost;
      this.winText.text = '';
      this.roundWin = 0;
      const round = playRound(this.rng, mode, force);
      this.lastRound = round;
      this.roundsPlayed++;
      this.prevPosters = new Array(REELS).fill(0);
      this.prevDoors = [0, 0];
      let total = 0;
      this.ev.onLog(`#${this.roundsPlayed} ${label || mode}: cost=${cost.toFixed(2)} spins=${round.spins.length} win=${round.totalWin.toFixed(2)}x`);
      total = await this.animateSpin(round.spins[0], 0);
      if (round.spins.length > 1) {
        if (!this.instant) await this.showBanner(`FREE SPINS\n${round.spins[0].freeSpinsAwarded}`, 1.0, 0xd24dff);
        let remaining = round.spins[0].freeSpinsAwarded;
        for (let i = 1; i < round.spins.length; i++) {
          remaining--;
          this.infoText.text = `FREE SPIN ${i}  •  remaining ${Math.max(0, remaining)}  •  total ${(total * this.bet).toFixed(2)}`;
          const s = round.spins[i];
          total = await this.animateSpin(s, total);
          remaining += s.freeSpinsAwarded;
        }
        if (!this.instant) await this.showBanner(`BONUS TOTAL\n${(round.totalWin * this.bet).toFixed(2)}`, 1.2, 0xd24dff);
      }
      this.roundWin = round.totalWin;
      this.lastWin = round.totalWin * this.bet;
      this.balance += this.lastWin;
      this.winText.text = this.lastWin > 0 ? `WIN ${this.lastWin.toFixed(2)}` : '';
      this.ev.onLog(`   → paid ${this.lastWin.toFixed(2)}; balance ${this.balance.toFixed(2)}`);
      return round;
    } finally {
      this.busy = false; this.ev.onChange();
    }
  }
}
