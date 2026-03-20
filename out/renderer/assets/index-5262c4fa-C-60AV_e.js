import { U as Ue, s as sc, S as Ss } from "./CedeStore-DfpiZiOO.js";
import { a } from "./empty-73bf2089-BEzbM0NJ.js";
import { N as N$1 } from "./browser-8396eed5-IB_ubhyz.js";
import { s as Ie } from "./index-7d1bf759-DyVxwjav.js";
import { a as c } from "./index-8f43ecdf-vRKU5WRJ.js";
import { r as rt } from "./url-6cb53b95-DWjpptWm.js";
import "./index-73GArslZ.js";
function E(e, t) {
  for (var r = 0; r < t.length; r++) {
    const n = t[r];
    if (typeof n != "string" && !Array.isArray(n)) {
      for (const s in n)
        if (s !== "default" && !(s in e)) {
          const u = Object.getOwnPropertyDescriptor(n, s);
          u && Object.defineProperty(e, s, u.get ? u : {
            enumerable: true,
            get: () => n[s]
          });
        }
    }
  }
  return Object.freeze(Object.defineProperty(e, Symbol.toStringTag, { value: "Module" }));
}
var _ = {}, j = {}, d = {}, R = Ue && Ue.__createBinding || (Object.create ? function(e, t, r, n) {
  n === void 0 && (n = r);
  var s = Object.getOwnPropertyDescriptor(t, r);
  (!s || ("get" in s ? !t.__esModule : s.writable || s.configurable)) && (s = { enumerable: true, get: function() {
    return t[r];
  } }), Object.defineProperty(e, n, s);
} : function(e, t, r, n) {
  n === void 0 && (n = r), e[n] = t[r];
}), $ = Ue && Ue.__setModuleDefault || (Object.create ? function(e, t) {
  Object.defineProperty(e, "default", { enumerable: true, value: t });
} : function(e, t) {
  e.default = t;
}), x = Ue && Ue.__importStar || function(e) {
  if (e && e.__esModule)
    return e;
  var t = {};
  if (e != null)
    for (var r in e)
      r !== "default" && Object.prototype.hasOwnProperty.call(e, r) && R(t, e, r);
  return $(t, e), t;
};
Object.defineProperty(d, "__esModule", { value: true });
d.req = d.json = d.toBuffer = void 0;
const C = x(Ie), I = x(c);
async function w(e) {
  let t = 0;
  const r = [];
  for await (const n of e)
    t += n.length, r.push(n);
  return sc.concat(r, t);
}
d.toBuffer = w;
async function N(e) {
  const r = (await w(e)).toString("utf8");
  try {
    return JSON.parse(r);
  } catch (n) {
    const s = n;
    throw s.message += ` (input: ${r})`, s;
  }
}
d.json = N;
function T(e, t = {}) {
  const n = ((typeof e == "string" ? e : e.href).startsWith("https:") ? I : C).request(e, t), s = new Promise((u, f) => {
    n.once("response", u).once("error", f).end();
  });
  return n.then = s.then.bind(s), n;
}
d.req = T;
(function(e) {
  var t = Ue && Ue.__createBinding || (Object.create ? function(i, o, c2, p) {
    p === void 0 && (p = c2);
    var l = Object.getOwnPropertyDescriptor(o, c2);
    (!l || ("get" in l ? !o.__esModule : l.writable || l.configurable)) && (l = { enumerable: true, get: function() {
      return o[c2];
    } }), Object.defineProperty(i, p, l);
  } : function(i, o, c2, p) {
    p === void 0 && (p = c2), i[p] = o[c2];
  }), r = Ue && Ue.__setModuleDefault || (Object.create ? function(i, o) {
    Object.defineProperty(i, "default", { enumerable: true, value: o });
  } : function(i, o) {
    i.default = o;
  }), n = Ue && Ue.__importStar || function(i) {
    if (i && i.__esModule)
      return i;
    var o = {};
    if (i != null)
      for (var c2 in i)
        c2 !== "default" && Object.prototype.hasOwnProperty.call(i, c2) && t(o, i, c2);
    return r(o, i), o;
  }, s = Ue && Ue.__exportStar || function(i, o) {
    for (var c2 in i)
      c2 !== "default" && !Object.prototype.hasOwnProperty.call(o, c2) && t(o, i, c2);
  };
  Object.defineProperty(e, "__esModule", { value: true }), e.Agent = void 0;
  const u = n(Ie);
  s(d, e);
  const f = /* @__PURE__ */ Symbol("AgentBaseInternalState");
  class g extends u.Agent {
    constructor(o) {
      super(o), this[f] = {};
    }
    /**
     * Determine whether this is an `http` or `https` request.
     */
    isSecureEndpoint(o) {
      if (o) {
        if (typeof o.secureEndpoint == "boolean")
          return o.secureEndpoint;
        if (typeof o.protocol == "string")
          return o.protocol === "https:";
      }
      const { stack: c2 } = new Error();
      return typeof c2 != "string" ? false : c2.split(`
`).some((p) => p.indexOf("(https.js:") !== -1 || p.indexOf("node:https:") !== -1);
    }
    createSocket(o, c2, p) {
      const l = {
        ...c2,
        secureEndpoint: this.isSecureEndpoint(c2)
      };
      Promise.resolve().then(() => this.connect(o, l)).then((y) => {
        if (y instanceof u.Agent)
          return y.addRequest(o, l);
        this[f].currentSocket = y, super.createSocket(o, c2, p);
      }, p);
    }
    createConnection() {
      const o = this[f].currentSocket;
      if (this[f].currentSocket = void 0, !o)
        throw new Error("No socket was returned in the `connect()` function");
      return o;
    }
    get defaultPort() {
      return this[f].defaultPort ?? (this.protocol === "https:" ? 443 : 80);
    }
    set defaultPort(o) {
      this[f] && (this[f].defaultPort = o);
    }
    get protocol() {
      return this[f].protocol ?? (this.isSecureEndpoint() ? "https:" : "http:");
    }
    set protocol(o) {
      this[f] && (this[f].protocol = o);
    }
  }
  e.Agent = g;
})(j);
var U = Ue && Ue.__createBinding || (Object.create ? function(e, t, r, n) {
  n === void 0 && (n = r);
  var s = Object.getOwnPropertyDescriptor(t, r);
  (!s || ("get" in s ? !t.__esModule : s.writable || s.configurable)) && (s = { enumerable: true, get: function() {
    return t[r];
  } }), Object.defineProperty(e, n, s);
} : function(e, t, r, n) {
  n === void 0 && (n = r), e[n] = t[r];
}), L = Ue && Ue.__setModuleDefault || (Object.create ? function(e, t) {
  Object.defineProperty(e, "default", { enumerable: true, value: t });
} : function(e, t) {
  e.default = t;
}), S = Ue && Ue.__importStar || function(e) {
  if (e && e.__esModule)
    return e;
  var t = {};
  if (e != null)
    for (var r in e)
      r !== "default" && Object.prototype.hasOwnProperty.call(e, r) && U(t, e, r);
  return L(t, e), t;
}, z = Ue && Ue.__importDefault || function(e) {
  return e && e.__esModule ? e : { default: e };
};
Object.defineProperty(_, "__esModule", { value: true });
var A = _.HttpProxyAgent = void 0;
const G = S(a), J = S(a), K = z(N$1), W = Ss, F = j, b = rt, h = (0, K.default)("http-proxy-agent");
class m extends F.Agent {
  constructor(t, r) {
    super(r), this.proxy = typeof t == "string" ? new b.URL(t) : t, this.proxyHeaders = (r == null ? void 0 : r.headers) ?? {}, h("Creating new HttpProxyAgent instance: %o", this.proxy.href);
    const n = (this.proxy.hostname || this.proxy.host).replace(/^\[|\]$/g, ""), s = this.proxy.port ? parseInt(this.proxy.port, 10) : this.proxy.protocol === "https:" ? 443 : 80;
    this.connectOpts = {
      ...r ? Q(r, "headers") : null,
      host: n,
      port: s
    };
  }
  addRequest(t, r) {
    t._header = null, this.setRequestProps(t, r), super.addRequest(t, r);
  }
  setRequestProps(t, r) {
    const { proxy: n } = this, s = r.secureEndpoint ? "https:" : "http:", u = t.getHeader("host") || "localhost", f = `${s}//${u}`, g = new b.URL(t.path, f);
    r.port !== 80 && (g.port = String(r.port)), t.path = String(g);
    const i = typeof this.proxyHeaders == "function" ? this.proxyHeaders() : { ...this.proxyHeaders };
    if (n.username || n.password) {
      const o = `${decodeURIComponent(n.username)}:${decodeURIComponent(n.password)}`;
      i["Proxy-Authorization"] = `Basic ${sc.from(o).toString("base64")}`;
    }
    i["Proxy-Connection"] || (i["Proxy-Connection"] = this.keepAlive ? "Keep-Alive" : "close");
    for (const o of Object.keys(i)) {
      const c2 = i[o];
      c2 && t.setHeader(o, c2);
    }
  }
  async connect(t, r) {
    t._header = null, t.path.includes("://") || this.setRequestProps(t, r);
    let n, s;
    h("Regenerating stored HTTP header string for request"), t._implicitHeader(), t.outputData && t.outputData.length > 0 && (h("Patching connection write() output buffer with updated header"), n = t.outputData[0].data, s = n.indexOf(`\r
\r
`) + 4, t.outputData[0].data = t._header + n.substring(s), h("Output buffer: %o", t.outputData[0].data));
    let u;
    return this.proxy.protocol === "https:" ? (h("Creating `tls.Socket`: %o", this.connectOpts), u = J.connect(this.connectOpts)) : (h("Creating `net.Socket`: %o", this.connectOpts), u = G.connect(this.connectOpts)), await (0, W.once)(u, "connect"), u;
  }
}
m.protocols = ["http", "https"];
A = _.HttpProxyAgent = m;
function Q(e, ...t) {
  const r = {};
  let n;
  for (n in e)
    t.includes(n) || (r[n] = e[n]);
  return r;
}
const tt = /* @__PURE__ */ E({
  __proto__: null,
  get HttpProxyAgent() {
    return A;
  },
  default: _
}, [_]);
export {
  tt as i
};
