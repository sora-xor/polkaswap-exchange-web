import {
  WATER_BEAD_COUNT,
  WATER_BUBBLE_COUNT,
  WATER_CAMERA_DISTANCE,
  worldToCoin,
  type Vec3,
  type WaterFrame,
} from '@/features/bot-trading/quant-water';

import { BUY_XOR_JOURNEY_FOCUS_LIFT, buyXorJourneyLayout, type BuyXorJourneyTargets } from './buyXorJourney';

/**
 * Physics of the Buy XOR journey art: three water bubbles (ETH, ETH on SORA, XOR) that grow, shrink and wobble with
 * the purchase step, and droplets that flow from one coin into the next. It produces the same `WaterFrame` as the Quant Loop
 * simulation, so the ray-traced water renderer draws it unchanged.
 *
 * The shared water scene has exactly three bubbles and four beads (a test pins that); the simulation uses all of them.
 *
 * Presentation only: it receives sizes and a flow from `buyXorJourneyTargets`, never prices, balances or addresses.
 * Everything is deterministic for a given sequence of calls, so tests and still frames are stable.
 *
 * Positions and radii are kept as the viewer sees them (backdrop-plane units, y up, the art is 2 units high), and
 * converted to scene units when the frame is written.
 */
export interface JourneySimulation {
  /** Width / height of the canvas; the coins are spread along the route to fit it. */
  setAspect(aspect: number): void;
  /** Sizes, liveliness and droplet flow for a stage. `snap` jumps there instead of easing, for still frames. */
  setTargets(targets: BuyXorJourneyTargets, options?: { snap?: boolean }): void;
  /** A droplet hits a bubble: it squashes along (`dx`, `dy`), rings back through round and flicks its coin. */
  kick(index: number, dx: number, dy: number, strength: number): void;
  /** Finish: the coin flips once, the bubble jumps and a few droplets fly out and fall back. */
  celebrate(index: number): void;
  /** Push bubbles near a pointer that moved at (`vx`, `vy`); coordinates as seen by the viewer. */
  poke(x: number, y: number, vx: number, vy: number): boolean;
  /** Advance by real seconds; long gaps (hidden tabs) are clamped. */
  step(seconds: number): void;
  /** Jump to the targets and run a few idle seconds, so a still frame shows the bubbles mid-wobble. */
  settle(): void;
  frame(): WaterFrame;
}

interface Role {
  /** Height of the bubble centre above the backdrop plane; later coins sit nearer the camera. */
  z: number;
  /** Fundamental (l = 2) oscillation frequency in hertz. */
  hertz: number;
  phase: number;
  /** Axis the printed coin rocks around; mostly vertical so the logo sways side to side. */
  spinAxis: Vec3;
}

function normalize(vector: Vec3): Vec3 {
  const length = Math.hypot(...vector);
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

const ROLES: readonly Role[] = [
  { z: 0.62, hertz: 1.1, phase: 4.2, spinAxis: normalize([0.25, 1, -0.1]) },
  { z: 0.7, hertz: 0.95, phase: 2.1, spinAxis: normalize([-0.2, 1, 0.15]) },
  { z: 0.78, hertz: 0.8, phase: 0, spinAxis: normalize([0.12, 1, 0.1]) },
];
const COUNT = ROLES.length;

const STEP = 1 / 240;
const MAX_ADVANCE = 0.1;
const TURN = 2 * Math.PI;
/** Ratio of the l = 3 to the l = 2 Rayleigh frequency: sqrt(3·2·5 / (2·1·4)). */
const LOBE_RATIO = Math.sqrt(30 / 8);
const DAMPING = 0.09;
const MAX_SHAPE = 0.14;
const MAX_LOBE = 0.06;
const MAX_DISPLACEMENT = 0.22;
const MAX_SPIN_SPEED = 9;
/** Coins sway ±0.75 rad around their axis, one sway every 14 s at rest. */
const SWAY = 0.75;
const SWAY_RATE = TURN / 14;
const SPIN_SPRING = 1.4;
const SPIN_FRICTION = 1.1;
/** Position follows its place with a soft spring; radius follows its size with a springier one, so growth overshoots. */
const POSITION_OMEGA = 3.4;
const POSITION_ZETA = 0.6;
const RADIUS_OMEGA = 8;
const RADIUS_ZETA = 0.42;
/** Seconds for liveliness and breathing to settle on a new stage. */
const EASE_SECONDS = 1;
const BREATH_SECONDS = 2.8;
const BREATH_FOCUS = 0.045;
const BREATH_REST = 0.012;
const STILL_SECONDS = 3.2;

const BEAD_RADIUS = 0.085;
const FLOW_FADE_SECONDS = 0.45;
/**
 * A droplet that reaches its bubble pushes it this hard (see `kick`), for a flow that takes `ARRIVAL_SECONDS` to cross.
 * Slower flows push harder, so that the bubble rings about as much whatever the pace.
 */
const ARRIVAL_STRENGTH = 0.95;
const ARRIVAL_SECONDS = 2.4;
const SHIVER_SECONDS = 0.8;
const SHIVER_STRENGTH = 1.4;
const BURST_SECONDS = 1.7;
const BURST_GRAVITY = 2.6;
/**
 * Beads that are not in use wait this far below the view, where they cast no shadow and show no caustic. Far enough that
 * no ray comes near, close enough that the shader's float maths stays exact (a bead 999 units away did not).
 */
const PARKED_BELOW = 40;

interface Body {
  sway: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  vr: number;
  energy: number;
  breath: number;
  shape: number[];
  shapeVelocity: number[];
  lobe: number;
  lobeVelocity: number;
  lobeAxis: Vec3;
  spin: number;
  spinVelocity: number;
}

interface Goal {
  sway: number;
  x: number;
  y: number;
  r: number;
  energy: number;
  breath: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/** Adds `scale · (u uᵀ − I/3)` to the symmetric traceless tensor (xx, yy, zz, xy, xz, yz). */
function deviator(u: Vec3, scale: number, out: number[]): void {
  const third = 1 / 3;
  out[0] += scale * (u[0] * u[0] - third);
  out[1] += scale * (u[1] * u[1] - third);
  out[2] += scale * (u[2] * u[2] - third);
  out[3] += scale * u[0] * u[1];
  out[4] += scale * u[0] * u[2];
  out[5] += scale * u[1] * u[2];
}

function tensorNorm(q: readonly number[]): number {
  return Math.sqrt(q[0] ** 2 + q[1] ** 2 + q[2] ** 2 + 2 * (q[3] ** 2 + q[4] ** 2 + q[5] ** 2));
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
const smoothstep = (low: number, high: number, value: number) => {
  const t = clamp((value - low) / (high - low), 0, 1);
  return t * t * (3 - 2 * t);
};
/** Perspective factor from scene units to what the viewer sees, for a point `z` above the backdrop plane. */
const scaleAt = (z: number) => WATER_CAMERA_DISTANCE / (WATER_CAMERA_DISTANCE - z);

const spring = (omega: number, zeta: number) => ({ k: omega * omega, c: 2 * omega * zeta });
const POSITION_SPRING = spring(POSITION_OMEGA, POSITION_ZETA);
const RADIUS_SPRING = spring(RADIUS_OMEGA, RADIUS_ZETA);

/**
 * Bubbles follow their place and size with damped springs; their surfaces carry an idle wobble plus damped l = 2 / l = 3
 * oscillators that droplets, pointer pushes and a stopped step excite. A flow sends four droplets in single file along
 * an arc from one bubble to the next, and each arrival rings the bubble it reaches.
 */
export function createJourneySimulation(): JourneySimulation {
  let time = 0;
  let swayClock = 0;
  let aspect = 4;
  let targets: BuyXorJourneyTargets | null = null;
  let flowPhase = 0;
  let flowFade = 0;
  /** The flow stays described while it fades out, so droplets finish their trip instead of vanishing. */
  let flow: BuyXorJourneyTargets['flow'] = null;
  let flowing = false;
  let trouble: number | null = null;
  let shiverClock = 0;
  let shivers = 0;
  let burstClock = BURST_SECONDS;
  const sparks: Spark[] = Array.from({ length: WATER_BEAD_COUNT }, () => ({ x: 0, y: 0, vx: 0, vy: 0 }));

  const goals: Goal[] = Array.from({ length: COUNT }, () => ({
    sway: 1,
    x: 0,
    y: 0,
    r: 0.2,
    energy: 0.6,
    breath: BREATH_REST,
  }));
  const bodies: Body[] = ROLES.map((_role, index) => ({
    sway: 1,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    r: goals[index].r,
    vr: 0,
    energy: goals[index].energy,
    breath: BREATH_REST,
    shape: [0, 0, 0, 0, 0, 0],
    shapeVelocity: [0, 0, 0, 0, 0, 0],
    lobe: 0,
    lobeVelocity: 0,
    lobeAxis: normalize([0.3, 0.8, 0.5]),
    spin: 0,
    spinVelocity: 0,
  }));
  const output: WaterFrame = {
    bubbles: new Float32Array(WATER_BUBBLE_COUNT * 4),
    shapes: new Float32Array(WATER_BUBBLE_COUNT * 9),
    lobes: new Float32Array(WATER_BUBBLE_COUNT * 4),
    reach: new Float32Array(WATER_BUBBLE_COUNT),
    spins: new Float32Array(WATER_BUBBLE_COUNT * 9),
    beads: new Float32Array(WATER_BEAD_COUNT * 4),
  };
  const idle = [0, 0, 0, 0, 0, 0];

  /** Where each coin sits, and how big it should be, for the current aspect and targets. */
  function aim(): void {
    const places = buyXorJourneyLayout(aspect);
    goals.forEach((goal, index) => {
      const bubble = targets?.bubbles[index];
      goal.x = places[index].x;
      goal.y = places[index].y + (targets && targets.focus === index ? BUY_XOR_JOURNEY_FOCUS_LIFT : 0);
      goal.r = bubble?.radius ?? 0.2;
      goal.energy = bubble?.energy ?? 0.6;
      goal.sway = bubble?.sway ?? 1;
      goal.breath = targets && targets.focus === index && targets.trouble !== index ? BREATH_FOCUS : BREATH_REST;
    });
  }

  function jump(): void {
    bodies.forEach((body, index) => {
      const goal = goals[index];
      Object.assign(body, { x: goal.x, y: goal.y, vx: 0, vy: 0, r: goal.r, vr: 0 });
      body.energy = goal.energy;
      body.breath = goal.breath;
      body.sway = goal.sway;
    });
    flowFade = flowing && flow ? 1 : 0;
  }

  /** `spin` is how much of the hit turns the coin; droplets only sway it, a pointer swipe flicks it. */
  function kickBody(index: number, dx: number, dy: number, strength: number, spin = 1): void {
    const body = bodies[index];
    const length = Math.hypot(dx, dy);
    if (!body || !(length > 1e-6) || !Number.isFinite(strength)) return;
    const direction: Vec3 = [dx / length, dy / length, 0];
    const omega = TURN * ROLES[index].hertz;
    body.vx += direction[0] * strength * 0.12;
    body.vy += direction[1] * strength * 0.12;
    // A hit squashes the bubble along its path, then it rings back through round.
    deviator(direction, -strength * 0.018 * omega, body.shapeVelocity);
    body.lobeAxis = normalize([direction[0], direction[1], 0.35]);
    body.lobeVelocity += strength * 0.008 * omega * LOBE_RATIO;
    body.spinVelocity = clamp(
      body.spinVelocity + direction[0] * strength * 0.9 * spin,
      -MAX_SPIN_SPEED,
      MAX_SPIN_SPEED
    );
  }

  /** Where a droplet is at progress `u` (0 leaves the first coin, 1 reaches the second), as seen by the viewer. */
  function flowPoint(u: number): { x: number; y: number } {
    const to = bodies[flow!.to];
    const from = flow!.from === null ? null : bodies[flow!.from];
    const start = from ? { x: from.x, y: from.y } : { x: -aspect - 0.3, y: to.y + 0.18 };
    const dx = to.x - start.x;
    const dy = to.y - start.y;
    const length = Math.hypot(dx, dy) || 1;
    // Leave the first bubble's surface and sink into the second.
    const a = {
      x: start.x + (dx / length) * (from ? from.r * 0.92 : 0),
      y: start.y + (dy / length) * (from ? from.r * 0.92 : 0),
    };
    const b = { x: to.x - (dx / length) * to.r * 0.8, y: to.y - (dy / length) * to.r * 0.8 };
    const bow = Math.max(0.14, 0.28 * Math.hypot(b.x - a.x, b.y - a.y));
    const control = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + bow };
    const v = 1 - u;
    return {
      x: v * v * a.x + 2 * v * u * control.x + u * u * b.x,
      y: v * v * a.y + 2 * v * u * control.y + u * u * b.y,
    };
  }

  function advance(seconds: number): void {
    time += seconds;
    swayClock += seconds * SWAY_RATE;
    const ease = 1 - Math.exp(-seconds / EASE_SECONDS);

    bodies.forEach((body, index) => {
      const goal = goals[index];
      const omega = TURN * ROLES[index].hertz;
      body.vx += (-POSITION_SPRING.k * (body.x - goal.x) - POSITION_SPRING.c * body.vx) * seconds;
      body.vy += (-POSITION_SPRING.k * (body.y - goal.y) - POSITION_SPRING.c * body.vy) * seconds;
      body.vr += (-RADIUS_SPRING.k * (body.r - goal.r) - RADIUS_SPRING.c * body.vr) * seconds;
      body.x += body.vx * seconds;
      body.y += body.vy * seconds;
      body.r += body.vr * seconds;
      body.energy += (goal.energy - body.energy) * ease;
      body.sway += (goal.sway - body.sway) * ease;
      body.breath += (goal.breath - body.breath) * ease;
      for (let component = 0; component < 6; component++) {
        const acceleration =
          -omega * omega * body.shape[component] - 2 * DAMPING * omega * body.shapeVelocity[component];
        body.shapeVelocity[component] += acceleration * seconds;
        body.shape[component] += body.shapeVelocity[component] * seconds;
      }
      const lobeOmega = omega * LOBE_RATIO;
      body.lobeVelocity += (-lobeOmega * lobeOmega * body.lobe - 2 * DAMPING * lobeOmega * body.lobeVelocity) * seconds;
      body.lobe += body.lobeVelocity * seconds;
      // Repeated hits cannot pump the state past what the shader can trace.
      const displacement = Math.hypot(body.x - goal.x, body.y - goal.y);
      if (displacement > MAX_DISPLACEMENT) {
        body.x = goal.x + ((body.x - goal.x) * MAX_DISPLACEMENT) / displacement;
        body.y = goal.y + ((body.y - goal.y) * MAX_DISPLACEMENT) / displacement;
      }
      const norm = tensorNorm(body.shape);
      if (norm > MAX_SHAPE) {
        body.shape.forEach((_value, component, values) => (values[component] *= MAX_SHAPE / norm));
        body.shapeVelocity.forEach((_value, component, values) => (values[component] *= MAX_SHAPE / norm));
      }
      if (Math.abs(body.lobe) > MAX_LOBE) {
        body.lobe = Math.sign(body.lobe) * MAX_LOBE;
        body.lobeVelocity *= 0.5;
      }
      // Spin from a flick settles back onto a whole turn, so the logo faces forward again.
      const settle = Math.round(body.spin / TURN) * TURN;
      body.spinVelocity += (SPIN_SPRING * (settle - body.spin) - SPIN_FRICTION * body.spinVelocity) * seconds;
      body.spin += body.spinVelocity * seconds;
      if (Math.abs(body.spin) > TURN * 4) body.spin -= Math.sign(body.spin) * TURN * 4;
    });

    // Droplets: fade in or out with the flow, and ring the bubble each one reaches.
    flowFade = clamp(flowFade + ((flowing ? 1 : 0) - flowFade) * (seconds / FLOW_FADE_SECONDS) * 2, 0, 1);
    if (flowFade < 0.002 && !flowing) flowFade = 0;
    if (flow && flowFade > 0) {
      const before = flowPhase;
      flowPhase += seconds / flow.seconds;
      for (let bead = 0; bead < WATER_BEAD_COUNT; bead++) {
        const offset = bead / WATER_BEAD_COUNT;
        if (Math.floor(flowPhase + offset) > Math.floor(before + offset) && flowing) {
          const to = bodies[flow.to];
          const from = flow.from === null ? { x: -aspect, y: to.y } : bodies[flow.from];
          const strength = ARRIVAL_STRENGTH * Math.sqrt(flow.seconds / ARRIVAL_SECONDS);
          kickBody(flow.to, to.x - from.x, to.y - from.y, strength, 0.2);
        }
      }
    }

    // A stopped step keeps shivering, a little differently each time.
    if (trouble !== null) {
      shiverClock += seconds;
      if (shiverClock >= SHIVER_SECONDS) {
        shiverClock -= SHIVER_SECONDS;
        const angle = shivers++ * 2.4;
        kickBody(trouble, Math.cos(angle), Math.sin(angle), SHIVER_STRENGTH, 0.3);
      }
    }

    // Celebration droplets fly out and fall back.
    if (burstClock < BURST_SECONDS) {
      burstClock += seconds;
      sparks.forEach((spark) => {
        spark.vy -= BURST_GRAVITY * seconds;
        spark.x += spark.vx * seconds;
        spark.y += spark.vy * seconds;
      });
    }
  }

  function beadOutput(index: number, x: number, y: number, z: number, radius: number): void {
    const scale = scaleAt(z);
    output.beads.set([x / scale, y / scale, z, radius], index * 4);
  }

  function park(index: number): void {
    output.beads.set([0, -PARKED_BELOW, 0.5, 0.001], index * 4);
  }

  function writeBeads(): void {
    if (burstClock < BURST_SECONDS) {
      const life = 1 - burstClock / BURST_SECONDS;
      sparks.forEach((spark, index) => beadOutput(index, spark.x, spark.y, 0.7, BEAD_RADIUS * 1.15 * life ** 0.6));
      return;
    }
    if (!flow || flowFade <= 0) {
      for (let index = 0; index < WATER_BEAD_COUNT; index++) park(index);
      return;
    }
    for (let index = 0; index < WATER_BEAD_COUNT; index++) {
      const u = (flowPhase + index / WATER_BEAD_COUNT) % 1;
      const point = flowPoint(u);
      // Droplets swell as they leave one bubble and shrink as they sink into the next.
      const size = smoothstep(0, 0.16, u) * (1 - smoothstep(0.78, 1, u)) * flowFade;
      if (size <= 0.002) park(index);
      else beadOutput(index, point.x, point.y, 0.5 + 0.18 * Math.sin(Math.PI * u), BEAD_RADIUS * size);
    }
  }

  function stepBy(seconds: number): void {
    let remaining = clamp(Number.isFinite(seconds) ? seconds : 0, 0, MAX_ADVANCE);
    while (remaining > 1e-6) {
      const slice = Math.min(STEP, remaining);
      advance(slice);
      remaining -= slice;
    }
  }

  aim();
  jump();

  return {
    setAspect(value) {
      if (!Number.isFinite(value) || value <= 0 || value === aspect) return;
      aspect = value;
      aim();
    },
    setTargets(next, options) {
      targets = next;
      flowing = !!next.flow;
      if (next.flow) {
        // A different route starts its droplets afresh instead of teleporting the old ones.
        if (!flow || flow.from !== next.flow.from || flow.to !== next.flow.to) {
          flowFade = 0;
          flowPhase = 0;
        }
        flow = next.flow;
      } else if (options?.snap) flow = null;
      trouble = next.trouble;
      if (trouble === null) shiverClock = 0;
      aim();
      if (options?.snap) jump();
    },
    kick(index, dx, dy, strength) {
      kickBody(index, dx, dy, strength);
    },
    celebrate(index) {
      const body = bodies[index];
      if (!body) return;
      body.spinVelocity = clamp(body.spinVelocity + 7, -MAX_SPIN_SPEED, MAX_SPIN_SPEED);
      kickBody(index, 0, 1, 3);
      burstClock = 0;
      sparks.forEach((spark, bead) => {
        // Fan upward, the outer droplets flying wider and a little slower.
        const angle = Math.PI / 2 + (bead - (WATER_BEAD_COUNT - 1) / 2) * 0.5;
        const speed = 1.25 + 0.2 * (bead % 2);
        spark.x = body.x;
        spark.y = body.y + body.r * 0.6;
        spark.vx = Math.cos(angle) * speed;
        spark.vy = Math.sin(angle) * speed;
      });
    },
    poke(x, y, vx, vy) {
      const speed = Math.hypot(vx, vy);
      if (!Number.isFinite(speed) || speed < 0.05) return false;
      let touched = false;
      bodies.forEach((body, index) => {
        const reach = body.r * 1.25;
        const distance = Math.hypot(x - body.x, y - body.y);
        if (distance > reach) return;
        touched = true;
        kickBody(index, vx, vy, Math.min(speed, 6) * (1 - distance / reach));
      });
      return touched;
    },
    step: stepBy,
    settle() {
      jump();
      for (let elapsed = 0; elapsed < STILL_SECONDS; elapsed += 0.1) stepBy(0.1);
    },
    frame() {
      bodies.forEach((body, index) => {
        const role = ROLES[index];
        const omega = TURN * role.hertz;
        const phase = time * omega;
        const amplitude = 0.032 * body.energy;
        idle.fill(0);
        deviator(
          normalize([Math.cos(time * 0.37 + role.phase), Math.sin(time * 0.29 + role.phase), 0.45]),
          amplitude * Math.sin(phase * 0.97 + role.phase),
          idle
        );
        deviator(
          normalize([Math.sin(time * 0.23 + role.phase * 2), 0.5, Math.cos(time * 0.31 + role.phase)]),
          amplitude * 0.7 * Math.sin(phase * 1.09 + role.phase * 1.7),
          idle
        );
        const shape = idle.map((value, component) => value + body.shape[component]);
        const norm = tensorNorm(shape);
        if (norm > MAX_SHAPE) shape.forEach((_value, component) => (shape[component] *= MAX_SHAPE / norm));
        const lobeIdle = 0.014 * body.energy * Math.sin(phase * LOBE_RATIO * 0.98 + role.phase);
        const lobe = clamp(body.lobe + lobeIdle, -MAX_LOBE, MAX_LOBE);
        const scale = scaleAt(role.z);
        const breathing = 1 + body.breath * Math.sin((TURN * time) / BREATH_SECONDS + role.phase);
        const radius = Math.max(0.02, body.r) * breathing;
        output.bubbles.set([body.x / scale, body.y / scale, role.z, radius / scale], index * 4);
        const [xx, yy, zz, xy, xz, yz] = shape;
        output.shapes.set([xx, xy, xz, xy, yy, yz, xz, yz, zz], index * 9);
        const axis = normalize([
          body.lobeAxis[0] + 0.3 * Math.sin(time * 0.21 + role.phase),
          body.lobeAxis[1] + 0.3 * Math.cos(time * 0.17 + role.phase),
          body.lobeAxis[2],
        ]);
        output.lobes.set([axis[0], axis[1], axis[2], lobe], index * 4);
        // |nᵀQn| ≤ ‖Q‖ and |P3| ≤ 1 bound the surface; the margin covers float rounding.
        output.reach[index] = 1 + Math.min(norm, MAX_SHAPE) + Math.abs(lobe) + 0.01;
        output.spins.set(
          worldToCoin(role.spinAxis, SWAY * body.sway * Math.sin(swayClock + role.phase) + body.spin),
          index * 9
        );
      });
      writeBeads();
      return output;
    },
  };
}
