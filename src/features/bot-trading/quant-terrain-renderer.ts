/**
 * WebGL1 renderer for the Strategy Studio landscape.
 *
 * One lit column per parameter pair: it rises above a glass floor for a first-half gain and
 * hangs below it for a loss, and its colour shows the second half. The renderer is presentation
 * only; it receives heights and colours, never market data or amounts. Geometry, camera,
 * projection and picking are pure functions so labels and hit-testing work (and are tested)
 * without a GPU.
 */
import type { Rgb } from './components/quant/studio/studio-colors';

export type Vec3 = [number, number, number];

/** Theme colours for the scene, in sRGB 0…1. */
export interface TerrainPalette {
  /** Glass floor tint. */
  surface: Rgb;
  /** Grid lines and outlines. */
  ink: Rgb;
  /** Selection glow. */
  accent: Rgb;
  /** Hemisphere light from above and below. */
  sky: Rgb;
  ground: Rgb;
}

export interface TerrainFrame {
  /** Canvas size in CSS pixels and the device-pixel ratio used for its backing store. */
  width: number;
  height: number;
  ratio: number;
  nx: number;
  ny: number;
  /** Column height per cell, row-major (`y * nx + x`), in units of the height axis (-1…1). */
  heights: Float32Array;
  /** sRGB colour per cell, three floats each. */
  colors: Float32Array;
  selected: number;
  hovered: number;
  azimuth: number;
  elevation: number;
  /** 0…1 phase of the selection pulse. */
  pulse: number;
  palette: TerrainPalette;
}

export interface TerrainRenderer {
  draw(frame: TerrainFrame): void;
  dispose(): void;
}

/** World height of a full-scale column; the grid spans -1…1 on its longer side. */
export const TERRAIN_HEIGHT = 0.62;
const COLUMN_FILL = 0.78;
const MIN_THICKNESS = 0.012;
const FOV = (34 * Math.PI) / 180;
/** Far enough to frame the whole grid, its tallest columns and the axis labels around it. */
const DISTANCE = 4.7;
/** Allowed camera tilt, from a low side view to nearly top-down. */
export const TERRAIN_ELEVATION = { min: 0.22, max: 1.3 } as const;

/* ------------------------------------------------------------------------------------------------
 * Pure geometry
 * ---------------------------------------------------------------------------------------------- */

export interface TerrainLayout {
  nx: number;
  ny: number;
  /** Spacing between neighbouring columns. */
  cell: number;
  /** Centre of column `i` along x and row `j` along z. */
  x(i: number): number;
  z(j: number): number;
  /** Half extents of the whole grid. */
  halfWidth: number;
  halfDepth: number;
}

/** Square cells, centred on the origin, with the longer side spanning -1…1. */
export function terrainLayout(nx: number, ny: number): TerrainLayout {
  const cell = 2 / Math.max(1, nx, ny);
  const halfWidth = (nx * cell) / 2;
  const halfDepth = (ny * cell) / 2;
  return {
    nx,
    ny,
    cell,
    halfWidth,
    halfDepth,
    x: (i) => -halfWidth + (i + 0.5) * cell,
    // Row 0 (the smallest depth value) sits at the front, nearest the default camera.
    z: (j) => halfDepth - (j + 0.5) * cell,
  };
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const normalize = (a: Vec3): Vec3 => {
  const length = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / length, a[1] / length, a[2] / length];
};

/** Column-major 4×4 product `a × b`. */
function multiply(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(16);
  for (let column = 0; column < 4; column++)
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[k * 4 + row] * b[column * 4 + k];
      out[column * 4 + row] = sum;
    }
  return out;
}

function perspective(fovy: number, aspect: number, near: number, far: number): Float32Array {
  const f = 1 / Math.tan(fovy / 2);
  const out = new Float32Array(16);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) / (near - far);
  out[11] = -1;
  out[14] = (2 * far * near) / (near - far);
  return out;
}

function lookAt(eye: Vec3, target: Vec3, up: Vec3): Float32Array {
  const forward = normalize(sub(target, eye));
  const right = normalize(cross(forward, up));
  const upward = cross(right, forward);
  const out = new Float32Array(16);
  out.set([
    right[0],
    upward[0],
    -forward[0],
    0,
    right[1],
    upward[1],
    -forward[1],
    0,
    right[2],
    upward[2],
    -forward[2],
    0,
  ]);
  out[12] = -dot(right, eye);
  out[13] = -dot(upward, eye);
  out[14] = dot(forward, eye);
  out[15] = 1;
  return out;
}

export interface TerrainCamera {
  eye: Vec3;
  forward: Vec3;
  right: Vec3;
  up: Vec3;
  aspect: number;
  viewProjection: Float32Array;
}

/** Orbit camera around the grid centre; azimuth 0 looks from the front (+z). */
export function terrainCamera(azimuth: number, elevation: number, aspect: number): TerrainCamera {
  const tilt = Math.min(TERRAIN_ELEVATION.max, Math.max(TERRAIN_ELEVATION.min, elevation));
  const target: Vec3 = [0, 0.02, 0];
  // Narrow (phone) canvases step back so the grid and its edge labels still fit across.
  const distance = DISTANCE * Math.max(1, 1.3 / (aspect > 0 && Number.isFinite(aspect) ? aspect : 1)) ** 0.6;
  const eye: Vec3 = [
    distance * Math.cos(tilt) * Math.sin(azimuth),
    distance * Math.sin(tilt),
    distance * Math.cos(tilt) * Math.cos(azimuth),
  ];
  const forward = normalize(sub(target, eye));
  const right = normalize(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  const safeAspect = aspect > 0 && Number.isFinite(aspect) ? aspect : 1;
  return {
    eye,
    forward,
    right,
    up,
    aspect: safeAspect,
    viewProjection: multiply(perspective(FOV, safeAspect, 0.1, 20), lookAt(eye, target, [0, 1, 0])),
  };
}

/** Screen position (CSS pixels) and depth of a world point, or null behind the camera. */
export function projectPoint(
  camera: TerrainCamera,
  point: Vec3,
  width: number,
  height: number
): { x: number; y: number; depth: number } | null {
  const m = camera.viewProjection;
  const [x, y, z] = point;
  const w = m[3] * x + m[7] * y + m[11] * z + m[15];
  if (w <= 1e-6) return null;
  const nx = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
  const ny = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
  const nz = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
  return { x: ((nx + 1) / 2) * width, y: ((1 - ny) / 2) * height, depth: nz };
}

/** Axis-aligned bounds of one column. */
export function columnBounds(layout: TerrainLayout, index: number, height: number): { min: Vec3; max: Vec3 } {
  const i = index % layout.nx;
  const j = Math.floor(index / layout.nx);
  const half = (layout.cell * COLUMN_FILL) / 2;
  const top = Math.max(height * TERRAIN_HEIGHT, MIN_THICKNESS);
  const bottom = Math.min(height * TERRAIN_HEIGHT, 0);
  return {
    min: [layout.x(i) - half, bottom, layout.z(j) - half],
    max: [layout.x(i) + half, top, layout.z(j) + half],
  };
}

/** The column under a screen point (CSS pixels), by ray casting against every column; -1 for none. */
export function pickCell(
  camera: TerrainCamera,
  layout: TerrainLayout,
  heights: ArrayLike<number>,
  px: number,
  py: number,
  width: number,
  height: number
): number {
  if (width <= 0 || height <= 0) return -1;
  const ndcX = (px / width) * 2 - 1;
  const ndcY = 1 - (py / height) * 2;
  const span = Math.tan(FOV / 2);
  const direction = normalize([
    camera.forward[0] + camera.right[0] * ndcX * span * camera.aspect + camera.up[0] * ndcY * span,
    camera.forward[1] + camera.right[1] * ndcX * span * camera.aspect + camera.up[1] * ndcY * span,
    camera.forward[2] + camera.right[2] * ndcX * span * camera.aspect + camera.up[2] * ndcY * span,
  ]);
  let best = -1;
  let nearest = Infinity;
  for (let index = 0; index < layout.nx * layout.ny; index++) {
    const { min, max } = columnBounds(layout, index, heights[index] ?? 0);
    let enter = -Infinity;
    let exit = Infinity;
    for (let axis = 0; axis < 3; axis++) {
      const origin = camera.eye[axis];
      const step = direction[axis];
      if (Math.abs(step) < 1e-9) {
        if (origin < min[axis] || origin > max[axis]) {
          enter = Infinity;
          break;
        }
        continue;
      }
      let near = (min[axis] - origin) / step;
      let far = (max[axis] - origin) / step;
      if (near > far) [near, far] = [far, near];
      enter = Math.max(enter, near);
      exit = Math.min(exit, far);
    }
    if (enter <= exit && exit > 0 && enter < nearest) {
      nearest = enter;
      best = index;
    }
  }
  return best;
}

/* ------------------------------------------------------------------------------------------------
 * WebGL
 * ---------------------------------------------------------------------------------------------- */

const VERTEX_SHADER = `
attribute vec3 a_position;
attribute vec3 a_normal;
attribute vec3 a_color;
attribute float a_glow;
uniform mat4 u_viewProjection;
varying vec3 v_normal;
varying vec3 v_color;
varying vec3 v_world;
varying float v_glow;
void main() {
  v_normal = a_normal;
  v_color = a_color;
  v_world = a_position;
  v_glow = a_glow;
  gl_Position = u_viewProjection * vec4(a_position, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision mediump float;
varying vec3 v_normal;
varying vec3 v_color;
varying vec3 v_world;
varying float v_glow;
uniform vec3 u_eye;
uniform vec3 u_light;
uniform vec3 u_sky;
uniform vec3 u_ground;
uniform vec3 u_accent;
uniform float u_pulse;
uniform float u_alpha;
uniform float u_unlit;
void main() {
  vec3 color = v_color;
  if (u_unlit < 0.5) {
    vec3 n = normalize(v_normal);
    vec3 l = normalize(u_light);
    vec3 v = normalize(u_eye - v_world);
    vec3 h = normalize(l + v);
    float diffuse = max(dot(n, l), 0.0);
    vec3 ambient = mix(u_ground, u_sky, 0.5 + 0.5 * n.y);
    float specular = pow(max(dot(n, h), 0.0), 40.0) * 0.32;
    float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0) * 0.22;
    // Columns darken toward the floor, a cheap contact shadow.
    float contact = 0.72 + 0.28 * clamp(abs(v_world.y) * 6.0, 0.0, 1.0);
    color = v_color * (ambient * 0.5 + diffuse * 0.62) * contact + specular + rim * u_sky;
    color += u_accent * v_glow * (0.28 + 0.34 * u_pulse);
  }
  // Premultiplied output: colour never exceeds alpha.
  gl_FragColor = vec4(clamp(color, 0.0, 1.0) * u_alpha, u_alpha);
}
`;

const STRIDE = 10;
const FACES: { normal: Vec3; corners: [number, number, number][] }[] = [
  // Each corner picks min (0) or max (1) per axis, counter-clockwise from outside.
  {
    normal: [0, 1, 0],
    corners: [
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
      [0, 1, 0],
    ],
  },
  {
    normal: [0, -1, 0],
    corners: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1],
    ],
  },
  {
    normal: [0, 0, 1],
    corners: [
      [0, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
    ],
  },
  {
    normal: [0, 0, -1],
    corners: [
      [1, 0, 0],
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
    ],
  },
  {
    normal: [1, 0, 0],
    corners: [
      [1, 0, 1],
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
    ],
  },
  {
    normal: [-1, 0, 0],
    corners: [
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
    ],
  },
];

/**
 * Create the renderer, or return null when WebGL is unavailable (jsdom, blocked GPUs). Context
 * loss calls `onUnavailable` once; the component then draws its 2D fallback.
 */
export function createTerrainRenderer(canvas: HTMLCanvasElement, onUnavailable?: () => void): TerrainRenderer | null {
  if (typeof WebGLRenderingContext === 'undefined') return null;
  let gl: WebGLRenderingContext | null = null;
  let program: WebGLProgram | null = null;
  const buffers: WebGLBuffer[] = [];
  const shaders: WebGLShader[] = [];
  let disposed = false;
  let indexCount = 0;

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    canvas.removeEventListener('webglcontextlost', lost);
    if (!gl) return;
    buffers.forEach((buffer) => gl?.deleteBuffer(buffer));
    if (program) gl.deleteProgram(program);
    shaders.forEach((shader) => gl?.deleteShader(shader));
    if (!gl.isContextLost()) gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
  function lost(event: Event): void {
    event.preventDefault();
    if (disposed) return;
    dispose();
    onUnavailable?.();
  }

  try {
    gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: true,
      depth: true,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: 'low-power',
      failIfMajorPerformanceCaveat: true,
    }) as WebGLRenderingContext | null;
    if (!gl) return null;
    canvas.addEventListener('webglcontextlost', lost);
    program = gl.createProgram();
    if (!program) throw new Error('Terrain program unavailable');
    for (const [type, source] of [
      [gl.VERTEX_SHADER, VERTEX_SHADER],
      [gl.FRAGMENT_SHADER, FRAGMENT_SHADER],
    ] as const) {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('Terrain shader unavailable');
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Terrain shader failed to compile');
      gl.attachShader(program, shader);
    }
    ['a_position', 'a_normal', 'a_color', 'a_glow'].forEach((name, index) =>
      gl!.bindAttribLocation(program!, index, name)
    );
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Terrain program failed to link');
    gl.useProgram(program);
    for (let index = 0; index < 4; index++) {
      const buffer = gl.createBuffer();
      if (!buffer) throw new Error('Terrain buffer unavailable');
      buffers.push(buffer);
    }
  } catch {
    dispose();
    return null;
  }

  const context = gl;
  const active = program!;
  const [columnBuffer, indexBuffer, floorBuffer, lineBuffer] = buffers;
  // A uniform the compiler optimised away has a null location, which WebGL ignores.
  const uniform = (name: string) => context.getUniformLocation(active, name);
  const locations = {
    viewProjection: uniform('u_viewProjection'),
    eye: uniform('u_eye'),
    light: uniform('u_light'),
    sky: uniform('u_sky'),
    ground: uniform('u_ground'),
    accent: uniform('u_accent'),
    pulse: uniform('u_pulse'),
    alpha: uniform('u_alpha'),
    unlit: uniform('u_unlit'),
  };

  const bindLayout = (buffer: WebGLBuffer) => {
    context.bindBuffer(context.ARRAY_BUFFER, buffer);
    const bytes = STRIDE * 4;
    context.enableVertexAttribArray(0);
    context.vertexAttribPointer(0, 3, context.FLOAT, false, bytes, 0);
    context.enableVertexAttribArray(1);
    context.vertexAttribPointer(1, 3, context.FLOAT, false, bytes, 12);
    context.enableVertexAttribArray(2);
    context.vertexAttribPointer(2, 3, context.FLOAT, false, bytes, 24);
    context.enableVertexAttribArray(3);
    context.vertexAttribPointer(3, 1, context.FLOAT, false, bytes, 36);
  };

  function ensureIndices(count: number): void {
    const needed = count * 36;
    if (indexCount === needed) return;
    const indices = new Uint16Array(needed);
    for (let box = 0; box < count; box++)
      for (let face = 0; face < 6; face++) {
        const base = box * 24 + face * 4;
        indices.set([base, base + 1, base + 2, base, base + 2, base + 3], box * 36 + face * 6);
      }
    context.bindBuffer(context.ELEMENT_ARRAY_BUFFER, indexBuffer);
    context.bufferData(context.ELEMENT_ARRAY_BUFFER, indices, context.STATIC_DRAW);
    indexCount = needed;
  }

  function draw(frame: TerrainFrame): void {
    if (disposed || context.isContextLost()) return;
    const count = frame.nx * frame.ny;
    // Uint16 indices cover 2,730 columns; the studio's grids are far smaller.
    if (!count || count * 24 > 65_535) return;
    const pixelWidth = Math.max(1, Math.round(frame.width * frame.ratio));
    const pixelHeight = Math.max(1, Math.round(frame.height * frame.ratio));
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    const layout = terrainLayout(frame.nx, frame.ny);
    const camera = terrainCamera(frame.azimuth, frame.elevation, frame.width / Math.max(1, frame.height));
    context.viewport(0, 0, pixelWidth, pixelHeight);
    context.clearColor(0, 0, 0, 0);
    context.clear(context.COLOR_BUFFER_BIT | context.DEPTH_BUFFER_BIT);
    context.uniformMatrix4fv(locations.viewProjection, false, camera.viewProjection);
    context.uniform3fv(locations.eye, camera.eye);
    context.uniform3fv(locations.light, normalize([-0.45, 1, 0.65]));
    context.uniform3fv(locations.sky, frame.palette.sky);
    context.uniform3fv(locations.ground, frame.palette.ground);
    context.uniform3fv(locations.accent, frame.palette.accent);
    context.uniform1f(locations.pulse, frame.pulse);

    // Columns.
    const vertices = new Float32Array(count * 24 * STRIDE);
    for (let index = 0; index < count; index++) {
      const { min, max } = columnBounds(layout, index, frame.heights[index] ?? 0);
      const glow = index === frame.selected ? 1 : index === frame.hovered ? 0.45 : 0;
      const color = [frame.colors[index * 3], frame.colors[index * 3 + 1], frame.colors[index * 3 + 2]];
      FACES.forEach((face, faceIndex) =>
        face.corners.forEach((corner, cornerIndex) => {
          const offset = ((index * 6 + faceIndex) * 4 + cornerIndex) * STRIDE;
          vertices.set(
            [
              corner[0] ? max[0] : min[0],
              corner[1] ? max[1] : min[1],
              corner[2] ? max[2] : min[2],
              ...face.normal,
              ...color,
              glow,
            ],
            offset
          );
        })
      );
    }
    ensureIndices(count);
    bindLayout(columnBuffer);
    context.bufferData(context.ARRAY_BUFFER, vertices, context.DYNAMIC_DRAW);
    context.bindBuffer(context.ELEMENT_ARRAY_BUFFER, indexBuffer);
    context.enable(context.DEPTH_TEST);
    context.depthMask(true);
    context.disable(context.BLEND);
    context.uniform1f(locations.alpha, 1);
    context.uniform1f(locations.unlit, 0);
    context.drawElements(context.TRIANGLES, count * 36, context.UNSIGNED_SHORT, 0);

    // Glass floor at zero, then grid lines and the selected column's outline, blended over the columns.
    context.enable(context.BLEND);
    context.blendFunc(context.ONE, context.ONE_MINUS_SRC_ALPHA);
    context.depthMask(false);
    const margin = layout.cell * 0.35;
    const [fx, fz] = [layout.halfWidth + margin, layout.halfDepth + margin];
    const surface = frame.palette.surface;
    const floor = new Float32Array(
      [
        [-fx, 0, fz],
        [fx, 0, fz],
        [fx, 0, -fz],
        [-fx, 0, fz],
        [fx, 0, -fz],
        [-fx, 0, -fz],
      ].flatMap((corner) => [...corner, 0, 1, 0, ...surface, 0])
    );
    bindLayout(floorBuffer);
    context.bufferData(context.ARRAY_BUFFER, floor, context.DYNAMIC_DRAW);
    context.uniform1f(locations.alpha, 0.34);
    context.drawArrays(context.TRIANGLES, 0, 6);

    const lines: number[] = [];
    const ink = frame.palette.ink;
    const push = (a: Vec3, b: Vec3, color: Rgb) => lines.push(...a, 0, 1, 0, ...color, 0, ...b, 0, 1, 0, ...color, 0);
    for (let i = 0; i <= frame.nx; i++) {
      const x = -layout.halfWidth + i * layout.cell;
      push([x, 0.001, -layout.halfDepth], [x, 0.001, layout.halfDepth], ink);
    }
    for (let j = 0; j <= frame.ny; j++) {
      const z = -layout.halfDepth + j * layout.cell;
      push([-layout.halfWidth, 0.001, z], [layout.halfWidth, 0.001, z], ink);
    }
    const gridLines = lines.length / STRIDE;
    if (frame.selected >= 0 && frame.selected < count) {
      const { min, max } = columnBounds(layout, frame.selected, frame.heights[frame.selected] ?? 0);
      const y = max[1] + 0.004;
      const accent = frame.palette.accent;
      push([min[0], y, min[2]], [max[0], y, min[2]], accent);
      push([max[0], y, min[2]], [max[0], y, max[2]], accent);
      push([max[0], y, max[2]], [min[0], y, max[2]], accent);
      push([min[0], y, max[2]], [min[0], y, min[2]], accent);
    }
    bindLayout(lineBuffer);
    context.bufferData(context.ARRAY_BUFFER, new Float32Array(lines), context.DYNAMIC_DRAW);
    context.uniform1f(locations.unlit, 1);
    context.uniform1f(locations.alpha, 0.2);
    context.drawArrays(context.LINES, 0, gridLines);
    const outline = lines.length / STRIDE - gridLines;
    if (outline) {
      context.uniform1f(locations.alpha, 0.65 + 0.35 * frame.pulse);
      context.drawArrays(context.LINES, gridLines, outline);
    }
    context.depthMask(true);
  }

  return { draw, dispose };
}
