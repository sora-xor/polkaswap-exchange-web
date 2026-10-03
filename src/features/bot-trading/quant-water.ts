/**
 * Physics for the Quant Loop hero art: three floating water bubbles and a few small beads,
 * lit by a studio key light plus the theme's pink and violet bounce lights.
 *
 * Presentation only: nothing here receives prices, balances, strategies or research data.
 *
 * - `buildCausticTable` traces light through a water ball lens and tabulates the shadow and
 *   caustic it casts, so the shader can place physically shaped caustics with one texture read.
 * - `createWaterSimulation` moves the bubbles: slow drift, surface oscillation in the two
 *   lowest Rayleigh modes, and damped jiggles when the pointer pushes through them.
 */

export type Vec3 = readonly [number, number, number];

/** Refractive index of water for red, green and blue light; dispersion fringes the caustics. */
export const WATER_IOR = [1.331, 1.334, 1.338] as const;

/** Caustic table layout: radial distance by distance behind the drop, for each light softness. */
export const CAUSTIC_TEXELS = 128;
export const CAUSTIC_ROWS = 64;
/** Radial extent of the table in drop radii. */
export const CAUSTIC_RHO_MAX = 3.5;
/** Distance behind the drop centre covered by the table, in drop radii. */
export const CAUSTIC_S_MAX = 10;
/** Angular radius (radians) of the compact key and pink lights, and of the broad violet fill. */
export const CAUSTIC_SOFTNESS = [0.07, 0.25] as const;
/** Byte encoding `e = T / (T + k)` maps unshadowed light (T = 1) exactly to byte 128. */
export const CAUSTIC_SCALE = 127 / 128;

/** The scene camera sits this far in front of the backdrop plane, looking straight at it. */
export const WATER_CAMERA_DISTANCE = 4;
/** Backdrop half extents in scene units; the canvas keeps the same 520:380 aspect. */
export const WATER_VIEW: readonly [number, number] = [520 / 380, 1];

export interface WaterLight {
  /** Unit vector pointing from the scene towards the light. */
  direction: Vec3;
  /** Softbox half size in gnomonic (tangent-plane) units, as seen from the scene. */
  size: readonly [number, number];
  corner: number;
  /** Radiance of the softbox in reflections, relative to the lit backdrop. */
  radiance: number;
  /** Fraction of the backdrop's irradiance this light provides when nothing blocks it. */
  share: number;
}

function normalize(vector: Vec3): Vec3 {
  const length = Math.hypot(...vector);
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

/**
 * The studio rig. Shares plus `WATER_AMBIENT_SHARE` sum to one, so the open backdrop keeps
 * its exact theme colour and only shadows, caustics and occlusion change it.
 */
export const WATER_LIGHTS = {
  key: { direction: normalize([-0.36, 0.45, 0.82]), size: [0.28, 0.19], corner: 0.06, radiance: 7, share: 0.4 },
  pink: { direction: normalize([0.42, 0.34, 0.84]), size: [0.12, 0.16], corner: 0.08, radiance: 5, share: 0.16 },
  violet: { direction: normalize([-0.6, -0.62, 0.5]), size: [0.5, 0.5], corner: 0.45, radiance: 2, share: 0.1 },
} as const satisfies Record<string, WaterLight>;
export const WATER_AMBIENT_SHARE = 0.34;

/** Unpolarised Fresnel reflectance for light crossing from index `from` into index `to`. */
export function dielectricReflectance(cosIncidence: number, from: number, to: number): number {
  const cosI = Math.min(1, Math.max(0, cosIncidence));
  const eta = from / to;
  const sinT2 = eta * eta * (1 - cosI * cosI);
  if (sinT2 >= 1) return 1;
  const cosT = Math.sqrt(1 - sinT2);
  const rs = (eta * cosI - cosT) / (eta * cosI + cosT);
  const rp = (cosI - eta * cosT) / (cosI + eta * cosT);
  return (rs * rs + rp * rp) / 2;
}

export interface BallLensRay {
  /** Radial distance from the optical axis where the ray leaves the unit sphere. */
  rho: number;
  /** Distance behind the sphere centre, along the light, where the ray leaves. */
  s: number;
  /** Radial change per unit of `s` after leaving; negative values head towards the axis. */
  slope: number;
  /** Fraction of the ray's power transmitted through both surfaces. */
  transmission: number;
}

/**
 * Trace one meridional ray of parallel light through a unit water sphere.
 * `impact` is the ray's distance from the axis (0 ≤ impact < 1).
 */
export function traceBallLens(impact: number, ior: number): BallLensRay {
  const sinI = Math.min(Math.max(impact, 0), 0.999999);
  const incidence = Math.asin(sinI);
  const refraction = Math.asin(sinI / ior);
  const deviation = 2 * (incidence - refraction);
  // The chord inside makes the refraction angle with both normals.
  const exitAngle = -Math.PI / 2 - incidence + 2 * refraction;
  // Reciprocity: the exit surface reflects the same fraction as the entry surface.
  const reflectance = dielectricReflectance(Math.cos(incidence), 1, ior);
  return {
    rho: Math.cos(exitAngle),
    s: -Math.sin(exitAngle),
    slope: -Math.tan(deviation),
    transmission: (1 - reflectance) ** 2,
  };
}

/** Exponentially scaled modified Bessel function I0(x)·e^(−x) (Abramowitz & Stegun 9.8.1–2). */
export function besselI0Scaled(x: number): number {
  const value = Math.abs(x);
  if (value <= 3.75) {
    const t = (value / 3.75) ** 2;
    const i0 =
      1 + t * (3.5156229 + t * (3.0899424 + t * (1.2067492 + t * (0.2659732 + t * (0.0360768 + t * 0.0045813)))));
    return i0 * Math.exp(-value);
  }
  const t = 3.75 / value;
  return (
    (0.39894228 +
      t *
        (0.01328592 +
          t *
            (0.00225319 +
              t *
                (-0.00157565 +
                  t * (0.00916281 + t * (-0.02057706 + t * (0.02635537 + t * (-0.01647633 + t * 0.00392377)))))))) /
    Math.sqrt(value)
  );
}

/** Decode one caustic table byte into irradiance relative to unshadowed light. */
export function decodeCaustic(byte: number): number {
  const encoded = Math.min(byte, 254) / 255;
  return (CAUSTIC_SCALE * encoded) / (1 - encoded);
}

function encodeCaustic(irradiance: number): number {
  const value = Math.max(0, irradiance);
  return Math.round((255 * value) / (value + CAUSTIC_SCALE));
}

/**
 * Irradiance behind a unit water sphere lit by parallel light, relative to the unblocked light.
 *
 * Rows sample the distance `s` behind the centre (0…`CAUSTIC_S_MAX`), columns the radial
 * distance (0…`CAUSTIC_RHO_MAX`), and red, green and blue use their own refractive index.
 * Rays are binned into rings, then blurred with the exact 2-D Gaussian for a radial profile
 * (the I0 Bessel kernel), whose width grows with distance like a real area light's penumbra.
 * Rows 0…63 use the key light's softness and rows 64…127 the bounce lights' softness.
 */
export function buildCausticTable(rays = 1024): Uint8Array {
  const texels = CAUSTIC_TEXELS;
  const table = new Uint8Array(texels * CAUSTIC_ROWS * 2 * 4);
  const width = CAUSTIC_RHO_MAX / texels;
  const radii = new Float64Array(texels);
  const areas = new Float64Array(texels);
  // Fraction of each ring that lies outside the sphere's geometric shadow.
  const open = new Float64Array(texels);
  for (let index = 0; index < texels; index++) {
    const inner = index * width;
    const outer = inner + width;
    radii[index] = inner + width / 2;
    areas[index] = Math.PI * (outer * outer - inner * inner);
    open[index] = outer <= 1 ? 0 : inner >= 1 ? 1 : (outer * outer - 1) / (outer * outer - inner * inner);
  }
  // Exit position, slope and carried power of every ray, for each colour's refractive index.
  const exitRho = new Float64Array(rays * 3);
  const exitS = new Float64Array(rays * 3);
  const slopes = new Float64Array(rays * 3);
  const fluxes = new Float64Array(rays * 3);
  WATER_IOR.forEach((ior, color) => {
    for (let index = 0; index < rays; index++) {
      const impact = (index + 0.5) / rays;
      const ray = traceBallLens(impact, ior);
      const slot = color * rays + index;
      exitRho[slot] = ray.rho;
      exitS[slot] = ray.s;
      slopes[slot] = ray.slope;
      fluxes[slot] = (ray.transmission * 2 * Math.PI * impact) / rays;
    }
  });
  const profiles = [new Float64Array(texels), new Float64Array(texels), new Float64Array(texels)];
  const gauss = new Float64Array(texels);

  CAUSTIC_SOFTNESS.forEach((softness, band) => {
    for (let row = 0; row < CAUSTIC_ROWS; row++) {
      const s = (row / (CAUSTIC_ROWS - 1)) * CAUSTIC_S_MAX;
      profiles.forEach((profile, color) => {
        profile.fill(0);
        for (let index = 0; index < rays; index++) {
          const slot = color * rays + index;
          if (s < exitS[slot]) continue;
          const bin = Math.floor(Math.abs(exitRho[slot] + (s - exitS[slot]) * slopes[slot]) / width);
          if (bin < texels) profile[bin] += fluxes[slot];
        }
        for (let index = 0; index < texels; index++) profile[index] = profile[index] / areas[index] + open[index];
      });
      // Penumbra: an area light blurs the profile more the further the backdrop is behind.
      const sigma = Math.max(width, s * softness);
      const inverse = 1 / (sigma * sigma);
      const span = Math.min(texels - 1, Math.ceil((4.3 * sigma) / width));
      for (let step = 0; step <= span; step++) gauss[step] = Math.exp(-0.5 * (step * width) ** 2 * inverse);
      const [red, green, blue] = profiles;
      for (let target = 0; target < texels; target++) {
        let total = 0;
        let sumRed = 0;
        let sumGreen = 0;
        let sumBlue = 0;
        const last = Math.min(texels - 1, target + span);
        for (let source = Math.max(0, target - span); source <= last; source++) {
          const weight =
            gauss[Math.abs(target - source)] *
            besselI0Scaled(radii[target] * radii[source] * inverse) *
            radii[source] *
            width *
            inverse;
          total += weight;
          sumRed += red[source] * weight;
          sumGreen += green[source] * weight;
          sumBlue += blue[source] * weight;
        }
        // Light beyond the window is unshadowed; discretisation can overshoot the unit kernel mass.
        const missing = total > 1 ? 0 : 1 - total;
        const norm = total > 1 ? 1 / total : 1;
        const offset = ((band * CAUSTIC_ROWS + row) * texels + target) * 4;
        table[offset] = encodeCaustic(sumRed * norm + missing);
        table[offset + 1] = encodeCaustic(sumGreen * norm + missing);
        table[offset + 2] = encodeCaustic(sumBlue * norm + missing);
        table[offset + 3] = 255;
      }
    }
  });
  return table;
}

let causticTable: Uint8Array | null = null;
/** The caustic table is identical for every mount, so it is built once per page. */
export function sharedCausticTable(): Uint8Array {
  causticTable ??= buildCausticTable();
  return causticTable;
}

interface BubbleDesign {
  rest: Vec3;
  radius: number;
  /** Fundamental (l = 2) oscillation frequency in hertz; smaller drops ring faster. */
  hertz: number;
  /** Drift amplitude per axis in scene units. */
  drift: Vec3;
  phase: number;
  /** Axis the printed coin rocks around; mostly vertical so the logo sways side to side. */
  spinAxis: Vec3;
}

/**
 * Research, test and trade: one large bubble between a medium and a small one. Each carries a
 * coin logo printed around its surface (`WATER_COINS` order: PSWAP, XOR, ETH).
 */
const BUBBLES: readonly BubbleDesign[] = [
  {
    rest: [-0.14, 0.14, 0.88],
    radius: 0.42,
    hertz: 0.8,
    drift: [0.05, 0.04, 0.03],
    phase: 0,
    spinAxis: normalize([0.12, 1, 0.1]),
  },
  {
    rest: [0.72, 0.5, 0.62],
    radius: 0.27,
    hertz: 1.1,
    drift: [0.04, 0.05, 0.03],
    phase: 2.1,
    spinAxis: normalize([-0.2, 1, 0.15]),
  },
  {
    rest: [-0.98, -0.38, 0.46],
    radius: 0.19,
    hertz: 1.4,
    drift: [0.035, 0.04, 0.025],
    phase: 4.2,
    spinAxis: normalize([0.25, 1, -0.1]),
  },
];
/** Small beads drift without deforming; surface tension keeps drops this small spherical. */
const BEADS: readonly { rest: Vec3; radius: number; phase: number }[] = [
  { rest: [0.42, -0.6, 0.5], radius: 0.075, phase: 0.7 },
  { rest: [1.08, -0.2, 0.6], radius: 0.05, phase: 1.9 },
  { rest: [-0.74, 0.52, 0.55], radius: 0.06, phase: 3.3 },
  { rest: [0.2, 0.68, 0.72], radius: 0.04, phase: 5.1 },
];
export const WATER_BUBBLE_COUNT = BUBBLES.length;
export const WATER_BEAD_COUNT = BEADS.length;

/** Ratio of the l = 3 to the l = 2 Rayleigh frequency: sqrt(3·2·5 / (2·1·4)). */
const LOBE_RATIO = Math.sqrt(30 / 8);
const DAMPING = 0.09;
const MAX_SHAPE = 0.14;
const MAX_LOBE = 0.06;
const MAX_OFFSET = 0.16;
const STEP = 1 / 240;
/** Coins sway ±0.75 rad around their axis, one sway every 14 s at rest. */
const SWAY = 0.75;
const SWAY_RATE = (2 * Math.PI) / 14;
/** Spin from a push settles back onto a whole turn, so the logo faces forward again. */
const SPIN_SPRING = 1.4;
const SPIN_FRICTION = 1.1;
const MAX_SPIN_SPEED = 9;
const TURN = 2 * Math.PI;

export interface WaterFrame {
  /** Per bubble: centre xyz and radius. */
  bubbles: Float32Array;
  /** Per bubble: symmetric traceless l = 2 deformation as a column-major 3×3 matrix. */
  shapes: Float32Array;
  /** Per bubble: l = 3 axis xyz and amplitude. */
  lobes: Float32Array;
  /** Per bubble: bounding radius over rest radius. */
  reach: Float32Array;
  /** Per bubble: rotation from world to the printed coin's frame, column-major 3×3. */
  spins: Float32Array;
  /** Per bead: centre xyz and radius. */
  beads: Float32Array;
}

export interface WaterSimulation {
  /** Advance by real seconds; long gaps (hidden tabs, calm mode) are clamped. */
  step(seconds: number): void;
  /** Ambient energy: 1 at rest, higher while research runs. The change is eased. */
  setEnergy(energy: number): void;
  /**
   * Push bubbles near a pointer that moved at (`vx`, `vy`) backdrop units per second.
   * Coordinates are on the backdrop plane, y up. Returns whether any bubble was touched.
   */
  poke(x: number, y: number, vx: number, vy: number): boolean;
  frame(): WaterFrame;
}

/** Symmetric traceless tensor u·uᵀ − I/3 as (xx, yy, zz, xy, xz, yz). */
function deviator(u: Vec3, scale: number, out: number[]): void {
  const third = 1 / 3;
  out[0] += scale * (u[0] * u[0] - third);
  out[1] += scale * (u[1] * u[1] - third);
  out[2] += scale * (u[2] * u[2] - third);
  out[3] += scale * u[0] * u[1];
  out[4] += scale * u[0] * u[2];
  out[5] += scale * u[1] * u[2];
}

/**
 * Column-major rotation taking world directions into the frame of a coin turned by `angle`
 * about the unit `axis` (Rodrigues' formula for −angle, the inverse rotation).
 */
export function worldToCoin(axis: Vec3, angle: number): number[] {
  const [x, y, z] = axis;
  const c = Math.cos(-angle);
  const s = Math.sin(-angle);
  const t = 1 - c;
  // Row-major R, then written column by column for GLSL.
  const r = [
    [c + x * x * t, x * y * t - z * s, x * z * t + y * s],
    [y * x * t + z * s, c + y * y * t, y * z * t - x * s],
    [z * x * t - y * s, z * y * t + x * s, c + z * z * t],
  ];
  return [r[0][0], r[1][0], r[2][0], r[0][1], r[1][1], r[2][1], r[0][2], r[1][2], r[2][2]];
}

function tensorNorm(q: readonly number[]): number {
  return Math.sqrt(q[0] ** 2 + q[1] ** 2 + q[2] ** 2 + 2 * (q[3] ** 2 + q[4] ** 2 + q[5] ** 2));
}

/**
 * Bubbles follow slow Lissajous drift plus a damped spring offset, and their surfaces carry an
 * idle wobble plus damped l = 2 / l = 3 oscillators excited by pointer pushes. Everything is
 * deterministic for a given elapsed time, so reduced-motion frames are stable.
 */
export function createWaterSimulation(): WaterSimulation {
  let time = 0;
  let energy = 1;
  let targetEnergy = 1;
  let drift = 0;
  const state = BUBBLES.map(() => ({
    offset: [0, 0, 0],
    velocity: [0, 0, 0],
    shape: [0, 0, 0, 0, 0, 0],
    shapeVelocity: [0, 0, 0, 0, 0, 0],
    lobe: 0,
    lobeVelocity: 0,
    lobeAxis: normalize([0.3, 0.8, 0.5]) as Vec3,
    spin: 0,
    spinVelocity: 0,
  }));
  const frame: WaterFrame = {
    bubbles: new Float32Array(BUBBLES.length * 4),
    shapes: new Float32Array(BUBBLES.length * 9),
    lobes: new Float32Array(BUBBLES.length * 4),
    reach: new Float32Array(BUBBLES.length),
    spins: new Float32Array(BUBBLES.length * 9),
    beads: new Float32Array(BEADS.length * 4),
  };
  let sway = 0;
  const idle = [0, 0, 0, 0, 0, 0];

  function center(index: number): Vec3 {
    const design = BUBBLES[index];
    const offset = state[index].offset;
    const phase = drift + design.phase;
    return [
      design.rest[0] + design.drift[0] * Math.sin(phase * 0.9) + offset[0],
      design.rest[1] + design.drift[1] * Math.sin(phase * 1.15 + 1.3) + offset[1],
      design.rest[2] + design.drift[2] * Math.sin(phase * 0.7 + 2.1) + offset[2],
    ];
  }

  function advance(seconds: number): void {
    energy += (targetEnergy - energy) * (1 - Math.exp(-seconds / 1.5));
    drift += seconds * (0.55 + 0.35 * energy);
    sway += seconds * SWAY_RATE * (0.7 + 0.3 * energy);
    time += seconds;
    state.forEach((bubble, index) => {
      const omega = 2 * Math.PI * BUBBLES[index].hertz;
      const spring = 9;
      const friction = 2 * Math.sqrt(spring) * 0.55;
      for (let axis = 0; axis < 3; axis++) {
        const acceleration = -spring * bubble.offset[axis] - friction * bubble.velocity[axis];
        bubble.velocity[axis] += acceleration * seconds;
        bubble.offset[axis] += bubble.velocity[axis] * seconds;
      }
      for (let component = 0; component < 6; component++) {
        const acceleration =
          -omega * omega * bubble.shape[component] - 2 * DAMPING * omega * bubble.shapeVelocity[component];
        bubble.shapeVelocity[component] += acceleration * seconds;
        bubble.shape[component] += bubble.shapeVelocity[component] * seconds;
      }
      const lobeOmega = omega * LOBE_RATIO;
      bubble.lobeVelocity +=
        (-lobeOmega * lobeOmega * bubble.lobe - 2 * DAMPING * lobeOmega * bubble.lobeVelocity) * seconds;
      bubble.lobe += bubble.lobeVelocity * seconds;
      // Repeated pushes cannot pump the state past what the shader can trace.
      const offset = Math.hypot(...bubble.offset);
      if (offset > MAX_OFFSET) bubble.offset.forEach((_value, axis, values) => (values[axis] *= MAX_OFFSET / offset));
      const norm = tensorNorm(bubble.shape);
      if (norm > MAX_SHAPE) {
        bubble.shape.forEach((_value, component, values) => (values[component] *= MAX_SHAPE / norm));
        bubble.shapeVelocity.forEach((_value, component, values) => (values[component] *= MAX_SHAPE / norm));
      }
      if (Math.abs(bubble.lobe) > MAX_LOBE) {
        bubble.lobe = Math.sign(bubble.lobe) * MAX_LOBE;
        bubble.lobeVelocity *= 0.5;
      }
      const settle = Math.round(bubble.spin / TURN) * TURN;
      bubble.spinVelocity += (SPIN_SPRING * (settle - bubble.spin) - SPIN_FRICTION * bubble.spinVelocity) * seconds;
      bubble.spin += bubble.spinVelocity * seconds;
      // Keep the accumulated turn small; whole turns look identical.
      if (Math.abs(bubble.spin) > TURN * 4) bubble.spin -= Math.sign(bubble.spin) * TURN * 4;
    });
  }

  return {
    step(seconds) {
      let remaining = Math.min(Math.max(Number.isFinite(seconds) ? seconds : 0, 0), 0.1);
      while (remaining > 1e-6) {
        const slice = Math.min(STEP, remaining);
        advance(slice);
        remaining -= slice;
      }
    },
    setEnergy(value) {
      targetEnergy = Number.isFinite(value) ? Math.min(Math.max(value, 0), 2.5) : 1;
    },
    poke(x, y, vx, vy) {
      const speed = Math.hypot(vx, vy);
      if (!Number.isFinite(speed) || speed < 0.05) return false;
      let touched = false;
      state.forEach((bubble, index) => {
        const at = center(index);
        const scale = WATER_CAMERA_DISTANCE / (WATER_CAMERA_DISTANCE - at[2]);
        const radius = BUBBLES[index].radius * scale;
        const distance = Math.hypot(x - at[0] * scale, y - at[1] * scale);
        if (distance > radius * 1.25) return;
        touched = true;
        const reach = 1 - distance / (radius * 1.25);
        const strength = Math.min(speed, 6) * reach;
        const direction: Vec3 = [vx / speed, vy / speed, 0];
        bubble.velocity[0] += direction[0] * strength * 0.12;
        bubble.velocity[1] += direction[1] * strength * 0.12;
        bubble.velocity[2] -= strength * 0.03;
        const omega = 2 * Math.PI * BUBBLES[index].hertz;
        // A push squashes the bubble along its path, then it rings back through round.
        deviator(direction, -strength * 0.018 * omega, bubble.shapeVelocity);
        bubble.lobeAxis = normalize([direction[0], direction[1], 0.35]);
        bubble.lobeVelocity += strength * 0.008 * omega * LOBE_RATIO;
        // A sideways swipe spins the coin about its near-vertical axis, like flicking a globe.
        bubble.spinVelocity = Math.min(
          Math.max(bubble.spinVelocity + direction[0] * strength * 0.9, -MAX_SPIN_SPEED),
          MAX_SPIN_SPEED
        );
      });
      return touched;
    },
    frame() {
      state.forEach((bubble, index) => {
        const design = BUBBLES[index];
        const omega = 2 * Math.PI * design.hertz;
        const phase = time * omega;
        const amplitude = 0.032 * energy;
        idle.fill(0);
        deviator(
          normalize([Math.cos(time * 0.37 + design.phase), Math.sin(time * 0.29 + design.phase), 0.45]),
          amplitude * Math.sin(phase * 0.97 + design.phase),
          idle
        );
        deviator(
          normalize([Math.sin(time * 0.23 + design.phase * 2), 0.5, Math.cos(time * 0.31 + design.phase)]),
          amplitude * 0.7 * Math.sin(phase * 1.09 + design.phase * 1.7),
          idle
        );
        const shape = idle.map((value, component) => value + bubble.shape[component]);
        const norm = tensorNorm(shape);
        if (norm > MAX_SHAPE) shape.forEach((_value, component) => (shape[component] *= MAX_SHAPE / norm));
        const lobeIdle = 0.014 * energy * Math.sin(phase * LOBE_RATIO * 0.98 + design.phase);
        const lobe = Math.min(Math.max(bubble.lobe + lobeIdle, -MAX_LOBE), MAX_LOBE);
        const at = center(index);
        frame.bubbles.set([at[0], at[1], at[2], design.radius], index * 4);
        const [xx, yy, zz, xy, xz, yz] = shape;
        frame.shapes.set([xx, xy, xz, xy, yy, yz, xz, yz, zz], index * 9);
        const axis = normalize([
          bubble.lobeAxis[0] + 0.3 * Math.sin(time * 0.21 + design.phase),
          bubble.lobeAxis[1] + 0.3 * Math.cos(time * 0.17 + design.phase),
          bubble.lobeAxis[2],
        ]);
        frame.lobes.set([axis[0], axis[1], axis[2], lobe], index * 4);
        // |nᵀQn| ≤ ‖Q‖ and |P3| ≤ 1 bound the surface; the margin covers float rounding.
        frame.reach[index] = 1 + Math.min(norm, MAX_SHAPE) + Math.abs(lobe) + 0.01;
        const angle = SWAY * Math.sin(sway + design.phase) + bubble.spin;
        frame.spins.set(worldToCoin(design.spinAxis, angle), index * 9);
      });
      BEADS.forEach((bead, index) => {
        const phase = drift * 1.3 + bead.phase;
        frame.beads.set(
          [
            bead.rest[0] + 0.03 * Math.sin(phase * 0.8),
            bead.rest[1] + 0.035 * Math.sin(phase * 1.1 + 0.6),
            bead.rest[2] + 0.02 * Math.sin(phase * 0.6),
            bead.radius,
          ],
          index * 4
        );
      });
      return frame;
    },
  };
}

export interface WaterMotionCapabilities {
  reducedMotion: boolean;
  saveData?: boolean;
  hardwareConcurrency?: number;
  deviceMemory?: number;
}

/** Animate only without a reduced-motion or data-saving preference, on capable hardware. */
export function canAnimateWater(capabilities: WaterMotionCapabilities): boolean {
  return !(
    capabilities.reducedMotion ||
    capabilities.saveData ||
    (capabilities.hardwareConcurrency !== undefined && capabilities.hardwareConcurrency <= 2) ||
    (capabilities.deviceMemory !== undefined && capabilities.deviceMemory <= 2)
  );
}
