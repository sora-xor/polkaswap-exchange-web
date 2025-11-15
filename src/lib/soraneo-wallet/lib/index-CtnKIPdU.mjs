import { n as m, r as c, m as f, x as d } from './index-CgrbEUSl.mjs';
import { n as u, c as h } from './index-D1vJKCDW.mjs';
import { o as v } from './if-defined-DgIoGpc1.mjs';
import './index-Dmgyii2r.mjs';
const b = m`
  :host {
    position: relative;
    display: inline-block;
    width: 100%;
  }
`;
var o = function (l, i, r, s) {
  var a = arguments.length,
    e = a < 3 ? i : s === null ? (s = Object.getOwnPropertyDescriptor(i, r)) : s,
    n;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') e = Reflect.decorate(l, i, r, s);
  else for (var p = l.length - 1; p >= 0; p--) (n = l[p]) && (e = (a < 3 ? n(e) : a > 3 ? n(i, r, e) : n(i, r)) || e);
  return (a > 3 && e && Object.defineProperty(i, r, e), e);
};
let t = class extends f {
  constructor() {
    (super(...arguments), (this.disabled = !1));
  }
  render() {
    return d`
      <wui-input-text
        type="email"
        placeholder="Email"
        icon="mail"
        size="lg"
        .disabled=${this.disabled}
        .value=${this.value}
        data-testid="wui-email-input"
        tabIdx=${v(this.tabIdx)}
      ></wui-input-text>
      ${this.templateError()}
    `;
  }
  templateError() {
    return this.errorMessage ? d`<wui-text variant="sm-regular" color="error">${this.errorMessage}</wui-text>` : null;
  }
};
t.styles = [c, b];
o([u()], t.prototype, 'errorMessage', void 0);
o([u({ type: Boolean })], t.prototype, 'disabled', void 0);
o([u()], t.prototype, 'value', void 0);
o([u()], t.prototype, 'tabIdx', void 0);
t = o([h('wui-email-input')], t);
//# sourceMappingURL=index-CtnKIPdU.mjs.map
