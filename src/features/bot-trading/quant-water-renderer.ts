import {
  CAUSTIC_RHO_MAX,
  CAUSTIC_ROWS,
  CAUSTIC_S_MAX,
  CAUSTIC_SCALE,
  CAUSTIC_TEXELS,
  WATER_AMBIENT_SHARE,
  WATER_BEAD_COUNT,
  WATER_BUBBLE_COUNT,
  WATER_CAMERA_DISTANCE,
  WATER_IOR,
  WATER_LIGHTS,
  WATER_VIEW,
  sharedCausticTable,
  type Vec3,
  type WaterFrame,
  type WaterLight,
} from './quant-water';
import { COIN_SLOTS, type CoinAtlas } from './quant-water-coins';

/** Presentation colours read from theme probes; any CSS colour the browser resolves. */
export interface WaterPalette {
  /** The card colour visible behind the art. */
  surface: string;
  pink: string;
  violet: string;
}

/** Ray-traced water bubbles. Draw failures return false so the component can fall back. */
export interface WaterRenderer {
  setPalette(palette: WaterPalette): void;
  /** Print coin logos around the bubbles (slot i on bubble i); null keeps them clear. */
  setCoins(atlas: CoinAtlas | null): void;
  /** CSS size and device-pixel ratio; the pixel ratio is clamped to a bounded budget. */
  resize(width: number, height: number, ratio: number): void;
  draw(frame: WaterFrame): boolean;
  dispose(): void;
}

type Rgb = [number, number, number];

/**
 * Parse a browser-resolved colour: `#rgb`, `#rrggbb`, `rgb()`/`rgba()` or `color(srgb …)`
 * (how browsers report `color-mix`). Returns sRGB channels in 0…1, or null.
 */
export function parseWaterColor(value: string): Rgb | null {
  const text = value.trim();
  const hex = text.match(/^#([a-f\d]{3}|[a-f\d]{6})$/i)?.[1];
  if (hex) {
    const full = hex.length === 3 ? [...hex].map((digit) => digit + digit).join('') : hex;
    return [0, 2, 4].map((offset) => parseInt(full.slice(offset, offset + 2), 16) / 255) as Rgb;
  }
  const rgb = text.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  if (rgb) {
    const channels = rgb.slice(1, 4).map((channel) => Number(channel) / 255);
    return channels.every((channel) => Number.isFinite(channel) && channel >= 0 && channel <= 1)
      ? (channels as Rgb)
      : null;
  }
  const srgb = text.match(/^color\(\s*srgb\s+([\d.e-]+)\s+([\d.e-]+)\s+([\d.e-]+)/i);
  if (srgb) {
    const channels = srgb.slice(1, 4).map(Number);
    return channels.every((channel) => Number.isFinite(channel))
      ? (channels.map((channel) => Math.min(1, Math.max(0, channel))) as Rgb)
      : null;
  }
  return null;
}

const GAMMA = 2.2;
const toLinear = (color: Rgb): Rgb => color.map((channel) => channel ** GAMMA) as Rgb;
/** Normalise a light colour to a unit peak so the light's share alone sets its strength. */
const unitPeak = (color: Rgb): Rgb => {
  const peak = Math.max(...color, 1e-4);
  return color.map((channel) => channel / peak) as Rgb;
};
const mixRgb = (a: Rgb, b: Rgb, amount: number): Rgb =>
  a.map((channel, index) => channel + (b[index] - channel) * amount) as Rgb;

const FALLBACK: Record<keyof WaterPalette, Rgb> = {
  surface: [0.976, 0.949, 0.965],
  pink: [0.973, 0.031, 0.482],
  violet: [0.62, 0.36, 0.82],
};
/** Warm white key light, slightly below daylight so pink highlights stay clean. */
const KEY_COLOR: Rgb = [1, 0.97, 0.93];

const glsl = (value: number) => (Number.isInteger(value) ? `${value}.0` : `${value}`);
const vec3 = (value: Vec3) => `vec3(${value.map((part) => glsl(Number(part.toFixed(5)))).join(', ')})`;

/** Orthonormal tangent frame for a softbox facing the scene. */
function frame(direction: Vec3): { right: Vec3; up: Vec3 } {
  const [x, y, z] = direction;
  // right = normalize(worldUp × direction), up = direction × right.
  const length = Math.hypot(z, x);
  const right: Vec3 = [z / length, 0, -x / length];
  const up: Vec3 = [y * right[2] - z * right[1], z * right[0] - x * right[2], x * right[1] - y * right[0]];
  return { right, up };
}

function lightConstants(name: string, light: WaterLight): string {
  const { right, up } = frame(light.direction);
  return [
    `const vec3 ${name}_DIR = ${vec3(light.direction)};`,
    `const vec3 ${name}_RIGHT = ${vec3(right)};`,
    `const vec3 ${name}_UP = ${vec3(up)};`,
    `const vec2 ${name}_SIZE = vec2(${glsl(light.size[0])}, ${glsl(light.size[1])});`,
    `const float ${name}_CORNER = ${glsl(light.corner)};`,
    `const float ${name}_RADIANCE = ${glsl(light.radiance)};`,
    `const float ${name}_SHARE = ${glsl(light.share)};`,
  ].join('\n');
}

const VERTEX_SHADER = `
attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

/**
 * One full-screen pass. Each pixel traces the bubbles (star-shaped surfaces bounded by a sphere,
 * found by bisection), shades water with exact Fresnel, refraction, one internal reflection and
 * Beer–Lambert absorption, and sees a backdrop lit by three lights whose shadows and caustics
 * come from the ball-lens table, plus sphere ambient occlusion. The open backdrop is transparent,
 * so the real card shows through; shadows darken it and caustics add light to it.
 * Each bubble carries a coin logo printed around its surface, mapped by an azimuthal projection
 * so it wraps the sphere. Facing the viewer it sits under the glossy water film; turned away it
 * is seen mirrored through the water, and light through the ink tints the bubble's caustic.
 */
export const WATER_FRAGMENT_SHADER = `
precision highp float;

uniform vec2 u_resolution;
uniform vec4 u_bubble[${WATER_BUBBLE_COUNT}];
uniform mat3 u_shape[${WATER_BUBBLE_COUNT}];
uniform vec4 u_lobe[${WATER_BUBBLE_COUNT}];
uniform float u_reach[${WATER_BUBBLE_COUNT}];
uniform vec4 u_bead[${WATER_BEAD_COUNT}];
uniform vec3 u_surface;
uniform vec3 u_surfaceDisplay;
uniform vec3 u_room;
uniform vec3 u_ambient;
uniform vec3 u_key;
uniform vec3 u_pink;
uniform vec3 u_violet;
uniform vec3 u_irradiance;
uniform sampler2D u_caustics;
uniform mat3 u_spin[${WATER_BUBBLE_COUNT}];
uniform vec3 u_tint[${WATER_BUBBLE_COUNT}];
uniform float u_ink;
uniform sampler2D u_coins;

const vec2 VIEW = vec2(${glsl(WATER_VIEW[0])}, ${glsl(WATER_VIEW[1])});
const float CAMERA = ${glsl(WATER_CAMERA_DISTANCE)};
const float IOR = ${glsl(WATER_IOR[1])};
const vec3 ABSORPTION = vec3(0.16, 0.035, 0.025);
const float RHO_MAX = ${glsl(CAUSTIC_RHO_MAX)};
const float S_MAX = ${glsl(CAUSTIC_S_MAX)};
const float ROWS = ${glsl(CAUSTIC_ROWS)};
const float SCALE = ${glsl(CAUSTIC_SCALE)};
const float AMBIENT_SHARE = ${glsl(WATER_AMBIENT_SHARE)};
const float OCCLUSION = 0.55;
const float SHARP = 0.012;
const float SOFT = 0.22;
const float COIN_SLOTS = ${glsl(COIN_SLOTS)};
// Angular radius of the printed cap: past 60° it visibly wraps around the curve of the bubble.
const float CAP = 1.2;
${lightConstants('KEY', WATER_LIGHTS.key)}
${lightConstants('PINK', WATER_LIGHTS.pink)}
${lightConstants('VIOLET', WATER_LIGHTS.violet)}

float fresnel(float cosI, float eta) {
  float sinT2 = eta * eta * (1.0 - cosI * cosI);
  if (sinT2 >= 1.0) return 1.0;
  float cosT = sqrt(1.0 - sinT2);
  float rs = (eta * cosI - cosT) / (eta * cosI + cosT);
  float rp = (cosI - eta * cosT) / (cosI + eta * cosT);
  return 0.5 * (rs * rs + rp * rp);
}

// Irradiance behind one drop for one light, relative to the unblocked light. A drop stretched
// by its l = 2 shape stretches its shadow and caustic the same way, so they wobble with it.
// Light through a printed bubble takes on its ink colour (tint is white for clear drops).
vec3 caustic(vec3 q, vec4 drop, mat3 shape, vec3 dir, float band, vec3 tint) {
  vec3 w = drop.xyz - q;
  float s = dot(w, dir);
  if (s <= 0.0) return vec3(1.0);
  vec3 offset = w - dir * s;
  float radial = length(offset - shape * offset) / drop.w;
  float rho = radial / RHO_MAX;
  if (rho >= 1.0) return vec3(1.0);
  float v = min(s / (drop.w * S_MAX), 1.0);
  vec2 uv = vec2(rho, (band * ROWS + 0.5 + v * (ROWS - 1.0)) / (2.0 * ROWS));
  vec3 e = min(texture2D(u_caustics, uv).rgb, vec3(0.996));
  vec3 light = mix(SCALE * e / (1.0 - e), vec3(1.0), smoothstep(0.85, 1.0, rho));
  return light * mix(tint, vec3(1.0), smoothstep(0.85, 1.1, radial));
}

// Cosine-weighted share of the sky a sphere hides from a backdrop point.
float occlusion(vec3 q, vec4 drop) {
  vec3 w = drop.xyz - q;
  float l2 = dot(w, w);
  return 1.0 - OCCLUSION * drop.w * drop.w * max(w.z, 0.0) / (l2 * sqrt(l2));
}

vec3 backdrop(vec3 q) {
  vec3 key = vec3(1.0);
  vec3 pink = vec3(1.0);
  vec3 violet = vec3(1.0);
  float ambient = 1.0;
  for (int i = 0; i < ${WATER_BUBBLE_COUNT}; i++) {
    key *= caustic(q, u_bubble[i], u_shape[i], KEY_DIR, 0.0, u_tint[i]);
    pink *= caustic(q, u_bubble[i], u_shape[i], PINK_DIR, 0.0, u_tint[i]);
    violet *= caustic(q, u_bubble[i], u_shape[i], VIOLET_DIR, 1.0, u_tint[i]);
    ambient *= occlusion(q, u_bubble[i]);
  }
  for (int j = 0; j < ${WATER_BEAD_COUNT}; j++) {
    key *= caustic(q, u_bead[j], mat3(0.0), KEY_DIR, 0.0, vec3(1.0));
    pink *= caustic(q, u_bead[j], mat3(0.0), PINK_DIR, 0.0, vec3(1.0));
    ambient *= occlusion(q, u_bead[j]);
  }
  vec3 light = AMBIENT_SHARE * u_ambient * ambient
    + KEY_SHARE * KEY_DIR.z * u_key * key
    + PINK_SHARE * PINK_DIR.z * u_pink * pink
    + VIOLET_SHARE * VIOLET_DIR.z * u_violet * violet;
  return u_surface * light / u_irradiance;
}

float softbox(vec3 d, vec3 axis, vec3 right, vec3 up, vec2 size, float corner, float blur) {
  float c = dot(d, axis);
  if (c <= 0.05) return 0.0;
  vec2 p = vec2(dot(d, right), dot(d, up)) / c;
  vec2 q = abs(p) - size + corner;
  float edge = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - corner;
  float panel = 1.0 - smoothstep(-blur, blur, edge);
  // A slightly hotter centre and a faint halo read as a real diffuser, not a flat sticker.
  return panel * (0.82 + 0.18 * (1.0 - dot(p / size, p / size) * 0.5)) + 0.06 * exp(-max(edge, 0.0) * 10.0);
}

// The studio in front of the card: a dim room, brighter overhead, darker behind the camera.
// blur widens the softbox edges for paths that a wobbling surface smears.
vec3 environment(vec3 d, float blur) {
  vec3 color = u_room * (0.5 + 0.8 * clamp(d.y * 0.5 + 0.5, 0.0, 1.0));
  color *= 1.0 - 0.5 * smoothstep(0.5, 1.0, d.z);
  color += u_key * KEY_RADIANCE * softbox(d, KEY_DIR, KEY_RIGHT, KEY_UP, KEY_SIZE, KEY_CORNER, blur);
  color += u_pink * PINK_RADIANCE * softbox(d, PINK_DIR, PINK_RIGHT, PINK_UP, PINK_SIZE, PINK_CORNER, blur);
  color += u_violet * VIOLET_RADIANCE * softbox(d, VIOLET_DIR, VIOLET_RIGHT, VIOLET_UP, VIOLET_SIZE, VIOLET_CORNER, blur);
  return color;
}

vec3 sky(vec3 o, vec3 d, float blur) {
  if (d.z < -0.0005) return backdrop(o - d * (o.z / d.z));
  return environment(d, blur);
}

float sphereHit(vec3 o, vec3 d, vec4 s) {
  vec3 oc = o - s.xyz;
  float b = dot(oc, d);
  float h = b * b - dot(oc, oc) + s.w * s.w;
  if (h <= 0.0) return -1.0;
  float t = -b - sqrt(h);
  return t > 0.001 ? t : -1.0;
}

// A neighbouring drop seen in a reflection or through refraction, traced as a sphere.
vec3 neighbour(vec3 p, vec3 d, vec4 s) {
  vec3 n = (p - s.xyz) / s.w;
  float f = fresnel(clamp(-dot(d, n), 0.0, 1.0), 1.0 / IOR);
  vec3 inner = refract(d, n, 1.0 / IOR);
  float chord = -2.0 * s.w * dot(inner, n);
  vec3 q = p + inner * chord;
  vec3 leaving = refract(inner, -(q - s.xyz) / s.w, IOR);
  vec3 through = dot(leaving, leaving) > 0.5 ? sky(q, leaving, SHARP) : environment(inner, SOFT);
  return f * sky(p, reflect(d, n), SHARP) + (1.0 - f) * (1.0 - f) * through * exp(-ABSORPTION * chord);
}

vec3 outside(vec3 o, vec3 d, int self) {
  float best = 1e9;
  vec4 hit = vec4(0.0);
  for (int i = 0; i < ${WATER_BUBBLE_COUNT}; i++) {
    if (i == self) continue;
    float t = sphereHit(o, d, u_bubble[i]);
    if (t > 0.0 && t < best) { best = t; hit = u_bubble[i]; }
  }
  for (int j = 0; j < ${WATER_BEAD_COUNT}; j++) {
    if (j + ${WATER_BUBBLE_COUNT} == self) continue;
    float t = sphereHit(o, d, u_bead[j]);
    if (t > 0.0 && t < best) { best = t; hit = u_bead[j]; }
  }
  if (best < 1e8) return neighbour(o + d * best, d, hit);
  return sky(o, d, SHARP);
}

// The coin printed around a bubble, seen at outward direction n: linear colour and ink alpha.
// The logo covers a cap of angular radius CAP around the coin's local +z axis.
vec4 coin(float slot, vec3 n, mat3 spin) {
  vec3 local = spin * n;
  float span = length(local.xy);
  float theta = acos(clamp(local.z, -1.0, 1.0));
  vec2 d = (span > 1e-6 ? local.xy / span : vec2(0.0)) * (theta / CAP);
  vec2 uv = clamp(vec2(0.5 + 0.5 * d.x, 0.5 - 0.5 * d.y), 0.0, 1.0);
  vec4 texel = texture2D(u_coins, vec2((slot + uv.x) / COIN_SLOTS, uv.y));
  float alpha = texel.a * u_ink * step(dot(d, d), 1.0);
  return vec4(pow(texel.rgb / max(texel.a, 0.004), vec3(2.2)), alpha);
}

// Light falling on the print, relative to the open backdrop, so logos keep their brand colours.
vec3 printLight(vec3 n) {
  vec3 light = AMBIENT_SHARE * u_ambient * (0.8 + 0.2 * n.y)
    + KEY_SHARE * u_key * max(dot(n, KEY_DIR), 0.0)
    + PINK_SHARE * u_pink * max(dot(n, PINK_DIR), 0.0)
    + VIOLET_SHARE * u_violet * max(dot(n, VIOLET_DIR), 0.0);
  return light / u_irradiance;
}

// Surface of a wobbling drop: r(n) = R (1 + nᵀQn + a·P3(n·axis)).
float wobble(vec3 n, mat3 shape, vec4 lobe) {
  float x = dot(n, lobe.xyz);
  return dot(n, shape * n) + lobe.w * x * (2.5 * x * x - 1.5);
}

float gap(vec3 p, vec4 drop, mat3 shape, vec4 lobe) {
  vec3 o = p - drop.xyz;
  float l = max(length(o), 1e-5);
  return l - drop.w * (1.0 + wobble(o / l, shape, lobe));
}

vec3 surfaceNormal(vec3 p, vec4 drop, mat3 shape, vec4 lobe) {
  vec3 o = p - drop.xyz;
  float l = max(length(o), 1e-5);
  vec3 n = o / l;
  float x = dot(n, lobe.xyz);
  vec3 g = 2.0 * (shape * n) + lobe.w * (7.5 * x * x - 1.5) * lobe.xyz;
  return normalize(n - (drop.w / l) * (g - n * dot(n, g)));
}

// Entry distance along the ray, or -1. clearance is the surface gap at the closest approach.
float enter(vec3 ro, vec3 rd, vec4 drop, mat3 shape, vec4 lobe, float reach, out float clearance, out float closest) {
  vec3 oc = ro - drop.xyz;
  float b = dot(oc, rd);
  float bound = drop.w * reach;
  float h = b * b - dot(oc, oc) + bound * bound;
  closest = -b;
  if (h <= 0.0) {
    clearance = sqrt(max(dot(oc, oc) - b * b, 0.0)) - bound;
    return -1.0;
  }
  float span = sqrt(h);
  clearance = gap(ro + rd * closest, drop, shape, lobe);
  float inside = closest;
  float early = gap(ro + rd * (closest - 0.4 * span), drop, shape, lobe);
  if (early < clearance) { clearance = early; inside = closest - 0.4 * span; }
  float late = gap(ro + rd * (closest + 0.4 * span), drop, shape, lobe);
  if (late < clearance) { clearance = late; inside = closest + 0.4 * span; }
  closest = inside;
  if (clearance > 0.0) return -1.0;
  float near = closest - span;
  float far = inside;
  for (int k = 0; k < 12; k++) {
    float t = 0.5 * (near + far);
    if (gap(ro + rd * t, drop, shape, lobe) > 0.0) near = t; else far = t;
  }
  return 0.5 * (near + far);
}

// Distance from a point inside the drop to where the ray leaves it.
float leave(vec3 p, vec3 d, vec4 drop, mat3 shape, vec4 lobe, float reach) {
  vec3 oc = p - drop.xyz;
  float b = dot(oc, d);
  float bound = drop.w * reach;
  float far = -b + sqrt(max(b * b - dot(oc, oc) + bound * bound, 0.0));
  float near = max(-b, 0.0);
  for (int k = 0; k < 10; k++) {
    float t = 0.5 * (near + far);
    if (gap(p + d * t, drop, shape, lobe) > 0.0) far = t; else near = t;
  }
  return 0.5 * (near + far);
}

vec3 water(vec3 p, vec3 rd, vec4 drop, mat3 shape, vec4 lobe, float reach, int self, mat3 spin) {
  vec3 n = surfaceNormal(p, drop, shape, lobe);
  float slot = float(self);
  bool printed = self < ${WATER_BUBBLE_COUNT};
  float f = fresnel(clamp(-dot(rd, n), 0.0, 1.0), 1.0 / IOR);
  vec3 color = f * outside(p + n * 0.001, reflect(rd, n), self);

  vec3 d1 = refract(rd, n, 1.0 / IOR);
  float t1 = leave(p, d1, drop, shape, lobe, reach);
  vec3 p2 = p + d1 * t1;
  vec3 n2 = surfaceNormal(p2, drop, shape, lobe);
  float f2 = fresnel(clamp(dot(d1, n2), 0.0, 1.0), IOR);
  vec3 inside = vec3(0.0);
  if (f2 < 1.0) inside += (1.0 - f2) * outside(p2 + n2 * 0.001, refract(d1, -n2, IOR), self);

  // Light reflected once inside the drop: the bright glint opposite the key highlight.
  vec3 d2 = reflect(d1, n2);
  float t2 = leave(p2, d2, drop, shape, lobe, reach);
  vec3 p3 = p2 + d2 * t2;
  vec3 n3 = surfaceNormal(p3, drop, shape, lobe);
  float f3 = fresnel(clamp(dot(d2, n3), 0.0, 1.0), IOR);
  vec3 second = f3 < 1.0 ? (1.0 - f3) * sky(p3 + n3 * 0.001, refract(d2, -n3, IOR), SOFT) : 0.35 * environment(d2, SOFT);
  // A wobbling surface smears this second image, so it reads dimmer than the ideal mirror.
  inside += 0.6 * f2 * second * exp(-ABSORPTION * t2);

  if (printed) {
    // The print where the ray leaves, seen from inside and mirrored: lit through the water.
    vec4 far = coin(slot, normalize(p2 - drop.xyz), spin);
    inside = mix(inside, far.rgb * (0.55 * printLight(-n2) + 0.35 * printLight(n2)), far.a);
    // The print where the ray enters sits just under the water film, so reflections glaze it.
    vec4 near = coin(slot, normalize(p - drop.xyz), spin);
    return color + (1.0 - f) * mix(inside * exp(-ABSORPTION * t1), near.rgb * printLight(n), near.a);
  }
  return color + (1.0 - f) * inside * exp(-ABSORPTION * t1);
}

vec3 display(vec3 linear) {
  // Overexposed highlights bleed toward white like film instead of clipping to a hue.
  float peak = max(max(linear.r, linear.g), linear.b);
  linear += vec3(max(peak - 1.0, 0.0) * 0.35);
  return pow(clamp(linear, 0.0, 1.0), vec3(${glsl(1 / GAMMA)}));
}

// Composite over the real card behind the canvas. With the card at u_surfaceDisplay, this finds
// the smallest alpha whose valid premultiplied colour (rgb <= alpha) reproduces the shaded colour,
// so open backdrop stays transparent and any card tint or gradient still shows through.
// headroom bounds how hard light may push a near-white card toward white: caustics there become
// gentle glows instead of opaque blobs, while bubbles (headroom ~0) keep exact white highlights.
vec4 catcher(vec3 linear, float headroom) {
  vec3 shown = display(linear);
  vec3 base = u_surfaceDisplay;
  vec3 lighter = max(shown - base, 0.0) / max(1.0 - base, vec3(headroom));
  vec3 darker = 1.0 - shown / max(base, vec3(0.001));
  vec3 need = max(lighter, darker);
  float alpha = clamp(max(max(need.r, need.g), need.b), 0.0, 1.0);
  return vec4(clamp(shown - base * (1.0 - alpha), 0.0, alpha), alpha);
}

void main() {
  vec2 ndc = gl_FragCoord.xy / u_resolution * 2.0 - 1.0;
  vec3 target = vec3(ndc * VIEW, 0.0);
  vec3 ro = vec3(0.0, 0.0, CAMERA);
  vec3 rd = normalize(target - ro);
  float pixel = 2.0 * VIEW.y / (u_resolution.y * CAMERA);

  float best = 1e9;
  float cover = 0.0;
  int self = -1;
  vec3 hitPoint = vec3(0.0);
  vec4 hitDrop = vec4(0.0);
  mat3 hitShape = mat3(0.0);
  vec4 hitLobe = vec4(0.0);
  float hitReach = 1.0;
  mat3 hitSpin = mat3(1.0);
  for (int i = 0; i < ${WATER_BUBBLE_COUNT}; i++) {
    float clearance;
    float closest;
    float t = enter(ro, rd, u_bubble[i], u_shape[i], u_lobe[i], u_reach[i], clearance, closest);
    float depth = t > 0.0 ? t : closest;
    float coverage = clamp(0.5 - clearance / (pixel * depth), 0.0, 1.0);
    if (coverage > 0.0 && depth < best) {
      best = depth;
      cover = coverage;
      self = i;
      hitDrop = u_bubble[i];
      hitShape = u_shape[i];
      hitLobe = u_lobe[i];
      hitReach = u_reach[i];
      hitSpin = u_spin[i];
      if (t > 0.0) hitPoint = ro + rd * t;
      else {
        vec3 n = normalize(ro + rd * closest - hitDrop.xyz);
        hitPoint = hitDrop.xyz + n * hitDrop.w * (1.0 + wobble(n, hitShape, hitLobe));
      }
    }
  }
  for (int j = 0; j < ${WATER_BEAD_COUNT}; j++) {
    vec4 s = u_bead[j];
    vec3 oc = ro - s.xyz;
    float b = dot(oc, rd);
    float distance = sqrt(max(dot(oc, oc) - b * b, 0.0));
    float coverage = clamp(0.5 - (distance - s.w) / (pixel * -b), 0.0, 1.0);
    if (coverage > 0.0 && -b < best) {
      best = -b;
      cover = coverage;
      self = ${WATER_BUBBLE_COUNT} + j;
      hitDrop = s;
      hitShape = mat3(0.0);
      hitLobe = vec4(0.0);
      hitReach = 1.0;
      hitSpin = mat3(1.0);
      hitPoint = distance < s.w
        ? ro + rd * (-b - sqrt(s.w * s.w - distance * distance))
        : s.xyz + normalize(ro + rd * -b - s.xyz) * s.w;
    }
  }

  // Shadows and caustics fade out before the canvas edge so the card never shows a seam.
  vec2 edge = smoothstep(vec2(0.0), vec2(0.14), 1.0 - abs(ndc));
  vec4 base = cover < 1.0 ? catcher(backdrop(target), 0.5) * edge.x * edge.y : vec4(0.0);
  if (self < 0) {
    gl_FragColor = base;
    return;
  }
  // Water is composited like the backdrop: the real card shows through, scaled by what the
  // refracted rays see, plus reflected light. Bubbles therefore take on any card tint or gradient.
  vec3 color = water(hitPoint, rd, hitDrop, hitShape, hitLobe, hitReach, self, hitSpin);
  gl_FragColor = mix(base, catcher(color, 0.001), cover);
}
`;

/** Rendering budget: at most two device pixels per CSS pixel and about 0.6 megapixels. */
const MAX_RATIO = 2;
const MAX_PIXELS = 600_000;
/** Opacity of the printed coins, and how strongly light through them takes their colour. */
const INK = 0.8;
const INK_TINT = 0.55;

/**
 * WebGL1 renderer for the water hero art. Returns null when WebGL, high-precision fragment
 * shaders or the shader itself are unavailable; context loss calls `onUnavailable` once.
 */
export function createWaterRenderer(canvas: HTMLCanvasElement, onUnavailable?: () => void): WaterRenderer | null {
  let gl: WebGLRenderingContext | null = null;
  let program: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;
  let texture: WebGLTexture | null = null;
  let coins: WebGLTexture | null = null;
  const shaders: WebGLShader[] = [];
  let disposed = false;
  let firstDrawChecked = false;

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    canvas.removeEventListener('webglcontextlost', lost);
    if (!gl) return;
    if (texture) gl.deleteTexture(texture);
    if (coins) gl.deleteTexture(coins);
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    shaders.forEach((shader) => gl?.deleteShader(shader));
    // Release the context slot as soon as the art leaves the page.
    if (!gl.isContextLost()) gl.getExtension('WEBGL_lose_context')?.loseContext();
  }

  function lost(): void {
    if (disposed) return;
    dispose();
    onUnavailable?.();
  }

  try {
    gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: 'low-power',
      failIfMajorPerformanceCaveat: true,
    }) as WebGLRenderingContext | null;
    if (!gl) return null;
    const precision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    if (!precision || precision.precision < 16) throw new Error('High-precision fragment shaders unavailable');
    canvas.addEventListener('webglcontextlost', lost);
    program = gl.createProgram();
    if (!program) throw new Error('Water program unavailable');
    for (const [type, source] of [
      [gl.VERTEX_SHADER, VERTEX_SHADER],
      [gl.FRAGMENT_SHADER, WATER_FRAGMENT_SHADER],
    ] as const) {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('Water shader unavailable');
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Water shader failed to compile');
      gl.attachShader(program, shader);
    }
    gl.bindAttribLocation(program, 0, 'a_position');
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Water program failed to link');
    gl.useProgram(program);

    buffer = gl.createBuffer();
    texture = gl.createTexture();
    coins = gl.createTexture();
    if (!buffer || !texture || !coins) throw new Error('Water resources unavailable');
    // One triangle covers the viewport.
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      CAUSTIC_TEXELS,
      CAUSTIC_ROWS * 2,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      sharedCausticTable()
    );
    // Coin prints start as one transparent texel until setCoins supplies the atlas.
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, coins);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    gl.activeTexture(gl.TEXTURE0);

    // A uniform the compiler optimised away has a null location, which WebGL ignores.
    const uniform = (name: string) => gl!.getUniformLocation(program!, name);
    const locations = {
      resolution: uniform('u_resolution'),
      bubbles: uniform('u_bubble'),
      shapes: uniform('u_shape'),
      lobes: uniform('u_lobe'),
      reach: uniform('u_reach'),
      beads: uniform('u_bead'),
      surface: uniform('u_surface'),
      surfaceDisplay: uniform('u_surfaceDisplay'),
      room: uniform('u_room'),
      ambient: uniform('u_ambient'),
      key: uniform('u_key'),
      pink: uniform('u_pink'),
      violet: uniform('u_violet'),
      irradiance: uniform('u_irradiance'),
      caustics: uniform('u_caustics'),
      spins: uniform('u_spin'),
      tints: uniform('u_tint'),
      ink: uniform('u_ink'),
      coins: uniform('u_coins'),
    };
    gl.uniform1i(locations.caustics, 0);
    gl.uniform1i(locations.coins, 1);
    gl.uniform1f(locations.ink, 0);
    gl.uniform3fv(locations.tints, new Float32Array(WATER_BUBBLE_COUNT * 3).fill(1));
    gl.disable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);
    if (gl.getError() !== gl.NO_ERROR) throw new Error('Water setup failed');

    const setPalette = (palette: WaterPalette) => {
      if (disposed || !gl) return;
      const read = (key: keyof WaterPalette) => parseWaterColor(palette[key]) ?? FALLBACK[key];
      const surfaceDisplay = read('surface');
      const surface = toLinear(surfaceDisplay);
      // A gelled studio light is never fully saturated; a softer pink keeps its shadow from turning cyan.
      const pink = unitPeak(mixRgb(unitPeak(toLinear(read('pink'))), [1, 1, 1], 0.45));
      const violet = unitPeak(toLinear(read('violet')));
      // Room light is the card's own colour bounced around a dim studio, cooled by the violet fill.
      const ambient = unitPeak(mixRgb(unitPeak(surface), violet, 0.12));
      // The room stays dimmer than a light card but brighter than a dark one, so rims always read.
      const luminance = 0.2126 * surface[0] + 0.7152 * surface[1] + 0.0722 * surface[2];
      const roomLevel = 0.3 * luminance + 0.07;
      const room = unitPeak(mixRgb(unitPeak(surface), violet, 0.15)).map((channel) => channel * roomLevel) as Rgb;
      const { key, pink: rim, violet: fill } = WATER_LIGHTS;
      const irradiance = [0, 1, 2].map(
        (channel) =>
          WATER_AMBIENT_SHARE * ambient[channel] +
          key.share * key.direction[2] * KEY_COLOR[channel] +
          rim.share * rim.direction[2] * pink[channel] +
          fill.share * fill.direction[2] * violet[channel]
      ) as Rgb;
      gl.uniform3fv(locations.surface, surface);
      gl.uniform3fv(locations.surfaceDisplay, surfaceDisplay);
      gl.uniform3fv(locations.room, room);
      gl.uniform3fv(locations.ambient, ambient);
      gl.uniform3fv(locations.key, KEY_COLOR);
      gl.uniform3fv(locations.pink, pink);
      gl.uniform3fv(locations.violet, violet);
      gl.uniform3fv(locations.irradiance, irradiance);
    };
    setPalette({ surface: '', pink: '', violet: '' });

    const setCoins = (atlas: CoinAtlas | null) => {
      if (disposed || !gl) return;
      const tints = new Float32Array(WATER_BUBBLE_COUNT * 3).fill(1);
      if (!atlas) {
        gl.uniform1f(locations.ink, 0);
        gl.uniform3fv(locations.tints, tints);
        return;
      }
      try {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, coins);
        // Premultiplied texels filter without dark fringes; the shader divides alpha back out.
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas.canvas);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.activeTexture(gl.TEXTURE0);
        if (gl.getError() !== gl.NO_ERROR) throw new Error('Coin atlas upload failed');
      } catch {
        // Bubbles stay clear water rather than failing the whole art.
        gl.uniform1f(locations.ink, 0);
        return;
      }
      atlas.tints.slice(0, WATER_BUBBLE_COUNT).forEach((tint, index) =>
        tint.forEach((channel, offset) => {
          tints[index * 3 + offset] = 1 + (Math.min(1, Math.max(0, channel)) - 1) * INK_TINT;
        })
      );
      gl.uniform1f(locations.ink, INK);
      gl.uniform3fv(locations.tints, tints);
    };

    return {
      setPalette,
      setCoins,
      resize(width, height, ratio) {
        if (disposed || !gl) return;
        const cssWidth = Math.max(1, width);
        const cssHeight = Math.max(1, height);
        const bounded = Number.isFinite(ratio) ? Math.min(MAX_RATIO, Math.max(1, ratio)) : 1;
        const scale = Math.min(bounded, Math.sqrt(MAX_PIXELS / (cssWidth * cssHeight)));
        const pixelsWide = Math.max(1, Math.round(cssWidth * scale));
        const pixelsHigh = Math.max(1, Math.round(cssHeight * scale));
        if (canvas.width !== pixelsWide) canvas.width = pixelsWide;
        if (canvas.height !== pixelsHigh) canvas.height = pixelsHigh;
        gl.viewport(0, 0, pixelsWide, pixelsHigh);
        gl.uniform2f(locations.resolution, pixelsWide, pixelsHigh);
      },
      draw(frame) {
        if (disposed || !gl) return false;
        try {
          if (gl.isContextLost()) throw new Error('Water context lost');
          gl.uniform4fv(locations.bubbles, frame.bubbles);
          gl.uniformMatrix3fv(locations.shapes, false, frame.shapes);
          gl.uniform4fv(locations.lobes, frame.lobes);
          gl.uniform1fv(locations.reach, frame.reach);
          gl.uniformMatrix3fv(locations.spins, false, frame.spins);
          gl.uniform4fv(locations.beads, frame.beads);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
          if (!firstDrawChecked) {
            if (gl.getError() !== gl.NO_ERROR) throw new Error('Water draw failed');
            firstDrawChecked = true;
          }
          return true;
        } catch {
          lost();
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
