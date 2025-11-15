(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined'
    ? factory(exports, require('vue'), require('@polkadot/util'), require('@polkadot/util-crypto'))
    : typeof define === 'function' && define.amd
      ? define(['exports', 'vue', '@polkadot/util', '@polkadot/util-crypto'], factory)
      : ((global = typeof globalThis !== 'undefined' ? globalThis : global || self),
        factory((global.polkadotVueIdenticon = {}), global.Vue, global.polkadotUtil, global.polkadotUtilCrypto));
})(this, function (exports, vue, util, utilCrypto) {
  'use strict';

  const global = typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : window;

  var _documentCurrentScript = typeof document !== 'undefined' ? document.currentScript : null;
  const COLORS = [
    '#ffe119',
    '#4363d8',
    '#f58231',
    '#fabebe',
    '#e6beff',
    '#800000',
    '#000075',
    '#a9a9a9',
    '#ffffff',
    '#000000',
  ];
  const SHAPE_COUNT = 5;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  function svg(type) {
    return document.createElementNS(SVG_NS, type);
  }

  function circle$1(r, cx, cy) {
    const elem = svg('circle');
    elem.setAttributeNS('', 'cx', `${cx}`);
    elem.setAttributeNS('', 'cy', `${cy}`);
    elem.setAttributeNS('', 'r', `${r}`);
    return elem;
  }

  function circle(seeder, fill, diameter, count) {
    const center = diameter / 2;
    const angle = seeder() * 360;
    const radius = ((SHAPE_COUNT - count) / SHAPE_COUNT) * (diameter / 2) + (diameter / 8) * seeder();
    const offset = (diameter / 4) * (seeder() + (count + 1) / SHAPE_COUNT);
    const cx = offset * Math.sin(angle) + center;
    const cy = offset * Math.cos(angle) + center;
    const svg = circle$1(radius, cx, cy);
    svg.setAttributeNS('', 'fill', fill);
    return svg;
  }

  function element(size, type = 'svg', x = 0, y = 0) {
    const elem = svg(type);
    elem.setAttributeNS('', 'x', `${x}`);
    elem.setAttributeNS('', 'y', `${y}`);
    elem.setAttributeNS('', 'width', `${size}`);
    elem.setAttributeNS('', 'height', `${size}`);
    return elem;
  }

  var r = { grad: 0.9, turn: 360, rad: 360 / (2 * Math.PI) },
    t = function (r) {
      return 'string' == typeof r ? r.length > 0 : 'number' == typeof r;
    },
    n = function (r, t, n) {
      return (void 0 === t && (t = 0), void 0 === n && (n = Math.pow(10, t)), Math.round(n * r) / n + 0);
    },
    e = function (r, t, n) {
      return (void 0 === t && (t = 0), void 0 === n && (n = 1), r > n ? n : r > t ? r : t);
    },
    u = function (r) {
      return (r = isFinite(r) ? r % 360 : 0) > 0 ? r : r + 360;
    },
    a = function (r) {
      return { r: e(r.r, 0, 255), g: e(r.g, 0, 255), b: e(r.b, 0, 255), a: e(r.a) };
    },
    o = function (r) {
      return { r: n(r.r), g: n(r.g), b: n(r.b), a: n(r.a, 3) };
    },
    i = /^#([0-9a-f]{3,8})$/i,
    s = function (r) {
      var t = r.toString(16);
      return t.length < 2 ? '0' + t : t;
    },
    h = function (r) {
      var t = r.r,
        n = r.g,
        e = r.b,
        u = r.a,
        a = Math.max(t, n, e),
        o = a - Math.min(t, n, e),
        i = o ? (a === t ? (n - e) / o : a === n ? 2 + (e - t) / o : 4 + (t - n) / o) : 0;
      return { h: 60 * (i < 0 ? i + 6 : i), s: a ? (o / a) * 100 : 0, v: (a / 255) * 100, a: u };
    },
    b = function (r) {
      var t = r.h,
        n = r.s,
        e = r.v,
        u = r.a;
      ((t = (t / 360) * 6), (n /= 100), (e /= 100));
      var a = Math.floor(t),
        o = e * (1 - n),
        i = e * (1 - (t - a) * n),
        s = e * (1 - (1 - t + a) * n),
        h = a % 6;
      return { r: 255 * [e, i, o, o, s, e][h], g: 255 * [s, e, e, i, o, o][h], b: 255 * [o, o, s, e, e, i][h], a: u };
    },
    g = function (r) {
      return { h: u(r.h), s: e(r.s, 0, 100), l: e(r.l, 0, 100), a: e(r.a) };
    },
    d = function (r) {
      return { h: n(r.h), s: n(r.s), l: n(r.l), a: n(r.a, 3) };
    },
    f = function (r) {
      return b(
        ((n = (t = r).s),
        {
          h: t.h,
          s: (n *= ((e = t.l) < 50 ? e : 100 - e) / 100) > 0 ? ((2 * n) / (e + n)) * 100 : 0,
          v: e + n,
          a: t.a,
        })
      );
      var t, n, e;
    },
    c = function (r) {
      return {
        h: (t = h(r)).h,
        s:
          (u = ((200 - (n = t.s)) * (e = t.v)) / 100) > 0 && u < 200
            ? ((n * e) / 100 / (u <= 100 ? u : 200 - u)) * 100
            : 0,
        l: u / 2,
        a: t.a,
      };
      var t, n, e, u;
    },
    l =
      /^hsla?\(\s*([+-]?\d*\.?\d+)(deg|rad|grad|turn)?\s*,\s*([+-]?\d*\.?\d+)%\s*,\s*([+-]?\d*\.?\d+)%\s*(?:,\s*([+-]?\d*\.?\d+)(%)?\s*)?\)$/i,
    p =
      /^hsla?\(\s*([+-]?\d*\.?\d+)(deg|rad|grad|turn)?\s+([+-]?\d*\.?\d+)%\s+([+-]?\d*\.?\d+)%\s*(?:\/\s*([+-]?\d*\.?\d+)(%)?\s*)?\)$/i,
    v =
      /^rgba?\(\s*([+-]?\d*\.?\d+)(%)?\s*,\s*([+-]?\d*\.?\d+)(%)?\s*,\s*([+-]?\d*\.?\d+)(%)?\s*(?:,\s*([+-]?\d*\.?\d+)(%)?\s*)?\)$/i,
    m =
      /^rgba?\(\s*([+-]?\d*\.?\d+)(%)?\s+([+-]?\d*\.?\d+)(%)?\s+([+-]?\d*\.?\d+)(%)?\s*(?:\/\s*([+-]?\d*\.?\d+)(%)?\s*)?\)$/i,
    y = {
      string: [
        [
          function (r) {
            var t = i.exec(r);
            return t
              ? (r = t[1]).length <= 4
                ? {
                    r: parseInt(r[0] + r[0], 16),
                    g: parseInt(r[1] + r[1], 16),
                    b: parseInt(r[2] + r[2], 16),
                    a: 4 === r.length ? n(parseInt(r[3] + r[3], 16) / 255, 2) : 1,
                  }
                : 6 === r.length || 8 === r.length
                  ? {
                      r: parseInt(r.substr(0, 2), 16),
                      g: parseInt(r.substr(2, 2), 16),
                      b: parseInt(r.substr(4, 2), 16),
                      a: 8 === r.length ? n(parseInt(r.substr(6, 2), 16) / 255, 2) : 1,
                    }
                  : null
              : null;
          },
          'hex',
        ],
        [
          function (r) {
            var t = v.exec(r) || m.exec(r);
            return t
              ? t[2] !== t[4] || t[4] !== t[6]
                ? null
                : a({
                    r: Number(t[1]) / (t[2] ? 100 / 255 : 1),
                    g: Number(t[3]) / (t[4] ? 100 / 255 : 1),
                    b: Number(t[5]) / (t[6] ? 100 / 255 : 1),
                    a: void 0 === t[7] ? 1 : Number(t[7]) / (t[8] ? 100 : 1),
                  })
              : null;
          },
          'rgb',
        ],
        [
          function (t) {
            var n = l.exec(t) || p.exec(t);
            if (!n) return null;
            var e,
              u,
              a = g({
                h: ((e = n[1]), (u = n[2]), void 0 === u && (u = 'deg'), Number(e) * (r[u] || 1)),
                s: Number(n[3]),
                l: Number(n[4]),
                a: void 0 === n[5] ? 1 : Number(n[5]) / (n[6] ? 100 : 1),
              });
            return f(a);
          },
          'hsl',
        ],
      ],
      object: [
        [
          function (r) {
            var n = r.r,
              e = r.g,
              u = r.b,
              o = r.a,
              i = void 0 === o ? 1 : o;
            return t(n) && t(e) && t(u) ? a({ r: Number(n), g: Number(e), b: Number(u), a: Number(i) }) : null;
          },
          'rgb',
        ],
        [
          function (r) {
            var n = r.h,
              e = r.s,
              u = r.l,
              a = r.a,
              o = void 0 === a ? 1 : a;
            if (!t(n) || !t(e) || !t(u)) return null;
            var i = g({ h: Number(n), s: Number(e), l: Number(u), a: Number(o) });
            return f(i);
          },
          'hsl',
        ],
        [
          function (r) {
            var n = r.h,
              a = r.s,
              o = r.v,
              i = r.a,
              s = void 0 === i ? 1 : i;
            if (!t(n) || !t(a) || !t(o)) return null;
            var h = (function (r) {
              return { h: u(r.h), s: e(r.s, 0, 100), v: e(r.v, 0, 100), a: e(r.a) };
            })({ h: Number(n), s: Number(a), v: Number(o), a: Number(s) });
            return b(h);
          },
          'hsv',
        ],
      ],
    },
    N = function (r, t) {
      for (var n = 0; n < t.length; n++) {
        var e = t[n][0](r);
        if (e) return [e, t[n][1]];
      }
      return [null, void 0];
    },
    x = function (r) {
      return 'string' == typeof r
        ? N(r.trim(), y.string)
        : 'object' == typeof r && null !== r
          ? N(r, y.object)
          : [null, void 0];
    },
    M = function (r, t) {
      var n = c(r);
      return { h: n.h, s: e(n.s + 100 * t, 0, 100), l: n.l, a: n.a };
    },
    H = function (r) {
      return (299 * r.r + 587 * r.g + 114 * r.b) / 1e3 / 255;
    },
    $ = function (r, t) {
      var n = c(r);
      return { h: n.h, s: n.s, l: e(n.l + 100 * t, 0, 100), a: n.a };
    },
    j = (function () {
      function r(r) {
        ((this.parsed = x(r)[0]), (this.rgba = this.parsed || { r: 0, g: 0, b: 0, a: 1 }));
      }
      return (
        (r.prototype.isValid = function () {
          return null !== this.parsed;
        }),
        (r.prototype.brightness = function () {
          return n(H(this.rgba), 2);
        }),
        (r.prototype.isDark = function () {
          return H(this.rgba) < 0.5;
        }),
        (r.prototype.isLight = function () {
          return H(this.rgba) >= 0.5;
        }),
        (r.prototype.toHex = function () {
          return (
            (r = o(this.rgba)),
            (t = r.r),
            (e = r.g),
            (u = r.b),
            (i = (a = r.a) < 1 ? s(n(255 * a)) : ''),
            '#' + s(t) + s(e) + s(u) + i
          );
          var r, t, e, u, a, i;
        }),
        (r.prototype.toRgb = function () {
          return o(this.rgba);
        }),
        (r.prototype.toRgbString = function () {
          return (
            (r = o(this.rgba)),
            (t = r.r),
            (n = r.g),
            (e = r.b),
            (u = r.a) < 1 ? 'rgba(' + t + ', ' + n + ', ' + e + ', ' + u + ')' : 'rgb(' + t + ', ' + n + ', ' + e + ')'
          );
          var r, t, n, e, u;
        }),
        (r.prototype.toHsl = function () {
          return d(c(this.rgba));
        }),
        (r.prototype.toHslString = function () {
          return (
            (r = d(c(this.rgba))),
            (t = r.h),
            (n = r.s),
            (e = r.l),
            (u = r.a) < 1
              ? 'hsla(' + t + ', ' + n + '%, ' + e + '%, ' + u + ')'
              : 'hsl(' + t + ', ' + n + '%, ' + e + '%)'
          );
          var r, t, n, e, u;
        }),
        (r.prototype.toHsv = function () {
          return ((r = h(this.rgba)), { h: n(r.h), s: n(r.s), v: n(r.v), a: n(r.a, 3) });
          var r;
        }),
        (r.prototype.invert = function () {
          return w({ r: 255 - (r = this.rgba).r, g: 255 - r.g, b: 255 - r.b, a: r.a });
          var r;
        }),
        (r.prototype.saturate = function (r) {
          return (void 0 === r && (r = 0.1), w(M(this.rgba, r)));
        }),
        (r.prototype.desaturate = function (r) {
          return (void 0 === r && (r = 0.1), w(M(this.rgba, -r)));
        }),
        (r.prototype.grayscale = function () {
          return w(M(this.rgba, -1));
        }),
        (r.prototype.lighten = function (r) {
          return (void 0 === r && (r = 0.1), w($(this.rgba, r)));
        }),
        (r.prototype.darken = function (r) {
          return (void 0 === r && (r = 0.1), w($(this.rgba, -r)));
        }),
        (r.prototype.rotate = function (r) {
          return (void 0 === r && (r = 15), this.hue(this.hue() + r));
        }),
        (r.prototype.alpha = function (r) {
          return 'number' == typeof r ? w({ r: (t = this.rgba).r, g: t.g, b: t.b, a: r }) : n(this.rgba.a, 3);
          var t;
        }),
        (r.prototype.hue = function (r) {
          var t = c(this.rgba);
          return 'number' == typeof r ? w({ h: r, s: t.s, l: t.l, a: t.a }) : n(t.h);
        }),
        (r.prototype.isEqual = function (r) {
          return this.toHex() === w(r).toHex();
        }),
        r
      );
    })(),
    w = function (r) {
      return r instanceof j ? r : new j(r);
    };

  const WOBBLE = 30;
  function colors(seeder) {
    const amount = seeder() * WOBBLE - WOBBLE / 2;
    const all = COLORS.map((hex) => w(hex).rotate(amount));
    return (alpha = 1) => {
      const index = Math.floor(all.length * seeder());
      return all.splice(index, 1)[0].alpha(alpha).toHslString();
    };
  }

  function container(diameter, background = 'white', className = '', _style = {}) {
    const element = document.createElement('div');
    const style = Object.assign(
      {
        background,
        borderRadius: `${diameter / 2}px`,
        display: 'inline-block',
        height: `${diameter}px`,
        margin: '0px',
        overflow: 'hidden',
        padding: '0px',
        width: `${diameter}px`,
      },
      _style
    );
    element.className = className;
    element.style.background = background;
    Object.keys(style).forEach((key) => {
      element.style[key] = style[key];
    });
    return element;
  }

  const DIVISOR = 256 * 256;
  function seeder(_seed = new Uint8Array(32)) {
    const seed = util.isU8a(_seed) ? _seed : util.stringToU8a(_seed);
    let index = (seed[Math.floor(seed.length / 2)] % seed.length) - 1;
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

  function beachballIcon(seed, { size = 256 }, className = '', style) {
    const seeder$1 = seeder(seed);
    const colorGen = colors(seeder$1);
    const outer = container(size, 'white', className, style);
    const container$1 = container(size, colorGen());
    const svg = element(size);
    outer.appendChild(container$1);
    container$1.appendChild(svg);
    for (let count = 0; count < SHAPE_COUNT; count++) {
      const fill = colorGen();
      const shape = circle(seeder$1, fill, size, count);
      svg.appendChild(shape);
    }
    return outer;
  }

  const S = 64;
  const C = S / 2;
  const Z = (S / 64) * 5;
  const SCHEMES = [
    { colors: [0, 28, 0, 0, 28, 0, 0, 28, 0, 0, 28, 0, 0, 28, 0, 0, 28, 0, 1], freq: 1 },
    { colors: [0, 1, 3, 2, 4, 3, 0, 1, 3, 2, 4, 3, 0, 1, 3, 2, 4, 3, 5], freq: 20 },
    { colors: [1, 2, 3, 1, 2, 4, 5, 5, 4, 1, 2, 3, 1, 2, 4, 5, 5, 4, 0], freq: 16 },
    { colors: [0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 3], freq: 32 },
    { colors: [0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 6], freq: 32 },
    { colors: [0, 1, 2, 3, 4, 5, 3, 4, 2, 0, 1, 6, 7, 8, 9, 7, 8, 6, 10], freq: 128 },
    { colors: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 8, 6, 7, 5, 3, 4, 2, 11], freq: 128 },
  ];
  const SCHEMES_TOTAL = SCHEMES.map((s) => s.freq).reduce((a, b) => a + b);
  const OUTER_CIRCLE = {
    cx: C,
    cy: C,
    fill: '#eee',
    r: C,
  };
  let zeroHash = new Uint8Array();
  function getRotation(isSixPoint) {
    const r = isSixPoint ? (C / 8) * 5 : (C / 4) * 3;
    const rroot3o2 = (r * Math.sqrt(3)) / 2;
    const ro2 = r / 2;
    const rroot3o4 = (r * Math.sqrt(3)) / 4;
    const ro4 = r / 4;
    const r3o4 = (r * 3) / 4;
    return { r, r3o4, ro2, ro4, rroot3o2, rroot3o4 };
  }
  function getCircleXY(isSixPoint = false) {
    const { r, r3o4, ro2, ro4, rroot3o2, rroot3o4 } = getRotation(isSixPoint);
    return [
      [C, C - r],
      [C, C - ro2],
      [C - rroot3o4, C - r3o4],
      [C - rroot3o2, C - ro2],
      [C - rroot3o4, C - ro4],
      [C - rroot3o2, C],
      [C - rroot3o2, C + ro2],
      [C - rroot3o4, C + ro4],
      [C - rroot3o4, C + r3o4],
      [C, C + r],
      [C, C + ro2],
      [C + rroot3o4, C + r3o4],
      [C + rroot3o2, C + ro2],
      [C + rroot3o4, C + ro4],
      [C + rroot3o2, C],
      [C + rroot3o2, C - ro2],
      [C + rroot3o4, C - ro4],
      [C + rroot3o4, C - r3o4],
      [C, C],
    ];
  }
  function findScheme(d) {
    let cum = 0;
    const schema = SCHEMES.find((schema) => {
      cum += schema.freq;
      return d < cum;
    });
    if (!schema) {
      throw new Error('Unable to find schema');
    }
    return schema;
  }
  function addressToId(address) {
    if (!zeroHash.length) {
      zeroHash = utilCrypto.blake2AsU8a(new Uint8Array(32), 512);
    }
    return utilCrypto.blake2AsU8a(utilCrypto.decodeAddress(address), 512).map((x, i) => (x + 256 - zeroHash[i]) % 256);
  }
  function getColors(address) {
    const id = addressToId(address);
    const d = Math.floor((id[30] + id[31] * 256) % SCHEMES_TOTAL);
    const rot = (id[28] % 6) * 3;
    const sat = (Math.floor((id[29] * 70) / 256 + 26) % 80) + 30;
    const scheme = findScheme(d);
    const palette = Array.from(id).map((x, i) => {
      const b = (x + (i % 28) * 58) % 256;
      if (b === 0) {
        return '#444';
      } else if (b === 255) {
        return 'transparent';
      }
      const h = Math.floor(((b % 64) * 360) / 64);
      const l = [53, 15, 35, 75][Math.floor(b / 64)];
      return `hsl(${h}, ${sat}%, ${l}%)`;
    });
    return scheme.colors.map((_, i) => palette[scheme.colors[i < 18 ? (i + rot) % 18 : 18]]);
  }
  function polkadotIcon(address, { isAlternative }) {
    const xy = getCircleXY(isAlternative);
    let colors;
    try {
      colors = getColors(address);
    } catch {
      colors = new Array(xy.length).fill('#ddd');
    }
    return [OUTER_CIRCLE].concat(
      xy.map(([cx, cy], index) => ({
        cx,
        cy,
        fill: colors[index],
        r: Z,
      }))
    );
  }

  const Beachball = vue.defineComponent({
    props: ['address', 'size', 'isAlternative'],
    render() {
      const { address, isAlternative, size } = this.$props;
      return vue.h({
        template: beachballIcon(address, {
          isAlternative,
          size,
        }).outerHTML,
      });
    },
  });

  const Empty = vue.defineComponent({
    props: ['size'],
    template: `
    <svg :height="size" :width="size" viewBox="0 0 64 64">
      <circle cx="50%" cy="50%" fill="#eee" r="50%" />
    </svg>
  `,
  });

  function parseHex(hash, startPosition, octets) {
    return parseInt(hash.substr(startPosition, octets), 16);
  }
  function decToHex(v) {
    v |= 0;
    return v < 0 ? '00' : v < 16 ? '0' + v.toString(16) : v < 256 ? v.toString(16) : 'ff';
  }
  function hueToRgb(m1, m2, h) {
    h = h < 0 ? h + 6 : h > 6 ? h - 6 : h;
    return decToHex(255 * (h < 1 ? m1 + (m2 - m1) * h : h < 3 ? m2 : h < 4 ? m1 + (m2 - m1) * (4 - h) : m1));
  }
  function parseColor(color) {
    if (/^#[0-9a-f]{3,8}$/i.test(color)) {
      let result;
      const colorLength = color.length;
      if (colorLength < 6) {
        const r = color[1],
          g = color[2],
          b = color[3],
          a = color[4] || '';
        result = '#' + r + r + g + g + b + b + a + a;
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
      const m2 = lightness <= 0.5 ? lightness * (saturation + 1) : lightness + saturation - lightness * saturation,
        m1 = lightness * 2 - m2;
      result = hueToRgb(m1, m2, hue * 6 + 2) + hueToRgb(m1, m2, hue * 6) + hueToRgb(m1, m2, hue * 6 - 2);
    }
    return '#' + result;
  }
  function correctedHsl(hue, saturation, lightness) {
    const correctors = [0.55, 0.5, 0.5, 0.46, 0.6, 0.55, 0.55],
      corrector = correctors[(hue * 6 + 0.5) | 0];
    lightness = lightness < 0.5 ? lightness * corrector * 2 : corrector + (lightness - 0.5) * (1 - corrector) * 2;
    return hsl(hue, saturation, lightness);
  }
  const GLOBAL =
    typeof window !== 'undefined'
      ? window
      : typeof self !== 'undefined'
        ? self
        : typeof global !== 'undefined'
          ? global
          : {};
  const CONFIG_PROPERTIES = {
    V: 'jdenticon_config',
    n: 'config',
  };
  var rootConfigurationHolder = {};
  function getConfiguration(paddingOrLocalConfig, defaultPadding) {
    const configObject = rootConfigurationHolder[CONFIG_PROPERTIES.n] || GLOBAL[CONFIG_PROPERTIES.V] || {},
      lightnessConfig = configObject['lightness'] || {},
      saturation = configObject['saturation'] || {},
      colorSaturation = 'color' in saturation ? saturation['color'] : saturation,
      grayscaleSaturation = saturation['grayscale'],
      backColor = configObject['backColor'],
      padding = configObject['padding'];
    function lightness(configName, defaultRange) {
      let range = lightnessConfig[configName];
      if (!(range && range.length > 1)) {
        range = defaultRange;
      }
      return function (value) {
        value = range[0] + value * (range[1] - range[0]);
        return value < 0 ? 0 : value > 1 ? 1 : value;
      };
    }
    function hueFunction(originalHue) {
      const hueConfig = configObject['hues'];
      let hue;
      if (hueConfig && hueConfig.length > 0) {
        hue = hueConfig[0 | (0.999 * originalHue * hueConfig.length)];
      }
      return typeof hue == 'number' ? (((hue / 360) % 1) + 1) % 1 : originalHue;
    }
    return {
      W: hueFunction,
      o: typeof colorSaturation == 'number' ? colorSaturation : 0.5,
      D: typeof grayscaleSaturation == 'number' ? grayscaleSaturation : 0,
      p: lightness('color', [0.4, 0.8]),
      F: lightness('grayscale', [0.3, 0.9]),
      G: parseColor(backColor),
      X: typeof padding == 'number' ? padding : defaultPadding,
    };
  }
  class Point {
    constructor(x, y) {
      this.x = x;
      this.y = y;
    }
  }
  class Transform {
    constructor(x, y, size, rotation) {
      this.q = x;
      this.t = y;
      this.H = size;
      this.Y = rotation;
    }
    I(x, y, w, h) {
      const right = this.q + this.H,
        bottom = this.t + this.H,
        rotation = this.Y;
      return rotation === 1
        ? new Point(right - y - (h || 0), this.t + x)
        : rotation === 2
          ? new Point(right - x - (w || 0), bottom - y - (h || 0))
          : rotation === 3
            ? new Point(this.q + y, bottom - x - (w || 0))
            : new Point(this.q + x, this.t + y);
    }
  }
  const NO_TRANSFORM = new Transform(0, 0, 0, 0);
  class Graphics {
    constructor(renderer) {
      this.J = renderer;
      this.u = NO_TRANSFORM;
    }
    g(points, invert) {
      const di = invert ? -2 : 2,
        transformedPoints = [];
      for (let i = invert ? points.length - 2 : 0; i < points.length && i >= 0; i += di) {
        transformedPoints.push(this.u.I(points[i], points[i + 1]));
      }
      this.J.g(transformedPoints);
    }
    h(x, y, size, invert) {
      const p = this.u.I(x, y, size, size);
      this.J.h(p, size, invert);
    }
    i(x, y, w, h, invert) {
      this.g([x, y, x + w, y, x + w, y + h, x, y + h], invert);
    }
    j(x, y, w, h, r, invert) {
      const points = [x + w, y, x + w, y + h, x, y + h, x, y];
      points.splice(((r || 0) % 4) * 2, 2);
      this.g(points, invert);
    }
    K(x, y, w, h, invert) {
      this.g([x + w / 2, y, x + w, y + h / 2, x + w / 2, y + h, x, y + h / 2], invert);
    }
  }
  function centerShape(index, g, cell, positionIndex) {
    index = index % 14;
    let k, m, w, h, inner, outer;
    !index
      ? ((k = cell * 0.42), g.g([0, 0, cell, 0, cell, cell - k * 2, cell - k, cell, 0, cell]))
      : index == 1
        ? ((w = 0 | (cell * 0.5)), (h = 0 | (cell * 0.8)), g.j(cell - w, 0, w, h, 2))
        : index == 2
          ? ((w = 0 | (cell / 3)), g.i(w, w, cell - w, cell - w))
          : index == 3
            ? ((inner = cell * 0.1),
              (outer = cell < 6 ? 1 : cell < 8 ? 2 : 0 | (cell * 0.25)),
              (inner = inner > 1 ? 0 | inner : inner > 0.5 ? 1 : inner),
              g.i(outer, outer, cell - inner - outer, cell - inner - outer))
            : index == 4
              ? ((m = 0 | (cell * 0.15)), (w = 0 | (cell * 0.5)), g.h(cell - w - m, cell - w - m, w))
              : index == 5
                ? ((inner = cell * 0.1),
                  (outer = inner * 4),
                  outer > 3 && (outer = 0 | outer),
                  g.i(0, 0, cell, cell),
                  g.g([outer, outer, cell - inner, outer, outer + (cell - outer - inner) / 2, cell - inner], true))
                : index == 6
                  ? g.g([0, 0, cell, 0, cell, cell * 0.7, cell * 0.4, cell * 0.4, cell * 0.7, cell, 0, cell])
                  : index == 7
                    ? g.j(cell / 2, cell / 2, cell / 2, cell / 2, 3)
                    : index == 8
                      ? (g.i(0, 0, cell, cell / 2),
                        g.i(0, cell / 2, cell / 2, cell / 2),
                        g.j(cell / 2, cell / 2, cell / 2, cell / 2, 1))
                      : index == 9
                        ? ((inner = cell * 0.14),
                          (outer = cell < 4 ? 1 : cell < 6 ? 2 : 0 | (cell * 0.35)),
                          (inner = cell < 8 ? inner : 0 | inner),
                          g.i(0, 0, cell, cell),
                          g.i(outer, outer, cell - outer - inner, cell - outer - inner, true))
                        : index == 10
                          ? ((inner = cell * 0.12),
                            (outer = inner * 3),
                            g.i(0, 0, cell, cell),
                            g.h(outer, outer, cell - inner - outer, true))
                          : index == 11
                            ? g.j(cell / 2, cell / 2, cell / 2, cell / 2, 3)
                            : index == 12
                              ? ((m = cell * 0.25), g.i(0, 0, cell, cell), g.K(m, m, cell - m, cell - m, true))
                              : !positionIndex && ((m = cell * 0.4), (w = cell * 1.2), g.h(m, m, w));
  }
  function outerShape(index, g, cell) {
    index = index % 4;
    let m;
    !index
      ? g.j(0, 0, cell, cell, 0)
      : index == 1
        ? g.j(0, cell / 2, cell, cell / 2, 0)
        : index == 2
          ? g.K(0, 0, cell, cell)
          : ((m = cell / 6), g.h(m, m, cell - 2 * m));
  }
  function colorTheme(hue, config) {
    hue = config.W(hue);
    return [
      correctedHsl(hue, config.D, config.F(0)),
      correctedHsl(hue, config.o, config.p(0.5)),
      correctedHsl(hue, config.D, config.F(1)),
      correctedHsl(hue, config.o, config.p(1)),
      correctedHsl(hue, config.o, config.p(0)),
    ];
  }
  function iconGenerator(renderer, hash, config) {
    const parsedConfig = getConfiguration(config, 0.08);
    if (parsedConfig.G) {
      renderer.m(parsedConfig.G);
    }
    let size = renderer.k;
    const padding = (0.5 + size * parsedConfig.X) | 0;
    size -= padding * 2;
    const graphics = new Graphics(renderer);
    const cell = 0 | (size / 4);
    const x = 0 | (padding + size / 2 - cell * 2);
    const y = 0 | (padding + size / 2 - cell * 2);
    function renderShape(colorIndex, shapes, index, rotationIndex, positions) {
      const shapeIndex = parseHex(hash, index, 1);
      let r = rotationIndex ? parseHex(hash, rotationIndex, 1) : 0;
      renderer.L(availableColors[selectedColorIndexes[colorIndex]]);
      for (let i = 0; i < positions.length; i++) {
        graphics.u = new Transform(x + positions[i][0] * cell, y + positions[i][1] * cell, cell, r++ % 4);
        shapes(shapeIndex, graphics, cell, i);
      }
      renderer.M();
    }
    const hue = parseHex(hash, -7) / 0xfffffff,
      availableColors = colorTheme(hue, parsedConfig),
      selectedColorIndexes = [];
    let index;
    function isDuplicate(values) {
      if (values.indexOf(index) >= 0) {
        for (let i = 0; i < values.length; i++) {
          if (selectedColorIndexes.indexOf(values[i]) >= 0) {
            return true;
          }
        }
      }
    }
    for (let i = 0; i < 3; i++) {
      index = parseHex(hash, 8 + i, 1) % availableColors.length;
      if (isDuplicate([0, 4]) || isDuplicate([2, 3])) {
        index = 1;
      }
      selectedColorIndexes.push(index);
    }
    renderShape(0, outerShape, 2, 3, [
      [1, 0],
      [2, 0],
      [2, 3],
      [1, 3],
      [0, 1],
      [3, 1],
      [3, 2],
      [0, 2],
    ]);
    renderShape(1, outerShape, 4, 5, [
      [0, 0],
      [3, 0],
      [3, 3],
      [0, 3],
    ]);
    renderShape(2, centerShape, 1, null, [
      [1, 1],
      [2, 1],
      [2, 2],
      [1, 2],
    ]);
    renderer.finish();
  }
  function sha1(message) {
    const HASH_SIZE_HALF_BYTES = 40;
    const BLOCK_SIZE_WORDS = 16;
    var i = 0,
      f = 0,
      urlEncodedMessage = encodeURI(message) + '%80',
      data = [],
      dataSize,
      hashBuffer = [],
      a = 0x67452301,
      b = 0xefcdab89,
      c = ~a,
      d = ~b,
      e = 0xc3d2e1f0,
      hash = [a, b, c, d, e],
      blockStartIndex = 0,
      hexHash = '';
    function rotl(value, shift) {
      return (value << shift) | (value >>> (32 - shift));
    }
    for (; i < urlEncodedMessage.length; f++) {
      data[f >> 2] =
        data[f >> 2] |
        ((urlEncodedMessage[i] == '%'
          ? parseInt(urlEncodedMessage.substring(i + 1, (i += 3)), 16)
          : urlEncodedMessage.charCodeAt(i++)) <<
          ((3 - (f & 3)) * 8));
    }
    dataSize = (((f + 7) >> 6) + 1) * BLOCK_SIZE_WORDS;
    data[dataSize - 1] = f * 8 - 8;
    for (; blockStartIndex < dataSize; blockStartIndex += BLOCK_SIZE_WORDS) {
      for (i = 0; i < 80; i++) {
        f =
          rotl(a, 5) +
          e +
          (i < 20
            ? ((b & c) ^ (~b & d)) + 0x5a827999
            : i < 40
              ? (b ^ c ^ d) + 0x6ed9eba1
              : i < 60
                ? ((b & c) ^ (b & d) ^ (c & d)) + 0x8f1bbcdc
                : (b ^ c ^ d) + 0xca62c1d6) +
          (hashBuffer[i] =
            i < BLOCK_SIZE_WORDS
              ? data[blockStartIndex + i] | 0
              : rotl(hashBuffer[i - 3] ^ hashBuffer[i - 8] ^ hashBuffer[i - 14] ^ hashBuffer[i - 16], 1));
        e = d;
        d = c;
        c = rotl(b, 30);
        b = a;
        a = f;
      }
      hash[0] = a = (hash[0] + a) | 0;
      hash[1] = b = (hash[1] + b) | 0;
      hash[2] = c = (hash[2] + c) | 0;
      hash[3] = d = (hash[3] + d) | 0;
      hash[4] = e = (hash[4] + e) | 0;
    }
    for (i = 0; i < HASH_SIZE_HALF_BYTES; i++) {
      hexHash += ((hash[i >> 3] >>> ((7 - (i & 7)) * 4)) & 0xf).toString(16);
    }
    return hexHash;
  }
  function isValidHash(hashCandidate) {
    return /^[0-9a-f]{11,}$/i.test(hashCandidate) && hashCandidate;
  }
  function computeHash(value) {
    return sha1(value == null ? '' : '' + value);
  }
  function svgValue(value) {
    return ((value * 10 + 0.5) | 0) / 10;
  }
  class SvgPath {
    constructor() {
      this.v = '';
    }
    g(points) {
      let dataString = '';
      for (let i = 0; i < points.length; i++) {
        dataString += (i ? 'L' : 'M') + svgValue(points[i].x) + ' ' + svgValue(points[i].y);
      }
      this.v += dataString + 'Z';
    }
    h(point, diameter, counterClockwise) {
      const sweepFlag = counterClockwise ? 0 : 1,
        svgRadius = svgValue(diameter / 2),
        svgDiameter = svgValue(diameter),
        svgArc = 'a' + svgRadius + ',' + svgRadius + ' 0 1,' + sweepFlag + ' ';
      this.v +=
        'M' +
        svgValue(point.x) +
        ' ' +
        svgValue(point.y + diameter / 2) +
        svgArc +
        svgDiameter +
        ',0' +
        svgArc +
        -svgDiameter +
        ',0';
    }
  }
  class SvgRenderer {
    constructor(target) {
      this.A;
      this.B = {};
      this.N = target;
      this.k = target.k;
    }
    m(fillColor) {
      const match = /^(#......)(..)?/.exec(fillColor),
        opacity = match[2] ? parseHex(match[2], 0) / 255 : 1;
      this.N.m(match[1], opacity);
    }
    L(color) {
      this.A = this.B[color] || (this.B[color] = new SvgPath());
    }
    M() {}
    g(points) {
      this.A.g(points);
    }
    h(point, diameter, counterClockwise) {
      this.A.h(point, diameter, counterClockwise);
    }
    finish() {
      const pathsByColor = this.B;
      for (let color in pathsByColor) {
        if (pathsByColor.hasOwnProperty(color)) {
          this.N.O(color, pathsByColor[color].v);
        }
      }
    }
  }
  const SVG_CONSTANTS = {
    P: 'http://www.w3.org/2000/svg',
    R: 'width',
    S: 'height',
  };
  class SvgWriter {
    constructor(iconSize) {
      this.k = iconSize;
      this.C =
        '<svg xmlns="' +
        SVG_CONSTANTS.P +
        '" width="' +
        iconSize +
        '" height="' +
        iconSize +
        '" viewBox="0 0 ' +
        iconSize +
        ' ' +
        iconSize +
        '">';
    }
    m(fillColor, opacity) {
      if (opacity) {
        this.C += '<rect width="100%" height="100%" fill="' + fillColor + '" opacity="' + opacity.toFixed(2) + '"/>';
      }
    }
    O(color, dataString) {
      this.C += '<path fill="' + color + '" d="' + dataString + '"/>';
    }
    toString() {
      return this.C + '</svg>';
    }
  }
  function toSvg(hashOrValue, size, config) {
    const writer = new SvgWriter(size);
    iconGenerator(new SvgRenderer(writer), isValidHash(hashOrValue) || computeHash(hashOrValue), config);
    return writer.toString();
  }
  typeof document !== 'undefined' && document.querySelectorAll.bind(document);

  const Jdenticon = vue.defineComponent({
    props: ['publicKey', 'size'],
    render() {
      const { publicKey, size } = this.$props;
      return vue.h({
        template: toSvg(publicKey.substring(2), size),
      });
    },
  });

  function adaptVNodeAttrs(data) {
    return data;
  }

  const Polkadot = vue.defineComponent({
    props: ['address', 'isAlternative', 'size'],
    render() {
      const { address, isAlternative, size } = this.$props;
      const circles = polkadotIcon(address, { isAlternative }).map(({ cx, cy, fill, r }) =>
        vue.h('circle', { ...adaptVNodeAttrs({ cx, cy, fill, r }) }, [])
      );
      return vue.h(
        'svg',
        {
          ...adaptVNodeAttrs({
            height: size,
            viewBox: '0 0 64 64',
            width: size,
          }),
        },
        circles
      );
    },
  });

  const DEFAULT_SIZE = 64;
  function resolvePublicKey(value, prefix) {
    if (util.isHex(value) && utilCrypto.isEthereumAddress(value)) {
      return value.padEnd(66, '0');
    }
    return util.isU8a(value) || util.isHex(value) ? utilCrypto.encodeAddress(value, prefix) : value;
  }
  function encodeAccount(value, prefix) {
    try {
      const address = resolvePublicKey(value, prefix);
      const publicKey = util.u8aToHex(utilCrypto.decodeAddress(address, false, prefix));
      return { address, publicKey };
    } catch {
      return { address: '', publicKey: '0x' };
    }
  }
  const Identicon = vue.defineComponent({
    components: {
      Beachball,
      Empty,
      Jdenticon,
      Polkadot,
    },
    created: function () {
      this.createData();
    },
    data: function () {
      return {
        address: '',
        iconSize: DEFAULT_SIZE,
        isAlternativeIcon: false,
        publicKey: '0x',
        type: 'empty',
      };
    },
    methods: {
      createData: function () {
        this.iconSize = this.size || DEFAULT_SIZE;
        this.type = this.theme;
        this.isAlternativeIcon = this.isAlternative || false;
        this.recodeAddress();
      },
      recodeAddress: function () {
        const { address, publicKey } = encodeAccount(this.value);
        this.address = address;
        this.publicKey = publicKey;
      },
    },
    props: ['prefix', 'isAlternative', 'size', 'theme', 'value'],
    render() {
      const { address, iconSize, isAlternativeIcon, publicKey, type } = this.$data;
      if (type === 'empty') {
        return vue.h(
          Empty,
          {
            ...adaptVNodeAttrs({
              key: address,
              size: iconSize,
            }),
          },
          []
        );
      } else if (type === 'jdenticon') {
        return vue.h(
          Jdenticon,
          {
            ...adaptVNodeAttrs({
              key: address,
              publicKey,
              size: iconSize,
            }),
          },
          []
        );
      } else if (type === 'substrate') {
        throw new Error('substrate type is not supported');
      }
      const cmp = type.charAt(0).toUpperCase() + type.slice(1);
      if (['Beachball', 'Polkadot'].includes(cmp)) {
        const component = cmp === 'Beachball' ? Beachball : Polkadot;
        return vue.h(
          component,
          {
            ...adaptVNodeAttrs({
              address,
              isAlternative: isAlternativeIcon,
              key: address,
              size: iconSize,
            }),
          },
          []
        );
      } else {
        return vue.h(cmp, {}, []);
      }
    },
    watch: {
      value: function () {
        this.recodeAddress();
      },
    },
  });

  const packageInfo = {
    name: '@polkadot/vue-identicon',
    path:
      {
        url:
          typeof document === 'undefined' && typeof location === 'undefined'
            ? require('u' + 'rl').pathToFileURL(__filename).href
            : typeof document === 'undefined'
              ? location.href
              : (_documentCurrentScript && _documentCurrentScript.src) ||
                new URL('bundle-polkadot-vue-identicon.js', document.baseURI).href,
      } &&
      (typeof document === 'undefined' && typeof location === 'undefined'
        ? require('u' + 'rl').pathToFileURL(__filename).href
        : typeof document === 'undefined'
          ? location.href
          : (_documentCurrentScript && _documentCurrentScript.src) ||
            new URL('bundle-polkadot-vue-identicon.js', document.baseURI).href)
        ? new URL(
            typeof document === 'undefined' && typeof location === 'undefined'
              ? require('u' + 'rl').pathToFileURL(__filename).href
              : typeof document === 'undefined'
                ? location.href
                : (_documentCurrentScript && _documentCurrentScript.src) ||
                  new URL('bundle-polkadot-vue-identicon.js', document.baseURI).href
          ).pathname.substring(
            0,
            new URL(
              typeof document === 'undefined' && typeof location === 'undefined'
                ? require('u' + 'rl').pathToFileURL(__filename).href
                : typeof document === 'undefined'
                  ? location.href
                  : (_documentCurrentScript && _documentCurrentScript.src) ||
                    new URL('bundle-polkadot-vue-identicon.js', document.baseURI).href
            ).pathname.lastIndexOf('/') + 1
          )
        : 'auto',
    type: 'esm',
    version: '4.0.0',
  };

  exports.Identicon = Identicon;
  exports.packageInfo = packageInfo;
});
