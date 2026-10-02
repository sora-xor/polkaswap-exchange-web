import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createTradeParticleRenderer,
  particleColorRgb,
  PARTICLE_COLORS,
} from '@/features/bot-trading/tradeParticleRenderer';

/** Model the actual WebGL resource and draw boundary without requiring a GPU in unit tests. */
function mockGpu(version: 'webgl' | 'webgl2' = 'webgl2') {
  const loseContext = vi.fn();
  const instancing = {
    vertexAttribDivisorANGLE: vi.fn(),
    drawArraysInstancedANGLE: vi.fn(),
  };
  const arrays = {
    createVertexArrayOES: vi.fn(() => ({})),
    bindVertexArrayOES: vi.fn(),
    deleteVertexArrayOES: vi.fn(),
  };
  const gl = {
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    LINK_STATUS: 35714,
    ARRAY_BUFFER: 34962,
    FLOAT: 5126,
    BLEND: 3042,
    ONE: 1,
    ONE_MINUS_SRC_ALPHA: 771,
    COLOR_BUFFER_BIT: 16384,
    STATIC_DRAW: 35044,
    DYNAMIC_DRAW: 35048,
    TRIANGLES: 4,
    NO_ERROR: 0,
    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(),
    bindAttribLocation: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    createBuffer: vi.fn(() => ({})),
    createVertexArray: vi.fn(() => ({})),
    bindVertexArray: vi.fn(),
    bindBuffer: vi.fn(),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    vertexAttribDivisor: vi.fn(),
    useProgram: vi.fn(),
    enable: vi.fn(),
    blendFunc: vi.fn(),
    clearColor: vi.fn(),
    getUniformLocation: vi.fn(() => ({})),
    viewport: vi.fn(),
    uniform2f: vi.fn(),
    uniform3f: vi.fn(),
    clear: vi.fn(),
    bufferData: vi.fn(),
    getError: vi.fn(() => 0),
    bufferSubData: vi.fn(),
    drawArraysInstanced: vi.fn(),
    isContextLost: vi.fn(() => false),
    deleteBuffer: vi.fn(),
    deleteVertexArray: vi.fn(),
    deleteProgram: vi.fn(),
    deleteShader: vi.fn(),
    getExtension: vi.fn((name: string) => {
      if (name === 'ANGLE_instanced_arrays') return instancing;
      if (name === 'OES_vertex_array_object') return arrays;
      if (name === 'OES_standard_derivatives') return {};
      if (name === 'WEBGL_lose_context') return { loseContext };
      return null;
    }),
  };
  const canvas = document.createElement('canvas');
  const getContext = vi.spyOn(canvas, 'getContext').mockReturnValue(gl as unknown as WebGL2RenderingContext);
  if (version === 'webgl') getContext.mockReturnValueOnce(null);
  const unavailable = vi.fn();
  return { canvas, gl, getContext, unavailable, loseContext, instancing, arrays };
}

afterEach(() => vi.restoreAllMocks());

describe('progressive trade particle renderer', () => {
  it('parses resolved theme colors and rejects invalid channels', () => {
    expect(particleColorRgb('#fff')).toEqual([1, 1, 1]);
    expect(particleColorRgb('#166e53')).toEqual([22 / 255, 110 / 255, 83 / 255]);
    expect(particleColorRgb('rgb(131, 219, 190)')).toEqual([131 / 255, 219 / 255, 190 / 255]);
    expect(particleColorRgb('rgb(999, 0, 0)')).toBeNull();
    expect(particleColorRgb('var(--unresolved)')).toBeNull();
  });

  it('updates GPU colors on theme changes without reallocating its geometry', () => {
    const { canvas, gl, unavailable } = mockGpu();
    const renderer = createTradeParticleRenderer(canvas, unavailable)!;
    renderer.setColors?.({ ...PARTICLE_COLORS, positive: '#166e53' });
    renderer.begin();
    renderer.circle(10, 10, 2, 1, 'positive', 1, true);
    renderer.end();
    const light = Array.from((gl.bufferSubData.mock.calls.at(-1)![2] as Float32Array).slice(6, 9));
    renderer.setColors?.({ ...PARTICLE_COLORS, positive: 'rgb(131, 219, 190)' });
    renderer.begin();
    renderer.circle(10, 10, 2, 1, 'positive', 1, true);
    renderer.end();
    const dark = Array.from((gl.bufferSubData.mock.calls.at(-1)![2] as Float32Array).slice(6, 9));
    expect(light[0]).toBeCloseTo(22 / 255);
    expect(dark[0]).toBeCloseTo(131 / 255);
    expect(gl.bufferData).toHaveBeenCalledTimes(2);
    expect(gl.drawArraysInstanced).toHaveBeenCalledTimes(2);
    renderer.dispose();
  });

  it('uses green for profit and red for loss in the default GPU palette', () => {
    const { canvas, gl, unavailable } = mockGpu();
    const renderer = createTradeParticleRenderer(canvas, unavailable)!;
    expect(PARTICLE_COLORS.positive).toBe('#168a52');
    expect(PARTICLE_COLORS.negative).toBe('#d63743');
    renderer.begin();
    renderer.circle(10, 10, 3, 0, 'positive', 1, true);
    renderer.circle(20, 10, 3, 0, 'negative', 1, true);
    renderer.end();
    const data = gl.bufferSubData.mock.calls[0][2] as Float32Array;
    expect(data[6]).toBeCloseTo(22 / 255);
    expect(data[7]).toBeCloseTo(138 / 255);
    expect(data[8]).toBeCloseTo(82 / 255);
    expect(data[20]).toBeCloseTo(214 / 255);
    expect(data[21]).toBeCloseTo(55 / 255);
    expect(data[22]).toBeCloseTo(67 / 255);
    renderer.dispose();
  });

  it('requests the performance guard and falls back when both WebGL contexts are unavailable or denied', () => {
    const { canvas, getContext, unavailable } = mockGpu();
    getContext.mockReturnValue(null);
    expect(createTradeParticleRenderer(canvas, unavailable)).toBeNull();
    expect(getContext).toHaveBeenCalledWith(
      'webgl2',
      expect.objectContaining({
        failIfMajorPerformanceCaveat: true,
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: false,
      })
    );
    expect(getContext).toHaveBeenCalledWith('webgl', expect.objectContaining({ failIfMajorPerformanceCaveat: true }));
    getContext.mockImplementation(() => {
      throw new Error('Disabled by browser');
    });
    expect(createTradeParticleRenderer(canvas, unavailable)).toBeNull();
    expect(unavailable).not.toHaveBeenCalled();
  });

  it('prefers WebGL2 without requesting compatibility extensions or a second context', () => {
    const { canvas, gl, getContext, unavailable } = mockGpu();
    const renderer = createTradeParticleRenderer(canvas, unavailable)!;
    expect(renderer.backend).toBe('webgl2');
    expect(getContext).toHaveBeenCalledOnce();
    expect(gl.getExtension).not.toHaveBeenCalled();
    expect(gl.shaderSource.mock.calls[0][1]).toContain('#version 300 es');
    renderer.dispose();
  });

  it('renders ordered surfaces and spheres through WebGL1 instancing and vertex-array extensions', () => {
    const { canvas, gl, getContext, unavailable, instancing, arrays } = mockGpu('webgl');
    const renderer = createTradeParticleRenderer(canvas, unavailable)!;
    expect(renderer.backend).toBe('webgl');
    expect(getContext.mock.calls.map(([context]) => context)).toEqual(['webgl2', 'webgl']);
    expect(gl.createVertexArray).not.toHaveBeenCalled();
    expect(arrays.createVertexArrayOES).toHaveBeenCalledOnce();
    expect(arrays.bindVertexArrayOES).toHaveBeenCalledOnce();
    expect(gl.bindAttribLocation.mock.calls.map(([, index, name]) => [index, name])).toEqual([
      [0, 'a_corner'],
      [1, 'a_center'],
      [2, 'a_extent'],
      [3, 'a_axis'],
      [4, 'a_color'],
      [5, 'a_shape'],
    ]);
    const vertex = gl.shaderSource.mock.calls[0][1] as string;
    const fragment = gl.shaderSource.mock.calls[1][1] as string;
    expect(vertex).toContain('attribute vec2 a_corner;');
    expect(vertex).toContain('varying vec4 v_shape;');
    expect(vertex).not.toMatch(/#version|layout\(|flat out/);
    expect(fragment).toContain('#extension GL_OES_standard_derivatives : enable');
    expect(fragment).toContain('varying vec4 v_color;');
    expect(fragment).toContain('gl_FragColor =');
    expect(fragment).not.toMatch(/#version|out_color|flat in/);
    renderer.begin();
    renderer.surface!(
      [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ],
      [
        { x: 1, y: 10 },
        { x: 3, y: 10 },
      ],
      'neutral',
      0.2
    );
    renderer.sphere!(20, 30, 5, 'focus', 1);
    expect(renderer.end()).toBe(true);
    expect(instancing.drawArraysInstancedANGLE).toHaveBeenCalledExactlyOnceWith(gl.TRIANGLES, 0, 6, 2);
    expect(instancing.vertexAttribDivisorANGLE.mock.calls).toEqual([
      [0, 0],
      [1, 1],
      [2, 1],
      [3, 1],
      [4, 1],
      [5, 1],
    ]);
    expect(gl.drawArraysInstanced).not.toHaveBeenCalled();
    expect(gl.bufferSubData.mock.calls[0][2] as Float32Array).toHaveLength(28);
    gl.isContextLost.mockReturnValue(true);
    canvas.dispatchEvent(new Event('webglcontextlost'));
    expect(unavailable).toHaveBeenCalledOnce();
    expect(arrays.deleteVertexArrayOES).toHaveBeenCalledOnce();
    expect(gl.deleteVertexArray).not.toHaveBeenCalled();
    expect(renderer.end()).toBe(false);
  });

  it.each(['ANGLE_instanced_arrays', 'OES_vertex_array_object', 'OES_standard_derivatives'])(
    'returns to Canvas when the WebGL1 %s extension is missing',
    (missingExtension) => {
      const { canvas, gl, unavailable, loseContext } = mockGpu('webgl');
      const original = gl.getExtension.getMockImplementation()!;
      gl.getExtension.mockImplementation((name) => (name === missingExtension ? null : original(name)));
      expect(createTradeParticleRenderer(canvas, unavailable)).toBeNull();
      expect(gl.createShader).not.toHaveBeenCalled();
      expect(loseContext).toHaveBeenCalledOnce();
      expect(unavailable).not.toHaveBeenCalled();
    }
  );

  it.each(['shader', 'link', 'buffer', 'uniform'] as const)('cleans up an initialization %s failure', (stage) => {
    const { canvas, gl, unavailable, loseContext } = mockGpu();
    if (stage === 'shader') gl.createShader.mockReturnValueOnce(null!);
    if (stage === 'link') gl.getProgramParameter.mockReturnValueOnce(false);
    if (stage === 'buffer') gl.createBuffer.mockReturnValueOnce(null!);
    if (stage === 'uniform') gl.getUniformLocation.mockReturnValueOnce(null!);
    expect(createTradeParticleRenderer(canvas, unavailable)).toBeNull();
    expect(loseContext).toHaveBeenCalledOnce();
    if (stage !== 'shader') expect(gl.deleteShader).toHaveBeenCalledTimes(2);
    canvas.dispatchEvent(new Event('webglcontextlost'));
    expect(unavailable).not.toHaveBeenCalled();
  });

  it('batches all 10,000 candidates and their effects into one ordered draw without reallocating every frame', () => {
    const { canvas, gl, unavailable } = mockGpu();
    const renderer = createTradeParticleRenderer(canvas, unavailable)!;
    renderer.resize(900, 500, 2);
    renderer.begin();
    for (let index = 0; index < 10000; index++) {
      renderer.circle(index, 200, 2, 0.6, index % 2 ? 'negative' : 'positive', 0.86, index % 2 === 0);
    }
    for (let index = 0; index < 100; index++) renderer.line(20, index, 25, index + 10, 1, 'positive', 0.2);
    renderer.circle(50, 50, 7, 2, 'focus', 1, false);
    expect(renderer.end()).toBe(true);
    expect(gl.drawArraysInstanced).toHaveBeenCalledExactlyOnceWith(gl.TRIANGLES, 0, 6, 10101);
    const uploaded = gl.bufferSubData.mock.calls[0][2] as Float32Array;
    expect(uploaded).toHaveLength(10101 * 14);
    for (let index = 0; index < 10000; index++) {
      expect(uploaded[index * 14]).toBe(index);
      expect(uploaded[index * 14 + 13]).toBe(Number(index % 2 === 0));
    }
    expect(gl.vertexAttribDivisor.mock.calls).toEqual([
      [0, 0],
      [1, 1],
      [2, 1],
      [3, 1],
      [4, 1],
      [5, 1],
    ]);
    expect(gl.blendFunc).toHaveBeenCalledWith(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    renderer.begin();
    renderer.circle(10, 20, 4, 1, 'neutral', 0.22, false);
    expect(renderer.end()).toBe(true);
    expect(gl.bufferData).toHaveBeenCalledTimes(2);
    expect(gl.getError).toHaveBeenCalledTimes(2);
    expect(unavailable).not.toHaveBeenCalled();
    renderer.dispose();
  });

  it('retains line direction, outlined and filled circles, muted emphasis, focus and gate flashes', () => {
    const { canvas, gl, unavailable } = mockGpu();
    const renderer = createTradeParticleRenderer(canvas, unavailable)!;
    renderer.begin();
    renderer.line(2, 4, 8, 12, 2, 'negative', 0.12);
    renderer.circle(30, 40, 4, 1.2, 'positive', 0.86, true);
    renderer.circle(50, 60, 3, 0.9, 'negative', 0.12, false);
    renderer.circle(50, 60, 7, 2, 'focus', 1, false);
    renderer.circle(50, 84, 9, 0, 'positive', 0.28, true);
    renderer.end();
    const data = gl.bufferSubData.mock.calls[0][2] as Float32Array;
    expect(Array.from(data.slice(0, 4))).toEqual([5, 8, 6, 2]);
    expect(data[4]).toBeCloseTo(0.6);
    expect(data[5]).toBeCloseTo(0.8);
    expect(data[9]).toBeCloseTo(0.12);
    expect(Array.from(data.slice(10, 14))).toEqual([1, 5, 1, 1]);
    expect(data[14 + 13]).toBe(1);
    expect(data[28 + 13]).toBe(0);
    expect(data[42 + 9]).toBe(1);
    expect(data[42 + 11]).toBe(7);
    expect(data[56 + 9]).toBeCloseTo(0.28);
    renderer.dispose();
  });

  it('keeps shaded spheres in primitive order with theme colors and premultiplied blending', () => {
    const { canvas, gl, unavailable } = mockGpu();
    const renderer = createTradeParticleRenderer(canvas, unavailable)!;
    renderer.setColors?.({ ...PARTICLE_COLORS, positive: '#166e53' });
    renderer.begin();
    renderer.line(0, 12, 20, 12, 1, 'neutral', 0.2);
    renderer.sphere!(30, 40, 5, 'positive', 0.8);
    renderer.circle(30, 40, 7, 1, 'focus', 1, false);
    renderer.sphere!(50, 60, 4, 'focus', 2);
    expect(renderer.end()).toBe(true);
    const data = gl.bufferSubData.mock.calls[0][2] as Float32Array;
    expect(gl.drawArraysInstanced).toHaveBeenCalledExactlyOnceWith(gl.TRIANGLES, 0, 6, 4);
    expect(Array.from(data.slice(14, 20))).toEqual([30, 40, 6, 6, 1, 0]);
    expect(data[20]).toBeCloseTo(22 / 255);
    expect(data[21]).toBeCloseTo(110 / 255);
    expect(data[22]).toBeCloseTo(83 / 255);
    expect(data[23]).toBeCloseTo(0.8);
    expect(Array.from(data.slice(24, 28))).toEqual([2, 5, 0, 1]);
    expect(Array.from(data.slice(38, 42))).toEqual([0, 7, 0.5, 0]);
    expect(data[51]).toBe(1);
    expect(gl.blendFunc).toHaveBeenCalledWith(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    expect(unavailable).not.toHaveBeenCalled();
    renderer.dispose();
  });

  it('ignores invalid, empty or transparent spheres without poisoning valid geometry', () => {
    const { canvas, gl, unavailable } = mockGpu();
    const renderer = createTradeParticleRenderer(canvas, unavailable)!;
    renderer.begin();
    renderer.sphere!(NaN, 10, 4, 'focus', 1);
    renderer.sphere!(10, Infinity, 4, 'focus', 1);
    renderer.sphere!(10, 10, Infinity, 'focus', 1);
    renderer.sphere!(10, 10, -1, 'focus', 1);
    renderer.sphere!(10, 10, 0, 'focus', 1);
    renderer.sphere!(10, 10, 4, 'focus', NaN);
    renderer.sphere!(10, 10, 4, 'focus', 0);
    renderer.sphere!(10, 10, 4, 'focus', -1);
    renderer.sphere!(10, 10, 4, 'focus', 1);
    expect(renderer.end()).toBe(true);
    expect(gl.drawArraysInstanced).toHaveBeenCalledExactlyOnceWith(gl.TRIANGLES, 0, 6, 1);
    expect(Array.from(gl.bufferSubData.mock.calls[0][2] as Float32Array).every(Number.isFinite)).toBe(true);
    renderer.dispose();
  });

  it('fills every density segment in the same ordered GPU batch as its ridgeline and particles', () => {
    const { canvas, gl, unavailable } = mockGpu();
    const renderer = createTradeParticleRenderer(canvas, unavailable)!;
    const ridge = [
      { x: 10, y: 70 },
      { x: 30, y: 20 },
      { x: 50, y: 65 },
    ];
    const baseline = [
      { x: 10, y: 90 },
      { x: 30, y: 95 },
      { x: 50, y: 100 },
    ];
    renderer.begin();
    renderer.circle(5, 5, 2, 0, 'neutral', 1, true);
    renderer.surface!(ridge, baseline, 'positive', 0.2);
    renderer.line(10, 70, 30, 20, 1, 'positive', 0.4);
    renderer.sphere!(30, 20, 5, 'focus', 1);
    expect(renderer.end()).toBe(true);
    expect(gl.drawArraysInstanced).toHaveBeenCalledExactlyOnceWith(gl.TRIANGLES, 0, 6, 5);
    const uploaded = gl.bufferSubData.mock.calls[0][2] as Float32Array;
    expect([0, 1, 2, 3, 4].map((index) => uploaded[index * 14 + 10])).toEqual([0, 3, 3, 1, 2]);
    expect(Array.from(uploaded.slice(14, 20))).toEqual([10, 70, 30, 20, 10, 90]);
    expect(Array.from(uploaded.slice(25, 27))).toEqual([30, 95]);
    expect(Array.from(uploaded.slice(28, 34))).toEqual([30, 20, 50, 65, 30, 95]);
    expect(Array.from(uploaded.slice(39, 41))).toEqual([50, 100]);
    expect(uploaded[23]).toBeCloseTo(0.2);
    expect(unavailable).not.toHaveBeenCalled();
    renderer.dispose();
  });

  it('updates opaque surface backgrounds for the theme without resetting or reallocating the batch', () => {
    const { canvas, gl, unavailable } = mockGpu();
    const renderer = createTradeParticleRenderer(canvas, unavailable)!;
    renderer.begin();
    renderer.surface!(
      [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ],
      [
        { x: 1, y: 10 },
        { x: 3, y: 10 },
      ],
      'neutral',
      0
    );
    renderer.setBackground!('rgb(24, 19, 29)');
    renderer.setBackground!('var(--unresolved)');
    expect(gl.uniform3f).toHaveBeenCalledTimes(2);
    expect(gl.uniform3f).toHaveBeenLastCalledWith(expect.anything(), 24 / 255, 19 / 255, 29 / 255);
    expect(renderer.end()).toBe(true);
    expect(gl.drawArraysInstanced).toHaveBeenCalledExactlyOnceWith(gl.TRIANGLES, 0, 6, 1);
    expect(gl.bufferData).toHaveBeenCalledTimes(2);
    renderer.dispose();
    renderer.setBackground!('#fff');
    expect(gl.uniform3f).toHaveBeenCalledTimes(2);
  });

  it('rejects incomplete or invalid density surfaces without uploading partial geometry', () => {
    const { canvas, gl, unavailable } = mockGpu();
    const renderer = createTradeParticleRenderer(canvas, unavailable)!;
    const ridge = [
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ];
    const baseline = [
      { x: 1, y: 10 },
      { x: 3, y: 10 },
    ];
    renderer.begin();
    renderer.surface!([], [], 'neutral', 1);
    renderer.surface!(ridge.slice(0, 1), baseline.slice(0, 1), 'neutral', 1);
    renderer.surface!(ridge, baseline.slice(0, 1), 'neutral', 1);
    renderer.surface!([...ridge, { x: NaN, y: 2 }], [...baseline, { x: 5, y: 10 }], 'neutral', 1);
    renderer.surface!(ridge, [{ x: 1, y: Infinity }, baseline[1]], 'neutral', 1);
    renderer.surface!(ridge, baseline, 'neutral', NaN);
    renderer.surface!(ridge, baseline, 'neutral', -1);
    renderer.surface!(ridge, baseline, 'neutral', 2);
    expect(renderer.end()).toBe(true);
    expect(gl.drawArraysInstanced).toHaveBeenCalledExactlyOnceWith(gl.TRIANGLES, 0, 6, 1);
    const uploaded = gl.bufferSubData.mock.calls[0][2] as Float32Array;
    expect(uploaded[9]).toBe(1);
    expect(Array.from(uploaded).every(Number.isFinite)).toBe(true);
    renderer.dispose();
  });

  it('clears an empty frame and ignores only zero-length trails', () => {
    const { canvas, gl, unavailable } = mockGpu();
    const renderer = createTradeParticleRenderer(canvas, unavailable)!;
    renderer.begin();
    renderer.line(1, 1, 1, 1, 1, 'neutral', 1);
    expect(renderer.end()).toBe(true);
    expect(gl.clear).toHaveBeenCalledWith(gl.COLOR_BUFFER_BIT);
    expect(gl.drawArraysInstanced).not.toHaveBeenCalled();
    renderer.dispose();
  });

  it('bounds backing resolution and does not reset unchanged canvas dimensions', () => {
    const { canvas, gl, unavailable } = mockGpu();
    const width = vi.spyOn(canvas, 'width', 'set');
    const height = vi.spyOn(canvas, 'height', 'set');
    const renderer = createTradeParticleRenderer(canvas, unavailable)!;
    renderer.resize(900, 500, 3);
    renderer.resize(900, 500, 3);
    expect(width).toHaveBeenCalledExactlyOnceWith(1800);
    expect(height).toHaveBeenCalledExactlyOnceWith(1000);
    expect(gl.uniform2f).toHaveBeenLastCalledWith(expect.anything(), 900, 500);
    renderer.resize(900, 500, NaN);
    expect(canvas.width).toBe(900);
    expect(canvas.height).toBe(500);
    renderer.dispose();
  });

  it('falls back exactly once on context loss and disposes resources and listeners', () => {
    const { canvas, gl, unavailable, loseContext } = mockGpu();
    const renderer = createTradeParticleRenderer(canvas, unavailable)!;
    gl.isContextLost.mockReturnValue(true);
    canvas.dispatchEvent(new Event('webglcontextlost'));
    canvas.dispatchEvent(new Event('webglcontextlost'));
    expect(unavailable).toHaveBeenCalledOnce();
    expect(gl.deleteBuffer).toHaveBeenCalledTimes(2);
    expect(gl.deleteVertexArray).toHaveBeenCalledOnce();
    expect(gl.deleteProgram).toHaveBeenCalledOnce();
    expect(gl.deleteShader).toHaveBeenCalledTimes(2);
    expect(loseContext).not.toHaveBeenCalled();
    renderer.begin();
    renderer.circle(1, 2, 3, 1, 'positive', 1, true);
    renderer.resize(900, 500, 1);
    expect(renderer.end()).toBe(false);
    expect(gl.drawArraysInstanced).not.toHaveBeenCalled();
    renderer.dispose();
    expect(gl.deleteBuffer).toHaveBeenCalledTimes(2);
  });

  it.each(['allocation', 'drawing', 'draw-status'] as const)('falls back safely when %s fails', (stage) => {
    const { canvas, gl, unavailable } = mockGpu();
    const renderer = createTradeParticleRenderer(canvas, unavailable)!;
    if (stage === 'allocation') gl.getError.mockReturnValue(1285);
    else if (stage === 'draw-status') gl.getError.mockReturnValueOnce(0).mockReturnValueOnce(1282);
    else
      gl.drawArraysInstanced.mockImplementationOnce(() => {
        throw new Error('GPU reset');
      });
    renderer.begin();
    renderer.circle(1, 2, 3, 1, 'positive', 1, true);
    expect(renderer.end()).toBe(false);
    expect(unavailable).toHaveBeenCalledOnce();
    expect(renderer.end()).toBe(false);
    renderer.dispose();
  });

  it('releases the GPU context on unmount and ignores later loss events', () => {
    const { canvas, gl, unavailable, loseContext } = mockGpu();
    const renderer = createTradeParticleRenderer(canvas, unavailable)!;
    renderer.dispose();
    renderer.dispose();
    canvas.dispatchEvent(new Event('webglcontextlost'));
    expect(loseContext).toHaveBeenCalledOnce();
    expect(gl.deleteBuffer).toHaveBeenCalledTimes(2);
    expect(unavailable).not.toHaveBeenCalled();
  });
});
