import { describe, expect, it } from 'vitest';

import { BUY_XOR_RUN_STEPS } from '@/features/misc/lib/buyXorCardPurchase';
import {
  BUY_XOR_JOURNEY_COINS,
  buyXorJourneyLayout,
  buyXorJourneyTargets,
  type BuyXorJourneyStage,
} from '@/features/misc/lib/buyXorJourney';
import { BUY_XOR_JOURNEY_LOGOS, journeyLogoUrl } from '@/features/misc/lib/buyXorJourneyCoins';
import { parseCoinLogo } from '@/features/bot-trading/quant-water-coins';

const STAGES: BuyXorJourneyStage[] = [...BUY_XOR_RUN_STEPS, 'done'];

describe('Buy XOR journey targets', () => {
  it('describes three coins at every stage, in the sizes and liveliness the water scene can show', () => {
    expect(BUY_XOR_JOURNEY_COINS).toEqual(['ETH', 'ETH-SORA', 'XOR']);
    for (const stage of STAGES) {
      const { bubbles } = buyXorJourneyTargets(stage);
      expect(bubbles).toHaveLength(3);
      for (const bubble of bubbles) {
        expect(bubble.radius).toBeGreaterThan(0.15);
        expect(bubble.radius).toBeLessThanOrEqual(0.8);
        expect(bubble.energy).toBeGreaterThanOrEqual(0.4);
        expect(bubble.energy).toBeLessThanOrEqual(2.5);
        expect(bubble.sway).toBeGreaterThanOrEqual(0);
        expect(bubble.sway).toBeLessThanOrEqual(1);
      }
    }
  });

  it('makes the coin the step is about the biggest one, so size says where the purchase is', () => {
    const focus = STAGES.map((stage) => buyXorJourneyTargets(stage).focus);
    expect(focus).toEqual([0, 0, 1, 1, 2, 2]);
    for (const stage of STAGES) {
      const { bubbles, focus: index } = buyXorJourneyTargets(stage);
      const radii = bubbles.map((bubble) => bubble.radius);
      expect(radii[index]).toBe(Math.max(...radii));
    }
  });

  it('only ever grows the XOR bubble and only shrinks the ETH bubble after the payment', () => {
    const xor = STAGES.map((stage) => buyXorJourneyTargets(stage).bubbles[2].radius);
    xor.slice(1).forEach((radius, index) => expect(radius).toBeGreaterThanOrEqual(xor[index]));
    const eth = STAGES.slice(1).map((stage) => buyXorJourneyTargets(stage).bubbles[0].radius);
    eth.slice(1).forEach((radius, index) => expect(radius).toBeLessThanOrEqual(eth[index]));
  });

  it('sends droplets forward along the route while money moves, and none while a step waits on the buyer', () => {
    const flows = Object.fromEntries(STAGES.map((stage) => [stage, buyXorJourneyTargets(stage).flow]));
    expect(flows.pay).toBeNull();
    expect(flows.done).toBeNull();
    // The card payment comes in from the left edge into the ETH coin.
    expect(flows.receive).toMatchObject({ from: null, to: 0 });
    // The ETH crosses the bridge into the same coin on SORA, then the buyer swaps it for XOR.
    expect(flows.send).toMatchObject({ from: 0, to: 1 });
    expect(flows.arrive).toMatchObject({ from: 0, to: 1 });
    expect(flows.swap).toMatchObject({ from: 1, to: 2 });
    // The bridge is the slow part and the buyer's own swap the quick one.
    expect(flows.arrive!.seconds).toBeGreaterThan(flows.swap!.seconds);
    for (const flow of Object.values(flows)) if (flow) expect(flow.seconds).toBeGreaterThan(0);
  });

  it('turns the water green when the purchase is done and keeps it pink otherwise', () => {
    expect(buyXorJourneyTargets('done').mood).toBe('success');
    for (const stage of BUY_XOR_RUN_STEPS) expect(buyXorJourneyTargets(stage).mood).toBe('normal');
  });

  it('shows a stopped step as trouble: amber water, a shivering coin, a sagging bubble and no flow', () => {
    for (const stage of BUY_XOR_RUN_STEPS) {
      const calm = buyXorJourneyTargets(stage);
      const stopped = buyXorJourneyTargets(stage, true);
      expect(stopped.mood).toBe('problem');
      expect(stopped.trouble).toBe(calm.focus);
      expect(stopped.flow).toBeNull();
      expect(stopped.bubbles[calm.focus].radius).toBeLessThan(calm.bubbles[calm.focus].radius);
      calm.bubbles.forEach((bubble, index) => {
        if (index !== calm.focus) expect(stopped.bubbles[index]).toEqual(bubble);
      });
    }
    expect(buyXorJourneyTargets('swap').trouble).toBeNull();
  });

  it('ignores a failure flag on a finished purchase', () => {
    expect(buyXorJourneyTargets('done', true)).toEqual(buyXorJourneyTargets('done'));
  });

  it('falls back to the first step for a stage it does not know', () => {
    expect(buyXorJourneyTargets('later' as BuyXorJourneyStage)).toEqual(buyXorJourneyTargets('pay'));
  });

  it('hands out fresh objects, so a caller cannot change the next stage', () => {
    const first = buyXorJourneyTargets('receive');
    first.bubbles[0].radius = 99;
    first.flow!.seconds = 99;
    const again = buyXorJourneyTargets('receive');
    expect(again.bubbles[0].radius).toBeLessThan(1);
    expect(again.flow!.seconds).toBeLessThan(10);
  });

  it('lets the finished XOR coin face the buyer instead of swaying', () => {
    expect(buyXorJourneyTargets('done').bubbles[2].sway).toBeLessThan(buyXorJourneyTargets('swap').bubbles[2].sway);
  });
});

describe('Buy XOR journey layout', () => {
  it('places ETH, ETH on SORA and XOR left to right, mirrored around the middle coin', () => {
    const [eth, bridged, xor] = buyXorJourneyLayout(4);
    expect(eth.x).toBeLessThan(bridged.x);
    expect(bridged.x).toBeLessThan(xor.x);
    expect(bridged.x).toBe(0);
    expect(eth.x + xor.x).toBeCloseTo(0, 9);
    // The middle coin sits higher than the outer two.
    expect(bridged.y).toBeGreaterThan(Math.max(eth.y, xor.y));
  });

  it('spreads the coins with the width of the art, within bounds that keep the biggest bubble inside', () => {
    const spread = (aspect: number) => buyXorJourneyLayout(aspect)[2].x;
    expect(spread(3)).toBeGreaterThan(spread(2));
    expect(spread(6)).toBeGreaterThan(spread(4));
    expect(spread(0.2)).toBe(spread(1.2));
    expect(spread(100)).toBe(spread(6));
    expect(spread(1.2)).toBeGreaterThanOrEqual(1.05);
    expect(spread(6)).toBeLessThanOrEqual(3);
    // The outer coin plus its largest radius stays inside the art for ordinary banner shapes.
    for (const aspect of [2, 3, 4, 5]) expect(spread(aspect) + 0.72).toBeLessThan(aspect);
  });

  it('treats an unusable width as the usual banner', () => {
    expect(buyXorJourneyLayout(Number.NaN)).toEqual(buyXorJourneyLayout(4));
    expect(buyXorJourneyLayout(Number.POSITIVE_INFINITY)).toEqual(buyXorJourneyLayout(4));
  });
});

describe('Buy XOR journey coin logos', () => {
  it('prints the coins in route order, as flat logos the coin atlas can fill', () => {
    expect(BUY_XOR_JOURNEY_LOGOS.map((logo) => logo.symbol)).toEqual([...BUY_XOR_JOURNEY_COINS]);
    for (const logo of BUY_XOR_JOURNEY_LOGOS) {
      const parsed = parseCoinLogo(logo.svg);
      expect(parsed, logo.symbol).not.toBeNull();
      // The atlas fills flat colours only: a gradient reference would print black.
      parsed!.shapes.forEach((shape) => expect(shape.fill).not.toMatch(/url\(/));
    }
  });

  it('gives the CSS drops the same logo as a data URL', () => {
    const url = journeyLogoUrl('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><path d="M0 0h2v2z"/></svg>');
    expect(url.startsWith('url("data:image/svg+xml,')).toBe(true);
    const encoded = url.slice('url("data:image/svg+xml,'.length, -2);
    expect(decodeURIComponent(encoded)).toContain('<path d="M0 0h2v2z"/>');
    expect(url).not.toContain('<');
  });
});
