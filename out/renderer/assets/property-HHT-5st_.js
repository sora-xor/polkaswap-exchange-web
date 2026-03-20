const r = globalThis, c$1 = r.ShadowRoot && (r.ShadyCSS === void 0 || r.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, a$1 = /* @__PURE__ */ Symbol(), i$1 = /* @__PURE__ */ new WeakMap();
let l$2 = class l {
  constructor(s2, t, o2) {
    if (this._$cssResult$ = true, o2 !== a$1) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = s2, this.t = t;
  }
  get styleSheet() {
    let s2 = this.o;
    const t = this.t;
    if (c$1 && s2 === void 0) {
      const o2 = t !== void 0 && t.length === 1;
      o2 && (s2 = i$1.get(t)), s2 === void 0 && ((this.o = s2 = new CSSStyleSheet()).replaceSync(this.cssText), o2 && i$1.set(t, s2));
    }
    return s2;
  }
  toString() {
    return this.cssText;
  }
};
const h$1 = (e) => new l$2(typeof e == "string" ? e : e + "", void 0, a$1), p$3 = (e, ...s2) => {
  const t = e.length === 1 ? e[0] : s2.reduce((o2, S2, u2) => o2 + ((n2) => {
    if (n2._$cssResult$ === true) return n2.cssText;
    if (typeof n2 == "number") return n2;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + n2 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(S2) + e[u2 + 1], e[0]);
  return new l$2(t, e, a$1);
}, d$2 = (e, s2) => {
  if (c$1) e.adoptedStyleSheets = s2.map((t) => t instanceof CSSStyleSheet ? t : t.styleSheet);
  else for (const t of s2) {
    const o2 = document.createElement("style"), S2 = r.litNonce;
    S2 !== void 0 && o2.setAttribute("nonce", S2), o2.textContent = t.cssText, e.appendChild(o2);
  }
}, y$3 = c$1 ? (e) => e : (e) => e instanceof CSSStyleSheet ? ((s2) => {
  let t = "";
  for (const o2 of s2.cssRules) t += o2.cssText;
  return h$1(t);
})(e) : e;
const { is: b$2, defineProperty: v$1, getOwnPropertyDescriptor: S$1, getOwnPropertyNames: U$1, getOwnPropertySymbols: w$2, getPrototypeOf: A } = Object, a = globalThis, f$2 = a.trustedTypes, O$2 = f$2 ? f$2.emptyScript : "", p$2 = a.reactiveElementPolyfillSupport, l$1 = (o2, t) => o2, d$1 = { toAttribute(o2, t) {
  switch (t) {
    case Boolean:
      o2 = o2 ? O$2 : null;
      break;
    case Object:
    case Array:
      o2 = o2 == null ? o2 : JSON.stringify(o2);
  }
  return o2;
}, fromAttribute(o2, t) {
  let e = o2;
  switch (t) {
    case Boolean:
      e = o2 !== null;
      break;
    case Number:
      e = o2 === null ? null : Number(o2);
      break;
    case Object:
    case Array:
      try {
        e = JSON.parse(o2);
      } catch (s2) {
        e = null;
      }
  }
  return e;
} }, y$2 = (o2, t) => !b$2(o2, t), E$1 = { attribute: true, type: String, converter: d$1, reflect: false, hasChanged: y$2 };
Symbol.metadata != null || (Symbol.metadata = /* @__PURE__ */ Symbol("metadata")), a.litPropertyMetadata != null || (a.litPropertyMetadata = /* @__PURE__ */ new WeakMap());
class c extends HTMLElement {
  static addInitializer(t) {
    var e;
    this._$Ei(), ((e = this.l) != null ? e : this.l = []).push(t);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t, e = E$1) {
    if (e.state && (e.attribute = false), this._$Ei(), this.elementProperties.set(t, e), !e.noAccessor) {
      const s2 = /* @__PURE__ */ Symbol(), i2 = this.getPropertyDescriptor(t, s2, e);
      i2 !== void 0 && v$1(this.prototype, t, i2);
    }
  }
  static getPropertyDescriptor(t, e, s2) {
    var r2;
    const { get: i2, set: n2 } = (r2 = S$1(this.prototype, t)) != null ? r2 : { get() {
      return this[e];
    }, set(h2) {
      this[e] = h2;
    } };
    return { get() {
      return i2 == null ? void 0 : i2.call(this);
    }, set(h2) {
      const g2 = i2 == null ? void 0 : i2.call(this);
      n2.call(this, h2), this.requestUpdate(t, g2, s2);
    }, configurable: true, enumerable: true };
  }
  static getPropertyOptions(t) {
    var e;
    return (e = this.elementProperties.get(t)) != null ? e : E$1;
  }
  static _$Ei() {
    if (this.hasOwnProperty(l$1("elementProperties"))) return;
    const t = A(this);
    t.finalize(), t.l !== void 0 && (this.l = [...t.l]), this.elementProperties = new Map(t.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(l$1("finalized"))) return;
    if (this.finalized = true, this._$Ei(), this.hasOwnProperty(l$1("properties"))) {
      const e = this.properties, s2 = [...U$1(e), ...w$2(e)];
      for (const i2 of s2) this.createProperty(i2, e[i2]);
    }
    const t = this[Symbol.metadata];
    if (t !== null) {
      const e = litPropertyMetadata.get(t);
      if (e !== void 0) for (const [s2, i2] of e) this.elementProperties.set(s2, i2);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [e, s2] of this.elementProperties) {
      const i2 = this._$Eu(e, s2);
      i2 !== void 0 && this._$Eh.set(i2, e);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(t) {
    const e = [];
    if (Array.isArray(t)) {
      const s2 = new Set(t.flat(1 / 0).reverse());
      for (const i2 of s2) e.unshift(y$3(i2));
    } else t !== void 0 && e.push(y$3(t));
    return e;
  }
  static _$Eu(t, e) {
    const s2 = e.attribute;
    return s2 === false ? void 0 : typeof s2 == "string" ? s2 : typeof t == "string" ? t.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = false, this.hasUpdated = false, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    var t;
    this._$ES = new Promise((e) => this.enableUpdating = e), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), (t = this.constructor.l) == null || t.forEach((e) => e(this));
  }
  addController(t) {
    var e, s2;
    ((e = this._$EO) != null ? e : this._$EO = /* @__PURE__ */ new Set()).add(t), this.renderRoot !== void 0 && this.isConnected && ((s2 = t.hostConnected) == null || s2.call(t));
  }
  removeController(t) {
    var e;
    (e = this._$EO) == null || e.delete(t);
  }
  _$E_() {
    const t = /* @__PURE__ */ new Map(), e = this.constructor.elementProperties;
    for (const s2 of e.keys()) this.hasOwnProperty(s2) && (t.set(s2, this[s2]), delete this[s2]);
    t.size > 0 && (this._$Ep = t);
  }
  createRenderRoot() {
    var e;
    const t = (e = this.shadowRoot) != null ? e : this.attachShadow(this.constructor.shadowRootOptions);
    return d$2(t, this.constructor.elementStyles), t;
  }
  connectedCallback() {
    var e;
    this.renderRoot != null || (this.renderRoot = this.createRenderRoot()), this.enableUpdating(true), (e = this._$EO) == null || e.forEach((s2) => {
      var i2;
      return (i2 = s2.hostConnected) == null ? void 0 : i2.call(s2);
    });
  }
  enableUpdating(t) {
  }
  disconnectedCallback() {
    var t;
    (t = this._$EO) == null || t.forEach((e) => {
      var s2;
      return (s2 = e.hostDisconnected) == null ? void 0 : s2.call(e);
    });
  }
  attributeChangedCallback(t, e, s2) {
    this._$AK(t, s2);
  }
  _$EC(t, e) {
    var n2;
    const s2 = this.constructor.elementProperties.get(t), i2 = this.constructor._$Eu(t, s2);
    if (i2 !== void 0 && s2.reflect === true) {
      const r2 = (((n2 = s2.converter) == null ? void 0 : n2.toAttribute) !== void 0 ? s2.converter : d$1).toAttribute(e, s2.type);
      this._$Em = t, r2 == null ? this.removeAttribute(i2) : this.setAttribute(i2, r2), this._$Em = null;
    }
  }
  _$AK(t, e) {
    var n2;
    const s2 = this.constructor, i2 = s2._$Eh.get(t);
    if (i2 !== void 0 && this._$Em !== i2) {
      const r2 = s2.getPropertyOptions(i2), h2 = typeof r2.converter == "function" ? { fromAttribute: r2.converter } : ((n2 = r2.converter) == null ? void 0 : n2.fromAttribute) !== void 0 ? r2.converter : d$1;
      this._$Em = i2, this[i2] = h2.fromAttribute(e, r2.type), this._$Em = null;
    }
  }
  requestUpdate(t, e, s2) {
    var i2;
    if (t !== void 0) {
      if (s2 != null || (s2 = this.constructor.getPropertyOptions(t)), !((i2 = s2.hasChanged) != null ? i2 : y$2)(this[t], e)) return;
      this.P(t, e, s2);
    }
    this.isUpdatePending === false && (this._$ES = this._$ET());
  }
  P(t, e, s2) {
    var i2;
    this._$AL.has(t) || this._$AL.set(t, e), s2.reflect === true && this._$Em !== t && ((i2 = this._$Ej) != null ? i2 : this._$Ej = /* @__PURE__ */ new Set()).add(t);
  }
  async _$ET() {
    this.isUpdatePending = true;
    try {
      await this._$ES;
    } catch (e) {
      Promise.reject(e);
    }
    const t = this.scheduleUpdate();
    return t != null && await t, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    var i2;
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot != null || (this.renderRoot = this.createRenderRoot()), this._$Ep) {
        for (const [r2, h2] of this._$Ep) this[r2] = h2;
        this._$Ep = void 0;
      }
      const n2 = this.constructor.elementProperties;
      if (n2.size > 0) for (const [r2, h2] of n2) h2.wrapped !== true || this._$AL.has(r2) || this[r2] === void 0 || this.P(r2, this[r2], h2);
    }
    let t = false;
    const e = this._$AL;
    try {
      t = this.shouldUpdate(e), t ? (this.willUpdate(e), (i2 = this._$EO) == null || i2.forEach((n2) => {
        var r2;
        return (r2 = n2.hostUpdate) == null ? void 0 : r2.call(n2);
      }), this.update(e)) : this._$EU();
    } catch (n2) {
      throw t = false, this._$EU(), n2;
    }
    t && this._$AE(e);
  }
  willUpdate(t) {
  }
  _$AE(t) {
    var e;
    (e = this._$EO) == null || e.forEach((s2) => {
      var i2;
      return (i2 = s2.hostUpdated) == null ? void 0 : i2.call(s2);
    }), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t)), this.updated(t);
  }
  _$EU() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = false;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(t) {
    return true;
  }
  update(t) {
    this._$Ej && (this._$Ej = this._$Ej.forEach((e) => this._$EC(e, this[e]))), this._$EU();
  }
  updated(t) {
  }
  firstUpdated(t) {
  }
}
var m$1;
c.elementStyles = [], c.shadowRootOptions = { mode: "open" }, c[l$1("elementProperties")] = /* @__PURE__ */ new Map(), c[l$1("finalized")] = /* @__PURE__ */ new Map(), p$2 == null || p$2({ ReactiveElement: c }), ((m$1 = a.reactiveElementVersions) != null ? m$1 : a.reactiveElementVersions = []).push("2.0.4");
const y$1 = globalThis, S = y$1.trustedTypes, I = S ? S.createPolicy("lit-html", { createHTML: (h2) => h2 }) : void 0, W = "$lit$", p$1 = `lit$${Math.random().toFixed(9).slice(2)}$`, k = "?" + p$1, F = `<${k}>`, v = document, x = () => v.createComment(""), H = (h2) => h2 === null || typeof h2 != "object" && typeof h2 != "function", D = Array.isArray, Z = (h2) => D(h2) || typeof (h2 == null ? void 0 : h2[Symbol.iterator]) == "function", w$1 = `[ 	
\f\r]`, m = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, B = /-->/g, P$1 = />/g, u$1 = RegExp(`>|${w$1}(?:([^\\s"'>=/]+)(${w$1}*=${w$1}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), R = /'/g, U = /"/g, V = /^(?:script|style|textarea|title)$/i, O$1 = (h2) => (t, ...e) => ({ _$litType$: h2, strings: t, values: e }), Y = O$1(1), tt = O$1(2), N = /* @__PURE__ */ Symbol.for("lit-noChange"), _ = /* @__PURE__ */ Symbol.for("lit-nothing"), j = /* @__PURE__ */ new WeakMap(), g$1 = v.createTreeWalker(v, 129);
function z(h2, t) {
  if (!Array.isArray(h2) || !h2.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return I !== void 0 ? I.createHTML(t) : t;
}
const q = (h2, t) => {
  const e = h2.length - 1, s2 = [];
  let i2, o2 = t === 2 ? "<svg>" : "", n2 = m;
  for (let A2 = 0; A2 < e; A2++) {
    const r2 = h2[A2];
    let a2, $, l3 = -1, c2 = 0;
    for (; c2 < r2.length && (n2.lastIndex = c2, $ = n2.exec(r2), $ !== null); ) c2 = n2.lastIndex, n2 === m ? $[1] === "!--" ? n2 = B : $[1] !== void 0 ? n2 = P$1 : $[2] !== void 0 ? (V.test($[2]) && (i2 = RegExp("</" + $[2], "g")), n2 = u$1) : $[3] !== void 0 && (n2 = u$1) : n2 === u$1 ? $[0] === ">" ? (n2 = i2 != null ? i2 : m, l3 = -1) : $[1] === void 0 ? l3 = -2 : (l3 = n2.lastIndex - $[2].length, a2 = $[1], n2 = $[3] === void 0 ? u$1 : $[3] === '"' ? U : R) : n2 === U || n2 === R ? n2 = u$1 : n2 === B || n2 === P$1 ? n2 = m : (n2 = u$1, i2 = void 0);
    const d2 = n2 === u$1 && h2[A2 + 1].startsWith("/>") ? " " : "";
    o2 += n2 === m ? r2 + F : l3 >= 0 ? (s2.push(a2), r2.slice(0, l3) + W + r2.slice(l3) + p$1 + d2) : r2 + p$1 + (l3 === -2 ? A2 : d2);
  }
  return [z(h2, o2 + (h2[e] || "<?>") + (t === 2 ? "</svg>" : "")), s2];
};
class T {
  constructor({ strings: t, _$litType$: e }, s2) {
    let i2;
    this.parts = [];
    let o2 = 0, n2 = 0;
    const A2 = t.length - 1, r2 = this.parts, [a2, $] = q(t, e);
    if (this.el = T.createElement(a2, s2), g$1.currentNode = this.el.content, e === 2) {
      const l3 = this.el.content.firstChild;
      l3.replaceWith(...l3.childNodes);
    }
    for (; (i2 = g$1.nextNode()) !== null && r2.length < A2; ) {
      if (i2.nodeType === 1) {
        if (i2.hasAttributes()) for (const l3 of i2.getAttributeNames()) if (l3.endsWith(W)) {
          const c2 = $[n2++], d2 = i2.getAttribute(l3).split(p$1), C = /([.?@])?(.*)/.exec(c2);
          r2.push({ type: 1, index: o2, name: C[2], strings: d2, ctor: C[1] === "." ? J : C[1] === "?" ? K : C[1] === "@" ? Q : M }), i2.removeAttribute(l3);
        } else l3.startsWith(p$1) && (r2.push({ type: 6, index: o2 }), i2.removeAttribute(l3));
        if (V.test(i2.tagName)) {
          const l3 = i2.textContent.split(p$1), c2 = l3.length - 1;
          if (c2 > 0) {
            i2.textContent = S ? S.emptyScript : "";
            for (let d2 = 0; d2 < c2; d2++) i2.append(l3[d2], x()), g$1.nextNode(), r2.push({ type: 2, index: ++o2 });
            i2.append(l3[c2], x());
          }
        }
      } else if (i2.nodeType === 8) if (i2.data === k) r2.push({ type: 2, index: o2 });
      else {
        let l3 = -1;
        for (; (l3 = i2.data.indexOf(p$1, l3 + 1)) !== -1; ) r2.push({ type: 7, index: o2 }), l3 += p$1.length - 1;
      }
      o2++;
    }
  }
  static createElement(t, e) {
    const s2 = v.createElement("template");
    return s2.innerHTML = t, s2;
  }
}
function f$1(h2, t, e = h2, s2) {
  var n2, A2, r2;
  if (t === N) return t;
  let i2 = s2 !== void 0 ? (n2 = e._$Co) == null ? void 0 : n2[s2] : e._$Cl;
  const o2 = H(t) ? void 0 : t._$litDirective$;
  return (i2 == null ? void 0 : i2.constructor) !== o2 && ((A2 = i2 == null ? void 0 : i2._$AO) == null || A2.call(i2, false), o2 === void 0 ? i2 = void 0 : (i2 = new o2(h2), i2._$AT(h2, e, s2)), s2 !== void 0 ? ((r2 = e._$Co) != null ? r2 : e._$Co = [])[s2] = i2 : e._$Cl = i2), i2 !== void 0 && (t = f$1(h2, i2._$AS(h2, t.values), i2, s2)), t;
}
class G {
  constructor(t, e) {
    this._$AV = [], this._$AN = void 0, this._$AD = t, this._$AM = e;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t) {
    var a2;
    const { el: { content: e }, parts: s2 } = this._$AD, i2 = ((a2 = t == null ? void 0 : t.creationScope) != null ? a2 : v).importNode(e, true);
    g$1.currentNode = i2;
    let o2 = g$1.nextNode(), n2 = 0, A2 = 0, r2 = s2[0];
    for (; r2 !== void 0; ) {
      if (n2 === r2.index) {
        let $;
        r2.type === 2 ? $ = new b$1(o2, o2.nextSibling, this, t) : r2.type === 1 ? $ = new r2.ctor(o2, r2.name, r2.strings, this, t) : r2.type === 6 && ($ = new X(o2, this, t)), this._$AV.push($), r2 = s2[++A2];
      }
      n2 !== (r2 == null ? void 0 : r2.index) && (o2 = g$1.nextNode(), n2++);
    }
    return g$1.currentNode = v, i2;
  }
  p(t) {
    let e = 0;
    for (const s2 of this._$AV) s2 !== void 0 && (s2.strings !== void 0 ? (s2._$AI(t, s2, e), e += s2.strings.length - 2) : s2._$AI(t[e])), e++;
  }
}
let b$1 = class b {
  get _$AU() {
    var t, e;
    return (e = (t = this._$AM) == null ? void 0 : t._$AU) != null ? e : this._$Cv;
  }
  constructor(t, e, s2, i2) {
    var o2;
    this.type = 2, this._$AH = _, this._$AN = void 0, this._$AA = t, this._$AB = e, this._$AM = s2, this.options = i2, this._$Cv = (o2 = i2 == null ? void 0 : i2.isConnected) != null ? o2 : true;
  }
  get parentNode() {
    let t = this._$AA.parentNode;
    const e = this._$AM;
    return e !== void 0 && (t == null ? void 0 : t.nodeType) === 11 && (t = e.parentNode), t;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t, e = this) {
    t = f$1(this, t, e), H(t) ? t === _ || t == null || t === "" ? (this._$AH !== _ && this._$AR(), this._$AH = _) : t !== this._$AH && t !== N && this._(t) : t._$litType$ !== void 0 ? this.$(t) : t.nodeType !== void 0 ? this.T(t) : Z(t) ? this.k(t) : this._(t);
  }
  S(t) {
    return this._$AA.parentNode.insertBefore(t, this._$AB);
  }
  T(t) {
    this._$AH !== t && (this._$AR(), this._$AH = this.S(t));
  }
  _(t) {
    this._$AH !== _ && H(this._$AH) ? this._$AA.nextSibling.data = t : this.T(v.createTextNode(t)), this._$AH = t;
  }
  $(t) {
    var o2;
    const { values: e, _$litType$: s2 } = t, i2 = typeof s2 == "number" ? this._$AC(t) : (s2.el === void 0 && (s2.el = T.createElement(z(s2.h, s2.h[0]), this.options)), s2);
    if (((o2 = this._$AH) == null ? void 0 : o2._$AD) === i2) this._$AH.p(e);
    else {
      const n2 = new G(i2, this), A2 = n2.u(this.options);
      n2.p(e), this.T(A2), this._$AH = n2;
    }
  }
  _$AC(t) {
    let e = j.get(t.strings);
    return e === void 0 && j.set(t.strings, e = new T(t)), e;
  }
  k(t) {
    D(this._$AH) || (this._$AH = [], this._$AR());
    const e = this._$AH;
    let s2, i2 = 0;
    for (const o2 of t) i2 === e.length ? e.push(s2 = new b(this.S(x()), this.S(x()), this, this.options)) : s2 = e[i2], s2._$AI(o2), i2++;
    i2 < e.length && (this._$AR(s2 && s2._$AB.nextSibling, i2), e.length = i2);
  }
  _$AR(t = this._$AA.nextSibling, e) {
    var s2;
    for ((s2 = this._$AP) == null ? void 0 : s2.call(this, false, true, e); t && t !== this._$AB; ) {
      const i2 = t.nextSibling;
      t.remove(), t = i2;
    }
  }
  setConnected(t) {
    var e;
    this._$AM === void 0 && (this._$Cv = t, (e = this._$AP) == null || e.call(this, t));
  }
};
class M {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t, e, s2, i2, o2) {
    this.type = 1, this._$AH = _, this._$AN = void 0, this.element = t, this.name = e, this._$AM = i2, this.options = o2, s2.length > 2 || s2[0] !== "" || s2[1] !== "" ? (this._$AH = Array(s2.length - 1).fill(new String()), this.strings = s2) : this._$AH = _;
  }
  _$AI(t, e = this, s2, i2) {
    const o2 = this.strings;
    let n2 = false;
    if (o2 === void 0) t = f$1(this, t, e, 0), n2 = !H(t) || t !== this._$AH && t !== N, n2 && (this._$AH = t);
    else {
      const A2 = t;
      let r2, a2;
      for (t = o2[0], r2 = 0; r2 < o2.length - 1; r2++) a2 = f$1(this, A2[s2 + r2], e, r2), a2 === N && (a2 = this._$AH[r2]), n2 || (n2 = !H(a2) || a2 !== this._$AH[r2]), a2 === _ ? t = _ : t !== _ && (t += (a2 != null ? a2 : "") + o2[r2 + 1]), this._$AH[r2] = a2;
    }
    n2 && !i2 && this.j(t);
  }
  j(t) {
    t === _ ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t != null ? t : "");
  }
}
class J extends M {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t) {
    this.element[this.name] = t === _ ? void 0 : t;
  }
}
class K extends M {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t) {
    this.element.toggleAttribute(this.name, !!t && t !== _);
  }
}
class Q extends M {
  constructor(t, e, s2, i2, o2) {
    super(t, e, s2, i2, o2), this.type = 5;
  }
  _$AI(t, e = this) {
    var n2;
    if ((t = (n2 = f$1(this, t, e, 0)) != null ? n2 : _) === N) return;
    const s2 = this._$AH, i2 = t === _ && s2 !== _ || t.capture !== s2.capture || t.once !== s2.once || t.passive !== s2.passive, o2 = t !== _ && (s2 === _ || i2);
    i2 && this.element.removeEventListener(this.name, this, s2), o2 && this.element.addEventListener(this.name, this, t), this._$AH = t;
  }
  handleEvent(t) {
    var e, s2;
    typeof this._$AH == "function" ? this._$AH.call((s2 = (e = this.options) == null ? void 0 : e.host) != null ? s2 : this.element, t) : this._$AH.handleEvent(t);
  }
}
class X {
  constructor(t, e, s2) {
    this.element = t, this.type = 6, this._$AN = void 0, this._$AM = e, this.options = s2;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t) {
    f$1(this, t);
  }
}
const E = y$1.litHtmlPolyfillSupport;
var L;
E == null || E(T, b$1), ((L = y$1.litHtmlVersions) != null ? L : y$1.litHtmlVersions = []).push("3.1.4");
const et = (h2, t, e) => {
  var o2, n2;
  const s2 = (o2 = e == null ? void 0 : e.renderBefore) != null ? o2 : t;
  let i2 = s2._$litPart$;
  if (i2 === void 0) {
    const A2 = (n2 = e == null ? void 0 : e.renderBefore) != null ? n2 : null;
    s2._$litPart$ = i2 = new b$1(t.insertBefore(x(), A2), A2, void 0, e != null ? e : {});
  }
  return i2._$AI(h2), i2;
};
class n extends c {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    var t;
    const e = super.createRenderRoot();
    return (t = this.renderOptions).renderBefore != null || (t.renderBefore = e.firstChild), e;
  }
  update(e) {
    const t = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = et(t, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    var e;
    super.connectedCallback(), (e = this._$Do) == null || e.setConnected(true);
  }
  disconnectedCallback() {
    var e;
    super.disconnectedCallback(), (e = this._$Do) == null || e.setConnected(false);
  }
  render() {
    return N;
  }
}
var o;
n._$litElement$ = true, n.finalized = true, (o = globalThis.litElementHydrateSupport) == null || o.call(globalThis, { LitElement: n });
const s$1 = globalThis.litElementPolyfillSupport;
s$1 == null || s$1({ LitElement: n });
var i;
((i = globalThis.litElementVersions) != null ? i : globalThis.litElementVersions = []).push("4.0.6");
const s = (e) => (t, n2) => {
  n2 !== void 0 ? n2.addInitializer(() => {
    customElements.define(e, t);
  }) : customElements.define(e, t);
};
var h = Object.defineProperty, f = Object.defineProperties;
var y = Object.getOwnPropertyDescriptors;
var p = Object.getOwnPropertySymbols;
var g = Object.prototype.hasOwnProperty, P = Object.prototype.propertyIsEnumerable;
var d = (e, t, r2) => t in e ? h(e, t, { enumerable: true, configurable: true, writable: true, value: r2 }) : e[t] = r2, l2 = (e, t) => {
  for (var r2 in t || (t = {}))
    g.call(t, r2) && d(e, r2, t[r2]);
  if (p)
    for (var r2 of p(t))
      P.call(t, r2) && d(e, r2, t[r2]);
  return e;
}, u = (e, t) => f(e, y(t));
const b2 = { attribute: true, type: String, converter: d$1, reflect: false, hasChanged: y$2 }, w = (e = b2, t, r2) => {
  const { kind: n2, metadata: s2 } = r2;
  let a2 = globalThis.litPropertyMetadata.get(s2);
  if (a2 === void 0 && globalThis.litPropertyMetadata.set(s2, a2 = /* @__PURE__ */ new Map()), a2.set(r2.name, e), n2 === "accessor") {
    const { name: o2 } = r2;
    return { set(i2) {
      const c2 = t.get.call(this);
      t.set.call(this, i2), this.requestUpdate(o2, c2, e);
    }, init(i2) {
      return i2 !== void 0 && this.P(o2, void 0, e), i2;
    } };
  }
  if (n2 === "setter") {
    const { name: o2 } = r2;
    return function(i2) {
      const c2 = this[o2];
      t.call(this, i2), this.requestUpdate(o2, c2, e);
    };
  }
  throw Error("Unsupported decorator location: " + n2);
};
function O(e) {
  return (t, r2) => typeof r2 == "object" ? w(e, t, r2) : ((n2, s2, a2) => {
    const o2 = s2.hasOwnProperty(a2);
    return s2.constructor.createProperty(a2, o2 ? u(l2({}, n2), { wrapped: true }) : n2), o2 ? Object.getOwnPropertyDescriptor(s2, a2) : void 0;
  })(e, t, r2);
}
export {
  O,
  Y,
  n,
  p$3 as p,
  s,
  tt as t
};
