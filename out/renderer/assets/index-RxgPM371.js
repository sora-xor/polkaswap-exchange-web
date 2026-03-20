import { e_ as ModalCtrl, e$ as ThemeCtrl, f0 as RouterCtrl, f1 as CoreUtil, f2 as ConfigCtrl, f3 as OptionsCtrl, f4 as ToastCtrl, f5 as ExplorerCtrl, f6 as EventsCtrl } from "./index-73GArslZ.js";
import { Q as QRCodeUtil } from "./browser-3QHqHj2W.js";
const t$3 = window, e$5 = t$3.ShadowRoot && (void 0 === t$3.ShadyCSS || t$3.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, s$3 = /* @__PURE__ */ Symbol(), n$5 = /* @__PURE__ */ new WeakMap();
let o$4 = class o {
  constructor(t2, e2, n2) {
    if (this._$cssResult$ = true, n2 !== s$3) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t2, this.t = e2;
  }
  get styleSheet() {
    let t2 = this.o;
    const s2 = this.t;
    if (e$5 && void 0 === t2) {
      const e2 = void 0 !== s2 && 1 === s2.length;
      e2 && (t2 = n$5.get(s2)), void 0 === t2 && ((this.o = t2 = new CSSStyleSheet()).replaceSync(this.cssText), e2 && n$5.set(s2, t2));
    }
    return t2;
  }
  toString() {
    return this.cssText;
  }
};
const r$2 = (t2) => new o$4("string" == typeof t2 ? t2 : t2 + "", void 0, s$3), i$3 = (t2, ...e2) => {
  const n2 = 1 === t2.length ? t2[0] : e2.reduce(((e3, s2, n3) => e3 + ((t3) => {
    if (true === t3._$cssResult$) return t3.cssText;
    if ("number" == typeof t3) return t3;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t3 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s2) + t2[n3 + 1]), t2[0]);
  return new o$4(n2, t2, s$3);
}, S$1 = (s2, n2) => {
  e$5 ? s2.adoptedStyleSheets = n2.map(((t2) => t2 instanceof CSSStyleSheet ? t2 : t2.styleSheet)) : n2.forEach(((e2) => {
    const n3 = document.createElement("style"), o3 = t$3.litNonce;
    void 0 !== o3 && n3.setAttribute("nonce", o3), n3.textContent = e2.cssText, s2.appendChild(n3);
  }));
}, c$1 = e$5 ? (t2) => t2 : (t2) => t2 instanceof CSSStyleSheet ? ((t3) => {
  let e2 = "";
  for (const s2 of t3.cssRules) e2 += s2.cssText;
  return r$2(e2);
})(t2) : t2;
var s$2;
const e$4 = window, r$1 = e$4.trustedTypes, h$1 = r$1 ? r$1.emptyScript : "", o$3 = e$4.reactiveElementPolyfillSupport, n$4 = { toAttribute(t2, i2) {
  switch (i2) {
    case Boolean:
      t2 = t2 ? h$1 : null;
      break;
    case Object:
    case Array:
      t2 = null == t2 ? t2 : JSON.stringify(t2);
  }
  return t2;
}, fromAttribute(t2, i2) {
  let s2 = t2;
  switch (i2) {
    case Boolean:
      s2 = null !== t2;
      break;
    case Number:
      s2 = null === t2 ? null : Number(t2);
      break;
    case Object:
    case Array:
      try {
        s2 = JSON.parse(t2);
      } catch (t3) {
        s2 = null;
      }
  }
  return s2;
} }, a$1 = (t2, i2) => i2 !== t2 && (i2 == i2 || t2 == t2), l$3 = { attribute: true, type: String, converter: n$4, reflect: false, hasChanged: a$1 }, d$1 = "finalized";
let u$1 = class u extends HTMLElement {
  constructor() {
    super(), this._$Ei = /* @__PURE__ */ new Map(), this.isUpdatePending = false, this.hasUpdated = false, this._$El = null, this._$Eu();
  }
  static addInitializer(t2) {
    var i2;
    this.finalize(), (null !== (i2 = this.h) && void 0 !== i2 ? i2 : this.h = []).push(t2);
  }
  static get observedAttributes() {
    this.finalize();
    const t2 = [];
    return this.elementProperties.forEach(((i2, s2) => {
      const e2 = this._$Ep(s2, i2);
      void 0 !== e2 && (this._$Ev.set(e2, s2), t2.push(e2));
    })), t2;
  }
  static createProperty(t2, i2 = l$3) {
    if (i2.state && (i2.attribute = false), this.finalize(), this.elementProperties.set(t2, i2), !i2.noAccessor && !this.prototype.hasOwnProperty(t2)) {
      const s2 = "symbol" == typeof t2 ? /* @__PURE__ */ Symbol() : "__" + t2, e2 = this.getPropertyDescriptor(t2, s2, i2);
      void 0 !== e2 && Object.defineProperty(this.prototype, t2, e2);
    }
  }
  static getPropertyDescriptor(t2, i2, s2) {
    return { get() {
      return this[i2];
    }, set(e2) {
      const r2 = this[t2];
      this[i2] = e2, this.requestUpdate(t2, r2, s2);
    }, configurable: true, enumerable: true };
  }
  static getPropertyOptions(t2) {
    return this.elementProperties.get(t2) || l$3;
  }
  static finalize() {
    if (this.hasOwnProperty(d$1)) return false;
    this[d$1] = true;
    const t2 = Object.getPrototypeOf(this);
    if (t2.finalize(), void 0 !== t2.h && (this.h = [...t2.h]), this.elementProperties = new Map(t2.elementProperties), this._$Ev = /* @__PURE__ */ new Map(), this.hasOwnProperty("properties")) {
      const t3 = this.properties, i2 = [...Object.getOwnPropertyNames(t3), ...Object.getOwnPropertySymbols(t3)];
      for (const s2 of i2) this.createProperty(s2, t3[s2]);
    }
    return this.elementStyles = this.finalizeStyles(this.styles), true;
  }
  static finalizeStyles(i2) {
    const s2 = [];
    if (Array.isArray(i2)) {
      const e2 = new Set(i2.flat(1 / 0).reverse());
      for (const i3 of e2) s2.unshift(c$1(i3));
    } else void 0 !== i2 && s2.push(c$1(i2));
    return s2;
  }
  static _$Ep(t2, i2) {
    const s2 = i2.attribute;
    return false === s2 ? void 0 : "string" == typeof s2 ? s2 : "string" == typeof t2 ? t2.toLowerCase() : void 0;
  }
  _$Eu() {
    var t2;
    this._$E_ = new Promise(((t3) => this.enableUpdating = t3)), this._$AL = /* @__PURE__ */ new Map(), this._$Eg(), this.requestUpdate(), null === (t2 = this.constructor.h) || void 0 === t2 || t2.forEach(((t3) => t3(this)));
  }
  addController(t2) {
    var i2, s2;
    (null !== (i2 = this._$ES) && void 0 !== i2 ? i2 : this._$ES = []).push(t2), void 0 !== this.renderRoot && this.isConnected && (null === (s2 = t2.hostConnected) || void 0 === s2 || s2.call(t2));
  }
  removeController(t2) {
    var i2;
    null === (i2 = this._$ES) || void 0 === i2 || i2.splice(this._$ES.indexOf(t2) >>> 0, 1);
  }
  _$Eg() {
    this.constructor.elementProperties.forEach(((t2, i2) => {
      this.hasOwnProperty(i2) && (this._$Ei.set(i2, this[i2]), delete this[i2]);
    }));
  }
  createRenderRoot() {
    var t2;
    const s2 = null !== (t2 = this.shadowRoot) && void 0 !== t2 ? t2 : this.attachShadow(this.constructor.shadowRootOptions);
    return S$1(s2, this.constructor.elementStyles), s2;
  }
  connectedCallback() {
    var t2;
    void 0 === this.renderRoot && (this.renderRoot = this.createRenderRoot()), this.enableUpdating(true), null === (t2 = this._$ES) || void 0 === t2 || t2.forEach(((t3) => {
      var i2;
      return null === (i2 = t3.hostConnected) || void 0 === i2 ? void 0 : i2.call(t3);
    }));
  }
  enableUpdating(t2) {
  }
  disconnectedCallback() {
    var t2;
    null === (t2 = this._$ES) || void 0 === t2 || t2.forEach(((t3) => {
      var i2;
      return null === (i2 = t3.hostDisconnected) || void 0 === i2 ? void 0 : i2.call(t3);
    }));
  }
  attributeChangedCallback(t2, i2, s2) {
    this._$AK(t2, s2);
  }
  _$EO(t2, i2, s2 = l$3) {
    var e2;
    const r2 = this.constructor._$Ep(t2, s2);
    if (void 0 !== r2 && true === s2.reflect) {
      const h2 = (void 0 !== (null === (e2 = s2.converter) || void 0 === e2 ? void 0 : e2.toAttribute) ? s2.converter : n$4).toAttribute(i2, s2.type);
      this._$El = t2, null == h2 ? this.removeAttribute(r2) : this.setAttribute(r2, h2), this._$El = null;
    }
  }
  _$AK(t2, i2) {
    var s2;
    const e2 = this.constructor, r2 = e2._$Ev.get(t2);
    if (void 0 !== r2 && this._$El !== r2) {
      const t3 = e2.getPropertyOptions(r2), h2 = "function" == typeof t3.converter ? { fromAttribute: t3.converter } : void 0 !== (null === (s2 = t3.converter) || void 0 === s2 ? void 0 : s2.fromAttribute) ? t3.converter : n$4;
      this._$El = r2, this[r2] = h2.fromAttribute(i2, t3.type), this._$El = null;
    }
  }
  requestUpdate(t2, i2, s2) {
    let e2 = true;
    void 0 !== t2 && (((s2 = s2 || this.constructor.getPropertyOptions(t2)).hasChanged || a$1)(this[t2], i2) ? (this._$AL.has(t2) || this._$AL.set(t2, i2), true === s2.reflect && this._$El !== t2 && (void 0 === this._$EC && (this._$EC = /* @__PURE__ */ new Map()), this._$EC.set(t2, s2))) : e2 = false), !this.isUpdatePending && e2 && (this._$E_ = this._$Ej());
  }
  async _$Ej() {
    this.isUpdatePending = true;
    try {
      await this._$E_;
    } catch (t3) {
      Promise.reject(t3);
    }
    const t2 = this.scheduleUpdate();
    return null != t2 && await t2, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    var t2;
    if (!this.isUpdatePending) return;
    this.hasUpdated, this._$Ei && (this._$Ei.forEach(((t3, i3) => this[i3] = t3)), this._$Ei = void 0);
    let i2 = false;
    const s2 = this._$AL;
    try {
      i2 = this.shouldUpdate(s2), i2 ? (this.willUpdate(s2), null === (t2 = this._$ES) || void 0 === t2 || t2.forEach(((t3) => {
        var i3;
        return null === (i3 = t3.hostUpdate) || void 0 === i3 ? void 0 : i3.call(t3);
      })), this.update(s2)) : this._$Ek();
    } catch (t3) {
      throw i2 = false, this._$Ek(), t3;
    }
    i2 && this._$AE(s2);
  }
  willUpdate(t2) {
  }
  _$AE(t2) {
    var i2;
    null === (i2 = this._$ES) || void 0 === i2 || i2.forEach(((t3) => {
      var i3;
      return null === (i3 = t3.hostUpdated) || void 0 === i3 ? void 0 : i3.call(t3);
    })), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t2)), this.updated(t2);
  }
  _$Ek() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = false;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$E_;
  }
  shouldUpdate(t2) {
    return true;
  }
  update(t2) {
    void 0 !== this._$EC && (this._$EC.forEach(((t3, i2) => this._$EO(i2, this[i2], t3))), this._$EC = void 0), this._$Ek();
  }
  updated(t2) {
  }
  firstUpdated(t2) {
  }
};
u$1[d$1] = true, u$1.elementProperties = /* @__PURE__ */ new Map(), u$1.elementStyles = [], u$1.shadowRootOptions = { mode: "open" }, null == o$3 || o$3({ ReactiveElement: u$1 }), (null !== (s$2 = e$4.reactiveElementVersions) && void 0 !== s$2 ? s$2 : e$4.reactiveElementVersions = []).push("1.6.3");
var t$2;
const i$2 = window, s$1 = i$2.trustedTypes, e$3 = s$1 ? s$1.createPolicy("lit-html", { createHTML: (t2) => t2 }) : void 0, o$2 = "$lit$", n$3 = `lit$${(Math.random() + "").slice(9)}$`, l$2 = "?" + n$3, h = `<${l$2}>`, r = document, u2 = () => r.createComment(""), d = (t2) => null === t2 || "object" != typeof t2 && "function" != typeof t2, c = Array.isArray, v = (t2) => c(t2) || "function" == typeof (null == t2 ? void 0 : t2[Symbol.iterator]), a = "[ 	\n\f\r]", f = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, _ = /-->/g, m = />/g, p = RegExp(`>|${a}(?:([^\\s"'>=/]+)(${a}*=${a}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), g = /'/g, $ = /"/g, y = /^(?:script|style|textarea|title)$/i, w = (t2) => (i2, ...s2) => ({ _$litType$: t2, strings: i2, values: s2 }), x = w(1), b = w(2), T = /* @__PURE__ */ Symbol.for("lit-noChange"), A = /* @__PURE__ */ Symbol.for("lit-nothing"), E = /* @__PURE__ */ new WeakMap(), C = r.createTreeWalker(r, 129, null, false);
function P(t2, i2) {
  if (!Array.isArray(t2) || !t2.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== e$3 ? e$3.createHTML(i2) : i2;
}
const V = (t2, i2) => {
  const s2 = t2.length - 1, e2 = [];
  let l2, r2 = 2 === i2 ? "<svg>" : "", u3 = f;
  for (let i3 = 0; i3 < s2; i3++) {
    const s3 = t2[i3];
    let d2, c2, v2 = -1, a2 = 0;
    for (; a2 < s3.length && (u3.lastIndex = a2, c2 = u3.exec(s3), null !== c2); ) a2 = u3.lastIndex, u3 === f ? "!--" === c2[1] ? u3 = _ : void 0 !== c2[1] ? u3 = m : void 0 !== c2[2] ? (y.test(c2[2]) && (l2 = RegExp("</" + c2[2], "g")), u3 = p) : void 0 !== c2[3] && (u3 = p) : u3 === p ? ">" === c2[0] ? (u3 = null != l2 ? l2 : f, v2 = -1) : void 0 === c2[1] ? v2 = -2 : (v2 = u3.lastIndex - c2[2].length, d2 = c2[1], u3 = void 0 === c2[3] ? p : '"' === c2[3] ? $ : g) : u3 === $ || u3 === g ? u3 = p : u3 === _ || u3 === m ? u3 = f : (u3 = p, l2 = void 0);
    const w2 = u3 === p && t2[i3 + 1].startsWith("/>") ? " " : "";
    r2 += u3 === f ? s3 + h : v2 >= 0 ? (e2.push(d2), s3.slice(0, v2) + o$2 + s3.slice(v2) + n$3 + w2) : s3 + n$3 + (-2 === v2 ? (e2.push(void 0), i3) : w2);
  }
  return [P(t2, r2 + (t2[s2] || "<?>") + (2 === i2 ? "</svg>" : "")), e2];
};
class N {
  constructor({ strings: t2, _$litType$: i2 }, e2) {
    let h2;
    this.parts = [];
    let r2 = 0, d2 = 0;
    const c2 = t2.length - 1, v2 = this.parts, [a2, f2] = V(t2, i2);
    if (this.el = N.createElement(a2, e2), C.currentNode = this.el.content, 2 === i2) {
      const t3 = this.el.content, i3 = t3.firstChild;
      i3.remove(), t3.append(...i3.childNodes);
    }
    for (; null !== (h2 = C.nextNode()) && v2.length < c2; ) {
      if (1 === h2.nodeType) {
        if (h2.hasAttributes()) {
          const t3 = [];
          for (const i3 of h2.getAttributeNames()) if (i3.endsWith(o$2) || i3.startsWith(n$3)) {
            const s2 = f2[d2++];
            if (t3.push(i3), void 0 !== s2) {
              const t4 = h2.getAttribute(s2.toLowerCase() + o$2).split(n$3), i4 = /([.?@])?(.*)/.exec(s2);
              v2.push({ type: 1, index: r2, name: i4[2], strings: t4, ctor: "." === i4[1] ? H : "?" === i4[1] ? L : "@" === i4[1] ? z : k });
            } else v2.push({ type: 6, index: r2 });
          }
          for (const i3 of t3) h2.removeAttribute(i3);
        }
        if (y.test(h2.tagName)) {
          const t3 = h2.textContent.split(n$3), i3 = t3.length - 1;
          if (i3 > 0) {
            h2.textContent = s$1 ? s$1.emptyScript : "";
            for (let s2 = 0; s2 < i3; s2++) h2.append(t3[s2], u2()), C.nextNode(), v2.push({ type: 2, index: ++r2 });
            h2.append(t3[i3], u2());
          }
        }
      } else if (8 === h2.nodeType) if (h2.data === l$2) v2.push({ type: 2, index: r2 });
      else {
        let t3 = -1;
        for (; -1 !== (t3 = h2.data.indexOf(n$3, t3 + 1)); ) v2.push({ type: 7, index: r2 }), t3 += n$3.length - 1;
      }
      r2++;
    }
  }
  static createElement(t2, i2) {
    const s2 = r.createElement("template");
    return s2.innerHTML = t2, s2;
  }
}
function S(t2, i2, s2 = t2, e2) {
  var o3, n2, l2, h2;
  if (i2 === T) return i2;
  let r2 = void 0 !== e2 ? null === (o3 = s2._$Co) || void 0 === o3 ? void 0 : o3[e2] : s2._$Cl;
  const u3 = d(i2) ? void 0 : i2._$litDirective$;
  return (null == r2 ? void 0 : r2.constructor) !== u3 && (null === (n2 = null == r2 ? void 0 : r2._$AO) || void 0 === n2 || n2.call(r2, false), void 0 === u3 ? r2 = void 0 : (r2 = new u3(t2), r2._$AT(t2, s2, e2)), void 0 !== e2 ? (null !== (l2 = (h2 = s2)._$Co) && void 0 !== l2 ? l2 : h2._$Co = [])[e2] = r2 : s2._$Cl = r2), void 0 !== r2 && (i2 = S(t2, r2._$AS(t2, i2.values), r2, e2)), i2;
}
class M {
  constructor(t2, i2) {
    this._$AV = [], this._$AN = void 0, this._$AD = t2, this._$AM = i2;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t2) {
    var i2;
    const { el: { content: s2 }, parts: e2 } = this._$AD, o3 = (null !== (i2 = null == t2 ? void 0 : t2.creationScope) && void 0 !== i2 ? i2 : r).importNode(s2, true);
    C.currentNode = o3;
    let n2 = C.nextNode(), l2 = 0, h2 = 0, u3 = e2[0];
    for (; void 0 !== u3; ) {
      if (l2 === u3.index) {
        let i3;
        2 === u3.type ? i3 = new R(n2, n2.nextSibling, this, t2) : 1 === u3.type ? i3 = new u3.ctor(n2, u3.name, u3.strings, this, t2) : 6 === u3.type && (i3 = new Z(n2, this, t2)), this._$AV.push(i3), u3 = e2[++h2];
      }
      l2 !== (null == u3 ? void 0 : u3.index) && (n2 = C.nextNode(), l2++);
    }
    return C.currentNode = r, o3;
  }
  v(t2) {
    let i2 = 0;
    for (const s2 of this._$AV) void 0 !== s2 && (void 0 !== s2.strings ? (s2._$AI(t2, s2, i2), i2 += s2.strings.length - 2) : s2._$AI(t2[i2])), i2++;
  }
}
class R {
  constructor(t2, i2, s2, e2) {
    var o3;
    this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t2, this._$AB = i2, this._$AM = s2, this.options = e2, this._$Cp = null === (o3 = null == e2 ? void 0 : e2.isConnected) || void 0 === o3 || o3;
  }
  get _$AU() {
    var t2, i2;
    return null !== (i2 = null === (t2 = this._$AM) || void 0 === t2 ? void 0 : t2._$AU) && void 0 !== i2 ? i2 : this._$Cp;
  }
  get parentNode() {
    let t2 = this._$AA.parentNode;
    const i2 = this._$AM;
    return void 0 !== i2 && 11 === (null == t2 ? void 0 : t2.nodeType) && (t2 = i2.parentNode), t2;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t2, i2 = this) {
    t2 = S(this, t2, i2), d(t2) ? t2 === A || null == t2 || "" === t2 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t2 !== this._$AH && t2 !== T && this._(t2) : void 0 !== t2._$litType$ ? this.g(t2) : void 0 !== t2.nodeType ? this.$(t2) : v(t2) ? this.T(t2) : this._(t2);
  }
  k(t2) {
    return this._$AA.parentNode.insertBefore(t2, this._$AB);
  }
  $(t2) {
    this._$AH !== t2 && (this._$AR(), this._$AH = this.k(t2));
  }
  _(t2) {
    this._$AH !== A && d(this._$AH) ? this._$AA.nextSibling.data = t2 : this.$(r.createTextNode(t2)), this._$AH = t2;
  }
  g(t2) {
    var i2;
    const { values: s2, _$litType$: e2 } = t2, o3 = "number" == typeof e2 ? this._$AC(t2) : (void 0 === e2.el && (e2.el = N.createElement(P(e2.h, e2.h[0]), this.options)), e2);
    if ((null === (i2 = this._$AH) || void 0 === i2 ? void 0 : i2._$AD) === o3) this._$AH.v(s2);
    else {
      const t3 = new M(o3, this), i3 = t3.u(this.options);
      t3.v(s2), this.$(i3), this._$AH = t3;
    }
  }
  _$AC(t2) {
    let i2 = E.get(t2.strings);
    return void 0 === i2 && E.set(t2.strings, i2 = new N(t2)), i2;
  }
  T(t2) {
    c(this._$AH) || (this._$AH = [], this._$AR());
    const i2 = this._$AH;
    let s2, e2 = 0;
    for (const o3 of t2) e2 === i2.length ? i2.push(s2 = new R(this.k(u2()), this.k(u2()), this, this.options)) : s2 = i2[e2], s2._$AI(o3), e2++;
    e2 < i2.length && (this._$AR(s2 && s2._$AB.nextSibling, e2), i2.length = e2);
  }
  _$AR(t2 = this._$AA.nextSibling, i2) {
    var s2;
    for (null === (s2 = this._$AP) || void 0 === s2 || s2.call(this, false, true, i2); t2 && t2 !== this._$AB; ) {
      const i3 = t2.nextSibling;
      t2.remove(), t2 = i3;
    }
  }
  setConnected(t2) {
    var i2;
    void 0 === this._$AM && (this._$Cp = t2, null === (i2 = this._$AP) || void 0 === i2 || i2.call(this, t2));
  }
}
class k {
  constructor(t2, i2, s2, e2, o3) {
    this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t2, this.name = i2, this._$AM = e2, this.options = o3, s2.length > 2 || "" !== s2[0] || "" !== s2[1] ? (this._$AH = Array(s2.length - 1).fill(new String()), this.strings = s2) : this._$AH = A;
  }
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t2, i2 = this, s2, e2) {
    const o3 = this.strings;
    let n2 = false;
    if (void 0 === o3) t2 = S(this, t2, i2, 0), n2 = !d(t2) || t2 !== this._$AH && t2 !== T, n2 && (this._$AH = t2);
    else {
      const e3 = t2;
      let l2, h2;
      for (t2 = o3[0], l2 = 0; l2 < o3.length - 1; l2++) h2 = S(this, e3[s2 + l2], i2, l2), h2 === T && (h2 = this._$AH[l2]), n2 || (n2 = !d(h2) || h2 !== this._$AH[l2]), h2 === A ? t2 = A : t2 !== A && (t2 += (null != h2 ? h2 : "") + o3[l2 + 1]), this._$AH[l2] = h2;
    }
    n2 && !e2 && this.j(t2);
  }
  j(t2) {
    t2 === A ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, null != t2 ? t2 : "");
  }
}
class H extends k {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t2) {
    this.element[this.name] = t2 === A ? void 0 : t2;
  }
}
const I = s$1 ? s$1.emptyScript : "";
class L extends k {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t2) {
    t2 && t2 !== A ? this.element.setAttribute(this.name, I) : this.element.removeAttribute(this.name);
  }
}
class z extends k {
  constructor(t2, i2, s2, e2, o3) {
    super(t2, i2, s2, e2, o3), this.type = 5;
  }
  _$AI(t2, i2 = this) {
    var s2;
    if ((t2 = null !== (s2 = S(this, t2, i2, 0)) && void 0 !== s2 ? s2 : A) === T) return;
    const e2 = this._$AH, o3 = t2 === A && e2 !== A || t2.capture !== e2.capture || t2.once !== e2.once || t2.passive !== e2.passive, n2 = t2 !== A && (e2 === A || o3);
    o3 && this.element.removeEventListener(this.name, this, e2), n2 && this.element.addEventListener(this.name, this, t2), this._$AH = t2;
  }
  handleEvent(t2) {
    var i2, s2;
    "function" == typeof this._$AH ? this._$AH.call(null !== (s2 = null === (i2 = this.options) || void 0 === i2 ? void 0 : i2.host) && void 0 !== s2 ? s2 : this.element, t2) : this._$AH.handleEvent(t2);
  }
}
class Z {
  constructor(t2, i2, s2) {
    this.element = t2, this.type = 6, this._$AN = void 0, this._$AM = i2, this.options = s2;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t2) {
    S(this, t2);
  }
}
const B = i$2.litHtmlPolyfillSupport;
null == B || B(N, R), (null !== (t$2 = i$2.litHtmlVersions) && void 0 !== t$2 ? t$2 : i$2.litHtmlVersions = []).push("2.8.0");
const D = (t2, i2, s2) => {
  var e2, o3;
  const n2 = null !== (e2 = null == s2 ? void 0 : s2.renderBefore) && void 0 !== e2 ? e2 : i2;
  let l2 = n2._$litPart$;
  if (void 0 === l2) {
    const t3 = null !== (o3 = null == s2 ? void 0 : s2.renderBefore) && void 0 !== o3 ? o3 : null;
    n2._$litPart$ = l2 = new R(i2.insertBefore(u2(), t3), t3, void 0, null != s2 ? s2 : {});
  }
  return l2._$AI(t2), l2;
};
var l$1, o$1;
class s extends u$1 {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    var t2, e2;
    const i2 = super.createRenderRoot();
    return null !== (t2 = (e2 = this.renderOptions).renderBefore) && void 0 !== t2 || (e2.renderBefore = i2.firstChild), i2;
  }
  update(t2) {
    const i2 = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t2), this._$Do = D(i2, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    var t2;
    super.connectedCallback(), null === (t2 = this._$Do) || void 0 === t2 || t2.setConnected(true);
  }
  disconnectedCallback() {
    var t2;
    super.disconnectedCallback(), null === (t2 = this._$Do) || void 0 === t2 || t2.setConnected(false);
  }
  render() {
    return T;
  }
}
s.finalized = true, s._$litElement$ = true, null === (l$1 = globalThis.litElementHydrateSupport) || void 0 === l$1 || l$1.call(globalThis, { LitElement: s });
const n$2 = globalThis.litElementPolyfillSupport;
null == n$2 || n$2({ LitElement: s });
(null !== (o$1 = globalThis.litElementVersions) && void 0 !== o$1 ? o$1 : globalThis.litElementVersions = []).push("3.3.3");
const e$2 = (e2) => (n2) => "function" == typeof n2 ? ((e3, n3) => (customElements.define(e3, n3), n3))(e2, n2) : ((e3, n3) => {
  const { kind: t2, elements: s2 } = n3;
  return { kind: t2, elements: s2, finisher(n4) {
    customElements.define(e3, n4);
  } };
})(e2, n2);
const i$1 = (i2, e2) => "method" === e2.kind && e2.descriptor && !("value" in e2.descriptor) ? { ...e2, finisher(n2) {
  n2.createProperty(e2.key, i2);
} } : { kind: "field", key: /* @__PURE__ */ Symbol(), placement: "own", descriptor: {}, originalKey: e2.key, initializer() {
  "function" == typeof e2.initializer && (this[e2.key] = e2.initializer.call(this));
}, finisher(n2) {
  n2.createProperty(e2.key, i2);
} }, e$1 = (i2, e2, n2) => {
  e2.constructor.createProperty(n2, i2);
};
function n$1(n2) {
  return (t2, o3) => void 0 !== o3 ? e$1(n2, t2, o3) : i$1(n2, t2);
}
function t$1(t2) {
  return n$1({ ...t2, state: true });
}
var n;
null != (null === (n = window.HTMLSlotElement) || void 0 === n ? void 0 : n.prototype.assignedElements) ? (o3, n2) => o3.assignedElements(n2) : (o3, n2) => o3.assignedNodes(n2).filter(((o4) => o4.nodeType === Node.ELEMENT_NODE));
const t = { ATTRIBUTE: 1 }, e = (t2) => (...e2) => ({ _$litDirective$: t2, values: e2 });
class i {
  constructor(t2) {
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AT(t2, e2, i2) {
    this._$Ct = t2, this._$AM = e2, this._$Ci = i2;
  }
  _$AS(t2, e2) {
    return this.update(t2, e2);
  }
  update(t2, e2) {
    return this.render(...e2);
  }
}
const o2 = e(class extends i {
  constructor(t$12) {
    var i2;
    if (super(t$12), t$12.type !== t.ATTRIBUTE || "class" !== t$12.name || (null === (i2 = t$12.strings) || void 0 === i2 ? void 0 : i2.length) > 2) throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.");
  }
  render(t2) {
    return " " + Object.keys(t2).filter(((i2) => t2[i2])).join(" ") + " ";
  }
  update(i2, [s2]) {
    var r2, o3;
    if (void 0 === this.it) {
      this.it = /* @__PURE__ */ new Set(), void 0 !== i2.strings && (this.nt = new Set(i2.strings.join(" ").split(/\s/).filter(((t2) => "" !== t2))));
      for (const t2 in s2) s2[t2] && !(null === (r2 = this.nt) || void 0 === r2 ? void 0 : r2.has(t2)) && this.it.add(t2);
      return this.render(s2);
    }
    const e2 = i2.element.classList;
    this.it.forEach(((t2) => {
      t2 in s2 || (e2.remove(t2), this.it.delete(t2));
    }));
    for (const t2 in s2) {
      const i3 = !!s2[t2];
      i3 === this.it.has(t2) || (null === (o3 = this.nt) || void 0 === o3 ? void 0 : o3.has(t2)) || (i3 ? (e2.add(t2), this.it.add(t2)) : (e2.remove(t2), this.it.delete(t2)));
    }
    return T;
  }
});
function addUniqueItem(array, item) {
  array.indexOf(item) === -1 && array.push(item);
}
const clamp = (min, max, v2) => Math.min(Math.max(v2, min), max);
const defaults = {
  duration: 0.3,
  delay: 0,
  endDelay: 0,
  repeat: 0,
  easing: "ease"
};
const isNumber = (value) => typeof value === "number";
const isEasingList = (easing) => Array.isArray(easing) && !isNumber(easing[0]);
const wrap = (min, max, v2) => {
  const rangeSize = max - min;
  return ((v2 - min) % rangeSize + rangeSize) % rangeSize + min;
};
function getEasingForSegment(easing, i2) {
  return isEasingList(easing) ? easing[wrap(0, easing.length, i2)] : easing;
}
const mix = (min, max, progress2) => -progress2 * min + progress2 * max + min;
const noop = () => {
};
const noopReturn = (v2) => v2;
const progress = (min, max, value) => max - min === 0 ? 1 : (value - min) / (max - min);
function fillOffset(offset, remaining) {
  const min = offset[offset.length - 1];
  for (let i2 = 1; i2 <= remaining; i2++) {
    const offsetProgress = progress(0, remaining, i2);
    offset.push(mix(min, 1, offsetProgress));
  }
}
function defaultOffset(length) {
  const offset = [0];
  fillOffset(offset, length - 1);
  return offset;
}
function interpolate(output, input = defaultOffset(output.length), easing = noopReturn) {
  const length = output.length;
  const remainder = length - input.length;
  remainder > 0 && fillOffset(input, remainder);
  return (t2) => {
    let i2 = 0;
    for (; i2 < length - 2; i2++) {
      if (t2 < input[i2 + 1])
        break;
    }
    let progressInRange = clamp(0, 1, progress(input[i2], input[i2 + 1], t2));
    const segmentEasing = getEasingForSegment(easing, i2);
    progressInRange = segmentEasing(progressInRange);
    return mix(output[i2], output[i2 + 1], progressInRange);
  };
}
const isCubicBezier = (easing) => Array.isArray(easing) && isNumber(easing[0]);
const isEasingGenerator = (easing) => typeof easing === "object" && Boolean(easing.createAnimation);
const isFunction = (value) => typeof value === "function";
const isString = (value) => typeof value === "string";
const time = {
  ms: (seconds) => seconds * 1e3,
  s: (milliseconds) => milliseconds / 1e3
};
const calcBezier = (t2, a1, a2) => (((1 - 3 * a2 + 3 * a1) * t2 + (3 * a2 - 6 * a1)) * t2 + 3 * a1) * t2;
const subdivisionPrecision = 1e-7;
const subdivisionMaxIterations = 12;
function binarySubdivide(x2, lowerBound, upperBound, mX1, mX2) {
  let currentX;
  let currentT;
  let i2 = 0;
  do {
    currentT = lowerBound + (upperBound - lowerBound) / 2;
    currentX = calcBezier(currentT, mX1, mX2) - x2;
    if (currentX > 0) {
      upperBound = currentT;
    } else {
      lowerBound = currentT;
    }
  } while (Math.abs(currentX) > subdivisionPrecision && ++i2 < subdivisionMaxIterations);
  return currentT;
}
function cubicBezier(mX1, mY1, mX2, mY2) {
  if (mX1 === mY1 && mX2 === mY2)
    return noopReturn;
  const getTForX = (aX) => binarySubdivide(aX, 0, 1, mX1, mX2);
  return (t2) => t2 === 0 || t2 === 1 ? t2 : calcBezier(getTForX(t2), mY1, mY2);
}
const steps = (steps2, direction = "end") => (progress2) => {
  progress2 = direction === "end" ? Math.min(progress2, 0.999) : Math.max(progress2, 1e-3);
  const expanded = progress2 * steps2;
  const rounded = direction === "end" ? Math.floor(expanded) : Math.ceil(expanded);
  return clamp(0, 1, rounded / steps2);
};
const namedEasings = {
  ease: cubicBezier(0.25, 0.1, 0.25, 1),
  "ease-in": cubicBezier(0.42, 0, 1, 1),
  "ease-in-out": cubicBezier(0.42, 0, 0.58, 1),
  "ease-out": cubicBezier(0, 0, 0.58, 1)
};
const functionArgsRegex = /\((.*?)\)/;
function getEasingFunction(definition) {
  if (isFunction(definition))
    return definition;
  if (isCubicBezier(definition))
    return cubicBezier(...definition);
  const namedEasing = namedEasings[definition];
  if (namedEasing)
    return namedEasing;
  if (definition.startsWith("steps")) {
    const args = functionArgsRegex.exec(definition);
    if (args) {
      const argsArray = args[1].split(",");
      return steps(parseFloat(argsArray[0]), argsArray[1].trim());
    }
  }
  return noopReturn;
}
class Animation {
  constructor(output, keyframes = [0, 1], { easing, duration: initialDuration = defaults.duration, delay = defaults.delay, endDelay = defaults.endDelay, repeat = defaults.repeat, offset, direction = "normal", autoplay = true } = {}) {
    this.startTime = null;
    this.rate = 1;
    this.t = 0;
    this.cancelTimestamp = null;
    this.easing = noopReturn;
    this.duration = 0;
    this.totalDuration = 0;
    this.repeat = 0;
    this.playState = "idle";
    this.finished = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
    easing = easing || defaults.easing;
    if (isEasingGenerator(easing)) {
      const custom = easing.createAnimation(keyframes);
      easing = custom.easing;
      keyframes = custom.keyframes || keyframes;
      initialDuration = custom.duration || initialDuration;
    }
    this.repeat = repeat;
    this.easing = isEasingList(easing) ? noopReturn : getEasingFunction(easing);
    this.updateDuration(initialDuration);
    const interpolate$1 = interpolate(keyframes, offset, isEasingList(easing) ? easing.map(getEasingFunction) : noopReturn);
    this.tick = (timestamp) => {
      var _a;
      delay = delay;
      let t2 = 0;
      if (this.pauseTime !== void 0) {
        t2 = this.pauseTime;
      } else {
        t2 = (timestamp - this.startTime) * this.rate;
      }
      this.t = t2;
      t2 /= 1e3;
      t2 = Math.max(t2 - delay, 0);
      if (this.playState === "finished" && this.pauseTime === void 0) {
        t2 = this.totalDuration;
      }
      const progress2 = t2 / this.duration;
      let currentIteration = Math.floor(progress2);
      let iterationProgress = progress2 % 1;
      if (!iterationProgress && progress2 >= 1) {
        iterationProgress = 1;
      }
      iterationProgress === 1 && currentIteration--;
      const iterationIsOdd = currentIteration % 2;
      if (direction === "reverse" || direction === "alternate" && iterationIsOdd || direction === "alternate-reverse" && !iterationIsOdd) {
        iterationProgress = 1 - iterationProgress;
      }
      const p2 = t2 >= this.totalDuration ? 1 : Math.min(iterationProgress, 1);
      const latest = interpolate$1(this.easing(p2));
      output(latest);
      const isAnimationFinished = this.pauseTime === void 0 && (this.playState === "finished" || t2 >= this.totalDuration + endDelay);
      if (isAnimationFinished) {
        this.playState = "finished";
        (_a = this.resolve) === null || _a === void 0 ? void 0 : _a.call(this, latest);
      } else if (this.playState !== "idle") {
        this.frameRequestId = requestAnimationFrame(this.tick);
      }
    };
    if (autoplay)
      this.play();
  }
  play() {
    const now = performance.now();
    this.playState = "running";
    if (this.pauseTime !== void 0) {
      this.startTime = now - this.pauseTime;
    } else if (!this.startTime) {
      this.startTime = now;
    }
    this.cancelTimestamp = this.startTime;
    this.pauseTime = void 0;
    this.frameRequestId = requestAnimationFrame(this.tick);
  }
  pause() {
    this.playState = "paused";
    this.pauseTime = this.t;
  }
  finish() {
    this.playState = "finished";
    this.tick(0);
  }
  stop() {
    var _a;
    this.playState = "idle";
    if (this.frameRequestId !== void 0) {
      cancelAnimationFrame(this.frameRequestId);
    }
    (_a = this.reject) === null || _a === void 0 ? void 0 : _a.call(this, false);
  }
  cancel() {
    this.stop();
    this.tick(this.cancelTimestamp);
  }
  reverse() {
    this.rate *= -1;
  }
  commitStyles() {
  }
  updateDuration(duration) {
    this.duration = duration;
    this.totalDuration = duration * (this.repeat + 1);
  }
  get currentTime() {
    return this.t;
  }
  set currentTime(t2) {
    if (this.pauseTime !== void 0 || this.rate === 0) {
      this.pauseTime = t2;
    } else {
      this.startTime = performance.now() - t2 / this.rate;
    }
  }
  get playbackRate() {
    return this.rate;
  }
  set playbackRate(rate) {
    this.rate = rate;
  }
}
class MotionValue {
  setAnimation(animation) {
    this.animation = animation;
    animation === null || animation === void 0 ? void 0 : animation.finished.then(() => this.clearAnimation()).catch(() => {
    });
  }
  clearAnimation() {
    this.animation = this.generator = void 0;
  }
}
const data = /* @__PURE__ */ new WeakMap();
function getAnimationData(element) {
  if (!data.has(element)) {
    data.set(element, {
      transforms: [],
      values: /* @__PURE__ */ new Map()
    });
  }
  return data.get(element);
}
function getMotionValue(motionValues, name) {
  if (!motionValues.has(name)) {
    motionValues.set(name, new MotionValue());
  }
  return motionValues.get(name);
}
const axes = ["", "X", "Y", "Z"];
const order = ["translate", "scale", "rotate", "skew"];
const transformAlias = {
  x: "translateX",
  y: "translateY",
  z: "translateZ"
};
const rotation = {
  syntax: "<angle>",
  initialValue: "0deg",
  toDefaultUnit: (v2) => v2 + "deg"
};
const baseTransformProperties = {
  translate: {
    syntax: "<length-percentage>",
    initialValue: "0px",
    toDefaultUnit: (v2) => v2 + "px"
  },
  rotate: rotation,
  scale: {
    syntax: "<number>",
    initialValue: 1,
    toDefaultUnit: noopReturn
  },
  skew: rotation
};
const transformDefinitions = /* @__PURE__ */ new Map();
const asTransformCssVar = (name) => `--motion-${name}`;
const transforms = ["x", "y", "z"];
order.forEach((name) => {
  axes.forEach((axis) => {
    transforms.push(name + axis);
    transformDefinitions.set(asTransformCssVar(name + axis), baseTransformProperties[name]);
  });
});
const compareTransformOrder = (a2, b2) => transforms.indexOf(a2) - transforms.indexOf(b2);
const transformLookup = new Set(transforms);
const isTransform = (name) => transformLookup.has(name);
const addTransformToElement = (element, name) => {
  if (transformAlias[name])
    name = transformAlias[name];
  const { transforms: transforms2 } = getAnimationData(element);
  addUniqueItem(transforms2, name);
  element.style.transform = buildTransformTemplate(transforms2);
};
const buildTransformTemplate = (transforms2) => transforms2.sort(compareTransformOrder).reduce(transformListToString, "").trim();
const transformListToString = (template, name) => `${template} ${name}(var(${asTransformCssVar(name)}))`;
const isCssVar = (name) => name.startsWith("--");
const registeredProperties = /* @__PURE__ */ new Set();
function registerCssVariable(name) {
  if (registeredProperties.has(name))
    return;
  registeredProperties.add(name);
  try {
    const { syntax, initialValue } = transformDefinitions.has(name) ? transformDefinitions.get(name) : {};
    CSS.registerProperty({
      name,
      inherits: false,
      syntax,
      initialValue
    });
  } catch (e2) {
  }
}
const testAnimation = (keyframes, options) => document.createElement("div").animate(keyframes, options);
const featureTests = {
  cssRegisterProperty: () => typeof CSS !== "undefined" && Object.hasOwnProperty.call(CSS, "registerProperty"),
  waapi: () => Object.hasOwnProperty.call(Element.prototype, "animate"),
  partialKeyframes: () => {
    try {
      testAnimation({ opacity: [1] });
    } catch (e2) {
      return false;
    }
    return true;
  },
  finished: () => Boolean(testAnimation({ opacity: [0, 1] }, { duration: 1e-3 }).finished),
  linearEasing: () => {
    try {
      testAnimation({ opacity: 0 }, { easing: "linear(0, 1)" });
    } catch (e2) {
      return false;
    }
    return true;
  }
};
const results = {};
const supports = {};
for (const key in featureTests) {
  supports[key] = () => {
    if (results[key] === void 0)
      results[key] = featureTests[key]();
    return results[key];
  };
}
const resolution = 0.015;
const generateLinearEasingPoints = (easing, duration) => {
  let points = "";
  const numPoints = Math.round(duration / resolution);
  for (let i2 = 0; i2 < numPoints; i2++) {
    points += easing(progress(0, numPoints - 1, i2)) + ", ";
  }
  return points.substring(0, points.length - 2);
};
const convertEasing = (easing, duration) => {
  if (isFunction(easing)) {
    return supports.linearEasing() ? `linear(${generateLinearEasingPoints(easing, duration)})` : defaults.easing;
  } else {
    return isCubicBezier(easing) ? cubicBezierAsString(easing) : easing;
  }
};
const cubicBezierAsString = ([a2, b2, c2, d2]) => `cubic-bezier(${a2}, ${b2}, ${c2}, ${d2})`;
function hydrateKeyframes(keyframes, readInitialValue) {
  for (let i2 = 0; i2 < keyframes.length; i2++) {
    if (keyframes[i2] === null) {
      keyframes[i2] = i2 ? keyframes[i2 - 1] : readInitialValue();
    }
  }
  return keyframes;
}
const keyframesList = (keyframes) => Array.isArray(keyframes) ? keyframes : [keyframes];
function getStyleName(key) {
  if (transformAlias[key])
    key = transformAlias[key];
  return isTransform(key) ? asTransformCssVar(key) : key;
}
const style = {
  get: (element, name) => {
    name = getStyleName(name);
    let value = isCssVar(name) ? element.style.getPropertyValue(name) : getComputedStyle(element)[name];
    if (!value && value !== 0) {
      const definition = transformDefinitions.get(name);
      if (definition)
        value = definition.initialValue;
    }
    return value;
  },
  set: (element, name, value) => {
    name = getStyleName(name);
    if (isCssVar(name)) {
      element.style.setProperty(name, value);
    } else {
      element.style[name] = value;
    }
  }
};
function stopAnimation(animation, needsCommit = true) {
  if (!animation || animation.playState === "finished")
    return;
  try {
    if (animation.stop) {
      animation.stop();
    } else {
      needsCommit && animation.commitStyles();
      animation.cancel();
    }
  } catch (e2) {
  }
}
function getUnitConverter(keyframes, definition) {
  var _a;
  let toUnit = (definition === null || definition === void 0 ? void 0 : definition.toDefaultUnit) || noopReturn;
  const finalKeyframe = keyframes[keyframes.length - 1];
  if (isString(finalKeyframe)) {
    const unit = ((_a = finalKeyframe.match(/(-?[\d.]+)([a-z%]*)/)) === null || _a === void 0 ? void 0 : _a[2]) || "";
    if (unit)
      toUnit = (value) => value + unit;
  }
  return toUnit;
}
function getDevToolsRecord() {
  return window.__MOTION_DEV_TOOLS_RECORD;
}
function animateStyle(element, key, keyframesDefinition, options = {}, AnimationPolyfill) {
  const record = getDevToolsRecord();
  const isRecording = options.record !== false && record;
  let animation;
  let { duration = defaults.duration, delay = defaults.delay, endDelay = defaults.endDelay, repeat = defaults.repeat, easing = defaults.easing, persist = false, direction, offset, allowWebkitAcceleration = false, autoplay = true } = options;
  const data2 = getAnimationData(element);
  const valueIsTransform = isTransform(key);
  let canAnimateNatively = supports.waapi();
  valueIsTransform && addTransformToElement(element, key);
  const name = getStyleName(key);
  const motionValue = getMotionValue(data2.values, name);
  const definition = transformDefinitions.get(name);
  stopAnimation(motionValue.animation, !(isEasingGenerator(easing) && motionValue.generator) && options.record !== false);
  return () => {
    const readInitialValue = () => {
      var _a, _b;
      return (_b = (_a = style.get(element, name)) !== null && _a !== void 0 ? _a : definition === null || definition === void 0 ? void 0 : definition.initialValue) !== null && _b !== void 0 ? _b : 0;
    };
    let keyframes = hydrateKeyframes(keyframesList(keyframesDefinition), readInitialValue);
    const toUnit = getUnitConverter(keyframes, definition);
    if (isEasingGenerator(easing)) {
      const custom = easing.createAnimation(keyframes, key !== "opacity", readInitialValue, name, motionValue);
      easing = custom.easing;
      keyframes = custom.keyframes || keyframes;
      duration = custom.duration || duration;
    }
    if (isCssVar(name)) {
      if (supports.cssRegisterProperty()) {
        registerCssVariable(name);
      } else {
        canAnimateNatively = false;
      }
    }
    if (valueIsTransform && !supports.linearEasing() && (isFunction(easing) || isEasingList(easing) && easing.some(isFunction))) {
      canAnimateNatively = false;
    }
    if (canAnimateNatively) {
      if (definition) {
        keyframes = keyframes.map((value) => isNumber(value) ? definition.toDefaultUnit(value) : value);
      }
      if (keyframes.length === 1 && (!supports.partialKeyframes() || isRecording)) {
        keyframes.unshift(readInitialValue());
      }
      const animationOptions = {
        delay: time.ms(delay),
        duration: time.ms(duration),
        endDelay: time.ms(endDelay),
        easing: !isEasingList(easing) ? convertEasing(easing, duration) : void 0,
        direction,
        iterations: repeat + 1,
        fill: "both"
      };
      animation = element.animate({
        [name]: keyframes,
        offset,
        easing: isEasingList(easing) ? easing.map((thisEasing) => convertEasing(thisEasing, duration)) : void 0
      }, animationOptions);
      if (!animation.finished) {
        animation.finished = new Promise((resolve, reject) => {
          animation.onfinish = resolve;
          animation.oncancel = reject;
        });
      }
      const target = keyframes[keyframes.length - 1];
      animation.finished.then(() => {
        if (persist)
          return;
        style.set(element, name, target);
        animation.cancel();
      }).catch(noop);
      if (!allowWebkitAcceleration)
        animation.playbackRate = 1.000001;
    } else if (AnimationPolyfill && valueIsTransform) {
      keyframes = keyframes.map((value) => typeof value === "string" ? parseFloat(value) : value);
      if (keyframes.length === 1) {
        keyframes.unshift(parseFloat(readInitialValue()));
      }
      animation = new AnimationPolyfill((latest) => {
        style.set(element, name, toUnit ? toUnit(latest) : latest);
      }, keyframes, Object.assign(Object.assign({}, options), {
        duration,
        easing
      }));
    } else {
      const target = keyframes[keyframes.length - 1];
      style.set(element, name, definition && isNumber(target) ? definition.toDefaultUnit(target) : target);
    }
    if (isRecording) {
      record(element, key, keyframes, {
        duration,
        delay,
        easing,
        repeat,
        offset
      }, "motion-one");
    }
    motionValue.setAnimation(animation);
    if (animation && !autoplay)
      animation.pause();
    return animation;
  };
}
const getOptions = (options, key) => (
  /**
   * TODO: Make test for this
   * Always return a new object otherwise delay is overwritten by results of stagger
   * and this results in no stagger
   */
  options[key] ? Object.assign(Object.assign({}, options), options[key]) : Object.assign({}, options)
);
function resolveElements(elements, selectorCache) {
  if (typeof elements === "string") {
    {
      elements = document.querySelectorAll(elements);
    }
  } else if (elements instanceof Element) {
    elements = [elements];
  }
  return Array.from(elements || []);
}
const createAnimation = (factory) => factory();
const withControls = (animationFactory, options, duration = defaults.duration) => {
  return new Proxy({
    animations: animationFactory.map(createAnimation).filter(Boolean),
    duration,
    options
  }, controls);
};
const getActiveAnimation = (state) => state.animations[0];
const controls = {
  get: (target, key) => {
    const activeAnimation = getActiveAnimation(target);
    switch (key) {
      case "duration":
        return target.duration;
      case "currentTime":
        return time.s((activeAnimation === null || activeAnimation === void 0 ? void 0 : activeAnimation[key]) || 0);
      case "playbackRate":
      case "playState":
        return activeAnimation === null || activeAnimation === void 0 ? void 0 : activeAnimation[key];
      case "finished":
        if (!target.finished) {
          target.finished = Promise.all(target.animations.map(selectFinished)).catch(noop);
        }
        return target.finished;
      case "stop":
        return () => {
          target.animations.forEach((animation) => stopAnimation(animation));
        };
      case "forEachNative":
        return (callback) => {
          target.animations.forEach((animation) => callback(animation, target));
        };
      default:
        return typeof (activeAnimation === null || activeAnimation === void 0 ? void 0 : activeAnimation[key]) === "undefined" ? void 0 : () => target.animations.forEach((animation) => animation[key]());
    }
  },
  set: (target, key, value) => {
    switch (key) {
      case "currentTime":
        value = time.ms(value);
      // Fall-through
      case "playbackRate":
        for (let i2 = 0; i2 < target.animations.length; i2++) {
          target.animations[i2][key] = value;
        }
        return true;
    }
    return false;
  }
};
const selectFinished = (animation) => animation.finished;
function resolveOption(option, i2, total) {
  return isFunction(option) ? option(i2, total) : option;
}
function createAnimate(AnimatePolyfill) {
  return function animate2(elements, keyframes, options = {}) {
    elements = resolveElements(elements);
    const numElements = elements.length;
    const animationFactories = [];
    for (let i2 = 0; i2 < numElements; i2++) {
      const element = elements[i2];
      for (const key in keyframes) {
        const valueOptions = getOptions(options, key);
        valueOptions.delay = resolveOption(valueOptions.delay, i2, numElements);
        const animation = animateStyle(element, key, keyframes[key], valueOptions, AnimatePolyfill);
        animationFactories.push(animation);
      }
    }
    return withControls(
      animationFactories,
      options,
      /**
       * TODO:
       * If easing is set to spring or glide, duration will be dynamically
       * generated. Ideally we would dynamically generate this from
       * animation.effect.getComputedTiming().duration but this isn't
       * supported in iOS13 or our number polyfill. Perhaps it's possible
       * to Proxy animations returned from animateStyle that has duration
       * as a getter.
       */
      options.duration
    );
  };
}
const animate$1 = createAnimate(Animation);
function animateProgress(target, options = {}) {
  return withControls([
    () => {
      const animation = new Animation(target, [0, 1], options);
      animation.finished.catch(() => {
      });
      return animation;
    }
  ], options, options.duration);
}
function animate(target, keyframesOrOptions, options) {
  const factory = isFunction(target) ? animateProgress : animate$1;
  return factory(target, keyframesOrOptions, options);
}
const l = (l2) => null != l2 ? l2 : A;
var __defProp$y = Object.defineProperty;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp$y(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a2, b2) => {
  for (var prop in b2 || (b2 = {}))
    if (__hasOwnProp.call(b2, prop))
      __defNormalProp(a2, prop, b2[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b2)) {
      if (__propIsEnum.call(b2, prop))
        __defNormalProp(a2, prop, b2[prop]);
    }
  return a2;
};
function themeModeVariables() {
  var _a;
  const themeMode = (_a = ThemeCtrl.state.themeMode) != null ? _a : "dark";
  const themeModePresets = {
    light: {
      foreground: { 1: `rgb(20,20,20)`, 2: `rgb(121,134,134)`, 3: `rgb(158,169,169)` },
      background: { 1: `rgb(255,255,255)`, 2: `rgb(241,243,243)`, 3: `rgb(228,231,231)` },
      overlay: "rgba(0,0,0,0.1)"
    },
    dark: {
      foreground: { 1: `rgb(228,231,231)`, 2: `rgb(148,158,158)`, 3: `rgb(110,119,119)` },
      background: { 1: `rgb(20,20,20)`, 2: `rgb(39,42,42)`, 3: `rgb(59,64,64)` },
      overlay: "rgba(255,255,255,0.1)"
    }
  };
  const themeModeColors = themeModePresets[themeMode];
  return {
    "--wcm-color-fg-1": themeModeColors.foreground[1],
    "--wcm-color-fg-2": themeModeColors.foreground[2],
    "--wcm-color-fg-3": themeModeColors.foreground[3],
    "--wcm-color-bg-1": themeModeColors.background[1],
    "--wcm-color-bg-2": themeModeColors.background[2],
    "--wcm-color-bg-3": themeModeColors.background[3],
    "--wcm-color-overlay": themeModeColors.overlay
  };
}
function themeVariablesPresets() {
  return {
    "--wcm-accent-color": "#3396FF",
    "--wcm-accent-fill-color": "#FFFFFF",
    "--wcm-z-index": "89",
    "--wcm-background-color": "#3396FF",
    "--wcm-background-border-radius": "8px",
    "--wcm-container-border-radius": "30px",
    "--wcm-wallet-icon-border-radius": "15px",
    "--wcm-wallet-icon-large-border-radius": "30px",
    "--wcm-wallet-icon-small-border-radius": "7px",
    "--wcm-input-border-radius": "28px",
    "--wcm-button-border-radius": "10px",
    "--wcm-notification-border-radius": "36px",
    "--wcm-secondary-button-border-radius": "28px",
    "--wcm-icon-button-border-radius": "50%",
    "--wcm-button-hover-highlight-border-radius": "10px",
    "--wcm-text-big-bold-size": "20px",
    "--wcm-text-big-bold-weight": "600",
    "--wcm-text-big-bold-line-height": "24px",
    "--wcm-text-big-bold-letter-spacing": "-0.03em",
    "--wcm-text-big-bold-text-transform": "none",
    "--wcm-text-xsmall-bold-size": "10px",
    "--wcm-text-xsmall-bold-weight": "700",
    "--wcm-text-xsmall-bold-line-height": "12px",
    "--wcm-text-xsmall-bold-letter-spacing": "0.02em",
    "--wcm-text-xsmall-bold-text-transform": "uppercase",
    "--wcm-text-xsmall-regular-size": "12px",
    "--wcm-text-xsmall-regular-weight": "600",
    "--wcm-text-xsmall-regular-line-height": "14px",
    "--wcm-text-xsmall-regular-letter-spacing": "-0.03em",
    "--wcm-text-xsmall-regular-text-transform": "none",
    "--wcm-text-small-thin-size": "14px",
    "--wcm-text-small-thin-weight": "500",
    "--wcm-text-small-thin-line-height": "16px",
    "--wcm-text-small-thin-letter-spacing": "-0.03em",
    "--wcm-text-small-thin-text-transform": "none",
    "--wcm-text-small-regular-size": "14px",
    "--wcm-text-small-regular-weight": "600",
    "--wcm-text-small-regular-line-height": "16px",
    "--wcm-text-small-regular-letter-spacing": "-0.03em",
    "--wcm-text-small-regular-text-transform": "none",
    "--wcm-text-medium-regular-size": "16px",
    "--wcm-text-medium-regular-weight": "600",
    "--wcm-text-medium-regular-line-height": "20px",
    "--wcm-text-medium-regular-letter-spacing": "-0.03em",
    "--wcm-text-medium-regular-text-transform": "none",
    "--wcm-font-family": "-apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, Ubuntu, 'Helvetica Neue', sans-serif",
    "--wcm-font-feature-settings": `'tnum' on, 'lnum' on, 'case' on`,
    "--wcm-success-color": "rgb(38,181,98)",
    "--wcm-error-color": "rgb(242, 90, 103)",
    "--wcm-overlay-background-color": "rgba(0, 0, 0, 0.3)",
    "--wcm-overlay-backdrop-filter": "none"
  };
}
const ThemeUtil = {
  getPreset(key) {
    return themeVariablesPresets()[key];
  },
  setTheme() {
    const root = document.querySelector(":root");
    const { themeVariables } = ThemeCtrl.state;
    if (root) {
      const variables = __spreadValues(__spreadValues(__spreadValues({}, themeModeVariables()), themeVariablesPresets()), themeVariables);
      Object.entries(variables).forEach(([key, val]) => root.style.setProperty(key, val));
    }
  },
  globalCss: i$3`*,::after,::before{margin:0;padding:0;box-sizing:border-box;font-style:normal;text-rendering:optimizeSpeed;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;-webkit-tap-highlight-color:transparent;backface-visibility:hidden}button{cursor:pointer;display:flex;justify-content:center;align-items:center;position:relative;border:none;background-color:transparent;transition:all .2s ease}@media (hover:hover) and (pointer:fine){button:active{transition:all .1s ease;transform:scale(.93)}}button::after{content:'';position:absolute;top:0;bottom:0;left:0;right:0;transition:background-color,.2s ease}button:disabled{cursor:not-allowed}button svg,button wcm-text{position:relative;z-index:1}input{border:none;outline:0;appearance:none}img{display:block}::selection{color:var(--wcm-accent-fill-color);background:var(--wcm-accent-color)}`
};
const styles$t = i$3`button{border-radius:var(--wcm-secondary-button-border-radius);height:28px;padding:0 10px;background-color:var(--wcm-accent-color)}button path{fill:var(--wcm-accent-fill-color)}button::after{border-radius:inherit;border:1px solid var(--wcm-color-overlay)}button:disabled::after{background-color:transparent}.wcm-icon-left svg{margin-right:5px}.wcm-icon-right svg{margin-left:5px}button:active::after{background-color:var(--wcm-color-overlay)}.wcm-ghost,.wcm-ghost:active::after,.wcm-outline{background-color:transparent}.wcm-ghost:active{opacity:.5}@media(hover:hover){button:hover::after{background-color:var(--wcm-color-overlay)}.wcm-ghost:hover::after{background-color:transparent}.wcm-ghost:hover{opacity:.5}}button:disabled{background-color:var(--wcm-color-bg-3);pointer-events:none}.wcm-ghost::after{border-color:transparent}.wcm-ghost path{fill:var(--wcm-color-fg-2)}.wcm-outline path{fill:var(--wcm-accent-color)}.wcm-outline:disabled{background-color:transparent;opacity:.5}`;
var __defProp$x = Object.defineProperty;
var __getOwnPropDesc$x = Object.getOwnPropertyDescriptor;
var __decorateClass$x = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$x(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result)
    __defProp$x(target, key, result);
  return result;
};
let WcmButton = class extends s {
  constructor() {
    super(...arguments);
    this.disabled = false;
    this.iconLeft = void 0;
    this.iconRight = void 0;
    this.onClick = () => null;
    this.variant = "default";
  }
  // -- render ------------------------------------------------------- //
  render() {
    const classes = {
      "wcm-icon-left": this.iconLeft !== void 0,
      "wcm-icon-right": this.iconRight !== void 0,
      "wcm-ghost": this.variant === "ghost",
      "wcm-outline": this.variant === "outline"
    };
    let textColor = "inverse";
    if (this.variant === "ghost") {
      textColor = "secondary";
    }
    if (this.variant === "outline") {
      textColor = "accent";
    }
    return x`<button class="${o2(classes)}" ?disabled="${this.disabled}" @click="${this.onClick}">${this.iconLeft}<wcm-text variant="small-regular" color="${textColor}"><slot></slot></wcm-text>${this.iconRight}</button>`;
  }
};
WcmButton.styles = [ThemeUtil.globalCss, styles$t];
__decorateClass$x([
  n$1({ type: Boolean })
], WcmButton.prototype, "disabled", 2);
__decorateClass$x([
  n$1()
], WcmButton.prototype, "iconLeft", 2);
__decorateClass$x([
  n$1()
], WcmButton.prototype, "iconRight", 2);
__decorateClass$x([
  n$1()
], WcmButton.prototype, "onClick", 2);
__decorateClass$x([
  n$1()
], WcmButton.prototype, "variant", 2);
WcmButton = __decorateClass$x([
  e$2("wcm-button")
], WcmButton);
const styles$s = i$3`:host{display:inline-block}button{padding:0 15px 1px;height:40px;border-radius:var(--wcm-button-border-radius);color:var(--wcm-accent-fill-color);background-color:var(--wcm-accent-color)}button::after{content:'';top:0;bottom:0;left:0;right:0;position:absolute;background-color:transparent;border-radius:inherit;transition:background-color .2s ease;border:1px solid var(--wcm-color-overlay)}button:active::after{background-color:var(--wcm-color-overlay)}button:disabled{padding-bottom:0;background-color:var(--wcm-color-bg-3);color:var(--wcm-color-fg-3)}.wcm-secondary{color:var(--wcm-accent-color);background-color:transparent}.wcm-secondary::after{display:none}@media(hover:hover){button:hover::after{background-color:var(--wcm-color-overlay)}}`;
var __defProp$w = Object.defineProperty;
var __getOwnPropDesc$w = Object.getOwnPropertyDescriptor;
var __decorateClass$w = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$w(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result)
    __defProp$w(target, key, result);
  return result;
};
let WcmButtonBig = class extends s {
  constructor() {
    super(...arguments);
    this.disabled = false;
    this.variant = "primary";
  }
  // -- render ------------------------------------------------------- //
  render() {
    const classes = {
      "wcm-secondary": this.variant === "secondary"
    };
    return x`<button ?disabled="${this.disabled}" class="${o2(classes)}"><slot></slot></button>`;
  }
};
WcmButtonBig.styles = [ThemeUtil.globalCss, styles$s];
__decorateClass$w([
  n$1({ type: Boolean })
], WcmButtonBig.prototype, "disabled", 2);
__decorateClass$w([
  n$1()
], WcmButtonBig.prototype, "variant", 2);
WcmButtonBig = __decorateClass$w([
  e$2("wcm-button-big")
], WcmButtonBig);
const styles$r = i$3`:host{background-color:var(--wcm-color-bg-2);border-top:1px solid var(--wcm-color-bg-3)}div{padding:10px 20px;display:inherit;flex-direction:inherit;align-items:inherit;width:inherit;justify-content:inherit}`;
var __getOwnPropDesc$v = Object.getOwnPropertyDescriptor;
var __decorateClass$v = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$v(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = decorator(result) || result;
  return result;
};
let WcmInfoFooter = class extends s {
  // -- render ------------------------------------------------------- //
  render() {
    return x`<div><slot></slot></div>`;
  }
};
WcmInfoFooter.styles = [ThemeUtil.globalCss, styles$r];
WcmInfoFooter = __decorateClass$v([
  e$2("wcm-info-footer")
], WcmInfoFooter);
const SvgUtil = {
  CROSS_ICON: b`<svg width="12" height="12" viewBox="0 0 12 12"><path d="M9.94 11A.75.75 0 1 0 11 9.94L7.414 6.353a.5.5 0 0 1 0-.708L11 2.061A.75.75 0 1 0 9.94 1L6.353 4.586a.5.5 0 0 1-.708 0L2.061 1A.75.75 0 0 0 1 2.06l3.586 3.586a.5.5 0 0 1 0 .708L1 9.939A.75.75 0 1 0 2.06 11l3.586-3.586a.5.5 0 0 1 .708 0L9.939 11Z" fill="#fff"/></svg>`,
  WALLET_CONNECT_LOGO: b`<svg width="178" height="29" viewBox="0 0 178 29" id="wcm-wc-logo"><path d="M10.683 7.926c5.284-5.17 13.85-5.17 19.134 0l.636.623a.652.652 0 0 1 0 .936l-2.176 2.129a.343.343 0 0 1-.478 0l-.875-.857c-3.686-3.607-9.662-3.607-13.348 0l-.937.918a.343.343 0 0 1-.479 0l-2.175-2.13a.652.652 0 0 1 0-.936l.698-.683Zm23.633 4.403 1.935 1.895a.652.652 0 0 1 0 .936l-8.73 8.543a.687.687 0 0 1-.956 0L20.37 17.64a.172.172 0 0 0-.239 0l-6.195 6.063a.687.687 0 0 1-.957 0l-8.73-8.543a.652.652 0 0 1 0-.936l1.936-1.895a.687.687 0 0 1 .957 0l6.196 6.064a.172.172 0 0 0 .239 0l6.195-6.064a.687.687 0 0 1 .957 0l6.196 6.064a.172.172 0 0 0 .24 0l6.195-6.064a.687.687 0 0 1 .956 0ZM48.093 20.948l2.338-9.355c.139-.515.258-1.07.416-1.942.12.872.258 1.427.357 1.942l2.022 9.355h4.181l3.528-13.874h-3.21l-1.943 8.523a24.825 24.825 0 0 0-.456 2.457c-.158-.931-.317-1.625-.495-2.438l-1.883-8.542h-4.201l-2.042 8.542a41.204 41.204 0 0 0-.475 2.438 41.208 41.208 0 0 0-.476-2.438l-1.903-8.542h-3.349l3.508 13.874h4.083ZM63.33 21.304c1.585 0 2.596-.654 3.11-1.605-.059.297-.078.595-.078.892v.357h2.655V15.22c0-2.735-1.248-4.32-4.3-4.32-2.636 0-4.36 1.466-4.52 3.487h2.914c.1-.891.734-1.426 1.705-1.426.911 0 1.407.515 1.407 1.11 0 .435-.258.693-1.03.792l-1.388.159c-2.061.257-3.825 1.01-3.825 3.19 0 1.982 1.645 3.092 3.35 3.092Zm.891-2.041c-.773 0-1.348-.436-1.348-1.19 0-.733.655-1.09 1.645-1.268l.674-.119c.575-.118.892-.218 1.09-.396v.912c0 1.228-.892 2.06-2.06 2.06ZM70.398 7.074v13.874h2.874V7.074h-2.874ZM74.934 7.074v13.874h2.874V7.074h-2.874ZM84.08 21.304c2.735 0 4.5-1.546 4.697-3.567h-2.893c-.139.892-.892 1.387-1.804 1.387-1.228 0-2.12-.99-2.14-2.358h6.897v-.555c0-3.21-1.764-5.312-4.816-5.312-2.933 0-4.994 2.062-4.994 5.173 0 3.37 2.12 5.232 5.053 5.232Zm-2.16-6.421c.119-1.11.932-1.922 2.081-1.922 1.11 0 1.883.772 1.903 1.922H81.92ZM94.92 21.146c.633 0 1.248-.1 1.525-.179v-2.18c-.218.04-.475.06-.693.06-1.05 0-1.427-.595-1.427-1.566v-3.805h2.338v-2.24h-2.338V7.788H91.47v3.448H89.37v2.24h2.1v4.201c0 2.3 1.15 3.469 3.45 3.469ZM104.62 21.304c3.924 0 6.302-2.299 6.599-5.608h-3.111c-.238 1.803-1.506 3.032-3.369 3.032-2.2 0-3.746-1.784-3.746-4.796 0-2.953 1.605-4.638 3.805-4.638 1.883 0 2.953 1.15 3.171 2.834h3.191c-.317-3.448-2.854-5.41-6.342-5.41-3.984 0-7.036 2.695-7.036 7.214 0 4.677 2.676 7.372 6.838 7.372ZM117.449 21.304c2.993 0 5.114-1.882 5.114-5.172 0-3.23-2.121-5.233-5.114-5.233-2.972 0-5.093 2.002-5.093 5.233 0 3.29 2.101 5.172 5.093 5.172Zm0-2.22c-1.327 0-2.18-1.09-2.18-2.952 0-1.903.892-2.973 2.18-2.973 1.308 0 2.2 1.07 2.2 2.973 0 1.862-.872 2.953-2.2 2.953ZM126.569 20.948v-5.689c0-1.208.753-2.1 1.823-2.1 1.011 0 1.606.773 1.606 2.06v5.729h2.873v-6.144c0-2.339-1.229-3.905-3.428-3.905-1.526 0-2.458.734-2.953 1.606a5.31 5.31 0 0 0 .079-.892v-.377h-2.874v9.712h2.874ZM137.464 20.948v-5.689c0-1.208.753-2.1 1.823-2.1 1.011 0 1.606.773 1.606 2.06v5.729h2.873v-6.144c0-2.339-1.228-3.905-3.428-3.905-1.526 0-2.458.734-2.953 1.606a5.31 5.31 0 0 0 .079-.892v-.377h-2.874v9.712h2.874ZM149.949 21.304c2.735 0 4.499-1.546 4.697-3.567h-2.893c-.139.892-.892 1.387-1.804 1.387-1.228 0-2.12-.99-2.14-2.358h6.897v-.555c0-3.21-1.764-5.312-4.816-5.312-2.933 0-4.994 2.062-4.994 5.173 0 3.37 2.12 5.232 5.053 5.232Zm-2.16-6.421c.119-1.11.932-1.922 2.081-1.922 1.11 0 1.883.772 1.903 1.922h-3.984ZM160.876 21.304c3.013 0 4.658-1.645 4.975-4.201h-2.874c-.099 1.07-.713 1.982-2.001 1.982-1.309 0-2.2-1.21-2.2-2.993 0-1.942 1.03-2.933 2.259-2.933 1.209 0 1.803.872 1.883 1.882h2.873c-.218-2.358-1.823-4.142-4.776-4.142-2.874 0-5.153 1.903-5.153 5.193 0 3.25 1.923 5.212 5.014 5.212ZM172.067 21.146c.634 0 1.248-.1 1.526-.179v-2.18c-.218.04-.476.06-.694.06-1.05 0-1.427-.595-1.427-1.566v-3.805h2.339v-2.24h-2.339V7.788h-2.854v3.448h-2.1v2.24h2.1v4.201c0 2.3 1.15 3.469 3.449 3.469Z" fill="#fff"/></svg>`,
  WALLET_CONNECT_ICON: b`<svg width="28" height="20" viewBox="0 0 28 20"><g clip-path="url(#a)"><path d="M7.386 6.482c3.653-3.576 9.575-3.576 13.228 0l.44.43a.451.451 0 0 1 0 .648L19.55 9.033a.237.237 0 0 1-.33 0l-.606-.592c-2.548-2.496-6.68-2.496-9.228 0l-.648.634a.237.237 0 0 1-.33 0L6.902 7.602a.451.451 0 0 1 0-.647l.483-.473Zm16.338 3.046 1.339 1.31a.451.451 0 0 1 0 .648l-6.035 5.909a.475.475 0 0 1-.662 0L14.083 13.2a.119.119 0 0 0-.166 0l-4.283 4.194a.475.475 0 0 1-.662 0l-6.035-5.91a.451.451 0 0 1 0-.647l1.338-1.31a.475.475 0 0 1 .662 0l4.283 4.194c.046.044.12.044.166 0l4.283-4.194a.475.475 0 0 1 .662 0l4.283 4.194c.046.044.12.044.166 0l4.283-4.194a.475.475 0 0 1 .662 0Z" fill="#000000"/></g><defs><clipPath id="a"><path fill="#ffffff" d="M0 0h28v20H0z"/></clipPath></defs></svg>`,
  WALLET_CONNECT_ICON_COLORED: b`<svg width="96" height="96" fill="none"><path fill="#fff" d="M25.322 33.597c12.525-12.263 32.83-12.263 45.355 0l1.507 1.476a1.547 1.547 0 0 1 0 2.22l-5.156 5.048a.814.814 0 0 1-1.134 0l-2.074-2.03c-8.737-8.555-22.903-8.555-31.64 0l-2.222 2.175a.814.814 0 0 1-1.134 0l-5.156-5.049a1.547 1.547 0 0 1 0-2.22l1.654-1.62Zm56.019 10.44 4.589 4.494a1.547 1.547 0 0 1 0 2.22l-20.693 20.26a1.628 1.628 0 0 1-2.267 0L48.283 56.632a.407.407 0 0 0-.567 0L33.03 71.012a1.628 1.628 0 0 1-2.268 0L10.07 50.75a1.547 1.547 0 0 1 0-2.22l4.59-4.494a1.628 1.628 0 0 1 2.267 0l14.687 14.38c.156.153.41.153.567 0l14.685-14.38a1.628 1.628 0 0 1 2.268 0l14.687 14.38c.156.153.41.153.567 0l14.686-14.38a1.628 1.628 0 0 1 2.268 0Z"/><path stroke="#000" d="M25.672 33.954c12.33-12.072 32.325-12.072 44.655 0l1.508 1.476a1.047 1.047 0 0 1 0 1.506l-5.157 5.048a.314.314 0 0 1-.434 0l-2.074-2.03c-8.932-8.746-23.409-8.746-32.34 0l-2.222 2.174a.314.314 0 0 1-.434 0l-5.157-5.048a1.047 1.047 0 0 1 0-1.506l1.655-1.62Zm55.319 10.44 4.59 4.494a1.047 1.047 0 0 1 0 1.506l-20.694 20.26a1.128 1.128 0 0 1-1.568 0l-14.686-14.38a.907.907 0 0 0-1.267 0L32.68 70.655a1.128 1.128 0 0 1-1.568 0L10.42 50.394a1.047 1.047 0 0 1 0-1.506l4.59-4.493a1.128 1.128 0 0 1 1.567 0l14.687 14.379a.907.907 0 0 0 1.266 0l-.35-.357.35.357 14.686-14.38a1.128 1.128 0 0 1 1.568 0l14.687 14.38a.907.907 0 0 0 1.267 0l14.686-14.38a1.128 1.128 0 0 1 1.568 0Z"/></svg>`,
  BACK_ICON: b`<svg width="10" height="18" viewBox="0 0 10 18"><path fill-rule="evenodd" clip-rule="evenodd" d="M8.735.179a.75.75 0 0 1 .087 1.057L2.92 8.192a1.25 1.25 0 0 0 0 1.617l5.902 6.956a.75.75 0 1 1-1.144.97L1.776 10.78a2.75 2.75 0 0 1 0-3.559L7.678.265A.75.75 0 0 1 8.735.18Z" fill="#fff"/></svg>`,
  COPY_ICON: b`<svg width="24" height="24" fill="none"><path fill="#fff" fill-rule="evenodd" d="M7.01 7.01c.03-1.545.138-2.5.535-3.28A5 5 0 0 1 9.73 1.545C10.8 1 12.2 1 15 1c2.8 0 4.2 0 5.27.545a5 5 0 0 1 2.185 2.185C23 4.8 23 6.2 23 9c0 2.8 0 4.2-.545 5.27a5 5 0 0 1-2.185 2.185c-.78.397-1.735.505-3.28.534l-.001.01c-.03 1.54-.138 2.493-.534 3.27a5 5 0 0 1-2.185 2.186C13.2 23 11.8 23 9 23c-2.8 0-4.2 0-5.27-.545a5 5 0 0 1-2.185-2.185C1 19.2 1 17.8 1 15c0-2.8 0-4.2.545-5.27A5 5 0 0 1 3.73 7.545C4.508 7.149 5.46 7.04 7 7.01h.01ZM15 15.5c-1.425 0-2.403-.001-3.162-.063-.74-.06-1.139-.172-1.427-.319a3.5 3.5 0 0 1-1.53-1.529c-.146-.288-.257-.686-.318-1.427C8.501 11.403 8.5 10.425 8.5 9c0-1.425.001-2.403.063-3.162.06-.74.172-1.139.318-1.427a3.5 3.5 0 0 1 1.53-1.53c.288-.146.686-.257 1.427-.318.759-.062 1.737-.063 3.162-.063 1.425 0 2.403.001 3.162.063.74.06 1.139.172 1.427.318a3.5 3.5 0 0 1 1.53 1.53c.146.288.257.686.318 1.427.062.759.063 1.737.063 3.162 0 1.425-.001 2.403-.063 3.162-.06.74-.172 1.139-.319 1.427a3.5 3.5 0 0 1-1.529 1.53c-.288.146-.686.257-1.427.318-.759.062-1.737.063-3.162.063ZM7 8.511c-.444.009-.825.025-1.162.052-.74.06-1.139.172-1.427.318a3.5 3.5 0 0 0-1.53 1.53c-.146.288-.257.686-.318 1.427-.062.759-.063 1.737-.063 3.162 0 1.425.001 2.403.063 3.162.06.74.172 1.139.318 1.427a3.5 3.5 0 0 0 1.53 1.53c.288.146.686.257 1.427.318.759.062 1.737.063 3.162.063 1.425 0 2.403-.001 3.162-.063.74-.06 1.139-.172 1.427-.319a3.5 3.5 0 0 0 1.53-1.53c.146-.287.257-.685.318-1.426.027-.337.043-.718.052-1.162H15c-2.8 0-4.2 0-5.27-.545a5 5 0 0 1-2.185-2.185C7 13.2 7 11.8 7 9v-.489Z" clip-rule="evenodd"/></svg>`,
  RETRY_ICON: b`<svg width="15" height="16" viewBox="0 0 15 16"><path d="M6.464 2.03A.75.75 0 0 0 5.403.97L2.08 4.293a1 1 0 0 0 0 1.414L5.403 9.03a.75.75 0 0 0 1.06-1.06L4.672 6.177a.25.25 0 0 1 .177-.427h2.085a4 4 0 1 1-3.93 4.746c-.077-.407-.405-.746-.82-.746-.414 0-.755.338-.7.748a5.501 5.501 0 1 0 5.45-6.248H4.848a.25.25 0 0 1-.177-.427L6.464 2.03Z" fill="#fff"/></svg>`,
  DESKTOP_ICON: b`<svg width="16" height="16" viewBox="0 0 16 16"><path fill-rule="evenodd" clip-rule="evenodd" d="M0 5.98c0-1.85 0-2.775.394-3.466a3 3 0 0 1 1.12-1.12C2.204 1 3.13 1 4.98 1h6.04c1.85 0 2.775 0 3.466.394a3 3 0 0 1 1.12 1.12C16 3.204 16 4.13 16 5.98v1.04c0 1.85 0 2.775-.394 3.466a3 3 0 0 1-1.12 1.12C13.796 12 12.87 12 11.02 12H4.98c-1.85 0-2.775 0-3.466-.394a3 3 0 0 1-1.12-1.12C0 9.796 0 8.87 0 7.02V5.98ZM4.98 2.5h6.04c.953 0 1.568.001 2.034.043.446.04.608.108.69.154a1.5 1.5 0 0 1 .559.56c.046.08.114.243.154.69.042.465.043 1.08.043 2.033v1.04c0 .952-.001 1.568-.043 2.034-.04.446-.108.608-.154.69a1.499 1.499 0 0 1-.56.559c-.08.046-.243.114-.69.154-.466.042-1.08.043-2.033.043H4.98c-.952 0-1.568-.001-2.034-.043-.446-.04-.608-.108-.69-.154a1.5 1.5 0 0 1-.559-.56c-.046-.08-.114-.243-.154-.69-.042-.465-.043-1.08-.043-2.033V5.98c0-.952.001-1.568.043-2.034.04-.446.108-.608.154-.69a1.5 1.5 0 0 1 .56-.559c.08-.046.243-.114.69-.154.465-.042 1.08-.043 2.033-.043Z" fill="#fff"/><path d="M4 14.25a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1-.75-.75Z" fill="#fff"/></svg>`,
  MOBILE_ICON: b`<svg width="16" height="16" viewBox="0 0 16 16"><path d="M6.75 5a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z" fill="#fff"/><path fill-rule="evenodd" clip-rule="evenodd" d="M3 4.98c0-1.85 0-2.775.394-3.466a3 3 0 0 1 1.12-1.12C5.204 0 6.136 0 8 0s2.795 0 3.486.394a3 3 0 0 1 1.12 1.12C13 2.204 13 3.13 13 4.98v6.04c0 1.85 0 2.775-.394 3.466a3 3 0 0 1-1.12 1.12C10.796 16 9.864 16 8 16s-2.795 0-3.486-.394a3 3 0 0 1-1.12-1.12C3 13.796 3 12.87 3 11.02V4.98Zm8.5 0v6.04c0 .953-.001 1.568-.043 2.034-.04.446-.108.608-.154.69a1.499 1.499 0 0 1-.56.559c-.08.045-.242.113-.693.154-.47.042-1.091.043-2.05.043-.959 0-1.58-.001-2.05-.043-.45-.04-.613-.109-.693-.154a1.5 1.5 0 0 1-.56-.56c-.046-.08-.114-.243-.154-.69-.042-.466-.043-1.08-.043-2.033V4.98c0-.952.001-1.568.043-2.034.04-.446.108-.608.154-.69a1.5 1.5 0 0 1 .56-.559c.08-.045.243-.113.693-.154C6.42 1.501 7.041 1.5 8 1.5c.959 0 1.58.001 2.05.043.45.04.613.109.693.154a1.5 1.5 0 0 1 .56.56c.046.08.114.243.154.69.042.465.043 1.08.043 2.033Z" fill="#fff"/></svg>`,
  ARROW_DOWN_ICON: b`<svg width="14" height="14" viewBox="0 0 14 14"><path d="M2.28 7.47a.75.75 0 0 0-1.06 1.06l5.25 5.25a.75.75 0 0 0 1.06 0l5.25-5.25a.75.75 0 0 0-1.06-1.06l-3.544 3.543a.25.25 0 0 1-.426-.177V.75a.75.75 0 0 0-1.5 0v10.086a.25.25 0 0 1-.427.176L2.28 7.47Z" fill="#fff"/></svg>`,
  ARROW_UP_RIGHT_ICON: b`<svg width="15" height="14" fill="none"><path d="M4.5 1.75A.75.75 0 0 1 5.25 1H12a1.5 1.5 0 0 1 1.5 1.5v6.75a.75.75 0 0 1-1.5 0V4.164a.25.25 0 0 0-.427-.176L4.061 11.5A.75.75 0 0 1 3 10.44l7.513-7.513a.25.25 0 0 0-.177-.427H5.25a.75.75 0 0 1-.75-.75Z" fill="#fff"/></svg>`,
  ARROW_RIGHT_ICON: b`<svg width="6" height="14" viewBox="0 0 6 14"><path fill-rule="evenodd" clip-rule="evenodd" d="M2.181 1.099a.75.75 0 0 1 1.024.279l2.433 4.258a2.75 2.75 0 0 1 0 2.729l-2.433 4.257a.75.75 0 1 1-1.303-.744L4.335 7.62a1.25 1.25 0 0 0 0-1.24L1.902 2.122a.75.75 0 0 1 .28-1.023Z" fill="#fff"/></svg>`,
  QRCODE_ICON: b`<svg width="25" height="24" viewBox="0 0 25 24"><path d="M23.748 9a.748.748 0 0 0 .748-.752c-.018-2.596-.128-4.07-.784-5.22a6 6 0 0 0-2.24-2.24c-1.15-.656-2.624-.766-5.22-.784a.748.748 0 0 0-.752.748c0 .414.335.749.748.752 1.015.007 1.82.028 2.494.088.995.09 1.561.256 1.988.5.7.398 1.28.978 1.679 1.678.243.427.41.993.498 1.988.061.675.082 1.479.09 2.493a.753.753 0 0 0 .75.749ZM3.527.788C4.677.132 6.152.022 8.747.004A.748.748 0 0 1 9.5.752a.753.753 0 0 1-.749.752c-1.014.007-1.818.028-2.493.088-.995.09-1.561.256-1.988.5-.7.398-1.28.978-1.679 1.678-.243.427-.41.993-.499 1.988-.06.675-.081 1.479-.088 2.493A.753.753 0 0 1 1.252 9a.748.748 0 0 1-.748-.752c.018-2.596.128-4.07.784-5.22a6 6 0 0 1 2.24-2.24ZM1.252 15a.748.748 0 0 0-.748.752c.018 2.596.128 4.07.784 5.22a6 6 0 0 0 2.24 2.24c1.15.656 2.624.766 5.22.784a.748.748 0 0 0 .752-.748.753.753 0 0 0-.749-.752c-1.014-.007-1.818-.028-2.493-.089-.995-.089-1.561-.255-1.988-.498a4.5 4.5 0 0 1-1.679-1.68c-.243-.426-.41-.992-.499-1.987-.06-.675-.081-1.479-.088-2.493A.753.753 0 0 0 1.252 15ZM22.996 15.749a.753.753 0 0 1 .752-.749c.415 0 .751.338.748.752-.018 2.596-.128 4.07-.784 5.22a6 6 0 0 1-2.24 2.24c-1.15.656-2.624.766-5.22.784a.748.748 0 0 1-.752-.748c0-.414.335-.749.748-.752 1.015-.007 1.82-.028 2.494-.089.995-.089 1.561-.255 1.988-.498a4.5 4.5 0 0 0 1.679-1.68c.243-.426.41-.992.498-1.987.061-.675.082-1.479.09-2.493Z" fill="#fff"/><path fill-rule="evenodd" clip-rule="evenodd" d="M7 4a2.5 2.5 0 0 0-2.5 2.5v2A2.5 2.5 0 0 0 7 11h2a2.5 2.5 0 0 0 2.5-2.5v-2A2.5 2.5 0 0 0 9 4H7Zm2 1.5H7a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1ZM13.5 6.5A2.5 2.5 0 0 1 16 4h2a2.5 2.5 0 0 1 2.5 2.5v2A2.5 2.5 0 0 1 18 11h-2a2.5 2.5 0 0 1-2.5-2.5v-2Zm2.5-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1ZM7 13a2.5 2.5 0 0 0-2.5 2.5v2A2.5 2.5 0 0 0 7 20h2a2.5 2.5 0 0 0 2.5-2.5v-2A2.5 2.5 0 0 0 9 13H7Zm2 1.5H7a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1Z" fill="#fff"/><path d="M13.5 15.5c0-.465 0-.697.038-.89a2 2 0 0 1 1.572-1.572C15.303 13 15.535 13 16 13v2.5h-2.5ZM18 13c.465 0 .697 0 .89.038a2 2 0 0 1 1.572 1.572c.038.193.038.425.038.89H18V13ZM18 17.5h2.5c0 .465 0 .697-.038.89a2 2 0 0 1-1.572 1.572C18.697 20 18.465 20 18 20v-2.5ZM13.5 17.5H16V20c-.465 0-.697 0-.89-.038a2 2 0 0 1-1.572-1.572c-.038-.193-.038-.425-.038-.89Z" fill="#fff"/></svg>`,
  SCAN_ICON: b`<svg width="16" height="16" fill="none"><path fill="#fff" d="M10 15.216c0 .422.347.763.768.74 1.202-.064 2.025-.222 2.71-.613a5.001 5.001 0 0 0 1.865-1.866c.39-.684.549-1.507.613-2.709a.735.735 0 0 0-.74-.768.768.768 0 0 0-.76.732c-.009.157-.02.306-.032.447-.073.812-.206 1.244-.384 1.555-.31.545-.761.996-1.306 1.306-.311.178-.743.311-1.555.384-.141.013-.29.023-.447.032a.768.768 0 0 0-.732.76ZM10 .784c0 .407.325.737.732.76.157.009.306.02.447.032.812.073 1.244.206 1.555.384a3.5 3.5 0 0 1 1.306 1.306c.178.311.311.743.384 1.555.013.142.023.29.032.447a.768.768 0 0 0 .76.732.734.734 0 0 0 .74-.768c-.064-1.202-.222-2.025-.613-2.71A5 5 0 0 0 13.477.658c-.684-.39-1.507-.549-2.709-.613a.735.735 0 0 0-.768.74ZM5.232.044A.735.735 0 0 1 6 .784a.768.768 0 0 1-.732.76c-.157.009-.305.02-.447.032-.812.073-1.244.206-1.555.384A3.5 3.5 0 0 0 1.96 3.266c-.178.311-.311.743-.384 1.555-.013.142-.023.29-.032.447A.768.768 0 0 1 .784 6a.735.735 0 0 1-.74-.768c.064-1.202.222-2.025.613-2.71A5 5 0 0 1 2.523.658C3.207.267 4.03.108 5.233.044ZM5.268 14.456a.768.768 0 0 1 .732.76.734.734 0 0 1-.768.74c-1.202-.064-2.025-.222-2.71-.613a5 5 0 0 1-1.865-1.866c-.39-.684-.549-1.507-.613-2.709A.735.735 0 0 1 .784 10c.407 0 .737.325.76.732.009.157.02.306.032.447.073.812.206 1.244.384 1.555a3.5 3.5 0 0 0 1.306 1.306c.311.178.743.311 1.555.384.142.013.29.023.447.032Z"/></svg>`,
  CHECKMARK_ICON: b`<svg width="13" height="12" viewBox="0 0 13 12"><path fill-rule="evenodd" clip-rule="evenodd" d="M12.155.132a.75.75 0 0 1 .232 1.035L5.821 11.535a1 1 0 0 1-1.626.09L.665 7.21a.75.75 0 1 1 1.17-.937L4.71 9.867a.25.25 0 0 0 .406-.023L11.12.364a.75.75 0 0 1 1.035-.232Z" fill="#fff"/></svg>`,
  SEARCH_ICON: b`<svg width="20" height="21"><path fill-rule="evenodd" clip-rule="evenodd" d="M12.432 13.992c-.354-.353-.91-.382-1.35-.146a5.5 5.5 0 1 1 2.265-2.265c-.237.441-.208.997.145 1.35l3.296 3.296a.75.75 0 1 1-1.06 1.061l-3.296-3.296Zm.06-5a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" fill="#949E9E"/></svg>`,
  WALLET_PLACEHOLDER: b`<svg width="60" height="60" fill="none" viewBox="0 0 60 60"><g clip-path="url(#q)"><path id="wallet-placeholder-fill" fill="#fff" d="M0 24.9c0-9.251 0-13.877 1.97-17.332a15 15 0 0 1 5.598-5.597C11.023 0 15.648 0 24.9 0h10.2c9.252 0 13.877 0 17.332 1.97a15 15 0 0 1 5.597 5.598C60 11.023 60 15.648 60 24.9v10.2c0 9.252 0 13.877-1.97 17.332a15.001 15.001 0 0 1-5.598 5.597C48.977 60 44.352 60 35.1 60H24.9c-9.251 0-13.877 0-17.332-1.97a15 15 0 0 1-5.597-5.598C0 48.977 0 44.352 0 35.1V24.9Z"/><path id="wallet-placeholder-dash" stroke="#000" stroke-dasharray="4 4" stroke-width="1.5" d="M.04 41.708a231.598 231.598 0 0 1-.039-4.403l.75-.001L.75 35.1v-2.55H0v-5.1h.75V24.9l.001-2.204h-.75c.003-1.617.011-3.077.039-4.404l.75.016c.034-1.65.099-3.08.218-4.343l-.746-.07c.158-1.678.412-3.083.82-4.316l.713.236c.224-.679.497-1.296.827-1.875a14.25 14.25 0 0 1 1.05-1.585L3.076 5.9A15 15 0 0 1 5.9 3.076l.455.596a14.25 14.25 0 0 1 1.585-1.05c.579-.33 1.196-.603 1.875-.827l-.236-.712C10.812.674 12.217.42 13.895.262l.07.746C15.23.89 16.66.824 18.308.79l-.016-.75C19.62.012 21.08.004 22.695.001l.001.75L24.9.75h2.55V0h5.1v.75h2.55l2.204.001v-.75c1.617.003 3.077.011 4.404.039l-.016.75c1.65.034 3.08.099 4.343.218l.07-.746c1.678.158 3.083.412 4.316.82l-.236.713c.679.224 1.296.497 1.875.827a14.24 14.24 0 0 1 1.585 1.05l.455-.596A14.999 14.999 0 0 1 56.924 5.9l-.596.455c.384.502.735 1.032 1.05 1.585.33.579.602 1.196.827 1.875l.712-.236c.409 1.233.663 2.638.822 4.316l-.747.07c.119 1.264.184 2.694.218 4.343l.75-.016c.028 1.327.036 2.787.039 4.403l-.75.001.001 2.204v2.55H60v5.1h-.75v2.55l-.001 2.204h.75a231.431 231.431 0 0 1-.039 4.404l-.75-.016c-.034 1.65-.099 3.08-.218 4.343l.747.07c-.159 1.678-.413 3.083-.822 4.316l-.712-.236a10.255 10.255 0 0 1-.827 1.875 14.242 14.242 0 0 1-1.05 1.585l.596.455a14.997 14.997 0 0 1-2.824 2.824l-.455-.596c-.502.384-1.032.735-1.585 1.05-.579.33-1.196.602-1.875.827l.236.712c-1.233.409-2.638.663-4.316.822l-.07-.747c-1.264.119-2.694.184-4.343.218l.016.75c-1.327.028-2.787.036-4.403.039l-.001-.75-2.204.001h-2.55V60h-5.1v-.75H24.9l-2.204-.001v.75a231.431 231.431 0 0 1-4.404-.039l.016-.75c-1.65-.034-3.08-.099-4.343-.218l-.07.747c-1.678-.159-3.083-.413-4.316-.822l.236-.712a10.258 10.258 0 0 1-1.875-.827 14.252 14.252 0 0 1-1.585-1.05l-.455.596A14.999 14.999 0 0 1 3.076 54.1l.596-.455a14.24 14.24 0 0 1-1.05-1.585 10.259 10.259 0 0 1-.827-1.875l-.712.236C.674 49.188.42 47.783.262 46.105l.746-.07C.89 44.77.824 43.34.79 41.692l-.75.016Z"/><path fill="#fff" fill-rule="evenodd" d="M35.643 32.145c-.297-.743-.445-1.114-.401-1.275a.42.42 0 0 1 .182-.27c.134-.1.463-.1 1.123-.1.742 0 1.499.046 2.236-.05a6 6 0 0 0 5.166-5.166c.051-.39.051-.855.051-1.784 0-.928 0-1.393-.051-1.783a6 6 0 0 0-5.166-5.165c-.39-.052-.854-.052-1.783-.052h-7.72c-4.934 0-7.401 0-9.244 1.051a8 8 0 0 0-2.985 2.986C16.057 22.28 16.003 24.58 16 29 15.998 31.075 16 33.15 16 35.224A7.778 7.778 0 0 0 23.778 43H28.5c1.394 0 2.09 0 2.67-.116a6 6 0 0 0 4.715-4.714c.115-.58.115-1.301.115-2.744 0-1.31 0-1.964-.114-2.49a4.998 4.998 0 0 0-.243-.792Z" clip-rule="evenodd"/><path fill="#9EA9A9" fill-rule="evenodd" d="M37 18h-7.72c-2.494 0-4.266.002-5.647.126-1.361.122-2.197.354-2.854.728a6.5 6.5 0 0 0-2.425 2.426c-.375.657-.607 1.492-.729 2.853-.11 1.233-.123 2.777-.125 4.867 0 .7 0 1.05.097 1.181.096.13.182.181.343.2.163.02.518-.18 1.229-.581a6.195 6.195 0 0 1 3.053-.8H37c.977 0 1.32-.003 1.587-.038a4.5 4.5 0 0 0 3.874-3.874c.036-.268.039-.611.039-1.588 0-.976-.003-1.319-.038-1.587a4.5 4.5 0 0 0-3.875-3.874C38.32 18.004 37.977 18 37 18Zm-7.364 12.5h-7.414a4.722 4.722 0 0 0-4.722 4.723 6.278 6.278 0 0 0 6.278 6.278H28.5c1.466 0 1.98-.008 2.378-.087a4.5 4.5 0 0 0 3.535-3.536c.08-.397.087-.933.087-2.451 0-1.391-.009-1.843-.08-2.17a3.5 3.5 0 0 0-2.676-2.676c-.328-.072-.762-.08-2.108-.08Z" clip-rule="evenodd"/></g><defs><clipPath id="q"><path fill="#fff" d="M0 0h60v60H0z"/></clipPath></defs></svg>`,
  GLOBE_ICON: b`<svg width="16" height="16" fill="none" viewBox="0 0 16 16"><path fill="#fff" fill-rule="evenodd" d="M15.5 8a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Zm-2.113.75c.301 0 .535.264.47.558a6.01 6.01 0 0 1-2.867 3.896c-.203.116-.42-.103-.334-.32.409-1.018.691-2.274.797-3.657a.512.512 0 0 1 .507-.477h1.427Zm.47-2.058c.065.294-.169.558-.47.558H11.96a.512.512 0 0 1-.507-.477c-.106-1.383-.389-2.638-.797-3.656-.087-.217.13-.437.333-.32a6.01 6.01 0 0 1 2.868 3.895Zm-4.402.558c.286 0 .515-.24.49-.525-.121-1.361-.429-2.534-.83-3.393-.279-.6-.549-.93-.753-1.112a.535.535 0 0 0-.724 0c-.204.182-.474.513-.754 1.112-.4.859-.708 2.032-.828 3.393a.486.486 0 0 0 .49.525h2.909Zm-5.415 0c.267 0 .486-.21.507-.477.106-1.383.389-2.638.797-3.656.087-.217-.13-.437-.333-.32a6.01 6.01 0 0 0-2.868 3.895c-.065.294.169.558.47.558H4.04ZM2.143 9.308c-.065-.294.169-.558.47-.558H4.04c.267 0 .486.21.507.477.106 1.383.389 2.639.797 3.657.087.217-.13.436-.333.32a6.01 6.01 0 0 1-2.868-3.896Zm3.913-.033a.486.486 0 0 1 .49-.525h2.909c.286 0 .515.24.49.525-.121 1.361-.428 2.535-.83 3.394-.279.6-.549.93-.753 1.112a.535.535 0 0 1-.724 0c-.204-.182-.474-.513-.754-1.112-.4-.859-.708-2.033-.828-3.394Z" clip-rule="evenodd"/></svg>`
};
const styles$q = i$3`.wcm-toolbar-placeholder{top:0;bottom:0;left:0;right:0;width:100%;position:absolute;display:block;pointer-events:none;height:100px;border-radius:calc(var(--wcm-background-border-radius) * .9);background-color:var(--wcm-background-color);background-position:center;background-size:cover}.wcm-toolbar{height:38px;display:flex;position:relative;margin:5px 15px 5px 5px;justify-content:space-between;align-items:center}.wcm-toolbar img,.wcm-toolbar svg{height:28px;object-position:left center;object-fit:contain}#wcm-wc-logo path{fill:var(--wcm-accent-fill-color)}button{width:28px;height:28px;border-radius:var(--wcm-icon-button-border-radius);border:0;display:flex;justify-content:center;align-items:center;cursor:pointer;background-color:var(--wcm-color-bg-1);box-shadow:0 0 0 1px var(--wcm-color-overlay)}button:active{background-color:var(--wcm-color-bg-2)}button svg{display:block;object-position:center}button path{fill:var(--wcm-color-fg-1)}.wcm-toolbar div{display:flex}@media(hover:hover){button:hover{background-color:var(--wcm-color-bg-2)}}`;
var __getOwnPropDesc$u = Object.getOwnPropertyDescriptor;
var __decorateClass$u = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$u(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = decorator(result) || result;
  return result;
};
let WcmModalBackcard = class extends s {
  // -- render ------------------------------------------------------- //
  render() {
    return x`<div class="wcm-toolbar-placeholder"></div><div class="wcm-toolbar">${SvgUtil.WALLET_CONNECT_LOGO} <button @click="${ModalCtrl.close}">${SvgUtil.CROSS_ICON}</button></div>`;
  }
};
WcmModalBackcard.styles = [ThemeUtil.globalCss, styles$q];
WcmModalBackcard = __decorateClass$u([
  e$2("wcm-modal-backcard")
], WcmModalBackcard);
const styles$p = i$3`main{padding:20px;padding-top:0;width:100%}`;
var __getOwnPropDesc$t = Object.getOwnPropertyDescriptor;
var __decorateClass$t = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$t(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = decorator(result) || result;
  return result;
};
let WcmModalContent = class extends s {
  // -- render ------------------------------------------------------- //
  render() {
    return x`<main><slot></slot></main>`;
  }
};
WcmModalContent.styles = [ThemeUtil.globalCss, styles$p];
WcmModalContent = __decorateClass$t([
  e$2("wcm-modal-content")
], WcmModalContent);
const styles$o = i$3`footer{padding:10px;display:flex;flex-direction:column;align-items:inherit;justify-content:inherit;border-top:1px solid var(--wcm-color-bg-2)}`;
var __getOwnPropDesc$s = Object.getOwnPropertyDescriptor;
var __decorateClass$s = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$s(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = decorator(result) || result;
  return result;
};
let WcmModalFooter = class extends s {
  // -- render ------------------------------------------------------- //
  render() {
    return x`<footer><slot></slot></footer>`;
  }
};
WcmModalFooter.styles = [ThemeUtil.globalCss, styles$o];
WcmModalFooter = __decorateClass$s([
  e$2("wcm-modal-footer")
], WcmModalFooter);
const styles$n = i$3`header{display:flex;justify-content:center;align-items:center;padding:20px;position:relative}.wcm-border{border-bottom:1px solid var(--wcm-color-bg-2);margin-bottom:20px}header button{padding:15px 20px}header button:active{opacity:.5}@media(hover:hover){header button:hover{opacity:.5}}.wcm-back-btn{position:absolute;left:0}.wcm-action-btn{position:absolute;right:0}path{fill:var(--wcm-accent-color)}`;
var __defProp$r = Object.defineProperty;
var __getOwnPropDesc$r = Object.getOwnPropertyDescriptor;
var __decorateClass$r = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$r(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result)
    __defProp$r(target, key, result);
  return result;
};
let WcmModalHeader = class extends s {
  constructor() {
    super(...arguments);
    this.title = "";
    this.onAction = void 0;
    this.actionIcon = void 0;
    this.border = false;
  }
  // -- private ------------------------------------------------------ //
  backBtnTemplate() {
    return x`<button class="wcm-back-btn" @click="${RouterCtrl.goBack}">${SvgUtil.BACK_ICON}</button>`;
  }
  actionBtnTemplate() {
    return x`<button class="wcm-action-btn" @click="${this.onAction}">${this.actionIcon}</button>`;
  }
  // -- render ------------------------------------------------------- //
  render() {
    const classes = {
      "wcm-border": this.border
    };
    const backBtn = RouterCtrl.state.history.length > 1;
    const content = this.title ? x`<wcm-text variant="big-bold">${this.title}</wcm-text>` : x`<slot></slot>`;
    return x`<header class="${o2(classes)}">${backBtn ? this.backBtnTemplate() : null} ${content} ${this.onAction ? this.actionBtnTemplate() : null}</header>`;
  }
};
WcmModalHeader.styles = [ThemeUtil.globalCss, styles$n];
__decorateClass$r([
  n$1()
], WcmModalHeader.prototype, "title", 2);
__decorateClass$r([
  n$1()
], WcmModalHeader.prototype, "onAction", 2);
__decorateClass$r([
  n$1()
], WcmModalHeader.prototype, "actionIcon", 2);
__decorateClass$r([
  n$1({ type: Boolean })
], WcmModalHeader.prototype, "border", 2);
WcmModalHeader = __decorateClass$r([
  e$2("wcm-modal-header")
], WcmModalHeader);
const UiUtil = {
  MOBILE_BREAKPOINT: 600,
  WCM_RECENT_WALLET_DATA: "WCM_RECENT_WALLET_DATA",
  EXPLORER_WALLET_URL: "https://explorer.walletconnect.com/?type=wallet",
  getShadowRootElement(root, selector) {
    const el = root.renderRoot.querySelector(selector);
    if (!el) {
      throw new Error(`${selector} not found`);
    }
    return el;
  },
  getWalletIcon({ id, image_id }) {
    const { walletImages } = ConfigCtrl.state;
    if (walletImages == null ? void 0 : walletImages[id]) {
      return walletImages[id];
    } else if (image_id) {
      return ExplorerCtrl.getWalletImageUrl(image_id);
    }
    return "";
  },
  getWalletName(name, short = false) {
    return short && name.length > 8 ? `${name.substring(0, 8)}..` : name;
  },
  isMobileAnimation() {
    return window.innerWidth <= UiUtil.MOBILE_BREAKPOINT;
  },
  async preloadImage(src) {
    const imagePromise = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = resolve;
      image.onerror = reject;
      image.crossOrigin = "anonymous";
      image.src = src;
    });
    return Promise.race([imagePromise, CoreUtil.wait(3e3)]);
  },
  getErrorMessage(err) {
    return err instanceof Error ? err.message : "Unknown Error";
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debounce(func, timeout = 500) {
    let timer = void 0;
    return (...args) => {
      function next() {
        func(...args);
      }
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(next, timeout);
    };
  },
  handleMobileLinking(wallet, target = "_self") {
    const { walletConnectUri } = OptionsCtrl.state;
    const { mobile, name } = wallet;
    const nativeUrl = mobile == null ? void 0 : mobile.native;
    const universalUrl = mobile == null ? void 0 : mobile.universal;
    UiUtil.setRecentWallet(wallet);
    function onRedirect(uri) {
      if (nativeUrl) {
        const href = CoreUtil.formatNativeUrl(nativeUrl, uri, name);
        CoreUtil.openHref(href, target);
      } else if (universalUrl) {
        const href = CoreUtil.formatUniversalUrl(universalUrl, uri, name);
        CoreUtil.openHref(href, target);
      }
    }
    if (walletConnectUri) {
      onRedirect(walletConnectUri);
    }
  },
  handleAndroidLinking() {
    const { walletConnectUri } = OptionsCtrl.state;
    if (walletConnectUri) {
      CoreUtil.setWalletConnectAndroidDeepLink(walletConnectUri);
      CoreUtil.openHref(walletConnectUri, CoreUtil.isTelegram() ? "_blank" : "_self");
    }
  },
  async handleUriCopy() {
    const { walletConnectUri } = OptionsCtrl.state;
    if (walletConnectUri) {
      try {
        await navigator.clipboard.writeText(walletConnectUri);
        ToastCtrl.openToast("Link copied", "success");
      } catch (e2) {
        ToastCtrl.openToast("Failed to copy", "error");
      }
    }
  },
  getCustomImageUrls() {
    const { walletImages } = ConfigCtrl.state;
    const walletUrls = Object.values(walletImages != null ? walletImages : {});
    return Object.values(walletUrls);
  },
  truncate(value, strLen = 8) {
    if (value.length <= strLen) {
      return value;
    }
    return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
  },
  setRecentWallet(wallet) {
    try {
      localStorage.setItem(UiUtil.WCM_RECENT_WALLET_DATA, JSON.stringify(wallet));
    } catch (e2) {
      console.info("Unable to set recent wallet");
    }
  },
  getRecentWallet() {
    try {
      const wallet = localStorage.getItem(UiUtil.WCM_RECENT_WALLET_DATA);
      if (wallet) {
        const json = JSON.parse(wallet);
        return json;
      }
      return void 0;
    } catch (e2) {
      console.info("Unable to get recent wallet");
    }
    return void 0;
  },
  caseSafeIncludes(str1, str2) {
    return str1.toUpperCase().includes(str2.toUpperCase());
  },
  openWalletExplorerUrl() {
    CoreUtil.openHref(UiUtil.EXPLORER_WALLET_URL, "_blank");
  },
  getCachedRouterWalletPlatforms() {
    const { desktop, mobile } = CoreUtil.getWalletRouterData();
    const isDesktop = Boolean(desktop == null ? void 0 : desktop.native);
    const isWeb = Boolean(desktop == null ? void 0 : desktop.universal);
    const isMobile = Boolean(mobile == null ? void 0 : mobile.native) || Boolean(mobile == null ? void 0 : mobile.universal);
    return { isDesktop, isMobile, isWeb };
  },
  goToConnectingView(wallet) {
    RouterCtrl.setData({ Wallet: wallet });
    const isMobileDevice = CoreUtil.isMobile();
    const { isDesktop, isWeb, isMobile } = UiUtil.getCachedRouterWalletPlatforms();
    if (isMobileDevice) {
      if (isMobile) {
        RouterCtrl.push("MobileConnecting");
        if (!CoreUtil.isAndroid() && CoreUtil.isTelegram()) {
          this.handleMobileLinking(wallet, "_blank");
        }
      } else if (isWeb) {
        RouterCtrl.push("WebConnecting");
      } else {
        RouterCtrl.push("InstallWallet");
      }
    } else if (isDesktop) {
      RouterCtrl.push("DesktopConnecting");
    } else if (isWeb) {
      RouterCtrl.push("WebConnecting");
    } else if (isMobile) {
      RouterCtrl.push("MobileQrcodeConnecting");
    } else {
      RouterCtrl.push("InstallWallet");
    }
  }
};
const styles$m = i$3`.wcm-router{overflow:hidden;will-change:transform}.wcm-content{display:flex;flex-direction:column}`;
var __defProp$q = Object.defineProperty;
var __getOwnPropDesc$q = Object.getOwnPropertyDescriptor;
var __decorateClass$q = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$q(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result)
    __defProp$q(target, key, result);
  return result;
};
let WcmModalRouter = class extends s {
  // -- lifecycle ---------------------------------------------------- //
  constructor() {
    super();
    this.view = RouterCtrl.state.view;
    this.prevView = RouterCtrl.state.view;
    this.unsubscribe = void 0;
    this.oldHeight = "0px";
    this.resizeObserver = void 0;
    this.unsubscribe = RouterCtrl.subscribe((routerState) => {
      if (this.view !== routerState.view) {
        this.onChangeRoute();
      }
    });
  }
  firstUpdated() {
    this.resizeObserver = new ResizeObserver(([conetnt]) => {
      const newHeight = `${conetnt.contentRect.height}px`;
      if (this.oldHeight !== "0px") {
        animate(this.routerEl, { height: [this.oldHeight, newHeight] }, { duration: 0.2 });
      }
      this.oldHeight = newHeight;
    });
    this.resizeObserver.observe(this.contentEl);
  }
  disconnectedCallback() {
    var _a, _b;
    (_a = this.unsubscribe) == null ? void 0 : _a.call(this);
    (_b = this.resizeObserver) == null ? void 0 : _b.disconnect();
  }
  get routerEl() {
    return UiUtil.getShadowRootElement(this, ".wcm-router");
  }
  get contentEl() {
    return UiUtil.getShadowRootElement(this, ".wcm-content");
  }
  viewTemplate() {
    switch (this.view) {
      case "ConnectWallet":
        return x`<wcm-connect-wallet-view></wcm-connect-wallet-view>`;
      case "DesktopConnecting":
        return x`<wcm-desktop-connecting-view></wcm-desktop-connecting-view>`;
      case "MobileConnecting":
        return x`<wcm-mobile-connecting-view></wcm-mobile-connecting-view>`;
      case "WebConnecting":
        return x`<wcm-web-connecting-view></wcm-web-connecting-view>`;
      case "MobileQrcodeConnecting":
        return x`<wcm-mobile-qr-connecting-view></wcm-mobile-qr-connecting-view>`;
      case "WalletExplorer":
        return x`<wcm-wallet-explorer-view></wcm-wallet-explorer-view>`;
      case "Qrcode":
        return x`<wcm-qrcode-view></wcm-qrcode-view>`;
      case "InstallWallet":
        return x`<wcm-install-wallet-view></wcm-install-wallet-view>`;
      default:
        return x`<div>Not Found</div>`;
    }
  }
  async onChangeRoute() {
    await animate(
      this.routerEl,
      { opacity: [1, 0], scale: [1, 1.02] },
      { duration: 0.15, delay: 0.1 }
    ).finished;
    this.view = RouterCtrl.state.view;
    animate(this.routerEl, { opacity: [0, 1], scale: [0.99, 1] }, { duration: 0.37, delay: 0.05 });
  }
  // -- render ------------------------------------------------------- //
  render() {
    return x`<div class="wcm-router"><div class="wcm-content">${this.viewTemplate()}</div></div>`;
  }
};
WcmModalRouter.styles = [ThemeUtil.globalCss, styles$m];
__decorateClass$q([
  t$1()
], WcmModalRouter.prototype, "view", 2);
__decorateClass$q([
  t$1()
], WcmModalRouter.prototype, "prevView", 2);
WcmModalRouter = __decorateClass$q([
  e$2("wcm-modal-router")
], WcmModalRouter);
const styles$l = i$3`div{height:36px;width:max-content;display:flex;justify-content:center;align-items:center;padding:9px 15px 11px;position:absolute;top:12px;box-shadow:0 6px 14px -6px rgba(10,16,31,.3),0 10px 32px -4px rgba(10,16,31,.15);z-index:2;left:50%;transform:translateX(-50%);pointer-events:none;backdrop-filter:blur(20px) saturate(1.8);-webkit-backdrop-filter:blur(20px) saturate(1.8);border-radius:var(--wcm-notification-border-radius);border:1px solid var(--wcm-color-overlay);background-color:var(--wcm-color-overlay)}svg{margin-right:5px}@-moz-document url-prefix(){div{background-color:var(--wcm-color-bg-3)}}.wcm-success path{fill:var(--wcm-accent-color)}.wcm-error path{fill:var(--wcm-error-color)}`;
var __defProp$p = Object.defineProperty;
var __getOwnPropDesc$p = Object.getOwnPropertyDescriptor;
var __decorateClass$p = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$p(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result)
    __defProp$p(target, key, result);
  return result;
};
let WcmModalToast = class extends s {
  constructor() {
    super();
    this.open = false;
    this.unsubscribe = void 0;
    this.timeout = void 0;
    this.unsubscribe = ToastCtrl.subscribe((newState) => {
      if (newState.open) {
        this.open = true;
        this.timeout = setTimeout(() => ToastCtrl.closeToast(), 2200);
      } else {
        this.open = false;
        clearTimeout(this.timeout);
      }
    });
  }
  disconnectedCallback() {
    var _a;
    (_a = this.unsubscribe) == null ? void 0 : _a.call(this);
    clearTimeout(this.timeout);
    ToastCtrl.closeToast();
  }
  // -- render ------------------------------------------------------- //
  render() {
    const { message, variant } = ToastCtrl.state;
    const classes = {
      "wcm-success": variant === "success",
      "wcm-error": variant === "error"
    };
    return this.open ? x`<div class="${o2(classes)}">${variant === "success" ? SvgUtil.CHECKMARK_ICON : null} ${variant === "error" ? SvgUtil.CROSS_ICON : null}<wcm-text variant="small-regular">${message}</wcm-text></div>` : null;
  }
};
WcmModalToast.styles = [ThemeUtil.globalCss, styles$l];
__decorateClass$p([
  t$1()
], WcmModalToast.prototype, "open", 2);
WcmModalToast = __decorateClass$p([
  e$2("wcm-modal-toast")
], WcmModalToast);
const CONNECTING_ERROR_MARGIN = 0.1;
const CIRCLE_SIZE_MODIFIER = 2.5;
const QRCODE_MATRIX_MARGIN = 7;
function isAdjecentDots(cy, otherCy, cellSize) {
  if (cy === otherCy) {
    return false;
  }
  const diff = cy - otherCy < 0 ? otherCy - cy : cy - otherCy;
  return diff <= cellSize + CONNECTING_ERROR_MARGIN;
}
function getMatrix(value, errorCorrectionLevel) {
  const arr = Array.prototype.slice.call(
    QRCodeUtil.create(value, { errorCorrectionLevel }).modules.data,
    0
  );
  const sqrt = Math.sqrt(arr.length);
  return arr.reduce(
    (rows, key, index) => (index % sqrt === 0 ? rows.push([key]) : rows[rows.length - 1].push(key)) && rows,
    []
  );
}
const QrCodeUtil = {
  generate(uri, size, logoSize) {
    const dotColor = "#141414";
    const edgeColor = "#ffffff";
    const dots = [];
    const matrix = getMatrix(uri, "Q");
    const cellSize = size / matrix.length;
    const qrList = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 }
    ];
    qrList.forEach(({ x: x2, y: y2 }) => {
      const x1 = (matrix.length - QRCODE_MATRIX_MARGIN) * cellSize * x2;
      const y1 = (matrix.length - QRCODE_MATRIX_MARGIN) * cellSize * y2;
      const borderRadius = 0.45;
      for (let i2 = 0; i2 < qrList.length; i2 += 1) {
        const dotSize = cellSize * (QRCODE_MATRIX_MARGIN - i2 * 2);
        dots.push(
          b`<rect fill="${i2 % 2 === 0 ? dotColor : edgeColor}" height="${dotSize}" rx="${dotSize * borderRadius}" ry="${dotSize * borderRadius}" width="${dotSize}" x="${x1 + cellSize * i2}" y="${y1 + cellSize * i2}">`
        );
      }
    });
    const clearArenaSize = Math.floor((logoSize + 25) / cellSize);
    const matrixMiddleStart = matrix.length / 2 - clearArenaSize / 2;
    const matrixMiddleEnd = matrix.length / 2 + clearArenaSize / 2 - 1;
    const circles = [];
    matrix.forEach((row, i2) => {
      row.forEach((_2, j) => {
        if (matrix[i2][j]) {
          if (!(i2 < QRCODE_MATRIX_MARGIN && j < QRCODE_MATRIX_MARGIN || i2 > matrix.length - (QRCODE_MATRIX_MARGIN + 1) && j < QRCODE_MATRIX_MARGIN || i2 < QRCODE_MATRIX_MARGIN && j > matrix.length - (QRCODE_MATRIX_MARGIN + 1))) {
            if (!(i2 > matrixMiddleStart && i2 < matrixMiddleEnd && j > matrixMiddleStart && j < matrixMiddleEnd)) {
              const cx = i2 * cellSize + cellSize / 2;
              const cy = j * cellSize + cellSize / 2;
              circles.push([cx, cy]);
            }
          }
        }
      });
    });
    const circlesToConnect = {};
    circles.forEach(([cx, cy]) => {
      if (circlesToConnect[cx]) {
        circlesToConnect[cx].push(cy);
      } else {
        circlesToConnect[cx] = [cy];
      }
    });
    Object.entries(circlesToConnect).map(([cx, cys]) => {
      const newCys = cys.filter(
        (cy) => cys.every((otherCy) => !isAdjecentDots(cy, otherCy, cellSize))
      );
      return [Number(cx), newCys];
    }).forEach(([cx, cys]) => {
      cys.forEach((cy) => {
        dots.push(
          b`<circle cx="${cx}" cy="${cy}" fill="${dotColor}" r="${cellSize / CIRCLE_SIZE_MODIFIER}">`
        );
      });
    });
    Object.entries(circlesToConnect).filter(([_2, cys]) => cys.length > 1).map(([cx, cys]) => {
      const newCys = cys.filter((cy) => cys.some((otherCy) => isAdjecentDots(cy, otherCy, cellSize)));
      return [Number(cx), newCys];
    }).map(([cx, cys]) => {
      cys.sort((a2, b2) => a2 < b2 ? -1 : 1);
      const groups = [];
      for (const cy of cys) {
        const group = groups.find(
          (item) => item.some((otherCy) => isAdjecentDots(cy, otherCy, cellSize))
        );
        if (group) {
          group.push(cy);
        } else {
          groups.push([cy]);
        }
      }
      return [cx, groups.map((item) => [item[0], item[item.length - 1]])];
    }).forEach(([cx, groups]) => {
      groups.forEach(([y1, y2]) => {
        dots.push(
          b`<line x1="${cx}" x2="${cx}" y1="${y1}" y2="${y2}" stroke="${dotColor}" stroke-width="${cellSize / (CIRCLE_SIZE_MODIFIER / 2)}" stroke-linecap="round">`
        );
      });
    });
    return dots;
  }
};
const styles$k = i$3`@keyframes fadeIn{0%{opacity:0}100%{opacity:1}}div{position:relative;user-select:none;display:block;overflow:hidden;aspect-ratio:1/1;animation:fadeIn ease .2s}.wcm-dark{background-color:#fff;border-radius:var(--wcm-container-border-radius);padding:18px;box-shadow:0 2px 5px #000}svg:first-child,wcm-wallet-image{position:absolute;top:50%;left:50%;transform:translateY(-50%) translateX(-50%)}wcm-wallet-image{transform:translateY(-50%) translateX(-50%)}wcm-wallet-image{width:25%;height:25%;border-radius:var(--wcm-wallet-icon-border-radius)}svg:first-child{transform:translateY(-50%) translateX(-50%) scale(.9)}svg:first-child path:first-child{fill:var(--wcm-accent-color)}svg:first-child path:last-child{stroke:var(--wcm-color-overlay)}`;
var __defProp$o = Object.defineProperty;
var __getOwnPropDesc$o = Object.getOwnPropertyDescriptor;
var __decorateClass$o = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$o(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result)
    __defProp$o(target, key, result);
  return result;
};
let WcmQrCode = class extends s {
  constructor() {
    super(...arguments);
    this.uri = "";
    this.size = 0;
    this.imageId = void 0;
    this.walletId = void 0;
    this.imageUrl = void 0;
  }
  // -- private ------------------------------------------------------ //
  svgTemplate() {
    const isLightMode = ThemeCtrl.state.themeMode === "light";
    const size = isLightMode ? this.size : this.size - 18 * 2;
    return b`<svg height="${size}" width="${size}">${QrCodeUtil.generate(this.uri, size, size / 4)}</svg>`;
  }
  // -- render ------------------------------------------------------- //
  render() {
    const classes = {
      "wcm-dark": ThemeCtrl.state.themeMode === "dark"
    };
    return x`<div style="${`width: ${this.size}px`}" class="${o2(classes)}">${this.walletId || this.imageUrl ? x`<wcm-wallet-image walletId="${l(this.walletId)}" imageId="${l(this.imageId)}" imageUrl="${l(this.imageUrl)}"></wcm-wallet-image>` : SvgUtil.WALLET_CONNECT_ICON_COLORED} ${this.svgTemplate()}</div>`;
  }
};
WcmQrCode.styles = [ThemeUtil.globalCss, styles$k];
__decorateClass$o([
  n$1()
], WcmQrCode.prototype, "uri", 2);
__decorateClass$o([
  n$1({ type: Number })
], WcmQrCode.prototype, "size", 2);
__decorateClass$o([
  n$1()
], WcmQrCode.prototype, "imageId", 2);
__decorateClass$o([
  n$1()
], WcmQrCode.prototype, "walletId", 2);
__decorateClass$o([
  n$1()
], WcmQrCode.prototype, "imageUrl", 2);
WcmQrCode = __decorateClass$o([
  e$2("wcm-qrcode")
], WcmQrCode);
const styles$j = i$3`:host{position:relative;height:28px;width:80%}input{width:100%;height:100%;line-height:28px!important;border-radius:var(--wcm-input-border-radius);font-style:normal;font-family:-apple-system,system-ui,BlinkMacSystemFont,'Segoe UI',Roboto,Ubuntu,'Helvetica Neue',sans-serif;font-feature-settings:'case' on;font-weight:500;font-size:16px;letter-spacing:-.03em;padding:0 10px 0 34px;transition:.2s all ease;color:var(--wcm-color-fg-1);background-color:var(--wcm-color-bg-3);box-shadow:inset 0 0 0 1px var(--wcm-color-overlay);caret-color:var(--wcm-accent-color)}input::placeholder{color:var(--wcm-color-fg-2)}svg{left:10px;top:4px;pointer-events:none;position:absolute;width:20px;height:20px}input:focus-within{box-shadow:inset 0 0 0 1px var(--wcm-accent-color)}path{fill:var(--wcm-color-fg-2)}`;
var __defProp$n = Object.defineProperty;
var __getOwnPropDesc$n = Object.getOwnPropertyDescriptor;
var __decorateClass$n = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$n(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result)
    __defProp$n(target, key, result);
  return result;
};
let WcmSearchInput = class extends s {
  constructor() {
    super(...arguments);
    this.onChange = () => null;
  }
  // -- render ------------------------------------------------------- //
  render() {
    return x`<input type="text" @input="${this.onChange}" placeholder="Search wallets"> ${SvgUtil.SEARCH_ICON}`;
  }
};
WcmSearchInput.styles = [ThemeUtil.globalCss, styles$j];
__decorateClass$n([
  n$1()
], WcmSearchInput.prototype, "onChange", 2);
WcmSearchInput = __decorateClass$n([
  e$2("wcm-search-input")
], WcmSearchInput);
const styles$i = i$3`@keyframes rotate{100%{transform:rotate(360deg)}}@keyframes dash{0%{stroke-dasharray:1,150;stroke-dashoffset:0}50%{stroke-dasharray:90,150;stroke-dashoffset:-35}100%{stroke-dasharray:90,150;stroke-dashoffset:-124}}svg{animation:rotate 2s linear infinite;display:flex;justify-content:center;align-items:center}svg circle{stroke-linecap:round;animation:dash 1.5s ease infinite;stroke:var(--wcm-accent-color)}`;
var __getOwnPropDesc$m = Object.getOwnPropertyDescriptor;
var __decorateClass$m = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$m(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = decorator(result) || result;
  return result;
};
let WcmSpinner = class extends s {
  // -- render ------------------------------------------------------- //
  render() {
    return x`<svg viewBox="0 0 50 50" width="24" height="24"><circle cx="25" cy="25" r="20" fill="none" stroke-width="4" stroke="#fff"/></svg>`;
  }
};
WcmSpinner.styles = [ThemeUtil.globalCss, styles$i];
WcmSpinner = __decorateClass$m([
  e$2("wcm-spinner")
], WcmSpinner);
const styles$h = i$3`span{font-style:normal;font-family:var(--wcm-font-family);font-feature-settings:var(--wcm-font-feature-settings)}.wcm-xsmall-bold{font-family:var(--wcm-text-xsmall-bold-font-family);font-weight:var(--wcm-text-xsmall-bold-weight);font-size:var(--wcm-text-xsmall-bold-size);line-height:var(--wcm-text-xsmall-bold-line-height);letter-spacing:var(--wcm-text-xsmall-bold-letter-spacing);text-transform:var(--wcm-text-xsmall-bold-text-transform)}.wcm-xsmall-regular{font-family:var(--wcm-text-xsmall-regular-font-family);font-weight:var(--wcm-text-xsmall-regular-weight);font-size:var(--wcm-text-xsmall-regular-size);line-height:var(--wcm-text-xsmall-regular-line-height);letter-spacing:var(--wcm-text-xsmall-regular-letter-spacing);text-transform:var(--wcm-text-xsmall-regular-text-transform)}.wcm-small-thin{font-family:var(--wcm-text-small-thin-font-family);font-weight:var(--wcm-text-small-thin-weight);font-size:var(--wcm-text-small-thin-size);line-height:var(--wcm-text-small-thin-line-height);letter-spacing:var(--wcm-text-small-thin-letter-spacing);text-transform:var(--wcm-text-small-thin-text-transform)}.wcm-small-regular{font-family:var(--wcm-text-small-regular-font-family);font-weight:var(--wcm-text-small-regular-weight);font-size:var(--wcm-text-small-regular-size);line-height:var(--wcm-text-small-regular-line-height);letter-spacing:var(--wcm-text-small-regular-letter-spacing);text-transform:var(--wcm-text-small-regular-text-transform)}.wcm-medium-regular{font-family:var(--wcm-text-medium-regular-font-family);font-weight:var(--wcm-text-medium-regular-weight);font-size:var(--wcm-text-medium-regular-size);line-height:var(--wcm-text-medium-regular-line-height);letter-spacing:var(--wcm-text-medium-regular-letter-spacing);text-transform:var(--wcm-text-medium-regular-text-transform)}.wcm-big-bold{font-family:var(--wcm-text-big-bold-font-family);font-weight:var(--wcm-text-big-bold-weight);font-size:var(--wcm-text-big-bold-size);line-height:var(--wcm-text-big-bold-line-height);letter-spacing:var(--wcm-text-big-bold-letter-spacing);text-transform:var(--wcm-text-big-bold-text-transform)}:host(*){color:var(--wcm-color-fg-1)}.wcm-color-primary{color:var(--wcm-color-fg-1)}.wcm-color-secondary{color:var(--wcm-color-fg-2)}.wcm-color-tertiary{color:var(--wcm-color-fg-3)}.wcm-color-inverse{color:var(--wcm-accent-fill-color)}.wcm-color-accnt{color:var(--wcm-accent-color)}.wcm-color-error{color:var(--wcm-error-color)}`;
var __defProp$l = Object.defineProperty;
var __getOwnPropDesc$l = Object.getOwnPropertyDescriptor;
var __decorateClass$l = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$l(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result)
    __defProp$l(target, key, result);
  return result;
};
let WcmText = class extends s {
  constructor() {
    super(...arguments);
    this.variant = "medium-regular";
    this.color = "primary";
  }
  // -- render ------------------------------------------------------- //
  render() {
    const classes = {
      "wcm-big-bold": this.variant === "big-bold",
      "wcm-medium-regular": this.variant === "medium-regular",
      "wcm-small-regular": this.variant === "small-regular",
      "wcm-small-thin": this.variant === "small-thin",
      "wcm-xsmall-regular": this.variant === "xsmall-regular",
      "wcm-xsmall-bold": this.variant === "xsmall-bold",
      "wcm-color-primary": this.color === "primary",
      "wcm-color-secondary": this.color === "secondary",
      "wcm-color-tertiary": this.color === "tertiary",
      "wcm-color-inverse": this.color === "inverse",
      "wcm-color-accnt": this.color === "accent",
      "wcm-color-error": this.color === "error"
    };
    return x`<span><slot class="${o2(classes)}"></slot></span>`;
  }
};
WcmText.styles = [ThemeUtil.globalCss, styles$h];
__decorateClass$l([
  n$1()
], WcmText.prototype, "variant", 2);
__decorateClass$l([
  n$1()
], WcmText.prototype, "color", 2);
WcmText = __decorateClass$l([
  e$2("wcm-text")
], WcmText);
const styles$g = i$3`button{width:100%;height:100%;border-radius:var(--wcm-button-hover-highlight-border-radius);display:flex;align-items:flex-start}button:active{background-color:var(--wcm-color-overlay)}@media(hover:hover){button:hover{background-color:var(--wcm-color-overlay)}}button>div{width:80px;padding:5px 0;display:flex;flex-direction:column;align-items:center}wcm-text{width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center}wcm-wallet-image{height:60px;width:60px;transition:all .2s ease;border-radius:var(--wcm-wallet-icon-border-radius);margin-bottom:5px}.wcm-sublabel{margin-top:2px}`;
var __defProp$k = Object.defineProperty;
var __getOwnPropDesc$k = Object.getOwnPropertyDescriptor;
var __decorateClass$k = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$k(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result)
    __defProp$k(target, key, result);
  return result;
};
let WcmWalletButton = class extends s {
  constructor() {
    super(...arguments);
    this.onClick = () => null;
    this.name = "";
    this.walletId = "";
    this.label = void 0;
    this.imageId = void 0;
    this.installed = false;
    this.recent = false;
  }
  // -- private ------------------------------------------------------ //
  sublabelTemplate() {
    if (this.recent) {
      return x`<wcm-text class="wcm-sublabel" variant="xsmall-bold" color="tertiary">RECENT</wcm-text>`;
    } else if (this.installed) {
      return x`<wcm-text class="wcm-sublabel" variant="xsmall-bold" color="tertiary">INSTALLED</wcm-text>`;
    }
    return null;
  }
  handleClick() {
    EventsCtrl.click({ name: "WALLET_BUTTON", walletId: this.walletId });
    this.onClick();
  }
  // -- render ------------------------------------------------------- //
  render() {
    var _a;
    return x`<button @click="${this.handleClick.bind(this)}"><div><wcm-wallet-image walletId="${this.walletId}" imageId="${l(this.imageId)}"></wcm-wallet-image><wcm-text variant="xsmall-regular">${(_a = this.label) != null ? _a : UiUtil.getWalletName(this.name, true)}</wcm-text>${this.sublabelTemplate()}</div></button>`;
  }
};
WcmWalletButton.styles = [ThemeUtil.globalCss, styles$g];
__decorateClass$k([
  n$1()
], WcmWalletButton.prototype, "onClick", 2);
__decorateClass$k([
  n$1()
], WcmWalletButton.prototype, "name", 2);
__decorateClass$k([
  n$1()
], WcmWalletButton.prototype, "walletId", 2);
__decorateClass$k([
  n$1()
], WcmWalletButton.prototype, "label", 2);
__decorateClass$k([
  n$1()
], WcmWalletButton.prototype, "imageId", 2);
__decorateClass$k([
  n$1({ type: Boolean })
], WcmWalletButton.prototype, "installed", 2);
__decorateClass$k([
  n$1({ type: Boolean })
], WcmWalletButton.prototype, "recent", 2);
WcmWalletButton = __decorateClass$k([
  e$2("wcm-wallet-button")
], WcmWalletButton);
const styles$f = i$3`:host{display:block}div{overflow:hidden;position:relative;border-radius:inherit;width:100%;height:100%;background-color:var(--wcm-color-overlay)}svg{position:relative;width:100%;height:100%}div::after{content:'';position:absolute;top:0;bottom:0;left:0;right:0;border-radius:inherit;border:1px solid var(--wcm-color-overlay)}div img{width:100%;height:100%;object-fit:cover;object-position:center}#wallet-placeholder-fill{fill:var(--wcm-color-bg-3)}#wallet-placeholder-dash{stroke:var(--wcm-color-overlay)}`;
var __defProp$j = Object.defineProperty;
var __getOwnPropDesc$j = Object.getOwnPropertyDescriptor;
var __decorateClass$j = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$j(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result)
    __defProp$j(target, key, result);
  return result;
};
let WcmWalletImage = class extends s {
  constructor() {
    super(...arguments);
    this.walletId = "";
    this.imageId = void 0;
    this.imageUrl = void 0;
  }
  // -- render ------------------------------------------------------- //
  render() {
    var _a;
    const src = ((_a = this.imageUrl) == null ? void 0 : _a.length) ? this.imageUrl : UiUtil.getWalletIcon({ id: this.walletId, image_id: this.imageId });
    return x`${src.length ? x`<div><img crossorigin="anonymous" src="${src}" alt="${this.id}"></div>` : SvgUtil.WALLET_PLACEHOLDER}`;
  }
};
WcmWalletImage.styles = [ThemeUtil.globalCss, styles$f];
__decorateClass$j([
  n$1()
], WcmWalletImage.prototype, "walletId", 2);
__decorateClass$j([
  n$1()
], WcmWalletImage.prototype, "imageId", 2);
__decorateClass$j([
  n$1()
], WcmWalletImage.prototype, "imageUrl", 2);
WcmWalletImage = __decorateClass$j([
  e$2("wcm-wallet-image")
], WcmWalletImage);
var __defProp$i = Object.defineProperty;
var __getOwnPropDesc$i = Object.getOwnPropertyDescriptor;
var __decorateClass$i = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$i(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result)
    __defProp$i(target, key, result);
  return result;
};
let WcmExplorerContext = class extends s {
  // -- lifecycle ---------------------------------------------------- //
  constructor() {
    super();
    this.preload = true;
    this.preloadData();
  }
  // -- private ------------------------------------------------------ //
  async loadImages(images) {
    try {
      if (images == null ? void 0 : images.length) {
        await Promise.all(images.map(async (url) => UiUtil.preloadImage(url)));
      }
    } catch (e2) {
      console.info("Unsuccessful attempt at preloading some images", images);
    }
  }
  async preloadListings() {
    if (ConfigCtrl.state.enableExplorer) {
      await ExplorerCtrl.getRecomendedWallets();
      OptionsCtrl.setIsDataLoaded(true);
      const { recomendedWallets } = ExplorerCtrl.state;
      const walletImgs = recomendedWallets.map((wallet) => UiUtil.getWalletIcon(wallet));
      await this.loadImages(walletImgs);
    } else {
      OptionsCtrl.setIsDataLoaded(true);
    }
  }
  async preloadCustomImages() {
    const images = UiUtil.getCustomImageUrls();
    await this.loadImages(images);
  }
  async preloadData() {
    try {
      if (this.preload) {
        this.preload = false;
        await Promise.all([this.preloadListings(), this.preloadCustomImages()]);
      }
    } catch (err) {
      console.error(err);
      ToastCtrl.openToast("Failed preloading", "error");
    }
  }
};
__decorateClass$i([
  t$1()
], WcmExplorerContext.prototype, "preload", 2);
WcmExplorerContext = __decorateClass$i([
  e$2("wcm-explorer-context")
], WcmExplorerContext);
var __getOwnPropDesc$h = Object.getOwnPropertyDescriptor;
var __decorateClass$h = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$h(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = decorator(result) || result;
  return result;
};
let WcmThemeContext = class extends s {
  // -- lifecycle ---------------------------------------------------- //
  constructor() {
    super();
    this.unsubscribeTheme = void 0;
    ThemeUtil.setTheme();
    this.unsubscribeTheme = ThemeCtrl.subscribe(ThemeUtil.setTheme);
  }
  disconnectedCallback() {
    var _a;
    (_a = this.unsubscribeTheme) == null ? void 0 : _a.call(this);
  }
};
WcmThemeContext = __decorateClass$h([
  e$2("wcm-theme-context")
], WcmThemeContext);
const styles$e = i$3`@keyframes scroll{0%{transform:translate3d(0,0,0)}100%{transform:translate3d(calc(-70px * 9),0,0)}}.wcm-slider{position:relative;overflow-x:hidden;padding:10px 0;margin:0 -20px;width:calc(100% + 40px)}.wcm-track{display:flex;width:calc(70px * 18);animation:scroll 20s linear infinite;opacity:.7}.wcm-track svg{margin:0 5px}wcm-wallet-image{width:60px;height:60px;margin:0 5px;border-radius:var(--wcm-wallet-icon-border-radius)}.wcm-grid{display:grid;grid-template-columns:repeat(4,80px);justify-content:space-between}.wcm-title{display:flex;align-items:center;margin-bottom:10px}.wcm-title svg{margin-right:6px}.wcm-title path{fill:var(--wcm-accent-color)}wcm-modal-footer .wcm-title{padding:0 10px}wcm-button-big{position:absolute;top:50%;left:50%;transform:translateY(-50%) translateX(-50%);filter:drop-shadow(0 0 17px var(--wcm-color-bg-1))}wcm-info-footer{flex-direction:column;align-items:center;display:flex;width:100%;padding:5px 0}wcm-info-footer wcm-text{text-align:center;margin-bottom:15px}#wallet-placeholder-fill{fill:var(--wcm-color-bg-3)}#wallet-placeholder-dash{stroke:var(--wcm-color-overlay)}`;
var __getOwnPropDesc$g = Object.getOwnPropertyDescriptor;
var __decorateClass$g = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$g(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = decorator(result) || result;
  return result;
};
let WcmAndroidWalletSelection = class extends s {
  // -- private ------------------------------------------------------ //
  onGoToQrcode() {
    RouterCtrl.push("Qrcode");
  }
  // -- render ------------------------------------------------------- //
  render() {
    const { recomendedWallets } = ExplorerCtrl.state;
    const wallets = [...recomendedWallets, ...recomendedWallets];
    const recomendedCount = CoreUtil.RECOMMENDED_WALLET_AMOUNT * 2;
    return x`<wcm-modal-header title="Connect your wallet" .onAction="${this.onGoToQrcode}" .actionIcon="${SvgUtil.QRCODE_ICON}"></wcm-modal-header><wcm-modal-content><div class="wcm-title">${SvgUtil.MOBILE_ICON}<wcm-text variant="small-regular" color="accent">WalletConnect</wcm-text></div><div class="wcm-slider"><div class="wcm-track">${[...Array(recomendedCount)].map((_2, index) => {
      const wallet = wallets[index % wallets.length];
      return wallet ? x`<wcm-wallet-image walletId="${wallet.id}" imageId="${wallet.image_id}"></wcm-wallet-image>` : SvgUtil.WALLET_PLACEHOLDER;
    })}</div><wcm-button-big @click="${UiUtil.handleAndroidLinking}"><wcm-text variant="medium-regular" color="inverse">Select Wallet</wcm-text></wcm-button-big></div></wcm-modal-content><wcm-info-footer><wcm-text color="secondary" variant="small-thin">Choose WalletConnect to see supported apps on your device</wcm-text></wcm-info-footer>`;
  }
};
WcmAndroidWalletSelection.styles = [ThemeUtil.globalCss, styles$e];
WcmAndroidWalletSelection = __decorateClass$g([
  e$2("wcm-android-wallet-selection")
], WcmAndroidWalletSelection);
const styles$d = i$3`@keyframes loading{to{stroke-dashoffset:0}}@keyframes shake{10%,90%{transform:translate3d(-1px,0,0)}20%,80%{transform:translate3d(1px,0,0)}30%,50%,70%{transform:translate3d(-2px,0,0)}40%,60%{transform:translate3d(2px,0,0)}}:host{display:flex;flex-direction:column;align-items:center}div{position:relative;width:110px;height:110px;display:flex;justify-content:center;align-items:center;margin:40px 0 20px 0;transform:translate3d(0,0,0)}svg{position:absolute;width:110px;height:110px;fill:none;stroke:transparent;stroke-linecap:round;stroke-width:2px;top:0;left:0}use{stroke:var(--wcm-accent-color);animation:loading 1s linear infinite}wcm-wallet-image{border-radius:var(--wcm-wallet-icon-large-border-radius);width:90px;height:90px}wcm-text{margin-bottom:40px}.wcm-error svg{stroke:var(--wcm-error-color)}.wcm-error use{display:none}.wcm-error{animation:shake .4s cubic-bezier(.36,.07,.19,.97) both}.wcm-stale svg,.wcm-stale use{display:none}`;
var __defProp$f = Object.defineProperty;
var __getOwnPropDesc$f = Object.getOwnPropertyDescriptor;
var __decorateClass$f = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$f(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result)
    __defProp$f(target, key, result);
  return result;
};
let WcmConnectorWaiting = class extends s {
  constructor() {
    super(...arguments);
    this.walletId = void 0;
    this.imageId = void 0;
    this.isError = false;
    this.isStale = false;
    this.label = "";
  }
  // -- private ------------------------------------------------------ //
  svgLoaderTemplate() {
    var _a, _b;
    const ICON_SIZE = 88;
    const DH_ARRAY = 317;
    const DH_OFFSET = 425;
    const radius = (_b = (_a = ThemeCtrl.state.themeVariables) == null ? void 0 : _a["--wcm-wallet-icon-large-border-radius"]) != null ? _b : ThemeUtil.getPreset("--wcm-wallet-icon-large-border-radius");
    let numRadius = 0;
    if (radius.includes("%")) {
      numRadius = ICON_SIZE / 100 * parseInt(radius, 10);
    } else {
      numRadius = parseInt(radius, 10);
    }
    numRadius *= 1.17;
    const dashArray = DH_ARRAY - numRadius * 1.57;
    const dashOffset = DH_OFFSET - numRadius * 1.8;
    return x`<svg viewBox="0 0 110 110" width="110" height="110"><rect id="wcm-loader" x="2" y="2" width="106" height="106" rx="${numRadius}"/><use xlink:href="#wcm-loader" stroke-dasharray="106 ${dashArray}" stroke-dashoffset="${dashOffset}"></use></svg>`;
  }
  // -- render ------------------------------------------------------- //
  render() {
    const classes = {
      "wcm-error": this.isError,
      "wcm-stale": this.isStale
    };
    return x`<div class="${o2(classes)}">${this.svgLoaderTemplate()}<wcm-wallet-image walletId="${l(this.walletId)}" imageId="${l(this.imageId)}"></wcm-wallet-image></div><wcm-text variant="medium-regular" color="${this.isError ? "error" : "primary"}">${this.isError ? "Connection declined" : this.label}</wcm-text>`;
  }
};
WcmConnectorWaiting.styles = [ThemeUtil.globalCss, styles$d];
__decorateClass$f([
  n$1()
], WcmConnectorWaiting.prototype, "walletId", 2);
__decorateClass$f([
  n$1()
], WcmConnectorWaiting.prototype, "imageId", 2);
__decorateClass$f([
  n$1({ type: Boolean })
], WcmConnectorWaiting.prototype, "isError", 2);
__decorateClass$f([
  n$1({ type: Boolean })
], WcmConnectorWaiting.prototype, "isStale", 2);
__decorateClass$f([
  n$1()
], WcmConnectorWaiting.prototype, "label", 2);
WcmConnectorWaiting = __decorateClass$f([
  e$2("wcm-connector-waiting")
], WcmConnectorWaiting);
const DataUtil = {
  manualWallets() {
    var _a, _b;
    const { mobileWallets, desktopWallets } = ConfigCtrl.state;
    const recentWalletId = (_a = DataUtil.recentWallet()) == null ? void 0 : _a.id;
    const platformWallets = CoreUtil.isMobile() ? mobileWallets : desktopWallets;
    const wallets = platformWallets == null ? void 0 : platformWallets.filter((wallet) => recentWalletId !== wallet.id);
    return (_b = CoreUtil.isMobile() ? wallets == null ? void 0 : wallets.map(({ id, name, links }) => ({ id, name, mobile: links, links })) : wallets == null ? void 0 : wallets.map(({ id, name, links }) => ({ id, name, desktop: links, links }))) != null ? _b : [];
  },
  recentWallet() {
    return UiUtil.getRecentWallet();
  },
  recomendedWallets(skipRecent = false) {
    var _a;
    const recentWalletId = skipRecent ? void 0 : (_a = DataUtil.recentWallet()) == null ? void 0 : _a.id;
    const { recomendedWallets } = ExplorerCtrl.state;
    const wallets = recomendedWallets.filter((wallet) => recentWalletId !== wallet.id);
    return wallets;
  }
};
const TemplateUtil = {
  onConnecting(data2) {
    UiUtil.goToConnectingView(data2);
  },
  manualWalletsTemplate() {
    const wallets = DataUtil.manualWallets();
    return wallets.map(
      (wallet) => x`<wcm-wallet-button walletId="${wallet.id}" name="${wallet.name}" .onClick="${() => this.onConnecting(wallet)}"></wcm-wallet-button>`
    );
  },
  recomendedWalletsTemplate(skipRecent = false) {
    const wallets = DataUtil.recomendedWallets(skipRecent);
    return wallets.map(
      (wallet) => x`<wcm-wallet-button name="${wallet.name}" walletId="${wallet.id}" imageId="${wallet.image_id}" .onClick="${() => this.onConnecting(wallet)}"></wcm-wallet-button>`
    );
  },
  recentWalletTemplate() {
    const wallet = DataUtil.recentWallet();
    if (!wallet) {
      return void 0;
    }
    return x`<wcm-wallet-button name="${wallet.name}" walletId="${wallet.id}" imageId="${l(wallet.image_id)}" .recent="${true}" .onClick="${() => this.onConnecting(wallet)}"></wcm-wallet-button>`;
  }
};
const styles$c = i$3`.wcm-grid{display:grid;grid-template-columns:repeat(4,80px);justify-content:space-between}.wcm-desktop-title,.wcm-mobile-title{display:flex;align-items:center}.wcm-mobile-title{justify-content:space-between;margin-bottom:20px;margin-top:-10px}.wcm-desktop-title{margin-bottom:10px;padding:0 10px}.wcm-subtitle{display:flex;align-items:center}.wcm-subtitle:last-child path{fill:var(--wcm-color-fg-3)}.wcm-desktop-title svg,.wcm-mobile-title svg{margin-right:6px}.wcm-desktop-title path,.wcm-mobile-title path{fill:var(--wcm-accent-color)}`;
var __getOwnPropDesc$e = Object.getOwnPropertyDescriptor;
var __decorateClass$e = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$e(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = decorator(result) || result;
  return result;
};
let WcmDesktopWalletSelection = class extends s {
  // -- render ------------------------------------------------------- //
  render() {
    const { explorerExcludedWalletIds, enableExplorer } = ConfigCtrl.state;
    const isExplorerWallets = explorerExcludedWalletIds !== "ALL" && enableExplorer;
    const manualTemplate = TemplateUtil.manualWalletsTemplate();
    const recomendedTemplate = TemplateUtil.recomendedWalletsTemplate();
    const recentTemplate = TemplateUtil.recentWalletTemplate();
    let templates = [recentTemplate, ...manualTemplate, ...recomendedTemplate];
    templates = templates.filter(Boolean);
    const isViewAll = templates.length > 4 || isExplorerWallets;
    let wallets = [];
    if (isViewAll) {
      wallets = templates.slice(0, 3);
    } else {
      wallets = templates;
    }
    const isWallets = Boolean(wallets.length);
    return x`<wcm-modal-header .border="${true}" title="Connect your wallet" .onAction="${UiUtil.handleUriCopy}" .actionIcon="${SvgUtil.COPY_ICON}"></wcm-modal-header><wcm-modal-content><div class="wcm-mobile-title"><div class="wcm-subtitle">${SvgUtil.MOBILE_ICON}<wcm-text variant="small-regular" color="accent">Mobile</wcm-text></div><div class="wcm-subtitle">${SvgUtil.SCAN_ICON}<wcm-text variant="small-regular" color="secondary">Scan with your wallet</wcm-text></div></div><wcm-walletconnect-qr></wcm-walletconnect-qr></wcm-modal-content>${isWallets ? x`<wcm-modal-footer><div class="wcm-desktop-title">${SvgUtil.DESKTOP_ICON}<wcm-text variant="small-regular" color="accent">Desktop</wcm-text></div><div class="wcm-grid">${wallets} ${isViewAll ? x`<wcm-view-all-wallets-button></wcm-view-all-wallets-button>` : null}</div></wcm-modal-footer>` : null}`;
  }
};
WcmDesktopWalletSelection.styles = [ThemeUtil.globalCss, styles$c];
WcmDesktopWalletSelection = __decorateClass$e([
  e$2("wcm-desktop-wallet-selection")
], WcmDesktopWalletSelection);
const styles$b = i$3`div{background-color:var(--wcm-color-bg-2);padding:10px 20px 15px 20px;border-top:1px solid var(--wcm-color-bg-3);text-align:center}a{color:var(--wcm-accent-color);text-decoration:none;transition:opacity .2s ease-in-out;display:inline}a:active{opacity:.8}@media(hover:hover){a:hover{opacity:.8}}`;
var __getOwnPropDesc$d = Object.getOwnPropertyDescriptor;
var __decorateClass$d = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$d(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = decorator(result) || result;
  return result;
};
let WcmLegalNotice = class extends s {
  // -- render ------------------------------------------------------- //
  render() {
    const { termsOfServiceUrl, privacyPolicyUrl } = ConfigCtrl.state;
    const isLegal = termsOfServiceUrl != null ? termsOfServiceUrl : privacyPolicyUrl;
    if (!isLegal) {
      return null;
    }
    return x`<div><wcm-text variant="small-regular" color="secondary">By connecting your wallet to this app, you agree to the app's ${termsOfServiceUrl ? x`<a href="${termsOfServiceUrl}" target="_blank" rel="noopener noreferrer">Terms of Service</a>` : null} ${termsOfServiceUrl && privacyPolicyUrl ? "and" : null} ${privacyPolicyUrl ? x`<a href="${privacyPolicyUrl}" target="_blank" rel="noopener noreferrer">Privacy Policy</a>` : null}</wcm-text></div>`;
  }
};
WcmLegalNotice.styles = [ThemeUtil.globalCss, styles$b];
WcmLegalNotice = __decorateClass$d([
  e$2("wcm-legal-notice")
], WcmLegalNotice);
const styles$a = i$3`div{display:grid;grid-template-columns:repeat(4,80px);margin:0 -10px;justify-content:space-between;row-gap:10px}`;
var __getOwnPropDesc$c = Object.getOwnPropertyDescriptor;
var __decorateClass$c = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$c(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = decorator(result) || result;
  return result;
};
let WcmMobileWalletSelection = class extends s {
  // -- private ------------------------------------------------------ //
  onQrcode() {
    RouterCtrl.push("Qrcode");
  }
  // -- render ------------------------------------------------------- //
  render() {
    const { explorerExcludedWalletIds, enableExplorer } = ConfigCtrl.state;
    const isExplorerWallets = explorerExcludedWalletIds !== "ALL" && enableExplorer;
    const manualTemplate = TemplateUtil.manualWalletsTemplate();
    const recomendedTemplate = TemplateUtil.recomendedWalletsTemplate();
    const recentTemplate = TemplateUtil.recentWalletTemplate();
    let templates = [recentTemplate, ...manualTemplate, ...recomendedTemplate];
    templates = templates.filter(Boolean);
    const isViewAll = templates.length > 8 || isExplorerWallets;
    let wallets = [];
    if (isViewAll) {
      wallets = templates.slice(0, 7);
    } else {
      wallets = templates;
    }
    const isWallets = Boolean(wallets.length);
    return x`<wcm-modal-header title="Connect your wallet" .onAction="${this.onQrcode}" .actionIcon="${SvgUtil.QRCODE_ICON}"></wcm-modal-header>${isWallets ? x`<wcm-modal-content><div>${wallets} ${isViewAll ? x`<wcm-view-all-wallets-button></wcm-view-all-wallets-button>` : null}</div></wcm-modal-content>` : null}`;
  }
};
WcmMobileWalletSelection.styles = [ThemeUtil.globalCss, styles$a];
WcmMobileWalletSelection = __decorateClass$c([
  e$2("wcm-mobile-wallet-selection")
], WcmMobileWalletSelection);
const styles$9 = i$3`:host{all:initial}.wcm-overlay{top:0;bottom:0;left:0;right:0;position:fixed;z-index:var(--wcm-z-index);overflow:hidden;display:flex;justify-content:center;align-items:center;opacity:0;pointer-events:none;background-color:var(--wcm-overlay-background-color);backdrop-filter:var(--wcm-overlay-backdrop-filter)}@media(max-height:720px) and (orientation:landscape){.wcm-overlay{overflow:scroll;align-items:flex-start;padding:20px 0}}.wcm-active{pointer-events:auto}.wcm-container{position:relative;max-width:360px;width:100%;outline:0;border-radius:var(--wcm-background-border-radius) var(--wcm-background-border-radius) var(--wcm-container-border-radius) var(--wcm-container-border-radius);border:1px solid var(--wcm-color-overlay);overflow:hidden}.wcm-card{width:100%;position:relative;border-radius:var(--wcm-container-border-radius);overflow:hidden;box-shadow:0 6px 14px -6px rgba(10,16,31,.12),0 10px 32px -4px rgba(10,16,31,.1),0 0 0 1px var(--wcm-color-overlay);background-color:var(--wcm-color-bg-1);color:var(--wcm-color-fg-1)}@media(max-width:600px){.wcm-container{max-width:440px;border-radius:var(--wcm-background-border-radius) var(--wcm-background-border-radius) 0 0}.wcm-card{border-radius:var(--wcm-container-border-radius) var(--wcm-container-border-radius) 0 0}.wcm-overlay{align-items:flex-end}}@media(max-width:440px){.wcm-container{border:0}}`;
var __defProp$b = Object.defineProperty;
var __getOwnPropDesc$b = Object.getOwnPropertyDescriptor;
var __decorateClass$b = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$b(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result)
    __defProp$b(target, key, result);
  return result;
};
let WcmModal = class extends s {
  // -- lifecycle ---------------------------------------------------- //
  constructor() {
    super();
    this.open = false;
    this.active = false;
    this.unsubscribeModal = void 0;
    this.abortController = void 0;
    this.unsubscribeModal = ModalCtrl.subscribe((modalState) => {
      if (modalState.open) {
        this.onOpenModalEvent();
      } else {
        this.onCloseModalEvent();
      }
    });
  }
  disconnectedCallback() {
    var _a;
    (_a = this.unsubscribeModal) == null ? void 0 : _a.call(this);
  }
  get overlayEl() {
    return UiUtil.getShadowRootElement(this, ".wcm-overlay");
  }
  get containerEl() {
    return UiUtil.getShadowRootElement(this, ".wcm-container");
  }
  toggleBodyScroll(enabled) {
    const body = document.querySelector("body");
    if (body) {
      if (enabled) {
        const wcmStyles = document.getElementById("wcm-styles");
        wcmStyles == null ? void 0 : wcmStyles.remove();
      } else {
        document.head.insertAdjacentHTML(
          "beforeend",
          `<style id="wcm-styles">html,body{touch-action:none;overflow:hidden;overscroll-behavior:contain;}</style>`
        );
      }
    }
  }
  onCloseModal(event) {
    if (event.target === event.currentTarget) {
      ModalCtrl.close();
    }
  }
  onOpenModalEvent() {
    this.toggleBodyScroll(false);
    this.addKeyboardEvents();
    this.open = true;
    setTimeout(async () => {
      const animation = UiUtil.isMobileAnimation() ? { y: ["50vh", "0vh"] } : { scale: [0.98, 1] };
      const delay = 0.1;
      const duration = 0.2;
      await Promise.all([
        animate(this.overlayEl, { opacity: [0, 1] }, { delay, duration }).finished,
        animate(this.containerEl, animation, { delay, duration }).finished
      ]);
      this.active = true;
    }, 0);
  }
  async onCloseModalEvent() {
    this.toggleBodyScroll(true);
    this.removeKeyboardEvents();
    const animation = UiUtil.isMobileAnimation() ? { y: ["0vh", "50vh"] } : { scale: [1, 0.98] };
    const duration = 0.2;
    await Promise.all([
      animate(this.overlayEl, { opacity: [1, 0] }, { duration }).finished,
      animate(this.containerEl, animation, { duration }).finished
    ]);
    this.containerEl.removeAttribute("style");
    this.active = false;
    this.open = false;
  }
  addKeyboardEvents() {
    this.abortController = new AbortController();
    window.addEventListener(
      "keydown",
      (event) => {
        var _a;
        if (event.key === "Escape") {
          ModalCtrl.close();
        } else if (event.key === "Tab") {
          if (!((_a = event.target) == null ? void 0 : _a.tagName.includes("wcm-"))) {
            this.containerEl.focus();
          }
        }
      },
      this.abortController
    );
    this.containerEl.focus();
  }
  removeKeyboardEvents() {
    var _a;
    (_a = this.abortController) == null ? void 0 : _a.abort();
    this.abortController = void 0;
  }
  // -- render ------------------------------------------------------- //
  render() {
    const classes = {
      "wcm-overlay": true,
      "wcm-active": this.active
    };
    return x`<wcm-explorer-context></wcm-explorer-context><wcm-theme-context></wcm-theme-context><div id="wcm-modal" class="${o2(classes)}" @click="${this.onCloseModal}" role="alertdialog" aria-modal="true"><div class="wcm-container" tabindex="0">${this.open ? x`<wcm-modal-backcard></wcm-modal-backcard><div class="wcm-card"><wcm-modal-router></wcm-modal-router><wcm-modal-toast></wcm-modal-toast></div>` : null}</div></div>`;
  }
};
WcmModal.styles = [ThemeUtil.globalCss, styles$9];
__decorateClass$b([
  t$1()
], WcmModal.prototype, "open", 2);
__decorateClass$b([
  t$1()
], WcmModal.prototype, "active", 2);
WcmModal = __decorateClass$b([
  e$2("wcm-modal")
], WcmModal);
const styles$8 = i$3`div{display:flex;margin-top:15px}slot{display:inline-block;margin:0 5px}wcm-button{margin:0 5px}`;
var __defProp$a = Object.defineProperty;
var __getOwnPropDesc$a = Object.getOwnPropertyDescriptor;
var __decorateClass$a = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$a(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result)
    __defProp$a(target, key, result);
  return result;
};
let WcmPlatformSelection = class extends s {
  constructor() {
    super(...arguments);
    this.isMobile = false;
    this.isDesktop = false;
    this.isWeb = false;
    this.isRetry = false;
  }
  // -- private ------------------------------------------------------ //
  onMobile() {
    const isMobile = CoreUtil.isMobile();
    if (isMobile) {
      RouterCtrl.replace("MobileConnecting");
    } else {
      RouterCtrl.replace("MobileQrcodeConnecting");
    }
  }
  onDesktop() {
    RouterCtrl.replace("DesktopConnecting");
  }
  onWeb() {
    RouterCtrl.replace("WebConnecting");
  }
  // -- render ------------------------------------------------------- //
  render() {
    return x`<div>${this.isRetry ? x`<slot></slot>` : null} ${this.isMobile ? x`<wcm-button .onClick="${this.onMobile}" .iconLeft="${SvgUtil.MOBILE_ICON}" variant="outline">Mobile</wcm-button>` : null} ${this.isDesktop ? x`<wcm-button .onClick="${this.onDesktop}" .iconLeft="${SvgUtil.DESKTOP_ICON}" variant="outline">Desktop</wcm-button>` : null} ${this.isWeb ? x`<wcm-button .onClick="${this.onWeb}" .iconLeft="${SvgUtil.GLOBE_ICON}" variant="outline">Web</wcm-button>` : null}</div>`;
  }
};
WcmPlatformSelection.styles = [ThemeUtil.globalCss, styles$8];
__decorateClass$a([
  n$1({ type: Boolean })
], WcmPlatformSelection.prototype, "isMobile", 2);
__decorateClass$a([
  n$1({ type: Boolean })
], WcmPlatformSelection.prototype, "isDesktop", 2);
__decorateClass$a([
  n$1({ type: Boolean })
], WcmPlatformSelection.prototype, "isWeb", 2);
__decorateClass$a([
  n$1({ type: Boolean })
], WcmPlatformSelection.prototype, "isRetry", 2);
WcmPlatformSelection = __decorateClass$a([
  e$2("wcm-platform-selection")
], WcmPlatformSelection);
const styles$7 = i$3`button{display:flex;flex-direction:column;padding:5px 10px;border-radius:var(--wcm-button-hover-highlight-border-radius);height:100%;justify-content:flex-start}.wcm-icons{width:60px;height:60px;display:flex;flex-wrap:wrap;padding:7px;border-radius:var(--wcm-wallet-icon-border-radius);justify-content:space-between;align-items:center;margin-bottom:5px;background-color:var(--wcm-color-bg-2);box-shadow:inset 0 0 0 1px var(--wcm-color-overlay)}button:active{background-color:var(--wcm-color-overlay)}@media(hover:hover){button:hover{background-color:var(--wcm-color-overlay)}}.wcm-icons img{width:21px;height:21px;object-fit:cover;object-position:center;border-radius:calc(var(--wcm-wallet-icon-border-radius)/ 2);border:1px solid var(--wcm-color-overlay)}.wcm-icons svg{width:21px;height:21px}.wcm-icons img:nth-child(1),.wcm-icons img:nth-child(2),.wcm-icons svg:nth-child(1),.wcm-icons svg:nth-child(2){margin-bottom:4px}wcm-text{width:100%;text-align:center}#wallet-placeholder-fill{fill:var(--wcm-color-bg-3)}#wallet-placeholder-dash{stroke:var(--wcm-color-overlay)}`;
var __getOwnPropDesc$9 = Object.getOwnPropertyDescriptor;
var __decorateClass$9 = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$9(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = decorator(result) || result;
  return result;
};
let WcmViewAllWalletsButton = class extends s {
  // -- render ------------------------------------------------------- //
  onClick() {
    RouterCtrl.push("WalletExplorer");
  }
  // -- render ------------------------------------------------------- //
  render() {
    const { recomendedWallets } = ExplorerCtrl.state;
    const manualWallets = DataUtil.manualWallets();
    const reversedWallets = [...recomendedWallets, ...manualWallets].reverse().slice(0, 4);
    return x`<button @click="${this.onClick}"><div class="wcm-icons">${reversedWallets.map((wallet) => {
      const explorerImg = UiUtil.getWalletIcon(wallet);
      if (explorerImg) {
        return x`<img crossorigin="anonymous" src="${explorerImg}">`;
      }
      const src = UiUtil.getWalletIcon({ id: wallet.id });
      return src ? x`<img crossorigin="anonymous" src="${src}">` : SvgUtil.WALLET_PLACEHOLDER;
    })} ${[...Array(4 - reversedWallets.length)].map(() => SvgUtil.WALLET_PLACEHOLDER)}</div><wcm-text variant="xsmall-regular">View All</wcm-text></button>`;
  }
};
WcmViewAllWalletsButton.styles = [ThemeUtil.globalCss, styles$7];
WcmViewAllWalletsButton = __decorateClass$9([
  e$2("wcm-view-all-wallets-button")
], WcmViewAllWalletsButton);
const styles$6 = i$3`.wcm-qr-container{width:100%;display:flex;justify-content:center;align-items:center;aspect-ratio:1/1}`;
var __defProp$8 = Object.defineProperty;
var __getOwnPropDesc$8 = Object.getOwnPropertyDescriptor;
var __decorateClass$8 = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$8(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result)
    __defProp$8(target, key, result);
  return result;
};
let WcmWalletConnectQr = class extends s {
  // -- lifecycle ---------------------------------------------------- //
  constructor() {
    super();
    this.walletId = "";
    this.imageId = "";
    this.uri = "";
    setTimeout(() => {
      const { walletConnectUri } = OptionsCtrl.state;
      this.uri = walletConnectUri;
    }, 0);
  }
  // -- private ------------------------------------------------------ //
  get overlayEl() {
    return UiUtil.getShadowRootElement(this, ".wcm-qr-container");
  }
  // -- render ------------------------------------------------------- //
  render() {
    return x`<div class="wcm-qr-container">${this.uri ? x`<wcm-qrcode size="${this.overlayEl.offsetWidth}" uri="${this.uri}" walletId="${l(this.walletId)}" imageId="${l(this.imageId)}"></wcm-qrcode>` : x`<wcm-spinner></wcm-spinner>`}</div>`;
  }
};
WcmWalletConnectQr.styles = [ThemeUtil.globalCss, styles$6];
__decorateClass$8([
  n$1()
], WcmWalletConnectQr.prototype, "walletId", 2);
__decorateClass$8([
  n$1()
], WcmWalletConnectQr.prototype, "imageId", 2);
__decorateClass$8([
  t$1()
], WcmWalletConnectQr.prototype, "uri", 2);
WcmWalletConnectQr = __decorateClass$8([
  e$2("wcm-walletconnect-qr")
], WcmWalletConnectQr);
var __getOwnPropDesc$7 = Object.getOwnPropertyDescriptor;
var __decorateClass$7 = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$7(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = decorator(result) || result;
  return result;
};
let WcmConnectWalletView = class extends s {
  // -- private ------------------------------------------------------ //
  viewTemplate() {
    if (CoreUtil.isAndroid() && !CoreUtil.isTelegram()) {
      return x`<wcm-android-wallet-selection></wcm-android-wallet-selection>`;
    }
    if (CoreUtil.isMobile()) {
      return x`<wcm-mobile-wallet-selection></wcm-mobile-wallet-selection>`;
    }
    return x`<wcm-desktop-wallet-selection></wcm-desktop-wallet-selection>`;
  }
  // -- render ------------------------------------------------------- //
  render() {
    return x`${this.viewTemplate()}<wcm-legal-notice></wcm-legal-notice>`;
  }
};
WcmConnectWalletView.styles = [ThemeUtil.globalCss];
WcmConnectWalletView = __decorateClass$7([
  e$2("wcm-connect-wallet-view")
], WcmConnectWalletView);
const styles$5 = i$3`wcm-info-footer{flex-direction:column;align-items:center;display:flex;width:100%;padding:5px 0}wcm-text{text-align:center}`;
var __defProp$6 = Object.defineProperty;
var __getOwnPropDesc$6 = Object.getOwnPropertyDescriptor;
var __decorateClass$6 = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$6(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result)
    __defProp$6(target, key, result);
  return result;
};
let WcmDesktopConnectingView = class extends s {
  // -- lifecycle ---------------------------------------------------- //
  constructor() {
    super();
    this.isError = false;
    this.openDesktopApp();
  }
  // -- private ------------------------------------------------------ //
  onFormatAndRedirect(uri) {
    const { desktop, name } = CoreUtil.getWalletRouterData();
    const nativeUrl = desktop == null ? void 0 : desktop.native;
    const universalUrl = desktop == null ? void 0 : desktop.universal;
    if (nativeUrl) {
      const href = CoreUtil.formatNativeUrl(nativeUrl, uri, name);
      CoreUtil.openHref(href, "_self");
    } else if (universalUrl) {
      const href = CoreUtil.formatUniversalUrl(universalUrl, uri, name);
      CoreUtil.openHref(href, "_blank");
    }
  }
  openDesktopApp() {
    const { walletConnectUri } = OptionsCtrl.state;
    const routerData = CoreUtil.getWalletRouterData();
    UiUtil.setRecentWallet(routerData);
    if (walletConnectUri) {
      this.onFormatAndRedirect(walletConnectUri);
    }
  }
  // -- render ------------------------------------------------------- //
  render() {
    const { name, id, image_id } = CoreUtil.getWalletRouterData();
    const { isMobile, isWeb } = UiUtil.getCachedRouterWalletPlatforms();
    return x`<wcm-modal-header title="${name}" .onAction="${UiUtil.handleUriCopy}" .actionIcon="${SvgUtil.COPY_ICON}"></wcm-modal-header><wcm-modal-content><wcm-connector-waiting walletId="${id}" imageId="${l(image_id)}" label="${`Continue in ${name}...`}" .isError="${this.isError}"></wcm-connector-waiting></wcm-modal-content><wcm-info-footer><wcm-text color="secondary" variant="small-thin">${`Connection can continue loading if ${name} is not installed on your device`}</wcm-text><wcm-platform-selection .isMobile="${isMobile}" .isWeb="${isWeb}" .isRetry="${true}"><wcm-button .onClick="${this.openDesktopApp.bind(this)}" .iconRight="${SvgUtil.RETRY_ICON}">Retry</wcm-button></wcm-platform-selection></wcm-info-footer>`;
  }
};
WcmDesktopConnectingView.styles = [ThemeUtil.globalCss, styles$5];
__decorateClass$6([
  t$1()
], WcmDesktopConnectingView.prototype, "isError", 2);
WcmDesktopConnectingView = __decorateClass$6([
  e$2("wcm-desktop-connecting-view")
], WcmDesktopConnectingView);
const styles$4 = i$3`wcm-info-footer{flex-direction:column;align-items:center;display:flex;width:100%;padding:5px 0}wcm-text{text-align:center}wcm-button{margin-top:15px}`;
var __getOwnPropDesc$5 = Object.getOwnPropertyDescriptor;
var __decorateClass$5 = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$5(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = decorator(result) || result;
  return result;
};
let WcmInstallWalletView = class extends s {
  // -- private ------------------------------------------------------ //
  onInstall(uri) {
    if (uri) {
      CoreUtil.openHref(uri, "_blank");
    }
  }
  // -- render ------------------------------------------------------- //
  render() {
    const { name, id, image_id, homepage } = CoreUtil.getWalletRouterData();
    return x`<wcm-modal-header title="${name}"></wcm-modal-header><wcm-modal-content><wcm-connector-waiting walletId="${id}" imageId="${l(image_id)}" label="Not Detected" .isStale="${true}"></wcm-connector-waiting></wcm-modal-content><wcm-info-footer><wcm-text color="secondary" variant="small-thin">${`Download ${name} to continue. If multiple browser extensions are installed, disable non ${name} ones and try again`}</wcm-text><wcm-button .onClick="${() => this.onInstall(homepage)}" .iconLeft="${SvgUtil.ARROW_DOWN_ICON}">Download</wcm-button></wcm-info-footer>`;
  }
};
WcmInstallWalletView.styles = [ThemeUtil.globalCss, styles$4];
WcmInstallWalletView = __decorateClass$5([
  e$2("wcm-install-wallet-view")
], WcmInstallWalletView);
const styles$3 = i$3`wcm-wallet-image{border-radius:var(--wcm-wallet-icon-large-border-radius);width:96px;height:96px;margin-bottom:20px}wcm-info-footer{display:flex;width:100%}.wcm-app-store{justify-content:space-between}.wcm-app-store wcm-wallet-image{margin-right:10px;margin-bottom:0;width:28px;height:28px;border-radius:var(--wcm-wallet-icon-small-border-radius)}.wcm-app-store div{display:flex;align-items:center}.wcm-app-store wcm-button{margin-right:-10px}.wcm-note{flex-direction:column;align-items:center;padding:5px 0}.wcm-note wcm-text{text-align:center}wcm-platform-selection{margin-top:-15px}.wcm-note wcm-text{margin-top:15px}.wcm-note wcm-text span{color:var(--wcm-accent-color)}`;
var __defProp$4 = Object.defineProperty;
var __getOwnPropDesc$4 = Object.getOwnPropertyDescriptor;
var __decorateClass$4 = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$4(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result)
    __defProp$4(target, key, result);
  return result;
};
let WcmMobileConnectingView = class extends s {
  // -- lifecycle ---------------------------------------------------- //
  constructor() {
    super();
    this.isError = false;
    this.openMobileApp();
  }
  // -- private ------------------------------------------------------ //
  onFormatAndRedirect(uri, forceUniversalUrl = false) {
    const { mobile, name } = CoreUtil.getWalletRouterData();
    const nativeUrl = mobile == null ? void 0 : mobile.native;
    const universalUrl = mobile == null ? void 0 : mobile.universal;
    const target = CoreUtil.isTelegram() ? "_blank" : "_self";
    uri = CoreUtil.isTelegram() && CoreUtil.isAndroid() ? encodeURIComponent(uri) : uri;
    if (nativeUrl && !forceUniversalUrl) {
      const href = CoreUtil.formatNativeUrl(nativeUrl, uri, name);
      CoreUtil.openHref(href, target);
    } else if (universalUrl) {
      const href = CoreUtil.formatUniversalUrl(universalUrl, uri, name);
      CoreUtil.openHref(href, target);
    }
  }
  openMobileApp(forceUniversalUrl = false) {
    const { walletConnectUri } = OptionsCtrl.state;
    const routerData = CoreUtil.getWalletRouterData();
    if (walletConnectUri) {
      this.onFormatAndRedirect(walletConnectUri, forceUniversalUrl);
    }
    UiUtil.setRecentWallet(routerData);
  }
  onGoToAppStore(downloadUrl) {
    if (downloadUrl) {
      CoreUtil.openHref(downloadUrl, "_blank");
    }
  }
  // -- render ------------------------------------------------------- //
  render() {
    const { name, id, image_id, app, mobile } = CoreUtil.getWalletRouterData();
    const { isWeb } = UiUtil.getCachedRouterWalletPlatforms();
    const downloadUrl = app == null ? void 0 : app.ios;
    const universalUrl = mobile == null ? void 0 : mobile.universal;
    return x`<wcm-modal-header title="${name}"></wcm-modal-header><wcm-modal-content><wcm-connector-waiting walletId="${id}" imageId="${l(image_id)}" label="Tap 'Open' to continue…" .isError="${this.isError}"></wcm-connector-waiting></wcm-modal-content><wcm-info-footer class="wcm-note"><wcm-platform-selection .isWeb="${isWeb}" .isRetry="${true}"><wcm-button .onClick="${() => this.openMobileApp(false)}" .iconRight="${SvgUtil.RETRY_ICON}">Retry</wcm-button></wcm-platform-selection>${universalUrl ? x`<wcm-text color="secondary" variant="small-thin">Still doesn't work? <span tabindex="0" @click="${() => this.openMobileApp(true)}">Try this alternate link</span></wcm-text>` : null}</wcm-info-footer><wcm-info-footer class="wcm-app-store"><div><wcm-wallet-image walletId="${id}" imageId="${l(image_id)}"></wcm-wallet-image><wcm-text>${`Get ${name}`}</wcm-text></div><wcm-button .iconRight="${SvgUtil.ARROW_RIGHT_ICON}" .onClick="${() => this.onGoToAppStore(downloadUrl)}" variant="ghost">App Store</wcm-button></wcm-info-footer>`;
  }
};
WcmMobileConnectingView.styles = [ThemeUtil.globalCss, styles$3];
__decorateClass$4([
  t$1()
], WcmMobileConnectingView.prototype, "isError", 2);
WcmMobileConnectingView = __decorateClass$4([
  e$2("wcm-mobile-connecting-view")
], WcmMobileConnectingView);
const styles$2 = i$3`wcm-info-footer{flex-direction:column;align-items:center;display:flex;width:100%;padding:5px 0}wcm-text{text-align:center}`;
var __getOwnPropDesc$3 = Object.getOwnPropertyDescriptor;
var __decorateClass$3 = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$3(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = decorator(result) || result;
  return result;
};
let WcmMobileQrConnectingView = class extends s {
  // -- render ------------------------------------------------------- //
  render() {
    const { name, id, image_id } = CoreUtil.getWalletRouterData();
    const { isDesktop, isWeb } = UiUtil.getCachedRouterWalletPlatforms();
    return x`<wcm-modal-header title="${name}" .onAction="${UiUtil.handleUriCopy}" .actionIcon="${SvgUtil.COPY_ICON}"></wcm-modal-header><wcm-modal-content><wcm-walletconnect-qr walletId="${id}" imageId="${l(image_id)}"></wcm-walletconnect-qr></wcm-modal-content><wcm-info-footer><wcm-text color="secondary" variant="small-thin">${`Scan this QR Code with your phone's camera or inside ${name} app`}</wcm-text><wcm-platform-selection .isDesktop="${isDesktop}" .isWeb="${isWeb}"></wcm-platform-selection></wcm-info-footer>`;
  }
};
WcmMobileQrConnectingView.styles = [ThemeUtil.globalCss, styles$2];
WcmMobileQrConnectingView = __decorateClass$3([
  e$2("wcm-mobile-qr-connecting-view")
], WcmMobileQrConnectingView);
var __getOwnPropDesc$2 = Object.getOwnPropertyDescriptor;
var __decorateClass$2 = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$2(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = decorator(result) || result;
  return result;
};
let WcmQrcodeView = class extends s {
  // -- render ------------------------------------------------------- //
  render() {
    return x`<wcm-modal-header title="Scan the code" .onAction="${UiUtil.handleUriCopy}" .actionIcon="${SvgUtil.COPY_ICON}"></wcm-modal-header><wcm-modal-content><wcm-walletconnect-qr></wcm-walletconnect-qr></wcm-modal-content>`;
  }
};
WcmQrcodeView.styles = [ThemeUtil.globalCss];
WcmQrcodeView = __decorateClass$2([
  e$2("wcm-qrcode-view")
], WcmQrcodeView);
const styles$1 = i$3`wcm-modal-content{height:clamp(200px,60vh,600px);display:block;overflow:scroll;scrollbar-width:none;position:relative;margin-top:1px}.wcm-grid{display:grid;grid-template-columns:repeat(4,80px);justify-content:space-between;margin:-15px -10px;padding-top:20px}wcm-modal-content::after,wcm-modal-content::before{content:'';position:fixed;pointer-events:none;z-index:1;width:100%;height:20px;opacity:1}wcm-modal-content::before{box-shadow:0 -1px 0 0 var(--wcm-color-bg-1);background:linear-gradient(var(--wcm-color-bg-1),rgba(255,255,255,0))}wcm-modal-content::after{box-shadow:0 1px 0 0 var(--wcm-color-bg-1);background:linear-gradient(rgba(255,255,255,0),var(--wcm-color-bg-1));top:calc(100% - 20px)}wcm-modal-content::-webkit-scrollbar{display:none}.wcm-placeholder-block{display:flex;justify-content:center;align-items:center;height:100px;overflow:hidden}.wcm-empty,.wcm-loading{display:flex}.wcm-loading .wcm-placeholder-block{height:100%}.wcm-end-reached .wcm-placeholder-block{height:0;opacity:0}.wcm-empty .wcm-placeholder-block{opacity:1;height:100%}wcm-wallet-button{margin:calc((100% - 60px)/ 3) 0}`;
var __defProp$1 = Object.defineProperty;
var __getOwnPropDesc$1 = Object.getOwnPropertyDescriptor;
var __decorateClass$1 = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$1(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result)
    __defProp$1(target, key, result);
  return result;
};
const PAGE_ENTRIES = 40;
let WcmWalletExplorerView = class extends s {
  constructor() {
    super(...arguments);
    this.loading = !ExplorerCtrl.state.wallets.listings.length;
    this.firstFetch = !ExplorerCtrl.state.wallets.listings.length;
    this.search = "";
    this.endReached = false;
    this.intersectionObserver = void 0;
    this.searchDebounce = UiUtil.debounce((value) => {
      if (value.length >= 1) {
        this.firstFetch = true;
        this.endReached = false;
        this.search = value;
        ExplorerCtrl.resetSearch();
        this.fetchWallets();
      } else if (this.search) {
        this.search = "";
        this.endReached = this.isLastPage();
        ExplorerCtrl.resetSearch();
      }
    });
  }
  // -- lifecycle ---------------------------------------------------- //
  firstUpdated() {
    this.createPaginationObserver();
  }
  disconnectedCallback() {
    var _a;
    (_a = this.intersectionObserver) == null ? void 0 : _a.disconnect();
  }
  // -- private ------------------------------------------------------ //
  get placeholderEl() {
    return UiUtil.getShadowRootElement(this, ".wcm-placeholder-block");
  }
  createPaginationObserver() {
    this.intersectionObserver = new IntersectionObserver(([element]) => {
      if (element.isIntersecting && !(this.search && this.firstFetch)) {
        this.fetchWallets();
      }
    });
    this.intersectionObserver.observe(this.placeholderEl);
  }
  isLastPage() {
    const { wallets, search } = ExplorerCtrl.state;
    const { listings, total } = this.search ? search : wallets;
    return total <= PAGE_ENTRIES || listings.length >= total;
  }
  async fetchWallets() {
    var _a;
    const { wallets, search } = ExplorerCtrl.state;
    const { listings, total, page } = this.search ? search : wallets;
    if (!this.endReached && (this.firstFetch || total > PAGE_ENTRIES && listings.length < total)) {
      try {
        this.loading = true;
        const chains = (_a = OptionsCtrl.state.chains) == null ? void 0 : _a.join(",");
        const { listings: newListings } = await ExplorerCtrl.getWallets({
          page: this.firstFetch ? 1 : page + 1,
          entries: PAGE_ENTRIES,
          search: this.search,
          version: 2,
          chains
        });
        const explorerImages = newListings.map((wallet) => UiUtil.getWalletIcon(wallet));
        await Promise.all([
          ...explorerImages.map(async (url) => UiUtil.preloadImage(url)),
          CoreUtil.wait(300)
        ]);
        this.endReached = this.isLastPage();
      } catch (err) {
        console.error(err);
        ToastCtrl.openToast(UiUtil.getErrorMessage(err), "error");
      } finally {
        this.loading = false;
        this.firstFetch = false;
      }
    }
  }
  onConnect(listing) {
    if (CoreUtil.isAndroid()) {
      UiUtil.handleMobileLinking(listing);
    } else {
      UiUtil.goToConnectingView(listing);
    }
  }
  onSearchChange(event) {
    const { value } = event.target;
    this.searchDebounce(value);
  }
  // -- render ------------------------------------------------------- //
  render() {
    const { wallets, search } = ExplorerCtrl.state;
    const { listings } = this.search ? search : wallets;
    const isLoading = this.loading && !listings.length;
    const isSearch = this.search.length >= 3;
    let manualWallets = TemplateUtil.manualWalletsTemplate();
    let recomendedWallets = TemplateUtil.recomendedWalletsTemplate(true);
    if (isSearch) {
      manualWallets = manualWallets.filter(
        ({ values }) => UiUtil.caseSafeIncludes(values[0], this.search)
      );
      recomendedWallets = recomendedWallets.filter(
        ({ values }) => UiUtil.caseSafeIncludes(values[0], this.search)
      );
    }
    const isEmpty = !this.loading && !listings.length && !recomendedWallets.length;
    const classes = {
      "wcm-loading": isLoading,
      "wcm-end-reached": this.endReached || !this.loading,
      "wcm-empty": isEmpty
    };
    return x`<wcm-modal-header><wcm-search-input .onChange="${this.onSearchChange.bind(this)}"></wcm-search-input></wcm-modal-header><wcm-modal-content class="${o2(classes)}"><div class="wcm-grid">${isLoading ? null : manualWallets} ${isLoading ? null : recomendedWallets} ${isLoading ? null : listings.map(
      (listing) => x`${listing ? x`<wcm-wallet-button imageId="${listing.image_id}" name="${listing.name}" walletId="${listing.id}" .onClick="${() => this.onConnect(listing)}"></wcm-wallet-button>` : null}`
    )}</div><div class="wcm-placeholder-block">${isEmpty ? x`<wcm-text variant="big-bold" color="secondary">No results found</wcm-text>` : null} ${!isEmpty && this.loading ? x`<wcm-spinner></wcm-spinner>` : null}</div></wcm-modal-content>`;
  }
};
WcmWalletExplorerView.styles = [ThemeUtil.globalCss, styles$1];
__decorateClass$1([
  t$1()
], WcmWalletExplorerView.prototype, "loading", 2);
__decorateClass$1([
  t$1()
], WcmWalletExplorerView.prototype, "firstFetch", 2);
__decorateClass$1([
  t$1()
], WcmWalletExplorerView.prototype, "search", 2);
__decorateClass$1([
  t$1()
], WcmWalletExplorerView.prototype, "endReached", 2);
WcmWalletExplorerView = __decorateClass$1([
  e$2("wcm-wallet-explorer-view")
], WcmWalletExplorerView);
const styles = i$3`wcm-info-footer{flex-direction:column;align-items:center;display:flex;width:100%;padding:5px 0}wcm-text{text-align:center}`;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __decorateClass = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result)
    __defProp(target, key, result);
  return result;
};
let WcmWebConnectingView = class extends s {
  // -- lifecycle ---------------------------------------------------- //
  constructor() {
    super();
    this.isError = false;
    this.openWebWallet();
  }
  // -- private ------------------------------------------------------ //
  onFormatAndRedirect(uri) {
    const { desktop, name } = CoreUtil.getWalletRouterData();
    const universalUrl = desktop == null ? void 0 : desktop.universal;
    if (universalUrl) {
      const href = CoreUtil.formatUniversalUrl(universalUrl, uri, name);
      CoreUtil.openHref(href, "_blank");
    }
  }
  openWebWallet() {
    const { walletConnectUri } = OptionsCtrl.state;
    const routerData = CoreUtil.getWalletRouterData();
    UiUtil.setRecentWallet(routerData);
    if (walletConnectUri) {
      this.onFormatAndRedirect(walletConnectUri);
    }
  }
  // -- render ------------------------------------------------------- //
  render() {
    const { name, id, image_id } = CoreUtil.getWalletRouterData();
    const { isMobile, isDesktop } = UiUtil.getCachedRouterWalletPlatforms();
    const isMobilePlatform = CoreUtil.isMobile();
    return x`<wcm-modal-header title="${name}" .onAction="${UiUtil.handleUriCopy}" .actionIcon="${SvgUtil.COPY_ICON}"></wcm-modal-header><wcm-modal-content><wcm-connector-waiting walletId="${id}" imageId="${l(image_id)}" label="${`Continue in ${name}...`}" .isError="${this.isError}"></wcm-connector-waiting></wcm-modal-content><wcm-info-footer><wcm-text color="secondary" variant="small-thin">${`${name} web app has opened in a new tab. Go there, accept the connection, and come back`}</wcm-text><wcm-platform-selection .isMobile="${isMobile}" .isDesktop="${isMobilePlatform ? false : isDesktop}" .isRetry="${true}"><wcm-button .onClick="${this.openWebWallet.bind(this)}" .iconRight="${SvgUtil.RETRY_ICON}">Retry</wcm-button></wcm-platform-selection></wcm-info-footer>`;
  }
};
WcmWebConnectingView.styles = [ThemeUtil.globalCss, styles];
__decorateClass([
  t$1()
], WcmWebConnectingView.prototype, "isError", 2);
WcmWebConnectingView = __decorateClass([
  e$2("wcm-web-connecting-view")
], WcmWebConnectingView);
export {
  WcmModal,
  WcmQrCode
};
