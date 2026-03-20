import { n, Y, t as tt, p, O, s as s$1 } from "./property-HHT-5st_.js";
var f = Object.defineProperty, u = Object.getOwnPropertyDescriptor, s = (a, o, h, i) => {
  for (var e = i > 1 ? void 0 : i ? u(o, h) : o, l = a.length - 1, m; l >= 0; l--)
    (m = a[l]) && (e = (i ? m(o, h, e) : m(e)) || e);
  return i && e && f(o, h, e), e;
};
let t = class extends n {
  constructor() {
    super(...arguments), this.size = "1em", this.weight = "regular", this.color = "currentColor", this.mirrored = false;
  }
  render() {
    var a;
    return Y`<svg
      xmlns="http://www.w3.org/2000/svg"
      width="${this.size}"
      height="${this.size}"
      fill="${this.color}"
      viewBox="0 0 256 256"
      transform=${this.mirrored ? "scale(-1, 1)" : null}
    >
      ${t.weightsMap.get((a = this.weight) != null ? a : "regular")}
    </svg>`;
  }
};
t.weightsMap = /* @__PURE__ */ new Map([
  [
    "thin",
    tt`<path d="M196,136a4,4,0,0,1-4,4H64a4,4,0,0,1,0-8H192A4,4,0,0,1,196,136Zm36-52H24a4,4,0,0,0,0,8H232a4,4,0,0,0,0-8Zm-80,96H104a4,4,0,0,0,0,8h48a4,4,0,0,0,0-8Z"/>`
  ],
  [
    "light",
    tt`<path d="M198,136a6,6,0,0,1-6,6H64a6,6,0,0,1,0-12H192A6,6,0,0,1,198,136Zm34-54H24a6,6,0,0,0,0,12H232a6,6,0,0,0,0-12Zm-80,96H104a6,6,0,0,0,0,12h48a6,6,0,0,0,0-12Z"/>`
  ],
  [
    "regular",
    tt`<path d="M200,136a8,8,0,0,1-8,8H64a8,8,0,0,1,0-16H192A8,8,0,0,1,200,136Zm32-56H24a8,8,0,0,0,0,16H232a8,8,0,0,0,0-16Zm-80,96H104a8,8,0,0,0,0,16h48a8,8,0,0,0,0-16Z"/>`
  ],
  [
    "bold",
    tt`<path d="M204,136a12,12,0,0,1-12,12H64a12,12,0,0,1,0-24H192A12,12,0,0,1,204,136Zm28-60H24a12,12,0,0,0,0,24H232a12,12,0,0,0,0-24Zm-80,96H104a12,12,0,0,0,0,24h48a12,12,0,0,0,0-24Z"/>`
  ],
  [
    "fill",
    tt`<path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40ZM144,176H112a8,8,0,0,1,0-16h32a8,8,0,0,1,0,16Zm32-40H80a8,8,0,0,1,0-16h96a8,8,0,0,1,0,16Zm32-40H48a8,8,0,0,1,0-16H208a8,8,0,0,1,0,16Z"/>`
  ],
  [
    "duotone",
    tt`<path d="M232,56V200a16,16,0,0,1-16,16H40a16,16,0,0,1-16-16V56A16,16,0,0,1,40,40H216A16,16,0,0,1,232,56Z" opacity="0.2"/><path d="M200,136a8,8,0,0,1-8,8H64a8,8,0,0,1,0-16H192A8,8,0,0,1,200,136Zm32-56H24a8,8,0,0,0,0,16H232a8,8,0,0,0,0-16Zm-80,96H104a8,8,0,0,0,0,16h48a8,8,0,0,0,0-16Z"/>`
  ]
]);
t.styles = p`
    :host {
      display: contents;
    }
  `;
s([
  O({ type: String, reflect: true })
], t.prototype, "size", 2);
s([
  O({ type: String, reflect: true })
], t.prototype, "weight", 2);
s([
  O({ type: String, reflect: true })
], t.prototype, "color", 2);
s([
  O({ type: Boolean, reflect: true })
], t.prototype, "mirrored", 2);
t = s([
  s$1("ph-funnel-simple")
], t);
export {
  t as PhFunnelSimple
};
