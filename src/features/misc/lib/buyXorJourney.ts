import type { BuyXorRunStep } from './buyXorCardPurchase';

/**
 * What the Buy XOR journey art shows: the step of a card purchase that is in progress, or the finished purchase.
 * The art is decorative. It reads only this stage and whether the step stopped, never amounts, addresses or balances.
 */
export type BuyXorJourneyStage = BuyXorRunStep | 'done';

/**
 * The three coins of a card purchase, in route order: ETH from the card, the same ETH after the bridge (`ETH-SORA`,
 * printed with the ETH logo), XOR at the end.
 */
export const BUY_XOR_JOURNEY_COINS = ['ETH', 'ETH-SORA', 'XOR'] as const;
export type BuyXorJourneyCoin = (typeof BUY_XOR_JOURNEY_COINS)[number];

/** `normal` is the theme's pink light, `success` turns the water green, `problem` turns it amber (the design system's errors are pink, which a running purchase already is). */
export type BuyXorJourneyMood = 'normal' | 'success' | 'problem';

export interface BuyXorJourneyBubble {
  /** Radius as seen by the viewer, as a fraction of the art's half height (1 reaches the top edge). */
  radius: number;
  /** How lively the surface is: 1 is the Quant Loop art at rest, about 2 is busy. */
  energy: number;
  /** How far the printed coin sways side to side, from 0 (faces the viewer) to 1 (the Quant Loop's sway). */
  sway: number;
}

export interface BuyXorJourneyFlow {
  /** Coin the droplets leave (index into `BUY_XOR_JOURNEY_COINS`), or `null` for the left edge: the card payment. */
  from: number | null;
  /** Coin the droplets flow into. */
  to: number;
  /** Seconds one droplet takes to cross. */
  seconds: number;
}

export interface BuyXorJourneyTargets {
  bubbles: readonly [BuyXorJourneyBubble, BuyXorJourneyBubble, BuyXorJourneyBubble];
  /** Droplets that show where the money is moving, or `null` when nothing moves between coins. */
  flow: BuyXorJourneyFlow | null;
  /** The coin the step in progress is about; it breathes. */
  focus: number;
  /** The coin that shivers because its step stopped, or `null`. */
  trouble: number | null;
  mood: BuyXorJourneyMood;
}

type Bubbles = BuyXorJourneyTargets['bubbles'];
const bubble = (radius: number, energy: number, sway = 1): BuyXorJourneyBubble => ({ radius, energy, sway });
/** Not reached yet: a small, quiet seed. */
const SEED = bubble(0.2, 0.6);

interface StageLook {
  bubbles: Bubbles;
  focus: number;
  flow: BuyXorJourneyFlow | null;
}

/**
 * Size says where the purchase is: seeds are ahead, big lively bubbles are happening now, medium calm ones are done.
 * Droplets flow from the coin being spent into the coin being received.
 */
const LOOKS: Record<BuyXorJourneyStage, StageLook> = {
  pay: { bubbles: [bubble(0.54, 1.3), SEED, SEED], focus: 0, flow: null },
  receive: {
    bubbles: [bubble(0.58, 1.7), SEED, SEED],
    focus: 0,
    flow: { from: null, to: 0, seconds: 3.4 },
  },
  send: {
    bubbles: [bubble(0.34, 1.1), bubble(0.48, 1.6), SEED],
    focus: 1,
    flow: { from: 0, to: 1, seconds: 2.1 },
  },
  arrive: {
    bubbles: [bubble(0.26, 0.6), bubble(0.56, 1.7), bubble(0.24, 0.7)],
    focus: 1,
    flow: { from: 0, to: 1, seconds: 4.4 },
  },
  swap: {
    bubbles: [bubble(0.22, 0.5), bubble(0.3, 0.9), bubble(0.58, 1.9)],
    focus: 2,
    flow: { from: 1, to: 2, seconds: 1.7 },
  },
  // The finished XOR coin holds still and faces the buyer.
  done: { bubbles: [bubble(0.22, 0.5), bubble(0.28, 0.6), bubble(0.72, 1.1, 0.3)], focus: 2, flow: null },
};

/** A bubble whose step stopped sags a little. */
const TROUBLE_SHRINK = 0.92;

/**
 * Targets of the art for a stage. A stopped step ends the flow, turns the water amber and makes the coin of that step
 * shiver; the finished purchase turns the water green.
 */
export function buyXorJourneyTargets(stage: BuyXorJourneyStage, failed = false): BuyXorJourneyTargets {
  const look = LOOKS[stage] ?? LOOKS.pay;
  const stopped = failed && stage !== 'done';
  const bubbles = look.bubbles.map((item, index) =>
    stopped && index === look.focus ? bubble(item.radius * TROUBLE_SHRINK, item.energy, item.sway) : { ...item }
  ) as unknown as Bubbles;
  return {
    bubbles,
    focus: look.focus,
    flow: stopped || !look.flow ? null : { ...look.flow },
    trouble: stopped ? look.focus : null,
    mood: stopped ? 'problem' : stage === 'done' ? 'success' : 'normal',
  };
}

/** The coin the step is about floats this far above its place, as a fraction of the art's half height. */
export const BUY_XOR_JOURNEY_FOCUS_LIFT = 0.05;

export interface BuyXorJourneyPlace {
  /** Position as seen by the viewer, in units of the art's half height: x grows right, y grows up. */
  x: number;
  y: number;
}

const MIN_ASPECT = 1.2;
const MAX_ASPECT = 6;

/**
 * Where the three coins sit in an art of width / height = `aspect`: left to right along the route, with the middle
 * coin a little higher. They stay closer together in a narrow art so the biggest bubble still fits.
 */
export function buyXorJourneyLayout(aspect: number): [BuyXorJourneyPlace, BuyXorJourneyPlace, BuyXorJourneyPlace] {
  const wide = Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, Number.isFinite(aspect) ? aspect : 4));
  const spread = Math.min(3, Math.max(1.05, wide * 0.6));
  return [
    { x: -spread, y: -0.1 },
    { x: 0, y: 0.04 },
    { x: spread, y: -0.07 },
  ];
}
