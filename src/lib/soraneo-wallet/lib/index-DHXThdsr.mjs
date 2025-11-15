import { k as p, r as d, m as f, x as c } from './index-CgrbEUSl.mjs';
import { n as m, c as h } from './index-D1vJKCDW.mjs';
const x = p`
  :host {
    position: relative;
    display: flex;
    width: 100%;
    height: 1px;
    background-color: ${({ tokens: e }) => e.theme.borderPrimary};
    justify-content: center;
    align-items: center;
  }

  :host > wui-text {
    position: absolute;
    padding: 0px 8px;
    background-color: ${({ tokens: e }) => e.theme.backgroundPrimary};
    transition: background-color ${({ durations: e }) => e.lg}
      ${({ easings: e }) => e['ease-out-power-2']};
    will-change: background-color;
  }
`;
var u = function (e, r, o, n) {
  var i = arguments.length,
    t = i < 3 ? r : n === null ? (n = Object.getOwnPropertyDescriptor(r, o)) : n,
    a;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') t = Reflect.decorate(e, r, o, n);
  else for (var l = e.length - 1; l >= 0; l--) (a = e[l]) && (t = (i < 3 ? a(t) : i > 3 ? a(r, o, t) : a(r, o)) || t);
  return (i > 3 && t && Object.defineProperty(r, o, t), t);
};
let s = class extends f {
  constructor() {
    (super(...arguments), (this.text = ''));
  }
  render() {
    return c`${this.template()}`;
  }
  template() {
    return this.text ? c`<wui-text variant="md-regular" color="secondary">${this.text}</wui-text>` : null;
  }
};
s.styles = [d, x];
u([m()], s.prototype, 'text', void 0);
s = u([h('wui-separator')], s);
//# sourceMappingURL=index-DHXThdsr.mjs.map
