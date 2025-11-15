/*! maska v3.2.0 by Alexander Shabunevich | Released under the MIT license */
(function (c, l) {
  typeof exports == 'object' && typeof module < 'u'
    ? l(exports)
    : typeof define == 'function' && define.amd
      ? define(['exports'], l)
      : ((c = typeof globalThis < 'u' ? globalThis : c || self), l((c.Maska = {})));
})(this, function (c) {
  'use strict';
  var j = Object.defineProperty;
  var L = (c, l, b) => (l in c ? j(c, l, { enumerable: !0, configurable: !0, writable: !0, value: b }) : (c[l] = b));
  var E = (c, l, b) => L(c, typeof l != 'symbol' ? l + '' : l, b);
  const l = { '#': { pattern: /[0-9]/ }, '@': { pattern: /[a-zA-Z]/ }, '*': { pattern: /[a-zA-Z0-9]/ } },
    b = (n, e, t) =>
      n
        .replaceAll(e, '')
        .replace(t, '.')
        .replace('..', '.')
        .replace(/[^.\d]/g, ''),
    C = (n, e, t) => {
      var s;
      return new Intl.NumberFormat(((s = t.number) == null ? void 0 : s.locale) ?? 'en', {
        minimumFractionDigits: n,
        maximumFractionDigits: e,
        roundingMode: 'trunc',
      });
    },
    T = (n, e = !0, t) => {
      var v, y, A, g;
      const s = ((v = t.number) == null ? void 0 : v.unsigned) !== !0 && n.startsWith('-') ? '-' : '',
        r = ((y = t.number) == null ? void 0 : y.fraction) ?? 0;
      let a = C(0, r, t);
      const f = a.formatToParts(1000.12),
        m = ((A = f.find((o) => o.type === 'group')) == null ? void 0 : A.value) ?? ' ',
        k = ((g = f.find((o) => o.type === 'decimal')) == null ? void 0 : g.value) ?? '.',
        i = b(n, m, k);
      if (Number.isNaN(parseFloat(i))) return s;
      const p = i.split('.');
      if (p[1] != null && p[1].length >= 1) {
        const o = p[1].length <= r ? p[1].length : r;
        a = C(o, r, t);
      }
      let u = a.format(parseFloat(i));
      return (e ? r > 0 && i.endsWith('.') && !i.slice(0, -1).includes('.') && (u += k) : (u = b(u, m, k)), s + u);
    },
    I = (n) => JSON.parse(n.replaceAll("'", '"')),
    x = (n, e = {}) => {
      const t = { ...e };
      (n.dataset.maska != null && n.dataset.maska !== '' && (t.mask = F(n.dataset.maska)),
        n.dataset.maskaEager != null && (t.eager = R(n.dataset.maskaEager)),
        n.dataset.maskaReversed != null && (t.reversed = R(n.dataset.maskaReversed)),
        n.dataset.maskaTokensReplace != null && (t.tokensReplace = R(n.dataset.maskaTokensReplace)),
        n.dataset.maskaTokens != null && (t.tokens = O(n.dataset.maskaTokens)));
      const s = {};
      return (
        n.dataset.maskaNumberLocale != null && (s.locale = n.dataset.maskaNumberLocale),
        n.dataset.maskaNumberFraction != null && (s.fraction = parseInt(n.dataset.maskaNumberFraction)),
        n.dataset.maskaNumberUnsigned != null && (s.unsigned = R(n.dataset.maskaNumberUnsigned)),
        (n.dataset.maskaNumber != null || Object.values(s).length > 0) && (t.number = s),
        t
      );
    },
    R = (n) => (n !== '' ? !!JSON.parse(n) : !0),
    F = (n) => (n.startsWith('[') && n.endsWith(']') ? I(n) : n),
    O = (n) => {
      if (n.startsWith('{') && n.endsWith('}')) return I(n);
      const e = {};
      return (
        n.split('|').forEach((t) => {
          const s = t.split(':');
          e[s[0]] = {
            pattern: S() ? new RegExp(s[1], 'u') : new RegExp(s[1]),
            optional: s[2] === 'optional',
            multiple: s[2] === 'multiple',
            repeated: s[2] === 'repeated',
          };
        }),
        e
      );
    },
    S = () => {
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
      const t = { ...e };
      if (t.tokens != null) {
        t.tokens = t.tokensReplace ? { ...t.tokens } : { ...l, ...t.tokens };
        for (const s of Object.values(t.tokens))
          typeof s.pattern == 'string' && (s.pattern = S() ? new RegExp(s.pattern, 'u') : new RegExp(s.pattern));
      } else t.tokens = l;
      (Array.isArray(t.mask) &&
        (t.mask.length > 1 ? (t.mask = [...t.mask].sort((s, r) => s.length - r.length)) : (t.mask = t.mask[0] ?? '')),
        t.mask === '' && (t.mask = null),
        (this.opts = t));
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
      const t = this.findMask(String(e));
      if (this.opts.mask == null || t == null) return !1;
      const s = this.process(String(e), t).length;
      return typeof this.opts.mask == 'string' ? s >= this.opts.mask.length : s >= t.length;
    }
    findMask(e) {
      const t = this.opts.mask;
      if (t == null) return null;
      if (typeof t == 'string') return t;
      if (typeof t == 'function') return t(e);
      const s = this.process(e, t.slice(-1).pop() ?? '', !1);
      return t.find((r) => this.process(e, r, !1).length >= s.length) ?? '';
    }
    escapeMask(e) {
      const t = [],
        s = [];
      return (
        e.split('').forEach((r, a) => {
          r === '!' && e[a - 1] !== '!' ? s.push(a - s.length) : t.push(r);
        }),
        { mask: t.join(''), escaped: s }
      );
    }
    process(e, t, s = !0) {
      if (this.opts.number != null) return T(e, s, this.opts);
      if (t == null) return e;
      const r = `v=${e},mr=${t},m=${s ? 1 : 0}`;
      if (this.memo.has(r)) return this.memo.get(r);
      const { mask: a, escaped: f } = this.escapeMask(t),
        m = [],
        k = this.opts.tokens != null ? this.opts.tokens : {},
        i = this.isReversed() ? -1 : 1,
        p = this.isReversed() ? 'unshift' : 'push',
        u = this.isReversed() ? 0 : a.length - 1,
        v = this.isReversed() ? () => o > -1 && h > -1 : () => o < a.length && h < e.length,
        y = (M) => (!this.isReversed() && M <= u) || (this.isReversed() && M >= u);
      let A,
        g = -1,
        o = this.isReversed() ? a.length - 1 : 0,
        h = this.isReversed() ? e.length - 1 : 0,
        w = !1;
      for (; v(); ) {
        const M = a.charAt(o),
          d = k[M],
          N = (d == null ? void 0 : d.transform) != null ? d.transform(e.charAt(h)) : e.charAt(h);
        if (
          (!f.includes(o) && d != null
            ? (N.match(d.pattern) != null
                ? (m[p](N),
                  d.repeated
                    ? (g === -1 ? (g = o) : o === u && o !== g && (o = g - i), u === g && (o -= i))
                    : d.multiple && ((w = !0), (o -= i)),
                  (o += i))
                : d.multiple
                  ? w && ((o += i), (h -= i), (w = !1))
                  : N === A
                    ? (A = void 0)
                    : d.optional && ((o += i), (h -= i)),
              (h += i))
            : (s && !this.isEager() && m[p](M),
              N === M && !this.isEager() ? (h += i) : (A = M),
              this.isEager() || (o += i)),
          this.isEager())
        )
          for (; y(o) && (k[a.charAt(o)] == null || f.includes(o)); ) {
            if (s) {
              if ((m[p](a.charAt(o)), e.charAt(h) === a.charAt(o))) {
                ((o += i), (h += i));
                continue;
              }
            } else a.charAt(o) === e.charAt(h) && (h += i);
            o += i;
          }
      }
      return (this.memo.set(r, m.join('')), this.memo.get(r));
    }
  }
  class W {
    constructor(e, t = {}) {
      E(this, 'items', new Map());
      E(this, 'eventAbortController');
      E(this, 'onInput', (e) => {
        if (e instanceof CustomEvent && e.type === 'input' && !e.isTrusted && !e.bubbles) return;
        const t = e.target,
          s = this.items.get(t);
        if (s === void 0) return;
        const r = 'inputType' in e && e.inputType.startsWith('delete'),
          a = s.isEager(),
          f = r && a && s.unmasked(t.value) === '' ? '' : t.value;
        this.fixCursor(t, r, () => this.setValue(t, f));
      });
      ((this.options = t), (this.eventAbortController = new AbortController()), this.init(this.getInputs(e)));
    }
    update(e = {}) {
      ((this.options = { ...e }), this.init(Array.from(this.items.keys())));
    }
    updateValue(e) {
      var t;
      e.value !== '' &&
        e.value !== ((t = this.processInput(e)) == null ? void 0 : t.masked) &&
        this.setValue(e, e.value);
    }
    destroy() {
      (this.eventAbortController.abort(), this.items.clear());
    }
    init(e) {
      const t = this.getOptions(this.options);
      for (const s of e) {
        if (!this.items.has(s)) {
          const { signal: a } = this.eventAbortController;
          s.addEventListener('input', this.onInput, { capture: !0, signal: a });
        }
        const r = new P(x(s, t));
        (this.items.set(s, r),
          queueMicrotask(() => this.updateValue(s)),
          s.selectionStart === null &&
            r.isEager() &&
            console.warn('Maska: input of `%s` type is not supported', s.type));
      }
    }
    getInputs(e) {
      return typeof e == 'string' ? Array.from(document.querySelectorAll(e)) : 'length' in e ? Array.from(e) : [e];
    }
    getOptions(e) {
      const { onMaska: t, preProcess: s, postProcess: r, ...a } = e;
      return a;
    }
    fixCursor(e, t, s) {
      var v, y;
      const r = e.selectionStart,
        a = e.value;
      if ((s(), r === null || (r === a.length && !t))) return;
      const f = e.value,
        m = a.slice(0, r),
        k = f.slice(0, r),
        i = (v = this.processInput(e, m)) == null ? void 0 : v.unmasked,
        p = (y = this.processInput(e, k)) == null ? void 0 : y.unmasked;
      if (i === void 0 || p === void 0) return;
      let u = r;
      (m !== k && (u += t ? f.length - a.length : i.length - p.length), e.setSelectionRange(u, u));
    }
    setValue(e, t) {
      const s = this.processInput(e, t);
      s !== void 0 &&
        ((e.value = s.masked),
        this.options.onMaska != null &&
          (Array.isArray(this.options.onMaska) ? this.options.onMaska.forEach((r) => r(s)) : this.options.onMaska(s)),
        e.dispatchEvent(new CustomEvent('maska', { detail: s })),
        e.dispatchEvent(new CustomEvent('input', { detail: s.masked })));
    }
    processInput(e, t) {
      const s = this.items.get(e);
      if (s === void 0) return;
      let r = t ?? e.value;
      this.options.preProcess != null && (r = this.options.preProcess(r));
      let a = s.masked(r);
      return (
        this.options.postProcess != null && (a = this.options.postProcess(a)),
        { masked: a, unmasked: s.unmasked(r), completed: s.completed(r) }
      );
    }
  }
  ((c.Mask = P), (c.MaskInput = W), (c.tokens = l), Object.defineProperty(c, Symbol.toStringTag, { value: 'Module' }));
});
