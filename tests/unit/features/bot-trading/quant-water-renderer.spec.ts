import { afterEach, describe, expect, it, vi } from 'vitest';

import { CAUSTIC_ROWS, CAUSTIC_TEXELS, createWaterSimulation } from '@/features/bot-trading/quant-water';
import {
  createWaterRenderer,
  parseWaterColor,
  WATER_FRAGMENT_SHADER,
} from '@/features/bot-trading/quant-water-renderer';

/** A deterministic WebGL boundary: no GPU, driver, image decode or network is involved. */
function createGpu() {
  const shaders = [{ kind: 'vertex' }, { kind: 'fragment' }];
  const program = { kind: 'program' };
  const buffer = { kind: 'buffer' };
  const textures = [{ kind: 'caustics' }, { kind: 'coins' }];
  const loseContext = vi.fn();
  const gl = {
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    COMPILE_STATUS: 3,
    LINK_STATUS: 4,
    ARRAY_BUFFER: 5,
    STATIC_DRAW: 6,
    FLOAT: 7,
    TEXTURE0: 8,
    TEXTURE1: 9,
    TEXTURE_2D: 10,
    UNPACK_ALIGNMENT: 11,
    UNPACK_PREMULTIPLY_ALPHA_WEBGL: 12,
    TEXTURE_MIN_FILTER: 13,
    TEXTURE_MAG_FILTER: 14,
    LINEAR: 15,
    TEXTURE_WRAP_S: 16,
    TEXTURE_WRAP_T: 17,
    CLAMP_TO_EDGE: 18,
    RGBA: 19,
    UNSIGNED_BYTE: 20,
    BLEND: 21,
    TRIANGLES: 22,
    HIGH_FLOAT: 23,
    NO_ERROR: 0,
    getShaderPrecisionFormat: vi.fn(() => ({ precision: 23, rangeMin: 127, rangeMax: 127 })),
    createProgram: vi.fn(() => program),
    createShader: vi.fn().mockReturnValueOnce(shaders[0]).mockReturnValueOnce(shaders[1]),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    attachShader: vi.fn(),
    bindAttribLocation: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    useProgram: vi.fn(),
    createBuffer: vi.fn(() => buffer),
    createTexture: vi.fn().mockReturnValueOnce(textures[0]).mockReturnValueOnce(textures[1]),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    activeTexture: vi.fn(),
    bindTexture: vi.fn(),
    pixelStorei: vi.fn(),
    texParameteri: vi.fn(),
    texImage2D: vi.fn(),
    getUniformLocation: vi.fn((_program: unknown, name: string) => name),
    uniform1i: vi.fn(),
    uniform1f: vi.fn(),
    uniform2f: vi.fn(),
    uniform3fv: vi.fn(),
    uniform4fv: vi.fn(),
    uniform1fv: vi.fn(),
    uniformMatrix3fv: vi.fn(),
    disable: vi.fn(),
    clearColor: vi.fn(),
    viewport: vi.fn(),
    getError: vi.fn(() => 0),
    isContextLost: vi.fn(() => false),
    drawArrays: vi.fn(),
    deleteTexture: vi.fn(),
    deleteBuffer: vi.fn(),
    deleteProgram: vi.fn(),
    deleteShader: vi.fn(),
    getExtension: vi.fn(() => ({ loseContext })),
  };
  const canvas = document.createElement('canvas');
  const getContext = vi.spyOn(canvas, 'getContext').mockReturnValue(gl as unknown as WebGLRenderingContext);
  /** The last value uploaded to a uniform, by name. */
  const uploaded = (method: keyof typeof gl, name: string) =>
    (gl[method] as ReturnType<typeof vi.fn>).mock.calls
      .filter(([location]) => location === name)
      .at(-1)
      ?.slice(1);
  return { gl, canvas, getContext, shaders, program, buffer, textures, loseContext, uploaded };
}

afterEach(() => vi.restoreAllMocks());

describe('water colour parsing', () => {
  it.each([
    ['#fff', [1, 1, 1]],
    ['#ED145B', [237 / 255, 20 / 255, 91 / 255]],
    ['rgb(248, 8, 123)', [248 / 255, 8 / 255, 123 / 255]],
    ['rgba(0, 51, 255, 0.5)', [0, 0.2, 1]],
    ['color(srgb 0.5 0.25 1)', [0.5, 0.25, 1]],
    ['color(srgb 1.2 -0.1 0.5)', [1, 0, 0.5]],
  ])('reads %s', (value, expected) => {
    parseWaterColor(value)!.forEach((channel, index) => expect(channel).toBeCloseTo(expected[index], 6));
  });

  it.each(['', 'pink', 'rgb(300, 0, 0)', 'hsl(0 100% 50%)', 'color(display-p3 1 0 0)'])('rejects %j', (value) => {
    expect(parseWaterColor(value)).toBeNull();
  });
});

describe('water fragment shader', () => {
  it('declares one uniform slot per bubble and bead and keeps WebGL1 high precision', () => {
    expect(WATER_FRAGMENT_SHADER).toContain('precision highp float;');
    expect(WATER_FRAGMENT_SHADER).toContain('uniform vec4 u_bubble[3];');
    expect(WATER_FRAGMENT_SHADER).toContain('uniform mat3 u_spin[3];');
    expect(WATER_FRAGMENT_SHADER).toContain('uniform vec4 u_bead[4];');
    // GLSL ES 1.00 reserves these words; using them breaks compilation on strict drivers.
    expect(WATER_FRAGMENT_SHADER).not.toMatch(/\b(half|fixed|input|output|sampler3D)\b/);
  });
});

describe('water WebGL renderer', () => {
  it('requests a low-power, fail-closed WebGL1 context and uploads the caustic table', () => {
    const { gl, canvas, getContext, textures } = createGpu();
    const renderer = createWaterRenderer(canvas);
    expect(renderer).not.toBeNull();
    expect(getContext).toHaveBeenCalledWith(
      'webgl',
      expect.objectContaining({
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        depth: false,
        powerPreference: 'low-power',
        failIfMajorPerformanceCaveat: true,
      })
    );
    expect(gl.shaderSource).toHaveBeenCalledWith({ kind: 'fragment' }, WATER_FRAGMENT_SHADER);
    expect(gl.bindTexture).toHaveBeenCalledWith(gl.TEXTURE_2D, textures[0]);
    const upload = gl.texImage2D.mock.calls.find((call) => call[3] === CAUSTIC_TEXELS);
    expect(upload?.slice(0, 8)).toEqual([
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      CAUSTIC_TEXELS,
      CAUSTIC_ROWS * 2,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
    ]);
    expect((upload?.[8] as Uint8Array).length).toBe(CAUSTIC_TEXELS * CAUSTIC_ROWS * 2 * 4);
    // Until coins are supplied the bubbles are clear water with white (untinted) caustics.
    expect(gl.uniform1f).toHaveBeenCalledWith('u_ink', 0);
    renderer?.dispose();
  });

  it('bounds the drawing buffer to two device pixels per CSS pixel and 0.6 megapixels', () => {
    const { gl, canvas, uploaded } = createGpu();
    const renderer = createWaterRenderer(canvas)!;
    renderer.resize(380, 278, 3);
    expect([canvas.width, canvas.height]).toEqual([760, 556]);
    expect(gl.viewport).toHaveBeenLastCalledWith(0, 0, 760, 556);
    expect(uploaded('uniform2f', 'u_resolution')).toEqual([760, 556]);
    renderer.resize(1600, 1170, 2);
    expect(canvas.width * canvas.height).toBeLessThanOrEqual(600_000 * 1.01);
    renderer.resize(200, 146, Number.NaN);
    expect([canvas.width, canvas.height]).toEqual([200, 146]);
    renderer.dispose();
  });

  it('turns theme colours into linear light that keeps the open card exact', () => {
    const { canvas, uploaded } = createGpu();
    const renderer = createWaterRenderer(canvas)!;
    renderer.setPalette({ surface: 'rgb(253, 247, 251)', pink: '#f8087b', violet: 'not a colour' });
    const display = uploaded('uniform3fv', 'u_surfaceDisplay')![0] as number[];
    const linear = uploaded('uniform3fv', 'u_surface')![0] as number[];
    display.forEach((channel, index) => expect(linear[index]).toBeCloseTo(channel ** 2.2, 6));
    (uploaded('uniform3fv', 'u_irradiance')![0] as number[]).forEach((channel) => expect(channel).toBeGreaterThan(0));
    // An unreadable probe falls back to the brand violet instead of black light.
    expect(Math.max(...(uploaded('uniform3fv', 'u_violet')![0] as number[]))).toBeCloseTo(1, 6);
    renderer.dispose();
  });

  it('prints coins from an atlas and tints light through the ink', () => {
    const { gl, canvas, textures, uploaded } = createGpu();
    const renderer = createWaterRenderer(canvas)!;
    const atlas = document.createElement('canvas');
    renderer.setCoins({
      canvas: atlas,
      tints: [
        [0.8, 0.1, 0.2],
        [1, 1, 1],
        [0, 0, 1],
      ],
    });
    expect(gl.bindTexture).toHaveBeenCalledWith(gl.TEXTURE_2D, textures[1]);
    expect(gl.pixelStorei).toHaveBeenCalledWith(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    expect(gl.texImage2D).toHaveBeenLastCalledWith(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
    expect(gl.pixelStorei).toHaveBeenLastCalledWith(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    expect(uploaded('uniform1f', 'u_ink')).toEqual([0.8]);
    const tints = Array.from(uploaded('uniform3fv', 'u_tint')![0] as Float32Array);
    expect(tints.slice(3, 6)).toEqual([1, 1, 1]);
    expect(tints[0]).toBeCloseTo(1 - 0.2 * 0.55, 6);
    expect(tints[8]).toBeCloseTo(1, 6);
    expect(tints[6]).toBeCloseTo(0.45, 6);

    renderer.setCoins(null);
    expect(uploaded('uniform1f', 'u_ink')).toEqual([0]);
    expect(Array.from(uploaded('uniform3fv', 'u_tint')![0] as Float32Array)).toEqual(Array(9).fill(1));
    renderer.dispose();
  });

  it('keeps bubbles clear when the coin atlas cannot be uploaded', () => {
    const { gl, canvas, uploaded } = createGpu();
    const renderer = createWaterRenderer(canvas)!;
    gl.getError.mockReturnValueOnce(1281);
    renderer.setCoins({ canvas: document.createElement('canvas'), tints: [[1, 0, 0]] });
    expect(uploaded('uniform1f', 'u_ink')).toEqual([0]);
    expect(renderer.draw(createWaterSimulation().frame())).toBe(true);
    renderer.dispose();
  });

  it('uploads every simulated bubble, coin and bead and draws one full-screen triangle', () => {
    const { gl, canvas, uploaded } = createGpu();
    const renderer = createWaterRenderer(canvas)!;
    const frame = createWaterSimulation().frame();
    expect(renderer.draw(frame)).toBe(true);
    expect(uploaded('uniform4fv', 'u_bubble')).toEqual([frame.bubbles]);
    expect(uploaded('uniformMatrix3fv', 'u_shape')).toEqual([false, frame.shapes]);
    expect(uploaded('uniform4fv', 'u_lobe')).toEqual([frame.lobes]);
    expect(uploaded('uniform1fv', 'u_reach')).toEqual([frame.reach]);
    expect(uploaded('uniformMatrix3fv', 'u_spin')).toEqual([false, frame.spins]);
    expect(uploaded('uniform4fv', 'u_bead')).toEqual([frame.beads]);
    expect(gl.drawArrays).toHaveBeenCalledWith(gl.TRIANGLES, 0, 3);
    renderer.dispose();
  });

  it.each([
    ['no WebGL context', (gpu: ReturnType<typeof createGpu>) => gpu.getContext.mockReturnValueOnce(null)],
    [
      'a context that throws',
      (gpu: ReturnType<typeof createGpu>) =>
        gpu.getContext.mockImplementationOnce(() => {
          throw new Error('GPU process unavailable');
        }),
    ],
    [
      'low fragment precision',
      (gpu: ReturnType<typeof createGpu>) =>
        gpu.gl.getShaderPrecisionFormat.mockReturnValueOnce({ precision: 0, rangeMin: 0, rangeMax: 0 }),
    ],
  ])('returns null with %s', (_label, arrange) => {
    const gpu = createGpu();
    arrange(gpu);
    expect(createWaterRenderer(gpu.canvas)).toBeNull();
    expect(gpu.gl.drawArrays).not.toHaveBeenCalled();
  });

  it.each(['compile', 'link', 'setup'] as const)('releases everything when %s fails', (failure) => {
    const { gl, canvas, shaders, program } = createGpu();
    if (failure === 'compile') gl.getShaderParameter.mockReturnValueOnce(true).mockReturnValueOnce(false);
    if (failure === 'link') gl.getProgramParameter.mockReturnValueOnce(false);
    if (failure === 'setup') gl.getError.mockReturnValueOnce(1282);
    expect(createWaterRenderer(canvas)).toBeNull();
    expect(gl.deleteProgram).toHaveBeenCalledExactlyOnceWith(program);
    expect(gl.deleteShader.mock.calls.map(([shader]) => shader)).toEqual(shaders);
    if (failure === 'setup') {
      expect(gl.deleteBuffer).toHaveBeenCalledTimes(1);
      expect(gl.deleteTexture).toHaveBeenCalledTimes(2);
    } else {
      expect(gl.createBuffer).not.toHaveBeenCalled();
    }
  });

  it('reports a lost context once and stops drawing', () => {
    const { gl, canvas, loseContext } = createGpu();
    const unavailable = vi.fn();
    const renderer = createWaterRenderer(canvas, unavailable)!;
    canvas.dispatchEvent(new Event('webglcontextlost'));
    canvas.dispatchEvent(new Event('webglcontextlost'));
    expect(unavailable).toHaveBeenCalledTimes(1);
    expect(renderer.draw(createWaterSimulation().frame())).toBe(false);
    expect(gl.drawArrays).not.toHaveBeenCalled();
    expect(loseContext).toHaveBeenCalledTimes(1);
  });

  it('treats a draw-time driver error as unavailable', () => {
    const { gl, canvas } = createGpu();
    const unavailable = vi.fn();
    const renderer = createWaterRenderer(canvas, unavailable)!;
    gl.getError.mockReturnValueOnce(1285);
    expect(renderer.draw(createWaterSimulation().frame())).toBe(false);
    expect(unavailable).toHaveBeenCalledTimes(1);
    expect(gl.deleteProgram).toHaveBeenCalledTimes(1);
  });

  it('disposes every allocation once and releases the context slot', () => {
    const { gl, canvas, program, buffer, textures, shaders, loseContext } = createGpu();
    const renderer = createWaterRenderer(canvas)!;
    renderer.dispose();
    renderer.dispose();
    expect(gl.deleteProgram).toHaveBeenCalledExactlyOnceWith(program);
    expect(gl.deleteBuffer).toHaveBeenCalledExactlyOnceWith(buffer);
    expect(gl.deleteTexture.mock.calls.map(([texture]) => texture)).toEqual(textures);
    expect(gl.deleteShader.mock.calls.map(([shader]) => shader)).toEqual(shaders);
    expect(loseContext).toHaveBeenCalledTimes(1);
    expect(renderer.draw(createWaterSimulation().frame())).toBe(false);
  });
});
