import { O as Oe } from "./CedeStore-DfpiZiOO.js";
var A = { exports: {} }, v, E;
function S() {
  if (E)
    return v;
  E = 1;
  var i = 1e3, s = i * 60, n = s * 60, u = n * 24, F = u * 7, g = u * 365.25;
  v = function(e, r) {
    r = r || {};
    var t = typeof e;
    if (t === "string" && e.length > 0)
      return h(e);
    if (t === "number" && isFinite(e))
      return r.long ? o(e) : d(e);
    throw new Error(
      "val is not a non-empty string or a valid number. val=" + JSON.stringify(e)
    );
  };
  function h(e) {
    if (e = String(e), !(e.length > 100)) {
      var r = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
        e
      );
      if (r) {
        var t = parseFloat(r[1]), C = (r[2] || "ms").toLowerCase();
        switch (C) {
          case "years":
          case "year":
          case "yrs":
          case "yr":
          case "y":
            return t * g;
          case "weeks":
          case "week":
          case "w":
            return t * F;
          case "days":
          case "day":
          case "d":
            return t * u;
          case "hours":
          case "hour":
          case "hrs":
          case "hr":
          case "h":
            return t * n;
          case "minutes":
          case "minute":
          case "mins":
          case "min":
          case "m":
            return t * s;
          case "seconds":
          case "second":
          case "secs":
          case "sec":
          case "s":
            return t * i;
          case "milliseconds":
          case "millisecond":
          case "msecs":
          case "msec":
          case "ms":
            return t;
          default:
            return;
        }
      }
    }
  }
  function d(e) {
    var r = Math.abs(e);
    return r >= u ? Math.round(e / u) + "d" : r >= n ? Math.round(e / n) + "h" : r >= s ? Math.round(e / s) + "m" : r >= i ? Math.round(e / i) + "s" : e + "ms";
  }
  function o(e) {
    var r = Math.abs(e);
    return r >= u ? a(e, r, u, "day") : r >= n ? a(e, r, n, "hour") : r >= s ? a(e, r, s, "minute") : r >= i ? a(e, r, i, "second") : e + " ms";
  }
  function a(e, r, t, C) {
    var m = r >= t * 1.5;
    return Math.round(e / t) + " " + C + (m ? "s" : "");
  }
  return v;
}
function j(i) {
  n.debug = n, n.default = n, n.coerce = o, n.disable = g, n.enable = F, n.enabled = h, n.humanize = S(), n.destroy = a, Object.keys(i).forEach((e) => {
    n[e] = i[e];
  }), n.names = [], n.skips = [], n.formatters = {};
  function s(e) {
    let r = 0;
    for (let t = 0; t < e.length; t++)
      r = (r << 5) - r + e.charCodeAt(t), r |= 0;
    return n.colors[Math.abs(r) % n.colors.length];
  }
  n.selectColor = s;
  function n(e) {
    let r, t = null, C, m;
    function l(...c) {
      if (!l.enabled)
        return;
      const f = l, p = Number(/* @__PURE__ */ new Date()), M = p - (r || p);
      f.diff = M, f.prev = r, f.curr = p, r = p, c[0] = n.coerce(c[0]), typeof c[0] != "string" && c.unshift("%O");
      let y = 0;
      c[0] = c[0].replace(/%([a-zA-Z%])/g, (b, x) => {
        if (b === "%%")
          return "%";
        y++;
        const k = n.formatters[x];
        if (typeof k == "function") {
          const I = c[y];
          b = k.call(f, I), c.splice(y, 1), y--;
        }
        return b;
      }), n.formatArgs.call(f, c), (f.log || n.log).apply(f, c);
    }
    return l.namespace = e, l.useColors = n.useColors(), l.color = n.selectColor(e), l.extend = u, l.destroy = n.destroy, Object.defineProperty(l, "enabled", {
      enumerable: true,
      configurable: false,
      get: () => t !== null ? t : (C !== n.namespaces && (C = n.namespaces, m = n.enabled(e)), m),
      set: (c) => {
        t = c;
      }
    }), typeof n.init == "function" && n.init(l), l;
  }
  function u(e, r) {
    const t = n(this.namespace + (typeof r > "u" ? ":" : r) + e);
    return t.log = this.log, t;
  }
  function F(e) {
    n.save(e), n.namespaces = e, n.names = [], n.skips = [];
    let r;
    const t = (typeof e == "string" ? e : "").split(/[\s,]+/), C = t.length;
    for (r = 0; r < C; r++)
      t[r] && (e = t[r].replace(/\*/g, ".*?"), e[0] === "-" ? n.skips.push(new RegExp("^" + e.slice(1) + "$")) : n.names.push(new RegExp("^" + e + "$")));
  }
  function g() {
    const e = [
      ...n.names.map(d),
      ...n.skips.map(d).map((r) => "-" + r)
    ].join(",");
    return n.enable(""), e;
  }
  function h(e) {
    if (e[e.length - 1] === "*")
      return true;
    let r, t;
    for (r = 0, t = n.skips.length; r < t; r++)
      if (n.skips[r].test(e))
        return false;
    for (r = 0, t = n.names.length; r < t; r++)
      if (n.names[r].test(e))
        return true;
    return false;
  }
  function d(e) {
    return e.toString().substring(2, e.toString().length - 2).replace(/\.\*\?$/, "*");
  }
  function o(e) {
    return e instanceof Error ? e.stack || e.message : e;
  }
  function a() {
    console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
  }
  return n.enable(n.load()), n;
}
var O = j;
(function(i, s) {
  s.formatArgs = u, s.save = F, s.load = g, s.useColors = n, s.storage = h(), s.destroy = /* @__PURE__ */ (() => {
    let o = false;
    return () => {
      o || (o = true, console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."));
    };
  })(), s.colors = [
    "#0000CC",
    "#0000FF",
    "#0033CC",
    "#0033FF",
    "#0066CC",
    "#0066FF",
    "#0099CC",
    "#0099FF",
    "#00CC00",
    "#00CC33",
    "#00CC66",
    "#00CC99",
    "#00CCCC",
    "#00CCFF",
    "#3300CC",
    "#3300FF",
    "#3333CC",
    "#3333FF",
    "#3366CC",
    "#3366FF",
    "#3399CC",
    "#3399FF",
    "#33CC00",
    "#33CC33",
    "#33CC66",
    "#33CC99",
    "#33CCCC",
    "#33CCFF",
    "#6600CC",
    "#6600FF",
    "#6633CC",
    "#6633FF",
    "#66CC00",
    "#66CC33",
    "#9900CC",
    "#9900FF",
    "#9933CC",
    "#9933FF",
    "#99CC00",
    "#99CC33",
    "#CC0000",
    "#CC0033",
    "#CC0066",
    "#CC0099",
    "#CC00CC",
    "#CC00FF",
    "#CC3300",
    "#CC3333",
    "#CC3366",
    "#CC3399",
    "#CC33CC",
    "#CC33FF",
    "#CC6600",
    "#CC6633",
    "#CC9900",
    "#CC9933",
    "#CCCC00",
    "#CCCC33",
    "#FF0000",
    "#FF0033",
    "#FF0066",
    "#FF0099",
    "#FF00CC",
    "#FF00FF",
    "#FF3300",
    "#FF3333",
    "#FF3366",
    "#FF3399",
    "#FF33CC",
    "#FF33FF",
    "#FF6600",
    "#FF6633",
    "#FF9900",
    "#FF9933",
    "#FFCC00",
    "#FFCC33"
  ];
  function n() {
    return typeof window < "u" && window.process && (window.process.type === "renderer" || window.process.__nwjs) ? true : typeof navigator < "u" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/) ? false : typeof document < "u" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
    typeof window < "u" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    typeof navigator < "u" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
    typeof navigator < "u" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
  }
  function u(o) {
    if (o[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + o[0] + (this.useColors ? "%c " : " ") + "+" + i.exports.humanize(this.diff), !this.useColors)
      return;
    const a = "color: " + this.color;
    o.splice(1, 0, a, "color: inherit");
    let e = 0, r = 0;
    o[0].replace(/%[a-zA-Z%]/g, (t) => {
      t !== "%%" && (e++, t === "%c" && (r = e));
    }), o.splice(r, 0, a);
  }
  s.log = console.debug || console.log || (() => {
  });
  function F(o) {
    try {
      o ? s.storage.setItem("debug", o) : s.storage.removeItem("debug");
    } catch {
    }
  }
  function g() {
    let o;
    try {
      o = s.storage.getItem("debug");
    } catch {
    }
    return !o && typeof Oe < "u" && "env" in Oe && (o = Oe.env.DEBUG), o;
  }
  function h() {
    try {
      return localStorage;
    } catch {
    }
  }
  i.exports = O(s);
  const { formatters: d } = i.exports;
  d.j = function(o) {
    try {
      return JSON.stringify(o);
    } catch (a) {
      return "[UnexpectedJSONParseError]: " + a.message;
    }
  };
})(A, A.exports);
var N = A.exports;
export {
  N
};
