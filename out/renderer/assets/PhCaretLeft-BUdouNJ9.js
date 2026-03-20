import { n, Y, t as tt, p, O, s as s$1 } from "./property-HHT-5st_.js";
var u = Object.defineProperty, d = Object.getOwnPropertyDescriptor, s = (o, a, p2, l) => {
  for (var e = l > 1 ? void 0 : l ? d(a, p2) : a, h = o.length - 1, n2; h >= 0; h--)
    (n2 = o[h]) && (e = (l ? n2(a, p2, e) : n2(e)) || e);
  return l && e && u(a, p2, e), e;
};
let t = class extends n {
  constructor() {
    super(...arguments), this.size = "1em", this.weight = "regular", this.color = "currentColor", this.mirrored = false;
  }
  render() {
    var o;
    return Y`<svg
      xmlns="http://www.w3.org/2000/svg"
      width="${this.size}"
      height="${this.size}"
      fill="${this.color}"
      viewBox="0 0 256 256"
      transform=${this.mirrored ? "scale(-1, 1)" : null}
    >
      ${t.weightsMap.get((o = this.weight) != null ? o : "regular")}
    </svg>`;
  }
};
t.weightsMap = /* @__PURE__ */ new Map([
  [
    "thin",
    tt`<path d="M162.83,205.17a4,4,0,0,1-5.66,5.66l-80-80a4,4,0,0,1,0-5.66l80-80a4,4,0,1,1,5.66,5.66L85.66,128Z"/>`
  ],
  [
    "light",
    tt`<path d="M164.24,203.76a6,6,0,1,1-8.48,8.48l-80-80a6,6,0,0,1,0-8.48l80-80a6,6,0,0,1,8.48,8.48L88.49,128Z"/>`
  ],
  [
    "regular",
    tt`<path d="M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z"/>`
  ],
  [
    "bold",
    tt`<path d="M168.49,199.51a12,12,0,0,1-17,17l-80-80a12,12,0,0,1,0-17l80-80a12,12,0,0,1,17,17L97,128Z"/>`
  ],
  [
    "fill",
    tt`<path d="M168,48V208a8,8,0,0,1-13.66,5.66l-80-80a8,8,0,0,1,0-11.32l80-80A8,8,0,0,1,168,48Z"/>`
  ],
  [
    "duotone",
    tt`<path d="M160,48V208L80,128Z" opacity="0.2"/><path d="M163.06,40.61a8,8,0,0,0-8.72,1.73l-80,80a8,8,0,0,0,0,11.32l80,80A8,8,0,0,0,168,208V48A8,8,0,0,0,163.06,40.61ZM152,188.69,91.31,128,152,67.31Z"/>`
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
  s$1("ph-caret-left")
], t);
export {
  t as PhCaretLeft
};
