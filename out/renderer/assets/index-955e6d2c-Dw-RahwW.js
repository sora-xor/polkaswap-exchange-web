import { s as sc, G as GS } from "./CedeStore-DfpiZiOO.js";
import { a as a$1 } from "./empty-73bf2089-BEzbM0NJ.js";
import { a } from "./index-00b95fd1-BPN0IPof.js";
import "./index-7d1bf759-DyVxwjav.js";
import "./url-6cb53b95-DWjpptWm.js";
import "./index-8f43ecdf-vRKU5WRJ.js";
import "./index-73GArslZ.js";
function g(s) {
  return typeof s == "string" ? /^https:?$/i.test(s) : false;
}
class H extends a {
  constructor(t, e) {
    super(e), this.proxy = typeof t == "string" ? new URL(t) : t, this.proxyHeaders = (e == null ? void 0 : e.headers) ?? {};
    const o = (this.proxy.hostname || this.proxy.host).replace(/^\[|\]$/g, ""), a2 = this.proxy.port ? parseInt(this.proxy.port, 10) : this.secureProxy ? 443 : 80;
    this.connectOpts = {
      ...e ? P(e, "headers") : null,
      host: o,
      port: a2
    };
  }
  get secureProxy() {
    return g(this.proxy.protocol);
  }
  async connect(t, e) {
    const { proxy: o } = this, a2 = e.secureEndpoint ? "https:" : "http:", f = t.getHeader("host") || "localhost", l = `${a2}//${f}`, p = new URL(t.path, l);
    e.port !== 80 && (p.port = String(e.port)), t.path = String(p), t._header = null;
    const n = typeof this.proxyHeaders == "function" ? this.proxyHeaders() : { ...this.proxyHeaders };
    if (o.username || o.password) {
      const i = `${decodeURIComponent(o.username)}:${decodeURIComponent(o.password)}`;
      n["Proxy-Authorization"] = `Basic ${sc.from(i).toString("base64")}`;
    }
    n["Proxy-Connection"] || (n["Proxy-Connection"] = this.keepAlive ? "Keep-Alive" : "close");
    for (const i of Object.keys(n)) {
      const u = n[i];
      u && t.setHeader(i, u);
    }
    let r;
    this.secureProxy ? r = a$1.connect(this.connectOpts) : r = a$1.connect(this.connectOpts);
    let c, h;
    return t._implicitHeader(), t.outputData && t.outputData.length > 0 && (c = t.outputData[0].data, h = c.indexOf(`\r
\r
`) + 4, t.outputData[0].data = t._header + c.substring(h)), await GS(r, "connect"), r;
  }
}
H.protocols = ["http", "https"];
function P(s, ...t) {
  const e = {};
  let o;
  for (o in s)
    t.includes(o) || (e[o] = s[o]);
  return e;
}
export {
  H as HttpProxyAgent
};
