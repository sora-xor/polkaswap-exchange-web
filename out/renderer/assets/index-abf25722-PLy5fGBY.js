import { s as sc, f as fl } from "./CedeStore-DfpiZiOO.js";
import { a as a$1 } from "./empty-73bf2089-BEzbM0NJ.js";
import { t as tt } from "./assert-990dca8c-PQWgsRh1.js";
import { a } from "./index-00b95fd1-BPN0IPof.js";
import "./index-7d1bf759-DyVxwjav.js";
import "./url-6cb53b95-DWjpptWm.js";
import "./index-8f43ecdf-vRKU5WRJ.js";
import "./index-73GArslZ.js";
var I = tt();
const S = /* @__PURE__ */ fl(I);
function N(t) {
  return new Promise((n, e) => {
    let r = 0;
    const a2 = [];
    function o() {
      const i = t.read();
      i ? d(i) : t.once("readable", o);
    }
    function c() {
      t.removeListener("end", p), t.removeListener("error", m), t.removeListener("close", h), t.removeListener("readable", o);
    }
    function h(i) {
    }
    function p() {
    }
    function m(i) {
      c(), e(i);
    }
    function d(i) {
      a2.push(i), r += i.length;
      const f = sc.concat(a2, r);
      if (f.indexOf(`\r
\r
`) === -1) {
        o();
        return;
      }
      const C = f.toString("ascii").split(`\r
`), $ = C.shift();
      if (!$)
        throw new Error("No header received");
      const g = $.split(" "), L = +g[1], b = g.slice(2).join(" "), y = {};
      for (const l of C) {
        if (!l)
          continue;
        const P = l.indexOf(":");
        if (P === -1)
          throw new Error(`Invalid header: "${l}"`);
        const v = l.slice(0, P).toLowerCase(), w = l.slice(P + 1).trimStart(), x = y[v];
        typeof x == "string" ? y[v] = [x, w] : Array.isArray(x) ? x.push(w) : y[v] = w;
      }
      c(), n({
        connect: {
          statusCode: L,
          statusText: b,
          headers: y
        },
        buffered: f
      });
    }
    t.on("error", m), t.on("close", h), t.on("end", p), o();
  });
}
class R extends a {
  constructor(n, e) {
    super(e), this.options = { path: void 0 }, this.proxy = typeof n == "string" ? new URL(n) : n, this.proxyHeaders = (e == null ? void 0 : e.headers) ?? {};
    const r = (this.proxy.hostname || this.proxy.host).replace(/^\[|\]$/g, ""), a2 = this.proxy.port ? parseInt(this.proxy.port, 10) : this.secureProxy ? 443 : 80;
    this.connectOpts = {
      // Attempt to negotiate http/1.1 for proxy servers that support http/2
      ALPNProtocols: ["http/1.1"],
      ...e ? A(e, "headers") : null,
      host: r,
      port: a2
    };
  }
  get secureProxy() {
    return U(this.proxy.protocol);
  }
  /**
   * Called when the node-core HTTP client library is creating a
   * new HTTP request.
   */
  async connect(n, e) {
    const { proxy: r, secureProxy: a2 } = this;
    if (!e.host)
      throw new TypeError('No "host" provided');
    let o;
    a2 ? o = a$1.connect(this.connectOpts) : o = a$1.connect(this.connectOpts);
    const c = typeof this.proxyHeaders == "function" ? this.proxyHeaders() : { ...this.proxyHeaders }, h = a$1.isIPv6(e.host) ? `[${e.host}]` : e.host;
    let p = `CONNECT ${h}:${e.port} HTTP/1.1\r
`;
    if (r.username || r.password) {
      const s = `${decodeURIComponent(r.username)}:${decodeURIComponent(r.password)}`;
      c["Proxy-Authorization"] = `Basic ${sc.from(s).toString("base64")}`;
    }
    c.Host = `${h}:${e.port}`, c["Proxy-Connection"] || (c["Proxy-Connection"] = this.keepAlive ? "Keep-Alive" : "close");
    for (const s of Object.keys(c))
      p += `${s}: ${c[s]}\r
`;
    const m = N(o);
    o.write(`${p}\r
`);
    const { connect: d, buffered: i } = await m;
    if (n.emit("proxyConnect", d), this.emit("proxyConnect", d, n), d.statusCode === 200) {
      if (n.once("socket", B), e.secureEndpoint) {
        const s = e.servername || e.host;
        return a$1.connect({
          ...A(e, "host", "path", "port"),
          socket: o,
          servername: a$1.isIP(s) ? void 0 : s
        });
      }
      return o;
    }
    o.destroy();
    const f = new a$1.Socket({ writable: false });
    return f.readable = true, n.once("socket", (s) => {
      S(s.listenerCount("data") > 0), s.push(i), s.push(null);
    }), f;
  }
}
R.protocols = ["http", "https"];
function B(t) {
  t.resume();
}
function U(t) {
  return typeof t == "string" ? /^https:?$/i.test(t) : false;
}
function A(t, ...n) {
  const e = {};
  let r;
  for (r in t)
    n.includes(r) || (e[r] = t[r]);
  return e;
}
export {
  R as HttpsProxyAgent
};
