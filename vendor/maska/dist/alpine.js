'use strict';
Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
const p = require('./maska.js'),
  l = new WeakMap(),
  M = (m) => {
    m.directive('maska', (o, s, t) => {
      const a = o instanceof HTMLInputElement ? o : o.querySelector('input');
      if (a == null || (a == null ? void 0 : a.type) === 'file') return;
      let e = {};
      const f = s.expression !== '' ? t.evaluateLater(s.expression) : () => {};
      t.effect(() => {
        var k;
        if (
          (f((n) => {
            e = typeof n == 'string' ? { mask: n } : { ...n };
          }),
          s.value != null)
        ) {
          const n = (u) => {
            const c = s.modifiers.includes('unmasked')
                ? u.unmasked
                : s.modifiers.includes('completed')
                  ? u.completed
                  : u.masked,
              r = t.Alpine.$data(a);
            s.value in r && (r[s.value] = c);
          };
          e.onMaska = e.onMaska == null ? n : Array.isArray(e.onMaska) ? [...e.onMaska, n] : [e.onMaska, n];
        }
        l.has(a) ? (k = l.get(a)) == null || k.update(e) : l.set(a, new p.MaskInput(a, e));
      });
    }).before('model');
  };
exports.xMaska = M;
