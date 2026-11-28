import { s as n, M as c } from "./index-ncVkAPXj.mjs";
const r = /* @__PURE__ */ new WeakMap(), k = (e, s) => {
  if (e.arg == null || e.instance == null) return;
  const a = "setup" in e.instance.$.type;
  e.arg in e.instance ? e.instance[e.arg] = s : a && console.warn("Maska: please expose `%s` using defineExpose", e.arg);
}, m = (e, s) => {
  var l;
  const a = e instanceof HTMLInputElement ? e : e.querySelector("input");
  if (a == null || !n.includes(a.type)) return;
  let t = {};
  if (s.value != null && (t = typeof s.value == "string" ? { mask: s.value } : { ...s.value }), s.arg != null) {
    const o = (u) => {
      const p = s.modifiers.unmasked ? u.unmasked : s.modifiers.completed ? u.completed : u.masked;
      k(s, p);
    };
    t.onMaska = t.onMaska == null ? o : Array.isArray(t.onMaska) ? [...t.onMaska, o] : [t.onMaska, o];
  }
  r.has(a) ? (l = r.get(a)) == null || l.update(t) : r.set(a, new c(a, t));
};
export {
  m as vMaska
};
