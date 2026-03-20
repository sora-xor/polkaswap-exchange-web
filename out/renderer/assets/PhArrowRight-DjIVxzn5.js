import { n, Y, t as tt, p, O, s as s$1 } from "./property-HHT-5st_.js";
var u = Object.defineProperty, w = Object.getOwnPropertyDescriptor, s = (o, l, p2, a) => {
  for (var r = a > 1 ? void 0 : a ? w(l, p2) : l, h = o.length - 1, n2; h >= 0; h--)
    (n2 = o[h]) && (r = (a ? n2(l, p2, r) : n2(r)) || r);
  return a && r && u(l, p2, r), r;
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
    tt`<path d="M218.83,130.83l-72,72a4,4,0,0,1-5.66-5.66L206.34,132H40a4,4,0,0,1,0-8H206.34L141.17,58.83a4,4,0,0,1,5.66-5.66l72,72A4,4,0,0,1,218.83,130.83Z"/>`
  ],
  [
    "light",
    tt`<path d="M220.24,132.24l-72,72a6,6,0,0,1-8.48-8.48L201.51,134H40a6,6,0,0,1,0-12H201.51L139.76,60.24a6,6,0,0,1,8.48-8.48l72,72A6,6,0,0,1,220.24,132.24Z"/>`
  ],
  [
    "regular",
    tt`<path d="M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z"/>`
  ],
  [
    "bold",
    tt`<path d="M224.49,136.49l-72,72a12,12,0,0,1-17-17L187,140H40a12,12,0,0,1,0-24H187L135.51,64.48a12,12,0,0,1,17-17l72,72A12,12,0,0,1,224.49,136.49Z"/>`
  ],
  [
    "fill",
    tt`<path d="M221.66,133.66l-72,72A8,8,0,0,1,136,200V136H40a8,8,0,0,1,0-16h96V56a8,8,0,0,1,13.66-5.66l72,72A8,8,0,0,1,221.66,133.66Z"/>`
  ],
  [
    "duotone",
    tt`<path d="M216,128l-72,72V56Z" opacity="0.2"/><path d="M221.66,122.34l-72-72A8,8,0,0,0,136,56v64H40a8,8,0,0,0,0,16h96v64a8,8,0,0,0,13.66,5.66l72-72A8,8,0,0,0,221.66,122.34ZM152,180.69V75.31L204.69,128Z"/>`
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
  s$1("ph-arrow-right")
], t);
export {
  t as PhArrowRight
};
