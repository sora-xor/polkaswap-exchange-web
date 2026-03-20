import { n, Y, t as tt, p, O, s as s$1 } from "./property-HHT-5st_.js";
var u = Object.defineProperty, d = Object.getOwnPropertyDescriptor, s = (o, l, a, i) => {
  for (var r = i > 1 ? void 0 : i ? d(l, a) : l, h = o.length - 1, n2; h >= 0; h--)
    (n2 = o[h]) && (r = (i ? n2(l, a, r) : n2(r)) || r);
  return i && r && u(l, a, r), r;
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
    tt`<path d="M178.83,130.83l-80,80a4,4,0,0,1-5.66-5.66L170.34,128,93.17,50.83a4,4,0,0,1,5.66-5.66l80,80A4,4,0,0,1,178.83,130.83Z"/>`
  ],
  [
    "light",
    tt`<path d="M180.24,132.24l-80,80a6,6,0,0,1-8.48-8.48L167.51,128,91.76,52.24a6,6,0,0,1,8.48-8.48l80,80A6,6,0,0,1,180.24,132.24Z"/>`
  ],
  [
    "regular",
    tt`<path d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z"/>`
  ],
  [
    "bold",
    tt`<path d="M184.49,136.49l-80,80a12,12,0,0,1-17-17L159,128,87.51,56.49a12,12,0,1,1,17-17l80,80A12,12,0,0,1,184.49,136.49Z"/>`
  ],
  [
    "fill",
    tt`<path d="M181.66,133.66l-80,80A8,8,0,0,1,88,208V48a8,8,0,0,1,13.66-5.66l80,80A8,8,0,0,1,181.66,133.66Z"/>`
  ],
  [
    "duotone",
    tt`<path d="M176,128,96,208V48Z" opacity="0.2"/><path d="M181.66,122.34l-80-80A8,8,0,0,0,88,48V208a8,8,0,0,0,13.66,5.66l80-80A8,8,0,0,0,181.66,122.34ZM104,188.69V67.31L164.69,128Z"/>`
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
  s$1("ph-caret-right")
], t);
export {
  t as PhCaretRight
};
