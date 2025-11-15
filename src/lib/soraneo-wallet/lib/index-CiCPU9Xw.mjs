import { w as d, p as h, s as f, i as g, k as w, m as b, x as y } from './index-CgrbEUSl.mjs';
import { r as m, c as x } from './index-D1vJKCDW.mjs';
const o = h({
    message: '',
    open: !1,
    triggerRect: {
      width: 0,
      height: 0,
      top: 0,
      left: 0,
    },
    variant: 'shade',
  }),
  v = {
    state: o,
    subscribe(t) {
      return g(o, () => t(o));
    },
    subscribeKey(t, e) {
      return f(o, t, e);
    },
    showTooltip({ message: t, triggerRect: e, variant: i }) {
      ((o.open = !0), (o.message = t), (o.triggerRect = e), (o.variant = i));
    },
    hide() {
      ((o.open = !1),
        (o.message = ''),
        (o.triggerRect = {
          width: 0,
          height: 0,
          top: 0,
          left: 0,
        }));
    },
  },
  s = d(v),
  $ = w`
  :host {
    pointer-events: none;
  }

  :host > wui-flex {
    display: var(--w3m-tooltip-display);
    opacity: var(--w3m-tooltip-opacity);
    padding: 9px ${({ spacing: t }) => t[3]} 10px ${({ spacing: t }) => t[3]};
    border-radius: ${({ borderRadius: t }) => t[3]};
    color: ${({ tokens: t }) => t.theme.backgroundPrimary};
    position: absolute;
    top: var(--w3m-tooltip-top);
    left: var(--w3m-tooltip-left);
    transform: translate(calc(-50% + var(--w3m-tooltip-parent-width)), calc(-100% - 8px));
    max-width: calc(var(--apkt-modal-width) - ${({ spacing: t }) => t[5]});
    transition: opacity ${({ durations: t }) => t.lg}
      ${({ easings: t }) => t['ease-out-power-2']};
    will-change: opacity;
    opacity: 0;
    animation-duration: ${({ durations: t }) => t.xl};
    animation-timing-function: ${({ easings: t }) => t['ease-out-power-2']};
    animation-name: fade-in;
    animation-fill-mode: forwards;
  }

  :host([data-variant='shade']) > wui-flex {
    background-color: ${({ tokens: t }) => t.theme.foregroundPrimary};
  }

  :host([data-variant='shade']) > wui-flex > wui-text {
    color: ${({ tokens: t }) => t.theme.textSecondary};
  }

  :host([data-variant='fill']) > wui-flex {
    background-color: ${({ tokens: t }) => t.theme.textPrimary};
    border: none;
  }

  wui-icon {
    position: absolute;
    width: 12px !important;
    height: 4px !important;
    color: ${({ tokens: t }) => t.theme.foregroundPrimary};
  }

  wui-icon[data-placement='top'] {
    bottom: 0px;
    left: 50%;
    transform: translate(-50%, 95%);
  }

  wui-icon[data-placement='bottom'] {
    top: 0;
    left: 50%;
    transform: translate(-50%, -95%) rotate(180deg);
  }

  wui-icon[data-placement='right'] {
    top: 50%;
    left: 0;
    transform: translate(-65%, -50%) rotate(90deg);
  }

  wui-icon[data-placement='left'] {
    top: 50%;
    right: 0%;
    transform: translate(65%, -50%) rotate(270deg);
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;
var n = function (t, e, i, p) {
  var l = arguments.length,
    a = l < 3 ? e : p === null ? (p = Object.getOwnPropertyDescriptor(e, i)) : p,
    c;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') a = Reflect.decorate(t, e, i, p);
  else for (var u = t.length - 1; u >= 0; u--) (c = t[u]) && (a = (l < 3 ? c(a) : l > 3 ? c(e, i, a) : c(e, i)) || a);
  return (l > 3 && a && Object.defineProperty(e, i, a), a);
};
let r = class extends b {
  constructor() {
    (super(),
      (this.unsubscribe = []),
      (this.open = s.state.open),
      (this.message = s.state.message),
      (this.triggerRect = s.state.triggerRect),
      (this.variant = s.state.variant),
      this.unsubscribe.push(
        s.subscribe((e) => {
          ((this.open = e.open),
            (this.message = e.message),
            (this.triggerRect = e.triggerRect),
            (this.variant = e.variant));
        })
      ));
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((e) => e());
  }
  render() {
    this.dataset.variant = this.variant;
    const e = this.triggerRect.top,
      i = this.triggerRect.left;
    return (
      (this.style.cssText = `
    --w3m-tooltip-top: ${e}px;
    --w3m-tooltip-left: ${i}px;
    --w3m-tooltip-parent-width: ${this.triggerRect.width / 2}px;
    --w3m-tooltip-display: ${this.open ? 'flex' : 'none'};
    --w3m-tooltip-opacity: ${this.open ? 1 : 0};
    `),
      y`<wui-flex>
      <wui-icon data-placement="top" size="inherit" name="cursor"></wui-icon>
      <wui-text color="primary" variant="sm-regular">${this.message}</wui-text>
    </wui-flex>`
    );
  }
};
r.styles = [$];
n([m()], r.prototype, 'open', void 0);
n([m()], r.prototype, 'message', void 0);
n([m()], r.prototype, 'triggerRect', void 0);
n([m()], r.prototype, 'variant', void 0);
r = n([x('w3m-tooltip')], r);
export { s as T };
//# sourceMappingURL=index-CiCPU9Xw.mjs.map
