import { eI as xglobal, eJ as isFunction, eK as isU8a, eL as stringToU8a, eM as blake2AsU8a, eN as decodeAddress, z as defineComponent, ci as h$1, dw as global, eO as u8aToHex, eP as isHex, eQ as isEthereumAddress, eR as encodeAddress, am as createBlock, C as openBlock, aj as unref } from "./index-73GArslZ.js";
const DEDUPE = "Either remove and explicitly install matching versions or dedupe using your package manager.\nThe following conflicting packages were found:";
const POLKADOTJS_DISABLE_ESM_CJS_WARNING_FLAG = "POLKADOTJS_DISABLE_ESM_CJS_WARNING";
function getEntry(name) {
  const _global = xglobal;
  if (!_global.__polkadotjs) {
    _global.__polkadotjs = {};
  }
  if (!_global.__polkadotjs[name]) {
    _global.__polkadotjs[name] = [];
  }
  return _global.__polkadotjs[name];
}
function formatDisplay(all, fmt) {
  let max = 0;
  for (let i2 = 0, count = all.length; i2 < count; i2++) {
    max = Math.max(max, all[i2].version.length);
  }
  return all.map((d2) => `	${fmt(d2.version.padEnd(max), d2).join("	")}`).join("\n");
}
function formatInfo(version, { name }) {
  return [
    version,
    name
  ];
}
function formatVersion(version, { path, type }) {
  let extracted;
  if (path && path.length >= 5) {
    const nmIndex = path.indexOf("node_modules");
    extracted = nmIndex === -1 ? path : path.substring(nmIndex);
  } else {
    extracted = "<unknown>";
  }
  return [
    `${`${type || ""}`.padStart(3)} ${version}`,
    extracted
  ];
}
function getPath(infoPath, pathOrFn) {
  if (infoPath) {
    return infoPath;
  } else if (isFunction(pathOrFn)) {
    try {
      return pathOrFn() || "";
    } catch {
      return "";
    }
  }
  return pathOrFn || "";
}
function warn(pre, all, fmt) {
  console.warn(`${pre}
${DEDUPE}
${formatDisplay(all, fmt)}`);
}
function detectPackage({ name, path, type, version }, pathOrFn, deps = []) {
  if (!name.startsWith("@polkadot")) {
    throw new Error(`Invalid package descriptor ${name}`);
  }
  const entry = getEntry(name);
  entry.push({ path: getPath(path, pathOrFn), type, version });
  const entriesSameVersion = entry.every((e2) => e2.version === version);
  const esmCjsWarningDisabled = xglobal.process?.env?.[POLKADOTJS_DISABLE_ESM_CJS_WARNING_FLAG] === "1";
  const multipleEntries = entry.length !== 1;
  const disableWarnings = esmCjsWarningDisabled && entriesSameVersion;
  if (multipleEntries && !disableWarnings) {
    warn(`${name} has multiple versions, ensure that there is only one installed.`, entry, formatVersion);
  } else {
    const mismatches = deps.filter((d2) => d2 && d2.version !== version);
    if (mismatches.length) {
      warn(`${name} requires direct dependencies exactly matching version ${version}.`, mismatches, formatInfo);
    }
  }
}
const packageInfo$1 = {
  name: "@polkadot/ui-shared",
  path: import.meta && import.meta.url ? new URL(import.meta.url).pathname.substring(0, new URL(import.meta.url).pathname.lastIndexOf("/") + 1) : "auto",
  type: "esm",
  version: "4.0.0"
};
const packageInfo = {
  name: "@polkadot/vue-identicon",
  path: import.meta && import.meta.url ? new URL(import.meta.url).pathname.substring(0, new URL(import.meta.url).pathname.lastIndexOf("/") + 1) : "auto",
  type: "esm",
  version: "4.0.0"
};
detectPackage(packageInfo, null, [packageInfo$1]);
detectPackage(packageInfo$1, null, []);
const COLORS = [
  // https://sashat.me/2017/01/11/list-of-20-simple-distinct-colors/
  "#ffe119",
  "#4363d8",
  "#f58231",
  "#fabebe",
  "#e6beff",
  "#800000",
  "#000075",
  "#a9a9a9",
  "#ffffff",
  "#000000"
];
const SHAPE_COUNT = 5;
const SVG_NS = "http://www.w3.org/2000/svg";
function svg(type) {
  return document.createElementNS(SVG_NS, type);
}
function circle$1(r2, cx, cy) {
  const elem = svg("circle");
  elem.setAttributeNS("", "cx", `${cx}`);
  elem.setAttributeNS("", "cy", `${cy}`);
  elem.setAttributeNS("", "r", `${r2}`);
  return elem;
}
function circle(seeder2, fill, diameter, count) {
  const center = diameter / 2;
  const angle = seeder2() * 360;
  const radius = (SHAPE_COUNT - count) / SHAPE_COUNT * (diameter / 2) + diameter / 8 * seeder2();
  const offset = diameter / 4 * (seeder2() + (count + 1) / SHAPE_COUNT);
  const cx = offset * Math.sin(angle) + center;
  const cy = offset * Math.cos(angle) + center;
  const svg2 = circle$1(radius, cx, cy);
  svg2.setAttributeNS("", "fill", fill);
  return svg2;
}
function element(size, type = "svg", x2 = 0, y2 = 0) {
  const elem = svg(type);
  elem.setAttributeNS("", "x", `${x2}`);
  elem.setAttributeNS("", "y", `${y2}`);
  elem.setAttributeNS("", "width", `${size}`);
  elem.setAttributeNS("", "height", `${size}`);
  return elem;
}
var r = { grad: 0.9, turn: 360, rad: 360 / (2 * Math.PI) }, t = function(r2) {
  return "string" == typeof r2 ? r2.length > 0 : "number" == typeof r2;
}, n = function(r2, t2, n2) {
  return void 0 === t2 && (t2 = 0), void 0 === n2 && (n2 = Math.pow(10, t2)), Math.round(n2 * r2) / n2 + 0;
}, e = function(r2, t2, n2) {
  return void 0 === t2 && (t2 = 0), void 0 === n2 && (n2 = 1), r2 > n2 ? n2 : r2 > t2 ? r2 : t2;
}, u = function(r2) {
  return (r2 = isFinite(r2) ? r2 % 360 : 0) > 0 ? r2 : r2 + 360;
}, a = function(r2) {
  return { r: e(r2.r, 0, 255), g: e(r2.g, 0, 255), b: e(r2.b, 0, 255), a: e(r2.a) };
}, o = function(r2) {
  return { r: n(r2.r), g: n(r2.g), b: n(r2.b), a: n(r2.a, 3) };
}, i = /^#([0-9a-f]{3,8})$/i, s = function(r2) {
  var t2 = r2.toString(16);
  return t2.length < 2 ? "0" + t2 : t2;
}, h = function(r2) {
  var t2 = r2.r, n2 = r2.g, e2 = r2.b, u2 = r2.a, a2 = Math.max(t2, n2, e2), o2 = a2 - Math.min(t2, n2, e2), i2 = o2 ? a2 === t2 ? (n2 - e2) / o2 : a2 === n2 ? 2 + (e2 - t2) / o2 : 4 + (t2 - n2) / o2 : 0;
  return { h: 60 * (i2 < 0 ? i2 + 6 : i2), s: a2 ? o2 / a2 * 100 : 0, v: a2 / 255 * 100, a: u2 };
}, b = function(r2) {
  var t2 = r2.h, n2 = r2.s, e2 = r2.v, u2 = r2.a;
  t2 = t2 / 360 * 6, n2 /= 100, e2 /= 100;
  var a2 = Math.floor(t2), o2 = e2 * (1 - n2), i2 = e2 * (1 - (t2 - a2) * n2), s2 = e2 * (1 - (1 - t2 + a2) * n2), h2 = a2 % 6;
  return { r: 255 * [e2, i2, o2, o2, s2, e2][h2], g: 255 * [s2, e2, e2, i2, o2, o2][h2], b: 255 * [o2, o2, s2, e2, e2, i2][h2], a: u2 };
}, g = function(r2) {
  return { h: u(r2.h), s: e(r2.s, 0, 100), l: e(r2.l, 0, 100), a: e(r2.a) };
}, d = function(r2) {
  return { h: n(r2.h), s: n(r2.s), l: n(r2.l), a: n(r2.a, 3) };
}, f = function(r2) {
  return b((n2 = (t2 = r2).s, { h: t2.h, s: (n2 *= ((e2 = t2.l) < 50 ? e2 : 100 - e2) / 100) > 0 ? 2 * n2 / (e2 + n2) * 100 : 0, v: e2 + n2, a: t2.a }));
  var t2, n2, e2;
}, c = function(r2) {
  return { h: (t2 = h(r2)).h, s: (u2 = (200 - (n2 = t2.s)) * (e2 = t2.v) / 100) > 0 && u2 < 200 ? n2 * e2 / 100 / (u2 <= 100 ? u2 : 200 - u2) * 100 : 0, l: u2 / 2, a: t2.a };
  var t2, n2, e2, u2;
}, l = /^hsla?\(\s*([+-]?\d*\.?\d+)(deg|rad|grad|turn)?\s*,\s*([+-]?\d*\.?\d+)%\s*,\s*([+-]?\d*\.?\d+)%\s*(?:,\s*([+-]?\d*\.?\d+)(%)?\s*)?\)$/i, p = /^hsla?\(\s*([+-]?\d*\.?\d+)(deg|rad|grad|turn)?\s+([+-]?\d*\.?\d+)%\s+([+-]?\d*\.?\d+)%\s*(?:\/\s*([+-]?\d*\.?\d+)(%)?\s*)?\)$/i, v = /^rgba?\(\s*([+-]?\d*\.?\d+)(%)?\s*,\s*([+-]?\d*\.?\d+)(%)?\s*,\s*([+-]?\d*\.?\d+)(%)?\s*(?:,\s*([+-]?\d*\.?\d+)(%)?\s*)?\)$/i, m = /^rgba?\(\s*([+-]?\d*\.?\d+)(%)?\s+([+-]?\d*\.?\d+)(%)?\s+([+-]?\d*\.?\d+)(%)?\s*(?:\/\s*([+-]?\d*\.?\d+)(%)?\s*)?\)$/i, y = { string: [[function(r2) {
  var t2 = i.exec(r2);
  return t2 ? (r2 = t2[1]).length <= 4 ? { r: parseInt(r2[0] + r2[0], 16), g: parseInt(r2[1] + r2[1], 16), b: parseInt(r2[2] + r2[2], 16), a: 4 === r2.length ? n(parseInt(r2[3] + r2[3], 16) / 255, 2) : 1 } : 6 === r2.length || 8 === r2.length ? { r: parseInt(r2.substr(0, 2), 16), g: parseInt(r2.substr(2, 2), 16), b: parseInt(r2.substr(4, 2), 16), a: 8 === r2.length ? n(parseInt(r2.substr(6, 2), 16) / 255, 2) : 1 } : null : null;
}, "hex"], [function(r2) {
  var t2 = v.exec(r2) || m.exec(r2);
  return t2 ? t2[2] !== t2[4] || t2[4] !== t2[6] ? null : a({ r: Number(t2[1]) / (t2[2] ? 100 / 255 : 1), g: Number(t2[3]) / (t2[4] ? 100 / 255 : 1), b: Number(t2[5]) / (t2[6] ? 100 / 255 : 1), a: void 0 === t2[7] ? 1 : Number(t2[7]) / (t2[8] ? 100 : 1) }) : null;
}, "rgb"], [function(t2) {
  var n2 = l.exec(t2) || p.exec(t2);
  if (!n2) return null;
  var e2, u2, a2 = g({ h: (e2 = n2[1], u2 = n2[2], void 0 === u2 && (u2 = "deg"), Number(e2) * (r[u2] || 1)), s: Number(n2[3]), l: Number(n2[4]), a: void 0 === n2[5] ? 1 : Number(n2[5]) / (n2[6] ? 100 : 1) });
  return f(a2);
}, "hsl"]], object: [[function(r2) {
  var n2 = r2.r, e2 = r2.g, u2 = r2.b, o2 = r2.a, i2 = void 0 === o2 ? 1 : o2;
  return t(n2) && t(e2) && t(u2) ? a({ r: Number(n2), g: Number(e2), b: Number(u2), a: Number(i2) }) : null;
}, "rgb"], [function(r2) {
  var n2 = r2.h, e2 = r2.s, u2 = r2.l, a2 = r2.a, o2 = void 0 === a2 ? 1 : a2;
  if (!t(n2) || !t(e2) || !t(u2)) return null;
  var i2 = g({ h: Number(n2), s: Number(e2), l: Number(u2), a: Number(o2) });
  return f(i2);
}, "hsl"], [function(r2) {
  var n2 = r2.h, a2 = r2.s, o2 = r2.v, i2 = r2.a, s2 = void 0 === i2 ? 1 : i2;
  if (!t(n2) || !t(a2) || !t(o2)) return null;
  var h2 = (function(r3) {
    return { h: u(r3.h), s: e(r3.s, 0, 100), v: e(r3.v, 0, 100), a: e(r3.a) };
  })({ h: Number(n2), s: Number(a2), v: Number(o2), a: Number(s2) });
  return b(h2);
}, "hsv"]] }, N = function(r2, t2) {
  for (var n2 = 0; n2 < t2.length; n2++) {
    var e2 = t2[n2][0](r2);
    if (e2) return [e2, t2[n2][1]];
  }
  return [null, void 0];
}, x = function(r2) {
  return "string" == typeof r2 ? N(r2.trim(), y.string) : "object" == typeof r2 && null !== r2 ? N(r2, y.object) : [null, void 0];
}, M = function(r2, t2) {
  var n2 = c(r2);
  return { h: n2.h, s: e(n2.s + 100 * t2, 0, 100), l: n2.l, a: n2.a };
}, H = function(r2) {
  return (299 * r2.r + 587 * r2.g + 114 * r2.b) / 1e3 / 255;
}, $ = function(r2, t2) {
  var n2 = c(r2);
  return { h: n2.h, s: n2.s, l: e(n2.l + 100 * t2, 0, 100), a: n2.a };
}, j = (function() {
  function r2(r3) {
    this.parsed = x(r3)[0], this.rgba = this.parsed || { r: 0, g: 0, b: 0, a: 1 };
  }
  return r2.prototype.isValid = function() {
    return null !== this.parsed;
  }, r2.prototype.brightness = function() {
    return n(H(this.rgba), 2);
  }, r2.prototype.isDark = function() {
    return H(this.rgba) < 0.5;
  }, r2.prototype.isLight = function() {
    return H(this.rgba) >= 0.5;
  }, r2.prototype.toHex = function() {
    return r3 = o(this.rgba), t2 = r3.r, e2 = r3.g, u2 = r3.b, i2 = (a2 = r3.a) < 1 ? s(n(255 * a2)) : "", "#" + s(t2) + s(e2) + s(u2) + i2;
    var r3, t2, e2, u2, a2, i2;
  }, r2.prototype.toRgb = function() {
    return o(this.rgba);
  }, r2.prototype.toRgbString = function() {
    return r3 = o(this.rgba), t2 = r3.r, n2 = r3.g, e2 = r3.b, (u2 = r3.a) < 1 ? "rgba(" + t2 + ", " + n2 + ", " + e2 + ", " + u2 + ")" : "rgb(" + t2 + ", " + n2 + ", " + e2 + ")";
    var r3, t2, n2, e2, u2;
  }, r2.prototype.toHsl = function() {
    return d(c(this.rgba));
  }, r2.prototype.toHslString = function() {
    return r3 = d(c(this.rgba)), t2 = r3.h, n2 = r3.s, e2 = r3.l, (u2 = r3.a) < 1 ? "hsla(" + t2 + ", " + n2 + "%, " + e2 + "%, " + u2 + ")" : "hsl(" + t2 + ", " + n2 + "%, " + e2 + "%)";
    var r3, t2, n2, e2, u2;
  }, r2.prototype.toHsv = function() {
    return r3 = h(this.rgba), { h: n(r3.h), s: n(r3.s), v: n(r3.v), a: n(r3.a, 3) };
    var r3;
  }, r2.prototype.invert = function() {
    return w({ r: 255 - (r3 = this.rgba).r, g: 255 - r3.g, b: 255 - r3.b, a: r3.a });
    var r3;
  }, r2.prototype.saturate = function(r3) {
    return void 0 === r3 && (r3 = 0.1), w(M(this.rgba, r3));
  }, r2.prototype.desaturate = function(r3) {
    return void 0 === r3 && (r3 = 0.1), w(M(this.rgba, -r3));
  }, r2.prototype.grayscale = function() {
    return w(M(this.rgba, -1));
  }, r2.prototype.lighten = function(r3) {
    return void 0 === r3 && (r3 = 0.1), w($(this.rgba, r3));
  }, r2.prototype.darken = function(r3) {
    return void 0 === r3 && (r3 = 0.1), w($(this.rgba, -r3));
  }, r2.prototype.rotate = function(r3) {
    return void 0 === r3 && (r3 = 15), this.hue(this.hue() + r3);
  }, r2.prototype.alpha = function(r3) {
    return "number" == typeof r3 ? w({ r: (t2 = this.rgba).r, g: t2.g, b: t2.b, a: r3 }) : n(this.rgba.a, 3);
    var t2;
  }, r2.prototype.hue = function(r3) {
    var t2 = c(this.rgba);
    return "number" == typeof r3 ? w({ h: r3, s: t2.s, l: t2.l, a: t2.a }) : n(t2.h);
  }, r2.prototype.isEqual = function(r3) {
    return this.toHex() === w(r3).toHex();
  }, r2;
})(), w = function(r2) {
  return r2 instanceof j ? r2 : new j(r2);
};
const WOBBLE = 30;
function colors(seeder2) {
  const amount = seeder2() * WOBBLE - WOBBLE / 2;
  const all = COLORS.map((hex) => w(hex).rotate(amount));
  return (alpha = 1) => {
    const index = Math.floor(all.length * seeder2());
    return all.splice(index, 1)[0].alpha(alpha).toHslString();
  };
}
function container(diameter, background = "white", className = "", _style = {}) {
  const element2 = document.createElement("div");
  const style = Object.assign(
    {
      background,
      borderRadius: `${diameter / 2}px`,
      display: "inline-block",
      height: `${diameter}px`,
      margin: "0px",
      overflow: "hidden",
      padding: "0px",
      width: `${diameter}px`
    },
    _style
  );
  element2.className = className;
  element2.style.background = background;
  Object.keys(style).forEach((key) => {
    element2.style[key] = style[key];
  });
  return element2;
}
const DIVISOR = 256 * 256;
function seeder(_seed = new Uint8Array(32)) {
  const seed = isU8a(_seed) ? _seed : stringToU8a(_seed);
  let index = seed[Math.floor(seed.length / 2)] % seed.length - 1;
  const next = () => {
    index += 1;
    if (index === seed.length) {
      index = 0;
    }
    return seed[index];
  };
  return () => {
    return (next() * 256 + next()) / DIVISOR;
  };
}
function beachballIcon(seed, { size = 256 }, className = "", style) {
  const seeder$1 = seeder(seed);
  const colorGen = colors(seeder$1);
  const outer = container(size, "white", className, style);
  const container$1 = container(size, colorGen());
  const svg2 = element(size);
  outer.appendChild(container$1);
  container$1.appendChild(svg2);
  for (let count = 0; count < SHAPE_COUNT; count++) {
    const fill = colorGen();
    const shape = circle(seeder$1, fill, size, count);
    svg2.appendChild(shape);
  }
  return outer;
}
const S = 64;
const C = S / 2;
const Z = S / 64 * 5;
const SCHEMES = [
  /* target  */
  { colors: [0, 28, 0, 0, 28, 0, 0, 28, 0, 0, 28, 0, 0, 28, 0, 0, 28, 0, 1], freq: 1 },
  /* cube    */
  { colors: [0, 1, 3, 2, 4, 3, 0, 1, 3, 2, 4, 3, 0, 1, 3, 2, 4, 3, 5], freq: 20 },
  /* quazar  */
  { colors: [1, 2, 3, 1, 2, 4, 5, 5, 4, 1, 2, 3, 1, 2, 4, 5, 5, 4, 0], freq: 16 },
  /* flower  */
  { colors: [0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 3], freq: 32 },
  /* cyclic  */
  { colors: [0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 6], freq: 32 },
  /* vmirror */
  { colors: [0, 1, 2, 3, 4, 5, 3, 4, 2, 0, 1, 6, 7, 8, 9, 7, 8, 6, 10], freq: 128 },
  /* hmirror */
  { colors: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 8, 6, 7, 5, 3, 4, 2, 11], freq: 128 }
];
const SCHEMES_TOTAL = SCHEMES.map((s2) => s2.freq).reduce((a2, b2) => a2 + b2);
const OUTER_CIRCLE = {
  cx: C,
  cy: C,
  fill: "#eee",
  r: C
};
let zeroHash = new Uint8Array();
function getRotation(isSixPoint) {
  const r2 = isSixPoint ? C / 8 * 5 : C / 4 * 3;
  const rroot3o2 = r2 * Math.sqrt(3) / 2;
  const ro2 = r2 / 2;
  const rroot3o4 = r2 * Math.sqrt(3) / 4;
  const ro4 = r2 / 4;
  const r3o4 = r2 * 3 / 4;
  return { r: r2, r3o4, ro2, ro4, rroot3o2, rroot3o4 };
}
function getCircleXY(isSixPoint = false) {
  const { r: r2, r3o4, ro2, ro4, rroot3o2, rroot3o4 } = getRotation(isSixPoint);
  return [
    [C, C - r2],
    [C, C - ro2],
    [C - rroot3o4, C - r3o4],
    [C - rroot3o2, C - ro2],
    [C - rroot3o4, C - ro4],
    [C - rroot3o2, C],
    [C - rroot3o2, C + ro2],
    [C - rroot3o4, C + ro4],
    [C - rroot3o4, C + r3o4],
    [C, C + r2],
    [C, C + ro2],
    [C + rroot3o4, C + r3o4],
    [C + rroot3o2, C + ro2],
    [C + rroot3o4, C + ro4],
    [C + rroot3o2, C],
    [C + rroot3o2, C - ro2],
    [C + rroot3o4, C - ro4],
    [C + rroot3o4, C - r3o4],
    [C, C]
  ];
}
function findScheme(d2) {
  let cum = 0;
  const schema = SCHEMES.find((schema2) => {
    cum += schema2.freq;
    return d2 < cum;
  });
  if (!schema) {
    throw new Error("Unable to find schema");
  }
  return schema;
}
function addressToId(address) {
  if (!zeroHash.length) {
    zeroHash = blake2AsU8a(new Uint8Array(32), 512);
  }
  return blake2AsU8a(decodeAddress(address), 512).map((x2, i2) => (x2 + 256 - zeroHash[i2]) % 256);
}
function getColors(address) {
  const id = addressToId(address);
  const d2 = Math.floor((id[30] + id[31] * 256) % SCHEMES_TOTAL);
  const rot = id[28] % 6 * 3;
  const sat = Math.floor(id[29] * 70 / 256 + 26) % 80 + 30;
  const scheme = findScheme(d2);
  const palette = Array.from(id).map((x2, i2) => {
    const b2 = (x2 + i2 % 28 * 58) % 256;
    if (b2 === 0) {
      return "#444";
    } else if (b2 === 255) {
      return "transparent";
    }
    const h2 = Math.floor(b2 % 64 * 360 / 64);
    const l2 = [53, 15, 35, 75][Math.floor(b2 / 64)];
    return `hsl(${h2}, ${sat}%, ${l2}%)`;
  });
  return scheme.colors.map((_, i2) => palette[scheme.colors[i2 < 18 ? (i2 + rot) % 18 : 18]]);
}
function polkadotIcon(address, { isAlternative }) {
  const xy = getCircleXY(isAlternative);
  let colors2;
  try {
    colors2 = getColors(address);
  } catch {
    colors2 = new Array(xy.length).fill("#ddd");
  }
  return [OUTER_CIRCLE].concat(
    xy.map(([cx, cy], index) => ({
      cx,
      cy,
      fill: colors2[index],
      r: Z
    }))
  );
}
const Beachball = defineComponent({
  props: ["address", "size", "isAlternative"],
  render() {
    const { address, isAlternative, size } = this.$props;
    return h$1({
      template: beachballIcon(address, {
        size
      }).outerHTML
    });
  }
});
const Empty = defineComponent({
  props: ["size"],
  template: `
    <svg :height="size" :width="size" viewBox="0 0 64 64">
      <circle cx="50%" cy="50%" fill="#eee" r="50%" />
    </svg>
  `
});
function parseHex(hash, startPosition, octets) {
  return parseInt(hash.substr(startPosition, octets), 16);
}
function decToHex(v2) {
  v2 |= 0;
  return v2 < 0 ? "00" : v2 < 16 ? "0" + v2.toString(16) : v2 < 256 ? v2.toString(16) : "ff";
}
function hueToRgb(m1, m2, h2) {
  h2 = h2 < 0 ? h2 + 6 : h2 > 6 ? h2 - 6 : h2;
  return decToHex(255 * (h2 < 1 ? m1 + (m2 - m1) * h2 : h2 < 3 ? m2 : h2 < 4 ? m1 + (m2 - m1) * (4 - h2) : m1));
}
function parseColor(color) {
  if (/^#[0-9a-f]{3,8}$/i.test(color)) {
    let result;
    const colorLength = color.length;
    if (colorLength < 6) {
      const r2 = color[1], g2 = color[2], b2 = color[3], a2 = color[4] || "";
      result = "#" + r2 + r2 + g2 + g2 + b2 + b2 + a2 + a2;
    }
    if (colorLength == 7 || colorLength > 8) {
      result = color;
    }
    return result;
  }
}
function hsl(hue, saturation, lightness) {
  let result;
  if (saturation == 0) {
    const partialHex = decToHex(lightness * 255);
    result = partialHex + partialHex + partialHex;
  } else {
    const m2 = lightness <= 0.5 ? lightness * (saturation + 1) : lightness + saturation - lightness * saturation, m1 = lightness * 2 - m2;
    result = hueToRgb(m1, m2, hue * 6 + 2) + hueToRgb(m1, m2, hue * 6) + hueToRgb(m1, m2, hue * 6 - 2);
  }
  return "#" + result;
}
function correctedHsl(hue, saturation, lightness) {
  const correctors = [0.55, 0.5, 0.5, 0.46, 0.6, 0.55, 0.55], corrector = correctors[hue * 6 + 0.5 | 0];
  lightness = lightness < 0.5 ? lightness * corrector * 2 : corrector + (lightness - 0.5) * (1 - corrector) * 2;
  return hsl(hue, saturation, lightness);
}
const GLOBAL = typeof window !== "undefined" ? window : typeof self !== "undefined" ? self : typeof global !== "undefined" ? global : {};
const CONFIG_PROPERTIES = {
  V: "jdenticon_config",
  n: "config"
};
var rootConfigurationHolder = {};
function getConfiguration(paddingOrLocalConfig, defaultPadding) {
  const configObject = rootConfigurationHolder[
    CONFIG_PROPERTIES.n
    /*MODULE*/
  ] || GLOBAL[
    CONFIG_PROPERTIES.V
    /*GLOBAL*/
  ] || {}, lightnessConfig = configObject["lightness"] || {}, saturation = configObject["saturation"] || {}, colorSaturation = "color" in saturation ? saturation["color"] : saturation, grayscaleSaturation = saturation["grayscale"], backColor = configObject["backColor"], padding = configObject["padding"];
  function lightness(configName, defaultRange) {
    let range = lightnessConfig[configName];
    if (!(range && range.length > 1)) {
      range = defaultRange;
    }
    return function(value) {
      value = range[0] + value * (range[1] - range[0]);
      return value < 0 ? 0 : value > 1 ? 1 : value;
    };
  }
  function hueFunction(originalHue) {
    const hueConfig = configObject["hues"];
    let hue;
    if (hueConfig && hueConfig.length > 0) {
      hue = hueConfig[0 | 0.999 * originalHue * hueConfig.length];
    }
    return typeof hue == "number" ? (
      // A hue was specified. We need to convert the hue from
      // degrees on any turn - e.g. 746° is a perfectly valid hue -
      // to turns in the range [0, 1).
      (hue / 360 % 1 + 1) % 1
    ) : (
      // No hue configured => use original hue
      originalHue
    );
  }
  return {
    W: hueFunction,
    o: typeof colorSaturation == "number" ? colorSaturation : 0.5,
    D: typeof grayscaleSaturation == "number" ? grayscaleSaturation : 0,
    p: lightness("color", [0.4, 0.8]),
    F: lightness("grayscale", [0.3, 0.9]),
    G: parseColor(backColor),
    X: typeof padding == "number" ? padding : defaultPadding
  };
}
class Point {
  /**
   * @param {number} x 
   * @param {number} y 
   */
  constructor(x2, y2) {
    this.x = x2;
    this.y = y2;
  }
}
class Transform {
  /**
   * @param {number} x The x-coordinate of the upper left corner of the transformed rectangle.
   * @param {number} y The y-coordinate of the upper left corner of the transformed rectangle.
   * @param {number} size The size of the transformed rectangle.
   * @param {number} rotation Rotation specified as 0 = 0 rad, 1 = 0.5π rad, 2 = π rad, 3 = 1.5π rad
   */
  constructor(x2, y2, size, rotation) {
    this.q = x2;
    this.t = y2;
    this.H = size;
    this.Y = rotation;
  }
  /**
   * Transforms the specified point based on the translation and rotation specification for this Transform.
   * @param {number} x x-coordinate
   * @param {number} y y-coordinate
   * @param {number=} w The width of the transformed rectangle. If greater than 0, this will ensure the returned point is of the upper left corner of the transformed rectangle.
   * @param {number=} h The height of the transformed rectangle. If greater than 0, this will ensure the returned point is of the upper left corner of the transformed rectangle.
   */
  I(x2, y2, w2, h2) {
    const right = this.q + this.H, bottom = this.t + this.H, rotation = this.Y;
    return rotation === 1 ? new Point(right - y2 - (h2 || 0), this.t + x2) : rotation === 2 ? new Point(right - x2 - (w2 || 0), bottom - y2 - (h2 || 0)) : rotation === 3 ? new Point(this.q + y2, bottom - x2 - (w2 || 0)) : new Point(this.q + x2, this.t + y2);
  }
}
const NO_TRANSFORM = new Transform(0, 0, 0, 0);
class Graphics {
  /**
   * @param {Renderer} renderer 
   */
  constructor(renderer) {
    this.J = renderer;
    this.u = NO_TRANSFORM;
  }
  /**
   * Adds a polygon to the underlying renderer.
   * @param {Array<number>} points The points of the polygon clockwise on the format [ x0, y0, x1, y1, ..., xn, yn ]
   * @param {boolean=} invert Specifies if the polygon will be inverted.
   */
  g(points, invert) {
    const di = invert ? -2 : 2, transformedPoints = [];
    for (let i2 = invert ? points.length - 2 : 0; i2 < points.length && i2 >= 0; i2 += di) {
      transformedPoints.push(this.u.I(points[i2], points[i2 + 1]));
    }
    this.J.g(transformedPoints);
  }
  /**
   * Adds a polygon to the underlying renderer.
   * Source: http://stackoverflow.com/a/2173084
   * @param {number} x The x-coordinate of the upper left corner of the rectangle holding the entire ellipse.
   * @param {number} y The y-coordinate of the upper left corner of the rectangle holding the entire ellipse.
   * @param {number} size The size of the ellipse.
   * @param {boolean=} invert Specifies if the ellipse will be inverted.
   */
  h(x2, y2, size, invert) {
    const p2 = this.u.I(x2, y2, size, size);
    this.J.h(p2, size, invert);
  }
  /**
   * Adds a rectangle to the underlying renderer.
   * @param {number} x The x-coordinate of the upper left corner of the rectangle.
   * @param {number} y The y-coordinate of the upper left corner of the rectangle.
   * @param {number} w The width of the rectangle.
   * @param {number} h The height of the rectangle.
   * @param {boolean=} invert Specifies if the rectangle will be inverted.
   */
  i(x2, y2, w2, h2, invert) {
    this.g([
      x2,
      y2,
      x2 + w2,
      y2,
      x2 + w2,
      y2 + h2,
      x2,
      y2 + h2
    ], invert);
  }
  /**
   * Adds a right triangle to the underlying renderer.
   * @param {number} x The x-coordinate of the upper left corner of the rectangle holding the triangle.
   * @param {number} y The y-coordinate of the upper left corner of the rectangle holding the triangle.
   * @param {number} w The width of the triangle.
   * @param {number} h The height of the triangle.
   * @param {number} r The rotation of the triangle (clockwise). 0 = right corner of the triangle in the lower left corner of the bounding rectangle.
   * @param {boolean=} invert Specifies if the triangle will be inverted.
   */
  j(x2, y2, w2, h2, r2, invert) {
    const points = [
      x2 + w2,
      y2,
      x2 + w2,
      y2 + h2,
      x2,
      y2 + h2,
      x2,
      y2
    ];
    points.splice((r2 || 0) % 4 * 2, 2);
    this.g(points, invert);
  }
  /**
   * Adds a rhombus to the underlying renderer.
   * @param {number} x The x-coordinate of the upper left corner of the rectangle holding the rhombus.
   * @param {number} y The y-coordinate of the upper left corner of the rectangle holding the rhombus.
   * @param {number} w The width of the rhombus.
   * @param {number} h The height of the rhombus.
   * @param {boolean=} invert Specifies if the rhombus will be inverted.
   */
  K(x2, y2, w2, h2, invert) {
    this.g([
      x2 + w2 / 2,
      y2,
      x2 + w2,
      y2 + h2 / 2,
      x2 + w2 / 2,
      y2 + h2,
      x2,
      y2 + h2 / 2
    ], invert);
  }
}
function centerShape(index, g2, cell, positionIndex) {
  index = index % 14;
  let k, m2, w2, h2, inner, outer;
  !index ? (k = cell * 0.42, g2.g([
    0,
    0,
    cell,
    0,
    cell,
    cell - k * 2,
    cell - k,
    cell,
    0,
    cell
  ])) : index == 1 ? (w2 = 0 | cell * 0.5, h2 = 0 | cell * 0.8, g2.j(cell - w2, 0, w2, h2, 2)) : index == 2 ? (w2 = 0 | cell / 3, g2.i(w2, w2, cell - w2, cell - w2)) : index == 3 ? (inner = cell * 0.1, // Use fixed outer border widths in small icons to ensure the border is drawn
  outer = cell < 6 ? 1 : cell < 8 ? 2 : 0 | cell * 0.25, inner = inner > 1 ? 0 | inner : (
    // large icon => truncate decimals
    inner > 0.5 ? 1 : (
      // medium size icon => fixed width
      inner
    )
  ), // small icon => anti-aliased border
  g2.i(outer, outer, cell - inner - outer, cell - inner - outer)) : index == 4 ? (m2 = 0 | cell * 0.15, w2 = 0 | cell * 0.5, g2.h(cell - w2 - m2, cell - w2 - m2, w2)) : index == 5 ? (inner = cell * 0.1, outer = inner * 4, // Align edge to nearest pixel in large icons
  outer > 3 && (outer = 0 | outer), g2.i(0, 0, cell, cell), g2.g([
    outer,
    outer,
    cell - inner,
    outer,
    outer + (cell - outer - inner) / 2,
    cell - inner
  ], true)) : index == 6 ? g2.g([
    0,
    0,
    cell,
    0,
    cell,
    cell * 0.7,
    cell * 0.4,
    cell * 0.4,
    cell * 0.7,
    cell,
    0,
    cell
  ]) : index == 7 ? g2.j(cell / 2, cell / 2, cell / 2, cell / 2, 3) : index == 8 ? (g2.i(0, 0, cell, cell / 2), g2.i(0, cell / 2, cell / 2, cell / 2), g2.j(cell / 2, cell / 2, cell / 2, cell / 2, 1)) : index == 9 ? (inner = cell * 0.14, // Use fixed outer border widths in small icons to ensure the border is drawn
  outer = cell < 4 ? 1 : cell < 6 ? 2 : 0 | cell * 0.35, inner = cell < 8 ? inner : (
    // small icon => anti-aliased border
    0 | inner
  ), // large icon => truncate decimals
  g2.i(0, 0, cell, cell), g2.i(outer, outer, cell - outer - inner, cell - outer - inner, true)) : index == 10 ? (inner = cell * 0.12, outer = inner * 3, g2.i(0, 0, cell, cell), g2.h(outer, outer, cell - inner - outer, true)) : index == 11 ? g2.j(cell / 2, cell / 2, cell / 2, cell / 2, 3) : index == 12 ? (m2 = cell * 0.25, g2.i(0, 0, cell, cell), g2.K(m2, m2, cell - m2, cell - m2, true)) : (
    // 13
    !positionIndex && (m2 = cell * 0.4, w2 = cell * 1.2, g2.h(m2, m2, w2))
  );
}
function outerShape(index, g2, cell) {
  index = index % 4;
  let m2;
  !index ? g2.j(0, 0, cell, cell, 0) : index == 1 ? g2.j(0, cell / 2, cell, cell / 2, 0) : index == 2 ? g2.K(0, 0, cell, cell) : (
    // 3
    (m2 = cell / 6, g2.h(m2, m2, cell - 2 * m2))
  );
}
function colorTheme(hue, config) {
  hue = config.W(hue);
  return [
    // Dark gray
    correctedHsl(hue, config.D, config.F(0)),
    // Mid color
    correctedHsl(hue, config.o, config.p(0.5)),
    // Light gray
    correctedHsl(hue, config.D, config.F(1)),
    // Light color
    correctedHsl(hue, config.o, config.p(1)),
    // Dark color
    correctedHsl(hue, config.o, config.p(0))
  ];
}
function iconGenerator(renderer, hash, config) {
  const parsedConfig = getConfiguration(config, 0.08);
  if (parsedConfig.G) {
    renderer.m(
      parsedConfig.G
      /*backColor*/
    );
  }
  let size = renderer.k;
  const padding = 0.5 + size * parsedConfig.X | 0;
  size -= padding * 2;
  const graphics = new Graphics(renderer);
  const cell = 0 | size / 4;
  const x2 = 0 | padding + size / 2 - cell * 2;
  const y2 = 0 | padding + size / 2 - cell * 2;
  function renderShape(colorIndex, shapes, index2, rotationIndex, positions) {
    const shapeIndex = parseHex(hash, index2, 1);
    let r2 = rotationIndex ? parseHex(hash, rotationIndex, 1) : 0;
    renderer.L(availableColors[selectedColorIndexes[colorIndex]]);
    for (let i2 = 0; i2 < positions.length; i2++) {
      graphics.u = new Transform(x2 + positions[i2][0] * cell, y2 + positions[i2][1] * cell, cell, r2++ % 4);
      shapes(shapeIndex, graphics, cell, i2);
    }
    renderer.M();
  }
  const hue = parseHex(hash, -7) / 268435455, availableColors = colorTheme(hue, parsedConfig), selectedColorIndexes = [];
  let index;
  function isDuplicate(values) {
    if (values.indexOf(index) >= 0) {
      for (let i2 = 0; i2 < values.length; i2++) {
        if (selectedColorIndexes.indexOf(values[i2]) >= 0) {
          return true;
        }
      }
    }
  }
  for (let i2 = 0; i2 < 3; i2++) {
    index = parseHex(hash, 8 + i2, 1) % availableColors.length;
    if (isDuplicate([0, 4]) || // Disallow dark gray and dark color combo
    isDuplicate([2, 3])) {
      index = 1;
    }
    selectedColorIndexes.push(index);
  }
  renderShape(0, outerShape, 2, 3, [[1, 0], [2, 0], [2, 3], [1, 3], [0, 1], [3, 1], [3, 2], [0, 2]]);
  renderShape(1, outerShape, 4, 5, [[0, 0], [3, 0], [3, 3], [0, 3]]);
  renderShape(2, centerShape, 1, null, [[1, 1], [2, 1], [2, 2], [1, 2]]);
  renderer.finish();
}
function sha1(message) {
  const HASH_SIZE_HALF_BYTES = 40;
  const BLOCK_SIZE_WORDS = 16;
  var i2 = 0, f2 = 0, urlEncodedMessage = encodeURI(message) + "%80", data = [], dataSize, hashBuffer = [], a2 = 1732584193, b2 = 4023233417, c2 = ~a2, d2 = ~b2, e2 = 3285377520, hash = [a2, b2, c2, d2, e2], blockStartIndex = 0, hexHash = "";
  function rotl(value, shift) {
    return value << shift | value >>> 32 - shift;
  }
  for (; i2 < urlEncodedMessage.length; f2++) {
    data[f2 >> 2] = data[f2 >> 2] | (urlEncodedMessage[i2] == "%" ? parseInt(urlEncodedMessage.substring(i2 + 1, i2 += 3), 16) : urlEncodedMessage.charCodeAt(i2++)) << (3 - (f2 & 3)) * 8;
  }
  dataSize = ((f2 + 7 >> 6) + 1) * BLOCK_SIZE_WORDS;
  data[dataSize - 1] = f2 * 8 - 8;
  for (; blockStartIndex < dataSize; blockStartIndex += BLOCK_SIZE_WORDS) {
    for (i2 = 0; i2 < 80; i2++) {
      f2 = rotl(a2, 5) + e2 + // Ch
      (i2 < 20 ? (b2 & c2 ^ ~b2 & d2) + 1518500249 : (
        // Parity
        i2 < 40 ? (b2 ^ c2 ^ d2) + 1859775393 : (
          // Maj
          i2 < 60 ? (b2 & c2 ^ b2 & d2 ^ c2 & d2) + 2400959708 : (
            // Parity
            (b2 ^ c2 ^ d2) + 3395469782
          )
        )
      )) + (hashBuffer[i2] = i2 < BLOCK_SIZE_WORDS ? data[blockStartIndex + i2] | 0 : rotl(hashBuffer[i2 - 3] ^ hashBuffer[i2 - 8] ^ hashBuffer[i2 - 14] ^ hashBuffer[i2 - 16], 1));
      e2 = d2;
      d2 = c2;
      c2 = rotl(b2, 30);
      b2 = a2;
      a2 = f2;
    }
    hash[0] = a2 = hash[0] + a2 | 0;
    hash[1] = b2 = hash[1] + b2 | 0;
    hash[2] = c2 = hash[2] + c2 | 0;
    hash[3] = d2 = hash[3] + d2 | 0;
    hash[4] = e2 = hash[4] + e2 | 0;
  }
  for (i2 = 0; i2 < HASH_SIZE_HALF_BYTES; i2++) {
    hexHash += // Get word (2^3 half-bytes per word)
    (hash[i2 >> 3] >>> // Append half-bytes in reverse order
    (7 - (i2 & 7)) * 4 & 15).toString(16);
  }
  return hexHash;
}
function isValidHash(hashCandidate) {
  return /^[0-9a-f]{11,}$/i.test(hashCandidate) && hashCandidate;
}
function computeHash(value) {
  return sha1(value == null ? "" : "" + value);
}
typeof document !== "undefined" && document.querySelectorAll.bind(document);
function svgValue(value) {
  return (value * 10 + 0.5 | 0) / 10;
}
class SvgPath {
  constructor() {
    this.v = "";
  }
  /**
   * Adds a polygon with the current fill color to the SVG path.
   * @param points An array of Point objects.
   */
  g(points) {
    let dataString = "";
    for (let i2 = 0; i2 < points.length; i2++) {
      dataString += (i2 ? "L" : "M") + svgValue(points[i2].x) + " " + svgValue(points[i2].y);
    }
    this.v += dataString + "Z";
  }
  /**
   * Adds a circle with the current fill color to the SVG path.
   * @param {Point} point The upper left corner of the circle bounding box.
   * @param {number} diameter The diameter of the circle.
   * @param {boolean} counterClockwise True if the circle is drawn counter-clockwise (will result in a hole if rendered on a clockwise path).
   */
  h(point, diameter, counterClockwise) {
    const sweepFlag = counterClockwise ? 0 : 1, svgRadius = svgValue(diameter / 2), svgDiameter = svgValue(diameter), svgArc = "a" + svgRadius + "," + svgRadius + " 0 1," + sweepFlag + " ";
    this.v += "M" + svgValue(point.x) + " " + svgValue(point.y + diameter / 2) + svgArc + svgDiameter + ",0" + svgArc + -svgDiameter + ",0";
  }
}
class SvgRenderer {
  /**
   * @param {SvgElement|SvgWriter} target 
   */
  constructor(target) {
    this.A;
    this.B = {};
    this.O = target;
    this.k = target.k;
  }
  /**
   * Fills the background with the specified color.
   * @param {string} fillColor  Fill color on the format #rrggbb[aa].
   */
  m(fillColor) {
    const match = /^(#......)(..)?/.exec(fillColor), opacity = match[2] ? parseHex(match[2], 0) / 255 : 1;
    this.O.m(match[1], opacity);
  }
  /**
   * Marks the beginning of a new shape of the specified color. Should be ended with a call to endShape.
   * @param {string} color Fill color on format #xxxxxx.
   */
  L(color) {
    this.A = this.B[color] || (this.B[color] = new SvgPath());
  }
  /**
   * Marks the end of the currently drawn shape.
   */
  M() {
  }
  /**
   * Adds a polygon with the current fill color to the SVG.
   * @param points An array of Point objects.
   */
  g(points) {
    this.A.g(points);
  }
  /**
   * Adds a circle with the current fill color to the SVG.
   * @param {Point} point The upper left corner of the circle bounding box.
   * @param {number} diameter The diameter of the circle.
   * @param {boolean} counterClockwise True if the circle is drawn counter-clockwise (will result in a hole if rendered on a clockwise path).
   */
  h(point, diameter, counterClockwise) {
    this.A.h(point, diameter, counterClockwise);
  }
  /**
   * Called when the icon has been completely drawn.
   */
  finish() {
    const pathsByColor = this.B;
    for (let color in pathsByColor) {
      if (pathsByColor.hasOwnProperty(color)) {
        this.O.P(
          color,
          pathsByColor[color].v
          /*dataString*/
        );
      }
    }
  }
}
const SVG_CONSTANTS = {
  R: "http://www.w3.org/2000/svg"
};
class SvgWriter {
  /**
   * @param {number} iconSize - Icon width and height in pixels.
   */
  constructor(iconSize) {
    this.k = iconSize;
    this.C = '<svg xmlns="' + SVG_CONSTANTS.R + '" width="' + iconSize + '" height="' + iconSize + '" viewBox="0 0 ' + iconSize + " " + iconSize + '">';
  }
  /**
   * Fills the background with the specified color.
   * @param {string} fillColor  Fill color on the format #rrggbb.
   * @param {number} opacity  Opacity in the range [0.0, 1.0].
   */
  m(fillColor, opacity) {
    if (opacity) {
      this.C += '<rect width="100%" height="100%" fill="' + fillColor + '" opacity="' + opacity.toFixed(2) + '"/>';
    }
  }
  /**
   * Writes a path to the SVG string.
   * @param {string} color Fill color on format #rrggbb.
   * @param {string} dataString The SVG path data string.
   */
  P(color, dataString) {
    this.C += '<path fill="' + color + '" d="' + dataString + '"/>';
  }
  /**
   * Gets the rendered image as an SVG string.
   */
  toString() {
    return this.C + "</svg>";
  }
}
function toSvg(hashOrValue, size, config) {
  const writer = new SvgWriter(size);
  iconGenerator(
    new SvgRenderer(writer),
    isValidHash(hashOrValue) || computeHash(hashOrValue),
    config
  );
  return writer.toString();
}
const Jdenticon = defineComponent({
  props: ["publicKey", "size"],
  render() {
    const { publicKey, size } = this.$props;
    return h$1({
      template: toSvg(publicKey.substring(2), size)
    });
  }
});
function adaptVNodeAttrs(data) {
  return data;
}
const Polkadot = defineComponent({
  props: ["address", "isAlternative", "size"],
  render() {
    const { address, isAlternative, size } = this.$props;
    const circles = polkadotIcon(address, { isAlternative }).map(
      ({ cx, cy, fill, r: r2 }) => h$1("circle", { ...adaptVNodeAttrs({ cx, cy, fill, r: r2 }) }, [])
    );
    return h$1(
      "svg",
      {
        ...adaptVNodeAttrs({
          height: size,
          viewBox: "0 0 64 64",
          width: size
        })
      },
      circles
    );
  }
});
const DEFAULT_SIZE = 64;
function resolvePublicKey(value, prefix) {
  if (isHex(value) && isEthereumAddress(value)) {
    return value.padEnd(66, "0");
  }
  return isU8a(value) || isHex(value) ? encodeAddress(value, prefix) : value;
}
function encodeAccount(value, prefix) {
  try {
    const address = resolvePublicKey(value, prefix);
    const publicKey = u8aToHex(decodeAddress(address, false, prefix));
    return { address, publicKey };
  } catch {
    return { address: "", publicKey: "0x" };
  }
}
const Identicon = defineComponent({
  components: {
    Beachball,
    Empty,
    Jdenticon,
    Polkadot
  },
  created: function() {
    this.createData();
  },
  data: function() {
    return {
      address: "",
      iconSize: DEFAULT_SIZE,
      isAlternativeIcon: false,
      publicKey: "0x",
      type: "empty"
    };
  },
  methods: {
    createData: function() {
      this.iconSize = this.size || DEFAULT_SIZE;
      this.type = this.theme;
      this.isAlternativeIcon = this.isAlternative || false;
      this.recodeAddress();
    },
    recodeAddress: function() {
      const { address, publicKey } = encodeAccount(this.value);
      this.address = address;
      this.publicKey = publicKey;
    }
  },
  props: ["prefix", "isAlternative", "size", "theme", "value"],
  render() {
    const { address, iconSize, isAlternativeIcon, publicKey, type } = this.$data;
    if (type === "empty") {
      return h$1(
        Empty,
        {
          ...adaptVNodeAttrs({
            key: address,
            size: iconSize
          })
        },
        []
      );
    } else if (type === "jdenticon") {
      return h$1(
        Jdenticon,
        {
          ...adaptVNodeAttrs({
            key: address,
            publicKey,
            size: iconSize
          })
        },
        []
      );
    } else if (type === "substrate") {
      throw new Error("substrate type is not supported");
    }
    const cmp = type.charAt(0).toUpperCase() + type.slice(1);
    if (["Beachball", "Polkadot"].includes(cmp)) {
      const component = cmp === "Beachball" ? Beachball : Polkadot;
      return h$1(
        component,
        {
          ...adaptVNodeAttrs({
            address,
            isAlternative: isAlternativeIcon,
            key: address,
            size: iconSize
          })
        },
        []
      );
    } else {
      return h$1(cmp, {}, []);
    }
  },
  watch: {
    value: function() {
      this.recodeAddress();
    }
  }
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "WalletAvatar",
  props: {
    size: { default: 32 },
    theme: {
      default: "polkadot"
      /* POLKADOT */
    },
    address: {}
  },
  setup(__props) {
    return (_ctx, _cache) => {
      return openBlock(), createBlock(unref(Identicon), {
        size: __props.size,
        theme: __props.theme,
        value: __props.address
      }, null, 8, ["size", "theme", "value"]);
    };
  }
});
export {
  _sfc_main as _
};
