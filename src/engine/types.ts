export const REELS = 6;
export const ROWS = 4;
export const MAX_WIN_X = 10000;

/** Symbol ids. 0-3 low, 4-7 high (characters), 8 wild poster, 9 scatter. */
export const SYM = { L4: 0, L3: 1, L2: 2, L1: 3, H4: 4, H3: 5, H2: 6, H1: 7, WILD: 8, SCATTER: 9 } as const;
export const SYMBOL_COUNT = 10;

export type SpinMode = 'base' | 'hunt' | 'shots' | 'duel' | 'freespins' | 'super';

export interface FreeState {
  /** Wild-poster height per reel (only reels 0,1,4,5 use it). */
  posters: number[];
  /** Saloon door multipliers on reels 3 and 4 (0 = none). */
  doors: [number, number];
}

export type ShotEffect = 'poster' | 'door-new' | 'door-double' | 'counter';
export interface Shot { reel: number; effect: ShotEffect; value: number }

export type DuelOutcome = 'left' | 'right' | 'both';
export interface Duel { left: number; right: number; outcome: DuelOutcome; multiplier: number }

export interface LineWin { line: number; symbol: number; count: number; pay: number; cells: [number, number][] }

/** Forced outcome hooks used by the test environment. Anything unset is random. */
export interface Force {
  grid?: number[][]; // [reel][row]; applied BEFORE wild overlays
  scatters?: number; // exact number of scatters to place
  shots?: Array<{ reel: number }>;
  noShots?: boolean;
  doors?: [number, number];
  duelOutcome?: DuelOutcome;
  posters?: number[];
}

export interface SpinResult {
  isFree: boolean;
  grid: number[][];
  wild: boolean[][];
  shots: Shot[];
  posters: number[];
  posterRow: number[];
  doorsBefore: [number, number];
  duel?: Duel;
  doorsAfter: [number, number];
  lineWins: LineWin[];
  baseWin: number; // x bet before multiplier
  multiplier: number;
  win: number; // x bet, after multiplier & cap
  capped: boolean;
  scatterCount: number;
  freeSpinsAwarded: number;
  counterHits: number;
  stateAfter: FreeState;
}

export interface RoundResult {
  mode: SpinMode;
  cost: number; // x bet
  spins: SpinResult[]; // [0] = triggering/base spin, rest = free spins
  totalWin: number; // x bet
  freeSpinsPlayed: number;
}
