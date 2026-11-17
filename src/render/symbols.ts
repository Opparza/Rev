import { Container, Graphics, Text } from 'pixi.js';
import { SYM } from '../engine/types';

export const CELL = 104;
export const GAP = 8;
export const STEP = CELL + GAP;

interface SymStyle { bg: number; fg: number; label: string; border: number }
/** Placeholder art: flat colour tiles with text labels. No proprietary assets. */
const STYLES: Record<number, SymStyle> = {
  [SYM.L4]: { bg: 0x3b4a5a, fg: 0xcfe0f0, label: '♠', border: 0x6d8399 },
  [SYM.L3]: { bg: 0x5a3b3b, fg: 0xf0cfcf, label: '♥', border: 0x996d6d },
  [SYM.L2]: { bg: 0x5a4c2f, fg: 0xf0e2b8, label: '♦', border: 0x9c8651 },
  [SYM.L1]: { bg: 0x3b5a40, fg: 0xcff0d6, label: '♣', border: 0x6d996f },
  [SYM.H4]: { bg: 0x6b4a2b, fg: 0xffe2b0, label: 'BARTENDER', border: 0xc28b4d },
  [SYM.H3]: { bg: 0x2f5a6b, fg: 0xb8ecff, label: 'HUNTER', border: 0x4da9c2 },
  [SYM.H2]: { bg: 0x6b6b2f, fg: 0xfff7b0, label: 'SHERIFF', border: 0xc2c24d },
  [SYM.H1]: { bg: 0x7a1f1f, fg: 0xffd0d0, label: 'OUTLAW', border: 0xff5a5a },
  [SYM.WILD]: { bg: 0x8a5a00, fg: 0xffffff, label: 'WILD\nPOSTER', border: 0xffd24d },
  [SYM.SCATTER]: { bg: 0x4a1f6b, fg: 0xf3d0ff, label: '★\nBONUS', border: 0xd24dff },
};

export function makeSymbol(id: number): Container {
  const st = STYLES[id];
  const c = new Container();
  const g = new Graphics().roundRect(0, 0, CELL, CELL, 14).fill(st.bg).stroke({ width: 3, color: st.border });
  c.addChild(g);
  const long = st.label.length > 3;
  const t = new Text({
    text: st.label,
    style: { fontFamily: 'system-ui, sans-serif', fontSize: long ? 15 : 46, fontWeight: '800', fill: st.fg, align: 'center' },
  });
  t.anchor.set(0.5);
  t.position.set(CELL / 2, CELL / 2);
  c.addChild(t);
  c.pivot.set(CELL / 2, CELL / 2);
  c.position.set(CELL / 2, CELL / 2);
  return c;
}
