/** Presentation-only particle colors shared by the GPU and Canvas2D paths. */
export const PARTICLE_COLORS = {
  neutral: '#919096',
  positive: '#168a52',
  negative: '#d63743',
  focus: '#f54382',
} as const;

export type ParticleColor = keyof typeof PARTICLE_COLORS;
export type ParticlePalette = Record<ParticleColor, string>;
export interface ParticleSurfacePoint {
  x: number;
  y: number;
}

/** Batched pixels only: neither token amounts nor trade decisions enter this interface. */
export interface TradeParticleRenderer {
  readonly backend?: 'webgl' | 'webgl2';
  /** Update presentation colors without reallocating geometry or resetting replay. */
  setColors?(colors: ParticlePalette): void;
  /** Set the opaque base of density surfaces to the current resolved theme background. */
  setBackground?(color: string): void;
  resize(width: number, height: number, ratio: number): void;
  begin(): void;
  circle(
    x: number,
    y: number,
    radius: number,
    stroke: number,
    color: ParticleColor,
    alpha: number,
    fill: boolean
  ): void;
  /** Draw a solid sphere with fixed upper-left lighting; callers may retain a Canvas2D material fallback. */
  sphere?(x: number, y: number, radius: number, color: ParticleColor, alpha: number): void;
  /** Fill a sampled ridge down to its matching baseline; alpha is the tint strength over the opaque background. */
  surface?(
    points: readonly ParticleSurfacePoint[],
    baseline: readonly ParticleSurfacePoint[],
    color: ParticleColor,
    alpha: number
  ): void;
  line(x1: number, y1: number, x2: number, y2: number, width: number, color: ParticleColor, alpha: number): void;
  end(): boolean;
  dispose(): void;
}

const FLOATS_PER_INSTANCE = 14;
const RGB = {
  neutral: [145 / 255, 144 / 255, 150 / 255],
  positive: [22 / 255, 138 / 255, 82 / 255],
  negative: [214 / 255, 55 / 255, 67 / 255],
  focus: [245 / 255, 67 / 255, 130 / 255],
} as const;

/** Parse browser-resolved opaque theme colors; invalid CSS keeps the established renderer palette. */
export function particleColorRgb(value: string): readonly [number, number, number] | null {
  const hex = value.trim().match(/^#([a-f\d]{3}|[a-f\d]{6})$/i)?.[1];
  if (hex) {
    const expanded = hex.length === 3 ? [...hex].map((digit) => digit + digit).join('') : hex;
    return [0, 2, 4].map((offset) => parseInt(expanded.slice(offset, offset + 2), 16) / 255) as [
      number,
      number,
      number,
    ];
  }
  const rgb = value.trim().match(/^rgb\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*\)$/i);
  if (!rgb) return null;
  const channels = rgb.slice(1).map(Number);
  if (channels.some((channel) => channel < 0 || channel > 255)) return null;
  return channels.map((channel) => channel / 255) as [number, number, number];
}

const VERTEX_SHADER = `#version 300 es
precision highp float;
layout(location = 0) in vec2 a_corner;
layout(location = 1) in vec2 a_center;
layout(location = 2) in vec2 a_extent;
layout(location = 3) in vec2 a_axis;
layout(location = 4) in vec4 a_color;
layout(location = 5) in vec4 a_shape;
uniform vec2 u_size;
out vec2 v_position;
flat out vec4 v_color;
flat out vec4 v_shape;
void main() {
  vec2 position;
  if (a_shape.x > 2.5) {
    // A strip uses the same ordered instance as a particle, with four explicit corners.
    v_position = (a_corner + 1.) * .5;
    vec2 ridge = mix(a_center, a_extent, v_position.x);
    vec2 baseline = mix(a_axis, a_shape.yz, v_position.x);
    position = mix(ridge, baseline, v_position.y) / u_size;
  } else {
    v_position = a_corner * a_extent;
    vec2 rotated = vec2(
      v_position.x * a_axis.x - v_position.y * a_axis.y,
      v_position.x * a_axis.y + v_position.y * a_axis.x
    );
    position = (a_center + rotated) / u_size;
  }
  gl_Position = vec4(position.x * 2. - 1., 1. - position.y * 2., 0., 1.);
  v_color = a_color;
  v_shape = a_shape;
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 v_position;
flat in vec4 v_color;
flat in vec4 v_shape;
uniform vec3 u_background;
out vec4 out_color;
void main() {
  if (v_shape.x > 2.5) {
    // Fully opaque ridges occlude earlier profiles. Lighting fades gently toward the baseline.
    float tint = clamp(v_color.a * (1. - v_position.y * .55), 0., 1.);
    out_color = vec4(mix(u_background, v_color.rgb, tint), 1.);
    return;
  }
  float distance;
  if (v_shape.x > .5 && v_shape.x < 1.5) {
    vec2 edge = abs(v_position) - v_shape.yz;
    distance = length(max(edge, 0.)) + min(max(edge.x, edge.y), 0.);
  } else {
    distance = length(v_position) - v_shape.y;
    if (v_shape.w < .5) distance = abs(distance) - v_shape.z;
  }
  float aa = max(fwidth(distance) * .5, .001);
  float alpha = v_color.a * (1. - smoothstep(-aa, aa, distance));
  vec3 color = v_color.rgb;
  if (v_shape.x > 1.5) {
    // Local screen coordinates keep the light above-left at every scene position.
    vec2 surface = v_position / v_shape.y;
    vec3 normal = normalize(vec3(surface, sqrt(max(0., 1. - dot(surface, surface)))));
    vec3 light = normalize(vec3(-.45, -.58, .72));
    vec3 halfway = normalize(light + vec3(0., 0., 1.));
    float diffuse = max(dot(normal, light), 0.);
    float highlight = pow(max(dot(normal, halfway), 0.), 42.);
    float reflection = pow(max(dot(normal, halfway), 0.), 8.);
    float rim = pow(1. - max(normal.z, 0.), 3.) * (.025 + diffuse * .075);
    color = clamp(color * (.24 + diffuse * .76) + vec3(highlight * .52 + reflection * .09 + rim), 0., 1.);
  }
  out_color = vec4(color * alpha, alpha);
}`;

const WEBGL_VERTEX_SHADER = VERTEX_SHADER.replace('#version 300 es\n', '')
  .replace(/layout\(location = \d+\) in /g, 'attribute ')
  .replace(/(?:flat )?out /g, 'varying ');
const WEBGL_FRAGMENT_SHADER = FRAGMENT_SHADER.replace(
  '#version 300 es',
  '#extension GL_OES_standard_derivatives : enable'
)
  .replace(/(?:flat )?in /g, 'varying ')
  .replace('out vec4 out_color;', '')
  .replace(/\bout_color\b/g, 'gl_FragColor');

/** Portable instancing operations supplied by WebGL2 core or the WebGL1 extensions. */
interface ParticleGpuBackend {
  createVertexArray(): WebGLVertexArrayObject | null;
  bindVertexArray(array: WebGLVertexArrayObject): void;
  deleteVertexArray(array: WebGLVertexArrayObject): void;
  vertexAttribDivisor(index: number, divisor: number): void;
  drawArraysInstanced(mode: number, first: number, vertices: number, instances: number): void;
}

/**
 * Prefer WebGL2, then WebGL1 with instancing, vertex-array and derivative extensions.
 * One instanced draw preserves order across density surfaces, lines and every candidate.
 * Context/shader/allocation failures permanently return this mount to Canvas2D.
 */
export function createTradeParticleRenderer(
  canvas: HTMLCanvasElement,
  onUnavailable: () => void
): TradeParticleRenderer | null {
  let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  let gpu: ParticleGpuBackend | null = null;
  let program: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;
  let cornerBuffer: WebGLBuffer | null = null;
  let vertexArray: WebGLVertexArrayObject | null = null;
  const shaders: WebGLShader[] = [];
  let disposed = false;
  let data = new Float32Array(256 * FLOATS_PER_INSTANCE);
  let count = 0;
  let allocatedBytes = 0;
  let firstDrawChecked = false;
  let colors: Record<ParticleColor, readonly [number, number, number]> = { ...RGB };

  /** Release this overlay's resources and listener without touching the replay clock. */
  function dispose(): void {
    if (disposed) return;
    disposed = true;
    canvas.removeEventListener('webglcontextlost', unavailable);
    if (!gl) return;
    if (buffer) gl.deleteBuffer(buffer);
    if (cornerBuffer) gl.deleteBuffer(cornerBuffer);
    if (vertexArray) gpu?.deleteVertexArray(vertexArray);
    if (program) gl.deleteProgram(program);
    shaders.forEach((shader) => gl!.deleteShader(shader));
    // Release the context slot as well when the component leaves the page.
    if (!gl.isContextLost()) gl.getExtension('WEBGL_lose_context')?.loseContext();
  }

  /** A lost overlay is replaced by the still-mounted, accessible Canvas2D surface. */
  function unavailable(): void {
    if (disposed) return;
    dispose();
    onUnavailable();
  }

  try {
    const contextOptions: WebGLContextAttributes = {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      failIfMajorPerformanceCaveat: true,
    };
    let webgl2: WebGL2RenderingContext | null = null;
    try {
      webgl2 = canvas.getContext('webgl2', contextOptions);
    } catch {
      // Some embedded browsers reject unknown context names instead of returning null.
    }
    gl = webgl2 ?? canvas.getContext('webgl', contextOptions);
    if (!gl) return null;
    const backend = webgl2 ? 'webgl2' : 'webgl';
    if (webgl2) {
      gpu = {
        createVertexArray: () => webgl2!.createVertexArray(),
        bindVertexArray: (array) => webgl2!.bindVertexArray(array),
        deleteVertexArray: (array) => webgl2!.deleteVertexArray(array),
        vertexAttribDivisor: (index, divisor) => webgl2!.vertexAttribDivisor(index, divisor),
        drawArraysInstanced: (mode, first, vertices, instances) =>
          webgl2!.drawArraysInstanced(mode, first, vertices, instances),
      };
    } else {
      const instancing = gl.getExtension('ANGLE_instanced_arrays');
      const arrays = gl.getExtension('OES_vertex_array_object');
      const derivatives = gl.getExtension('OES_standard_derivatives');
      if (!instancing || !arrays || !derivatives) throw new Error('Particle WebGL extensions unavailable');
      gpu = {
        createVertexArray: () => arrays.createVertexArrayOES(),
        bindVertexArray: (array) => arrays.bindVertexArrayOES(array),
        deleteVertexArray: (array) => arrays.deleteVertexArrayOES(array),
        vertexAttribDivisor: (index, divisor) => instancing.vertexAttribDivisorANGLE(index, divisor),
        drawArraysInstanced: (mode, first, vertices, instances) =>
          instancing.drawArraysInstancedANGLE(mode, first, vertices, instances),
      };
    }
    canvas.addEventListener('webglcontextlost', unavailable);
    for (const [type, source] of [
      [gl.VERTEX_SHADER, webgl2 ? VERTEX_SHADER : WEBGL_VERTEX_SHADER],
      [gl.FRAGMENT_SHADER, webgl2 ? FRAGMENT_SHADER : WEBGL_FRAGMENT_SHADER],
    ] as const) {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('Particle shader unavailable');
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
    }
    program = gl.createProgram();
    if (!program) throw new Error('Particle program unavailable');
    shaders.forEach((shader) => gl!.attachShader(program!, shader));
    if (!webgl2) {
      ['a_corner', 'a_center', 'a_extent', 'a_axis', 'a_color', 'a_shape'].forEach((name, index) =>
        gl!.bindAttribLocation(program!, index, name)
      );
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Particle program failed');
    buffer = gl.createBuffer();
    cornerBuffer = gl.createBuffer();
    vertexArray = gpu.createVertexArray();
    if (!buffer || !cornerBuffer || !vertexArray) throw new Error('Particle buffers unavailable');
    gpu.bindVertexArray(vertexArray);
    // An active divisor-zero attribute is required for portable WebGL2 instanced draws.
    gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gpu.vertexAttribDivisor(0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    let offset = 0;
    for (const [index, size] of [2, 2, 2, 4, 4].entries()) {
      gl.enableVertexAttribArray(index + 1);
      gl.vertexAttribPointer(index + 1, size, gl.FLOAT, false, FLOATS_PER_INSTANCE * 4, offset * 4);
      gpu.vertexAttribDivisor(index + 1, 1);
      offset += size;
    }
    gl.useProgram(program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    const sizeUniform = gl.getUniformLocation(program, 'u_size');
    if (sizeUniform === null) throw new Error('Particle size uniform unavailable');
    const backgroundUniform = gl.getUniformLocation(program, 'u_background');
    if (backgroundUniform === null) throw new Error('Particle background uniform unavailable');
    gl.uniform3f(backgroundUniform, 250 / 255, 248 / 255, 250 / 255);

    /** Append one ordered primitive, growing the reusable buffer without sampling candidates. */
    function append(
      x: number,
      y: number,
      extentX: number,
      extentY: number,
      axisX: number,
      axisY: number,
      color: ParticleColor,
      alpha: number,
      shape: number,
      radius: number,
      halfStroke: number,
      fill: boolean
    ): void {
      if (disposed) return;
      const offset = count * FLOATS_PER_INSTANCE;
      if (offset + FLOATS_PER_INSTANCE > data.length) {
        const larger = new Float32Array(data.length * 2);
        larger.set(data);
        data = larger;
      }
      const rgb = colors[color];
      data[offset] = x;
      data[offset + 1] = y;
      data[offset + 2] = extentX;
      data[offset + 3] = extentY;
      data[offset + 4] = axisX;
      data[offset + 5] = axisY;
      data[offset + 6] = rgb[0];
      data[offset + 7] = rgb[1];
      data[offset + 8] = rgb[2];
      data[offset + 9] = alpha;
      data[offset + 10] = shape;
      data[offset + 11] = radius;
      data[offset + 12] = halfStroke;
      data[offset + 13] = Number(fill);
      count += 1;
    }

    return {
      backend,
      setColors(palette) {
        colors = Object.fromEntries(
          (Object.keys(palette) as ParticleColor[]).map((key) => [key, particleColorRgb(palette[key]) ?? colors[key]])
        ) as typeof colors;
      },
      setBackground(color) {
        if (disposed) return;
        const rgb = particleColorRgb(color);
        if (rgb) gl!.uniform3f(backgroundUniform, rgb[0], rgb[1], rgb[2]);
      },
      resize(width, height, ratio) {
        if (disposed) return;
        const boundedRatio = Number.isFinite(ratio) ? Math.max(1, Math.min(2, ratio)) : 1;
        const pixelsWide = Math.round(width * boundedRatio);
        const pixelsHigh = Math.round(height * boundedRatio);
        if (canvas.width !== pixelsWide) canvas.width = pixelsWide;
        if (canvas.height !== pixelsHigh) canvas.height = pixelsHigh;
        gl!.viewport(0, 0, pixelsWide, pixelsHigh);
        gl!.uniform2f(sizeUniform, width, height);
      },
      begin() {
        count = 0;
      },
      circle(x, y, radius, stroke, color, alpha, fill) {
        const extent = radius + (fill ? 0 : stroke / 2) + 1;
        append(x, y, extent, extent, 1, 0, color, alpha, 0, radius, stroke / 2, fill);
      },
      sphere(x, y, radius, color, alpha) {
        if (
          !Number.isFinite(x) ||
          !Number.isFinite(y) ||
          !Number.isFinite(radius) ||
          !Number.isFinite(alpha) ||
          radius <= 0 ||
          alpha <= 0
        ) {
          return;
        }
        const extent = radius + 1;
        append(x, y, extent, extent, 1, 0, color, Math.min(alpha, 1), 2, radius, 0, true);
      },
      surface(points, baseline, color, alpha) {
        if (
          disposed ||
          points.length < 2 ||
          points.length !== baseline.length ||
          !Number.isFinite(alpha) ||
          alpha < 0 ||
          points.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y)) ||
          baseline.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y))
        ) {
          return;
        }
        for (let index = 0; index < points.length - 1; index++) {
          const left = points[index];
          const right = points[index + 1];
          const leftBase = baseline[index];
          const rightBase = baseline[index + 1];
          append(
            left.x,
            left.y,
            right.x,
            right.y,
            leftBase.x,
            leftBase.y,
            color,
            Math.min(alpha, 1),
            3,
            rightBase.x,
            rightBase.y,
            true
          );
        }
      },
      line(x1, y1, x2, y2, width, color, alpha) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.hypot(dx, dy);
        if (!length) return;
        append(
          (x1 + x2) / 2,
          (y1 + y2) / 2,
          length / 2 + 1,
          width / 2 + 1,
          dx / length,
          dy / length,
          color,
          alpha,
          1,
          length / 2,
          width / 2,
          true
        );
      },
      end() {
        if (disposed) return false;
        try {
          if (gl!.isContextLost()) throw new Error('Particle context lost');
          gl!.clear(gl!.COLOR_BUFFER_BIT);
          if (!count) return true;
          if (allocatedBytes < data.byteLength) {
            gl!.bufferData(gl!.ARRAY_BUFFER, data.byteLength, gl!.DYNAMIC_DRAW);
            if (gl!.getError() !== gl!.NO_ERROR) throw new Error('Particle allocation failed');
            allocatedBytes = data.byteLength;
          }
          gl!.bufferSubData(gl!.ARRAY_BUFFER, 0, data.subarray(0, count * FLOATS_PER_INSTANCE));
          gpu!.drawArraysInstanced(gl!.TRIANGLES, 0, 6, count);
          if (!firstDrawChecked) {
            if (gl!.getError() !== gl!.NO_ERROR) throw new Error('Particle draw unavailable');
            firstDrawChecked = true;
          }
          return true;
        } catch {
          unavailable();
          return false;
        }
      },
      dispose,
    };
  } catch {
    // Capability checks may be denied or throw; Canvas2D is always retained.
    try {
      dispose();
    } catch {
      canvas.removeEventListener('webglcontextlost', unavailable);
    }
    return null;
  }
}
