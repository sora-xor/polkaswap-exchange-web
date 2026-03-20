import { f as fl } from "./CedeStore-DfpiZiOO.js";
import { s as Ie } from "./index-7d1bf759-DyVxwjav.js";
import { r as rt } from "./url-6cb53b95-DWjpptWm.js";
import "./index-73GArslZ.js";
function g(s, e) {
  for (var f = 0; f < e.length; f++) {
    const r = e[f];
    if (typeof r != "string" && !Array.isArray(r)) {
      for (const o in r)
        if (o !== "default" && !(o in s)) {
          const n = Object.getOwnPropertyDescriptor(r, o);
          n && Object.defineProperty(s, o, n.get ? n : {
            enumerable: true,
            get: () => r[o]
          });
        }
    }
  }
  return Object.freeze(Object.defineProperty(s, Symbol.toStringTag, { value: "Module" }));
}
var p = { exports: {} };
(function(s) {
  var e = Ie, f = rt, r = s.exports;
  for (var o in e)
    e.hasOwnProperty(o) && (r[o] = e[o]);
  r.request = function(t, i) {
    return t = n(t), e.request.call(this, t, i);
  }, r.get = function(t, i) {
    return t = n(t), e.get.call(this, t, i);
  };
  function n(t) {
    if (typeof t == "string" && (t = f.parse(t)), t.protocol || (t.protocol = "https:"), t.protocol !== "https:")
      throw new Error('Protocol "' + t.protocol + '" not supported. Expected "https:"');
    return t;
  }
})(p);
var c = p.exports;
const a = /* @__PURE__ */ fl(c), x = /* @__PURE__ */ g({
  __proto__: null,
  default: a
}, [c]);
export {
  c as a,
  a as b,
  x as h
};
