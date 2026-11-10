import { describe, expect, it } from 'vitest';

import { WATER_BEAD_COUNT, WATER_BUBBLE_COUNT, WATER_CAMERA_DISTANCE } from '@/features/bot-trading/quant-water';
import { buyXorJourneyLayout, buyXorJourneyTargets, type BuyXorJourneyStage } from '@/features/misc/lib/buyXorJourney';
import { createJourneySimulation, type JourneySimulation } from '@/features/misc/lib/buyXorJourneyWater';

const FRAME = 1 / 30;
const ASPECT = 4;

/** A simulation snapped to a stage, so tests start from the settled sizes. */
function at(stage: BuyXorJourneyStage, failed = false, aspect = ASPECT): JourneySimulation {
  const sim = createJourneySimulation();
  sim.setAspect(aspect);
  sim.setTargets(buyXorJourneyTargets(stage, failed), { snap: true });
  return sim;
}

function run(sim: JourneySimulation, seconds: number, each?: () => void): void {
  for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += FRAME) {
    sim.step(FRAME);
    each?.();
  }
}

const scaleOf = (z: number) => WATER_CAMERA_DISTANCE / (WATER_CAMERA_DISTANCE - z);

/** A bubble as the viewer sees it: centre and radius on the backdrop plane. */
function bubbleOf(sim: JourneySimulation, index: number) {
  const frame = sim.frame();
  const [x, y, z, radius] = Array.from(frame.bubbles.slice(index * 4, index * 4 + 4));
  return { x: x * scaleOf(z), y: y * scaleOf(z), z, radius: radius * scaleOf(z) };
}

/** Frobenius norm of a bubble's l = 2 deformation. */
function wobbleOf(sim: JourneySimulation, index: number): number {
  return Math.hypot(...Array.from(sim.frame().shapes.slice(index * 9, index * 9 + 9)));
}

/** How far apart two simulations' bubbles are: the distance of their centres and of their deformation tensors. */
function gap(a: JourneySimulation, b: JourneySimulation, index: number) {
  const first = bubbleOf(a, index);
  const second = bubbleOf(b, index);
  const shapesA = a.frame().shapes.slice(index * 9, index * 9 + 9);
  const shapesB = b.frame().shapes.slice(index * 9, index * 9 + 9);
  return {
    centre: Math.hypot(first.x - second.x, first.y - second.y),
    shape: Math.hypot(...Array.from(shapesA, (value, at) => value - shapesB[at])),
  };
}

/** The droplets that are in use: parked ones sit far below the view with a speck of a radius. */
function dropletsOf(sim: JourneySimulation) {
  const beads = sim.frame().beads;
  return Array.from({ length: WATER_BEAD_COUNT }, (_unused, index) => {
    const [x, y, z, radius] = Array.from(beads.slice(index * 4, index * 4 + 4));
    return { x: x * scaleOf(z), y: y * scaleOf(z), radius };
  }).filter((bead) => bead.radius > 0.01);
}

const snapshot = (sim: JourneySimulation) => {
  const frame = sim.frame();
  return [frame.bubbles, frame.shapes, frame.lobes, frame.reach, frame.spins, frame.beads].map((array) =>
    Array.from(array)
  );
};

/** A small deterministic generator, so the abuse test is repeatable. */
function sequence(seed: number) {
  let state = seed;
  return () => (state = (state * 1664525 + 1013904223) % 4294967296) / 4294967296;
}

describe('Buy XOR journey water', () => {
  it('fills the shared water scene: three bubbles, four beads', () => {
    expect(WATER_BUBBLE_COUNT).toBe(3);
    expect(WATER_BEAD_COUNT).toBe(4);
    const frame = createJourneySimulation().frame();
    expect(frame.bubbles).toHaveLength(WATER_BUBBLE_COUNT * 4);
    expect(frame.shapes).toHaveLength(WATER_BUBBLE_COUNT * 9);
    expect(frame.lobes).toHaveLength(WATER_BUBBLE_COUNT * 4);
    expect(frame.reach).toHaveLength(WATER_BUBBLE_COUNT);
    expect(frame.spins).toHaveLength(WATER_BUBBLE_COUNT * 9);
    expect(frame.beads).toHaveLength(WATER_BEAD_COUNT * 4);
  });

  it('starts as three small seeds along the route and no droplets', () => {
    const sim = createJourneySimulation();
    const places = buyXorJourneyLayout(ASPECT);
    places.forEach((place, index) => {
      const bubble = bubbleOf(sim, index);
      expect(bubble.x).toBeCloseTo(place.x, 6);
      expect(bubble.y).toBeCloseTo(place.y, 6);
      expect(bubble.radius).toBeGreaterThan(0.18);
      expect(bubble.radius).toBeLessThan(0.22);
    });
    expect(dropletsOf(sim)).toHaveLength(0);
  });

  it('jumps to the sizes of a stage when asked to snap, with the coin in focus floating a little higher', () => {
    const sim = at('swap');
    const targets = buyXorJourneyTargets('swap');
    const places = buyXorJourneyLayout(ASPECT);
    targets.bubbles.forEach((target, index) => {
      // Breathing swells the focused bubble by at most 4.5 %, the others by about 1 %.
      expect(Math.abs(bubbleOf(sim, index).radius - target.radius)).toBeLessThan(target.radius * 0.06);
    });
    expect(bubbleOf(sim, 2).y).toBeGreaterThan(places[2].y + 0.04);
    expect(bubbleOf(sim, 0).y).toBeCloseTo(places[0].y, 6);
  });

  it('grows a bubble into its new size with a springy overshoot, and shrinks one that is done', () => {
    const sim = at('receive');
    sim.setTargets(buyXorJourneyTargets('send'));
    const target = buyXorJourneyTargets('send').bubbles;
    const start = bubbleOf(sim, 1).radius;
    run(sim, 0.1);
    expect(bubbleOf(sim, 1).radius).toBeGreaterThan(start);
    expect(bubbleOf(sim, 1).radius).toBeLessThan(target[1].radius * 0.8);
    let peak = 0;
    run(sim, 3, () => (peak = Math.max(peak, bubbleOf(sim, 1).radius)));
    expect(peak).toBeGreaterThan(target[1].radius * 1.05);
    run(sim, 3);
    expect(Math.abs(bubbleOf(sim, 1).radius - target[1].radius)).toBeLessThan(target[1].radius * 0.06);
    expect(Math.abs(bubbleOf(sim, 0).radius - target[0].radius)).toBeLessThan(target[0].radius * 0.08);
    expect(bubbleOf(sim, 0).radius).toBeLessThan(0.4);
  });

  it('rings a bubble that is hit, along the direction of the hit, then lets it settle', () => {
    const control = at('send');
    const hit = at('send');
    hit.kick(1, 1, 0, 5);
    run(control, 0.3);
    run(hit, 0.3);
    expect(bubbleOf(hit, 1).x).toBeGreaterThan(bubbleOf(control, 1).x + 0.01);
    expect(Math.abs(wobbleOf(hit, 1) - wobbleOf(control, 1))).toBeGreaterThan(0.01);
    // The other coins are left alone.
    expect(bubbleOf(hit, 0)).toEqual(bubbleOf(control, 0));
    expect(wobbleOf(hit, 2)).toBe(wobbleOf(control, 2));
    run(control, 20);
    run(hit, 20);
    expect(bubbleOf(hit, 1).x).toBeCloseTo(bubbleOf(control, 1).x, 2);
    expect(wobbleOf(hit, 1)).toBeCloseTo(wobbleOf(control, 1), 2);
  });

  it('ignores hits that cannot be applied', () => {
    const control = at('send');
    const sim = at('send');
    sim.kick(7, 1, 0, 3);
    sim.kick(-1, 1, 0, 3);
    sim.kick(1, 0, 0, 3);
    sim.kick(1, 1, 0, Number.NaN);
    run(control, 1);
    run(sim, 1);
    expect(snapshot(sim)).toEqual(snapshot(control));
  });

  it('pours droplets in single file from one coin to the next and parks them when the flow ends', () => {
    const sim = at('send');
    run(sim, 3);
    const eth = bubbleOf(sim, 0);
    const bridged = bubbleOf(sim, 1);
    const drops = dropletsOf(sim);
    expect(drops.length).toBeGreaterThanOrEqual(2);
    for (const drop of drops) {
      expect(drop.radius).toBeLessThan(0.1);
      expect(drop.x).toBeGreaterThan(eth.x - 0.1);
      expect(drop.x).toBeLessThan(bridged.x + 0.1);
    }
    sim.setTargets(buyXorJourneyTargets('done'));
    run(sim, 2);
    expect(dropletsOf(sim)).toHaveLength(0);
    // Parked droplets are far below the view and tiny, where the shader's maths stays exact.
    const parked = sim.frame().beads;
    for (let index = 0; index < WATER_BEAD_COUNT; index++) {
      expect(parked[index * 4 + 1]).toBeLessThan(-10);
      expect(parked[index * 4 + 3]).toBeLessThan(0.01);
    }
  });

  it('brings the card payment in from the left edge of the art', () => {
    const sim = at('receive');
    run(sim, 4);
    const eth = bubbleOf(sim, 0);
    const drops = dropletsOf(sim);
    expect(drops.length).toBeGreaterThanOrEqual(2);
    for (const drop of drops) expect(drop.x).toBeLessThan(eth.x);
    expect(Math.min(...drops.map((drop) => drop.x))).toBeLessThan(-ASPECT * 0.55);
  });

  it('rings the coin each droplet lands in, so the flow can be felt as well as seen', () => {
    const flowing = at('send');
    const quiet = createJourneySimulation();
    quiet.setAspect(ASPECT);
    quiet.setTargets({ ...buyXorJourneyTargets('send'), flow: null }, { snap: true });
    let pushed = 0;
    let steps = 0;
    run(flowing, 8, () => {
      run(quiet, FRAME);
      pushed += bubbleOf(flowing, 1).x - bubbleOf(quiet, 1).x;
      steps += 1;
    });
    // Droplets arrive from the left, so the bridged ETH coin is nudged to the right on average.
    expect(pushed / steps).toBeGreaterThan(0.004);
  });

  it('starts droplets afresh when the route changes, instead of teleporting them', () => {
    const sim = at('send');
    run(sim, 2);
    expect(dropletsOf(sim).length).toBeGreaterThan(0);
    sim.setTargets(buyXorJourneyTargets('swap'));
    expect(dropletsOf(sim)).toHaveLength(0);
    run(sim, 1.5);
    const bridged = bubbleOf(sim, 1);
    const xor = bubbleOf(sim, 2);
    const drops = dropletsOf(sim);
    expect(drops.length).toBeGreaterThan(0);
    for (const drop of drops) {
      expect(drop.x).toBeGreaterThan(bridged.x - 0.1);
      expect(drop.x).toBeLessThan(xor.x + 0.1);
    }
  });

  it('keeps the droplets going at a new pace when only the speed changes', () => {
    const sim = at('send');
    run(sim, 2);
    const before = dropletsOf(sim).length;
    sim.setTargets(buyXorJourneyTargets('arrive'));
    sim.step(FRAME);
    expect(before).toBeGreaterThanOrEqual(2);
    expect(dropletsOf(sim).length).toBeGreaterThanOrEqual(before - 1);
  });

  it('makes a stopped step shiver and shows no droplets', () => {
    const calm = at('send');
    const stopped = at('send', true);
    let centre = 0;
    let shape = 0;
    run(stopped, 4, () => {
      run(calm, FRAME);
      centre = Math.max(centre, gap(stopped, calm, 1).centre);
      shape = Math.max(shape, gap(stopped, calm, 1).shape);
    });
    expect(centre).toBeGreaterThan(0.02);
    expect(shape).toBeGreaterThan(0.01);
    expect(dropletsOf(stopped)).toHaveLength(0);
    // The other coins stay calm.
    expect(gap(stopped, calm, 0).centre).toBe(0);
  });

  it('celebrates: the coin flips once and comes back facing the buyer, and droplets fly out and fall back', () => {
    const control = at('done');
    const sim = at('done');
    sim.celebrate(2);
    run(control, 0.3);
    run(sim, 0.3);
    expect(sim.frame().spins).not.toEqual(control.frame().spins);
    const flying = dropletsOf(sim);
    expect(flying.length).toBe(WATER_BEAD_COUNT);
    const xor = bubbleOf(sim, 2);
    for (const drop of flying) expect(Math.abs(drop.x - xor.x)).toBeLessThan(1.5);
    expect(Math.max(...flying.map((drop) => drop.y))).toBeGreaterThan(xor.y);
    run(control, 2);
    run(sim, 2);
    expect(dropletsOf(sim)).toHaveLength(0);
    run(control, 10);
    run(sim, 10);
    Array.from(sim.frame().spins).forEach((value, index) => {
      expect(Math.abs(value - control.frame().spins[index])).toBeLessThan(0.02);
    });
  });

  it('ignores a celebration for a coin that does not exist', () => {
    const control = at('done');
    const sim = at('done');
    sim.celebrate(5);
    run(control, 1);
    run(sim, 1);
    expect(snapshot(sim)).toEqual(snapshot(control));
  });

  it('lets the finished coin sway less than a coin still in motion', () => {
    const sway = (sim: JourneySimulation, index: number) => {
      let low = Infinity;
      let high = -Infinity;
      run(sim, 28, () => {
        const value = sim.frame().spins[index * 9 + 2];
        low = Math.min(low, value);
        high = Math.max(high, value);
      });
      return high - low;
    };
    expect(sway(at('done'), 2)).toBeLessThan(sway(at('swap'), 2) * 0.6);
  });

  it('pushes bubbles under a swipe, and only those it touches', () => {
    const control = at('send');
    const sim = at('send');
    const middle = bubbleOf(sim, 1);
    expect(sim.poke(middle.x, middle.y, 3, 0)).toBe(true);
    run(control, 0.3);
    run(sim, 0.3);
    expect(bubbleOf(sim, 1).x).toBeGreaterThan(bubbleOf(control, 1).x);
    expect(bubbleOf(sim, 0)).toEqual(bubbleOf(control, 0));
    expect(sim.poke(middle.x, middle.y + 3, 3, 0)).toBe(false);
    expect(sim.poke(middle.x, middle.y, 0.01, 0)).toBe(false);
    expect(sim.poke(middle.x, middle.y, Number.NaN, 1)).toBe(false);
  });

  it('settles a stage into a still frame: sizes reached, droplets in flight, nothing left to ease', () => {
    const sim = createJourneySimulation();
    sim.setAspect(ASPECT);
    sim.setTargets(buyXorJourneyTargets('arrive'));
    sim.settle();
    buyXorJourneyTargets('arrive').bubbles.forEach((target, index) => {
      expect(Math.abs(bubbleOf(sim, index).radius - target.radius)).toBeLessThan(target.radius * 0.06);
    });
    expect(dropletsOf(sim).length).toBeGreaterThan(0);
  });

  it('is deterministic: the same calls give the same frames', () => {
    const play = () => {
      const sim = createJourneySimulation();
      sim.setAspect(3.3);
      sim.setTargets(buyXorJourneyTargets('receive'));
      run(sim, 2);
      sim.setTargets(buyXorJourneyTargets('swap'));
      sim.kick(2, 1, 1, 2);
      run(sim, 2);
      sim.celebrate(2);
      run(sim, 1);
      return snapshot(sim);
    };
    expect(play()).toEqual(play());
  });

  it('spreads the coins to fit a new width', () => {
    const sim = at('pay');
    sim.setAspect(2);
    run(sim, 6);
    const places = buyXorJourneyLayout(2);
    expect(bubbleOf(sim, 0).x).toBeCloseTo(places[0].x, 1);
    expect(bubbleOf(sim, 2).x).toBeCloseTo(places[2].x, 1);
    // An unusable width changes nothing.
    sim.setAspect(Number.NaN);
    sim.setAspect(0);
    sim.setAspect(-3);
    run(sim, 2);
    expect(bubbleOf(sim, 2).x).toBeCloseTo(places[2].x, 1);
  });

  it('clamps long gaps and ignores steps that are not a positive time', () => {
    const long = at('send');
    const clamped = at('send');
    long.step(60);
    clamped.step(0.1);
    expect(snapshot(long)).toEqual(snapshot(clamped));
    const sim = at('send');
    const control = at('send');
    sim.step(Number.NaN);
    sim.step(-1);
    sim.step(0);
    expect(snapshot(sim)).toEqual(snapshot(control));
  });

  it('stays finite and inside what the shader can trace, whatever is thrown at it', () => {
    const random = sequence(7);
    const sim = createJourneySimulation();
    sim.setAspect(3);
    const stages: BuyXorJourneyStage[] = ['pay', 'receive', 'send', 'arrive', 'swap', 'done'];
    let finite = true;
    let radius = [Infinity, 0];
    let wobble = 0;
    let reach = [Infinity, 0];
    let height = [Infinity, 0];
    for (let step = 0; step < 1800; step++) {
      if (step % 45 === 0) {
        sim.setTargets(buyXorJourneyTargets(stages[Math.floor(random() * stages.length)], random() < 0.25), {
          snap: random() < 0.1,
        });
      }
      if (step % 7 === 0) sim.kick(Math.floor(random() * 3), random() - 0.5, random() - 0.5, random() * 8);
      if (step % 11 === 0) {
        sim.poke((random() - 0.5) * 8, (random() - 0.5) * 2, (random() - 0.5) * 20, (random() - 0.5) * 20);
      }
      if (step % 300 === 0) sim.celebrate(Math.floor(random() * 3));
      if (step % 500 === 0) sim.setAspect(1.5 + random() * 4);
      sim.step(FRAME);
      const frame = sim.frame();
      for (const array of [frame.bubbles, frame.shapes, frame.lobes, frame.reach, frame.spins, frame.beads]) {
        finite &&= array.every((value) => Number.isFinite(value));
      }
      for (let index = 0; index < WATER_BUBBLE_COUNT; index++) {
        const size = bubbleOf(sim, index).radius;
        radius = [Math.min(radius[0], size), Math.max(radius[1], size)];
        wobble = Math.max(wobble, wobbleOf(sim, index));
        reach = [Math.min(reach[0], frame.reach[index]), Math.max(reach[1], frame.reach[index])];
        height = [Math.min(height[0], frame.bubbles[index * 4 + 2]), Math.max(height[1], frame.bubbles[index * 4 + 2])];
      }
    }
    expect(finite).toBe(true);
    expect(radius[0]).toBeGreaterThan(0.05);
    expect(radius[1]).toBeLessThan(1.1);
    // The deformation is capped at what the shader's bounding sphere allows for.
    expect(wobble).toBeLessThanOrEqual(0.1401);
    expect(reach[0]).toBeGreaterThanOrEqual(1);
    expect(reach[1]).toBeLessThan(1.25);
    expect(height[0]).toBeGreaterThan(0.3);
    expect(height[1]).toBeLessThan(1);
  });
});
