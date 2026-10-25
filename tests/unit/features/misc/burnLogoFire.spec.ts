import { afterEach, describe, expect, it, vi } from 'vitest';

import { canAnimateBurnFire, createBurnFireRenderer } from '@/features/misc/lib/burnLogoFire';

/** A deterministic GPU boundary: no WebGL implementation, device, image fetch, or network is used. */
function createGpu() {
  const shaders = [{ kind: 'vertex' }, { kind: 'fragment' }];
  const program = { kind: 'program' };
  const buffer = { kind: 'buffer' };
  const texture = { kind: 'texture' };
  const gl = {
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    COMPILE_STATUS: 3,
    LINK_STATUS: 4,
    ARRAY_BUFFER: 5,
    STATIC_DRAW: 6,
    FLOAT: 7,
    TEXTURE0: 8,
    TEXTURE_2D: 9,
    UNPACK_FLIP_Y_WEBGL: 10,
    TEXTURE_MIN_FILTER: 11,
    TEXTURE_MAG_FILTER: 12,
    LINEAR: 13,
    TEXTURE_WRAP_S: 14,
    TEXTURE_WRAP_T: 15,
    CLAMP_TO_EDGE: 16,
    RGBA: 17,
    UNSIGNED_BYTE: 18,
    TRIANGLE_STRIP: 19,
    NO_ERROR: 0,
    createProgram: vi.fn(() => program),
    createShader: vi.fn().mockReturnValueOnce(shaders[0]).mockReturnValueOnce(shaders[1]),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    useProgram: vi.fn(),
    createBuffer: vi.fn(() => buffer),
    createTexture: vi.fn(() => texture),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    getAttribLocation: vi.fn(() => 0),
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
    viewport: vi.fn(),
    getError: vi.fn(() => 0),
    isContextLost: vi.fn(() => false),
    drawArrays: vi.fn(),
    deleteTexture: vi.fn(),
    deleteBuffer: vi.fn(),
    deleteProgram: vi.fn(),
    deleteShader: vi.fn(),
  };
  const getContext = vi.fn(() => gl);
  const canvas = { width: 0, height: 0, getContext } as unknown as HTMLCanvasElement;
  const logo = document.createElement('img');
  const rasterContext = { drawImage: vi.fn() };
  const getRasterContext = vi
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue(rasterContext as unknown as CanvasRenderingContext2D);
  return { gl, getContext, canvas, logo, shaders, program, buffer, texture, rasterContext, getRasterContext };
}

afterEach(() => vi.restoreAllMocks());

describe('burn fire capability policy', () => {
  it('allows normal hardware without requiring optional capability reports', () => {
    expect(canAnimateBurnFire({ reducedMotion: false })).toBe(true);
    expect(canAnimateBurnFire({ reducedMotion: false, hardwareConcurrency: 4, deviceMemory: 4 })).toBe(true);
  });

  it.each([
    { reducedMotion: true },
    { reducedMotion: false, saveData: true },
    { reducedMotion: false, hardwareConcurrency: 1 },
    { reducedMotion: false, hardwareConcurrency: 2 },
    { reducedMotion: false, deviceMemory: 1 },
    { reducedMotion: false, deviceMemory: 2 },
  ])('keeps the static logo for %j', (capabilities) => {
    expect(canAnimateBurnFire(capabilities)).toBe(false);
  });
});

describe('burn fire WebGL renderer', () => {
  it.each(['tonswap', 'sora'] as const)('uses the real %s logo with a fixed low-power pixel budget', (variant) => {
    const { gl, getContext, canvas, logo, rasterContext, getRasterContext } = createGpu();
    const renderer = createBurnFireRenderer(canvas, logo, variant);
    expect(renderer).not.toBeNull();
    expect(getContext).toHaveBeenCalledWith(
      'webgl',
      expect.objectContaining({
        powerPreference: 'low-power',
        failIfMajorPerformanceCaveat: true,
        antialias: false,
        depth: false,
      })
    );
    expect([canvas.width, canvas.height]).toEqual([224, 224]);
    expect(gl.viewport).toHaveBeenCalledWith(0, 0, 224, 224);
    expect(getRasterContext).toHaveBeenCalledWith('2d');
    expect(rasterContext.drawImage).toHaveBeenCalledWith(logo, 0, 0, 128, 128);
    expect(gl.texImage2D).toHaveBeenCalledWith(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      expect.objectContaining({ width: 128, height: 128 })
    );
    expect(gl.uniform1f).toHaveBeenCalledWith('u_blue', variant === 'tonswap' ? 1 : 0);
    expect(renderer?.draw(1.25)).toBe(true);
    expect(gl.uniform1f).toHaveBeenLastCalledWith('u_time', 1.25);
    expect(gl.drawArrays).toHaveBeenCalledWith(gl.TRIANGLE_STRIP, 0, 4);
    renderer?.dispose();
  });

  it('returns a static fallback when WebGL is unavailable or context creation throws', () => {
    const { canvas, logo, getContext } = createGpu();
    getContext.mockReturnValueOnce(null as never).mockImplementationOnce(() => {
      throw new Error('GPU unavailable');
    });
    expect(createBurnFireRenderer(canvas, logo, 'tonswap')).toBeNull();
    expect(createBurnFireRenderer(canvas, logo, 'tonswap')).toBeNull();
  });

  it('cleans a partially compiled program when a shader fails', () => {
    const { gl, canvas, logo, shaders, program } = createGpu();
    gl.getShaderParameter.mockReturnValueOnce(false);
    expect(createBurnFireRenderer(canvas, logo, 'sora')).toBeNull();
    expect(gl.deleteShader).toHaveBeenCalledExactlyOnceWith(shaders[0]);
    expect(gl.deleteProgram).toHaveBeenCalledExactlyOnceWith(program);
    expect(gl.createBuffer).not.toHaveBeenCalled();
  });

  it('cleans both shaders when program linking fails', () => {
    const { gl, canvas, logo, shaders } = createGpu();
    gl.getProgramParameter.mockReturnValueOnce(false);
    expect(createBurnFireRenderer(canvas, logo, 'sora')).toBeNull();
    expect(gl.deleteShader.mock.calls.map(([shader]) => shader)).toEqual(shaders);
    expect(gl.deleteProgram).toHaveBeenCalledTimes(1);
  });

  it.each(['texture allocation', 'texture upload', 'GPU error'] as const)(
    'cleans allocations after %s fails',
    (failure) => {
      const { gl, canvas, logo, buffer, texture } = createGpu();
      if (failure === 'texture allocation') gl.createTexture.mockReturnValueOnce(null as never);
      if (failure === 'texture upload')
        gl.texImage2D.mockImplementationOnce(() => {
          throw new Error('Invalid texture');
        });
      if (failure === 'GPU error') gl.getError.mockReturnValueOnce(1282);
      expect(createBurnFireRenderer(canvas, logo, 'tonswap')).toBeNull();
      expect(gl.deleteBuffer).toHaveBeenCalledExactlyOnceWith(buffer);
      if (failure === 'texture allocation') expect(gl.deleteTexture).not.toHaveBeenCalled();
      else expect(gl.deleteTexture).toHaveBeenCalledExactlyOnceWith(texture);
      expect(gl.deleteShader).toHaveBeenCalledTimes(2);
      expect(gl.deleteProgram).toHaveBeenCalledTimes(1);
    }
  );

  it('returns false after context loss without drawing', () => {
    const { gl, canvas, logo } = createGpu();
    const renderer = createBurnFireRenderer(canvas, logo, 'tonswap');
    gl.isContextLost.mockReturnValue(true);
    expect(renderer?.draw(1)).toBe(false);
    expect(gl.drawArrays).not.toHaveBeenCalled();
    renderer?.dispose();
  });

  it('falls back and cleans resources when browser SVG rasterization is unavailable', () => {
    const { gl, canvas, logo, getRasterContext } = createGpu();
    getRasterContext.mockReturnValueOnce(null);
    expect(createBurnFireRenderer(canvas, logo, 'tonswap')).toBeNull();
    expect(gl.texImage2D).not.toHaveBeenCalled();
    expect(gl.deleteProgram).toHaveBeenCalledTimes(1);
    expect(gl.deleteShader).toHaveBeenCalledTimes(2);
    expect(gl.deleteBuffer).toHaveBeenCalledTimes(1);
    expect(gl.deleteTexture).toHaveBeenCalledTimes(1);
  });

  it('returns false on a draw-time driver exception so the component can restore its static logo', () => {
    const { gl, canvas, logo } = createGpu();
    const renderer = createBurnFireRenderer(canvas, logo, 'tonswap');
    gl.drawArrays.mockImplementationOnce(() => {
      throw new Error('Driver failure');
    });
    expect(renderer?.draw(1)).toBe(false);
    renderer?.dispose();
  });

  it('disposes every allocation once and never draws after disposal', () => {
    const { gl, canvas, logo, program, buffer, texture, shaders } = createGpu();
    const renderer = createBurnFireRenderer(canvas, logo, 'sora');
    renderer?.dispose();
    renderer?.dispose();
    expect(gl.deleteProgram).toHaveBeenCalledExactlyOnceWith(program);
    expect(gl.deleteBuffer).toHaveBeenCalledExactlyOnceWith(buffer);
    expect(gl.deleteTexture).toHaveBeenCalledExactlyOnceWith(texture);
    expect(gl.deleteShader.mock.calls.map(([shader]) => shader)).toEqual(shaders);
    expect(renderer?.draw(1)).toBe(false);
    expect(gl.drawArrays).not.toHaveBeenCalled();
  });
});
