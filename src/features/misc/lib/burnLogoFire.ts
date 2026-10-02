/** Decorative GPU fire. This module never receives wallet or monetary data. */
export type BurnFireVariant = 'tonswap' | 'sora';
export type BurnFireCapabilities = {
  reducedMotion: boolean;
  saveData?: boolean;
  hardwareConcurrency?: number;
  deviceMemory?: number;
};

/** Avoid animation on explicit accessibility/data-saving settings and constrained hardware. */
export function canAnimateBurnFire(capabilities: BurnFireCapabilities): boolean {
  return !(
    capabilities.reducedMotion ||
    capabilities.saveData ||
    (capabilities.hardwareConcurrency !== undefined && capabilities.hardwareConcurrency <= 2) ||
    (capabilities.deviceMemory !== undefined && capabilities.deviceMemory <= 2)
  );
}

export interface BurnFireRenderer {
  /** Draw one bounded-resolution frame; false means the static logo should take over. */
  draw(seconds: number): boolean;
  /** Release every GPU allocation when the illustration is removed or disabled. */
  dispose(): void;
}

const VERTEX = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() { v_uv = a_position * .5 + .5; gl_Position = vec4(a_position, 0., 1.); }
`;
const FRAGMENT = `
precision mediump float;
uniform sampler2D u_logo;
uniform float u_time;
uniform float u_blue;
varying vec2 v_uv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(hash(i), hash(i+vec2(1.,0.)), f.x),
    mix(hash(i+vec2(0.,1.)), hash(i+vec2(1.,1.)), f.x), f.y);
}
float turbulence(vec2 p) { return .57*noise(p) + .28*noise(p*2.03) + .15*noise(p*4.01); }
float mark(vec2 uv) {
  if (uv.x < 0. || uv.x > 1. || uv.y < 0. || uv.y > 1.) return 0.;
  vec4 pixel = texture2D(u_logo, uv);
  // The official Tonswap artwork has white symbol paths on a blue disc.
  // SORA's official SVG is a red silhouette with transparent negative space.
  return pixel.a * mix(1., smoothstep(.78, .95, min(pixel.r, min(pixel.g, pixel.b))), u_blue);
}
void main() {
  vec2 uv = v_uv;
  vec2 logo = (uv - vec2(.5, .43)) / .62 + .5;
  float n = turbulence(vec2(uv.x*9., uv.y*8.-u_time*1.65));
  float fine = turbulence(vec2(uv.x*18.+2., uv.y*15.-u_time*2.7));
  float body = mark(logo);
  float flame = 0.;
  for (int i=1; i<=6; i++) {
    float rise = float(i)*.047;
    float curl = sin(uv.y*13.-u_time*2.3+float(i))*.025 + (n-.5)*.095;
    float source = mark(logo-vec2(curl, rise));
    flame = max(flame, source*(1.-float(i)/7.)*smoothstep(.26+rise*.7, .7, n));
  }
  float edge = (mark(logo+vec2(.026,0.))+mark(logo-vec2(.026,0.))+
                mark(logo+vec2(0.,.026))+mark(logo-vec2(0.,.026)))*.25;
  float alpha = max(body*(.74+.26*fine), max(flame*.86, edge*.18));
  float heat = clamp(.2+n*.7+fine*.22, 0., 1.);
  vec3 low = mix(vec3(.68,.015,.045), vec3(.015,.17,.82), u_blue);
  vec3 high = mix(vec3(1.,.22,.09), vec3(.02,.75,1.), u_blue);
  vec3 white = mix(vec3(1.,.79,.56), vec3(.72,.98,1.), u_blue);
  vec3 color = mix(low, high, smoothstep(.2,.72,heat));
  color = mix(color, white, smoothstep(.78,1.,heat)*.8);
  alpha *= smoothstep(0.,.04,uv.y)*(1.-smoothstep(.91,1.,uv.y));
  gl_FragColor = vec4(color*alpha, alpha);
}
`;

/** Builds a small WebGL illustration from the actual brand SVG, with a fail-closed static fallback. */
export function createBurnFireRenderer(
  canvas: HTMLCanvasElement,
  logo: HTMLImageElement,
  variant: BurnFireVariant
): BurnFireRenderer | null {
  let gl: WebGLRenderingContext | null = null;
  const shaders: WebGLShader[] = [];
  let program: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;
  let texture: WebGLTexture | null = null;
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    if (!gl) return;
    if (texture) gl.deleteTexture(texture);
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    shaders.forEach((shader) => gl?.deleteShader(shader));
  };
  try {
    gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      powerPreference: 'low-power',
      failIfMajorPerformanceCaveat: true,
    });
    if (!gl) return null;
    // Fixed pixel budget: no viewport-sized canvas or high-DPI multiplier.
    canvas.width = 224;
    canvas.height = 224;
    program = gl.createProgram();
    if (!program) throw new Error('No fire program');
    for (const [type, source] of [
      [gl.VERTEX_SHADER, VERTEX],
      [gl.FRAGMENT_SHADER, FRAGMENT],
    ] as const) {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('No fire shader');
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Unsupported fire shader');
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Unsupported fire program');
    gl.useProgram(program);
    buffer = gl.createBuffer();
    texture = gl.createTexture();
    if (!buffer || !texture) throw new Error('No fire resources');
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // Rasterize the SVG through the browser: WebGL implementations do not all
    // accept an SVG-backed HTMLImageElement directly as a texture source.
    const raster = document.createElement('canvas');
    raster.width = 128;
    raster.height = 128;
    const rasterContext = raster.getContext('2d');
    if (!rasterContext) throw new Error('Unavailable logo rasterizer');
    rasterContext.drawImage(logo, 0, 0, 128, 128);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, raster);
    gl.uniform1i(gl.getUniformLocation(program, 'u_logo'), 0);
    gl.uniform1f(gl.getUniformLocation(program, 'u_blue'), variant === 'tonswap' ? 1 : 0);
    const time = gl.getUniformLocation(program, 'u_time');
    gl.viewport(0, 0, canvas.width, canvas.height);
    if (gl.getError() !== gl.NO_ERROR) throw new Error('Unavailable fire texture');
    return {
      draw(seconds) {
        try {
          if (disposed || !gl || gl.isContextLost()) return false;
          gl.uniform1f(time, seconds);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          return true;
        } catch {
          return false;
        }
      },
      dispose,
    };
  } catch {
    dispose();
    return null;
  }
}
