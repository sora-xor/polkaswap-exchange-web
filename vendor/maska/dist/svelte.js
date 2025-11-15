'use strict';
Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
const i = require('./maska.js'),
  n = new WeakMap(),
  o = (a, u = {}) => {
    const e = a instanceof HTMLInputElement ? a : a.querySelector('input');
    if (e == null || (e == null ? void 0 : e.type) === 'file') return;
    let s = u;
    return (
      typeof s == 'string' && (s = { mask: s }),
      n.set(e, new i.MaskInput(e, s)),
      {
        update(t) {
          var r;
          (typeof t == 'string' && (t = { mask: t }), (r = n.get(e)) == null || r.update(t));
        },
        destroy() {
          var t;
          (t = n.get(e)) == null || t.destroy();
        },
      }
    );
  };
exports.maska = o;
