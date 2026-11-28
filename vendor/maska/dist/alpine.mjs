import { s as c, M } from "./index-ncVkAPXj.mjs";
const p = /* @__PURE__ */ new WeakMap(), y = (m) => {
  m.directive("maska", (o, s, t) => {
    const n = o instanceof HTMLInputElement ? o : o.querySelector("input");
    if (n == null || !c.includes(n.type)) return;
    let a = {};
    const r = s.expression !== "" ? t.evaluateLater(s.expression) : () => {
    };
    t.effect(() => {
      var l;
      if (r((e) => {
        a = typeof e == "string" ? { mask: e } : { ...e };
      }), s.value != null) {
        const e = (u) => {
          const f = s.modifiers.includes("unmasked") ? u.unmasked : s.modifiers.includes("completed") ? u.completed : u.masked, k = t.Alpine.$data(n);
          s.value in k && (k[s.value] = f);
        };
        a.onMaska = a.onMaska == null ? e : Array.isArray(a.onMaska) ? [...a.onMaska, e] : [a.onMaska, e];
      }
      p.has(n) ? (l = p.get(n)) == null || l.update(a) : p.set(n, new M(n, a));
    });
  }).before("model");
};
export {
  y as xMaska
};
