import { n, Y, t as tt, p, O, s } from "./property-HHT-5st_.js";
var c = Object.defineProperty, f = Object.getOwnPropertyDescriptor, o = (a, s2, h, i) => {
  for (var e = i > 1 ? void 0 : i ? f(s2, h) : s2, l = a.length - 1, m; l >= 0; l--)
    (m = a[l]) && (e = (i ? m(s2, h, e) : m(e)) || e);
  return i && e && c(s2, h, e), e;
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
    tt`<path d="M136,128a8,8,0,1,1-8-8A8,8,0,0,1,136,128Zm-76-8a8,8,0,1,0,8,8A8,8,0,0,0,60,120Zm136,0a8,8,0,1,0,8,8A8,8,0,0,0,196,120Z"/>`
  ],
  [
    "light",
    tt`<path d="M138,128a10,10,0,1,1-10-10A10,10,0,0,1,138,128ZM60,118a10,10,0,1,0,10,10A10,10,0,0,0,60,118Zm136,0a10,10,0,1,0,10,10A10,10,0,0,0,196,118Z"/>`
  ],
  [
    "regular",
    tt`<path d="M140,128a12,12,0,1,1-12-12A12,12,0,0,1,140,128Zm56-12a12,12,0,1,0,12,12A12,12,0,0,0,196,116ZM60,116a12,12,0,1,0,12,12A12,12,0,0,0,60,116Z"/>`
  ],
  [
    "bold",
    tt`<path d="M144,128a16,16,0,1,1-16-16A16,16,0,0,1,144,128ZM60,112a16,16,0,1,0,16,16A16,16,0,0,0,60,112Zm136,0a16,16,0,1,0,16,16A16,16,0,0,0,196,112Z"/>`
  ],
  [
    "fill",
    tt`<path d="M224,80H32A16,16,0,0,0,16,96v64a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V96A16,16,0,0,0,224,80ZM60,140a12,12,0,1,1,12-12A12,12,0,0,1,60,140Zm68,0a12,12,0,1,1,12-12A12,12,0,0,1,128,140Zm68,0a12,12,0,1,1,12-12A12,12,0,0,1,196,140Z"/>`
  ],
  [
    "duotone",
    tt`<path d="M240,96v64a16,16,0,0,1-16,16H32a16,16,0,0,1-16-16V96A16,16,0,0,1,32,80H224A16,16,0,0,1,240,96Z" opacity="0.2"/><path d="M140,128a12,12,0,1,1-12-12A12,12,0,0,1,140,128Zm56-12a12,12,0,1,0,12,12A12,12,0,0,0,196,116ZM60,116a12,12,0,1,0,12,12A12,12,0,0,0,60,116Z"/>`
  ]
]);
t.styles = p`
    :host {
      display: contents;
    }
  `;
o([
  O({ type: String, reflect: true })
], t.prototype, "size", 2);
o([
  O({ type: String, reflect: true })
], t.prototype, "weight", 2);
o([
  O({ type: String, reflect: true })
], t.prototype, "color", 2);
o([
  O({ type: Boolean, reflect: true })
], t.prototype, "mirrored", 2);
t = o([
  s("ph-dots-three")
], t);
export {
  t as PhDotsThree
};
