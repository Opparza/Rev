import { Application } from 'pixi.js';
import { Game } from './render/game';
import { log, mountDebug, mountHud } from './ui/debug';

async function boot() {
  const stage = document.getElementById('stage')!;
  const app = new Application();
  await app.init({ resizeTo: stage, background: 0x120d09, antialias: true, resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true });
  stage.insertBefore(app.canvas, stage.firstChild);
  const game = new Game(app, { onChange() {}, onLog: log });
  mountHud(game, document.getElementById('hud')!);
  mountDebug(game, document.getElementById('debug')!);
  (window as unknown as { __deadeye: unknown }).__deadeye = { game };
}
boot().catch(e => { console.error(e); document.body.prepend(Object.assign(document.createElement('pre'), { textContent: 'Boot failed: ' + e })); });
