import { describe, expect, it } from 'vitest';

import {
  CAUSTIC_RHO_MAX,
  CAUSTIC_ROWS,
  CAUSTIC_S_MAX,
  CAUSTIC_TEXELS,
  WATER_AMBIENT_SHARE,
  WATER_IOR,
  WATER_LIGHTS,
  besselI0Scaled,
  buildCausticTable,
  canAnimateWater,
  createWaterSimulation,
  decodeCaustic,
  dielectricReflectance,
  sharedCausticTable,
  traceBallLens,
  worldToCoin,
  type WaterFrame,
} from '@/features/bot-trading/quant-water';

const table = sharedCausticTable();
const row = (s: number) => Math.round((s / CAUSTIC_S_MAX) * (CAUSTIC_ROWS - 1));
const column = (rho: number) => Math.min(CAUSTIC_TEXELS - 1, Math.floor((rho / CAUSTIC_RHO_MAX) * CAUSTIC_TEXELS));
const radiusOf = (index: number) => (index + 0.5) * (CAUSTIC_RHO_MAX / CAUSTIC_TEXELS);
/** Irradiance behind a unit sphere relative to open light: band 0 key light, band 1 soft fill. */
const irradiance = (band: number, rowIndex: number, texel: number, channel = 1) =>
  decodeCaustic(table[((band * CAUSTIC_ROWS + rowIndex) * CAUSTIC_TEXELS + texel) * 4 + channel]);

function frameCopy(frame: WaterFrame) {
  return {
    bubbles: Array.from(frame.bubbles),
    shapes: Array.from(frame.shapes),
    lobes: Array.from(frame.lobes),
    reach: Array.from(frame.reach),
    spins: Array.from(frame.spins),
    beads: Array.from(frame.beads),
  };
}

/** Apply a column-major 3×3 matrix from the frame to a vector. */
function apply(matrix: ArrayLike<number>, offset: number, vector: number[]): number[] {
  return [0, 1, 2].map((row) =>
    [0, 1, 2].reduce((sum, column) => sum + matrix[offset + column * 3 + row] * vector[column], 0)
  );
}

function frobenius(shapes: Float32Array, index: number): number {
  return Math.sqrt(shapes.slice(index * 9, index * 9 + 9).reduce((sum, value) => sum + value * value, 0));
}

describe('water optics', () => {
  it('reflects about 2% of light at normal incidence on water and everything past the critical angle', () => {
    expect(dielectricReflectance(1, 1, 1.334)).toBeCloseTo(((1.334 - 1) / (1.334 + 1)) ** 2, 6);
    expect(dielectricReflectance(0, 1, 1.334)).toBeCloseTo(1, 6);
    // Leaving water at 60° from the normal is beyond the 48.6° critical angle.
    expect(dielectricReflectance(Math.cos(Math.PI / 3), 1.334, 1)).toBe(1);
  });

  it('reflects the same fraction entering and leaving along the reciprocal path', () => {
    const incidence = 0.7;
    const refraction = Math.asin(Math.sin(incidence) / 1.334);
    expect(dielectricReflectance(Math.cos(refraction), 1.334, 1)).toBeCloseTo(
      dielectricReflectance(Math.cos(incidence), 1, 1.334),
      10
    );
  });

  it('focuses paraxial light two radii behind the centre of a water ball lens', () => {
    const ray = traceBallLens(0.001, WATER_IOR[1]);
    const focus = ray.s + ray.rho / -ray.slope;
    // Ball-lens effective focal length n·R / (2(n − 1)) measured from the centre.
    expect(focus).toBeCloseTo(WATER_IOR[1] / (2 * (WATER_IOR[1] - 1)), 3);
    expect(focus).toBeGreaterThan(1.99);
    expect(focus).toBeLessThan(2.01);
  });

  it('bends marginal rays harder and transmits less of them', () => {
    const central = traceBallLens(0.1, WATER_IOR[1]);
    const marginal = traceBallLens(0.95, WATER_IOR[1]);
    expect(marginal.slope).toBeLessThan(central.slope);
    expect(marginal.transmission).toBeLessThan(central.transmission);
    expect(central.transmission).toBeLessThanOrEqual(1);
    expect(central.transmission).toBeGreaterThan(0.95);
  });

  it('evaluates the scaled Bessel kernel to published values', () => {
    expect(besselI0Scaled(0)).toBeCloseTo(1, 7);
    expect(besselI0Scaled(1)).toBeCloseTo(1.2660658778 * Math.exp(-1), 6);
    expect(besselI0Scaled(5)).toBeCloseTo(27.239871823 * Math.exp(-5), 6);
    expect(besselI0Scaled(20)).toBeCloseTo(0.0897803, 5);
    expect(besselI0Scaled(-5)).toBe(besselI0Scaled(5));
  });
});

describe('caustic table', () => {
  it('has one RGBA texel per radius and distance for both light softness bands', () => {
    expect(table).toHaveLength(CAUSTIC_TEXELS * CAUSTIC_ROWS * 2 * 4);
    for (let index = 3; index < table.length; index += 4) expect(table[index]).toBe(255);
    expect(sharedCausticTable()).toBe(table);
  });

  it('decodes unshadowed light exactly so the open backdrop is left untouched', () => {
    expect(decodeCaustic(128)).toBeCloseTo(1, 12);
    expect(decodeCaustic(0)).toBe(0);
    expect(decodeCaustic(200)).toBeGreaterThan(decodeCaustic(150));
    // Far from the axis and close behind the drop nothing blocks or focuses the light.
    for (const s of [1, 2, 3]) {
      expect(irradiance(0, row(s), CAUSTIC_TEXELS - 1)).toBeCloseTo(1, 1);
      expect(irradiance(1, row(s), CAUSTIC_TEXELS - 1)).toBeCloseTo(1, 1);
    }
  });

  it('darkens the geometric shadow and focuses a bright core near two radii', () => {
    expect(irradiance(0, row(1.3), column(0.8))).toBeLessThan(0.3);
    let peakRow = 0;
    let peak = 0;
    for (let index = 0; index < CAUSTIC_ROWS; index++) {
      const value = irradiance(0, index, 0);
      if (value > peak) {
        peak = value;
        peakRow = index;
      }
    }
    const focus = (peakRow / (CAUSTIC_ROWS - 1)) * CAUSTIC_S_MAX;
    expect(peak).toBeGreaterThan(10);
    // Spherical aberration pulls the brightest point slightly in front of the paraxial focus.
    expect(focus).toBeGreaterThan(1.3);
    expect(focus).toBeLessThan(2.3);
  });

  it('conserves energy apart from Fresnel losses', () => {
    for (const s of [2, 3]) {
      let deficit = 0;
      for (let texel = 0; texel < CAUSTIC_TEXELS; texel++) {
        const radius = radiusOf(texel);
        deficit += (irradiance(0, row(s), texel) - 1) * 2 * Math.PI * radius * (CAUSTIC_RHO_MAX / CAUSTIC_TEXELS);
      }
      // As a share of the drop's cross-section: about a tenth is reflected away.
      expect(deficit / Math.PI).toBeLessThan(-0.05);
      expect(deficit / Math.PI).toBeGreaterThan(-0.25);
    }
  });

  it('separates colours by dispersion and softens the broad lights', () => {
    let difference = 0;
    for (let texel = 0; texel < CAUSTIC_TEXELS; texel++) {
      difference = Math.max(difference, Math.abs(irradiance(0, row(2), texel, 0) - irradiance(0, row(2), texel, 2)));
    }
    expect(difference).toBeGreaterThan(0.05);
    const sharpPeak = Math.max(...Array.from({ length: CAUSTIC_ROWS }, (_value, index) => irradiance(0, index, 0)));
    const softPeak = Math.max(...Array.from({ length: CAUSTIC_ROWS }, (_value, index) => irradiance(1, index, 0)));
    expect(softPeak).toBeLessThan(sharpPeak / 2);
  });

  it('is deterministic for a given ray count', () => {
    expect(buildCausticTable(256)).toEqual(buildCausticTable(256));
  });
});

describe('studio lights', () => {
  it('uses unit directions in front of the backdrop and shares that sum to one', () => {
    const lights = Object.values(WATER_LIGHTS);
    lights.forEach((light) => {
      expect(Math.hypot(...light.direction)).toBeCloseTo(1, 10);
      expect(light.direction[2]).toBeGreaterThan(0);
    });
    expect(lights.reduce((sum, light) => sum + light.share, WATER_AMBIENT_SHARE)).toBeCloseTo(1, 10);
  });
});

describe('water simulation', () => {
  it('is deterministic for the same elapsed time', () => {
    const first = createWaterSimulation();
    const second = createWaterSimulation();
    for (let index = 0; index < 40; index++) {
      first.step(1 / 30);
      second.step(1 / 30);
    }
    expect(frameCopy(first.frame())).toEqual(frameCopy(second.frame()));
  });

  it('keeps every bubble shape symmetric, traceless and inside its bounding reach', () => {
    const simulation = createWaterSimulation();
    simulation.setEnergy(2.5);
    for (let index = 0; index < 120; index++) {
      simulation.step(1 / 20);
      const frame = simulation.frame();
      for (let bubble = 0; bubble < frame.reach.length; bubble++) {
        const q = frame.shapes.slice(bubble * 9, bubble * 9 + 9);
        expect(q[1]).toBeCloseTo(q[3], 6);
        expect(q[2]).toBeCloseTo(q[6], 6);
        expect(q[5]).toBeCloseTo(q[7], 6);
        expect(q[0] + q[4] + q[8]).toBeCloseTo(0, 6);
        expect(frame.reach[bubble]).toBeGreaterThanOrEqual(1 + frobenius(frame.shapes, bubble) - 1e-6);
        expect(frame.reach[bubble]).toBeLessThanOrEqual(1.21 + 1e-6);
        expect(
          Math.hypot(frame.lobes[bubble * 4], frame.lobes[bubble * 4 + 1], frame.lobes[bubble * 4 + 2])
        ).toBeCloseTo(1, 5);
      }
    }
  });

  it('clamps long gaps, such as a hidden tab, to one tenth of a second', () => {
    const gap = createWaterSimulation();
    const tenth = createWaterSimulation();
    gap.step(45);
    tenth.step(0.1);
    expect(frameCopy(gap.frame())).toEqual(frameCopy(tenth.frame()));
    const before = frameCopy(gap.frame());
    gap.step(Number.NaN);
    gap.step(-1);
    expect(frameCopy(gap.frame())).toEqual(before);
  });

  it('pushes and jiggles only the bubbles a moving pointer touches', () => {
    const poked = createWaterSimulation();
    const calm = createWaterSimulation();
    const { bubbles } = poked.frame();
    const scale = 4 / (4 - bubbles[2]);
    // Through the large bubble's projected centre, sweeping right.
    expect(poked.poke(bubbles[0] * scale, bubbles[1] * scale, 3, 0)).toBe(true);
    expect(poked.poke(bubbles[0] * scale, bubbles[1] * scale, 0.01, 0)).toBe(false);
    expect(poked.poke(9, 9, 3, 0)).toBe(false);
    for (let index = 0; index < 6; index++) {
      poked.step(1 / 30);
      calm.step(1 / 30);
    }
    const moved = poked.frame();
    const still = calm.frame();
    expect(moved.bubbles[0]).toBeGreaterThan(still.bubbles[0]);
    expect(Math.abs(frobenius(moved.shapes, 0) - frobenius(still.shapes, 0))).toBeGreaterThan(0.005);
    // The other bubbles were out of reach.
    expect(Array.from(moved.bubbles.slice(4))).toEqual(Array.from(still.bubbles.slice(4)));
  });

  it('stays bounded and finite under relentless pointer abuse', () => {
    const simulation = createWaterSimulation();
    for (let index = 0; index < 400; index++) {
      const { bubbles } = simulation.frame();
      const bubble = index % 3;
      const scale = 4 / (4 - bubbles[bubble * 4 + 2]);
      simulation.poke(bubbles[bubble * 4] * scale, bubbles[bubble * 4 + 1] * scale, 50, -50);
      simulation.step(1 / 60);
    }
    const frame = simulation.frame();
    Object.values(frame).forEach((values: Float32Array) =>
      values.forEach((value) => expect(Number.isFinite(value)).toBe(true))
    );
    frame.reach.forEach((reach) => expect(reach).toBeLessThanOrEqual(1.21 + 1e-6));
    for (let bubble = 0; bubble < frame.reach.length; bubble++) {
      expect(frobenius(frame.shapes, bubble)).toBeLessThanOrEqual(0.14 + 1e-6);
      expect(Math.abs(frame.lobes[bubble * 4 + 3])).toBeLessThanOrEqual(0.06 + 1e-6);
    }
  });

  it('wobbles harder while research runs, easing into the new energy', () => {
    const average = (energy: number) => {
      const simulation = createWaterSimulation();
      simulation.setEnergy(energy);
      let sum = 0;
      for (let index = 0; index < 200; index++) {
        simulation.step(0.05);
        sum += frobenius(simulation.frame().shapes, 0);
      }
      return sum / 200;
    };
    expect(average(1.8)).toBeGreaterThan(average(1) * 1.3);

    const easing = createWaterSimulation();
    const before = frobenius(easing.frame().shapes, 0);
    easing.setEnergy(2.5);
    easing.step(1 / 240);
    // One step later the idle amplitude has barely moved toward the new target.
    expect(Math.abs(frobenius(easing.frame().shapes, 0) - before)).toBeLessThan(0.01);
  });
});

describe('printed coins', () => {
  it('turns world directions into the coin frame with a proper rotation', () => {
    const matrix = worldToCoin([0, 1, 0], Math.PI / 2);
    // A coin turned a quarter turn about the vertical axis shows its face toward +x.
    apply(matrix, 0, [1, 0, 0]).forEach((value, index) => expect(value).toBeCloseTo([0, 0, 1][index], 10));
    apply(matrix, 0, [0, 1, 0]).forEach((value, index) => expect(value).toBeCloseTo([0, 1, 0][index], 10));
    const random = worldToCoin([0.3, 0.8, 0.52].map((value) => value / Math.hypot(0.3, 0.8, 0.52)) as never, 1.234);
    for (let first = 0; first < 3; first++) {
      for (let second = 0; second < 3; second++) {
        const dot = [0, 1, 2].reduce((sum, row) => sum + random[first * 3 + row] * random[second * 3 + row], 0);
        expect(dot).toBeCloseTo(first === second ? 1 : 0, 10);
      }
    }
  });

  it('starts facing the viewer and sways without turning the logo away', () => {
    const simulation = createWaterSimulation();
    expect(apply(simulation.frame().spins, 0, [0, 0, 1])[2]).toBeCloseTo(1, 1);
    for (let index = 0; index < 400; index++) {
      simulation.step(0.05);
      const facing = apply(simulation.frame().spins, 0, [0, 0, 1])[2];
      // Swaying ±0.75 rad keeps the print on the near side.
      expect(facing).toBeGreaterThan(Math.cos(0.8));
    }
  });

  it('spins a coin when a swipe crosses its bubble, then settles facing forward', () => {
    const simulation = createWaterSimulation();
    const reference = createWaterSimulation();
    const { bubbles } = simulation.frame();
    const scale = 4 / (4 - bubbles[2]);
    simulation.poke(bubbles[0] * scale, bubbles[1] * scale, 6, 0);
    let turned = 1;
    for (let index = 0; index < 30; index++) {
      simulation.step(1 / 30);
      reference.step(1 / 30);
      turned = Math.min(turned, apply(simulation.frame().spins, 0, [0, 0, 1])[2]);
    }
    // Within a second the logo has swung around past the bubble's side.
    expect(turned).toBeLessThan(0);
    for (let index = 0; index < 400; index++) {
      simulation.step(0.05);
      reference.step(0.05);
    }
    const settled = apply(simulation.frame().spins, 0, [0, 0, 1]);
    const resting = apply(reference.frame().spins, 0, [0, 0, 1]);
    settled.forEach((value, index) => expect(value).toBeCloseTo(resting[index], 2));
  });
});

describe('water motion policy', () => {
  it('animates on capable hardware without optional capability reports', () => {
    expect(canAnimateWater({ reducedMotion: false })).toBe(true);
    expect(canAnimateWater({ reducedMotion: false, hardwareConcurrency: 8, deviceMemory: 8 })).toBe(true);
  });

  it.each([
    { reducedMotion: true },
    { reducedMotion: false, saveData: true },
    { reducedMotion: false, hardwareConcurrency: 2 },
    { reducedMotion: false, deviceMemory: 2 },
  ])('draws a still frame for %j', (capabilities) => {
    expect(canAnimateWater(capabilities)).toBe(false);
  });
});
