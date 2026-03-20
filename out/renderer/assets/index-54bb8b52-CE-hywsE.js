import { U as Ue, S as Ss, s as sc, f as fl } from "./CedeStore-DfpiZiOO.js";
import { a } from "./empty-73bf2089-BEzbM0NJ.js";
import { r as rt } from "./url-6cb53b95-DWjpptWm.js";
import { t as tt } from "./assert-990dca8c-PQWgsRh1.js";
import { N } from "./browser-8396eed5-IB_ubhyz.js";
import "./index-73GArslZ.js";
function I(t, n) {
  for (var r = 0; r < n.length; r++) {
    const e = n[r];
    if (typeof e != "string" && !Array.isArray(e)) {
      for (const s in e)
        if (s !== "default" && !(s in t)) {
          const o = Object.getOwnPropertyDescriptor(e, s);
          o && Object.defineProperty(t, s, o.get ? o : {
            enumerable: true,
            get: () => e[s]
          });
        }
    }
  }
  return Object.freeze(Object.defineProperty(t, Symbol.toStringTag, { value: "Module" }));
}
var O = {}, S = {};
Object.defineProperty(S, "__esModule", { value: true });
function F(t) {
  return function(n, r) {
    return new Promise((e, s) => {
      t.call(this, n, r, (o, u) => {
        o ? s(o) : e(u);
      });
    });
  };
}
S.default = F;
var H = Ue && Ue.__importDefault || function(t) {
  return t && t.__esModule ? t : { default: t };
};
const z = Ss, U = H(N), G = H(S), b = U.default("agent-base");
function K(t) {
  return !!t && typeof t.addRequest == "function";
}
function w() {
  const { stack: t } = new Error();
  return typeof t != "string" ? false : t.split(`
`).some((n) => n.indexOf("(https.js:") !== -1 || n.indexOf("node:https:") !== -1);
}
function v(t, n) {
  return new v.Agent(t, n);
}
(function(t) {
  class n extends z.EventEmitter {
    constructor(e, s) {
      super();
      let o = s;
      typeof e == "function" ? this.callback = e : e && (o = e), this.timeout = null, o && typeof o.timeout == "number" && (this.timeout = o.timeout), this.maxFreeSockets = 1, this.maxSockets = 1, this.maxTotalSockets = 1 / 0, this.sockets = {}, this.freeSockets = {}, this.requests = {}, this.options = {};
    }
    get defaultPort() {
      return typeof this.explicitDefaultPort == "number" ? this.explicitDefaultPort : w() ? 443 : 80;
    }
    set defaultPort(e) {
      this.explicitDefaultPort = e;
    }
    get protocol() {
      return typeof this.explicitProtocol == "string" ? this.explicitProtocol : w() ? "https:" : "http:";
    }
    set protocol(e) {
      this.explicitProtocol = e;
    }
    callback(e, s, o) {
      throw new Error('"agent-base" has no default implementation, you must subclass and override `callback()`');
    }
    /**
     * Called by node-core's "_http_client.js" module when creating
     * a new HTTP request with this Agent instance.
     *
     * @api public
     */
    addRequest(e, s) {
      const o = Object.assign({}, s);
      typeof o.secureEndpoint != "boolean" && (o.secureEndpoint = w()), o.host == null && (o.host = "localhost"), o.port == null && (o.port = o.secureEndpoint ? 443 : 80), o.protocol == null && (o.protocol = o.secureEndpoint ? "https:" : "http:"), o.host && o.path && delete o.path, delete o.agent, delete o.hostname, delete o._defaultAgent, delete o.defaultPort, delete o.createConnection, e._last = true, e.shouldKeepAlive = false;
      let u = false, c = null;
      const p = o.timeout || this.timeout, f = (a2) => {
        e._hadError || (e.emit("error", a2), e._hadError = true);
      }, l = () => {
        c = null, u = true;
        const a2 = new Error(`A "socket" was not created for HTTP request before ${p}ms`);
        a2.code = "ETIMEOUT", f(a2);
      }, i = (a2) => {
        u || (c !== null && (clearTimeout(c), c = null), f(a2));
      }, h = (a2) => {
        if (u)
          return;
        if (c != null && (clearTimeout(c), c = null), K(a2)) {
          b("Callback returned another Agent instance %o", a2.constructor.name), a2.addRequest(e, o);
          return;
        }
        if (a2) {
          a2.once("free", () => {
            this.freeSocket(a2, o);
          }), e.onSocket(a2);
          return;
        }
        const y = new Error(`no Duplex stream was returned to agent-base for \`${e.method} ${e.path}\``);
        f(y);
      };
      if (typeof this.callback != "function") {
        f(new Error("`callback` is not defined"));
        return;
      }
      this.promisifiedCallback || (this.callback.length >= 3 ? (b("Converting legacy callback function to promise"), this.promisifiedCallback = G.default(this.callback)) : this.promisifiedCallback = this.callback), typeof p == "number" && p > 0 && (c = setTimeout(l, p)), "port" in o && typeof o.port != "number" && (o.port = Number(o.port));
      try {
        b("Resolving socket for %o request: %o", o.protocol, `${e.method} ${e.path}`), Promise.resolve(this.promisifiedCallback(e, o)).then(h, i);
      } catch (a2) {
        Promise.reject(a2).catch(i);
      }
    }
    freeSocket(e, s) {
      b("Freeing socket %o %o", e.constructor.name, s), e.destroy();
    }
    destroy() {
      b("Destroying agent %o", this.constructor.name);
    }
  }
  t.Agent = n, t.prototype = t.Agent.prototype;
})(v || (v = {}));
var J = v, T = {}, Q = Ue && Ue.__importDefault || function(t) {
  return t && t.__esModule ? t : { default: t };
};
Object.defineProperty(T, "__esModule", { value: true });
const V = Q(N), _ = V.default("https-proxy-agent:parse-proxy-response");
function W(t) {
  return new Promise((n, r) => {
    let e = 0;
    const s = [];
    function o() {
      const i = t.read();
      i ? l(i) : t.once("readable", o);
    }
    function u() {
      t.removeListener("end", p), t.removeListener("error", f), t.removeListener("close", c), t.removeListener("readable", o);
    }
    function c(i) {
      _("onclose had error %o", i);
    }
    function p() {
      _("onend");
    }
    function f(i) {
      u(), _("onerror %o", i), r(i);
    }
    function l(i) {
      s.push(i), e += i.length;
      const h = sc.concat(s, e);
      if (h.indexOf(`\r
\r
`) === -1) {
        _("have not received end of HTTP headers yet..."), o();
        return;
      }
      const y = h.toString("ascii", 0, h.indexOf(`\r
`)), P = +y.split(" ")[1];
      _("got proxy server response: %o", y), n({
        statusCode: P,
        buffered: h
      });
    }
    t.on("error", f), t.on("close", c), t.on("end", p), o();
  });
}
T.default = W;
var X = Ue && Ue.__awaiter || function(t, n, r, e) {
  function s(o) {
    return o instanceof r ? o : new r(function(u) {
      u(o);
    });
  }
  return new (r || (r = Promise))(function(o, u) {
    function c(l) {
      try {
        f(e.next(l));
      } catch (i) {
        u(i);
      }
    }
    function p(l) {
      try {
        f(e.throw(l));
      } catch (i) {
        u(i);
      }
    }
    function f(l) {
      l.done ? o(l.value) : s(l.value).then(c, p);
    }
    f((e = e.apply(t, n || [])).next());
  });
}, g = Ue && Ue.__importDefault || function(t) {
  return t && t.__esModule ? t : { default: t };
};
Object.defineProperty(O, "__esModule", { value: true });
const A = g(a), j = g(a), Y = g(rt), Z = g(tt()), q = g(N), ee = J, te = g(T), x = q.default("https-proxy-agent:agent");
class oe extends ee.Agent {
  constructor(n) {
    let r;
    if (typeof n == "string" ? r = Y.default.parse(n) : r = n, !r)
      throw new Error("an HTTP(S) proxy server `host` and `port` must be specified!");
    x("creating new HttpsProxyAgent instance: %o", r), super(r);
    const e = Object.assign({}, r);
    this.secureProxy = r.secureProxy || se(e.protocol), e.host = e.hostname || e.host, typeof e.port == "string" && (e.port = parseInt(e.port, 10)), !e.port && e.host && (e.port = this.secureProxy ? 443 : 80), this.secureProxy && !("ALPNProtocols" in e) && (e.ALPNProtocols = ["http 1.1"]), e.host && e.path && (delete e.path, delete e.pathname), this.proxy = e;
  }
  /**
   * Called when the node-core HTTP client library is creating a
   * new HTTP request.
   *
   * @api protected
   */
  callback(n, r) {
    return X(this, void 0, void 0, function* () {
      const { proxy: e, secureProxy: s } = this;
      let o;
      s ? (x("Creating `tls.Socket`: %o", e), o = j.default.connect(e)) : (x("Creating `net.Socket`: %o", e), o = A.default.connect(e));
      const u = Object.assign({}, e.headers);
      let p = `CONNECT ${`${r.host}:${r.port}`} HTTP/1.1\r
`;
      e.auth && (u["Proxy-Authorization"] = `Basic ${sc.from(e.auth).toString("base64")}`);
      let { host: f, port: l, secureEndpoint: i } = r;
      ne(l, i) || (f += `:${l}`), u.Host = f, u.Connection = "close";
      for (const m of Object.keys(u))
        p += `${m}: ${u[m]}\r
`;
      const h = te.default(o);
      o.write(`${p}\r
`);
      const { statusCode: a2, buffered: y } = yield h;
      if (a2 === 200) {
        if (n.once("socket", re), r.secureEndpoint) {
          x("Upgrading socket connection to TLS");
          const m = r.servername || r.host;
          return j.default.connect(Object.assign(Object.assign({}, ie(r, "host", "hostname", "path", "port")), {
            socket: o,
            servername: m
          }));
        }
        return o;
      }
      o.destroy();
      const P = new A.default.Socket({ writable: false });
      return P.readable = true, n.once("socket", (m) => {
        x("replaying proxy buffer for failed request"), Z.default(m.listenerCount("data") > 0), m.push(y), m.push(null);
      }), P;
    });
  }
}
O.default = oe;
function re(t) {
  t.resume();
}
function ne(t, n) {
  return !!(!n && t === 80 || n && t === 443);
}
function se(t) {
  return typeof t == "string" ? /^https:?$/i.test(t) : false;
}
function ie(t, ...n) {
  const r = {};
  let e;
  for (e in t)
    n.includes(e) || (r[e] = t[e]);
  return r;
}
var ae = Ue && Ue.__importDefault || function(t) {
  return t && t.__esModule ? t : { default: t };
};
const E = ae(O);
function $(t) {
  return new E.default(t);
}
(function(t) {
  t.HttpsProxyAgent = E.default, t.prototype = E.default.prototype;
})($ || ($ = {}));
var M = $;
const ue = /* @__PURE__ */ fl(M), he = /* @__PURE__ */ I({
  __proto__: null,
  default: ue
}, [M]);
export {
  he as i
};
