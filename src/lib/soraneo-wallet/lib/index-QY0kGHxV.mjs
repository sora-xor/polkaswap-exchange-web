import { n as p, m as u, R as f, M as g, x as a } from './index-CgrbEUSl.mjs';
import { n as b, r as m, c as w } from './index-D1vJKCDW.mjs';
import { T as l } from './index-CiCPU9Xw.mjs';
const C = {
    interpolate(r, e, t) {
      if (r.length !== 2 || e.length !== 2) throw new Error('inputRange and outputRange must be an array of length 2');
      const n = r[0] || 0,
        i = r[1] || 0,
        o = e[0] || 0,
        s = e[1] || 0;
      return t < n ? o : t > i ? s : ((s - o) / (i - n)) * (t - n) + o;
    },
  },
  M = p`
  :host {
    width: 100%;
    display: block;
  }
`;
var d = function (r, e, t, n) {
  var i = arguments.length,
    o = i < 3 ? e : n === null ? (n = Object.getOwnPropertyDescriptor(e, t)) : n,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') o = Reflect.decorate(r, e, t, n);
  else for (var c = r.length - 1; c >= 0; c--) (s = r[c]) && (o = (i < 3 ? s(o) : i > 3 ? s(e, t, o) : s(e, t)) || o);
  return (i > 3 && o && Object.defineProperty(e, t, o), o);
};
let h = class extends u {
  constructor() {
    (super(),
      (this.unsubscribe = []),
      (this.text = ''),
      (this.open = l.state.open),
      this.unsubscribe.push(
        f.subscribeKey('view', () => {
          l.hide();
        }),
        g.subscribeKey('open', (e) => {
          e || l.hide();
        }),
        l.subscribeKey('open', (e) => {
          this.open = e;
        })
      ));
  }
  disconnectedCallback() {
    (this.unsubscribe.forEach((e) => e()), l.hide());
  }
  render() {
    return a`
      <div
        @pointermove=${this.onMouseEnter.bind(this)}
        @pointerleave=${this.onMouseLeave.bind(this)}
      >
        ${this.renderChildren()}
      </div>
    `;
  }
  renderChildren() {
    return a`<slot></slot> `;
  }
  onMouseEnter() {
    const e = this.getBoundingClientRect();
    if (!this.open) {
      const t = document.querySelector('w3m-modal'),
        n = {
          width: e.width,
          height: e.height,
          left: e.left,
          top: e.top,
        };
      if (t) {
        const i = t.getBoundingClientRect();
        ((n.left = e.left - (window.innerWidth - i.width) / 2), (n.top = e.top - (window.innerHeight - i.height) / 2));
      }
      l.showTooltip({
        message: this.text,
        triggerRect: n,
        variant: 'shade',
      });
    }
  }
  onMouseLeave(e) {
    this.contains(e.relatedTarget) || l.hide();
  }
};
h.styles = [M];
d([b()], h.prototype, 'text', void 0);
d([m()], h.prototype, 'open', void 0);
h = d([w('w3m-tooltip-trigger')], h);
export { C as M };
//# sourceMappingURL=index-QY0kGHxV.mjs.map
