import { U as Ue } from "./CedeStore-DfpiZiOO.js";
var Se = { exports: {} }, Ce = { exports: {} };
Ce.exports;
(function(a, s) {
  (function(c) {
    var g = s && !s.nodeType && s, d = a && !a.nodeType && a, x = typeof Ue == "object" && Ue;
    (x.global === x || x.window === x || x.self === x) && (c = x);
    var w, E = 2147483647, I = 36, R = 1, N = 26, ne = 38, Q = 700, M = 72, J = 128, T = "-", Ae = /^xn--/, Oe = /[^\x20-\x7E]/, xe = /[\x2E\u3002\uFF0E\uFF61]/g, Ie = {
      overflow: "Overflow: input needs wider integers to process",
      "not-basic": "Illegal input >= 0x80 (not a basic code point)",
      "invalid-input": "Invalid input"
    }, fe = I - R, P = Math.floor, k = String.fromCharCode, oe;
    function X(n) {
      throw new RangeError(Ie[n]);
    }
    function ue(n, h) {
      for (var u = n.length, p = []; u--; )
        p[u] = h(n[u]);
      return p;
    }
    function ye(n, h) {
      var u = n.split("@"), p = "";
      u.length > 1 && (p = u[0] + "@", n = u[1]), n = n.replace(xe, ".");
      var m = n.split("."), A = ue(m, h).join(".");
      return p + A;
    }
    function be(n) {
      for (var h = [], u = 0, p = n.length, m, A; u < p; )
        m = n.charCodeAt(u++), m >= 55296 && m <= 56319 && u < p ? (A = n.charCodeAt(u++), (A & 64512) == 56320 ? h.push(((m & 1023) << 10) + (A & 1023) + 65536) : (h.push(m), u--)) : h.push(m);
      return h;
    }
    function ae(n) {
      return ue(n, function(h) {
        var u = "";
        return h > 65535 && (h -= 65536, u += k(h >>> 10 & 1023 | 55296), h = 56320 | h & 1023), u += k(h), u;
      }).join("");
    }
    function ee(n) {
      return n - 48 < 10 ? n - 22 : n - 65 < 26 ? n - 65 : n - 97 < 26 ? n - 97 : I;
    }
    function ie(n, h) {
      return n + 22 + 75 * (n < 26) - ((h != 0) << 5);
    }
    function te(n, h, u) {
      var p = 0;
      for (n = u ? P(n / Q) : n >> 1, n += P(n / h); n > fe * N >> 1; p += I)
        n = P(n / fe);
      return P(p + (fe + 1) * n / (n + ne));
    }
    function we(n) {
      var h = [], u = n.length, p, m = 0, A = J, y = M, v, L, D, z, O, _, S, W, Y;
      for (v = n.lastIndexOf(T), v < 0 && (v = 0), L = 0; L < v; ++L)
        n.charCodeAt(L) >= 128 && X("not-basic"), h.push(n.charCodeAt(L));
      for (D = v > 0 ? v + 1 : 0; D < u; ) {
        for (z = m, O = 1, _ = I; D >= u && X("invalid-input"), S = ee(n.charCodeAt(D++)), (S >= I || S > P((E - m) / O)) && X("overflow"), m += S * O, W = _ <= y ? R : _ >= y + N ? N : _ - y, !(S < W); _ += I)
          Y = I - W, O > P(E / Y) && X("overflow"), O *= Y;
        p = h.length + 1, y = te(m - z, p, z == 0), P(m / p) > E - A && X("overflow"), A += P(m / p), m %= p, h.splice(m++, 0, A);
      }
      return ae(h);
    }
    function Re(n) {
      var h, u, p, m, A, y, v, L, D, z, O, _ = [], S, W, Y, ce;
      for (n = be(n), S = n.length, h = J, u = 0, A = M, y = 0; y < S; ++y)
        O = n[y], O < 128 && _.push(k(O));
      for (p = m = _.length, m && _.push(T); p < S; ) {
        for (v = E, y = 0; y < S; ++y)
          O = n[y], O >= h && O < v && (v = O);
        for (W = p + 1, v - h > P((E - u) / W) && X("overflow"), u += (v - h) * W, h = v, y = 0; y < S; ++y)
          if (O = n[y], O < h && ++u > E && X("overflow"), O == h) {
            for (L = u, D = I; z = D <= A ? R : D >= A + N ? N : D - A, !(L < z); D += I)
              ce = L - z, Y = I - z, _.push(
                k(ie(z + ce % Y, 0))
              ), L = P(ce / Y);
            _.push(k(ie(L, 0))), A = te(u, W, p == m), u = 0, ++p;
          }
        ++u, ++h;
      }
      return _.join("");
    }
    function Te(n) {
      return ye(n, function(h) {
        return Ae.test(h) ? we(h.slice(4).toLowerCase()) : h;
      });
    }
    function je(n) {
      return ye(n, function(h) {
        return Oe.test(h) ? "xn--" + Re(h) : h;
      });
    }
    if (w = {
      /**
       * A string representing the current Punycode.js version number.
       * @memberOf punycode
       * @type String
       */
      version: "1.4.1",
      /**
       * An object of methods to convert from JavaScript's internal character
       * representation (UCS-2) to Unicode code points, and back.
       * @see <https://mathiasbynens.be/notes/javascript-encoding>
       * @memberOf punycode
       * @type Object
       */
      ucs2: {
        decode: be,
        encode: ae
      },
      decode: we,
      encode: Re,
      toASCII: je,
      toUnicode: Te
    }, g && d)
      if (a.exports == g)
        d.exports = w;
      else
        for (oe in w)
          w.hasOwnProperty(oe) && (g[oe] = w[oe]);
    else
      c.punycode = w;
  })(Ue);
})(Ce, Ce.exports);
var Ve = Ce.exports, $e = { exports: {} }, ge = {};
function Je(a, s) {
  return Object.prototype.hasOwnProperty.call(a, s);
}
var Xe = function(a, s, c, g) {
  s = s || "&", c = c || "=";
  var d = {};
  if (typeof a != "string" || a.length === 0)
    return d;
  var x = /\+/g;
  a = a.split(s);
  var w = 1e3;
  g && typeof g.maxKeys == "number" && (w = g.maxKeys);
  var E = a.length;
  w > 0 && E > w && (E = w);
  for (var I = 0; I < E; ++I) {
    var R = a[I].replace(x, "%20"), N = R.indexOf(c), ne, Q, M, J;
    N >= 0 ? (ne = R.substr(0, N), Q = R.substr(N + 1)) : (ne = R, Q = ""), M = decodeURIComponent(ne), J = decodeURIComponent(Q), Je(d, M) ? Ye(d[M]) ? d[M].push(J) : d[M] = [d[M], J] : d[M] = J;
  }
  return d;
}, Ye = Array.isArray || function(a) {
  return Object.prototype.toString.call(a) === "[object Array]";
}, ve = function(a) {
  switch (typeof a) {
    case "string":
      return a;
    case "boolean":
      return a ? "true" : "false";
    case "number":
      return isFinite(a) ? a : "";
    default:
      return "";
  }
}, He = function(a, s, c, g) {
  return s = s || "&", c = c || "=", a === null && (a = void 0), typeof a == "object" ? Ke(ke(a), function(d) {
    var x = encodeURIComponent(ve(d)) + c;
    return Qe(a[d]) ? Ke(a[d], function(w) {
      return x + encodeURIComponent(ve(w));
    }).join(s) : x + encodeURIComponent(ve(a[d]));
  }).join(s) : g ? encodeURIComponent(ve(g)) + c + encodeURIComponent(ve(a)) : "";
}, Qe = Array.isArray || function(a) {
  return Object.prototype.toString.call(a) === "[object Array]";
};
function Ke(a, s) {
  if (a.map)
    return a.map(s);
  for (var c = [], g = 0; g < a.length; g++)
    c.push(s(a[g], g));
  return c;
}
var ke = Object.keys || function(a) {
  var s = [];
  for (var c in a)
    Object.prototype.hasOwnProperty.call(a, c) && s.push(c);
  return s;
};
ge.decode = ge.parse = Xe;
ge.encode = ge.stringify = He;
(function(a, s) {
  Object.defineProperty(s, "__esModule", { value: true });
  var c = ge;
  function g(w) {
    return encodeURIComponent(w);
  }
  function d(w) {
    return decodeURIComponent(w);
  }
  var x = {
    decode: c.decode,
    encode: c.encode,
    parse: c.parse,
    stringify: c.stringify,
    escape: g,
    unescape: d
  };
  Object.defineProperty(s, "decode", {
    enumerable: true,
    get: function() {
      return c.decode;
    }
  }), Object.defineProperty(s, "encode", {
    enumerable: true,
    get: function() {
      return c.encode;
    }
  }), Object.defineProperty(s, "parse", {
    enumerable: true,
    get: function() {
      return c.parse;
    }
  }), Object.defineProperty(s, "stringify", {
    enumerable: true,
    get: function() {
      return c.stringify;
    }
  }), s.default = x, s.escape = g, s.unescape = d, s = a.exports = x;
})($e, $e.exports);
var et = $e.exports;
(function(a, s) {
  Object.defineProperty(s, "__esModule", { value: true });
  var c = Ve, g = et;
  function d(e) {
    return e && typeof e == "object" && "default" in e ? e : { default: e };
  }
  var x = /* @__PURE__ */ d(c), w = /* @__PURE__ */ d(g), E = {
    isString: function(e) {
      return typeof e == "string";
    },
    isObject: function(e) {
      return typeof e == "object" && e !== null;
    },
    isNull: function(e) {
      return e === null;
    },
    isNullOrUndefined: function(e) {
      return e == null;
    }
  }, I = x.default, R = E, N = te, ne = Re, Q = Te, M = we, J = T;
  function T() {
    this.protocol = null, this.slashes = null, this.auth = null, this.host = null, this.port = null, this.hostname = null, this.hash = null, this.search = null, this.query = null, this.pathname = null, this.path = null, this.href = null;
  }
  var Ae = /^([a-z0-9.+-]+:)/i, Oe = /:[0-9]*$/, xe = /^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/, Ie = ["<", ">", '"', "`", " ", "\r", `
`, "	"], fe = ["{", "}", "|", "\\", "^", "`"].concat(Ie), P = ["'"].concat(fe), k = ["%", "/", "?", ";", "#"].concat(P), oe = ["/", "?", "#"], X = 255, ue = /^[+a-z0-9A-Z_-]{0,63}$/, ye = /^([+a-z0-9A-Z_-]{0,63})(.*)$/, be = {
    javascript: true,
    "javascript:": true
  }, ae = {
    javascript: true,
    "javascript:": true
  }, ee = {
    http: true,
    https: true,
    ftp: true,
    gopher: true,
    file: true,
    "http:": true,
    "https:": true,
    "ftp:": true,
    "gopher:": true,
    "file:": true
  }, ie = w.default;
  function te(e, r, t) {
    if (e && R.isObject(e) && e instanceof T)
      return e;
    var i = new T();
    return i.parse(e, r, t), i;
  }
  T.prototype.parse = function(e, r, t) {
    if (!R.isString(e))
      throw new TypeError("Parameter 'url' must be a string, not " + typeof e);
    var i = e.indexOf("?"), l = i !== -1 && i < e.indexOf("#") ? "?" : "#", $ = e.split(l), F = /\\/g;
    $[0] = $[0].replace(F, "/"), e = $.join(l);
    var o = e;
    if (o = o.trim(), !t && e.split("#").length === 1) {
      var G = xe.exec(o);
      if (G)
        return this.path = o, this.href = o, this.pathname = G[1], G[2] ? (this.search = G[2], r ? this.query = ie.parse(this.search.substr(1)) : this.query = this.search.substr(1)) : r && (this.search = "", this.query = {}), this;
    }
    var b = Ae.exec(o);
    if (b) {
      b = b[0];
      var se = b.toLowerCase();
      this.protocol = se, o = o.substr(b.length);
    }
    if (t || b || o.match(/^\/\/[^@\/]+@[^@\/]+/)) {
      var le = o.substr(0, 2) === "//";
      le && !(b && ae[b]) && (o = o.substr(2), this.slashes = true);
    }
    if (!ae[b] && (le || b && !ee[b])) {
      for (var j = -1, U = 0; U < oe.length; U++) {
        var H = o.indexOf(oe[U]);
        H !== -1 && (j === -1 || H < j) && (j = H);
      }
      var pe, q;
      j === -1 ? q = o.lastIndexOf("@") : q = o.lastIndexOf("@", j), q !== -1 && (pe = o.slice(0, q), o = o.slice(q + 1), this.auth = decodeURIComponent(pe)), j = -1;
      for (var U = 0; U < k.length; U++) {
        var H = o.indexOf(k[U]);
        H !== -1 && (j === -1 || H < j) && (j = H);
      }
      j === -1 && (j = o.length), this.host = o.slice(0, j), o = o.slice(j), this.parseHost(), this.hostname = this.hostname || "";
      var me = this.hostname[0] === "[" && this.hostname[this.hostname.length - 1] === "]";
      if (!me)
        for (var f = this.hostname.split(/\./), U = 0, C = f.length; U < C; U++) {
          var Z = f[U];
          if (Z && !Z.match(ue)) {
            for (var B = "", K = 0, Pe = Z.length; K < Pe; K++)
              Z.charCodeAt(K) > 127 ? B += "x" : B += Z[K];
            if (!B.match(ue)) {
              var re = f.slice(0, U), V = f.slice(U + 1), he = Z.match(ye);
              he && (re.push(he[1]), V.unshift(he[2])), V.length && (o = "/" + V.join(".") + o), this.hostname = re.join(".");
              break;
            }
          }
        }
      this.hostname.length > X ? this.hostname = "" : this.hostname = this.hostname.toLowerCase(), me || (this.hostname = I.toASCII(this.hostname));
      var Le = this.port ? ":" + this.port : "", Ge = this.hostname || "";
      this.host = Ge + Le, this.href += this.host, me && (this.hostname = this.hostname.substr(1, this.hostname.length - 2), o[0] !== "/" && (o = "/" + o));
    }
    if (!be[se])
      for (var U = 0, C = P.length; U < C; U++) {
        var de = P[U];
        if (o.indexOf(de) !== -1) {
          var _e = encodeURIComponent(de);
          _e === de && (_e = escape(de)), o = o.split(de).join(_e);
        }
      }
    var Fe = o.indexOf("#");
    Fe !== -1 && (this.hash = o.substr(Fe), o = o.slice(0, Fe));
    var Ue2 = o.indexOf("?");
    if (Ue2 !== -1 ? (this.search = o.substr(Ue2), this.query = o.substr(Ue2 + 1), r && (this.query = ie.parse(this.query)), o = o.slice(0, Ue2)) : r && (this.search = "", this.query = {}), o && (this.pathname = o), ee[se] && this.hostname && !this.pathname && (this.pathname = "/"), this.pathname || this.search) {
      var Le = this.pathname || "", Ze = this.search || "";
      this.path = Le + Ze;
    }
    return this.href = this.format(), this;
  };
  function we(e) {
    return R.isString(e) && (e = te(e)), e instanceof T ? e.format() : T.prototype.format.call(e);
  }
  T.prototype.format = function() {
    var e = this.auth || "";
    e && (e = encodeURIComponent(e), e = e.replace(/%3A/i, ":"), e += "@");
    var r = this.protocol || "", t = this.pathname || "", i = this.hash || "", l = false, $ = "";
    this.host ? l = e + this.host : this.hostname && (l = e + (this.hostname.indexOf(":") === -1 ? this.hostname : "[" + this.hostname + "]"), this.port && (l += ":" + this.port)), this.query && R.isObject(this.query) && Object.keys(this.query).length && ($ = ie.stringify(this.query));
    var F = this.search || $ && "?" + $ || "";
    return r && r.substr(-1) !== ":" && (r += ":"), this.slashes || (!r || ee[r]) && l !== false ? (l = "//" + (l || ""), t && t.charAt(0) !== "/" && (t = "/" + t)) : l || (l = ""), i && i.charAt(0) !== "#" && (i = "#" + i), F && F.charAt(0) !== "?" && (F = "?" + F), t = t.replace(/[?#]/g, function(o) {
      return encodeURIComponent(o);
    }), F = F.replace("#", "%23"), r + l + t + F + i;
  };
  function Re(e, r) {
    return te(e, false, true).resolve(r);
  }
  T.prototype.resolve = function(e) {
    return this.resolveObject(te(e, false, true)).format();
  };
  function Te(e, r) {
    return e ? te(e, false, true).resolveObject(r) : r;
  }
  T.prototype.resolveObject = function(e) {
    if (R.isString(e)) {
      var r = new T();
      r.parse(e, false, true), e = r;
    }
    for (var t = new T(), i = Object.keys(this), l = 0; l < i.length; l++) {
      var $ = i[l];
      t[$] = this[$];
    }
    if (t.hash = e.hash, e.href === "")
      return t.href = t.format(), t;
    if (e.slashes && !e.protocol) {
      for (var F = Object.keys(e), o = 0; o < F.length; o++) {
        var G = F[o];
        G !== "protocol" && (t[G] = e[G]);
      }
      return ee[t.protocol] && t.hostname && !t.pathname && (t.path = t.pathname = "/"), t.href = t.format(), t;
    }
    if (e.protocol && e.protocol !== t.protocol) {
      if (!ee[e.protocol]) {
        for (var b = Object.keys(e), se = 0; se < b.length; se++) {
          var le = b[se];
          t[le] = e[le];
        }
        return t.href = t.format(), t;
      }
      if (t.protocol = e.protocol, !e.host && !ae[e.protocol]) {
        for (var C = (e.pathname || "").split("/"); C.length && !(e.host = C.shift()); )
          ;
        e.host || (e.host = ""), e.hostname || (e.hostname = ""), C[0] !== "" && C.unshift(""), C.length < 2 && C.unshift(""), t.pathname = C.join("/");
      } else
        t.pathname = e.pathname;
      if (t.search = e.search, t.query = e.query, t.host = e.host || "", t.auth = e.auth, t.hostname = e.hostname || e.host, t.port = e.port, t.pathname || t.search) {
        var j = t.pathname || "", U = t.search || "";
        t.path = j + U;
      }
      return t.slashes = t.slashes || e.slashes, t.href = t.format(), t;
    }
    var H = t.pathname && t.pathname.charAt(0) === "/", pe = e.host || e.pathname && e.pathname.charAt(0) === "/", q = pe || H || t.host && e.pathname, me = q, f = t.pathname && t.pathname.split("/") || [], C = e.pathname && e.pathname.split("/") || [], Z = t.protocol && !ee[t.protocol];
    if (Z && (t.hostname = "", t.port = null, t.host && (f[0] === "" ? f[0] = t.host : f.unshift(t.host)), t.host = "", e.protocol && (e.hostname = null, e.port = null, e.host && (C[0] === "" ? C[0] = e.host : C.unshift(e.host)), e.host = null), q = q && (C[0] === "" || f[0] === "")), pe)
      t.host = e.host || e.host === "" ? e.host : t.host, t.hostname = e.hostname || e.hostname === "" ? e.hostname : t.hostname, t.search = e.search, t.query = e.query, f = C;
    else if (C.length)
      f || (f = []), f.pop(), f = f.concat(C), t.search = e.search, t.query = e.query;
    else if (!R.isNullOrUndefined(e.search)) {
      if (Z) {
        t.hostname = t.host = f.shift();
        var B = t.host && t.host.indexOf("@") > 0 ? t.host.split("@") : false;
        B && (t.auth = B.shift(), t.host = t.hostname = B.shift());
      }
      return t.search = e.search, t.query = e.query, (!R.isNull(t.pathname) || !R.isNull(t.search)) && (t.path = (t.pathname ? t.pathname : "") + (t.search ? t.search : "")), t.href = t.format(), t;
    }
    if (!f.length)
      return t.pathname = null, t.search ? t.path = "/" + t.search : t.path = null, t.href = t.format(), t;
    for (var K = f.slice(-1)[0], Pe = (t.host || e.host || f.length > 1) && (K === "." || K === "..") || K === "", re = 0, V = f.length; V >= 0; V--)
      K = f[V], K === "." ? f.splice(V, 1) : K === ".." ? (f.splice(V, 1), re++) : re && (f.splice(V, 1), re--);
    if (!q && !me)
      for (; re--; re)
        f.unshift("..");
    q && f[0] !== "" && (!f[0] || f[0].charAt(0) !== "/") && f.unshift(""), Pe && f.join("/").substr(-1) !== "/" && f.push("");
    var he = f[0] === "" || f[0] && f[0].charAt(0) === "/";
    if (Z) {
      t.hostname = t.host = he ? "" : f.length ? f.shift() : "";
      var B = t.host && t.host.indexOf("@") > 0 ? t.host.split("@") : false;
      B && (t.auth = B.shift(), t.host = t.hostname = B.shift());
    }
    return q = q || t.host && f.length, q && !he && f.unshift(""), f.length ? t.pathname = f.join("/") : (t.pathname = null, t.path = null), (!R.isNull(t.pathname) || !R.isNull(t.search)) && (t.path = (t.pathname ? t.pathname : "") + (t.search ? t.search : "")), t.auth = e.auth || t.auth, t.slashes = t.slashes || e.slashes, t.href = t.format(), t;
  }, T.prototype.parseHost = function() {
    var e = this.host, r = Oe.exec(e);
    r && (r = r[0], r !== ":" && (this.port = r.substr(1)), e = e.substr(0, e.length - r.length)), e && (this.hostname = e);
  };
  function je(e, r) {
    for (var t = 0, i = e.length - 1; i >= 0; i--) {
      var l = e[i];
      l === "." ? e.splice(i, 1) : l === ".." ? (e.splice(i, 1), t++) : t && (e.splice(i, 1), t--);
    }
    if (r)
      for (; t--; t)
        e.unshift("..");
    return e;
  }
  function n() {
    for (var e = "", r = false, t = arguments.length - 1; t >= -1 && !r; t--) {
      var i = t >= 0 ? arguments[t] : "/";
      if (typeof i != "string")
        throw new TypeError("Arguments to path.resolve must be strings");
      if (!i)
        continue;
      e = i + "/" + e, r = i.charAt(0) === "/";
    }
    return e = je(h(e.split("/"), function(l) {
      return !!l;
    }), !r).join("/"), (r ? "/" : "") + e || ".";
  }
  function h(e, r) {
    if (e.filter)
      return e.filter(r);
    for (var t = [], i = 0; i < e.length; i++)
      r(e[i], i, e) && t.push(e[i]);
    return t;
  }
  var u = (function(e) {
    function r() {
      var i = this || self;
      return delete e.prototype.__magic__, i;
    }
    if (typeof globalThis == "object")
      return globalThis;
    if (this)
      return r();
    e.defineProperty(e.prototype, "__magic__", {
      configurable: true,
      get: r
    });
    var t = __magic__;
    return t;
  })(Object), p = (
    /** @type {formatImport}*/
    M
  ), m = (
    /** @type {parseImport}*/
    N
  ), A = (
    /** @type {resolveImport}*/
    ne
  ), y = (
    /** @type {UrlImport}*/
    J
  ), v = u.URL, L = u.URLSearchParams, D = /%/g, z = /\\/g, O = /\n/g, _ = /\r/g, S = /\t/g, W = 47;
  function Y(e) {
    var r = (
      /** @type {URL|null} */
      e ?? null
    );
    return !!(r !== null && (r != null && r.href) && (r != null && r.origin));
  }
  function ce(e) {
    if (e.hostname !== "")
      throw new TypeError('File URL host must be "localhost" or empty on browser');
    for (var r = e.pathname, t = 0; t < r.length; t++)
      if (r[t] === "%") {
        var i = r.codePointAt(t + 2) | 32;
        if (r[t + 1] === "2" && i === 102)
          throw new TypeError("File URL path must not include encoded / characters");
      }
    return decodeURIComponent(r);
  }
  function We(e) {
    return e.includes("%") && (e = e.replace(D, "%25")), e.includes("\\") && (e = e.replace(z, "%5C")), e.includes(`
`) && (e = e.replace(O, "%0A")), e.includes("\r") && (e = e.replace(_, "%0D")), e.includes("	") && (e = e.replace(S, "%09")), e;
  }
  var Ee = (
    /**
     * @type {domainToASCII}
     */
    (function(r) {
      if (typeof r > "u")
        throw new TypeError('The "domain" argument must be specified');
      return new v("http://" + r).hostname;
    })
  ), Me = (
    /**
     * @type {domainToUnicode}
     */
    (function(r) {
      if (typeof r > "u")
        throw new TypeError('The "domain" argument must be specified');
      return new v("http://" + r).hostname;
    })
  ), De = (
    /**
     * @type {(url: string) => URL}
     */
    (function(r) {
      var t = new v("file://"), i = n(r), l = r.charCodeAt(r.length - 1);
      return l === W && i[i.length - 1] !== "/" && (i += "/"), t.pathname = We(i), t;
    })
  ), Ne = (
    /**
     * @type {fileURLToPath & ((path: string | URL) => string)}
     */
    (function(r) {
      if (!Y(r) && typeof r != "string")
        throw new TypeError('The "path" argument must be of type string or an instance of URL. Received type ' + typeof r + " (" + r + ")");
      var t = new v(r);
      if (t.protocol !== "file:")
        throw new TypeError("The URL must be of scheme file");
      return ce(t);
    })
  ), ze = (
    /**
     * @type {(
     *   ((urlObject: URL, options?: URLFormatOptions) => string) &
     *   ((urlObject: UrlObject | string, options?: never) => string)
     * )}
     */
    (function(r, t) {
      var i, l, $;
      if (t === void 0 && (t = {}), !(r instanceof v))
        return p(r);
      if (typeof t != "object" || t === null)
        throw new TypeError('The "options" argument must be of type object.');
      var F = (i = t.auth) != null ? i : true, o = (l = t.fragment) != null ? l : true, G = ($ = t.search) != null ? $ : true, b = new v(r.toString());
      return F || (b.username = "", b.password = ""), o || (b.hash = ""), G || (b.search = ""), b.toString();
    })
  ), Be = {
    format: ze,
    parse: m,
    resolve: A,
    resolveObject: Q,
    Url: y,
    URL: v,
    URLSearchParams: L,
    domainToASCII: Ee,
    domainToUnicode: Me,
    pathToFileURL: De,
    fileURLToPath: Ne
  };
  s.URL = v, s.URLSearchParams = L, s.Url = y, s.default = Be, s.domainToASCII = Ee, s.domainToUnicode = Me, s.fileURLToPath = Ne, s.format = ze, s.parse = m, s.pathToFileURL = De, s.resolve = A, s.resolveObject = Q, s = a.exports = Be;
})(Se, Se.exports);
var rt = Se.exports;
export {
  rt as r
};
