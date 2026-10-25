import { MaskInput as c } from './maska.mjs';
const u = /* @__PURE__ */ new WeakMap(),
  d = (f) => {
    f.directive('maska', (o, e, t) => {
      const a = o instanceof HTMLInputElement ? o : o.querySelector('input');
      if (a == null || (a == null ? void 0 : a.type) === 'file') return;
      let s = {};
      const p = e.expression !== '' ? t.evaluateLater(e.expression) : () => {};
      t.effect(() => {
        var k;
        if (
          (p((n) => {
            s = typeof n == 'string' ? { mask: n } : { ...n };
          }),
          e.value != null)
        ) {
          const n = (l) => {
            const r = e.modifiers.includes('unmasked')
                ? l.unmasked
                : e.modifiers.includes('completed')
                  ? l.completed
                  : l.masked,
              m = t.Alpine.$data(a);
            e.value in m && (m[e.value] = r);
          };
          s.onMaska = s.onMaska == null ? n : Array.isArray(s.onMaska) ? [...s.onMaska, n] : [s.onMaska, n];
        }
        u.has(a) ? (k = u.get(a)) == null || k.update(s) : u.set(a, new c(a, s));
      });
    }).before('model');
  };
export { d as xMaska };
