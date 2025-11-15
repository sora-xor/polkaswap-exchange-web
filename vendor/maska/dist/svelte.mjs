import { MaskInput as i } from './maska.mjs';
const s = /* @__PURE__ */ new WeakMap(),
  p = (r, f = {}) => {
    const t = r instanceof HTMLInputElement ? r : r.querySelector('input');
    if (t == null || (t == null ? void 0 : t.type) === 'file') return;
    let n = f;
    return (
      typeof n == 'string' && (n = { mask: n }),
      s.set(t, new i(t, n)),
      {
        update(e) {
          var a;
          (typeof e == 'string' && (e = { mask: e }), (a = s.get(t)) == null || a.update(e));
        },
        destroy() {
          var e;
          (e = s.get(t)) == null || e.destroy();
        },
      }
    );
  };
export { p as maska };
