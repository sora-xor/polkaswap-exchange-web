/*! maska v3.2.0 by Alexander Shabunevich | Released under the MIT license */
(function (l, c) {
  typeof exports == 'object' && typeof module < 'u'
    ? c(exports)
    : typeof define == 'function' && define.amd
      ? define(['exports'], c)
      : ((l = typeof globalThis < 'u' ? globalThis : l || self), c((l.Maska = {})));
})(this, function (l) {
  'use strict';
  var $ = Object.defineProperty;
  var q = (l, c, v) => (c in l ? $(l, c, { enumerable: !0, configurable: !0, writable: !0, value: v }) : (l[c] = v));
  var w = (l, c, v) => q(l, typeof c != 'symbol' ? c + '' : c, v);
  const c = { '#': { pattern: /[0-9]/ }, '@': { pattern: /[a-zA-Z]/ }, '*': { pattern: /[a-zA-Z0-9]/ } },
    v = (n, e, s) =>
      n
        .replaceAll(e, '')
        .replace(s, '.')
        .replace('..', '.')
        .replace(/[^.\d]/g, ''),
    I = (n, e, s) => {
      var t;
      return new Intl.NumberFormat(((t = s.number) == null ? void 0 : t.locale) ?? 'en', {
        minimumFractionDigits: n,
        maximumFractionDigits: e,
        roundingMode: 'trunc',
      });
    },
    F = (n, e = !0, s) => {
      var M, y, E, g;
      const t = ((M = s.number) == null ? void 0 : M.unsigned) !== !0 && n.startsWith('-') ? '-' : '',
        a = ((y = s.number) == null ? void 0 : y.fraction) ?? 0;
      let r = I(0, a, s);
      const u = r.formatToParts(1000.12),
        h = ((E = u.find((o) => o.type === 'group')) == null ? void 0 : E.value) ?? ' ',
        d = ((g = u.find((o) => o.type === 'decimal')) == null ? void 0 : g.value) ?? '.',
        i = v(n, h, d);
      if (Number.isNaN(parseFloat(i))) return t;
      const m = i.split('.');
      if (m[1] != null && m[1].length >= 1) {
        const o = m[1].length <= a ? m[1].length : a;
        r = I(o, a, s);
      }
      let p = r.format(parseFloat(i));
      return (e ? a > 0 && i.endsWith('.') && !i.slice(0, -1).includes('.') && (p += d) : (p = v(p, h, d)), t + p);
    },
    S = (n) => JSON.parse(n.replaceAll("'", '"')),
    W = (n, e = {}) => {
      const s = { ...e };
      (n.dataset.maska != null && n.dataset.maska !== '' && (s.mask = O(n.dataset.maska)),
        n.dataset.maskaEager != null && (s.eager = R(n.dataset.maskaEager)),
        n.dataset.maskaReversed != null && (s.reversed = R(n.dataset.maskaReversed)),
        n.dataset.maskaTokensReplace != null && (s.tokensReplace = R(n.dataset.maskaTokensReplace)),
        n.dataset.maskaTokens != null && (s.tokens = j(n.dataset.maskaTokens)));
      const t = {};
      return (
        n.dataset.maskaNumberLocale != null && (t.locale = n.dataset.maskaNumberLocale),
        n.dataset.maskaNumberFraction != null && (t.fraction = parseInt(n.dataset.maskaNumberFraction)),
        n.dataset.maskaNumberUnsigned != null && (t.unsigned = R(n.dataset.maskaNumberUnsigned)),
        (n.dataset.maskaNumber != null || Object.values(t).length > 0) && (s.number = t),
        s
      );
    },
    R = (n) => (n !== '' ? !!JSON.parse(n) : !0),
    O = (n) => (n.startsWith('[') && n.endsWith(']') ? S(n) : n),
    j = (n) => {
      if (n.startsWith('{') && n.endsWith('}')) return S(n);
      const e = {};
      return (
        n.split('|').forEach((s) => {
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
      w(this, 'opts', {});
      w(this, 'memo', new Map());
      const s = { ...e };
      if (s.tokens != null) {
        s.tokens = s.tokensReplace ? { ...s.tokens } : { ...c, ...s.tokens };
        for (const t of Object.values(s.tokens))
          typeof t.pattern == 'string' && (t.pattern = T() ? new RegExp(t.pattern, 'u') : new RegExp(t.pattern));
      } else s.tokens = c;
      (Array.isArray(s.mask) &&
        (s.mask.length > 1 ? (s.mask = [...s.mask].sort((t, a) => t.length - a.length)) : (s.mask = s.mask[0] ?? '')),
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
      return s.find((a) => this.process(e, a, !1).length >= t.length) ?? '';
    }
    escapeMask(e) {
      const s = [],
        t = [];
      return (
        e.split('').forEach((a, r) => {
          a === '!' && e[r - 1] !== '!' ? t.push(r - t.length) : s.push(a);
        }),
        { mask: s.join(''), escaped: t }
      );
    }
    process(e, s, t = !0) {
      if (this.opts.number != null) return F(e, t, this.opts);
      if (s == null) return e;
      const a = `v=${e},mr=${s},m=${t ? 1 : 0}`;
      if (this.memo.has(a)) return this.memo.get(a);
      const { mask: r, escaped: u } = this.escapeMask(s),
        h = [],
        d = this.opts.tokens != null ? this.opts.tokens : {},
        i = this.isReversed() ? -1 : 1,
        m = this.isReversed() ? 'unshift' : 'push',
        p = this.isReversed() ? 0 : r.length - 1,
        M = this.isReversed() ? () => o > -1 && f > -1 : () => o < r.length && f < e.length,
        y = (A) => (!this.isReversed() && A <= p) || (this.isReversed() && A >= p);
      let E,
        g = -1,
        o = this.isReversed() ? r.length - 1 : 0,
        f = this.isReversed() ? e.length - 1 : 0,
        C = !1;
      for (; M(); ) {
        const A = r.charAt(o),
          k = d[A],
          N = (k == null ? void 0 : k.transform) != null ? k.transform(e.charAt(f)) : e.charAt(f);
        if (
          (!u.includes(o) && k != null
            ? (N.match(k.pattern) != null
                ? (h[m](N),
                  k.repeated
                    ? (g === -1 ? (g = o) : o === p && o !== g && (o = g - i), p === g && (o -= i))
                    : k.multiple && ((C = !0), (o -= i)),
                  (o += i))
                : k.multiple
                  ? C && ((o += i), (f -= i), (C = !1))
                  : N === E
                    ? (E = void 0)
                    : k.optional && ((o += i), (f -= i)),
              (f += i))
            : (t && !this.isEager() && h[m](A),
              N === A && !this.isEager() ? (f += i) : (E = A),
              this.isEager() || (o += i)),
          this.isEager())
        )
          for (; y(o) && (d[r.charAt(o)] == null || u.includes(o)); ) {
            if (t) {
              if ((h[m](r.charAt(o)), e.charAt(f) === r.charAt(o))) {
                ((o += i), (f += i));
                continue;
              }
            } else r.charAt(o) === e.charAt(f) && (f += i);
            o += i;
          }
      }
      return (this.memo.set(a, h.join('')), this.memo.get(a));
    }
  }
  class x {
    constructor(e, s = {}) {
      w(this, 'items', new Map());
      w(this, 'eventAbortController');
      w(this, 'onInput', (e) => {
        if (e instanceof CustomEvent && e.type === 'input' && !e.isTrusted && !e.bubbles) return;
        const s = e.target,
          t = this.items.get(s);
        if (t === void 0) return;
        const a = 'inputType' in e && e.inputType.startsWith('delete'),
          r = t.isEager(),
          u = a && r && t.unmasked(s.value) === '' ? '' : s.value;
        this.fixCursor(s, a, () => this.setValue(s, u));
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
          const { signal: r } = this.eventAbortController;
          t.addEventListener('input', this.onInput, { capture: !0, signal: r });
        }
        const a = new P(W(t, s));
        (this.items.set(t, a),
          queueMicrotask(() => this.updateValue(t)),
          t.selectionStart === null &&
            a.isEager() &&
            console.warn('Maska: input of `%s` type is not supported', t.type));
      }
    }
    getInputs(e) {
      return typeof e == 'string' ? Array.from(document.querySelectorAll(e)) : 'length' in e ? Array.from(e) : [e];
    }
    getOptions(e) {
      const { onMaska: s, preProcess: t, postProcess: a, ...r } = e;
      return r;
    }
    fixCursor(e, s, t) {
      var M, y;
      const a = e.selectionStart,
        r = e.value;
      if ((t(), a === null || (a === r.length && !s))) return;
      const u = e.value,
        h = r.slice(0, a),
        d = u.slice(0, a),
        i = (M = this.processInput(e, h)) == null ? void 0 : M.unmasked,
        m = (y = this.processInput(e, d)) == null ? void 0 : y.unmasked;
      if (i === void 0 || m === void 0) return;
      let p = a;
      (h !== d && (p += s ? u.length - r.length : i.length - m.length), e.setSelectionRange(p, p));
    }
    setValue(e, s) {
      const t = this.processInput(e, s);
      t !== void 0 &&
        ((e.value = t.masked),
        this.options.onMaska != null &&
          (Array.isArray(this.options.onMaska) ? this.options.onMaska.forEach((a) => a(t)) : this.options.onMaska(t)),
        e.dispatchEvent(new CustomEvent('maska', { detail: t })),
        e.dispatchEvent(new CustomEvent('input', { detail: t.masked })));
    }
    processInput(e, s) {
      const t = this.items.get(e);
      if (t === void 0) return;
      let a = s ?? e.value;
      this.options.preProcess != null && (a = this.options.preProcess(a));
      let r = t.masked(a);
      return (
        this.options.postProcess != null && (r = this.options.postProcess(r)),
        { masked: r, unmasked: t.unmasked(a), completed: t.completed(a) }
      );
    }
  }
  const b = new WeakMap(),
    L = (n, e) => {
      if (n.arg == null || n.instance == null) return;
      const s = 'setup' in n.instance.$.type;
      n.arg in n.instance
        ? (n.instance[n.arg] = e)
        : s && console.warn('Maska: please expose `%s` using defineExpose', n.arg);
    },
    V = (n, e) => {
      var a;
      const s = n instanceof HTMLInputElement ? n : n.querySelector('input');
      if (s == null || (s == null ? void 0 : s.type) === 'file') return;
      let t = {};
      if ((e.value != null && (t = typeof e.value == 'string' ? { mask: e.value } : { ...e.value }), e.arg != null)) {
        const r = (u) => {
          const h = e.modifiers.unmasked ? u.unmasked : e.modifiers.completed ? u.completed : u.masked;
          L(e, h);
        };
        t.onMaska = t.onMaska == null ? r : Array.isArray(t.onMaska) ? [...t.onMaska, r] : [t.onMaska, r];
      }
      b.has(s) ? (a = b.get(s)) == null || a.update(t) : b.set(s, new x(s, t));
    };
  ((l.Mask = P),
    (l.MaskInput = x),
    (l.tokens = c),
    (l.vMaska = V),
    Object.defineProperty(l, Symbol.toStringTag, { value: 'Module' }));
});
