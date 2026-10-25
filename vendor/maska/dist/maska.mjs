var S = Object.defineProperty;
var x = (n, t, e) => (t in n ? S(n, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : (n[t] = e));
var A = (n, t, e) => x(n, typeof t != 'symbol' ? t + '' : t, e);
const R = {
    '#': { pattern: /[0-9]/ },
    '@': { pattern: /[a-zA-Z]/ },
    '*': { pattern: /[a-zA-Z0-9]/ },
  },
  N = (n, t, e) =>
    n
      .replaceAll(t, '')
      .replace(e, '.')
      .replace('..', '.')
      .replace(/[^.\d]/g, ''),
  w = (n, t, e) => {
    var s;
    return new Intl.NumberFormat(((s = e.number) == null ? void 0 : s.locale) ?? 'en', {
      minimumFractionDigits: n,
      maximumFractionDigits: t,
      roundingMode: 'trunc',
    });
  },
  P = (n, t = !0, e) => {
    var k, g, b, d;
    const s = ((k = e.number) == null ? void 0 : k.unsigned) !== !0 && n.startsWith('-') ? '-' : '',
      r = ((g = e.number) == null ? void 0 : g.fraction) ?? 0;
    let a = w(0, r, e);
    const u = a.formatToParts(1000.12),
      p = ((b = u.find((o) => o.type === 'group')) == null ? void 0 : b.value) ?? ' ',
      f = ((d = u.find((o) => o.type === 'decimal')) == null ? void 0 : d.value) ?? '.',
      i = N(n, p, f);
    if (Number.isNaN(parseFloat(i))) return s;
    const h = i.split('.');
    if (h[1] != null && h[1].length >= 1) {
      const o = h[1].length <= r ? h[1].length : r;
      a = w(o, r, e);
    }
    let l = a.format(parseFloat(i));
    return (t ? r > 0 && i.endsWith('.') && !i.slice(0, -1).includes('.') && (l += f) : (l = N(l, p, f)), s + l);
  },
  C = (n) => JSON.parse(n.replaceAll("'", '"')),
  F = (n, t = {}) => {
    const e = { ...t };
    (n.dataset.maska != null && n.dataset.maska !== '' && (e.mask = T(n.dataset.maska)),
      n.dataset.maskaEager != null && (e.eager = E(n.dataset.maskaEager)),
      n.dataset.maskaReversed != null && (e.reversed = E(n.dataset.maskaReversed)),
      n.dataset.maskaTokensReplace != null && (e.tokensReplace = E(n.dataset.maskaTokensReplace)),
      n.dataset.maskaTokens != null && (e.tokens = W(n.dataset.maskaTokens)));
    const s = {};
    return (
      n.dataset.maskaNumberLocale != null && (s.locale = n.dataset.maskaNumberLocale),
      n.dataset.maskaNumberFraction != null && (s.fraction = parseInt(n.dataset.maskaNumberFraction)),
      n.dataset.maskaNumberUnsigned != null && (s.unsigned = E(n.dataset.maskaNumberUnsigned)),
      (n.dataset.maskaNumber != null || Object.values(s).length > 0) && (e.number = s),
      e
    );
  },
  E = (n) => (n !== '' ? !!JSON.parse(n) : !0),
  T = (n) => (n.startsWith('[') && n.endsWith(']') ? C(n) : n),
  W = (n) => {
    if (n.startsWith('{') && n.endsWith('}')) return C(n);
    const t = {};
    return (
      n.split('|').forEach((e) => {
        const s = e.split(':');
        t[s[0]] = {
          pattern: I() ? new RegExp(s[1], 'u') : new RegExp(s[1]),
          optional: s[2] === 'optional',
          multiple: s[2] === 'multiple',
          repeated: s[2] === 'repeated',
        };
      }),
      t
    );
  },
  I = () => {
    try {
      return (new RegExp('\\p{L}', 'u'), !0);
    } catch {
      return !1;
    }
  };
class O {
  constructor(t = {}) {
    A(this, 'opts', {});
    A(this, 'memo', /* @__PURE__ */ new Map());
    const e = { ...t };
    if (e.tokens != null) {
      e.tokens = e.tokensReplace ? { ...e.tokens } : { ...R, ...e.tokens };
      for (const s of Object.values(e.tokens))
        typeof s.pattern == 'string' && (s.pattern = I() ? new RegExp(s.pattern, 'u') : new RegExp(s.pattern));
    } else e.tokens = R;
    (Array.isArray(e.mask) &&
      (e.mask.length > 1 ? (e.mask = [...e.mask].sort((s, r) => s.length - r.length)) : (e.mask = e.mask[0] ?? '')),
      e.mask === '' && (e.mask = null),
      (this.opts = e));
  }
  masked(t) {
    return this.process(String(t), this.findMask(String(t)));
  }
  unmasked(t) {
    return this.process(String(t), this.findMask(String(t)), !1);
  }
  isEager() {
    return this.opts.eager === !0;
  }
  isReversed() {
    return this.opts.reversed === !0;
  }
  completed(t) {
    const e = this.findMask(String(t));
    if (this.opts.mask == null || e == null) return !1;
    const s = this.process(String(t), e).length;
    return typeof this.opts.mask == 'string' ? s >= this.opts.mask.length : s >= e.length;
  }
  findMask(t) {
    const e = this.opts.mask;
    if (e == null) return null;
    if (typeof e == 'string') return e;
    if (typeof e == 'function') return e(t);
    const s = this.process(t, e.slice(-1).pop() ?? '', !1);
    return e.find((r) => this.process(t, r, !1).length >= s.length) ?? '';
  }
  escapeMask(t) {
    const e = [],
      s = [];
    return (
      t.split('').forEach((r, a) => {
        r === '!' && t[a - 1] !== '!' ? s.push(a - s.length) : e.push(r);
      }),
      { mask: e.join(''), escaped: s }
    );
  }
  process(t, e, s = !0) {
    if (this.opts.number != null) return P(t, s, this.opts);
    if (e == null) return t;
    const r = `v=${t},mr=${e},m=${s ? 1 : 0}`;
    if (this.memo.has(r)) return this.memo.get(r);
    const { mask: a, escaped: u } = this.escapeMask(e),
      p = [],
      f = this.opts.tokens != null ? this.opts.tokens : {},
      i = this.isReversed() ? -1 : 1,
      h = this.isReversed() ? 'unshift' : 'push',
      l = this.isReversed() ? 0 : a.length - 1,
      k = this.isReversed() ? () => o > -1 && c > -1 : () => o < a.length && c < t.length,
      g = (v) => (!this.isReversed() && v <= l) || (this.isReversed() && v >= l);
    let b,
      d = -1,
      o = this.isReversed() ? a.length - 1 : 0,
      c = this.isReversed() ? t.length - 1 : 0,
      M = !1;
    for (; k(); ) {
      const v = a.charAt(o),
        m = f[v],
        y = (m == null ? void 0 : m.transform) != null ? m.transform(t.charAt(c)) : t.charAt(c);
      if (
        (!u.includes(o) && m != null
          ? (y.match(m.pattern) != null
              ? (p[h](y),
                m.repeated
                  ? (d === -1 ? (d = o) : o === l && o !== d && (o = d - i), l === d && (o -= i))
                  : m.multiple && ((M = !0), (o -= i)),
                (o += i))
              : m.multiple
                ? M && ((o += i), (c -= i), (M = !1))
                : y === b
                  ? (b = void 0)
                  : m.optional && ((o += i), (c -= i)),
            (c += i))
          : (s && !this.isEager() && p[h](v),
            y === v && !this.isEager() ? (c += i) : (b = v),
            this.isEager() || (o += i)),
        this.isEager())
      )
        for (; g(o) && (f[a.charAt(o)] == null || u.includes(o)); ) {
          if (s) {
            if ((p[h](a.charAt(o)), t.charAt(c) === a.charAt(o))) {
              ((o += i), (c += i));
              continue;
            }
          } else a.charAt(o) === t.charAt(c) && (c += i);
          o += i;
        }
    }
    return (this.memo.set(r, p.join('')), this.memo.get(r));
  }
}
class V {
  constructor(t, e = {}) {
    A(this, 'items', /* @__PURE__ */ new Map());
    A(this, 'eventAbortController');
    A(this, 'onInput', (t) => {
      if (t instanceof CustomEvent && t.type === 'input' && !t.isTrusted && !t.bubbles) return;
      const e = t.target,
        s = this.items.get(e);
      if (s === void 0) return;
      const r = 'inputType' in t && t.inputType.startsWith('delete'),
        a = s.isEager(),
        u = r && a && s.unmasked(e.value) === '' ? '' : e.value;
      this.fixCursor(e, r, () => this.setValue(e, u));
    });
    ((this.options = e), (this.eventAbortController = new AbortController()), this.init(this.getInputs(t)));
  }
  update(t = {}) {
    ((this.options = { ...t }), this.init(Array.from(this.items.keys())));
  }
  updateValue(t) {
    var e;
    t.value !== '' && t.value !== ((e = this.processInput(t)) == null ? void 0 : e.masked) && this.setValue(t, t.value);
  }
  destroy() {
    (this.eventAbortController.abort(), this.items.clear());
  }
  init(t) {
    const e = this.getOptions(this.options);
    for (const s of t) {
      if (!this.items.has(s)) {
        const { signal: a } = this.eventAbortController;
        s.addEventListener('input', this.onInput, { capture: !0, signal: a });
      }
      const r = new O(F(s, e));
      (this.items.set(s, r),
        queueMicrotask(() => this.updateValue(s)),
        s.selectionStart === null && r.isEager() && console.warn('Maska: input of `%s` type is not supported', s.type));
    }
  }
  getInputs(t) {
    return typeof t == 'string' ? Array.from(document.querySelectorAll(t)) : 'length' in t ? Array.from(t) : [t];
  }
  getOptions(t) {
    const { onMaska: e, preProcess: s, postProcess: r, ...a } = t;
    return a;
  }
  fixCursor(t, e, s) {
    var k, g;
    const r = t.selectionStart,
      a = t.value;
    if ((s(), r === null || (r === a.length && !e))) return;
    const u = t.value,
      p = a.slice(0, r),
      f = u.slice(0, r),
      i = (k = this.processInput(t, p)) == null ? void 0 : k.unmasked,
      h = (g = this.processInput(t, f)) == null ? void 0 : g.unmasked;
    if (i === void 0 || h === void 0) return;
    let l = r;
    (p !== f && (l += e ? u.length - a.length : i.length - h.length), t.setSelectionRange(l, l));
  }
  setValue(t, e) {
    const s = this.processInput(t, e);
    s !== void 0 &&
      ((t.value = s.masked),
      this.options.onMaska != null &&
        (Array.isArray(this.options.onMaska) ? this.options.onMaska.forEach((r) => r(s)) : this.options.onMaska(s)),
      t.dispatchEvent(new CustomEvent('maska', { detail: s })),
      t.dispatchEvent(new CustomEvent('input', { detail: s.masked })));
  }
  processInput(t, e) {
    const s = this.items.get(t);
    if (s === void 0) return;
    let r = e ?? t.value;
    this.options.preProcess != null && (r = this.options.preProcess(r));
    let a = s.masked(r);
    return (
      this.options.postProcess != null && (a = this.options.postProcess(a)),
      {
        masked: a,
        unmasked: s.unmasked(r),
        completed: s.completed(r),
      }
    );
  }
}
export { O as Mask, V as MaskInput, R as tokens };
