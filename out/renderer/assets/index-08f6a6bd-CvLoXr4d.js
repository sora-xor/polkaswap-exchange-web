import { f as fl, S as Ss, j as jt } from "./CedeStore-DfpiZiOO.js";
import { r as dt, b as ut, c as te, _ as ct, d as $t, e as ke, p as er } from "./index-7d1bf759-DyVxwjav.js";
var S = n, s = Ss.EventEmitter, y = jt;
y(n, s);
n.Readable = dt();
n.Writable = ut();
n.Duplex = te();
n.Transform = ct;
n.PassThrough = $t;
n.finished = ke;
n.pipeline = er;
n.Stream = n;
function n() {
  s.call(this);
}
n.prototype.pipe = function(r, m) {
  var e = this;
  function f(t) {
    r.writable && r.write(t) === false && e.pause && e.pause();
  }
  e.on("data", f);
  function u() {
    e.readable && e.resume && e.resume();
  }
  r.on("drain", u), !r._isStdio && (!m || m.end !== false) && (e.on("end", l), e.on("close", p));
  var i = false;
  function l() {
    i || (i = true, r.end());
  }
  function p() {
    i || (i = true, typeof r.destroy == "function" && r.destroy());
  }
  function a(t) {
    if (o(), s.listenerCount(this, "error") === 0)
      throw t;
  }
  e.on("error", a), r.on("error", a);
  function o() {
    e.removeListener("data", f), r.removeListener("drain", u), e.removeListener("end", l), e.removeListener("close", p), e.removeListener("error", a), r.removeListener("error", a), e.removeListener("end", o), e.removeListener("close", o), r.removeListener("close", o);
  }
  return e.on("end", o), e.on("close", o), r.on("close", o), r.emit("pipe", e), r;
};
const C = /* @__PURE__ */ fl(S);
export {
  C,
  S
};
