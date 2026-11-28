var I = Object.defineProperty;
var P = (n, e, s) => e in n ? I(n, e, { enumerable: !0, configurable: !0, writable: !0, value: s }) : n[e] = s;
var A = (n, e, s) => P(n, typeof e != "symbol" ? e + "" : e, s);
const R = {
  "#": { pattern: /[0-9]/ },
  "@": { pattern: /[a-zA-Z]/ },
  "*": { pattern: /[a-zA-Z0-9]/ }
}, N = (n, e, s) => n.replaceAll(e, "").replace(s, ".").replace("..", ".").replace(/[^.\d]/g, ""), w = (n, e, s) => {
  var t;
  return new Intl.NumberFormat(((t = s.number) == null ? void 0 : t.locale) ?? "en", {
    minimumFractionDigits: n,
    maximumFractionDigits: e,
    roundingMode: "trunc"
  });
}, S = (n, e = !0, s) => {
  var g, v, k, h;
  const t = ((g = s.number) == null ? void 0 : g.unsigned) !== !0 && n.startsWith("-") ? "-" : "", r = ((v = s.number) == null ? void 0 : v.fraction) ?? 0;
  let a = w(0, r, s);
  const c = a.formatToParts(1000.12), p = ((k = c.find((o) => o.type === "group")) == null ? void 0 : k.value) ?? " ", d = ((h = c.find((o) => o.type === "decimal")) == null ? void 0 : h.value) ?? ".", i = N(n, p, d);
  if (Number.isNaN(parseFloat(i))) return t;
  const m = i.split(".");
  if (m[1] != null && m[1].length >= 1) {
    const o = m[1].length <= r ? m[1].length : r;
    a = w(o, r, s);
  }
  let l = a.format(parseFloat(i));
  return e ? r > 0 && i.endsWith(".") && !i.slice(0, -1).includes(".") && (l += d) : l = N(l, p, d), t + l;
}, C = (n) => JSON.parse(n.replaceAll("'", '"')), T = (n, e = {}) => {
  const s = { ...e };
  n.dataset.maska != null && n.dataset.maska !== "" && (s.mask = F(n.dataset.maska)), n.dataset.maskaEager != null && (s.eager = E(n.dataset.maskaEager)), n.dataset.maskaReversed != null && (s.reversed = E(n.dataset.maskaReversed)), n.dataset.maskaTokensReplace != null && (s.tokensReplace = E(n.dataset.maskaTokensReplace)), n.dataset.maskaTokens != null && (s.tokens = W(n.dataset.maskaTokens));
  const t = {};
  return n.dataset.maskaNumberLocale != null && (t.locale = n.dataset.maskaNumberLocale), n.dataset.maskaNumberFraction != null && (t.fraction = parseInt(n.dataset.maskaNumberFraction)), n.dataset.maskaNumberUnsigned != null && (t.unsigned = E(n.dataset.maskaNumberUnsigned)), (n.dataset.maskaNumber != null || Object.values(t).length > 0) && (s.number = t), s;
}, E = (n) => n !== "" ? !!JSON.parse(n) : !0, F = (n) => n.startsWith("[") && n.endsWith("]") ? C(n) : n, W = (n) => {
  if (n.startsWith("{") && n.endsWith("}"))
    return C(n);
  const e = {};
  return n.split("|").forEach((s) => {
    const t = s.split(":");
    e[t[0]] = {
      pattern: x() ? new RegExp(t[1], "u") : new RegExp(t[1]),
      optional: t[2] === "optional",
      multiple: t[2] === "multiple",
      repeated: t[2] === "repeated"
    };
  }), e;
}, x = () => {
  try {
    return new RegExp("\\p{L}", "u"), !0;
  } catch {
    return !1;
  }
};
class O {
  constructor(e = {}) {
    A(this, "opts", {});
    A(this, "memo", /* @__PURE__ */ new Map());
    const s = { ...e };
    if (s.tokens != null) {
      s.tokens = s.tokensReplace ? { ...s.tokens } : { ...R, ...s.tokens };
      for (const t of Object.values(s.tokens))
        typeof t.pattern == "string" && (t.pattern = x() ? new RegExp(t.pattern, "u") : new RegExp(t.pattern));
    } else
      s.tokens = R;
    Array.isArray(s.mask) && (s.mask.length > 1 ? s.mask = [...s.mask].sort((t, r) => t.length - r.length) : s.mask = s.mask[0] ?? ""), s.mask === "" && (s.mask = null), this.opts = s;
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
    return typeof this.opts.mask == "string" ? t >= this.opts.mask.length : t >= s.length;
  }
  findMask(e) {
    const s = this.opts.mask;
    if (s == null)
      return null;
    if (typeof s == "string")
      return s;
    if (typeof s == "function")
      return s(e);
    const t = this.process(e, s.slice(-1).pop() ?? "", !1);
    return s.find((r) => this.process(e, r, !1).length >= t.length) ?? "";
  }
  escapeMask(e) {
    const s = [], t = [];
    return e.split("").forEach((r, a) => {
      r === "!" && e[a - 1] !== "!" ? t.push(a - t.length) : s.push(r);
    }), { mask: s.join(""), escaped: t };
  }
  process(e, s, t = !0) {
    if (this.opts.number != null) return S(e, t, this.opts);
    if (s == null) return e;
    const r = `v=${e},mr=${s},m=${t ? 1 : 0}`;
    if (this.memo.has(r)) return this.memo.get(r);
    const { mask: a, escaped: c } = this.escapeMask(s), p = [], d = this.opts.tokens != null ? this.opts.tokens : {}, i = this.isReversed() ? -1 : 1, m = this.isReversed() ? "unshift" : "push", l = this.isReversed() ? 0 : a.length - 1, g = this.isReversed() ? () => o > -1 && u > -1 : () => o < a.length && u < e.length, v = (b) => !this.isReversed() && b <= l || this.isReversed() && b >= l;
    let k, h = -1, o = this.isReversed() ? a.length - 1 : 0, u = this.isReversed() ? e.length - 1 : 0, M = !1;
    for (; g(); ) {
      const b = a.charAt(o), f = d[b], y = (f == null ? void 0 : f.transform) != null ? f.transform(e.charAt(u)) : e.charAt(u);
      if (!c.includes(o) && f != null ? (y.match(f.pattern) != null ? (p[m](y), f.repeated ? (h === -1 ? h = o : o === l && o !== h && (o = h - i), l === h && (o -= i)) : f.multiple && (M = !0, o -= i), o += i) : f.multiple ? M && (o += i, u -= i, M = !1) : y === k ? k = void 0 : f.optional && (o += i, u -= i), u += i) : (t && !this.isEager() && p[m](b), y === b && !this.isEager() ? u += i : k = b, this.isEager() || (o += i)), this.isEager())
        for (; v(o) && (d[a.charAt(o)] == null || c.includes(o)); ) {
          if (t) {
            if (p[m](a.charAt(o)), e.charAt(u) === a.charAt(o)) {
              o += i, u += i;
              continue;
            }
          } else a.charAt(o) === e.charAt(u) && (u += i);
          o += i;
        }
    }
    return this.memo.set(r, p.join("")), this.memo.get(r);
  }
}
const L = ["text", "search", "url", "tel", "password"];
class j {
  constructor(e, s = {}) {
    A(this, "items", /* @__PURE__ */ new Map());
    A(this, "eventAbortController");
    A(this, "onInput", (e) => {
      if (e instanceof CustomEvent && e.type === "input" && !e.isTrusted && !e.bubbles)
        return;
      const s = e.target, t = this.items.get(s);
      if (t === void 0) return;
      const r = "inputType" in e && e.inputType.startsWith("delete"), a = t.isEager(), c = r && a && t.unmasked(s.value) === "" ? "" : s.value;
      this.fixCursor(s, r, () => this.setValue(s, c));
    });
    this.options = s, this.eventAbortController = new AbortController(), this.init(this.getInputs(e));
  }
  update(e = {}) {
    this.options = { ...e }, this.init(Array.from(this.items.keys()));
  }
  updateValue(e) {
    var s;
    e.value !== "" && e.value !== ((s = this.processInput(e)) == null ? void 0 : s.masked) && this.setValue(e, e.value);
  }
  destroy() {
    this.eventAbortController.abort(), this.items.clear();
  }
  init(e) {
    const s = this.getOptions(this.options);
    for (const t of e) {
      if (!L.includes(t.type)) return;
      if (!this.items.has(t)) {
        const { signal: a } = this.eventAbortController;
        t.addEventListener("input", this.onInput, { capture: !0, signal: a });
      }
      const r = new O(T(t, s));
      this.items.set(t, r), queueMicrotask(() => this.updateValue(t));
    }
  }
  getInputs(e) {
    return typeof e == "string" ? Array.from(document.querySelectorAll(e)) : "length" in e ? Array.from(e) : [e];
  }
  getOptions(e) {
    const { onMaska: s, preProcess: t, postProcess: r, ...a } = e;
    return a;
  }
  fixCursor(e, s, t) {
    var g, v, k;
    const r = e.selectionStart, a = e.value;
    if (t(), r === null || r === a.length && !s) return;
    const c = e.value, p = a.slice(0, r), d = c.slice(0, r), i = (g = this.processInput(e, p)) == null ? void 0 : g.unmasked, m = (v = this.processInput(e, d)) == null ? void 0 : v.unmasked;
    if (i === void 0 || m === void 0) return;
    let l = r;
    if (p !== d)
      if (s)
        l += c.length - a.length;
      else if (i.length === 0)
        l = 0;
      else {
        l = c.length;
        for (let h = 1; h <= c.length; h++)
          if ((((k = this.processInput(e, c.slice(0, h))) == null ? void 0 : k.unmasked) ?? "").length >= i.length) {
            l = h;
            break;
          }
      }
    e.setSelectionRange(l, l);
  }
  setValue(e, s) {
    const t = this.processInput(e, s);
    t !== void 0 && (e.value = t.masked, this.options.onMaska != null && (Array.isArray(this.options.onMaska) ? this.options.onMaska.forEach((r) => r(t)) : this.options.onMaska(t)), e.dispatchEvent(new CustomEvent("maska", { detail: t })), e.dispatchEvent(new CustomEvent("input", { detail: t.masked })));
  }
  processInput(e, s) {
    const t = this.items.get(e);
    if (t === void 0) return;
    let r = s ?? e.value;
    this.options.preProcess != null && (r = this.options.preProcess(r));
    let a = t.masked(r);
    return this.options.postProcess != null && (a = this.options.postProcess(a)), {
      masked: a,
      unmasked: t.unmasked(r),
      completed: t.completed(r)
    };
  }
}
export {
  j as M,
  O as a,
  L as s,
  R as t
};
