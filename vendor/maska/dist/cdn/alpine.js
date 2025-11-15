/*! maska v3.2.0 by Alexander Shabunevich | Released under the MIT license */
(function (u, p) {
  typeof exports == 'object' && typeof module < 'u'
    ? p(exports)
    : typeof define == 'function' && define.amd
      ? define(['exports'], p)
      : ((u = typeof globalThis < 'u' ? globalThis : u || self), p((u.Maska = {})));
})(this, function (u) {
  'use strict';
  var V = Object.defineProperty;
  var $ = (u, p, M) => (p in u ? V(u, p, { enumerable: !0, configurable: !0, writable: !0, value: M }) : (u[p] = M));
  var E = (u, p, M) => $(u, typeof p != 'symbol' ? p + '' : p, M);
  const p = { '#': { pattern: /[0-9]/ }, '@': { pattern: /[a-zA-Z]/ }, '*': { pattern: /[a-zA-Z0-9]/ } },
    M = (a, e, s) =>
      a
        .replaceAll(e, '')
        .replace(s, '.')
        .replace('..', '.')
        .replace(/[^.\d]/g, ''),
    I = (a, e, s) => {
      var t;
      return new Intl.NumberFormat(((t = s.number) == null ? void 0 : t.locale) ?? 'en', {
        minimumFractionDigits: a,
        maximumFractionDigits: e,
        roundingMode: 'trunc',
      });
    },
    L = (a, e = !0, s) => {
      var y, v, A, g;
      const t = ((y = s.number) == null ? void 0 : y.unsigned) !== !0 && a.startsWith('-') ? '-' : '',
        n = ((v = s.number) == null ? void 0 : v.fraction) ?? 0;
      let o = I(0, n, s);
      const m = o.formatToParts(1000.12),
        h = ((A = m.find((i) => i.type === 'group')) == null ? void 0 : A.value) ?? ' ',
        l = ((g = m.find((i) => i.type === 'decimal')) == null ? void 0 : g.value) ?? '.',
        r = M(a, h, l);
      if (Number.isNaN(parseFloat(r))) return t;
      const f = r.split('.');
      if (f[1] != null && f[1].length >= 1) {
        const i = f[1].length <= n ? f[1].length : n;
        o = I(i, n, s);
      }
      let c = o.format(parseFloat(r));
      return (e ? n > 0 && r.endsWith('.') && !r.slice(0, -1).includes('.') && (c += l) : (c = M(c, h, l)), t + c);
    },
    S = (a) => JSON.parse(a.replaceAll("'", '"')),
    W = (a, e = {}) => {
      const s = { ...e };
      (a.dataset.maska != null && a.dataset.maska !== '' && (s.mask = O(a.dataset.maska)),
        a.dataset.maskaEager != null && (s.eager = w(a.dataset.maskaEager)),
        a.dataset.maskaReversed != null && (s.reversed = w(a.dataset.maskaReversed)),
        a.dataset.maskaTokensReplace != null && (s.tokensReplace = w(a.dataset.maskaTokensReplace)),
        a.dataset.maskaTokens != null && (s.tokens = j(a.dataset.maskaTokens)));
      const t = {};
      return (
        a.dataset.maskaNumberLocale != null && (t.locale = a.dataset.maskaNumberLocale),
        a.dataset.maskaNumberFraction != null && (t.fraction = parseInt(a.dataset.maskaNumberFraction)),
        a.dataset.maskaNumberUnsigned != null && (t.unsigned = w(a.dataset.maskaNumberUnsigned)),
        (a.dataset.maskaNumber != null || Object.values(t).length > 0) && (s.number = t),
        s
      );
    },
    w = (a) => (a !== '' ? !!JSON.parse(a) : !0),
    O = (a) => (a.startsWith('[') && a.endsWith(']') ? S(a) : a),
    j = (a) => {
      if (a.startsWith('{') && a.endsWith('}')) return S(a);
      const e = {};
      return (
        a.split('|').forEach((s) => {
          const t = s.split(':');
          e[t[0]] = {
            pattern: T() ? new RegExp(t[1], 'u') : new RegExp(t[1]),
            optional: t[2] === 'optional',
            multiple: t[2] === 'multiple',
            repeated: t[2] === 'repeated',
          };
        }),
        e
      );
    },
    T = () => {
      try {
        return (new RegExp('\\p{L}', 'u'), !0);
      } catch {
        return !1;
      }
    };
  class P {
    constructor(e = {}) {
      E(this, 'opts', {});
      E(this, 'memo', new Map());
      const s = { ...e };
      if (s.tokens != null) {
        s.tokens = s.tokensReplace ? { ...s.tokens } : { ...p, ...s.tokens };
        for (const t of Object.values(s.tokens))
          typeof t.pattern == 'string' && (t.pattern = T() ? new RegExp(t.pattern, 'u') : new RegExp(t.pattern));
      } else s.tokens = p;
      (Array.isArray(s.mask) &&
        (s.mask.length > 1 ? (s.mask = [...s.mask].sort((t, n) => t.length - n.length)) : (s.mask = s.mask[0] ?? '')),
        s.mask === '' && (s.mask = null),
        (this.opts = s));
    }
    masked(e) {
      return this.process(String(e), this.findMask(String(e)));
    }
    unmasked(e) {
      return this.process(String(e), this.findMask(String(e)), !1);
    }
    isEager() {
      return this.opts.eager === !0;
    }
    isReversed() {
      return this.opts.reversed === !0;
    }
    completed(e) {
      const s = this.findMask(String(e));
      if (this.opts.mask == null || s == null) return !1;
      const t = this.process(String(e), s).length;
      return typeof this.opts.mask == 'string' ? t >= this.opts.mask.length : t >= s.length;
    }
    findMask(e) {
      const s = this.opts.mask;
      if (s == null) return null;
      if (typeof s == 'string') return s;
      if (typeof s == 'function') return s(e);
      const t = this.process(e, s.slice(-1).pop() ?? '', !1);
      return s.find((n) => this.process(e, n, !1).length >= t.length) ?? '';
    }
    escapeMask(e) {
      const s = [],
        t = [];
      return (
        e.split('').forEach((n, o) => {
          n === '!' && e[o - 1] !== '!' ? t.push(o - t.length) : s.push(n);
        }),
        { mask: s.join(''), escaped: t }
      );
    }
    process(e, s, t = !0) {
      if (this.opts.number != null) return L(e, t, this.opts);
      if (s == null) return e;
      const n = `v=${e},mr=${s},m=${t ? 1 : 0}`;
      if (this.memo.has(n)) return this.memo.get(n);
      const { mask: o, escaped: m } = this.escapeMask(s),
        h = [],
        l = this.opts.tokens != null ? this.opts.tokens : {},
        r = this.isReversed() ? -1 : 1,
        f = this.isReversed() ? 'unshift' : 'push',
        c = this.isReversed() ? 0 : o.length - 1,
        y = this.isReversed() ? () => i > -1 && d > -1 : () => i < o.length && d < e.length,
        v = (b) => (!this.isReversed() && b <= c) || (this.isReversed() && b >= c);
      let A,
        g = -1,
        i = this.isReversed() ? o.length - 1 : 0,
        d = this.isReversed() ? e.length - 1 : 0,
        C = !1;
      for (; y(); ) {
        const b = o.charAt(i),
          k = l[b],
          R = (k == null ? void 0 : k.transform) != null ? k.transform(e.charAt(d)) : e.charAt(d);
        if (
          (!m.includes(i) && k != null
            ? (R.match(k.pattern) != null
                ? (h[f](R),
                  k.repeated
                    ? (g === -1 ? (g = i) : i === c && i !== g && (i = g - r), c === g && (i -= r))
                    : k.multiple && ((C = !0), (i -= r)),
                  (i += r))
                : k.multiple
                  ? C && ((i += r), (d -= r), (C = !1))
                  : R === A
                    ? (A = void 0)
                    : k.optional && ((i += r), (d -= r)),
              (d += r))
            : (t && !this.isEager() && h[f](b),
              R === b && !this.isEager() ? (d += r) : (A = b),
              this.isEager() || (i += r)),
          this.isEager())
        )
          for (; v(i) && (l[o.charAt(i)] == null || m.includes(i)); ) {
            if (t) {
              if ((h[f](o.charAt(i)), e.charAt(d) === o.charAt(i))) {
                ((i += r), (d += r));
                continue;
              }
            } else o.charAt(i) === e.charAt(d) && (d += r);
            i += r;
          }
      }
      return (this.memo.set(n, h.join('')), this.memo.get(n));
    }
  }
  class x {
    constructor(e, s = {}) {
      E(this, 'items', new Map());
      E(this, 'eventAbortController');
      E(this, 'onInput', (e) => {
        if (e instanceof CustomEvent && e.type === 'input' && !e.isTrusted && !e.bubbles) return;
        const s = e.target,
          t = this.items.get(s);
        if (t === void 0) return;
        const n = 'inputType' in e && e.inputType.startsWith('delete'),
          o = t.isEager(),
          m = n && o && t.unmasked(s.value) === '' ? '' : s.value;
        this.fixCursor(s, n, () => this.setValue(s, m));
      });
      ((this.options = s), (this.eventAbortController = new AbortController()), this.init(this.getInputs(e)));
    }
    update(e = {}) {
      ((this.options = { ...e }), this.init(Array.from(this.items.keys())));
    }
    updateValue(e) {
      var s;
      e.value !== '' &&
        e.value !== ((s = this.processInput(e)) == null ? void 0 : s.masked) &&
        this.setValue(e, e.value);
    }
    destroy() {
      (this.eventAbortController.abort(), this.items.clear());
    }
    init(e) {
      const s = this.getOptions(this.options);
      for (const t of e) {
        if (!this.items.has(t)) {
          const { signal: o } = this.eventAbortController;
          t.addEventListener('input', this.onInput, { capture: !0, signal: o });
        }
        const n = new P(W(t, s));
        (this.items.set(t, n),
          queueMicrotask(() => this.updateValue(t)),
          t.selectionStart === null &&
            n.isEager() &&
            console.warn('Maska: input of `%s` type is not supported', t.type));
      }
    }
    getInputs(e) {
      return typeof e == 'string' ? Array.from(document.querySelectorAll(e)) : 'length' in e ? Array.from(e) : [e];
    }
    getOptions(e) {
      const { onMaska: s, preProcess: t, postProcess: n, ...o } = e;
      return o;
    }
    fixCursor(e, s, t) {
      var y, v;
      const n = e.selectionStart,
        o = e.value;
      if ((t(), n === null || (n === o.length && !s))) return;
      const m = e.value,
        h = o.slice(0, n),
        l = m.slice(0, n),
        r = (y = this.processInput(e, h)) == null ? void 0 : y.unmasked,
        f = (v = this.processInput(e, l)) == null ? void 0 : v.unmasked;
      if (r === void 0 || f === void 0) return;
      let c = n;
      (h !== l && (c += s ? m.length - o.length : r.length - f.length), e.setSelectionRange(c, c));
    }
    setValue(e, s) {
      const t = this.processInput(e, s);
      t !== void 0 &&
        ((e.value = t.masked),
        this.options.onMaska != null &&
          (Array.isArray(this.options.onMaska) ? this.options.onMaska.forEach((n) => n(t)) : this.options.onMaska(t)),
        e.dispatchEvent(new CustomEvent('maska', { detail: t })),
        e.dispatchEvent(new CustomEvent('input', { detail: t.masked })));
    }
    processInput(e, s) {
      const t = this.items.get(e);
      if (t === void 0) return;
      let n = s ?? e.value;
      this.options.preProcess != null && (n = this.options.preProcess(n));
      let o = t.masked(n);
      return (
        this.options.postProcess != null && (o = this.options.postProcess(o)),
        { masked: o, unmasked: t.unmasked(n), completed: t.completed(n) }
      );
    }
  }
  const N = new WeakMap(),
    F = (a) => {
      a.directive('maska', (e, s, t) => {
        const n = e instanceof HTMLInputElement ? e : e.querySelector('input');
        if (n == null || (n == null ? void 0 : n.type) === 'file') return;
        let o = {};
        const m = s.expression !== '' ? t.evaluateLater(s.expression) : () => {};
        t.effect(() => {
          var h;
          if (
            (m((l) => {
              o = typeof l == 'string' ? { mask: l } : { ...l };
            }),
            s.value != null)
          ) {
            const l = (r) => {
              const f = s.modifiers.includes('unmasked')
                  ? r.unmasked
                  : s.modifiers.includes('completed')
                    ? r.completed
                    : r.masked,
                c = t.Alpine.$data(n);
              s.value in c && (c[s.value] = f);
            };
            o.onMaska = o.onMaska == null ? l : Array.isArray(o.onMaska) ? [...o.onMaska, l] : [o.onMaska, l];
          }
          N.has(n) ? (h = N.get(n)) == null || h.update(o) : N.set(n, new x(n, o));
        });
      }).before('model');
    };
  (document.addEventListener('alpine:init', () => {
    window.Alpine.plugin(F);
  }),
    (u.Mask = P),
    (u.MaskInput = x),
    (u.tokens = p),
    (u.xMaska = F),
    Object.defineProperty(u, Symbol.toStringTag, { value: 'Module' }));
});
