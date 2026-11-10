/**
 * Display helpers for the burn status banner. They describe progress that the page already
 * proved from wallet and indexer evidence; nothing here decides a reward or a transaction state.
 */

/** Where one submitted burn stands, from signing to the indexed TS reservation. */
export type TonswapBurnPhase = 'waiting' | 'included' | 'confirmed' | 'updated' | 'failed';

export type TonswapBurnStepId = 'sent' | 'included' | 'final' | 'reserved';

export type TonswapBurnStepState = 'done' | 'active' | 'todo' | 'failed';

export type TonswapBurnStep = { id: TonswapBurnStepId; state: TonswapBurnStepState };

/** One decorative spark of the banner's burst. Positions are percentages, times are milliseconds. */
export type BurnEmber = {
  id: number;
  /** Horizontal start, 0 to 100 percent of the banner width. */
  left: number;
  /** Sideways drift while rising, in pixels. */
  drift: number;
  /** Height the spark climbs, in pixels. */
  rise: number;
  /** Diameter in pixels. */
  size: number;
  delay: number;
  duration: number;
};

const STEP_ORDER: readonly TonswapBurnStepId[] = ['sent', 'included', 'final', 'reserved'];

/** How many steps are complete in each phase; the next one is the step in progress. */
const DONE_BY_PHASE: Record<Exclude<TonswapBurnPhase, 'failed'>, number> = {
  waiting: 1,
  included: 2,
  confirmed: 3,
  updated: 4,
};

/**
 * Lists the progress steps of one burn. An excluded source (SORA Trust) earns no TS, so its
 * list ends at finality and never shows a reservation step.
 */
export function getTonswapBurnSteps(phase: TonswapBurnPhase, excluded = false): TonswapBurnStep[] {
  const ids = excluded ? STEP_ORDER.filter((id) => id !== 'reserved') : STEP_ORDER;
  if (phase === 'failed') {
    // A failure is only reported once the chain recorded it, so the burn was sent and then rejected in a block.
    return ids.map((id, index) => ({ id, state: index === 0 ? 'done' : index === 1 ? 'failed' : 'todo' }));
  }
  const done = Math.min(DONE_BY_PHASE[phase], ids.length);
  return ids.map((id, index) => ({ id, state: index < done ? 'done' : index === done ? 'active' : 'todo' }));
}

/** True when nothing further will change for this burn, so the banner can offer to close. */
export function isTonswapBurnSettled(phase: TonswapBurnPhase, excluded = false): boolean {
  return phase === 'updated' || phase === 'failed' || (excluded && phase === 'confirmed');
}

/** Small deterministic generator, so a burst looks varied but renders the same in every test run. */
function createSequence(seed: number): () => number {
  let state = (Math.trunc(seed) >>> 0) + 0x6d2b79f5;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/**
 * Lays out the sparks of one burst. The count is clamped so a caller cannot ask the page
 * to animate an unbounded number of elements.
 */
export function createBurnEmbers(count: number, seed = 1): BurnEmber[] {
  const total = Math.max(0, Math.min(48, Math.trunc(count) || 0));
  const next = createSequence(seed);
  return Array.from({ length: total }, (_unused, id) => ({
    id,
    left: Math.round(4 + next() * 92),
    drift: Math.round((next() - 0.5) * 80),
    rise: Math.round(70 + next() * 110),
    size: Math.round(4 + next() * 6),
    delay: Math.round(next() * 500),
    duration: Math.round(900 + next() * 900),
  }));
}
