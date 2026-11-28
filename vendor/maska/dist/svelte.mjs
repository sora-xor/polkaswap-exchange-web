import { s as u, M as i } from "./index-ncVkAPXj.mjs";
const r = /* @__PURE__ */ new WeakMap(), f = (n, p = {}) => {
  const e = n instanceof HTMLInputElement ? n : n.querySelector("input");
  if (e == null || !u.includes(e.type)) return;
  let s = p;
  return typeof s == "string" && (s = { mask: s }), r.set(e, new i(e, s)), {
    update(t) {
      var a;
      typeof t == "string" && (t = { mask: t }), (a = r.get(e)) == null || a.update(t);
    },
    destroy() {
      var t;
      (t = r.get(e)) == null || t.destroy();
    }
  };
};
export {
  f as maska
};
