import { s as Ie } from "./index-7d1bf759-DyVxwjav.js";
import "./CedeStore-DfpiZiOO.js";
import "./index-8f43ecdf-vRKU5WRJ.js";
function f() {
  const { stack: r } = new Error();
  return typeof r != "string" ? false : r.split(`
`).some((t) => t.indexOf("(https.js:") !== -1 || t.indexOf("node:https:") !== -1);
}
const e = /* @__PURE__ */ Symbol("AgentBaseInternalState");
class a extends Ie.Agent {
  constructor(t) {
    super(t), this[e] = {};
  }
  createSocket(t, n, c) {
    let o = typeof n.secureEndpoint == "boolean" ? n.secureEndpoint : void 0;
    typeof o > "u" && typeof n.protocol == "string" && (o = n.protocol === "https:"), typeof o > "u" && (o = f());
    const i = { ...n, secureEndpoint: o };
    Promise.resolve().then(() => this.connect(t, i)).then((s) => {
      if (s instanceof Ie.Agent)
        return s.addRequest(t, i);
      this[e].currentSocket = s, super.createSocket(t, n, c);
    }, c);
  }
  createConnection() {
    const t = this[e].currentSocket;
    if (this[e].currentSocket = void 0, !t)
      throw new Error("No socket was returned in the `connect()` function");
    return t;
  }
  get defaultPort() {
    return this[e].defaultPort ?? (this.protocol === "https:" ? 443 : 80);
  }
  set defaultPort(t) {
    this[e] && (this[e].defaultPort = t);
  }
  get protocol() {
    return this[e].protocol ?? (f() ? "https:" : "http:");
  }
  set protocol(t) {
    this[e] && (this[e].protocol = t);
  }
}
export {
  a
};
