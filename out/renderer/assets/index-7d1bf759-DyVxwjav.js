import { f as fl, X as Xn, U as Ue, j as jt$1, S as Ss, K as Ku, O as Oe$1, z as zs, _ as _n, s as sc } from "./CedeStore-DfpiZiOO.js";
import { r as rt } from "./url-6cb53b95-DWjpptWm.js";
import "./index-73GArslZ.js";
function mt(e, r) {
  for (var i = 0; i < r.length; i++) {
    const l = r[i];
    if (typeof l != "string" && !Array.isArray(l)) {
      for (const f in l)
        if (f !== "default" && !(f in e)) {
          const _ = Object.getOwnPropertyDescriptor(l, f);
          _ && Object.defineProperty(e, f, _.get ? _ : {
            enumerable: true,
            get: () => l[f]
          });
        }
    }
  }
  return Object.freeze(Object.defineProperty(e, Symbol.toStringTag, { value: "Module" }));
}
var Ie = {}, it = { exports: {} }, qe = {};
(function(e) {
  e.fetch = f(Ue.fetch) && f(Ue.ReadableStream), e.writableStream = f(Ue.WritableStream), e.abortController = f(Ue.AbortController);
  var r;
  function i() {
    if (r !== void 0)
      return r;
    if (Ue.XMLHttpRequest) {
      r = new Ue.XMLHttpRequest();
      try {
        r.open("GET", Ue.XDomainRequest ? "/" : "https://example.com");
      } catch {
        r = null;
      }
    } else
      r = null;
    return r;
  }
  function l(_) {
    var h = i();
    if (!h)
      return false;
    try {
      return h.responseType = _, h.responseType === _;
    } catch {
    }
    return false;
  }
  e.arraybuffer = e.fetch || l("arraybuffer"), e.msstream = !e.fetch && l("ms-stream"), e.mozchunkedarraybuffer = !e.fetch && l("moz-chunked-arraybuffer"), e.overrideMimeType = e.fetch || (i() ? f(i().overrideMimeType) : false);
  function f(_) {
    return typeof _ == "function";
  }
  r = null;
})(qe);
var ce = {}, Ce = { exports: {} }, at = Ss.EventEmitter, Se, We;
function Et() {
  if (We)
    return Se;
  We = 1;
  function e(w, m) {
    var b = Object.keys(w);
    if (Object.getOwnPropertySymbols) {
      var v = Object.getOwnPropertySymbols(w);
      m && (v = v.filter(function(A) {
        return Object.getOwnPropertyDescriptor(w, A).enumerable;
      })), b.push.apply(b, v);
    }
    return b;
  }
  function r(w) {
    for (var m = 1; m < arguments.length; m++) {
      var b = arguments[m] != null ? arguments[m] : {};
      m % 2 ? e(Object(b), true).forEach(function(v) {
        i(w, v, b[v]);
      }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(w, Object.getOwnPropertyDescriptors(b)) : e(Object(b)).forEach(function(v) {
        Object.defineProperty(w, v, Object.getOwnPropertyDescriptor(b, v));
      });
    }
    return w;
  }
  function i(w, m, b) {
    return m = h(m), m in w ? Object.defineProperty(w, m, { value: b, enumerable: true, configurable: true, writable: true }) : w[m] = b, w;
  }
  function l(w, m) {
    if (!(w instanceof m))
      throw new TypeError("Cannot call a class as a function");
  }
  function f(w, m) {
    for (var b = 0; b < m.length; b++) {
      var v = m[b];
      v.enumerable = v.enumerable || false, v.configurable = true, "value" in v && (v.writable = true), Object.defineProperty(w, h(v.key), v);
    }
  }
  function _(w, m, b) {
    return m && f(w.prototype, m), Object.defineProperty(w, "prototype", { writable: false }), w;
  }
  function h(w) {
    var m = c(w, "string");
    return typeof m == "symbol" ? m : String(m);
  }
  function c(w, m) {
    if (typeof w != "object" || w === null)
      return w;
    var b = w[Symbol.toPrimitive];
    if (b !== void 0) {
      var v = b.call(w, m);
      if (typeof v != "object")
        return v;
      throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return String(w);
  }
  var d = Xn, R = d.Buffer, P = zs, y = P.inspect, C = y && y.custom || "inspect";
  function j(w, m, b) {
    R.prototype.copy.call(w, m, b);
  }
  return Se = /* @__PURE__ */ (function() {
    function w() {
      l(this, w), this.head = null, this.tail = null, this.length = 0;
    }
    return _(w, [{
      key: "push",
      value: function(b) {
        var v = {
          data: b,
          next: null
        };
        this.length > 0 ? this.tail.next = v : this.head = v, this.tail = v, ++this.length;
      }
    }, {
      key: "unshift",
      value: function(b) {
        var v = {
          data: b,
          next: this.head
        };
        this.length === 0 && (this.tail = v), this.head = v, ++this.length;
      }
    }, {
      key: "shift",
      value: function() {
        if (this.length !== 0) {
          var b = this.head.data;
          return this.length === 1 ? this.head = this.tail = null : this.head = this.head.next, --this.length, b;
        }
      }
    }, {
      key: "clear",
      value: function() {
        this.head = this.tail = null, this.length = 0;
      }
    }, {
      key: "join",
      value: function(b) {
        if (this.length === 0)
          return "";
        for (var v = this.head, A = "" + v.data; v = v.next; )
          A += b + v.data;
        return A;
      }
    }, {
      key: "concat",
      value: function(b) {
        if (this.length === 0)
          return R.alloc(0);
        for (var v = R.allocUnsafe(b >>> 0), A = this.head, S = 0; A; )
          j(A.data, v, S), S += A.data.length, A = A.next;
        return v;
      }
      // Consumes a specified amount of bytes or characters from the buffered data.
    }, {
      key: "consume",
      value: function(b, v) {
        var A;
        return b < this.head.data.length ? (A = this.head.data.slice(0, b), this.head.data = this.head.data.slice(b)) : b === this.head.data.length ? A = this.shift() : A = v ? this._getString(b) : this._getBuffer(b), A;
      }
    }, {
      key: "first",
      value: function() {
        return this.head.data;
      }
      // Consumes a specified amount of characters from the buffered data.
    }, {
      key: "_getString",
      value: function(b) {
        var v = this.head, A = 1, S = v.data;
        for (b -= S.length; v = v.next; ) {
          var g = v.data, T = b > g.length ? g.length : b;
          if (T === g.length ? S += g : S += g.slice(0, b), b -= T, b === 0) {
            T === g.length ? (++A, v.next ? this.head = v.next : this.head = this.tail = null) : (this.head = v, v.data = g.slice(T));
            break;
          }
          ++A;
        }
        return this.length -= A, S;
      }
      // Consumes a specified amount of bytes from the buffered data.
    }, {
      key: "_getBuffer",
      value: function(b) {
        var v = R.allocUnsafe(b), A = this.head, S = 1;
        for (A.data.copy(v), b -= A.data.length; A = A.next; ) {
          var g = A.data, T = b > g.length ? g.length : b;
          if (g.copy(v, v.length - b, 0, T), b -= T, b === 0) {
            T === g.length ? (++S, A.next ? this.head = A.next : this.head = this.tail = null) : (this.head = A, A.data = g.slice(T));
            break;
          }
          ++S;
        }
        return this.length -= S, v;
      }
      // Make sure the linked list only shows the minimal necessary information.
    }, {
      key: C,
      value: function(b, v) {
        return y(this, r(r({}, v), {}, {
          // Only inspect one level.
          depth: 0,
          // It should not recurse.
          customInspect: false
        }));
      }
    }]), w;
  })(), Se;
}
function St(e, r) {
  var i = this, l = this._readableState && this._readableState.destroyed, f = this._writableState && this._writableState.destroyed;
  return l || f ? (r ? r(e) : e && (this._writableState ? this._writableState.errorEmitted || (this._writableState.errorEmitted = true, Oe$1.nextTick(Ne, this, e)) : Oe$1.nextTick(Ne, this, e)), this) : (this._readableState && (this._readableState.destroyed = true), this._writableState && (this._writableState.destroyed = true), this._destroy(e || null, function(_) {
    !r && _ ? i._writableState ? i._writableState.errorEmitted ? Oe$1.nextTick(de, i) : (i._writableState.errorEmitted = true, Oe$1.nextTick(Fe, i, _)) : Oe$1.nextTick(Fe, i, _) : r ? (Oe$1.nextTick(de, i), r(_)) : Oe$1.nextTick(de, i);
  }), this);
}
function Fe(e, r) {
  Ne(e, r), de(e);
}
function de(e) {
  e._writableState && !e._writableState.emitClose || e._readableState && !e._readableState.emitClose || e.emit("close");
}
function Tt() {
  this._readableState && (this._readableState.destroyed = false, this._readableState.reading = false, this._readableState.ended = false, this._readableState.endEmitted = false), this._writableState && (this._writableState.destroyed = false, this._writableState.ended = false, this._writableState.ending = false, this._writableState.finalCalled = false, this._writableState.prefinished = false, this._writableState.finished = false, this._writableState.errorEmitted = false);
}
function Ne(e, r) {
  e.emit("error", r);
}
function Mt(e, r) {
  var i = e._readableState, l = e._writableState;
  i && i.autoDestroy || l && l.autoDestroy ? e.destroy(r) : e.emit("error", r);
}
var ot = {
  destroy: St,
  undestroy: Tt,
  errorOrDestroy: Mt
}, X = {};
function At(e, r) {
  e.prototype = Object.create(r.prototype), e.prototype.constructor = e, e.__proto__ = r;
}
var ft = {};
function B(e, r, i) {
  i || (i = Error);
  function l(_, h, c) {
    return typeof r == "string" ? r : r(_, h, c);
  }
  var f = /* @__PURE__ */ (function(_) {
    At(h, _);
    function h(c, d, R) {
      return _.call(this, l(c, d, R)) || this;
    }
    return h;
  })(i);
  f.prototype.name = i.name, f.prototype.code = e, ft[e] = f;
}
function Ge(e, r) {
  if (Array.isArray(e)) {
    var i = e.length;
    return e = e.map(function(l) {
      return String(l);
    }), i > 2 ? "one of ".concat(r, " ").concat(e.slice(0, i - 1).join(", "), ", or ") + e[i - 1] : i === 2 ? "one of ".concat(r, " ").concat(e[0], " or ").concat(e[1]) : "of ".concat(r, " ").concat(e[0]);
  } else
    return "of ".concat(r, " ").concat(String(e));
}
function Ot(e, r, i) {
  return e.substr(0, r.length) === r;
}
function Pt(e, r, i) {
  return (i === void 0 || i > e.length) && (i = e.length), e.substring(i - r.length, i) === r;
}
function Lt(e, r, i) {
  return typeof i != "number" && (i = 0), i + r.length > e.length ? false : e.indexOf(r, i) !== -1;
}
B("ERR_INVALID_OPT_VALUE", function(e, r) {
  return 'The value "' + r + '" is invalid for option "' + e + '"';
}, TypeError);
B("ERR_INVALID_ARG_TYPE", function(e, r, i) {
  var l;
  typeof r == "string" && Ot(r, "not ") ? (l = "must not be", r = r.replace(/^not /, "")) : l = "must be";
  var f;
  if (Pt(e, " argument"))
    f = "The ".concat(e, " ").concat(l, " ").concat(Ge(r, "type"));
  else {
    var _ = Lt(e, ".") ? "property" : "argument";
    f = 'The "'.concat(e, '" ').concat(_, " ").concat(l, " ").concat(Ge(r, "type"));
  }
  return f += ". Received type ".concat(typeof i), f;
}, TypeError);
B("ERR_STREAM_PUSH_AFTER_EOF", "stream.push() after EOF");
B("ERR_METHOD_NOT_IMPLEMENTED", function(e) {
  return "The " + e + " method is not implemented";
});
B("ERR_STREAM_PREMATURE_CLOSE", "Premature close");
B("ERR_STREAM_DESTROYED", function(e) {
  return "Cannot call " + e + " after a stream was destroyed";
});
B("ERR_MULTIPLE_CALLBACK", "Callback called multiple times");
B("ERR_STREAM_CANNOT_PIPE", "Cannot pipe, not readable");
B("ERR_STREAM_WRITE_AFTER_END", "write after end");
B("ERR_STREAM_NULL_VALUES", "May not write null values to stream", TypeError);
B("ERR_UNKNOWN_ENCODING", function(e) {
  return "Unknown encoding: " + e;
}, TypeError);
B("ERR_STREAM_UNSHIFT_AFTER_END_EVENT", "stream.unshift() after end event");
X.codes = ft;
var Ct = X.codes.ERR_INVALID_OPT_VALUE;
function Nt(e, r, i) {
  return e.highWaterMark != null ? e.highWaterMark : r ? e[i] : null;
}
function Dt(e, r, i, l) {
  var f = Nt(r, l, i);
  if (f != null) {
    if (!(isFinite(f) && Math.floor(f) === f) || f < 0) {
      var _ = l ? i : "highWaterMark";
      throw new Ct(_, f);
    }
    return Math.floor(f);
  }
  return e.objectMode ? 16 : 16 * 1024;
}
var lt = {
  getHighWaterMark: Dt
}, Te, $e;
function ut() {
  if ($e)
    return Te;
  $e = 1, Te = D;
  function e(o) {
    var a = this;
    this.next = null, this.entry = null, this.finish = function() {
      we(a, o);
    };
  }
  var r;
  D.WritableState = O;
  var i = {
    deprecate: Ku
  }, l = at, f = Xn.Buffer, _ = (typeof Ue < "u" ? Ue : typeof window < "u" ? window : typeof self < "u" ? self : {}).Uint8Array || function() {
  };
  function h(o) {
    return f.from(o);
  }
  function c(o) {
    return f.isBuffer(o) || o instanceof _;
  }
  var d = ot, R = lt, P = R.getHighWaterMark, y = X.codes, C = y.ERR_INVALID_ARG_TYPE, j = y.ERR_METHOD_NOT_IMPLEMENTED, w = y.ERR_MULTIPLE_CALLBACK, m = y.ERR_STREAM_CANNOT_PIPE, b = y.ERR_STREAM_DESTROYED, v = y.ERR_STREAM_NULL_VALUES, A = y.ERR_STREAM_WRITE_AFTER_END, S = y.ERR_UNKNOWN_ENCODING, g = d.errorOrDestroy;
  jt$1(D, l);
  function T() {
  }
  function O(o, a, s) {
    r = r || te(), o = o || {}, typeof s != "boolean" && (s = a instanceof r), this.objectMode = !!o.objectMode, s && (this.objectMode = this.objectMode || !!o.writableObjectMode), this.highWaterMark = P(this, o, "writableHighWaterMark", s), this.finalCalled = false, this.needDrain = false, this.ending = false, this.ended = false, this.finished = false, this.destroyed = false;
    var E = o.decodeStrings === false;
    this.decodeStrings = !E, this.defaultEncoding = o.defaultEncoding || "utf8", this.length = 0, this.writing = false, this.corked = 0, this.sync = true, this.bufferProcessing = false, this.onwrite = function(N) {
      ye(a, N);
    }, this.writecb = null, this.writelen = 0, this.bufferedRequest = null, this.lastBufferedRequest = null, this.pendingcb = 0, this.prefinished = false, this.errorEmitted = false, this.emitClose = o.emitClose !== false, this.autoDestroy = !!o.autoDestroy, this.bufferedRequestCount = 0, this.corkedRequestsFree = new e(this);
  }
  O.prototype.getBuffer = function() {
    for (var a = this.bufferedRequest, s = []; a; )
      s.push(a), a = a.next;
    return s;
  }, (function() {
    try {
      Object.defineProperty(O.prototype, "buffer", {
        get: i.deprecate(function() {
          return this.getBuffer();
        }, "_writableState.buffer is deprecated. Use _writableState.getBuffer instead.", "DEP0003")
      });
    } catch {
    }
  })();
  var H;
  typeof Symbol == "function" && Symbol.hasInstance && typeof Function.prototype[Symbol.hasInstance] == "function" ? (H = Function.prototype[Symbol.hasInstance], Object.defineProperty(D, Symbol.hasInstance, {
    value: function(a) {
      return H.call(this, a) ? true : this !== D ? false : a && a._writableState instanceof O;
    }
  })) : H = function(a) {
    return a instanceof this;
  };
  function D(o) {
    r = r || te();
    var a = this instanceof r;
    if (!a && !H.call(D, this))
      return new D(o);
    this._writableState = new O(o, this, a), this.writable = true, o && (typeof o.write == "function" && (this._write = o.write), typeof o.writev == "function" && (this._writev = o.writev), typeof o.destroy == "function" && (this._destroy = o.destroy), typeof o.final == "function" && (this._final = o.final)), l.call(this);
  }
  D.prototype.pipe = function() {
    g(this, new m());
  };
  function M(o, a) {
    var s = new A();
    g(o, s), Oe$1.nextTick(a, s);
  }
  function W(o, a, s, E) {
    var N;
    return s === null ? N = new v() : typeof s != "string" && !a.objectMode && (N = new C("chunk", ["string", "Buffer"], s)), N ? (g(o, N), Oe$1.nextTick(E, N), false) : true;
  }
  D.prototype.write = function(o, a, s) {
    var E = this._writableState, N = false, t = !E.objectMode && c(o);
    return t && !f.isBuffer(o) && (o = h(o)), typeof a == "function" && (s = a, a = null), t ? a = "buffer" : a || (a = E.defaultEncoding), typeof s != "function" && (s = T), E.ending ? M(this, s) : (t || W(this, E, o, s)) && (E.pendingcb++, N = _e(this, E, t, o, a, s)), N;
  }, D.prototype.cork = function() {
    this._writableState.corked++;
  }, D.prototype.uncork = function() {
    var o = this._writableState;
    o.corked && (o.corked--, !o.writing && !o.corked && !o.bufferProcessing && o.bufferedRequest && J(this, o));
  }, D.prototype.setDefaultEncoding = function(a) {
    if (typeof a == "string" && (a = a.toLowerCase()), !(["hex", "utf8", "utf-8", "ascii", "binary", "base64", "ucs2", "ucs-2", "utf16le", "utf-16le", "raw"].indexOf((a + "").toLowerCase()) > -1))
      throw new S(a);
    return this._writableState.defaultEncoding = a, this;
  }, Object.defineProperty(D.prototype, "writableBuffer", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: false,
    get: function() {
      return this._writableState && this._writableState.getBuffer();
    }
  });
  function re(o, a, s) {
    return !o.objectMode && o.decodeStrings !== false && typeof a == "string" && (a = f.from(a, s)), a;
  }
  Object.defineProperty(D.prototype, "writableHighWaterMark", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: false,
    get: function() {
      return this._writableState.highWaterMark;
    }
  });
  function _e(o, a, s, E, N, t) {
    if (!s) {
      var n = re(a, E, N);
      E !== n && (s = true, N = "buffer", E = n);
    }
    var u = a.objectMode ? 1 : E.length;
    a.length += u;
    var p = a.length < a.highWaterMark;
    if (p || (a.needDrain = true), a.writing || a.corked) {
      var k = a.lastBufferedRequest;
      a.lastBufferedRequest = {
        chunk: E,
        encoding: N,
        isBuf: s,
        callback: t,
        next: null
      }, k ? k.next = a.lastBufferedRequest : a.bufferedRequest = a.lastBufferedRequest, a.bufferedRequestCount += 1;
    } else
      z(o, a, false, u, E, N, t);
    return p;
  }
  function z(o, a, s, E, N, t, n) {
    a.writelen = E, a.writecb = n, a.writing = true, a.sync = true, a.destroyed ? a.onwrite(new b("write")) : s ? o._writev(N, a.onwrite) : o._write(N, t, a.onwrite), a.sync = false;
  }
  function be(o, a, s, E, N) {
    --a.pendingcb, s ? (Oe$1.nextTick(N, E), Oe$1.nextTick($, o, a), o._writableState.errorEmitted = true, g(o, E)) : (N(E), o._writableState.errorEmitted = true, g(o, E), $(o, a));
  }
  function ae(o) {
    o.writing = false, o.writecb = null, o.length -= o.writelen, o.writelen = 0;
  }
  function ye(o, a) {
    var s = o._writableState, E = s.sync, N = s.writecb;
    if (typeof N != "function")
      throw new w();
    if (ae(s), a)
      be(o, s, E, a, N);
    else {
      var t = fe(s) || o.destroyed;
      !t && !s.corked && !s.bufferProcessing && s.bufferedRequest && J(o, s), E ? Oe$1.nextTick(G, o, s, t, N) : G(o, s, t, N);
    }
  }
  function G(o, a, s, E) {
    s || oe(o, a), a.pendingcb--, E(), $(o, a);
  }
  function oe(o, a) {
    a.length === 0 && a.needDrain && (a.needDrain = false, o.emit("drain"));
  }
  function J(o, a) {
    a.bufferProcessing = true;
    var s = a.bufferedRequest;
    if (o._writev && s && s.next) {
      var E = a.bufferedRequestCount, N = new Array(E), t = a.corkedRequestsFree;
      t.entry = s;
      for (var n = 0, u = true; s; )
        N[n] = s, s.isBuf || (u = false), s = s.next, n += 1;
      N.allBuffers = u, z(o, a, true, a.length, N, "", t.finish), a.pendingcb++, a.lastBufferedRequest = null, t.next ? (a.corkedRequestsFree = t.next, t.next = null) : a.corkedRequestsFree = new e(a), a.bufferedRequestCount = 0;
    } else {
      for (; s; ) {
        var p = s.chunk, k = s.encoding, L = s.callback, q = a.objectMode ? 1 : p.length;
        if (z(o, a, false, q, p, k, L), s = s.next, a.bufferedRequestCount--, a.writing)
          break;
      }
      s === null && (a.lastBufferedRequest = null);
    }
    a.bufferedRequest = s, a.bufferProcessing = false;
  }
  D.prototype._write = function(o, a, s) {
    s(new j("_write()"));
  }, D.prototype._writev = null, D.prototype.end = function(o, a, s) {
    var E = this._writableState;
    return typeof o == "function" ? (s = o, o = null, a = null) : typeof a == "function" && (s = a, a = null), o != null && this.write(o, a), E.corked && (E.corked = 1, this.uncork()), E.ending || ge(this, E, s), this;
  }, Object.defineProperty(D.prototype, "writableLength", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: false,
    get: function() {
      return this._writableState.length;
    }
  });
  function fe(o) {
    return o.ending && o.length === 0 && o.bufferedRequest === null && !o.finished && !o.writing;
  }
  function ve(o, a) {
    o._final(function(s) {
      a.pendingcb--, s && g(o, s), a.prefinished = true, o.emit("prefinish"), $(o, a);
    });
  }
  function le(o, a) {
    !a.prefinished && !a.finalCalled && (typeof o._final == "function" && !a.destroyed ? (a.pendingcb++, a.finalCalled = true, Oe$1.nextTick(ve, o, a)) : (a.prefinished = true, o.emit("prefinish")));
  }
  function $(o, a) {
    var s = fe(a);
    if (s && (le(o, a), a.pendingcb === 0 && (a.finished = true, o.emit("finish"), a.autoDestroy))) {
      var E = o._readableState;
      (!E || E.autoDestroy && E.endEmitted) && o.destroy();
    }
    return s;
  }
  function ge(o, a, s) {
    a.ending = true, $(o, a), s && (a.finished ? Oe$1.nextTick(s) : o.once("finish", s)), a.ended = true, o.writable = false;
  }
  function we(o, a, s) {
    var E = o.entry;
    for (o.entry = null; E; ) {
      var N = E.callback;
      a.pendingcb--, N(s), E = E.next;
    }
    a.corkedRequestsFree.next = o;
  }
  return Object.defineProperty(D.prototype, "destroyed", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: false,
    get: function() {
      return this._writableState === void 0 ? false : this._writableState.destroyed;
    },
    set: function(a) {
      this._writableState && (this._writableState.destroyed = a);
    }
  }), D.prototype.destroy = d.destroy, D.prototype._undestroy = d.undestroy, D.prototype._destroy = function(o, a) {
    a(o);
  }, Te;
}
var Me, Ve;
function te() {
  if (Ve)
    return Me;
  Ve = 1;
  var e = Object.keys || function(R) {
    var P = [];
    for (var y in R)
      P.push(y);
    return P;
  };
  Me = h;
  var r = dt(), i = ut();
  jt$1(h, r);
  for (var l = e(i.prototype), f = 0; f < l.length; f++) {
    var _ = l[f];
    h.prototype[_] || (h.prototype[_] = i.prototype[_]);
  }
  function h(R) {
    if (!(this instanceof h))
      return new h(R);
    r.call(this, R), i.call(this, R), this.allowHalfOpen = true, R && (R.readable === false && (this.readable = false), R.writable === false && (this.writable = false), R.allowHalfOpen === false && (this.allowHalfOpen = false, this.once("end", c)));
  }
  Object.defineProperty(h.prototype, "writableHighWaterMark", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: false,
    get: function() {
      return this._writableState.highWaterMark;
    }
  }), Object.defineProperty(h.prototype, "writableBuffer", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: false,
    get: function() {
      return this._writableState && this._writableState.getBuffer();
    }
  }), Object.defineProperty(h.prototype, "writableLength", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: false,
    get: function() {
      return this._writableState.length;
    }
  });
  function c() {
    this._writableState.ended || Oe$1.nextTick(d, this);
  }
  function d(R) {
    R.end();
  }
  return Object.defineProperty(h.prototype, "destroyed", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: false,
    get: function() {
      return this._readableState === void 0 || this._writableState === void 0 ? false : this._readableState.destroyed && this._writableState.destroyed;
    },
    set: function(P) {
      this._readableState === void 0 || this._writableState === void 0 || (this._readableState.destroyed = P, this._writableState.destroyed = P);
    }
  }), Me;
}
var Ke = X.codes.ERR_STREAM_PREMATURE_CLOSE;
function It(e) {
  var r = false;
  return function() {
    if (!r) {
      r = true;
      for (var i = arguments.length, l = new Array(i), f = 0; f < i; f++)
        l[f] = arguments[f];
      e.apply(this, l);
    }
  };
}
function qt() {
}
function kt(e) {
  return e.setHeader && typeof e.abort == "function";
}
function st(e, r, i) {
  if (typeof r == "function")
    return st(e, null, r);
  r || (r = {}), i = It(i || qt);
  var l = r.readable || r.readable !== false && e.readable, f = r.writable || r.writable !== false && e.writable, _ = function() {
    e.writable || c();
  }, h = e._writableState && e._writableState.finished, c = function() {
    f = false, h = true, l || i.call(e);
  }, d = e._readableState && e._readableState.endEmitted, R = function() {
    l = false, d = true, f || i.call(e);
  }, P = function(w) {
    i.call(e, w);
  }, y = function() {
    var w;
    if (l && !d)
      return (!e._readableState || !e._readableState.ended) && (w = new Ke()), i.call(e, w);
    if (f && !h)
      return (!e._writableState || !e._writableState.ended) && (w = new Ke()), i.call(e, w);
  }, C = function() {
    e.req.on("finish", c);
  };
  return kt(e) ? (e.on("complete", c), e.on("abort", y), e.req ? C() : e.on("request", C)) : f && !e._writableState && (e.on("end", _), e.on("close", _)), e.on("end", R), e.on("finish", c), r.error !== false && e.on("error", P), e.on("close", y), function() {
    e.removeListener("complete", c), e.removeListener("abort", y), e.removeListener("request", C), e.req && e.req.removeListener("finish", c), e.removeListener("end", _), e.removeListener("close", _), e.removeListener("finish", c), e.removeListener("end", R), e.removeListener("error", P), e.removeListener("close", y);
  };
}
var ke = st, Ae, Ye;
function jt() {
  if (Ye)
    return Ae;
  Ye = 1;
  var e;
  function r(S, g, T) {
    return g = i(g), g in S ? Object.defineProperty(S, g, { value: T, enumerable: true, configurable: true, writable: true }) : S[g] = T, S;
  }
  function i(S) {
    var g = l(S, "string");
    return typeof g == "symbol" ? g : String(g);
  }
  function l(S, g) {
    if (typeof S != "object" || S === null)
      return S;
    var T = S[Symbol.toPrimitive];
    if (T !== void 0) {
      var O = T.call(S, g);
      if (typeof O != "object")
        return O;
      throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return (g === "string" ? String : Number)(S);
  }
  var f = ke, _ = /* @__PURE__ */ Symbol("lastResolve"), h = /* @__PURE__ */ Symbol("lastReject"), c = /* @__PURE__ */ Symbol("error"), d = /* @__PURE__ */ Symbol("ended"), R = /* @__PURE__ */ Symbol("lastPromise"), P = /* @__PURE__ */ Symbol("handlePromise"), y = /* @__PURE__ */ Symbol("stream");
  function C(S, g) {
    return {
      value: S,
      done: g
    };
  }
  function j(S) {
    var g = S[_];
    if (g !== null) {
      var T = S[y].read();
      T !== null && (S[R] = null, S[_] = null, S[h] = null, g(C(T, false)));
    }
  }
  function w(S) {
    Oe$1.nextTick(j, S);
  }
  function m(S, g) {
    return function(T, O) {
      S.then(function() {
        if (g[d]) {
          T(C(void 0, true));
          return;
        }
        g[P](T, O);
      }, O);
    };
  }
  var b = Object.getPrototypeOf(function() {
  }), v = Object.setPrototypeOf((e = {
    get stream() {
      return this[y];
    },
    next: function() {
      var g = this, T = this[c];
      if (T !== null)
        return Promise.reject(T);
      if (this[d])
        return Promise.resolve(C(void 0, true));
      if (this[y].destroyed)
        return new Promise(function(M, W) {
          Oe$1.nextTick(function() {
            g[c] ? W(g[c]) : M(C(void 0, true));
          });
        });
      var O = this[R], H;
      if (O)
        H = new Promise(m(O, this));
      else {
        var D = this[y].read();
        if (D !== null)
          return Promise.resolve(C(D, false));
        H = new Promise(this[P]);
      }
      return this[R] = H, H;
    }
  }, r(e, Symbol.asyncIterator, function() {
    return this;
  }), r(e, "return", function() {
    var g = this;
    return new Promise(function(T, O) {
      g[y].destroy(null, function(H) {
        if (H) {
          O(H);
          return;
        }
        T(C(void 0, true));
      });
    });
  }), e), b), A = function(g) {
    var T, O = Object.create(v, (T = {}, r(T, y, {
      value: g,
      writable: true
    }), r(T, _, {
      value: null,
      writable: true
    }), r(T, h, {
      value: null,
      writable: true
    }), r(T, c, {
      value: null,
      writable: true
    }), r(T, d, {
      value: g._readableState.endEmitted,
      writable: true
    }), r(T, P, {
      value: function(D, M) {
        var W = O[y].read();
        W ? (O[R] = null, O[_] = null, O[h] = null, D(C(W, false))) : (O[_] = D, O[h] = M);
      },
      writable: true
    }), T));
    return O[R] = null, f(g, function(H) {
      if (H && H.code !== "ERR_STREAM_PREMATURE_CLOSE") {
        var D = O[h];
        D !== null && (O[R] = null, O[_] = null, O[h] = null, D(H)), O[c] = H;
        return;
      }
      var M = O[_];
      M !== null && (O[R] = null, O[_] = null, O[h] = null, M(C(void 0, true))), O[d] = true;
    }), g.on("readable", w.bind(null, O)), O;
  };
  return Ae = A, Ae;
}
var Oe, Xe;
function Ht() {
  return Xe || (Xe = 1, Oe = function() {
    throw new Error("Readable.from is not available in the browser");
  }), Oe;
}
var Pe, ze;
function dt() {
  if (ze)
    return Pe;
  ze = 1, Pe = M;
  var e;
  M.ReadableState = D, Ss.EventEmitter;
  var r = function(n, u) {
    return n.listeners(u).length;
  }, i = at, l = Xn.Buffer, f = (typeof Ue < "u" ? Ue : typeof window < "u" ? window : typeof self < "u" ? self : {}).Uint8Array || function() {
  };
  function _(t) {
    return l.from(t);
  }
  function h(t) {
    return l.isBuffer(t) || t instanceof f;
  }
  var c = zs, d;
  c && c.debuglog ? d = c.debuglog("stream") : d = function() {
  };
  var R = Et(), P = ot, y = lt, C = y.getHighWaterMark, j = X.codes, w = j.ERR_INVALID_ARG_TYPE, m = j.ERR_STREAM_PUSH_AFTER_EOF, b = j.ERR_METHOD_NOT_IMPLEMENTED, v = j.ERR_STREAM_UNSHIFT_AFTER_END_EVENT, A, S, g;
  jt$1(M, i);
  var T = P.errorOrDestroy, O = ["error", "close", "destroy", "pause", "resume"];
  function H(t, n, u) {
    if (typeof t.prependListener == "function")
      return t.prependListener(n, u);
    !t._events || !t._events[n] ? t.on(n, u) : Array.isArray(t._events[n]) ? t._events[n].unshift(u) : t._events[n] = [u, t._events[n]];
  }
  function D(t, n, u) {
    e = e || te(), t = t || {}, typeof u != "boolean" && (u = n instanceof e), this.objectMode = !!t.objectMode, u && (this.objectMode = this.objectMode || !!t.readableObjectMode), this.highWaterMark = C(this, t, "readableHighWaterMark", u), this.buffer = new R(), this.length = 0, this.pipes = null, this.pipesCount = 0, this.flowing = null, this.ended = false, this.endEmitted = false, this.reading = false, this.sync = true, this.needReadable = false, this.emittedReadable = false, this.readableListening = false, this.resumeScheduled = false, this.paused = true, this.emitClose = t.emitClose !== false, this.autoDestroy = !!t.autoDestroy, this.destroyed = false, this.defaultEncoding = t.defaultEncoding || "utf8", this.awaitDrain = 0, this.readingMore = false, this.decoder = null, this.encoding = null, t.encoding && (A || (A = _n().StringDecoder), this.decoder = new A(t.encoding), this.encoding = t.encoding);
  }
  function M(t) {
    if (e = e || te(), !(this instanceof M))
      return new M(t);
    var n = this instanceof e;
    this._readableState = new D(t, this, n), this.readable = true, t && (typeof t.read == "function" && (this._read = t.read), typeof t.destroy == "function" && (this._destroy = t.destroy)), i.call(this);
  }
  Object.defineProperty(M.prototype, "destroyed", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: false,
    get: function() {
      return this._readableState === void 0 ? false : this._readableState.destroyed;
    },
    set: function(n) {
      this._readableState && (this._readableState.destroyed = n);
    }
  }), M.prototype.destroy = P.destroy, M.prototype._undestroy = P.undestroy, M.prototype._destroy = function(t, n) {
    n(t);
  }, M.prototype.push = function(t, n) {
    var u = this._readableState, p;
    return u.objectMode ? p = true : typeof t == "string" && (n = n || u.defaultEncoding, n !== u.encoding && (t = l.from(t, n), n = ""), p = true), W(this, t, n, false, p);
  }, M.prototype.unshift = function(t) {
    return W(this, t, null, true, false);
  };
  function W(t, n, u, p, k) {
    d("readableAddChunk", n);
    var L = t._readableState;
    if (n === null)
      L.reading = false, ye(t, L);
    else {
      var q;
      if (k || (q = _e(L, n)), q)
        T(t, q);
      else if (L.objectMode || n && n.length > 0)
        if (typeof n != "string" && !L.objectMode && Object.getPrototypeOf(n) !== l.prototype && (n = _(n)), p)
          L.endEmitted ? T(t, new v()) : re(t, L, n, true);
        else if (L.ended)
          T(t, new m());
        else {
          if (L.destroyed)
            return false;
          L.reading = false, L.decoder && !u ? (n = L.decoder.write(n), L.objectMode || n.length !== 0 ? re(t, L, n, false) : J(t, L)) : re(t, L, n, false);
        }
      else
        p || (L.reading = false, J(t, L));
    }
    return !L.ended && (L.length < L.highWaterMark || L.length === 0);
  }
  function re(t, n, u, p) {
    n.flowing && n.length === 0 && !n.sync ? (n.awaitDrain = 0, t.emit("data", u)) : (n.length += n.objectMode ? 1 : u.length, p ? n.buffer.unshift(u) : n.buffer.push(u), n.needReadable && G(t)), J(t, n);
  }
  function _e(t, n) {
    var u;
    return !h(n) && typeof n != "string" && n !== void 0 && !t.objectMode && (u = new w("chunk", ["string", "Buffer", "Uint8Array"], n)), u;
  }
  M.prototype.isPaused = function() {
    return this._readableState.flowing === false;
  }, M.prototype.setEncoding = function(t) {
    A || (A = _n().StringDecoder);
    var n = new A(t);
    this._readableState.decoder = n, this._readableState.encoding = this._readableState.decoder.encoding;
    for (var u = this._readableState.buffer.head, p = ""; u !== null; )
      p += n.write(u.data), u = u.next;
    return this._readableState.buffer.clear(), p !== "" && this._readableState.buffer.push(p), this._readableState.length = p.length, this;
  };
  var z = 1073741824;
  function be(t) {
    return t >= z ? t = z : (t--, t |= t >>> 1, t |= t >>> 2, t |= t >>> 4, t |= t >>> 8, t |= t >>> 16, t++), t;
  }
  function ae(t, n) {
    return t <= 0 || n.length === 0 && n.ended ? 0 : n.objectMode ? 1 : t !== t ? n.flowing && n.length ? n.buffer.head.data.length : n.length : (t > n.highWaterMark && (n.highWaterMark = be(t)), t <= n.length ? t : n.ended ? n.length : (n.needReadable = true, 0));
  }
  M.prototype.read = function(t) {
    d("read", t), t = parseInt(t, 10);
    var n = this._readableState, u = t;
    if (t !== 0 && (n.emittedReadable = false), t === 0 && n.needReadable && ((n.highWaterMark !== 0 ? n.length >= n.highWaterMark : n.length > 0) || n.ended))
      return d("read: emitReadable", n.length, n.ended), n.length === 0 && n.ended ? s(this) : G(this), null;
    if (t = ae(t, n), t === 0 && n.ended)
      return n.length === 0 && s(this), null;
    var p = n.needReadable;
    d("need readable", p), (n.length === 0 || n.length - t < n.highWaterMark) && (p = true, d("length less than watermark", p)), n.ended || n.reading ? (p = false, d("reading or ended", p)) : p && (d("do read"), n.reading = true, n.sync = true, n.length === 0 && (n.needReadable = true), this._read(n.highWaterMark), n.sync = false, n.reading || (t = ae(u, n)));
    var k;
    return t > 0 ? k = a(t, n) : k = null, k === null ? (n.needReadable = n.length <= n.highWaterMark, t = 0) : (n.length -= t, n.awaitDrain = 0), n.length === 0 && (n.ended || (n.needReadable = true), u !== t && n.ended && s(this)), k !== null && this.emit("data", k), k;
  };
  function ye(t, n) {
    if (d("onEofChunk"), !n.ended) {
      if (n.decoder) {
        var u = n.decoder.end();
        u && u.length && (n.buffer.push(u), n.length += n.objectMode ? 1 : u.length);
      }
      n.ended = true, n.sync ? G(t) : (n.needReadable = false, n.emittedReadable || (n.emittedReadable = true, oe(t)));
    }
  }
  function G(t) {
    var n = t._readableState;
    d("emitReadable", n.needReadable, n.emittedReadable), n.needReadable = false, n.emittedReadable || (d("emitReadable", n.flowing), n.emittedReadable = true, Oe$1.nextTick(oe, t));
  }
  function oe(t) {
    var n = t._readableState;
    d("emitReadable_", n.destroyed, n.length, n.ended), !n.destroyed && (n.length || n.ended) && (t.emit("readable"), n.emittedReadable = false), n.needReadable = !n.flowing && !n.ended && n.length <= n.highWaterMark, o(t);
  }
  function J(t, n) {
    n.readingMore || (n.readingMore = true, Oe$1.nextTick(fe, t, n));
  }
  function fe(t, n) {
    for (; !n.reading && !n.ended && (n.length < n.highWaterMark || n.flowing && n.length === 0); ) {
      var u = n.length;
      if (d("maybeReadMore read 0"), t.read(0), u === n.length)
        break;
    }
    n.readingMore = false;
  }
  M.prototype._read = function(t) {
    T(this, new b("_read()"));
  }, M.prototype.pipe = function(t, n) {
    var u = this, p = this._readableState;
    switch (p.pipesCount) {
      case 0:
        p.pipes = t;
        break;
      case 1:
        p.pipes = [p.pipes, t];
        break;
      default:
        p.pipes.push(t);
        break;
    }
    p.pipesCount += 1, d("pipe count=%d opts=%j", p.pipesCount, n);
    var k = (!n || n.end !== false) && t !== Oe$1.stdout && t !== Oe$1.stderr, L = k ? Q : ne;
    p.endEmitted ? Oe$1.nextTick(L) : u.once("end", L), t.on("unpipe", q);
    function q(Z, ee) {
      d("onunpipe"), Z === u && ee && ee.hasUnpiped === false && (ee.hasUnpiped = true, vt());
    }
    function Q() {
      d("onend"), t.end();
    }
    var ue = ve(u);
    t.on("drain", ue);
    var Ue2 = false;
    function vt() {
      d("cleanup"), t.removeListener("close", me), t.removeListener("finish", Ee), t.removeListener("drain", ue), t.removeListener("error", Re), t.removeListener("unpipe", q), u.removeListener("end", Q), u.removeListener("end", ne), u.removeListener("data", xe), Ue2 = true, p.awaitDrain && (!t._writableState || t._writableState.needDrain) && ue();
    }
    u.on("data", xe);
    function xe(Z) {
      d("ondata");
      var ee = t.write(Z);
      d("dest.write", ee), ee === false && ((p.pipesCount === 1 && p.pipes === t || p.pipesCount > 1 && N(p.pipes, t) !== -1) && !Ue2 && (d("false write response, pause", p.awaitDrain), p.awaitDrain++), u.pause());
    }
    function Re(Z) {
      d("onerror", Z), ne(), t.removeListener("error", Re), r(t, "error") === 0 && T(t, Z);
    }
    H(t, "error", Re);
    function me() {
      t.removeListener("finish", Ee), ne();
    }
    t.once("close", me);
    function Ee() {
      d("onfinish"), t.removeListener("close", me), ne();
    }
    t.once("finish", Ee);
    function ne() {
      d("unpipe"), u.unpipe(t);
    }
    return t.emit("pipe", u), p.flowing || (d("pipe resume"), u.resume()), t;
  };
  function ve(t) {
    return function() {
      var u = t._readableState;
      d("pipeOnDrain", u.awaitDrain), u.awaitDrain && u.awaitDrain--, u.awaitDrain === 0 && r(t, "data") && (u.flowing = true, o(t));
    };
  }
  M.prototype.unpipe = function(t) {
    var n = this._readableState, u = {
      hasUnpiped: false
    };
    if (n.pipesCount === 0)
      return this;
    if (n.pipesCount === 1)
      return t && t !== n.pipes ? this : (t || (t = n.pipes), n.pipes = null, n.pipesCount = 0, n.flowing = false, t && t.emit("unpipe", this, u), this);
    if (!t) {
      var p = n.pipes, k = n.pipesCount;
      n.pipes = null, n.pipesCount = 0, n.flowing = false;
      for (var L = 0; L < k; L++)
        p[L].emit("unpipe", this, {
          hasUnpiped: false
        });
      return this;
    }
    var q = N(n.pipes, t);
    return q === -1 ? this : (n.pipes.splice(q, 1), n.pipesCount -= 1, n.pipesCount === 1 && (n.pipes = n.pipes[0]), t.emit("unpipe", this, u), this);
  }, M.prototype.on = function(t, n) {
    var u = i.prototype.on.call(this, t, n), p = this._readableState;
    return t === "data" ? (p.readableListening = this.listenerCount("readable") > 0, p.flowing !== false && this.resume()) : t === "readable" && !p.endEmitted && !p.readableListening && (p.readableListening = p.needReadable = true, p.flowing = false, p.emittedReadable = false, d("on readable", p.length, p.reading), p.length ? G(this) : p.reading || Oe$1.nextTick($, this)), u;
  }, M.prototype.addListener = M.prototype.on, M.prototype.removeListener = function(t, n) {
    var u = i.prototype.removeListener.call(this, t, n);
    return t === "readable" && Oe$1.nextTick(le, this), u;
  }, M.prototype.removeAllListeners = function(t) {
    var n = i.prototype.removeAllListeners.apply(this, arguments);
    return (t === "readable" || t === void 0) && Oe$1.nextTick(le, this), n;
  };
  function le(t) {
    var n = t._readableState;
    n.readableListening = t.listenerCount("readable") > 0, n.resumeScheduled && !n.paused ? n.flowing = true : t.listenerCount("data") > 0 && t.resume();
  }
  function $(t) {
    d("readable nexttick read 0"), t.read(0);
  }
  M.prototype.resume = function() {
    var t = this._readableState;
    return t.flowing || (d("resume"), t.flowing = !t.readableListening, ge(this, t)), t.paused = false, this;
  };
  function ge(t, n) {
    n.resumeScheduled || (n.resumeScheduled = true, Oe$1.nextTick(we, t, n));
  }
  function we(t, n) {
    d("resume", n.reading), n.reading || t.read(0), n.resumeScheduled = false, t.emit("resume"), o(t), n.flowing && !n.reading && t.read(0);
  }
  M.prototype.pause = function() {
    return d("call pause flowing=%j", this._readableState.flowing), this._readableState.flowing !== false && (d("pause"), this._readableState.flowing = false, this.emit("pause")), this._readableState.paused = true, this;
  };
  function o(t) {
    var n = t._readableState;
    for (d("flow", n.flowing); n.flowing && t.read() !== null; )
      ;
  }
  M.prototype.wrap = function(t) {
    var n = this, u = this._readableState, p = false;
    t.on("end", function() {
      if (d("wrapped end"), u.decoder && !u.ended) {
        var q = u.decoder.end();
        q && q.length && n.push(q);
      }
      n.push(null);
    }), t.on("data", function(q) {
      if (d("wrapped data"), u.decoder && (q = u.decoder.write(q)), !(u.objectMode && q == null) && !(!u.objectMode && (!q || !q.length))) {
        var Q = n.push(q);
        Q || (p = true, t.pause());
      }
    });
    for (var k in t)
      this[k] === void 0 && typeof t[k] == "function" && (this[k] = /* @__PURE__ */ (function(Q) {
        return function() {
          return t[Q].apply(t, arguments);
        };
      })(k));
    for (var L = 0; L < O.length; L++)
      t.on(O[L], this.emit.bind(this, O[L]));
    return this._read = function(q) {
      d("wrapped _read", q), p && (p = false, t.resume());
    }, this;
  }, typeof Symbol == "function" && (M.prototype[Symbol.asyncIterator] = function() {
    return S === void 0 && (S = jt()), S(this);
  }), Object.defineProperty(M.prototype, "readableHighWaterMark", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: false,
    get: function() {
      return this._readableState.highWaterMark;
    }
  }), Object.defineProperty(M.prototype, "readableBuffer", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: false,
    get: function() {
      return this._readableState && this._readableState.buffer;
    }
  }), Object.defineProperty(M.prototype, "readableFlowing", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: false,
    get: function() {
      return this._readableState.flowing;
    },
    set: function(n) {
      this._readableState && (this._readableState.flowing = n);
    }
  }), M._fromList = a, Object.defineProperty(M.prototype, "readableLength", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: false,
    get: function() {
      return this._readableState.length;
    }
  });
  function a(t, n) {
    if (n.length === 0)
      return null;
    var u;
    return n.objectMode ? u = n.buffer.shift() : !t || t >= n.length ? (n.decoder ? u = n.buffer.join("") : n.buffer.length === 1 ? u = n.buffer.first() : u = n.buffer.concat(n.length), n.buffer.clear()) : u = n.buffer.consume(t, n.decoder), u;
  }
  function s(t) {
    var n = t._readableState;
    d("endReadable", n.endEmitted), n.endEmitted || (n.ended = true, Oe$1.nextTick(E, n, t));
  }
  function E(t, n) {
    if (d("endReadableNT", t.endEmitted, t.length), !t.endEmitted && t.length === 0 && (t.endEmitted = true, n.readable = false, n.emit("end"), t.autoDestroy)) {
      var u = n._writableState;
      (!u || u.autoDestroy && u.finished) && n.destroy();
    }
  }
  typeof Symbol == "function" && (M.from = function(t, n) {
    return g === void 0 && (g = Ht()), g(M, t, n);
  });
  function N(t, n) {
    for (var u = 0, p = t.length; u < p; u++)
      if (t[u] === n)
        return u;
    return -1;
  }
  return Pe;
}
var ct = F, he = X.codes, Ut = he.ERR_METHOD_NOT_IMPLEMENTED, xt = he.ERR_MULTIPLE_CALLBACK, Bt = he.ERR_TRANSFORM_ALREADY_TRANSFORMING, Wt = he.ERR_TRANSFORM_WITH_LENGTH_0, pe = te();
jt$1(F, pe);
function Ft(e, r) {
  var i = this._transformState;
  i.transforming = false;
  var l = i.writecb;
  if (l === null)
    return this.emit("error", new xt());
  i.writechunk = null, i.writecb = null, r != null && this.push(r), l(e);
  var f = this._readableState;
  f.reading = false, (f.needReadable || f.length < f.highWaterMark) && this._read(f.highWaterMark);
}
function F(e) {
  if (!(this instanceof F))
    return new F(e);
  pe.call(this, e), this._transformState = {
    afterTransform: Ft.bind(this),
    needTransform: false,
    transforming: false,
    writecb: null,
    writechunk: null,
    writeencoding: null
  }, this._readableState.needReadable = true, this._readableState.sync = false, e && (typeof e.transform == "function" && (this._transform = e.transform), typeof e.flush == "function" && (this._flush = e.flush)), this.on("prefinish", Gt);
}
function Gt() {
  var e = this;
  typeof this._flush == "function" && !this._readableState.destroyed ? this._flush(function(r, i) {
    Je(e, r, i);
  }) : Je(this, null, null);
}
F.prototype.push = function(e, r) {
  return this._transformState.needTransform = false, pe.prototype.push.call(this, e, r);
};
F.prototype._transform = function(e, r, i) {
  i(new Ut("_transform()"));
};
F.prototype._write = function(e, r, i) {
  var l = this._transformState;
  if (l.writecb = i, l.writechunk = e, l.writeencoding = r, !l.transforming) {
    var f = this._readableState;
    (l.needTransform || f.needReadable || f.length < f.highWaterMark) && this._read(f.highWaterMark);
  }
};
F.prototype._read = function(e) {
  var r = this._transformState;
  r.writechunk !== null && !r.transforming ? (r.transforming = true, this._transform(r.writechunk, r.writeencoding, r.afterTransform)) : r.needTransform = true;
};
F.prototype._destroy = function(e, r) {
  pe.prototype._destroy.call(this, e, function(i) {
    r(i);
  });
};
function Je(e, r, i) {
  if (r)
    return e.emit("error", r);
  if (i != null && e.push(i), e._writableState.length)
    throw new Wt();
  if (e._transformState.transforming)
    throw new Bt();
  return e.push(null);
}
var $t = ie, ht = ct;
jt$1(ie, ht);
function ie(e) {
  if (!(this instanceof ie))
    return new ie(e);
  ht.call(this, e);
}
ie.prototype._transform = function(e, r, i) {
  i(null, e);
};
var Le;
function Vt(e) {
  var r = false;
  return function() {
    r || (r = true, e.apply(void 0, arguments));
  };
}
var pt = X.codes, Kt = pt.ERR_MISSING_ARGS, Yt = pt.ERR_STREAM_DESTROYED;
function Qe(e) {
  if (e)
    throw e;
}
function Xt(e) {
  return e.setHeader && typeof e.abort == "function";
}
function zt(e, r, i, l) {
  l = Vt(l);
  var f = false;
  e.on("close", function() {
    f = true;
  }), Le === void 0 && (Le = ke), Le(e, {
    readable: r,
    writable: i
  }, function(h) {
    if (h)
      return l(h);
    f = true, l();
  });
  var _ = false;
  return function(h) {
    if (!f && !_) {
      if (_ = true, Xt(e))
        return e.abort();
      if (typeof e.destroy == "function")
        return e.destroy();
      l(h || new Yt("pipe"));
    }
  };
}
function Ze(e) {
  e();
}
function Jt(e, r) {
  return e.pipe(r);
}
function Qt(e) {
  return !e.length || typeof e[e.length - 1] != "function" ? Qe : e.pop();
}
function Zt() {
  for (var e = arguments.length, r = new Array(e), i = 0; i < e; i++)
    r[i] = arguments[i];
  var l = Qt(r);
  if (Array.isArray(r[0]) && (r = r[0]), r.length < 2)
    throw new Kt("streams");
  var f, _ = r.map(function(h, c) {
    var d = c < r.length - 1, R = c > 0;
    return zt(h, d, R, function(P) {
      f || (f = P), P && _.forEach(Ze), !d && (_.forEach(Ze), l(f));
    });
  });
  return r.reduce(Jt);
}
var er = Zt;
(function(e, r) {
  r = e.exports = dt(), r.Stream = r, r.Readable = r, r.Writable = ut(), r.Duplex = te(), r.Transform = ct, r.PassThrough = $t, r.finished = ke, r.pipeline = er;
})(Ce, Ce.exports);
var _t = Ce.exports, et = qe, tr = jt$1, bt = _t, se = ce.readyStates = {
  UNSENT: 0,
  OPENED: 1,
  HEADERS_RECEIVED: 2,
  LOADING: 3,
  DONE: 4
}, je = ce.IncomingMessage = function(e, r, i, l) {
  var f = this;
  if (bt.Readable.call(f), f._mode = i, f.headers = {}, f.rawHeaders = [], f.trailers = {}, f.rawTrailers = [], f.on("end", function() {
    Oe$1.nextTick(function() {
      f.emit("close");
    });
  }), i === "fetch") {
    let P = function() {
      h.read().then(function(y) {
        if (!f._destroyed) {
          if (l(y.done), y.done) {
            f.push(null);
            return;
          }
          f.push(sc.from(y.value)), P();
        }
      }).catch(function(y) {
        l(true), f._destroyed || f.emit("error", y);
      });
    };
    if (f._fetchResponse = r, f.url = r.url, f.statusCode = r.status, f.statusMessage = r.statusText, r.headers.forEach(function(y, C) {
      f.headers[C.toLowerCase()] = y, f.rawHeaders.push(C, y);
    }), et.writableStream) {
      var _ = new WritableStream({
        write: function(y) {
          return l(false), new Promise(function(C, j) {
            f._destroyed ? j() : f.push(sc.from(y)) ? C() : f._resumeFetch = C;
          });
        },
        close: function() {
          l(true), f._destroyed || f.push(null);
        },
        abort: function(y) {
          l(true), f._destroyed || f.emit("error", y);
        }
      });
      try {
        r.body.pipeTo(_).catch(function(y) {
          l(true), f._destroyed || f.emit("error", y);
        });
        return;
      } catch {
      }
    }
    var h = r.body.getReader();
    P();
  } else {
    f._xhr = e, f._pos = 0, f.url = e.responseURL, f.statusCode = e.status, f.statusMessage = e.statusText;
    var c = e.getAllResponseHeaders().split(/\r?\n/);
    if (c.forEach(function(P) {
      var y = P.match(/^([^:]+):\s*(.*)/);
      if (y) {
        var C = y[1].toLowerCase();
        C === "set-cookie" ? (f.headers[C] === void 0 && (f.headers[C] = []), f.headers[C].push(y[2])) : f.headers[C] !== void 0 ? f.headers[C] += ", " + y[2] : f.headers[C] = y[2], f.rawHeaders.push(y[1], y[2]);
      }
    }), f._charset = "x-user-defined", !et.overrideMimeType) {
      var d = f.rawHeaders["mime-type"];
      if (d) {
        var R = d.match(/;\s*charset=([^;])(;|$)/);
        R && (f._charset = R[1].toLowerCase());
      }
      f._charset || (f._charset = "utf-8");
    }
  }
};
tr(je, bt.Readable);
je.prototype._read = function() {
  var e = this, r = e._resumeFetch;
  r && (e._resumeFetch = null, r());
};
je.prototype._onXHRProgress = function(e) {
  var r = this, i = r._xhr, l = null;
  switch (r._mode) {
    case "text":
      if (l = i.responseText, l.length > r._pos) {
        var f = l.substr(r._pos);
        if (r._charset === "x-user-defined") {
          for (var _ = sc.alloc(f.length), h = 0; h < f.length; h++)
            _[h] = f.charCodeAt(h) & 255;
          r.push(_);
        } else
          r.push(f, r._charset);
        r._pos = l.length;
      }
      break;
    case "arraybuffer":
      if (i.readyState !== se.DONE || !i.response)
        break;
      l = i.response, r.push(sc.from(new Uint8Array(l)));
      break;
    case "moz-chunked-arraybuffer":
      if (l = i.response, i.readyState !== se.LOADING || !l)
        break;
      r.push(sc.from(new Uint8Array(l)));
      break;
    case "ms-stream":
      if (l = i.response, i.readyState !== se.LOADING)
        break;
      var c = new Ue.MSStreamReader();
      c.onprogress = function() {
        c.result.byteLength > r._pos && (r.push(sc.from(new Uint8Array(c.result.slice(r._pos)))), r._pos = c.result.byteLength);
      }, c.onload = function() {
        e(true), r.push(null);
      }, c.readAsArrayBuffer(l);
      break;
  }
  r._xhr.readyState === se.DONE && r._mode !== "ms-stream" && (e(true), r.push(null));
};
var K = qe, rr = jt$1, yt = ce, He = _t, nr = yt.IncomingMessage, tt = yt.readyStates;
function ir(e, r) {
  return K.fetch && r ? "fetch" : K.mozchunkedarraybuffer ? "moz-chunked-arraybuffer" : K.msstream ? "ms-stream" : K.arraybuffer && e ? "arraybuffer" : "text";
}
var x = it.exports = function(e) {
  var r = this;
  He.Writable.call(r), r._opts = e, r._body = [], r._headers = {}, e.auth && r.setHeader("Authorization", "Basic " + sc.from(e.auth).toString("base64")), Object.keys(e.headers).forEach(function(f) {
    r.setHeader(f, e.headers[f]);
  });
  var i, l = true;
  if (e.mode === "disable-fetch" || "requestTimeout" in e && !K.abortController)
    l = false, i = true;
  else if (e.mode === "prefer-streaming")
    i = false;
  else if (e.mode === "allow-wrong-content-type")
    i = !K.overrideMimeType;
  else if (!e.mode || e.mode === "default" || e.mode === "prefer-fast")
    i = true;
  else
    throw new Error("Invalid value for opts.mode");
  r._mode = ir(i, l), r._fetchTimer = null, r._socketTimeout = null, r._socketTimer = null, r.on("finish", function() {
    r._onFinish();
  });
};
rr(x, He.Writable);
x.prototype.setHeader = function(e, r) {
  var i = this, l = e.toLowerCase();
  or.indexOf(l) === -1 && (i._headers[l] = {
    name: e,
    value: r
  });
};
x.prototype.getHeader = function(e) {
  var r = this._headers[e.toLowerCase()];
  return r ? r.value : null;
};
x.prototype.removeHeader = function(e) {
  var r = this;
  delete r._headers[e.toLowerCase()];
};
x.prototype._onFinish = function() {
  var e = this;
  if (!e._destroyed) {
    var r = e._opts;
    "timeout" in r && r.timeout !== 0 && e.setTimeout(r.timeout);
    var i = e._headers, l = null;
    r.method !== "GET" && r.method !== "HEAD" && (l = new Blob(e._body, {
      type: (i["content-type"] || {}).value || ""
    }));
    var f = [];
    if (Object.keys(i).forEach(function(d) {
      var R = i[d].name, P = i[d].value;
      Array.isArray(P) ? P.forEach(function(y) {
        f.push([R, y]);
      }) : f.push([R, P]);
    }), e._mode === "fetch") {
      var _ = null;
      if (K.abortController) {
        var h = new AbortController();
        _ = h.signal, e._fetchAbortController = h, "requestTimeout" in r && r.requestTimeout !== 0 && (e._fetchTimer = Ue.setTimeout(function() {
          e.emit("requestTimeout"), e._fetchAbortController && e._fetchAbortController.abort();
        }, r.requestTimeout));
      }
      Ue.fetch(e._opts.url, {
        method: e._opts.method,
        headers: f,
        body: l || void 0,
        mode: "cors",
        credentials: r.withCredentials ? "include" : "same-origin",
        signal: _
      }).then(function(d) {
        e._fetchResponse = d, e._resetTimers(false), e._connect();
      }, function(d) {
        e._resetTimers(true), e._destroyed || e.emit("error", d);
      });
    } else {
      var c = e._xhr = new Ue.XMLHttpRequest();
      try {
        c.open(e._opts.method, e._opts.url, true);
      } catch (d) {
        Oe$1.nextTick(function() {
          e.emit("error", d);
        });
        return;
      }
      "responseType" in c && (c.responseType = e._mode), "withCredentials" in c && (c.withCredentials = !!r.withCredentials), e._mode === "text" && "overrideMimeType" in c && c.overrideMimeType("text/plain; charset=x-user-defined"), "requestTimeout" in r && (c.timeout = r.requestTimeout, c.ontimeout = function() {
        e.emit("requestTimeout");
      }), f.forEach(function(d) {
        c.setRequestHeader(d[0], d[1]);
      }), e._response = null, c.onreadystatechange = function() {
        switch (c.readyState) {
          case tt.LOADING:
          case tt.DONE:
            e._onXHRProgress();
            break;
        }
      }, e._mode === "moz-chunked-arraybuffer" && (c.onprogress = function() {
        e._onXHRProgress();
      }), c.onerror = function() {
        e._destroyed || (e._resetTimers(true), e.emit("error", new Error("XHR error")));
      };
      try {
        c.send(l);
      } catch (d) {
        Oe$1.nextTick(function() {
          e.emit("error", d);
        });
        return;
      }
    }
  }
};
function ar(e) {
  try {
    var r = e.status;
    return r !== null && r !== 0;
  } catch {
    return false;
  }
}
x.prototype._onXHRProgress = function() {
  var e = this;
  e._resetTimers(false), !(!ar(e._xhr) || e._destroyed) && (e._response || e._connect(), e._response._onXHRProgress(e._resetTimers.bind(e)));
};
x.prototype._connect = function() {
  var e = this;
  e._destroyed || (e._response = new nr(e._xhr, e._fetchResponse, e._mode, e._resetTimers.bind(e)), e._response.on("error", function(r) {
    e.emit("error", r);
  }), e.emit("response", e._response));
};
x.prototype._write = function(e, r, i) {
  var l = this;
  l._body.push(e), i();
};
x.prototype._resetTimers = function(e) {
  var r = this;
  Ue.clearTimeout(r._socketTimer), r._socketTimer = null, e ? (Ue.clearTimeout(r._fetchTimer), r._fetchTimer = null) : r._socketTimeout && (r._socketTimer = Ue.setTimeout(function() {
    r.emit("timeout");
  }, r._socketTimeout));
};
x.prototype.abort = x.prototype.destroy = function(e) {
  var r = this;
  r._destroyed = true, r._resetTimers(true), r._response && (r._response._destroyed = true), r._xhr ? r._xhr.abort() : r._fetchAbortController && r._fetchAbortController.abort(), e && r.emit("error", e);
};
x.prototype.end = function(e, r, i) {
  var l = this;
  typeof e == "function" && (i = e, e = void 0), He.Writable.prototype.end.call(l, e, r, i);
};
x.prototype.setTimeout = function(e, r) {
  var i = this;
  r && i.once("timeout", r), i._socketTimeout = e, i._resetTimers(false);
};
x.prototype.flushHeaders = function() {
};
x.prototype.setNoDelay = function() {
};
x.prototype.setSocketKeepAlive = function() {
};
var or = [
  "accept-charset",
  "accept-encoding",
  "access-control-request-headers",
  "access-control-request-method",
  "connection",
  "content-length",
  "cookie",
  "cookie2",
  "date",
  "dnt",
  "expect",
  "host",
  "keep-alive",
  "origin",
  "referer",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "via"
], fr = it.exports, lr = sr, ur = Object.prototype.hasOwnProperty;
function sr() {
  for (var e = {}, r = 0; r < arguments.length; r++) {
    var i = arguments[r];
    for (var l in i)
      ur.call(i, l) && (e[l] = i[l]);
  }
  return e;
}
var dr = {
  100: "Continue",
  101: "Switching Protocols",
  102: "Processing",
  200: "OK",
  201: "Created",
  202: "Accepted",
  203: "Non-Authoritative Information",
  204: "No Content",
  205: "Reset Content",
  206: "Partial Content",
  207: "Multi-Status",
  208: "Already Reported",
  226: "IM Used",
  300: "Multiple Choices",
  301: "Moved Permanently",
  302: "Found",
  303: "See Other",
  304: "Not Modified",
  305: "Use Proxy",
  307: "Temporary Redirect",
  308: "Permanent Redirect",
  400: "Bad Request",
  401: "Unauthorized",
  402: "Payment Required",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  406: "Not Acceptable",
  407: "Proxy Authentication Required",
  408: "Request Timeout",
  409: "Conflict",
  410: "Gone",
  411: "Length Required",
  412: "Precondition Failed",
  413: "Payload Too Large",
  414: "URI Too Long",
  415: "Unsupported Media Type",
  416: "Range Not Satisfiable",
  417: "Expectation Failed",
  418: "I'm a teapot",
  421: "Misdirected Request",
  422: "Unprocessable Entity",
  423: "Locked",
  424: "Failed Dependency",
  425: "Unordered Collection",
  426: "Upgrade Required",
  428: "Precondition Required",
  429: "Too Many Requests",
  431: "Request Header Fields Too Large",
  451: "Unavailable For Legal Reasons",
  500: "Internal Server Error",
  501: "Not Implemented",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
  505: "HTTP Version Not Supported",
  506: "Variant Also Negotiates",
  507: "Insufficient Storage",
  508: "Loop Detected",
  509: "Bandwidth Limit Exceeded",
  510: "Not Extended",
  511: "Network Authentication Required"
};
(function(e) {
  var r = fr, i = ce, l = lr, f = dr, _ = rt, h = e;
  h.request = function(c, d) {
    typeof c == "string" ? c = _.parse(c) : c = l(c);
    var R = Ue.location.protocol.search(/^https?:$/) === -1 ? "http:" : "", P = c.protocol || R, y = c.hostname || c.host, C = c.port, j = c.path || "/";
    y && y.indexOf(":") !== -1 && (y = "[" + y + "]"), c.url = (y ? P + "//" + y : "") + (C ? ":" + C : "") + j, c.method = (c.method || "GET").toUpperCase(), c.headers = c.headers || {};
    var w = new r(c);
    return d && w.on("response", d), w;
  }, h.get = function(d, R) {
    var P = h.request(d, R);
    return P.end(), P;
  }, h.ClientRequest = r, h.IncomingMessage = i.IncomingMessage, h.Agent = function() {
  }, h.Agent.defaultMaxSockets = 4, h.globalAgent = new h.Agent(), h.STATUS_CODES = f, h.METHODS = [
    "CHECKOUT",
    "CONNECT",
    "COPY",
    "DELETE",
    "GET",
    "HEAD",
    "LOCK",
    "M-SEARCH",
    "MERGE",
    "MKACTIVITY",
    "MKCOL",
    "MOVE",
    "NOTIFY",
    "OPTIONS",
    "PATCH",
    "POST",
    "PROPFIND",
    "PROPPATCH",
    "PURGE",
    "PUT",
    "REPORT",
    "SEARCH",
    "SUBSCRIBE",
    "TRACE",
    "UNLOCK",
    "UNSUBSCRIBE"
  ];
})(Ie);
const cr = /* @__PURE__ */ fl(Ie), _r = /* @__PURE__ */ mt({
  __proto__: null,
  default: cr
}, [Ie]);
export {
  ct as _,
  cr as a,
  ut as b,
  te as c,
  $t as d,
  ke as e,
  _r as h,
  er as p,
  dt as r,
  Ie as s
};
