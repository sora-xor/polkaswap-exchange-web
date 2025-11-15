import {
  k as $,
  r as I,
  l as T,
  m as f,
  x as l,
  C as u,
  O as b,
  a3 as Oe,
  K as E,
  a as m,
  M as O,
  n as ne,
  E as C,
  P as Ee,
  z as g,
  q as k,
  R as h,
  d as N,
  S as A,
  t as Ae,
  W as le,
  o as y,
  a4 as Ki,
  ae as ve,
  af as ke,
  ag as ee,
  Z as Gi,
  I as S,
  ah as st,
  A as Wi,
  Y as Yi,
  X as Xi,
  V as Qi,
  T as Ft,
  a5 as Jt,
  a6 as Zt,
  ai as Ji,
  aj as Zi,
  a7 as ui,
} from './index-CgrbEUSl.mjs';
import { n as c, c as p, U as j, r as d, a as Ri } from './index-D1vJKCDW.mjs';
import { o as w } from './if-defined-DgIoGpc1.mjs';
import './index-DIEZAM9s.mjs';
import './index-D9i8epM-.mjs';
import './index-B_f-pGMG.mjs';
import './index-v0YluuaR.mjs';
import { a as Ss, W as ks } from './index-DMAsU8oi.mjs';
import './index-Cv1k-Ah8.mjs';
import './index-CnQvofHo.mjs';
import './index-CbYcNY2E.mjs';
import { H as ei } from './HelpersUtil-OM-sIAZ4.mjs';
import './index-ayDJ1GZG.mjs';
import './index-C3cWfp_y.mjs';
import { M as yt } from './index-QY0kGHxV.mjs';
import './index-CiCPU9Xw.mjs';
import './index-BVAmJpRL.mjs';
import './index-DHXThdsr.mjs';
import { e as ti, n as ii } from './ref-CBFqMm98.mjs';
import './index-Dmgyii2r.mjs';
import { n as en } from './index-Bm191EPQ.mjs';
import './index-C3dyjDT6.mjs';
import './index-rCcPKS-v.mjs';
import './index-CtnKIPdU.mjs';
import { O as vt } from './index-BikJzTW8.mjs';
import { e as tn } from './index-CC0ezhfo.mjs';
import './index-CAs464gf.mjs';
import './index-CkAsfbcC.mjs';
import './index-CZQgiEVa.mjs';
import { N as nn } from './NavigationUtil-kj9LEOOd.mjs';
import './index-JGxzc-ta.mjs';
const on = $`
  :host {
    display: block;
  }

  button {
    border-radius: ${({ borderRadius: t }) => t[20]};
    background: ${({ tokens: t }) => t.theme.foregroundPrimary};
    display: flex;
    gap: ${({ spacing: t }) => t[1]};
    padding: ${({ spacing: t }) => t[1]};
    color: ${({ tokens: t }) => t.theme.textSecondary};
    border-radius: ${({ borderRadius: t }) => t[16]};
    height: 32px;
    transition: box-shadow ${({ durations: t }) => t.lg}
      ${({ easings: t }) => t['ease-out-power-2']};
    will-change: box-shadow;
  }

  button wui-flex.avatar-container {
    width: 28px;
    height: 24px;
    position: relative;

    wui-flex.network-image-container {
      position: absolute;
      bottom: 0px;
      right: 0px;
      width: 12px;
      height: 12px;
    }

    wui-avatar {
      width: 24px;
      min-width: 24px;
      height: 24px;
    }

    wui-icon {
      width: 12px;
      height: 12px;
    }
  }

  wui-image,
  wui-icon {
    border-radius: ${({ borderRadius: t }) => t[16]};
  }

  wui-text {
    white-space: nowrap;
  }

  button wui-flex.balance-container {
    height: 100%;
    border-radius: ${({ borderRadius: t }) => t[16]};
    padding-left: ${({ spacing: t }) => t[1]};
    padding-right: ${({ spacing: t }) => t[1]};
    background: ${({ tokens: t }) => t.theme.foregroundSecondary};
    color: ${({ tokens: t }) => t.theme.textPrimary};
    transition: background-color ${({ durations: t }) => t.lg}
      ${({ easings: t }) => t['ease-out-power-2']};
    will-change: background-color;
  }

  /* -- Hover & Active states ----------------------------------------------------------- */
  button:hover:enabled,
  button:focus-visible:enabled,
  button:active:enabled {
    box-shadow: 0px 0px 8px 0px rgba(0, 0, 0, 0.2);

    wui-flex.balance-container {
      background: ${({ tokens: t }) => t.theme.foregroundTertiary};
    }
  }

  /* -- Disabled states --------------------------------------------------- */
  button:disabled wui-text,
  button:disabled wui-flex.avatar-container {
    opacity: 0.3;
  }
`;
var ue = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let Y = class extends f {
  constructor() {
    (super(...arguments),
      (this.networkSrc = void 0),
      (this.avatarSrc = void 0),
      (this.balance = void 0),
      (this.isUnsupportedChain = void 0),
      (this.disabled = !1),
      (this.loading = !1),
      (this.address = ''),
      (this.profileName = ''),
      (this.charsStart = 4),
      (this.charsEnd = 6));
  }
  render() {
    return l`
      <button
        ?disabled=${this.disabled}
        class=${w(this.balance ? void 0 : 'local-no-balance')}
        data-error=${w(this.isUnsupportedChain)}
      >
        ${this.imageTemplate()} ${this.addressTemplate()} ${this.balanceTemplate()}
      </button>
    `;
  }
  imageTemplate() {
    const e = this.networkSrc
      ? l`<wui-image src=${this.networkSrc}></wui-image>`
      : l` <wui-icon size="inherit" color="inherit" icon="networkPlaceholder"></wui-icon> `;
    return l`<wui-flex class="avatar-container">
      <wui-avatar
        .imageSrc=${this.avatarSrc}
        alt=${this.address}
        address=${this.address}
      ></wui-avatar>

      <wui-flex class="network-image-container">${e}</wui-flex>
    </wui-flex>`;
  }
  addressTemplate() {
    return l`<wui-text variant="md-regular" color="inherit">
      ${
        this.address
          ? j.getTruncateString({
              string: this.profileName || this.address,
              charsStart: this.profileName ? 18 : this.charsStart,
              charsEnd: this.profileName ? 0 : this.charsEnd,
              truncate: this.profileName ? 'end' : 'middle',
            })
          : null
      }
    </wui-text>`;
  }
  balanceTemplate() {
    if (this.balance) {
      const e = this.loading
        ? l`<wui-loading-spinner size="md" color="inherit"></wui-loading-spinner>`
        : l`<wui-text variant="md-regular" color="inherit"> ${this.balance}</wui-text>`;
      return l`<wui-flex alignItems="center" justifyContent="center" class="balance-container"
        >${e}</wui-flex
      >`;
    }
    return null;
  }
};
Y.styles = [I, T, on];
ue([c()], Y.prototype, 'networkSrc', void 0);
ue([c()], Y.prototype, 'avatarSrc', void 0);
ue([c()], Y.prototype, 'balance', void 0);
ue([c({ type: Boolean })], Y.prototype, 'isUnsupportedChain', void 0);
ue([c({ type: Boolean })], Y.prototype, 'disabled', void 0);
ue([c({ type: Boolean })], Y.prototype, 'loading', void 0);
ue([c()], Y.prototype, 'address', void 0);
ue([c()], Y.prototype, 'profileName', void 0);
ue([c()], Y.prototype, 'charsStart', void 0);
ue([c()], Y.prototype, 'charsEnd', void 0);
Y = ue([p('wui-account-button')], Y);
var U = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
class z extends f {
  constructor() {
    (super(...arguments),
      (this.unsubscribe = []),
      (this.disabled = !1),
      (this.balance = 'show'),
      (this.charsStart = 4),
      (this.charsEnd = 6),
      (this.namespace = void 0),
      (this.isSupported = b.state.allowUnsupportedChain
        ? !0
        : u.state.activeChain
          ? u.checkIfSupportedNetwork(u.state.activeChain)
          : !0));
  }
  connectedCallback() {
    (super.connectedCallback(),
      this.setAccountData(u.getAccountData(this.namespace)),
      this.setNetworkData(u.getNetworkData(this.namespace)));
  }
  firstUpdated() {
    const e = this.namespace;
    e
      ? this.unsubscribe.push(
          u.subscribeChainProp(
            'accountState',
            (i) => {
              this.setAccountData(i);
            },
            e
          ),
          u.subscribeChainProp(
            'networkState',
            (i) => {
              (this.setNetworkData(i),
                (this.isSupported = u.checkIfSupportedNetwork(e, i?.caipNetwork?.caipNetworkId)));
            },
            e
          )
        )
      : this.unsubscribe.push(
          Oe.subscribeNetworkImages(() => {
            this.networkImage = E.getNetworkImage(this.network);
          }),
          u.subscribeKey('activeCaipAddress', (i) => {
            this.caipAddress = i;
          }),
          u.subscribeChainProp('accountState', (i) => {
            this.setAccountData(i);
          }),
          u.subscribeKey('activeCaipNetwork', (i) => {
            ((this.network = i),
              (this.networkImage = E.getNetworkImage(i)),
              (this.isSupported = i?.chainNamespace ? u.checkIfSupportedNetwork(i?.chainNamespace) : !0),
              this.fetchNetworkImage(i));
          })
        );
  }
  updated() {
    this.fetchNetworkImage(this.network);
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((e) => e());
  }
  render() {
    if (!u.state.activeChain) return null;
    const e = this.balance === 'show',
      i = typeof this.balanceVal != 'string',
      { formattedText: o } = m.parseBalance(this.balanceVal, this.balanceSymbol);
    return l`
      <wui-account-button
        .disabled=${!!this.disabled}
        .isUnsupportedChain=${b.state.allowUnsupportedChain ? !1 : !this.isSupported}
        address=${w(m.getPlainAddress(this.caipAddress))}
        profileName=${w(this.profileName)}
        networkSrc=${w(this.networkImage)}
        avatarSrc=${w(this.profileImage)}
        balance=${e ? o : ''}
        @click=${this.onClick.bind(this)}
        data-testid=${`account-button${this.namespace ? `-${this.namespace}` : ''}`}
        .charsStart=${this.charsStart}
        .charsEnd=${this.charsEnd}
        ?loading=${i}
      >
      </wui-account-button>
    `;
  }
  onClick() {
    this.isSupported || b.state.allowUnsupportedChain
      ? O.open({ namespace: this.namespace })
      : O.open({ view: 'UnsupportedChain' });
  }
  async fetchNetworkImage(e) {
    e?.assets?.imageId && (this.networkImage = await E.fetchNetworkImage(e?.assets?.imageId));
  }
  setAccountData(e) {
    e &&
      ((this.caipAddress = e.caipAddress),
      (this.balanceVal = e.balance),
      (this.balanceSymbol = e.balanceSymbol),
      (this.profileName = e.profileName),
      (this.profileImage = e.profileImage));
  }
  setNetworkData(e) {
    e && ((this.network = e.caipNetwork), (this.networkImage = E.getNetworkImage(e.caipNetwork)));
  }
}
U([c({ type: Boolean })], z.prototype, 'disabled', void 0);
U([c()], z.prototype, 'balance', void 0);
U([c()], z.prototype, 'charsStart', void 0);
U([c()], z.prototype, 'charsEnd', void 0);
U([c()], z.prototype, 'namespace', void 0);
U([d()], z.prototype, 'caipAddress', void 0);
U([d()], z.prototype, 'balanceVal', void 0);
U([d()], z.prototype, 'balanceSymbol', void 0);
U([d()], z.prototype, 'profileName', void 0);
U([d()], z.prototype, 'profileImage', void 0);
U([d()], z.prototype, 'network', void 0);
U([d()], z.prototype, 'networkImage', void 0);
U([d()], z.prototype, 'isSupported', void 0);
let hi = class extends z {};
hi = U([p('w3m-account-button')], hi);
let pi = class extends z {};
pi = U([p('appkit-account-button')], pi);
const rn = ne`
  :host {
    display: block;
    width: max-content;
  }
`;
var he = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
class oe extends f {
  constructor() {
    (super(...arguments),
      (this.unsubscribe = []),
      (this.disabled = !1),
      (this.balance = void 0),
      (this.size = void 0),
      (this.label = void 0),
      (this.loadingLabel = void 0),
      (this.charsStart = 4),
      (this.charsEnd = 6),
      (this.namespace = void 0));
  }
  firstUpdated() {
    ((this.caipAddress = this.namespace ? u.getAccountData(this.namespace)?.caipAddress : u.state.activeCaipAddress),
      this.namespace
        ? this.unsubscribe.push(
            u.subscribeChainProp(
              'accountState',
              (e) => {
                this.caipAddress = e?.caipAddress;
              },
              this.namespace
            )
          )
        : this.unsubscribe.push(u.subscribeKey('activeCaipAddress', (e) => (this.caipAddress = e))));
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((e) => e());
  }
  render() {
    return this.caipAddress
      ? l`
          <appkit-account-button
            .disabled=${!!this.disabled}
            balance=${w(this.balance)}
            .charsStart=${w(this.charsStart)}
            .charsEnd=${w(this.charsEnd)}
            namespace=${w(this.namespace)}
          >
          </appkit-account-button>
        `
      : l`
          <appkit-connect-button
            size=${w(this.size)}
            label=${w(this.label)}
            loadingLabel=${w(this.loadingLabel)}
            namespace=${w(this.namespace)}
          ></appkit-connect-button>
        `;
  }
}
oe.styles = rn;
he([c({ type: Boolean })], oe.prototype, 'disabled', void 0);
he([c()], oe.prototype, 'balance', void 0);
he([c()], oe.prototype, 'size', void 0);
he([c()], oe.prototype, 'label', void 0);
he([c()], oe.prototype, 'loadingLabel', void 0);
he([c()], oe.prototype, 'charsStart', void 0);
he([c()], oe.prototype, 'charsEnd', void 0);
he([c()], oe.prototype, 'namespace', void 0);
he([d()], oe.prototype, 'caipAddress', void 0);
let wi = class extends oe {};
wi = he([p('w3m-button')], wi);
let fi = class extends oe {};
fi = he([p('appkit-button')], fi);
const sn = $`
  :host {
    position: relative;
    display: block;
  }

  button {
    border-radius: ${({ borderRadius: t }) => t[2]};
  }

  button[data-size='sm'] {
    padding: ${({ spacing: t }) => t[2]};
  }

  button[data-size='md'] {
    padding: ${({ spacing: t }) => t[3]};
  }

  button[data-size='lg'] {
    padding: ${({ spacing: t }) => t[4]};
  }

  button[data-variant='primary'] {
    background: ${({ tokens: t }) => t.core.backgroundAccentPrimary};
  }

  button[data-variant='secondary'] {
    background: ${({ tokens: t }) => t.core.foregroundAccent010};
  }

  button:hover:enabled {
    border-radius: ${({ borderRadius: t }) => t[3]};
  }

  button:disabled {
    cursor: not-allowed;
  }

  button[data-loading='true'] {
    cursor: not-allowed;
  }

  button[data-loading='true'][data-size='sm'] {
    border-radius: ${({ borderRadius: t }) => t[32]};
    padding: ${({ spacing: t }) => t[2]} ${({ spacing: t }) => t[3]};
  }

  button[data-loading='true'][data-size='md'] {
    border-radius: ${({ borderRadius: t }) => t[20]};
    padding: ${({ spacing: t }) => t[3]} ${({ spacing: t }) => t[4]};
  }

  button[data-loading='true'][data-size='lg'] {
    border-radius: ${({ borderRadius: t }) => t[16]};
    padding: ${({ spacing: t }) => t[4]} ${({ spacing: t }) => t[5]};
  }
`;
var ut = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let Pe = class extends f {
  constructor() {
    (super(...arguments),
      (this.size = 'md'),
      (this.variant = 'primary'),
      (this.loading = !1),
      (this.text = 'Connect Wallet'));
  }
  render() {
    return l`
      <button
        data-loading=${this.loading}
        data-variant=${this.variant}
        data-size=${this.size}
        ?disabled=${this.loading}
      >
        ${this.contentTemplate()}
      </button>
    `;
  }
  contentTemplate() {
    const e = {
        lg: 'lg-regular',
        md: 'md-regular',
        sm: 'sm-regular',
      },
      i = {
        primary: 'invert',
        secondary: 'accent-primary',
      };
    return this.loading
      ? l`<wui-loading-spinner
      color=${i[this.variant]}
      size=${this.size}
    ></wui-loading-spinner>`
      : l` <wui-text variant=${e[this.size]} color=${i[this.variant]}>
        ${this.text}
      </wui-text>`;
  }
};
Pe.styles = [I, T, sn];
ut([c()], Pe.prototype, 'size', void 0);
ut([c()], Pe.prototype, 'variant', void 0);
ut([c({ type: Boolean })], Pe.prototype, 'loading', void 0);
ut([c()], Pe.prototype, 'text', void 0);
Pe = ut([p('wui-connect-button')], Pe);
var We = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
class Re extends f {
  constructor() {
    (super(),
      (this.unsubscribe = []),
      (this.size = 'md'),
      (this.label = 'Connect Wallet'),
      (this.loadingLabel = 'Connecting...'),
      (this.open = O.state.open),
      (this.loading = this.namespace ? O.state.loadingNamespaceMap.get(this.namespace) : O.state.loading),
      this.unsubscribe.push(
        O.subscribe((e) => {
          ((this.open = e.open),
            (this.loading = this.namespace ? e.loadingNamespaceMap.get(this.namespace) : e.loading));
        })
      ));
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((e) => e());
  }
  render() {
    return l`
      <wui-connect-button
        size=${w(this.size)}
        .loading=${this.loading}
        @click=${this.onClick.bind(this)}
        data-testid=${`connect-button${this.namespace ? `-${this.namespace}` : ''}`}
      >
        ${this.loading ? this.loadingLabel : this.label}
      </wui-connect-button>
    `;
  }
  onClick() {
    this.open ? O.close() : this.loading || O.open({ view: 'Connect', namespace: this.namespace });
  }
}
We([c()], Re.prototype, 'size', void 0);
We([c()], Re.prototype, 'label', void 0);
We([c()], Re.prototype, 'loadingLabel', void 0);
We([c()], Re.prototype, 'namespace', void 0);
We([d()], Re.prototype, 'open', void 0);
We([d()], Re.prototype, 'loading', void 0);
let mi = class extends Re {};
mi = We([p('w3m-connect-button')], mi);
let bi = class extends Re {};
bi = We([p('appkit-connect-button')], bi);
const an = $`
  :host {
    display: block;
  }

  button {
    border-radius: ${({ borderRadius: t }) => t[32]};
    display: flex;
    gap: ${({ spacing: t }) => t[1]};
    padding: ${({ spacing: t }) => t[1]} ${({ spacing: t }) => t[2]}
      ${({ spacing: t }) => t[1]} ${({ spacing: t }) => t[1]};
    background-color: ${({ tokens: t }) => t.theme.foregroundPrimary};
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (hover: hover) {
    button:hover:enabled {
      background-color: ${({ tokens: t }) => t.theme.foregroundSecondary};
    }
  }

  button[data-size='sm'] > wui-icon-box,
  button[data-size='sm'] > wui-image {
    width: 16px;
    height: 16px;
  }

  button[data-size='md'] > wui-icon-box,
  button[data-size='md'] > wui-image {
    width: 20px;
    height: 20px;
  }

  button[data-size='lg'] > wui-icon-box,
  button[data-size='lg'] > wui-image {
    width: 24px;
    height: 24px;
  }

  wui-image,
  wui-icon-box {
    border-radius: ${({ borderRadius: t }) => t[32]};
  }
`;
var ht = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let De = class extends f {
  constructor() {
    (super(...arguments),
      (this.imageSrc = void 0),
      (this.isUnsupportedChain = void 0),
      (this.disabled = !1),
      (this.size = 'lg'));
  }
  render() {
    const e = {
      sm: 'sm-regular',
      md: 'md-regular',
      lg: 'lg-regular',
    };
    return l`
      <button data-size=${this.size} data-testid="wui-network-button" ?disabled=${this.disabled}>
        ${this.visualTemplate()}
        <wui-text variant=${e[this.size]} color="primary">
          <slot></slot>
        </wui-text>
      </button>
    `;
  }
  visualTemplate() {
    return this.isUnsupportedChain
      ? l` <wui-icon-box color="error" icon="warningCircle"></wui-icon-box> `
      : this.imageSrc
        ? l`<wui-image src=${this.imageSrc}></wui-image>`
        : l` <wui-icon-box color="default" icon="networkPlaceholder"></wui-icon-box> `;
  }
};
De.styles = [I, T, an];
ht([c()], De.prototype, 'imageSrc', void 0);
ht([c({ type: Boolean })], De.prototype, 'isUnsupportedChain', void 0);
ht([c({ type: Boolean })], De.prototype, 'disabled', void 0);
ht([c()], De.prototype, 'size', void 0);
De = ht([p('wui-network-button')], De);
const ln = ne`
  :host {
    display: block;
    width: max-content;
  }
`;
var Ce = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
class me extends f {
  constructor() {
    (super(),
      (this.unsubscribe = []),
      (this.disabled = !1),
      (this.network = u.state.activeCaipNetwork),
      (this.networkImage = E.getNetworkImage(this.network)),
      (this.caipAddress = u.state.activeCaipAddress),
      (this.loading = O.state.loading),
      (this.isSupported = b.state.allowUnsupportedChain
        ? !0
        : u.state.activeChain
          ? u.checkIfSupportedNetwork(u.state.activeChain)
          : !0),
      this.unsubscribe.push(
        Oe.subscribeNetworkImages(() => {
          this.networkImage = E.getNetworkImage(this.network);
        }),
        u.subscribeKey('activeCaipAddress', (e) => {
          this.caipAddress = e;
        }),
        u.subscribeKey('activeCaipNetwork', (e) => {
          ((this.network = e),
            (this.networkImage = E.getNetworkImage(e)),
            (this.isSupported = e?.chainNamespace ? u.checkIfSupportedNetwork(e.chainNamespace) : !0),
            E.fetchNetworkImage(e?.assets?.imageId));
        }),
        O.subscribeKey('loading', (e) => (this.loading = e))
      ));
  }
  firstUpdated() {
    E.fetchNetworkImage(this.network?.assets?.imageId);
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((e) => e());
  }
  render() {
    const e = this.network ? u.checkIfSupportedNetwork(this.network.chainNamespace) : !0;
    return l`
      <wui-network-button
        .disabled=${!!(this.disabled || this.loading)}
        .isUnsupportedChain=${b.state.allowUnsupportedChain ? !1 : !e}
        imageSrc=${w(this.networkImage)}
        @click=${this.onClick.bind(this)}
        data-testid="w3m-network-button"
      >
        ${this.getLabel()}
        <slot></slot>
      </wui-network-button>
    `;
  }
  getLabel() {
    return this.network
      ? !this.isSupported && !b.state.allowUnsupportedChain
        ? 'Switch Network'
        : this.network.name
      : this.label
        ? this.label
        : this.caipAddress
          ? 'Unknown Network'
          : 'Select Network';
  }
  onClick() {
    this.loading || (C.sendEvent({ type: 'track', event: 'CLICK_NETWORKS' }), O.open({ view: 'Networks' }));
  }
}
me.styles = ln;
Ce([c({ type: Boolean })], me.prototype, 'disabled', void 0);
Ce([c({ type: String })], me.prototype, 'label', void 0);
Ce([d()], me.prototype, 'network', void 0);
Ce([d()], me.prototype, 'networkImage', void 0);
Ce([d()], me.prototype, 'caipAddress', void 0);
Ce([d()], me.prototype, 'loading', void 0);
Ce([d()], me.prototype, 'isSupported', void 0);
let gi = class extends me {};
gi = Ce([p('w3m-network-button')], gi);
let yi = class extends me {};
yi = Ce([p('appkit-network-button')], yi);
const cn = $`
  :host {
    display: block;
  }

  button {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${({ spacing: t }) => t[4]};
    padding: ${({ spacing: t }) => t[3]};
    border-radius: ${({ borderRadius: t }) => t[4]};
    background-color: ${({ tokens: t }) => t.core.foregroundAccent010};
  }

  wui-flex > wui-icon {
    padding: ${({ spacing: t }) => t[2]};
    color: ${({ tokens: t }) => t.theme.textInvert};
    background-color: ${({ tokens: t }) => t.core.backgroundAccentPrimary};
    border-radius: ${({ borderRadius: t }) => t[2]};
    align-items: normal;
  }

  @media (hover: hover) {
    button:hover:enabled {
      background-color: ${({ tokens: t }) => t.core.foregroundAccent020};
    }
  }
`;
var Ot = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let Ke = class extends f {
  constructor() {
    (super(...arguments), (this.label = ''), (this.description = ''), (this.icon = 'wallet'));
  }
  render() {
    return l`
      <button>
        <wui-flex gap="2" alignItems="center">
          <wui-icon weight="fill" size="md" name=${this.icon} color="inherit"></wui-icon>
          <wui-flex flexDirection="column" gap="1">
            <wui-text variant="md-medium" color="primary">${this.label}</wui-text>
            <wui-text variant="md-regular" color="tertiary">${this.description}</wui-text>
          </wui-flex>
        </wui-flex>
        <wui-icon size="lg" color="accent-primary" name="chevronRight"></wui-icon>
      </button>
    `;
  }
};
Ke.styles = [I, T, cn];
Ot([c()], Ke.prototype, 'label', void 0);
Ot([c()], Ke.prototype, 'description', void 0);
Ot([c()], Ke.prototype, 'icon', void 0);
Ke = Ot([p('wui-notice-card')], Ke);
var Ni = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let Mt = class extends f {
  constructor() {
    (super(),
      (this.unsubscribe = []),
      (this.socialProvider = Ee.getConnectedSocialProvider()),
      (this.socialUsername = Ee.getConnectedSocialUsername()),
      (this.namespace = u.state.activeChain),
      this.unsubscribe.push(
        u.subscribeKey('activeChain', (e) => {
          this.namespace = e;
        })
      ));
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((e) => e());
  }
  render() {
    const e = g.getConnectorId(this.namespace),
      i = g.getAuthConnector();
    if (!i || e !== k.CONNECTOR_ID.AUTH) return ((this.style.cssText = 'display: none'), null);
    const o = i.provider.getEmail() ?? '';
    return !o && !this.socialUsername
      ? ((this.style.cssText = 'display: none'), null)
      : l`
      <wui-list-item
        ?rounded=${!0}
        icon=${this.socialProvider ?? 'mail'}
        data-testid="w3m-account-email-update"
        ?chevron=${!this.socialProvider}
        @click=${() => {
          this.onGoToUpdateEmail(o, this.socialProvider);
        }}
      >
        <wui-text variant="lg-regular" color="primary">${this.getAuthName(o)}</wui-text>
      </wui-list-item>
    `;
  }
  onGoToUpdateEmail(e, i) {
    i || h.push('UpdateEmailWallet', { email: e, redirectView: 'Account' });
  }
  getAuthName(e) {
    return this.socialUsername
      ? this.socialProvider === 'discord' && this.socialUsername.endsWith('0')
        ? this.socialUsername.slice(0, -1)
        : this.socialUsername
      : e.length > 30
        ? `${e.slice(0, -3)}...`
        : e;
  }
};
Ni([d()], Mt.prototype, 'namespace', void 0);
Mt = Ni([p('w3m-account-auth-button')], Mt);
var be = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let ce = class extends f {
  constructor() {
    (super(),
      (this.usubscribe = []),
      (this.networkImages = Oe.state.networkImages),
      (this.address = u.getAccountData()?.address),
      (this.profileImage = u.getAccountData()?.profileImage),
      (this.profileName = u.getAccountData()?.profileName),
      (this.network = u.state.activeCaipNetwork),
      (this.disconnecting = !1),
      (this.loading = !1),
      (this.switched = !1),
      (this.text = ''),
      (this.remoteFeatures = b.state.remoteFeatures),
      this.usubscribe.push(
        u.subscribeChainProp('accountState', (e) => {
          e && ((this.address = e.address), (this.profileImage = e.profileImage), (this.profileName = e.profileName));
        }),
        u.subscribeKey('activeCaipNetwork', (e) => {
          e?.id && (this.network = e);
        }),
        b.subscribeKey('remoteFeatures', (e) => {
          this.remoteFeatures = e;
        })
      ));
  }
  disconnectedCallback() {
    this.usubscribe.forEach((e) => e());
  }
  render() {
    if (!this.address) throw new Error('w3m-account-settings-view: No account provided');
    const e = this.networkImages[this.network?.assets?.imageId ?? ''];
    return l`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        gap="4"
        .padding=${['0', '5', '3', '5']}
      >
        <wui-avatar
          alt=${this.address}
          address=${this.address}
          imageSrc=${w(this.profileImage)}
          size="lg"
        ></wui-avatar>
        <wui-flex flexDirection="column" alignItems="center">
          <wui-flex gap="1" alignItems="center" justifyContent="center">
            <wui-text variant="h5-medium" color="primary" data-testid="account-settings-address">
              ${j.getTruncateString({
                string: this.address,
                charsStart: 4,
                charsEnd: 6,
                truncate: 'middle',
              })}
            </wui-text>
            <wui-icon-link
              size="md"
              icon="copy"
              iconColor="default"
              @click=${this.onCopyAddress}
            ></wui-icon-link>
          </wui-flex>
        </wui-flex>
      </wui-flex>
      <wui-flex flexDirection="column" gap="4">
        <wui-flex flexDirection="column" gap="2" .padding=${['6', '4', '3', '4']}>
          ${this.authCardTemplate()}
          <w3m-account-auth-button></w3m-account-auth-button>
          <wui-list-item
            imageSrc=${w(e)}
            ?chevron=${this.isAllowedNetworkSwitch()}
            ?fullSize=${!0}
            ?rounded=${!0}
            @click=${this.onNetworks.bind(this)}
            data-testid="account-switch-network-button"
          >
            <wui-text variant="lg-regular" color="primary">
              ${this.network?.name ?? 'Unknown'}
            </wui-text>
          </wui-list-item>
          ${this.togglePreferredAccountBtnTemplate()} ${this.chooseNameButtonTemplate()}
          <wui-list-item
            ?rounded=${!0}
            icon="power"
            iconColor="error"
            ?chevron=${!1}
            .loading=${this.disconnecting}
            @click=${this.onDisconnect.bind(this)}
            data-testid="disconnect-button"
          >
            <wui-text variant="lg-regular" color="primary">Disconnect</wui-text>
          </wui-list-item>
        </wui-flex>
      </wui-flex>
    `;
  }
  chooseNameButtonTemplate() {
    const e = this.network?.chainNamespace,
      i = g.getConnectorId(e),
      o = g.getAuthConnector();
    return !u.checkIfNamesSupported() || !o || i !== k.CONNECTOR_ID.AUTH || this.profileName
      ? null
      : l`
      <wui-list-item
        icon="id"
        ?rounded=${!0}
        ?chevron=${!0}
        @click=${this.onChooseName.bind(this)}
        data-testid="account-choose-name-button"
      >
        <wui-text variant="lg-regular" color="primary">Choose account name </wui-text>
      </wui-list-item>
    `;
  }
  authCardTemplate() {
    const e = g.getConnectorId(this.network?.chainNamespace),
      i = g.getAuthConnector(),
      { origin: o } = location;
    return !i || e !== k.CONNECTOR_ID.AUTH || o.includes(N.SECURE_SITE)
      ? null
      : l`
      <wui-notice-card
        @click=${this.onGoToUpgradeView.bind(this)}
        label="Upgrade your wallet"
        description="Transition to a self-custodial wallet"
        icon="wallet"
        data-testid="w3m-wallet-upgrade-card"
      ></wui-notice-card>
    `;
  }
  isAllowedNetworkSwitch() {
    const e = u.getAllRequestedCaipNetworks(),
      i = e ? e.length > 1 : !1,
      o = e?.find(({ id: r }) => r === this.network?.id);
    return i || !o;
  }
  onCopyAddress() {
    try {
      this.address && (m.copyToClopboard(this.address), A.showSuccess('Address copied'));
    } catch {
      A.showError('Failed to copy');
    }
  }
  togglePreferredAccountBtnTemplate() {
    const e = this.network?.chainNamespace,
      i = u.checkIfSmartAccountEnabled(),
      o = g.getConnectorId(e);
    return !g.getAuthConnector() || o !== k.CONNECTOR_ID.AUTH || !i
      ? null
      : (this.switched ||
          (this.text =
            Ae(e) === le.ACCOUNT_TYPES.SMART_ACCOUNT ? 'Switch to your EOA' : 'Switch to your Smart Account'),
        l`
      <wui-list-item
        icon="swapHorizontal"
        ?rounded=${!0}
        ?chevron=${!0}
        ?loading=${this.loading}
        @click=${this.changePreferredAccountType.bind(this)}
        data-testid="account-toggle-preferred-account-type"
      >
        <wui-text variant="lg-regular" color="primary">${this.text}</wui-text>
      </wui-list-item>
    `);
  }
  onChooseName() {
    h.push('ChooseAccountName');
  }
  async changePreferredAccountType() {
    const e = this.network?.chainNamespace,
      i = u.checkIfSmartAccountEnabled(),
      o = Ae(e) === le.ACCOUNT_TYPES.SMART_ACCOUNT || !i ? le.ACCOUNT_TYPES.EOA : le.ACCOUNT_TYPES.SMART_ACCOUNT;
    g.getAuthConnector() &&
      ((this.loading = !0),
      await y.setPreferredAccountType(o, e),
      (this.text = o === le.ACCOUNT_TYPES.SMART_ACCOUNT ? 'Switch to your EOA' : 'Switch to your Smart Account'),
      (this.switched = !0),
      Ki.resetSend(),
      (this.loading = !1),
      this.requestUpdate());
  }
  onNetworks() {
    this.isAllowedNetworkSwitch() && h.push('Networks');
  }
  async onDisconnect() {
    try {
      this.disconnecting = !0;
      const e = this.network?.chainNamespace,
        o = y.getConnections(e).length > 0,
        r = e && g.state.activeConnectorIds[e],
        n = this.remoteFeatures?.multiWallet;
      (await y.disconnect(n ? { id: r, namespace: e } : {}),
        o && n && (h.push('ProfileWallets'), A.showSuccess('Wallet deleted')));
    } catch {
      (C.sendEvent({
        type: 'track',
        event: 'DISCONNECT_ERROR',
        properties: { message: 'Failed to disconnect' },
      }),
        A.showError('Failed to disconnect'));
    } finally {
      this.disconnecting = !1;
    }
  }
  onGoToUpgradeView() {
    (C.sendEvent({ type: 'track', event: 'EMAIL_UPGRADE_FROM_MODAL' }), h.push('UpgradeEmailWallet'));
  }
};
be([d()], ce.prototype, 'address', void 0);
be([d()], ce.prototype, 'profileImage', void 0);
be([d()], ce.prototype, 'profileName', void 0);
be([d()], ce.prototype, 'network', void 0);
be([d()], ce.prototype, 'disconnecting', void 0);
be([d()], ce.prototype, 'loading', void 0);
be([d()], ce.prototype, 'switched', void 0);
be([d()], ce.prototype, 'text', void 0);
be([d()], ce.prototype, 'remoteFeatures', void 0);
ce = be([p('w3m-account-settings-view')], ce);
const dn = $`
  :host {
    flex: 1;
    height: 100%;
  }

  button {
    width: 100%;
    height: 100%;
    display: inline-flex;
    align-items: center;
    padding: ${({ spacing: t }) => t[1]} ${({ spacing: t }) => t[2]};
    column-gap: ${({ spacing: t }) => t[1]};
    color: ${({ tokens: t }) => t.theme.textSecondary};
    border-radius: ${({ borderRadius: t }) => t[20]};
    background-color: transparent;
    transition: background-color ${({ durations: t }) => t.lg}
      ${({ easings: t }) => t['ease-out-power-2']};
    will-change: background-color;
  }

  /* -- Hover & Active states ----------------------------------------------------------- */
  button[data-active='true'] {
    color: ${({ tokens: t }) => t.theme.textPrimary};
    background-color: ${({ tokens: t }) => t.theme.foregroundTertiary};
  }

  button:hover:enabled:not([data-active='true']),
  button:active:enabled:not([data-active='true']) {
    wui-text,
    wui-icon {
      color: ${({ tokens: t }) => t.theme.textPrimary};
    }
  }
`;
var pt = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
const un = {
    lg: 'lg-regular',
    md: 'md-regular',
    sm: 'sm-regular',
  },
  hn = {
    lg: 'md',
    md: 'sm',
    sm: 'sm',
  };
let Le = class extends f {
  constructor() {
    (super(...arguments), (this.icon = 'mobile'), (this.size = 'md'), (this.label = ''), (this.active = !1));
  }
  render() {
    return l`
      <button data-active=${this.active}>
        ${this.icon ? l`<wui-icon size=${hn[this.size]} name=${this.icon}></wui-icon>` : ''}
        <wui-text variant=${un[this.size]}> ${this.label} </wui-text>
      </button>
    `;
  }
};
Le.styles = [I, T, dn];
pt([c()], Le.prototype, 'icon', void 0);
pt([c()], Le.prototype, 'size', void 0);
pt([c()], Le.prototype, 'label', void 0);
pt([c({ type: Boolean })], Le.prototype, 'active', void 0);
Le = pt([p('wui-tab-item')], Le);
const pn = $`
  :host {
    display: inline-flex;
    align-items: center;
    background-color: ${({ tokens: t }) => t.theme.foregroundSecondary};
    border-radius: ${({ borderRadius: t }) => t[32]};
    padding: ${({ spacing: t }) => t['01']};
    box-sizing: border-box;
  }

  :host([data-size='sm']) {
    height: 26px;
  }

  :host([data-size='md']) {
    height: 36px;
  }
`;
var wt = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let je = class extends f {
  constructor() {
    (super(...arguments), (this.tabs = []), (this.onTabChange = () => null), (this.size = 'md'), (this.activeTab = 0));
  }
  render() {
    return (
      (this.dataset.size = this.size),
      this.tabs.map((e, i) => {
        const o = i === this.activeTab;
        return l`
        <wui-tab-item
          @click=${() => this.onTabClick(i)}
          icon=${e.icon}
          size=${this.size}
          label=${e.label}
          ?active=${o}
          data-active=${o}
          data-testid="tab-${e.label?.toLowerCase()}"
        ></wui-tab-item>
      `;
      })
    );
  }
  onTabClick(e) {
    ((this.activeTab = e), this.onTabChange(e));
  }
};
je.styles = [I, T, pn];
wt([c({ type: Array })], je.prototype, 'tabs', void 0);
wt([c()], je.prototype, 'onTabChange', void 0);
wt([c()], je.prototype, 'size', void 0);
wt([d()], je.prototype, 'activeTab', void 0);
je = wt([p('wui-tabs')], je);
const wn = $`
  button {
    display: flex;
    align-items: center;
    height: 40px;
    padding: ${({ spacing: t }) => t[2]};
    border-radius: ${({ borderRadius: t }) => t[4]};
    column-gap: ${({ spacing: t }) => t[1]};
    background-color: transparent;
    transition: background-color ${({ durations: t }) => t.lg}
      ${({ easings: t }) => t['ease-out-power-2']};
    will-change: background-color;
  }

  wui-image,
  .icon-box {
    width: ${({ spacing: t }) => t[6]};
    height: ${({ spacing: t }) => t[6]};
    border-radius: ${({ borderRadius: t }) => t[4]};
  }

  wui-text {
    flex: 1;
  }

  .icon-box {
    position: relative;
  }

  .icon-box[data-active='true'] {
    background-color: ${({ tokens: t }) => t.theme.foregroundSecondary};
  }

  .circle {
    position: absolute;
    left: 16px;
    top: 15px;
    width: 8px;
    height: 8px;
    background-color: ${({ tokens: t }) => t.core.textSuccess};
    box-shadow: 0 0 0 2px ${({ tokens: t }) => t.theme.foregroundPrimary};
    border-radius: 50%;
  }

  /* -- Hover & Active states ----------------------------------------------------------- */
  @media (hover: hover) {
    button:hover:enabled,
    button:active:enabled {
      background-color: ${({ tokens: t }) => t.theme.foregroundPrimary};
    }
  }
`;
var ge = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let te = class extends f {
  constructor() {
    (super(...arguments),
      (this.address = ''),
      (this.profileName = ''),
      (this.alt = ''),
      (this.imageSrc = ''),
      (this.icon = void 0),
      (this.iconSize = 'md'),
      (this.loading = !1),
      (this.charsStart = 4),
      (this.charsEnd = 6));
  }
  render() {
    return l`
      <button>
        ${this.leftImageTemplate()} ${this.textTemplate()} ${this.rightImageTemplate()}
      </button>
    `;
  }
  leftImageTemplate() {
    const e = this.icon
      ? l`<wui-icon
          size=${w(this.iconSize)}
          color="default"
          name=${this.icon}
          class="icon"
        ></wui-icon>`
      : l`<wui-image src=${this.imageSrc} alt=${this.alt}></wui-image>`;
    return l`
      <wui-flex
        alignItems="center"
        justifyContent="center"
        class="icon-box"
        data-active=${!!this.icon}
      >
        ${e}
        <wui-flex class="circle"></wui-flex>
      </wui-flex>
    `;
  }
  textTemplate() {
    return l`
      <wui-text variant="lg-regular" color="primary">
        ${j.getTruncateString({
          string: this.profileName || this.address,
          charsStart: this.profileName ? 16 : this.charsStart,
          charsEnd: this.profileName ? 0 : this.charsEnd,
          truncate: this.profileName ? 'end' : 'middle',
        })}
      </wui-text>
    `;
  }
  rightImageTemplate() {
    return l`<wui-icon name="chevronBottom" size="sm" color="default"></wui-icon>`;
  }
};
te.styles = [I, T, wn];
ge([c()], te.prototype, 'address', void 0);
ge([c()], te.prototype, 'profileName', void 0);
ge([c()], te.prototype, 'alt', void 0);
ge([c()], te.prototype, 'imageSrc', void 0);
ge([c()], te.prototype, 'icon', void 0);
ge([c()], te.prototype, 'iconSize', void 0);
ge([c({ type: Boolean })], te.prototype, 'loading', void 0);
ge([c({ type: Number })], te.prototype, 'charsStart', void 0);
ge([c({ type: Number })], te.prototype, 'charsEnd', void 0);
te = ge([p('wui-wallet-switch')], te);
const fn = $`
  wui-icon-link {
    margin-right: calc(${({ spacing: t }) => t[8]} * -1);
  }

  wui-notice-card {
    margin-bottom: ${({ spacing: t }) => t[1]};
  }

  wui-list-item > wui-text {
    flex: 1;
  }

  w3m-transactions-view {
    max-height: 200px;
  }

  .balance-container {
    display: inline;
  }

  .tab-content-container {
    height: 300px;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;
  }

  .symbol {
    transform: translateY(-2px);
  }

  .tab-content-container::-webkit-scrollbar {
    display: none;
  }

  .account-button {
    width: auto;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${({ spacing: t }) => t[3]};
    height: 48px;
    padding: ${({ spacing: t }) => t[2]};
    padding-right: ${({ spacing: t }) => t[3]};
    box-shadow: inset 0 0 0 1px ${({ tokens: t }) => t.theme.foregroundPrimary};
    background-color: ${({ tokens: t }) => t.theme.foregroundPrimary};
    border-radius: ${({ borderRadius: t }) => t[6]};
    transition: background-color ${({ durations: t }) => t.lg}
      ${({ easings: t }) => t['ease-out-power-2']};
  }

  .account-button:hover {
    background-color: ${({ tokens: t }) => t.core.glass010};
  }

  .avatar-container {
    position: relative;
  }

  wui-avatar.avatar {
    width: 32px;
    height: 32px;
    box-shadow: 0 0 0 2px ${({ tokens: t }) => t.core.glass010};
  }

  wui-wallet-switch {
    margin-top: ${({ spacing: t }) => t[2]};
  }

  wui-avatar.network-avatar {
    width: 16px;
    height: 16px;
    position: absolute;
    left: 100%;
    top: 100%;
    transform: translate(-75%, -75%);
    box-shadow: 0 0 0 2px ${({ tokens: t }) => t.core.glass010};
  }

  .account-links {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .account-links wui-flex {
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    background: red;
    align-items: center;
    justify-content: center;
    height: 48px;
    padding: 10px;
    flex: 1 0 0;
    border-radius: var(--XS, 16px);
    border: 1px solid var(--dark-accent-glass-010, rgba(71, 161, 255, 0.1));
    background: var(--dark-accent-glass-010, rgba(71, 161, 255, 0.1));
    transition:
      background-color ${({ durations: t }) => t.md}
        ${({ easings: t }) => t['ease-out-power-1']},
      opacity ${({ durations: t }) => t.md} ${({ easings: t }) => t['ease-out-power-1']};
    will-change: background-color, opacity;
  }

  .account-links wui-flex:hover {
    background: var(--dark-accent-glass-015, rgba(71, 161, 255, 0.15));
  }

  .account-links wui-flex wui-icon {
    width: var(--S, 20px);
    height: var(--S, 20px);
  }

  .account-links wui-flex wui-icon svg path {
    stroke: #667dff;
  }
`;
var re = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let V = class extends f {
  constructor() {
    (super(),
      (this.unsubscribe = []),
      (this.caipAddress = u.getAccountData()?.caipAddress),
      (this.address = m.getPlainAddress(u.getAccountData()?.caipAddress)),
      (this.profileImage = u.getAccountData()?.profileImage),
      (this.profileName = u.getAccountData()?.profileName),
      (this.disconnecting = !1),
      (this.balance = u.getAccountData()?.balance),
      (this.balanceSymbol = u.getAccountData()?.balanceSymbol),
      (this.features = b.state.features),
      (this.remoteFeatures = b.state.remoteFeatures),
      (this.namespace = u.state.activeChain),
      (this.activeConnectorIds = g.state.activeConnectorIds),
      this.unsubscribe.push(
        u.subscribeChainProp('accountState', (e) => {
          ((this.address = m.getPlainAddress(e?.caipAddress)),
            (this.caipAddress = e?.caipAddress),
            (this.balance = e?.balance),
            (this.balanceSymbol = e?.balanceSymbol),
            (this.profileName = e?.profileName),
            (this.profileImage = e?.profileImage));
        }),
        b.subscribeKey('features', (e) => (this.features = e)),
        b.subscribeKey('remoteFeatures', (e) => (this.remoteFeatures = e)),
        g.subscribeKey('activeConnectorIds', (e) => {
          this.activeConnectorIds = e;
        }),
        u.subscribeKey('activeChain', (e) => (this.namespace = e)),
        u.subscribeKey('activeCaipNetwork', (e) => {
          e?.chainNamespace && (this.namespace = e?.chainNamespace);
        })
      ));
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((e) => e());
  }
  render() {
    if (!this.caipAddress || !this.namespace) return null;
    const e = this.activeConnectorIds[this.namespace],
      i = e ? g.getConnectorById(e) : void 0,
      o = E.getConnectorImage(i),
      { value: r, decimals: n, symbol: s } = m.parseBalance(this.balance, this.balanceSymbol);
    return l`<wui-flex
        flexDirection="column"
        .padding=${['0', '5', '4', '5']}
        alignItems="center"
        gap="3"
      >
        <wui-avatar
          alt=${w(this.caipAddress)}
          address=${w(m.getPlainAddress(this.caipAddress))}
          imageSrc=${w(this.profileImage === null ? void 0 : this.profileImage)}
          data-testid="single-account-avatar"
        ></wui-avatar>
        <wui-wallet-switch
          profileName=${this.profileName}
          address=${this.address}
          imageSrc=${o}
          alt=${i?.name}
          @click=${this.onGoToProfileWalletsView.bind(this)}
          data-testid="wui-wallet-switch"
        ></wui-wallet-switch>
        <div class="balance-container">
          <wui-text variant="h3-regular" color="primary">${r}</wui-text>
          <wui-text variant="h3-regular" color="secondary">.${n}</wui-text>
          <wui-text variant="h6-medium" color="primary" class="symbol">${s}</wui-text>
        </div>
        ${this.explorerBtnTemplate()}
      </wui-flex>

      <wui-flex flexDirection="column" gap="2" .padding=${['0', '3', '3', '3']}>
        ${this.authCardTemplate()} <w3m-account-auth-button></w3m-account-auth-button>
        ${this.orderedFeaturesTemplate()} ${this.activityTemplate()}
        <wui-list-item
          .rounded=${!0}
          icon="power"
          iconColor="error"
          ?chevron=${!1}
          .loading=${this.disconnecting}
          .rightIcon=${!1}
          @click=${this.onDisconnect.bind(this)}
          data-testid="disconnect-button"
        >
          <wui-text variant="lg-regular" color="primary">Disconnect</wui-text>
        </wui-list-item>
      </wui-flex>`;
  }
  fundWalletTemplate() {
    if (!this.namespace) return null;
    const e = N.ONRAMP_SUPPORTED_CHAIN_NAMESPACES.includes(this.namespace),
      i = N.PAY_WITH_EXCHANGE_SUPPORTED_CHAIN_NAMESPACES.includes(this.namespace),
      o = !!this.features?.receive,
      r = this.remoteFeatures?.onramp && e,
      n = this.remoteFeatures?.payWithExchange && i;
    return !r && !o && !n
      ? null
      : l`
      <wui-list-item
        .rounded=${!0}
        data-testid="w3m-account-default-fund-wallet-button"
        iconVariant="blue"
        icon="dollar"
        ?chevron=${!0}
        @click=${this.handleClickFundWallet.bind(this)}
      >
        <wui-text variant="lg-regular" color="primary">Fund wallet</wui-text>
      </wui-list-item>
    `;
  }
  orderedFeaturesTemplate() {
    return (this.features?.walletFeaturesOrder || N.DEFAULT_FEATURES.walletFeaturesOrder).map((i) => {
      switch (i) {
        case 'onramp':
          return this.fundWalletTemplate();
        case 'swaps':
          return this.swapsTemplate();
        case 'send':
          return this.sendTemplate();
        default:
          return null;
      }
    });
  }
  activityTemplate() {
    return this.namespace &&
      this.remoteFeatures?.activity &&
      N.ACTIVITY_ENABLED_CHAIN_NAMESPACES.includes(this.namespace)
      ? l` <wui-list-item
          .rounded=${!0}
          icon="clock"
          ?chevron=${!0}
          @click=${this.onTransactions.bind(this)}
          data-testid="w3m-account-default-activity-button"
        >
          <wui-text variant="lg-regular" color="primary">Activity</wui-text>
        </wui-list-item>`
      : null;
  }
  swapsTemplate() {
    const e = this.remoteFeatures?.swaps,
      i = u.state.activeChain === k.CHAIN.EVM;
    return !e || !i
      ? null
      : l`
      <wui-list-item
        .rounded=${!0}
        icon="recycleHorizontal"
        ?chevron=${!0}
        @click=${this.handleClickSwap.bind(this)}
        data-testid="w3m-account-default-swaps-button"
      >
        <wui-text variant="lg-regular" color="primary">Swap</wui-text>
      </wui-list-item>
    `;
  }
  sendTemplate() {
    const e = this.features?.send,
      i = u.state.activeChain;
    if (!i) throw new Error('SendController:sendTemplate - namespace is required');
    const o = N.SEND_SUPPORTED_NAMESPACES.includes(i);
    return !e || !o
      ? null
      : l`
      <wui-list-item
        .rounded=${!0}
        icon="send"
        ?chevron=${!0}
        @click=${this.handleClickSend.bind(this)}
        data-testid="w3m-account-default-send-button"
      >
        <wui-text variant="lg-regular" color="primary">Send</wui-text>
      </wui-list-item>
    `;
  }
  authCardTemplate() {
    const e = u.state.activeChain;
    if (!e) throw new Error('AuthCardTemplate:authCardTemplate - namespace is required');
    const i = g.getConnectorId(e),
      o = g.getAuthConnector(),
      { origin: r } = location;
    return !o || i !== k.CONNECTOR_ID.AUTH || r.includes(N.SECURE_SITE)
      ? null
      : l`
      <wui-notice-card
        @click=${this.onGoToUpgradeView.bind(this)}
        label="Upgrade your wallet"
        description="Transition to a self-custodial wallet"
        icon="wallet"
        data-testid="w3m-wallet-upgrade-card"
      ></wui-notice-card>
    `;
  }
  handleClickFundWallet() {
    h.push('FundWallet');
  }
  handleClickSwap() {
    h.push('Swap');
  }
  handleClickSend() {
    h.push('WalletSend');
  }
  explorerBtnTemplate() {
    return u.getAccountData()?.addressExplorerUrl
      ? l`
      <wui-button size="md" variant="accent-primary" @click=${this.onExplorer.bind(this)}>
        <wui-icon size="sm" color="inherit" slot="iconLeft" name="compass"></wui-icon>
        Block Explorer
        <wui-icon size="sm" color="inherit" slot="iconRight" name="externalLink"></wui-icon>
      </wui-button>
    `
      : null;
  }
  onTransactions() {
    (C.sendEvent({
      type: 'track',
      event: 'CLICK_TRANSACTIONS',
      properties: {
        isSmartAccount: Ae(u.state.activeChain) === le.ACCOUNT_TYPES.SMART_ACCOUNT,
      },
    }),
      h.push('Transactions'));
  }
  async onDisconnect() {
    try {
      this.disconnecting = !0;
      const i = y.getConnections(this.namespace).length > 0,
        o = this.namespace && g.state.activeConnectorIds[this.namespace],
        r = this.remoteFeatures?.multiWallet;
      (await y.disconnect(r ? { id: o, namespace: this.namespace } : {}),
        i && r && (h.push('ProfileWallets'), A.showSuccess('Wallet deleted')));
    } catch {
      (C.sendEvent({
        type: 'track',
        event: 'DISCONNECT_ERROR',
        properties: { message: 'Failed to disconnect' },
      }),
        A.showError('Failed to disconnect'));
    } finally {
      this.disconnecting = !1;
    }
  }
  onExplorer() {
    const e = u.getAccountData()?.addressExplorerUrl;
    e && m.openHref(e, '_blank');
  }
  onGoToUpgradeView() {
    (C.sendEvent({ type: 'track', event: 'EMAIL_UPGRADE_FROM_MODAL' }), h.push('UpgradeEmailWallet'));
  }
  onGoToProfileWalletsView() {
    h.push('ProfileWallets');
  }
};
V.styles = fn;
re([d()], V.prototype, 'caipAddress', void 0);
re([d()], V.prototype, 'address', void 0);
re([d()], V.prototype, 'profileImage', void 0);
re([d()], V.prototype, 'profileName', void 0);
re([d()], V.prototype, 'disconnecting', void 0);
re([d()], V.prototype, 'balance', void 0);
re([d()], V.prototype, 'balanceSymbol', void 0);
re([d()], V.prototype, 'features', void 0);
re([d()], V.prototype, 'remoteFeatures', void 0);
re([d()], V.prototype, 'namespace', void 0);
re([d()], V.prototype, 'activeConnectorIds', void 0);
V = re([p('w3m-account-default-widget')], V);
const mn = $`
  span {
    font-weight: 500;
    font-size: 38px;
    color: ${({ tokens: t }) => t.theme.textPrimary};
    line-height: 38px;
    letter-spacing: -2%;
    text-align: center;
    font-family: var(--apkt-fontFamily-regular);
  }

  .pennies {
    color: ${({ tokens: t }) => t.theme.textSecondary};
  }
`;
var ni = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let at = class extends f {
  constructor() {
    (super(...arguments), (this.dollars = '0'), (this.pennies = '00'));
  }
  render() {
    return l`<span>$${this.dollars}<span class="pennies">.${this.pennies}</span></span>`;
  }
};
at.styles = [I, mn];
ni([c()], at.prototype, 'dollars', void 0);
ni([c()], at.prototype, 'pennies', void 0);
at = ni([p('wui-balance')], at);
const bn = $`
  :host {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    position: relative;
  }

  wui-icon {
    position: absolute;
    width: 12px !important;
    height: 4px !important;
  }

  /* -- Variants --------------------------------------------------------- */
  :host([data-variant='fill']) {
    background-color: ${({ colors: t }) => t.neutrals100};
  }

  :host([data-variant='shade']) {
    background-color: ${({ colors: t }) => t.neutrals900};
  }

  :host([data-variant='fill']) > wui-text {
    color: ${({ colors: t }) => t.black};
  }

  :host([data-variant='shade']) > wui-text {
    color: ${({ colors: t }) => t.white};
  }

  :host([data-variant='fill']) > wui-icon {
    color: ${({ colors: t }) => t.neutrals100};
  }

  :host([data-variant='shade']) > wui-icon {
    color: ${({ colors: t }) => t.neutrals900};
  }

  /* -- Sizes --------------------------------------------------------- */
  :host([data-size='sm']) {
    padding: ${({ spacing: t }) => t[1]} ${({ spacing: t }) => t[2]};
    border-radius: ${({ borderRadius: t }) => t[2]};
  }

  :host([data-size='md']) {
    padding: ${({ spacing: t }) => t[2]} ${({ spacing: t }) => t[3]};
    border-radius: ${({ borderRadius: t }) => t[3]};
  }

  /* -- Placements --------------------------------------------------------- */
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
`;
var ft = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
const gn = {
  sm: 'sm-regular',
  md: 'md-regular',
};
let Be = class extends f {
  constructor() {
    (super(...arguments), (this.placement = 'top'), (this.variant = 'fill'), (this.size = 'md'), (this.message = ''));
  }
  render() {
    return (
      (this.dataset.variant = this.variant),
      (this.dataset.size = this.size),
      l`<wui-icon data-placement=${this.placement} size="inherit" name="cursor"></wui-icon>
      <wui-text variant=${gn[this.size]}>${this.message}</wui-text>`
    );
  }
};
Be.styles = [I, T, bn];
ft([c()], Be.prototype, 'placement', void 0);
ft([c()], Be.prototype, 'variant', void 0);
ft([c()], Be.prototype, 'size', void 0);
ft([c()], Be.prototype, 'message', void 0);
Be = ft([p('wui-tooltip')], Be);
const yn = ne`
  :host {
    width: 100%;
    max-height: 280px;
    overflow: scroll;
    scrollbar-width: none;
  }

  :host::-webkit-scrollbar {
    display: none;
  }
`;
var vn = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let Vt = class extends f {
  render() {
    return l`<w3m-activity-list page="account"></w3m-activity-list>`;
  }
};
Vt.styles = yn;
Vt = vn([p('w3m-account-activity-widget')], Vt);
const xn = $`
  :host {
    width: 100%;
  }

  button {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: ${({ spacing: t }) => t[4]};
    padding: ${({ spacing: t }) => t[4]};
    background-color: transparent;
    border-radius: ${({ borderRadius: t }) => t[4]};
  }

  wui-text {
    max-width: 174px;
  }

  .tag-container {
    width: fit-content;
  }

  @media (hover: hover) {
    button:hover:enabled {
      background-color: ${({ tokens: t }) => t.theme.foregroundPrimary};
    }
  }
`;
var Ze = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let Ie = class extends f {
  constructor() {
    (super(...arguments),
      (this.icon = 'card'),
      (this.text = ''),
      (this.description = ''),
      (this.tag = void 0),
      (this.disabled = !1));
  }
  render() {
    return l`
      <button ?disabled=${this.disabled}>
        <wui-flex alignItems="center" gap="3">
          <wui-icon-box padding="2" color="secondary" icon=${this.icon} size="lg"></wui-icon-box>
          <wui-flex flexDirection="column" gap="1">
            <wui-text variant="md-medium" color="primary">${this.text}</wui-text>
            ${
              this.description
                ? l`<wui-text variant="md-regular" color="secondary">
                  ${this.description}</wui-text
                >`
                : null
            }
          </wui-flex>
        </wui-flex>

        <wui-flex class="tag-container" alignItems="center" gap="1" justifyContent="flex-end">
          ${this.tag ? l`<wui-tag tagType="main" size="sm">${this.tag}</wui-tag>` : null}
          <wui-icon size="md" name="chevronRight" color="default"></wui-icon>
        </wui-flex>
      </button>
    `;
  }
};
Ie.styles = [I, T, xn];
Ze([c()], Ie.prototype, 'icon', void 0);
Ze([c()], Ie.prototype, 'text', void 0);
Ze([c()], Ie.prototype, 'description', void 0);
Ze([c()], Ie.prototype, 'tag', void 0);
Ze([c({ type: Boolean })], Ie.prototype, 'disabled', void 0);
Ie = Ze([p('wui-list-description')], Ie);
const $n = ne`
  :host {
    width: 100%;
  }

  wui-flex {
    width: 100%;
  }

  .contentContainer {
    max-height: 280px;
    overflow: scroll;
    scrollbar-width: none;
  }

  .contentContainer::-webkit-scrollbar {
    display: none;
  }
`;
var oi = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let lt = class extends f {
  constructor() {
    (super(),
      (this.unsubscribe = []),
      (this.tokenBalance = u.getAccountData()?.tokenBalance),
      (this.remoteFeatures = b.state.remoteFeatures),
      this.unsubscribe.push(
        u.subscribeChainProp('accountState', (e) => {
          this.tokenBalance = e?.tokenBalance;
        }),
        b.subscribeKey('remoteFeatures', (e) => {
          this.remoteFeatures = e;
        })
      ));
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((e) => e());
  }
  render() {
    return l`${this.tokenTemplate()}`;
  }
  tokenTemplate() {
    return this.tokenBalance && this.tokenBalance?.length > 0
      ? l`<wui-flex class="contentContainer" flexDirection="column" gap="2">
        ${this.tokenItemTemplate()}
      </wui-flex>`
      : l` <wui-flex flexDirection="column">
      ${this.onRampTemplate()}
      <wui-list-description
        @click=${this.onReceiveClick.bind(this)}
        text="Receive funds"
        description="Scan the QR code and receive funds"
        icon="qrCode"
        iconColor="fg-200"
        iconBackgroundColor="fg-200"
        data-testid="w3m-account-receive-button"
      ></wui-list-description
    ></wui-flex>`;
  }
  onRampTemplate() {
    return this.remoteFeatures?.onramp
      ? l`<wui-list-description
        @click=${this.onBuyClick.bind(this)}
        text="Buy Crypto"
        description="Easy with card or bank account"
        icon="card"
        iconColor="success-100"
        iconBackgroundColor="success-100"
        tag="popular"
        data-testid="w3m-account-onramp-button"
      ></wui-list-description>`
      : l``;
  }
  tokenItemTemplate() {
    return this.tokenBalance?.map(
      (e) => l`<wui-list-token
          tokenName=${e.name}
          tokenImageUrl=${e.iconUrl}
          tokenAmount=${e.quantity.numeric}
          tokenValue=${e.value}
          tokenCurrency=${e.symbol}
        ></wui-list-token>`
    );
  }
  onReceiveClick() {
    h.push('WalletReceive');
  }
  onBuyClick() {
    (C.sendEvent({
      type: 'track',
      event: 'SELECT_BUY_CRYPTO',
      properties: {
        isSmartAccount: Ae(u.state.activeChain) === le.ACCOUNT_TYPES.SMART_ACCOUNT,
      },
    }),
      h.push('OnRampProviders'));
  }
};
lt.styles = $n;
oi([d()], lt.prototype, 'tokenBalance', void 0);
oi([d()], lt.prototype, 'remoteFeatures', void 0);
lt = oi([p('w3m-account-tokens-widget')], lt);
const Cn = $`
  wui-flex {
    width: 100%;
  }

  wui-promo {
    position: absolute;
    top: -32px;
  }

  wui-profile-button {
    margin-top: calc(-1 * ${({ spacing: t }) => t[4]});
  }

  wui-promo + wui-profile-button {
    margin-top: ${({ spacing: t }) => t[4]};
  }

  wui-tabs {
    width: 100%;
  }

  .contentContainer {
    height: 280px;
  }

  .contentContainer > wui-icon-box {
    width: 40px;
    height: 40px;
    border-radius: ${({ borderRadius: t }) => t[3]};
  }

  .contentContainer > .textContent {
    width: 65%;
  }
`;
var pe = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let X = class extends f {
  constructor() {
    (super(...arguments),
      (this.unsubscribe = []),
      (this.network = u.state.activeCaipNetwork),
      (this.profileName = u.getAccountData()?.profileName),
      (this.address = u.getAccountData()?.address),
      (this.currentTab = u.getAccountData()?.currentTab),
      (this.tokenBalance = u.getAccountData()?.tokenBalance),
      (this.features = b.state.features),
      (this.namespace = u.state.activeChain),
      (this.activeConnectorIds = g.state.activeConnectorIds),
      (this.remoteFeatures = b.state.remoteFeatures));
  }
  firstUpdated() {
    (u.fetchTokenBalance(),
      this.unsubscribe.push(
        u.subscribeChainProp('accountState', (e) => {
          e?.address
            ? ((this.address = e.address),
              (this.profileName = e.profileName),
              (this.currentTab = e.currentTab),
              (this.tokenBalance = e.tokenBalance))
            : O.close();
        }),
        g.subscribeKey('activeConnectorIds', (e) => {
          this.activeConnectorIds = e;
        }),
        u.subscribeKey('activeChain', (e) => (this.namespace = e)),
        u.subscribeKey('activeCaipNetwork', (e) => (this.network = e)),
        b.subscribeKey('features', (e) => (this.features = e)),
        b.subscribeKey('remoteFeatures', (e) => (this.remoteFeatures = e))
      ),
      this.watchSwapValues());
  }
  disconnectedCallback() {
    (this.unsubscribe.forEach((e) => e()), clearInterval(this.watchTokenBalance));
  }
  render() {
    if (!this.address) throw new Error('w3m-account-features-widget: No account provided');
    if (!this.namespace) return null;
    const e = this.activeConnectorIds[this.namespace],
      i = e ? g.getConnectorById(e) : void 0,
      { icon: o, iconSize: r } = this.getAuthData();
    return l`<wui-flex
      flexDirection="column"
      .padding=${['0', '3', '4', '3']}
      alignItems="center"
      gap="4"
      data-testid="w3m-account-wallet-features-widget"
    >
      <wui-flex flexDirection="column" justifyContent="center" alignItems="center" gap="2">
        <wui-wallet-switch
          profileName=${this.profileName}
          address=${this.address}
          icon=${o}
          iconSize=${r}
          alt=${i?.name}
          @click=${this.onGoToProfileWalletsView.bind(this)}
          data-testid="wui-wallet-switch"
        ></wui-wallet-switch>

        ${this.tokenBalanceTemplate()}
      </wui-flex>
      ${this.orderedWalletFeatures()} ${this.tabsTemplate()} ${this.listContentTemplate()}
    </wui-flex>`;
  }
  orderedWalletFeatures() {
    const e = this.features?.walletFeaturesOrder || N.DEFAULT_FEATURES.walletFeaturesOrder;
    if (
      e.every((n) =>
        n === 'send' || n === 'receive'
          ? !this.features?.[n]
          : n === 'swaps' || n === 'onramp'
            ? !this.remoteFeatures?.[n]
            : !0
      )
    )
      return null;
    const o = e.map((n) => (n === 'receive' || n === 'onramp' ? 'fund' : n)),
      r = [...new Set(o)];
    return l`<wui-flex gap="2">
      ${r.map((n) => {
        switch (n) {
          case 'fund':
            return this.fundWalletTemplate();
          case 'swaps':
            return this.swapsTemplate();
          case 'send':
            return this.sendTemplate();
          default:
            return null;
        }
      })}
    </wui-flex>`;
  }
  fundWalletTemplate() {
    if (!this.namespace) return null;
    const e = N.ONRAMP_SUPPORTED_CHAIN_NAMESPACES.includes(this.namespace),
      i = N.PAY_WITH_EXCHANGE_SUPPORTED_CHAIN_NAMESPACES.includes(this.namespace),
      o = this.features?.receive,
      r = this.remoteFeatures?.onramp && e,
      n = this.remoteFeatures?.payWithExchange && i;
    return !r && !o && !n
      ? null
      : l`
      <w3m-tooltip-trigger text="Fund wallet">
        <wui-button
          data-testid="wallet-features-fund-wallet-button"
          @click=${this.onFundWalletClick.bind(this)}
          variant="accent-secondary"
          size="lg"
          fullWidth
        >
          <wui-icon name="dollar"></wui-icon>
        </wui-button>
      </w3m-tooltip-trigger>
    `;
  }
  swapsTemplate() {
    const e = this.remoteFeatures?.swaps,
      i = u.state.activeChain === k.CHAIN.EVM;
    return !e || !i
      ? null
      : l`
      <w3m-tooltip-trigger text="Swap">
        <wui-button
          fullWidth
          data-testid="wallet-features-swaps-button"
          @click=${this.onSwapClick.bind(this)}
          variant="accent-secondary"
          size="lg"
        >
          <wui-icon name="recycleHorizontal"></wui-icon>
        </wui-button>
      </w3m-tooltip-trigger>
    `;
  }
  sendTemplate() {
    const e = this.features?.send,
      i = u.state.activeChain,
      o = N.SEND_SUPPORTED_NAMESPACES.includes(i);
    return !e || !o
      ? null
      : l`
      <w3m-tooltip-trigger text="Send">
        <wui-button
          fullWidth
          data-testid="wallet-features-send-button"
          @click=${this.onSendClick.bind(this)}
          variant="accent-secondary"
          size="lg"
        >
          <wui-icon name="send"></wui-icon>
        </wui-button>
      </w3m-tooltip-trigger>
    `;
  }
  watchSwapValues() {
    this.watchTokenBalance = setInterval(() => u.fetchTokenBalance((e) => this.onTokenBalanceError(e)), 1e4);
  }
  onTokenBalanceError(e) {
    e instanceof Error &&
      e.cause instanceof Response &&
      e.cause.status === k.HTTP_STATUS_CODES.SERVICE_UNAVAILABLE &&
      clearInterval(this.watchTokenBalance);
  }
  listContentTemplate() {
    return this.currentTab === 0
      ? l`<w3m-account-tokens-widget></w3m-account-tokens-widget>`
      : this.currentTab === 1
        ? l`<w3m-account-activity-widget></w3m-account-activity-widget>`
        : l`<w3m-account-tokens-widget></w3m-account-tokens-widget>`;
  }
  tokenBalanceTemplate() {
    if (this.tokenBalance && this.tokenBalance?.length >= 0) {
      const e = m.calculateBalance(this.tokenBalance),
        { dollars: i = '0', pennies: o = '00' } = m.formatTokenBalance(e);
      return l`<wui-balance dollars=${i} pennies=${o}></wui-balance>`;
    }
    return l`<wui-balance dollars="0" pennies="00"></wui-balance>`;
  }
  tabsTemplate() {
    const e = ei.getTabsByNamespace(u.state.activeChain);
    return e.length === 0
      ? null
      : l`<wui-tabs
      .onTabChange=${this.onTabChange.bind(this)}
      .activeTab=${this.currentTab}
      .tabs=${e}
    ></wui-tabs>`;
  }
  onTabChange(e) {
    u.setAccountProp('currentTab', e, this.namespace);
  }
  onFundWalletClick() {
    h.push('FundWallet');
  }
  onSwapClick() {
    this.network?.caipNetworkId && !N.SWAP_SUPPORTED_NETWORKS.includes(this.network?.caipNetworkId)
      ? h.push('UnsupportedChain', {
          swapUnsupportedChain: !0,
        })
      : (C.sendEvent({
          type: 'track',
          event: 'OPEN_SWAP',
          properties: {
            network: this.network?.caipNetworkId || '',
            isSmartAccount: Ae(u.state.activeChain) === le.ACCOUNT_TYPES.SMART_ACCOUNT,
          },
        }),
        h.push('Swap'));
  }
  getAuthData() {
    const e = Ee.getConnectedSocialProvider(),
      i = Ee.getConnectedSocialUsername(),
      r = g.getAuthConnector()?.provider.getEmail() ?? '';
    return {
      name: ve.getAuthName({
        email: r,
        socialUsername: i,
        socialProvider: e,
      }),
      icon: e ?? 'mail',
      iconSize: e ? 'xl' : 'md',
    };
  }
  onGoToProfileWalletsView() {
    h.push('ProfileWallets');
  }
  onSendClick() {
    (C.sendEvent({
      type: 'track',
      event: 'OPEN_SEND',
      properties: {
        network: this.network?.caipNetworkId || '',
        isSmartAccount: Ae(u.state.activeChain) === le.ACCOUNT_TYPES.SMART_ACCOUNT,
      },
    }),
      h.push('WalletSend'));
  }
};
X.styles = Cn;
pe([d()], X.prototype, 'watchTokenBalance', void 0);
pe([d()], X.prototype, 'network', void 0);
pe([d()], X.prototype, 'profileName', void 0);
pe([d()], X.prototype, 'address', void 0);
pe([d()], X.prototype, 'currentTab', void 0);
pe([d()], X.prototype, 'tokenBalance', void 0);
pe([d()], X.prototype, 'features', void 0);
pe([d()], X.prototype, 'namespace', void 0);
pe([d()], X.prototype, 'activeConnectorIds', void 0);
pe([d()], X.prototype, 'remoteFeatures', void 0);
X = pe([p('w3m-account-wallet-features-widget')], X);
var Oi = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let Ht = class extends f {
  constructor() {
    (super(),
      (this.unsubscribe = []),
      (this.namespace = u.state.activeChain),
      this.unsubscribe.push(
        u.subscribeKey('activeChain', (e) => {
          this.namespace = e;
        })
      ));
  }
  render() {
    if (!this.namespace) return null;
    const e = g.getConnectorId(this.namespace),
      i = g.getAuthConnector();
    return l`
      ${i && e === k.CONNECTOR_ID.AUTH ? this.walletFeaturesTemplate() : this.defaultTemplate()}
    `;
  }
  walletFeaturesTemplate() {
    return l`<w3m-account-wallet-features-widget></w3m-account-wallet-features-widget>`;
  }
  defaultTemplate() {
    return l`<w3m-account-default-widget></w3m-account-default-widget>`;
  }
};
Oi([d()], Ht.prototype, 'namespace', void 0);
Ht = Oi([p('w3m-account-view')], Ht);
const Sn = $`
  wui-image {
    width: 24px;
    height: 24px;
    border-radius: ${({ borderRadius: t }) => t[2]};
  }

  wui-image,
  .icon-box {
    width: 32px;
    height: 32px;
    border-radius: ${({ borderRadius: t }) => t[2]};
  }

  wui-icon:not(.custom-icon, .icon-badge) {
    cursor: pointer;
  }

  .icon-box {
    position: relative;
    border-radius: ${({ borderRadius: t }) => t[2]};
    background-color: ${({ tokens: t }) => t.theme.foregroundSecondary};
  }

  .icon-badge {
    position: absolute;
    top: 18px;
    left: 23px;
    z-index: 3;
    background-color: ${({ tokens: t }) => t.theme.foregroundPrimary};
    border: 2px solid ${({ tokens: t }) => t.theme.backgroundPrimary};
    border-radius: 50%;
    padding: ${({ spacing: t }) => t['01']};
  }

  .icon-badge {
    width: 8px;
    height: 8px;
  }
`;
var K = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let P = class extends f {
  constructor() {
    (super(...arguments),
      (this.address = ''),
      (this.profileName = ''),
      (this.content = []),
      (this.alt = ''),
      (this.imageSrc = ''),
      (this.icon = void 0),
      (this.iconSize = 'md'),
      (this.iconBadge = void 0),
      (this.iconBadgeSize = 'md'),
      (this.buttonVariant = 'neutral-primary'),
      (this.enableMoreButton = !1),
      (this.charsStart = 4),
      (this.charsEnd = 6));
  }
  render() {
    return l`
      <wui-flex flexDirection="column" rowgap="2">
        ${this.topTemplate()} ${this.bottomTemplate()}
      </wui-flex>
    `;
  }
  topTemplate() {
    return l`
      <wui-flex alignItems="flex-start" justifyContent="space-between">
        ${this.imageOrIconTemplate()}
        <wui-icon-link
          variant="secondary"
          size="md"
          icon="copy"
          @click=${this.dispatchCopyEvent}
        ></wui-icon-link>
        <wui-icon-link
          variant="secondary"
          size="md"
          icon="externalLink"
          @click=${this.dispatchExternalLinkEvent}
        ></wui-icon-link>
        ${
          this.enableMoreButton
            ? l`<wui-icon-link
              variant="secondary"
              size="md"
              icon="threeDots"
              @click=${this.dispatchMoreButtonEvent}
              data-testid="wui-active-profile-wallet-item-more-button"
            ></wui-icon-link>`
            : null
        }
      </wui-flex>
    `;
  }
  bottomTemplate() {
    return l` <wui-flex flexDirection="column">${this.contentTemplate()}</wui-flex> `;
  }
  imageOrIconTemplate() {
    return this.icon
      ? l`
        <wui-flex flexGrow="1" alignItems="center">
          <wui-flex alignItems="center" justifyContent="center" class="icon-box">
            <wui-icon size="lg" color="default" name=${this.icon} class="custom-icon"></wui-icon>

            ${
              this.iconBadge
                ? l`<wui-icon
                  color="accent-primary"
                  size="inherit"
                  name=${this.iconBadge}
                  class="icon-badge"
                ></wui-icon>`
                : null
            }
          </wui-flex>
        </wui-flex>
      `
      : l`
      <wui-flex flexGrow="1" alignItems="center">
        <wui-image objectFit="contain" src=${this.imageSrc} alt=${this.alt}></wui-image>
      </wui-flex>
    `;
  }
  contentTemplate() {
    return this.content.length === 0
      ? null
      : l`
      <wui-flex flexDirection="column" rowgap="3">
        ${this.content.map((e) => this.labelAndTagTemplate(e))}
      </wui-flex>
    `;
  }
  labelAndTagTemplate({
    address: e,
    profileName: i,
    label: o,
    description: r,
    enableButton: n,
    buttonType: s,
    buttonLabel: a,
    buttonVariant: x,
    tagVariant: v,
    tagLabel: _,
    alignItems: F = 'flex-end',
  }) {
    return l`
      <wui-flex justifyContent="space-between" alignItems=${F} columngap="1">
        <wui-flex flexDirection="column" rowgap="01">
          ${o ? l`<wui-text variant="sm-medium" color="secondary">${o}</wui-text>` : null}

          <wui-flex alignItems="center" columngap="1">
            <wui-text variant="md-regular" color="primary">
              ${j.getTruncateString({
                string: i || e,
                charsStart: i ? 16 : this.charsStart,
                charsEnd: i ? 0 : this.charsEnd,
                truncate: i ? 'end' : 'middle',
              })}
            </wui-text>

            ${v && _ ? l`<wui-tag variant=${v} size="sm">${_}</wui-tag>` : null}
          </wui-flex>

          ${r ? l`<wui-text variant="sm-regular" color="secondary">${r}</wui-text>` : null}
        </wui-flex>

        ${n ? this.buttonTemplate({ buttonType: s, buttonLabel: a, buttonVariant: x }) : null}
      </wui-flex>
    `;
  }
  buttonTemplate({ buttonType: e, buttonLabel: i, buttonVariant: o }) {
    return l`
      <wui-button
        size="sm"
        variant=${o}
        @click=${e === 'disconnect' ? this.dispatchDisconnectEvent.bind(this) : this.dispatchSwitchEvent.bind(this)}
        data-testid=${e === 'disconnect' ? 'wui-active-profile-wallet-item-disconnect-button' : 'wui-active-profile-wallet-item-switch-button'}
      >
        ${i}
      </wui-button>
    `;
  }
  dispatchDisconnectEvent() {
    this.dispatchEvent(new CustomEvent('disconnect', { bubbles: !0, composed: !0 }));
  }
  dispatchSwitchEvent() {
    this.dispatchEvent(new CustomEvent('switch', { bubbles: !0, composed: !0 }));
  }
  dispatchExternalLinkEvent() {
    this.dispatchEvent(new CustomEvent('externalLink', { bubbles: !0, composed: !0 }));
  }
  dispatchMoreButtonEvent() {
    this.dispatchEvent(new CustomEvent('more', { bubbles: !0, composed: !0 }));
  }
  dispatchCopyEvent() {
    this.dispatchEvent(new CustomEvent('copy', { bubbles: !0, composed: !0 }));
  }
};
P.styles = [I, T, Sn];
K([c()], P.prototype, 'address', void 0);
K([c()], P.prototype, 'profileName', void 0);
K([c({ type: Array })], P.prototype, 'content', void 0);
K([c()], P.prototype, 'alt', void 0);
K([c()], P.prototype, 'imageSrc', void 0);
K([c()], P.prototype, 'icon', void 0);
K([c()], P.prototype, 'iconSize', void 0);
K([c()], P.prototype, 'iconBadge', void 0);
K([c()], P.prototype, 'iconBadgeSize', void 0);
K([c()], P.prototype, 'buttonVariant', void 0);
K([c({ type: Boolean })], P.prototype, 'enableMoreButton', void 0);
K([c({ type: Number })], P.prototype, 'charsStart', void 0);
K([c({ type: Number })], P.prototype, 'charsEnd', void 0);
P = K([p('wui-active-profile-wallet-item')], P);
const kn = $`
  wui-image,
  .icon-box {
    width: 32px;
    height: 32px;
    border-radius: ${({ borderRadius: t }) => t[2]};
  }

  .right-icon {
    cursor: pointer;
  }

  .icon-box {
    position: relative;
    background-color: ${({ tokens: t }) => t.theme.foregroundPrimary};
  }

  .icon-badge {
    position: absolute;
    top: 18px;
    left: 23px;
    z-index: 3;
    background-color: ${({ tokens: t }) => t.theme.foregroundPrimary};
    border: 2px solid ${({ tokens: t }) => t.theme.backgroundPrimary};
    border-radius: 50%;
    padding: ${({ spacing: t }) => t['01']};
  }

  .icon-badge {
    width: 8px;
    height: 8px;
  }
`;
var D = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let W = class extends f {
  constructor() {
    (super(...arguments),
      (this.address = ''),
      (this.profileName = ''),
      (this.alt = ''),
      (this.buttonLabel = ''),
      (this.buttonVariant = 'accent-primary'),
      (this.imageSrc = ''),
      (this.icon = void 0),
      (this.iconSize = 'md'),
      (this.iconBadgeSize = 'md'),
      (this.rightIcon = 'signOut'),
      (this.rightIconSize = 'md'),
      (this.loading = !1),
      (this.charsStart = 4),
      (this.charsEnd = 6));
  }
  render() {
    return l`
      <wui-flex alignItems="center" columngap="2">
        ${this.imageOrIconTemplate()} ${this.labelAndDescriptionTemplate()}
        ${this.buttonActionTemplate()}
      </wui-flex>
    `;
  }
  imageOrIconTemplate() {
    return this.icon
      ? l`
        <wui-flex alignItems="center" justifyContent="center" class="icon-box">
          <wui-flex alignItems="center" justifyContent="center" class="icon-box">
            <wui-icon size="lg" color="default" name=${this.icon} class="custom-icon"></wui-icon>

            ${
              this.iconBadge
                ? l`<wui-icon
                  color="default"
                  size="inherit"
                  name=${this.iconBadge}
                  class="icon-badge"
                ></wui-icon>`
                : null
            }
          </wui-flex>
        </wui-flex>
      `
      : l`<wui-image objectFit="contain" src=${this.imageSrc} alt=${this.alt}></wui-image>`;
  }
  labelAndDescriptionTemplate() {
    return l`
      <wui-flex
        flexDirection="column"
        flexGrow="1"
        justifyContent="flex-start"
        alignItems="flex-start"
      >
        <wui-text variant="lg-regular" color="primary">
          ${j.getTruncateString({
            string: this.profileName || this.address,
            charsStart: this.profileName ? 16 : this.charsStart,
            charsEnd: this.profileName ? 0 : this.charsEnd,
            truncate: this.profileName ? 'end' : 'middle',
          })}
        </wui-text>
      </wui-flex>
    `;
  }
  buttonActionTemplate() {
    return l`
      <wui-flex columngap="1" alignItems="center" justifyContent="center">
        <wui-button
          size="sm"
          variant=${this.buttonVariant}
          .loading=${this.loading}
          @click=${this.handleButtonClick}
          data-testid="wui-inactive-profile-wallet-item-button"
        >
          ${this.buttonLabel}
        </wui-button>

        <wui-icon-link
          variant="secondary"
          size="md"
          icon=${w(this.rightIcon)}
          class="right-icon"
          @click=${this.handleIconClick}
        ></wui-icon-link>
      </wui-flex>
    `;
  }
  handleButtonClick() {
    this.dispatchEvent(new CustomEvent('buttonClick', { bubbles: !0, composed: !0 }));
  }
  handleIconClick() {
    this.dispatchEvent(new CustomEvent('iconClick', { bubbles: !0, composed: !0 }));
  }
};
W.styles = [I, T, kn];
D([c()], W.prototype, 'address', void 0);
D([c()], W.prototype, 'profileName', void 0);
D([c()], W.prototype, 'alt', void 0);
D([c()], W.prototype, 'buttonLabel', void 0);
D([c()], W.prototype, 'buttonVariant', void 0);
D([c()], W.prototype, 'imageSrc', void 0);
D([c()], W.prototype, 'icon', void 0);
D([c()], W.prototype, 'iconSize', void 0);
D([c()], W.prototype, 'iconBadge', void 0);
D([c()], W.prototype, 'iconBadgeSize', void 0);
D([c()], W.prototype, 'rightIcon', void 0);
D([c()], W.prototype, 'rightIconSize', void 0);
D([c({ type: Boolean })], W.prototype, 'loading', void 0);
D([c({ type: Number })], W.prototype, 'charsStart', void 0);
D([c({ type: Number })], W.prototype, 'charsEnd', void 0);
W = D([p('wui-inactive-profile-wallet-item')], W);
const zt = {
    getAuthData(t) {
      const e = t.connectorId === k.CONNECTOR_ID.AUTH;
      if (!e) return { isAuth: !1, icon: void 0, iconSize: void 0, name: void 0 };
      const i = t?.auth?.name ?? Ee.getConnectedSocialProvider(),
        o = t?.auth?.username ?? Ee.getConnectedSocialUsername(),
        n = g.getAuthConnector()?.provider.getEmail() ?? '';
      return {
        isAuth: !0,
        icon: i ?? 'mail',
        iconSize: i ? 'xl' : 'md',
        name: e ? ve.getAuthName({ email: n, socialUsername: o, socialProvider: i }) : void 0,
      };
    },
  },
  En = $`
  :host {
    --connect-scroll--top-opacity: 0;
    --connect-scroll--bottom-opacity: 0;
  }

  .balance-amount {
    flex: 1;
  }

  .wallet-list {
    scrollbar-width: none;
    overflow-y: scroll;
    overflow-x: hidden;
    transition: opacity ${({ easings: t }) => t['ease-out-power-1']}
      ${({ durations: t }) => t.md};
    will-change: opacity;
    mask-image: linear-gradient(
      to bottom,
      rgba(0, 0, 0, calc(1 - var(--connect-scroll--top-opacity))) 0px,
      rgba(200, 200, 200, calc(1 - var(--connect-scroll--top-opacity))) 1px,
      black 40px,
      black calc(100% - 40px),
      rgba(155, 155, 155, calc(1 - var(--connect-scroll--bottom-opacity))) calc(100% - 1px),
      rgba(0, 0, 0, calc(1 - var(--connect-scroll--bottom-opacity))) 100%
    );
  }

  .active-wallets {
    background-color: ${({ tokens: t }) => t.theme.foregroundPrimary};
    border-radius: ${({ borderRadius: t }) => t[4]};
  }

  .active-wallets-box {
    height: 330px;
  }

  .empty-wallet-list-box {
    height: 400px;
  }

  .empty-box {
    width: 100%;
    padding: ${({ spacing: t }) => t[4]};
    background-color: ${({ tokens: t }) => t.theme.foregroundPrimary};
    border-radius: ${({ borderRadius: t }) => t[4]};
  }

  wui-separator {
    margin: ${({ spacing: t }) => t[2]} 0 ${({ spacing: t }) => t[2]} 0;
  }

  .active-connection {
    padding: ${({ spacing: t }) => t[2]};
  }

  .recent-connection {
    padding: ${({ spacing: t }) => t[2]} 0 ${({ spacing: t }) => t[2]} 0;
  }

  @media (max-width: 430px) {
    .active-wallets-box,
    .empty-wallet-list-box {
      height: auto;
      max-height: clamp(360px, 470px, 80vh);
    }
  }
`;
var Q = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
const Z = {
    ADDRESS_DISPLAY: { START: 4, END: 6 },
    BADGE: { SIZE: 'md', ICON: 'lightbulb' },
    SCROLL_THRESHOLD: 50,
    OPACITY_RANGE: [0, 1],
  },
  rt = {
    eip155: 'ethereum',
    solana: 'solana',
    bip122: 'bitcoin',
  },
  An = [
    { namespace: 'eip155', icon: rt.eip155, label: 'EVM' },
    { namespace: 'solana', icon: rt.solana, label: 'Solana' },
    { namespace: 'bip122', icon: rt.bip122, label: 'Bitcoin' },
  ],
  In = {
    eip155: { title: 'Add EVM Wallet', description: 'Add your first EVM wallet' },
    solana: { title: 'Add Solana Wallet', description: 'Add your first Solana wallet' },
    bip122: { title: 'Add Bitcoin Wallet', description: 'Add your first Bitcoin wallet' },
  };
let B = class extends f {
  constructor() {
    (super(),
      (this.unsubscribers = []),
      (this.currentTab = 0),
      (this.namespace = u.state.activeChain),
      (this.namespaces = Array.from(u.state.chains.keys())),
      (this.caipAddress = void 0),
      (this.profileName = void 0),
      (this.activeConnectorIds = g.state.activeConnectorIds),
      (this.lastSelectedAddress = ''),
      (this.lastSelectedConnectorId = ''),
      (this.isSwitching = !1),
      (this.caipNetwork = u.state.activeCaipNetwork),
      (this.user = u.getAccountData()?.user),
      (this.remoteFeatures = b.state.remoteFeatures),
      (this.currentTab = this.namespace ? this.namespaces.indexOf(this.namespace) : 0),
      (this.caipAddress = u.getAccountData(this.namespace)?.caipAddress),
      (this.profileName = u.getAccountData(this.namespace)?.profileName),
      this.unsubscribers.push(
        y.subscribeKey('connections', () => this.onConnectionsChange()),
        y.subscribeKey('recentConnections', () => this.requestUpdate()),
        g.subscribeKey('activeConnectorIds', (e) => {
          this.activeConnectorIds = e;
        }),
        u.subscribeKey('activeCaipNetwork', (e) => (this.caipNetwork = e)),
        u.subscribeChainProp('accountState', (e) => {
          this.user = e?.user;
        }),
        b.subscribeKey('remoteFeatures', (e) => (this.remoteFeatures = e))
      ),
      (this.chainListener = u.subscribeChainProp(
        'accountState',
        (e) => {
          ((this.caipAddress = e?.caipAddress), (this.profileName = e?.profileName));
        },
        this.namespace
      )));
  }
  disconnectedCallback() {
    (this.unsubscribers.forEach((e) => e()),
      this.resizeObserver?.disconnect(),
      this.removeScrollListener(),
      this.chainListener?.());
  }
  firstUpdated() {
    const e = this.shadowRoot?.querySelector('.wallet-list');
    if (!e) return;
    const i = () => this.updateScrollOpacity(e);
    (requestAnimationFrame(i),
      e.addEventListener('scroll', i),
      (this.resizeObserver = new ResizeObserver(i)),
      this.resizeObserver.observe(e),
      i());
  }
  render() {
    const e = this.namespace;
    if (!e) throw new Error('Namespace is not set');
    return l`
      <wui-flex flexDirection="column" .padding=${['0', '4', '4', '4']} gap="4">
        ${this.renderTabs()} ${this.renderHeader(e)} ${this.renderConnections(e)}
        ${this.renderAddConnectionButton(e)}
      </wui-flex>
    `;
  }
  renderTabs() {
    const e = An.filter((o) => this.namespaces.includes(o.namespace));
    return e.length > 1
      ? l`
        <wui-tabs
          .onTabChange=${(o) => this.handleTabChange(o)}
          .activeTab=${this.currentTab}
          .tabs=${e}
        ></wui-tabs>
      `
      : null;
  }
  renderHeader(e) {
    const o = this.getActiveConnections(e).flatMap(({ accounts: r }) => r).length + (this.caipAddress ? 1 : 0);
    return l`
      <wui-flex alignItems="center" columngap="1">
        <wui-icon
          size="sm"
          name=${rt[e] ?? rt.eip155}
        ></wui-icon>
        <wui-text color="secondary" variant="lg-regular"
          >${o > 1 ? 'Wallets' : 'Wallet'}</wui-text
        >
        <wui-text
          color="primary"
          variant="lg-regular"
          class="balance-amount"
          data-testid="balance-amount"
        >
          ${o}
        </wui-text>
        <wui-link
          color="secondary"
          variant="secondary"
          @click=${() => y.disconnect({ namespace: e })}
          ?disabled=${!this.hasAnyConnections(e)}
          data-testid="disconnect-all-button"
        >
          Disconnect All
        </wui-link>
      </wui-flex>
    `;
  }
  renderConnections(e) {
    const i = this.hasAnyConnections(e);
    return l`
      <wui-flex flexDirection="column" class=${Ri({
        'wallet-list': !0,
        'active-wallets-box': i,
        'empty-wallet-list-box': !i,
      })} rowgap="3">
        ${i ? this.renderActiveConnections(e) : this.renderEmptyState(e)}
      </wui-flex>
    `;
  }
  renderActiveConnections(e) {
    const i = this.getActiveConnections(e),
      o = this.activeConnectorIds[e],
      r = this.getPlainAddress();
    return l`
      ${
        r || o || i.length > 0
          ? l`<wui-flex
            flexDirection="column"
            .padding=${['4', '0', '4', '0']}
            class="active-wallets"
          >
            ${this.renderActiveProfile(e)} ${this.renderActiveConnectionsList(e)}
          </wui-flex>`
          : null
      }
      ${this.renderRecentConnections(e)}
    `;
  }
  renderActiveProfile(e) {
    const i = this.activeConnectorIds[e];
    if (!i) return null;
    const { connections: o } = ke.getConnectionsData(e),
      r = g.getConnectorById(i),
      n = E.getConnectorImage(r),
      s = this.getPlainAddress();
    if (!s) return null;
    const a = e === k.CHAIN.BITCOIN,
      x = zt.getAuthData({ connectorId: i, accounts: [] }),
      v = this.getActiveConnections(e).flatMap((G) => G.accounts).length > 0,
      _ = o.find((G) => G.connectorId === i),
      F = _?.accounts.filter((G) => !ee.isLowerCaseMatch(G.address, s));
    return l`
      <wui-flex flexDirection="column" .padding=${['0', '4', '0', '4']}>
        <wui-active-profile-wallet-item
          address=${s}
          alt=${r?.name}
          .content=${this.getProfileContent({
            address: s,
            connections: o,
            connectorId: i,
            namespace: e,
          })}
          .charsStart=${Z.ADDRESS_DISPLAY.START}
          .charsEnd=${Z.ADDRESS_DISPLAY.END}
          .icon=${x.icon}
          .iconSize=${x.iconSize}
          .iconBadge=${this.isSmartAccount(s) ? Z.BADGE.ICON : void 0}
          .iconBadgeSize=${this.isSmartAccount(s) ? Z.BADGE.SIZE : void 0}
          imageSrc=${n}
          ?enableMoreButton=${x.isAuth}
          @copy=${() => this.handleCopyAddress(s)}
          @disconnect=${() => this.handleDisconnect(e, i)}
          @switch=${() => {
            a && _ && F?.[0] && this.handleSwitchWallet(_, F[0].address, e);
          }}
          @externalLink=${() => this.handleExternalLink(s)}
          @more=${() => this.handleMore()}
          data-testid="wui-active-profile-wallet-item"
        ></wui-active-profile-wallet-item>
        ${v ? l`<wui-separator></wui-separator>` : null}
      </wui-flex>
    `;
  }
  renderActiveConnectionsList(e) {
    const i = this.getActiveConnections(e);
    return i.length === 0
      ? null
      : l`
      <wui-flex flexDirection="column" .padding=${['0', '2', '0', '2']}>
        ${this.renderConnectionList(i, !1, e)}
      </wui-flex>
    `;
  }
  renderRecentConnections(e) {
    const { recentConnections: i } = ke.getConnectionsData(e);
    return i.flatMap((r) => r.accounts).length === 0
      ? null
      : l`
      <wui-flex flexDirection="column" .padding=${['0', '2', '0', '2']} rowGap="2">
        <wui-text color="secondary" variant="sm-medium" data-testid="recently-connected-text"
          >RECENTLY CONNECTED</wui-text
        >
        <wui-flex flexDirection="column" .padding=${['0', '2', '0', '2']}>
          ${this.renderConnectionList(i, !0, e)}
        </wui-flex>
      </wui-flex>
    `;
  }
  renderConnectionList(e, i, o) {
    return e
      .filter((r) => r.accounts.length > 0)
      .map((r, n) => {
        const s = g.getConnectorById(r.connectorId),
          a = E.getConnectorImage(s) ?? '',
          x = zt.getAuthData(r);
        return r.accounts.map((v, _) => {
          const F = n !== 0 || _ !== 0,
            G = this.isAccountLoading(r.connectorId, v.address);
          return l`
            <wui-flex flexDirection="column">
              ${F ? l`<wui-separator></wui-separator>` : null}
              <wui-inactive-profile-wallet-item
                address=${v.address}
                alt=${r.connectorId}
                buttonLabel=${i ? 'Connect' : 'Switch'}
                buttonVariant=${i ? 'neutral-secondary' : 'accent-secondary'}
                rightIcon=${i ? 'bin' : 'power'}
                rightIconSize="sm"
                class=${i ? 'recent-connection' : 'active-connection'}
                data-testid=${i ? 'recent-connection' : 'active-connection'}
                imageSrc=${a}
                .iconBadge=${this.isSmartAccount(v.address) ? Z.BADGE.ICON : void 0}
                .iconBadgeSize=${this.isSmartAccount(v.address) ? Z.BADGE.SIZE : void 0}
                .icon=${x.icon}
                .iconSize=${x.iconSize}
                .loading=${G}
                .showBalance=${!1}
                .charsStart=${Z.ADDRESS_DISPLAY.START}
                .charsEnd=${Z.ADDRESS_DISPLAY.END}
                @buttonClick=${() => this.handleSwitchWallet(r, v.address, o)}
                @iconClick=${() =>
                  this.handleWalletAction({
                    connection: r,
                    address: v.address,
                    isRecentConnection: i,
                    namespace: o,
                  })}
              ></wui-inactive-profile-wallet-item>
            </wui-flex>
          `;
        });
      });
  }
  renderAddConnectionButton(e) {
    if ((!this.isMultiWalletEnabled() && this.caipAddress) || !this.hasAnyConnections(e)) return null;
    const { title: i } = this.getChainLabelInfo(e);
    return l`
      <wui-list-item
        variant="icon"
        iconVariant="overlay"
        icon="plus"
        iconSize="sm"
        ?chevron=${!0}
        @click=${() => this.handleAddConnection(e)}
        data-testid="add-connection-button"
      >
        <wui-text variant="md-medium" color="secondary">${i}</wui-text>
      </wui-list-item>
    `;
  }
  renderEmptyState(e) {
    const { title: i, description: o } = this.getChainLabelInfo(e);
    return l`
      <wui-flex alignItems="flex-start" class="empty-template" data-testid="empty-template">
        <wui-flex
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          rowgap="3"
          class="empty-box"
        >
          <wui-icon-box size="xl" icon="wallet" color="secondary"></wui-icon-box>

          <wui-flex flexDirection="column" alignItems="center" justifyContent="center" gap="1">
            <wui-text color="primary" variant="lg-regular" data-testid="empty-state-text"
              >No wallet connected</wui-text
            >
            <wui-text color="secondary" variant="md-regular" data-testid="empty-state-description"
              >${o}</wui-text
            >
          </wui-flex>

          <wui-link
            @click=${() => this.handleAddConnection(e)}
            data-testid="empty-state-button"
            icon="plus"
          >
            ${i}
          </wui-link>
        </wui-flex>
      </wui-flex>
    `;
  }
  handleTabChange(e) {
    const i = this.namespaces[e];
    i &&
      (this.chainListener?.(),
      (this.currentTab = this.namespaces.indexOf(i)),
      (this.namespace = i),
      (this.caipAddress = u.getAccountData(i)?.caipAddress),
      (this.profileName = u.getAccountData(i)?.profileName),
      (this.chainListener = u.subscribeChainProp(
        'accountState',
        (o) => {
          this.caipAddress = o?.caipAddress;
        },
        i
      )));
  }
  async handleSwitchWallet(e, i, o) {
    try {
      ((this.isSwitching = !0),
        (this.lastSelectedConnectorId = e.connectorId),
        (this.lastSelectedAddress = i),
        await y.switchConnection({
          connection: e,
          address: i,
          namespace: o,
          closeModalOnConnect: !1,
          onChange({ hasSwitchedAccount: r, hasSwitchedWallet: n }) {
            n ? A.showSuccess('Wallet switched') : r && A.showSuccess('Account switched');
          },
        }));
    } catch {
      A.showError('Failed to switch wallet');
    } finally {
      this.isSwitching = !1;
    }
  }
  handleWalletAction(e) {
    const { connection: i, address: o, isRecentConnection: r, namespace: n } = e;
    r
      ? (Ee.deleteAddressFromConnection({
          connectorId: i.connectorId,
          address: o,
          namespace: n,
        }),
        y.syncStorageConnections(),
        A.showSuccess('Wallet deleted'))
      : this.handleDisconnect(n, i.connectorId);
  }
  async handleDisconnect(e, i) {
    try {
      (await y.disconnectConnector({ id: i, namespace: e }), A.showSuccess('Wallet disconnected'));
    } catch {
      A.showError('Failed to disconnect wallet');
    }
  }
  handleCopyAddress(e) {
    (m.copyToClopboard(e), A.showSuccess('Address copied'));
  }
  handleMore() {
    h.push('AccountSettings');
  }
  handleExternalLink(e) {
    const i = this.caipNetwork?.blockExplorers?.default.url;
    i && m.openHref(`${i}/address/${e}`, '_blank');
  }
  handleAddConnection(e) {
    (g.setFilterByNamespace(e),
      h.push('Connect', {
        addWalletForNamespace: e,
      }));
  }
  getChainLabelInfo(e) {
    return (
      In[e] ?? {
        title: 'Add Wallet',
        description: 'Add your first wallet',
      }
    );
  }
  isSmartAccount(e) {
    if (!this.namespace) return !1;
    const i = this.user?.accounts?.find((o) => o.type === 'smartAccount');
    return i && e ? ee.isLowerCaseMatch(i.address, e) : !1;
  }
  getPlainAddress() {
    return this.caipAddress ? m.getPlainAddress(this.caipAddress) : void 0;
  }
  getActiveConnections(e) {
    const i = this.activeConnectorIds[e],
      { connections: o } = ke.getConnectionsData(e),
      [r] = o.filter((x) => ee.isLowerCaseMatch(x.connectorId, i));
    if (!i) return o;
    const n = e === k.CHAIN.BITCOIN,
      { address: s } = this.caipAddress ? Gi.parseCaipAddress(this.caipAddress) : {};
    let a = [...(s ? [s] : [])];
    return (
      n && r && (a = r.accounts.map((x) => x.address) || []),
      ke.excludeConnectorAddressFromConnections({
        connectorId: i,
        addresses: a,
        connections: o,
      })
    );
  }
  hasAnyConnections(e) {
    const i = this.getActiveConnections(e),
      { recentConnections: o } = ke.getConnectionsData(e);
    return !!this.caipAddress || i.length > 0 || o.length > 0;
  }
  isAccountLoading(e, i) {
    return (
      ee.isLowerCaseMatch(this.lastSelectedConnectorId, e) &&
      ee.isLowerCaseMatch(this.lastSelectedAddress, i) &&
      this.isSwitching
    );
  }
  getProfileContent(e) {
    const { address: i, connections: o, connectorId: r, namespace: n } = e,
      [s] = o.filter((x) => ee.isLowerCaseMatch(x.connectorId, r));
    if (n === k.CHAIN.BITCOIN && s?.accounts.every((x) => typeof x.type == 'string'))
      return this.getBitcoinProfileContent(s.accounts, i);
    const a = zt.getAuthData({ connectorId: r, accounts: [] });
    return [
      {
        address: i,
        tagLabel: 'Active',
        tagVariant: 'success',
        enableButton: !0,
        profileName: this.profileName,
        buttonType: 'disconnect',
        buttonLabel: 'Disconnect',
        buttonVariant: 'neutral-secondary',
        ...(a.isAuth ? { description: this.isSmartAccount(i) ? 'Smart Account' : 'EOA Account' } : {}),
      },
    ];
  }
  getBitcoinProfileContent(e, i) {
    const o = e.length > 1,
      r = this.getPlainAddress();
    return e.map((n) => {
      const s = ee.isLowerCaseMatch(n.address, r);
      let a = 'PAYMENT';
      return (
        n.type === 'ordinal' && (a = 'ORDINALS'),
        {
          address: n.address,
          tagLabel: ee.isLowerCaseMatch(n.address, i) ? 'Active' : void 0,
          tagVariant: ee.isLowerCaseMatch(n.address, i) ? 'success' : void 0,
          enableButton: !0,
          ...(o
            ? {
                label: a,
                alignItems: 'flex-end',
                buttonType: s ? 'disconnect' : 'switch',
                buttonLabel: s ? 'Disconnect' : 'Switch',
                buttonVariant: s ? 'neutral-secondary' : 'accent-secondary',
              }
            : {
                alignItems: 'center',
                buttonType: 'disconnect',
                buttonLabel: 'Disconnect',
                buttonVariant: 'neutral-secondary',
              }),
        }
      );
    });
  }
  removeScrollListener() {
    const e = this.shadowRoot?.querySelector('.wallet-list');
    e && e.removeEventListener('scroll', () => this.handleConnectListScroll());
  }
  handleConnectListScroll() {
    const e = this.shadowRoot?.querySelector('.wallet-list');
    e && this.updateScrollOpacity(e);
  }
  isMultiWalletEnabled() {
    return !!this.remoteFeatures?.multiWallet;
  }
  updateScrollOpacity(e) {
    (e.style.setProperty(
      '--connect-scroll--top-opacity',
      yt.interpolate([0, Z.SCROLL_THRESHOLD], Z.OPACITY_RANGE, e.scrollTop).toString()
    ),
      e.style.setProperty(
        '--connect-scroll--bottom-opacity',
        yt
          .interpolate([0, Z.SCROLL_THRESHOLD], Z.OPACITY_RANGE, e.scrollHeight - e.scrollTop - e.offsetHeight)
          .toString()
      ));
  }
  onConnectionsChange() {
    if (this.isMultiWalletEnabled() && this.namespace) {
      const { connections: e } = ke.getConnectionsData(this.namespace);
      e.length === 0 && h.reset('ProfileWallets');
    }
    this.requestUpdate();
  }
};
B.styles = En;
Q([d()], B.prototype, 'currentTab', void 0);
Q([d()], B.prototype, 'namespace', void 0);
Q([d()], B.prototype, 'namespaces', void 0);
Q([d()], B.prototype, 'caipAddress', void 0);
Q([d()], B.prototype, 'profileName', void 0);
Q([d()], B.prototype, 'activeConnectorIds', void 0);
Q([d()], B.prototype, 'lastSelectedAddress', void 0);
Q([d()], B.prototype, 'lastSelectedConnectorId', void 0);
Q([d()], B.prototype, 'isSwitching', void 0);
Q([d()], B.prototype, 'caipNetwork', void 0);
Q([d()], B.prototype, 'user', void 0);
Q([d()], B.prototype, 'remoteFeatures', void 0);
B = Q([p('w3m-profile-wallets-view')], B);
const _n = $`
  :host {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  label {
    position: relative;
    display: inline-block;
    user-select: none;
    transition:
      background-color ${({ durations: t }) => t.lg}
        ${({ easings: t }) => t['ease-out-power-2']},
      color ${({ durations: t }) => t.lg} ${({ easings: t }) => t['ease-out-power-2']},
      border ${({ durations: t }) => t.lg} ${({ easings: t }) => t['ease-out-power-2']},
      box-shadow ${({ durations: t }) => t.lg}
        ${({ easings: t }) => t['ease-out-power-2']},
      width ${({ durations: t }) => t.lg} ${({ easings: t }) => t['ease-out-power-2']},
      height ${({ durations: t }) => t.lg} ${({ easings: t }) => t['ease-out-power-2']},
      transform ${({ durations: t }) => t.lg}
        ${({ easings: t }) => t['ease-out-power-2']},
      opacity ${({ durations: t }) => t.lg} ${({ easings: t }) => t['ease-out-power-2']};
    will-change: background-color, color, border, box-shadow, width, height, transform, opacity;
  }

  input {
    width: 0;
    height: 0;
    opacity: 0;
  }

  span {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: ${({ colors: t }) => t.neutrals300};
    border-radius: ${({ borderRadius: t }) => t.round};
    border: 1px solid transparent;
    will-change: border;
    transition:
      background-color ${({ durations: t }) => t.lg}
        ${({ easings: t }) => t['ease-out-power-2']},
      color ${({ durations: t }) => t.lg} ${({ easings: t }) => t['ease-out-power-2']},
      border ${({ durations: t }) => t.lg} ${({ easings: t }) => t['ease-out-power-2']},
      box-shadow ${({ durations: t }) => t.lg}
        ${({ easings: t }) => t['ease-out-power-2']},
      width ${({ durations: t }) => t.lg} ${({ easings: t }) => t['ease-out-power-2']},
      height ${({ durations: t }) => t.lg} ${({ easings: t }) => t['ease-out-power-2']},
      transform ${({ durations: t }) => t.lg}
        ${({ easings: t }) => t['ease-out-power-2']},
      opacity ${({ durations: t }) => t.lg} ${({ easings: t }) => t['ease-out-power-2']};
    will-change: background-color, color, border, box-shadow, width, height, transform, opacity;
  }

  span:before {
    content: '';
    position: absolute;
    background-color: ${({ colors: t }) => t.white};
    border-radius: 50%;
  }

  /* -- Sizes --------------------------------------------------------- */
  label[data-size='lg'] {
    width: 48px;
    height: 32px;
  }

  label[data-size='md'] {
    width: 40px;
    height: 28px;
  }

  label[data-size='sm'] {
    width: 32px;
    height: 22px;
  }

  label[data-size='lg'] > span:before {
    height: 24px;
    width: 24px;
    left: 4px;
    top: 3px;
  }

  label[data-size='md'] > span:before {
    height: 20px;
    width: 20px;
    left: 4px;
    top: 3px;
  }

  label[data-size='sm'] > span:before {
    height: 16px;
    width: 16px;
    left: 3px;
    top: 2px;
  }

  /* -- Focus states --------------------------------------------------- */
  input:focus-visible:not(:checked) + span,
  input:focus:not(:checked) + span {
    border: 1px solid ${({ tokens: t }) => t.core.iconAccentPrimary};
    background-color: ${({ tokens: t }) => t.theme.textTertiary};
    box-shadow: 0px 0px 0px 4px rgba(9, 136, 240, 0.2);
  }

  input:focus-visible:checked + span,
  input:focus:checked + span {
    border: 1px solid ${({ tokens: t }) => t.core.iconAccentPrimary};
    box-shadow: 0px 0px 0px 4px rgba(9, 136, 240, 0.2);
  }

  /* -- Checked states --------------------------------------------------- */
  input:checked + span {
    background-color: ${({ tokens: t }) => t.core.iconAccentPrimary};
  }

  label[data-size='lg'] > input:checked + span:before {
    transform: translateX(calc(100% - 9px));
  }

  label[data-size='md'] > input:checked + span:before {
    transform: translateX(calc(100% - 9px));
  }

  label[data-size='sm'] > input:checked + span:before {
    transform: translateX(calc(100% - 7px));
  }

  /* -- Hover states ------------------------------------------------------- */
  label:hover > input:not(:checked):not(:disabled) + span {
    background-color: ${({ colors: t }) => t.neutrals400};
  }

  label:hover > input:checked:not(:disabled) + span {
    background-color: ${({ colors: t }) => t.accent080};
  }

  /* -- Disabled state --------------------------------------------------- */
  label:has(input:disabled) {
    pointer-events: none;
    user-select: none;
  }

  input:not(:checked):disabled + span {
    background-color: ${({ colors: t }) => t.neutrals700};
  }

  input:checked:disabled + span {
    background-color: ${({ colors: t }) => t.neutrals700};
  }

  input:not(:checked):disabled + span::before {
    background-color: ${({ colors: t }) => t.neutrals400};
  }

  input:checked:disabled + span::before {
    background-color: ${({ tokens: t }) => t.theme.textTertiary};
  }
`;
var Pt = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let Ge = class extends f {
  constructor() {
    (super(...arguments), (this.inputElementRef = ti()), (this.checked = !1), (this.disabled = !1), (this.size = 'md'));
  }
  render() {
    return l`
      <label data-size=${this.size}>
        <input
          ${ii(this.inputElementRef)}
          type="checkbox"
          ?checked=${this.checked}
          ?disabled=${this.disabled}
          @change=${this.dispatchChangeEvent.bind(this)}
        />
        <span></span>
      </label>
    `;
  }
  dispatchChangeEvent() {
    this.dispatchEvent(
      new CustomEvent('switchChange', {
        detail: this.inputElementRef.value?.checked,
        bubbles: !0,
        composed: !0,
      })
    );
  }
};
Ge.styles = [I, T, _n];
Pt([c({ type: Boolean })], Ge.prototype, 'checked', void 0);
Pt([c({ type: Boolean })], Ge.prototype, 'disabled', void 0);
Pt([c()], Ge.prototype, 'size', void 0);
Ge = Pt([p('wui-toggle')], Ge);
const Tn = $`
  :host {
    height: auto;
  }

  :host > wui-flex {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    column-gap: ${({ spacing: t }) => t[2]};
    padding: ${({ spacing: t }) => t[2]} ${({ spacing: t }) => t[3]};
    background-color: ${({ tokens: t }) => t.theme.foregroundPrimary};
    border-radius: ${({ borderRadius: t }) => t[4]};
    box-shadow: inset 0 0 0 1px ${({ tokens: t }) => t.theme.foregroundPrimary};
    transition: background-color ${({ durations: t }) => t.lg}
      ${({ easings: t }) => t['ease-out-power-2']};
    will-change: background-color;
    cursor: pointer;
  }

  wui-switch {
    pointer-events: none;
  }
`;
var Pi = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let xt = class extends f {
  constructor() {
    (super(...arguments), (this.checked = !1));
  }
  render() {
    return l`
      <wui-flex>
        <wui-icon size="xl" name="walletConnectBrown"></wui-icon>
        <wui-toggle
          ?checked=${this.checked}
          size="sm"
          @switchChange=${this.handleToggleChange.bind(this)}
        ></wui-toggle>
      </wui-flex>
    `;
  }
  handleToggleChange(e) {
    (e.stopPropagation(), (this.checked = e.detail), this.dispatchSwitchEvent());
  }
  dispatchSwitchEvent() {
    this.dispatchEvent(
      new CustomEvent('certifiedSwitchChange', {
        detail: this.checked,
        bubbles: !0,
        composed: !0,
      })
    );
  }
};
xt.styles = [I, T, Tn];
Pi([c({ type: Boolean })], xt.prototype, 'checked', void 0);
xt = Pi([p('wui-certified-switch')], xt);
const Wn = $`
  :host {
    position: relative;
    display: inline-block;
    width: 100%;
  }

  wui-icon {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    right: ${({ spacing: t }) => t[3]};
    color: ${({ tokens: t }) => t.theme.iconDefault};
    cursor: pointer;
    padding: ${({ spacing: t }) => t[2]};
    background-color: transparent;
    border-radius: ${({ borderRadius: t }) => t[4]};
    transition: background-color ${({ durations: t }) => t.lg}
      ${({ easings: t }) => t['ease-out-power-2']};
  }

  @media (hover: hover) {
    wui-icon:hover {
      background-color: ${({ tokens: t }) => t.theme.foregroundSecondary};
    }
  }
`;
var Di = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let $t = class extends f {
  constructor() {
    (super(...arguments), (this.inputComponentRef = ti()), (this.inputValue = ''));
  }
  render() {
    return l`
      <wui-input-text
        ${ii(this.inputComponentRef)}
        placeholder="Search wallet"
        icon="search"
        type="search"
        enterKeyHint="search"
        size="sm"
        @inputChange=${this.onInputChange}
      >
        ${
          this.inputValue
            ? l`<wui-icon
              @click=${this.clearValue}
              color="inherit"
              size="sm"
              name="close"
            ></wui-icon>`
            : null
        }
      </wui-input-text>
    `;
  }
  onInputChange(e) {
    this.inputValue = e.detail || '';
  }
  clearValue() {
    const i = this.inputComponentRef.value?.inputElementRef.value;
    i && ((i.value = ''), (this.inputValue = ''), i.focus(), i.dispatchEvent(new Event('input')));
  }
};
$t.styles = [I, Wn];
Di([c()], $t.prototype, 'inputValue', void 0);
$t = Di([p('wui-search-bar')], $t);
const Rn = $`
  :host {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 104px;
    width: 104px;
    row-gap: ${({ spacing: t }) => t[2]};
    background-color: ${({ tokens: t }) => t.theme.foregroundPrimary};
    border-radius: ${({ borderRadius: t }) => t[5]};
    position: relative;
  }

  wui-shimmer[data-type='network'] {
    border: none;
    -webkit-clip-path: var(--apkt-path-network);
    clip-path: var(--apkt-path-network);
  }

  svg {
    position: absolute;
    width: 48px;
    height: 54px;
    z-index: 1;
  }

  svg > path {
    stroke: ${({ tokens: t }) => t.theme.foregroundSecondary};
    stroke-width: 1px;
  }

  @media (max-width: 350px) {
    :host {
      width: 100%;
    }
  }
`;
var Li = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let Ct = class extends f {
  constructor() {
    (super(...arguments), (this.type = 'wallet'));
  }
  render() {
    return l`
      ${this.shimmerTemplate()}
      <wui-shimmer width="80px" height="20px"></wui-shimmer>
    `;
  }
  shimmerTemplate() {
    return this.type === 'network'
      ? l` <wui-shimmer data-type=${this.type} width="48px" height="54px"></wui-shimmer>
        ${en}`
      : l`<wui-shimmer width="56px" height="56px"></wui-shimmer>`;
  }
};
Ct.styles = [I, T, Rn];
Li([c()], Ct.prototype, 'type', void 0);
Ct = Li([p('wui-card-select-loader')], Ct);
const Nn = ne`
  :host {
    display: grid;
    width: inherit;
    height: inherit;
  }
`;
var se = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let H = class extends f {
  render() {
    return (
      (this.style.cssText = `
      grid-template-rows: ${this.gridTemplateRows};
      grid-template-columns: ${this.gridTemplateColumns};
      justify-items: ${this.justifyItems};
      align-items: ${this.alignItems};
      justify-content: ${this.justifyContent};
      align-content: ${this.alignContent};
      column-gap: ${this.columnGap && `var(--apkt-spacing-${this.columnGap})`};
      row-gap: ${this.rowGap && `var(--apkt-spacing-${this.rowGap})`};
      gap: ${this.gap && `var(--apkt-spacing-${this.gap})`};
      padding-top: ${this.padding && j.getSpacingStyles(this.padding, 0)};
      padding-right: ${this.padding && j.getSpacingStyles(this.padding, 1)};
      padding-bottom: ${this.padding && j.getSpacingStyles(this.padding, 2)};
      padding-left: ${this.padding && j.getSpacingStyles(this.padding, 3)};
      margin-top: ${this.margin && j.getSpacingStyles(this.margin, 0)};
      margin-right: ${this.margin && j.getSpacingStyles(this.margin, 1)};
      margin-bottom: ${this.margin && j.getSpacingStyles(this.margin, 2)};
      margin-left: ${this.margin && j.getSpacingStyles(this.margin, 3)};
    `),
      l`<slot></slot>`
    );
  }
};
H.styles = [I, Nn];
se([c()], H.prototype, 'gridTemplateRows', void 0);
se([c()], H.prototype, 'gridTemplateColumns', void 0);
se([c()], H.prototype, 'justifyItems', void 0);
se([c()], H.prototype, 'alignItems', void 0);
se([c()], H.prototype, 'justifyContent', void 0);
se([c()], H.prototype, 'alignContent', void 0);
se([c()], H.prototype, 'columnGap', void 0);
se([c()], H.prototype, 'rowGap', void 0);
se([c()], H.prototype, 'gap', void 0);
se([c()], H.prototype, 'padding', void 0);
se([c()], H.prototype, 'margin', void 0);
H = se([p('wui-grid')], H);
const On = $`
  button {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    width: 104px;
    row-gap: ${({ spacing: t }) => t[2]};
    padding: ${({ spacing: t }) => t[3]} ${({ spacing: t }) => t[0]};
    background-color: ${({ tokens: t }) => t.theme.foregroundPrimary};
    border-radius: clamp(0px, ${({ borderRadius: t }) => t[4]}, 20px);
    transition:
      color ${({ durations: t }) => t.lg} ${({ easings: t }) => t['ease-out-power-1']},
      background-color ${({ durations: t }) => t.lg}
        ${({ easings: t }) => t['ease-out-power-1']},
      border-radius ${({ durations: t }) => t.lg}
        ${({ easings: t }) => t['ease-out-power-1']};
    will-change: background-color, color, border-radius;
    outline: none;
    border: none;
  }

  button > wui-flex > wui-text {
    color: ${({ tokens: t }) => t.theme.textPrimary};
    max-width: 86px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    justify-content: center;
  }

  button > wui-flex > wui-text.certified {
    max-width: 66px;
  }

  @media (hover: hover) and (pointer: fine) {
    button:hover:enabled {
      background-color: ${({ tokens: t }) => t.theme.foregroundSecondary};
    }
  }

  button:disabled > wui-flex > wui-text {
    color: ${({ tokens: t }) => t.core.glass010};
  }

  [data-selected='true'] {
    background-color: ${({ colors: t }) => t.accent020};
  }

  @media (hover: hover) and (pointer: fine) {
    [data-selected='true']:hover:enabled {
      background-color: ${({ colors: t }) => t.accent010};
    }
  }

  [data-selected='true']:active:enabled {
    background-color: ${({ colors: t }) => t.accent010};
  }

  @media (max-width: 350px) {
    button {
      width: 100%;
    }
  }
`;
var ye = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let ie = class extends f {
  constructor() {
    (super(),
      (this.observer = new IntersectionObserver(() => {})),
      (this.visible = !1),
      (this.imageSrc = void 0),
      (this.imageLoading = !1),
      (this.isImpressed = !1),
      (this.explorerId = ''),
      (this.walletQuery = ''),
      (this.certified = !1),
      (this.displayIndex = 0),
      (this.wallet = void 0),
      (this.observer = new IntersectionObserver(
        (e) => {
          e.forEach((i) => {
            i.isIntersecting
              ? ((this.visible = !0), this.fetchImageSrc(), this.sendImpressionEvent())
              : (this.visible = !1);
          });
        },
        { threshold: 0.01 }
      )));
  }
  firstUpdated() {
    this.observer.observe(this);
  }
  disconnectedCallback() {
    this.observer.disconnect();
  }
  render() {
    const e = this.wallet?.badge_type === 'certified';
    return l`
      <button>
        ${this.imageTemplate()}
        <wui-flex flexDirection="row" alignItems="center" justifyContent="center" gap="1">
          <wui-text
            variant="md-regular"
            color="inherit"
            class=${w(e ? 'certified' : void 0)}
            >${this.wallet?.name}</wui-text
          >
          ${e ? l`<wui-icon size="sm" name="walletConnectBrown"></wui-icon>` : null}
        </wui-flex>
      </button>
    `;
  }
  imageTemplate() {
    return (!this.visible && !this.imageSrc) || this.imageLoading
      ? this.shimmerTemplate()
      : l`
      <wui-wallet-image
        size="lg"
        imageSrc=${w(this.imageSrc)}
        name=${w(this.wallet?.name)}
        .installed=${this.wallet?.installed ?? !1}
        badgeSize="sm"
      >
      </wui-wallet-image>
    `;
  }
  shimmerTemplate() {
    return l`<wui-shimmer width="56px" height="56px"></wui-shimmer>`;
  }
  async fetchImageSrc() {
    this.wallet &&
      ((this.imageSrc = E.getWalletImage(this.wallet)),
      !this.imageSrc &&
        ((this.imageLoading = !0),
        (this.imageSrc = await E.fetchWalletImage(this.wallet.image_id)),
        (this.imageLoading = !1)));
  }
  sendImpressionEvent() {
    !this.wallet ||
      this.isImpressed ||
      ((this.isImpressed = !0),
      C.sendWalletImpressionEvent({
        name: this.wallet.name,
        walletRank: this.wallet.order,
        explorerId: this.explorerId,
        view: h.state.view,
        query: this.walletQuery,
        certified: this.certified,
        displayIndex: this.displayIndex,
      }));
  }
};
ie.styles = On;
ye([d()], ie.prototype, 'visible', void 0);
ye([d()], ie.prototype, 'imageSrc', void 0);
ye([d()], ie.prototype, 'imageLoading', void 0);
ye([d()], ie.prototype, 'isImpressed', void 0);
ye([c()], ie.prototype, 'explorerId', void 0);
ye([c()], ie.prototype, 'walletQuery', void 0);
ye([c()], ie.prototype, 'certified', void 0);
ye([c()], ie.prototype, 'displayIndex', void 0);
ye([c({ type: Object })], ie.prototype, 'wallet', void 0);
ie = ye([p('w3m-all-wallets-list-item')], ie);
const Pn = $`
  wui-grid {
    max-height: clamp(360px, 400px, 80vh);
    overflow: scroll;
    scrollbar-width: none;
    grid-auto-rows: min-content;
    grid-template-columns: repeat(auto-fill, 104px);
  }

  :host([data-mobile-fullscreen='true']) wui-grid {
    max-height: none;
  }

  @media (max-width: 350px) {
    wui-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  wui-grid[data-scroll='false'] {
    overflow: hidden;
  }

  wui-grid::-webkit-scrollbar {
    display: none;
  }

  w3m-all-wallets-list-item {
    opacity: 0;
    animation-duration: ${({ durations: t }) => t.xl};
    animation-timing-function: ${({ easings: t }) => t['ease-inout-power-2']};
    animation-name: fade-in;
    animation-fill-mode: forwards;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  wui-loading-spinner {
    padding-top: ${({ spacing: t }) => t[4]};
    padding-bottom: ${({ spacing: t }) => t[4]};
    justify-content: center;
    grid-column: 1 / span 4;
  }
`;
var Ne = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
const vi = 'local-paginator';
let fe = class extends f {
  constructor() {
    (super(),
      (this.unsubscribe = []),
      (this.paginationObserver = void 0),
      (this.loading = !S.state.wallets.length),
      (this.wallets = S.state.wallets),
      (this.recommended = S.state.recommended),
      (this.featured = S.state.featured),
      (this.filteredWallets = S.state.filteredWallets),
      (this.mobileFullScreen = b.state.enableMobileFullScreen),
      this.unsubscribe.push(
        S.subscribeKey('wallets', (e) => (this.wallets = e)),
        S.subscribeKey('recommended', (e) => (this.recommended = e)),
        S.subscribeKey('featured', (e) => (this.featured = e)),
        S.subscribeKey('filteredWallets', (e) => (this.filteredWallets = e))
      ));
  }
  firstUpdated() {
    (this.initialFetch(), this.createPaginationObserver());
  }
  disconnectedCallback() {
    (this.unsubscribe.forEach((e) => e()), this.paginationObserver?.disconnect());
  }
  render() {
    return (
      this.mobileFullScreen && this.setAttribute('data-mobile-fullscreen', 'true'),
      l`
      <wui-grid
        data-scroll=${!this.loading}
        .padding=${['0', '3', '3', '3']}
        gap="2"
        justifyContent="space-between"
      >
        ${this.loading ? this.shimmerTemplate(16) : this.walletsTemplate()}
        ${this.paginationLoaderTemplate()}
      </wui-grid>
    `
    );
  }
  async initialFetch() {
    this.loading = !0;
    const e = this.shadowRoot?.querySelector('wui-grid');
    e &&
      (await S.fetchWalletsByPage({ page: 1 }),
      await e.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 200,
        fill: 'forwards',
        easing: 'ease',
      }).finished,
      (this.loading = !1),
      e.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 200,
        fill: 'forwards',
        easing: 'ease',
      }));
  }
  shimmerTemplate(e, i) {
    return [...Array(e)].map(
      () => l`
        <wui-card-select-loader type="wallet" id=${w(i)}></wui-card-select-loader>
      `
    );
  }
  getWallets() {
    const e = [...this.featured, ...this.recommended];
    this.filteredWallets?.length > 0 ? e.push(...this.filteredWallets) : e.push(...this.wallets);
    const i = m.uniqueBy(e, 'id'),
      o = st.markWalletsAsInstalled(i);
    return st.markWalletsWithDisplayIndex(o);
  }
  walletsTemplate() {
    return this.getWallets().map(
      (i, o) => l`
        <w3m-all-wallets-list-item
          data-testid="wallet-search-item-${i.id}"
          @click=${() => this.onConnectWallet(i)}
          .wallet=${i}
          explorerId=${i.id}
          certified=${this.badge === 'certified'}
          displayIndex=${o}
        ></w3m-all-wallets-list-item>
      `
    );
  }
  paginationLoaderTemplate() {
    const { wallets: e, recommended: i, featured: o, count: r, mobileFilteredOutWalletsLength: n } = S.state,
      s = window.innerWidth < 352 ? 3 : 4,
      a = e.length + i.length;
    let v = Math.ceil(a / s) * s - a + s;
    return (
      (v -= e.length ? o.length % s : 0),
      r === 0 && o.length > 0
        ? null
        : r === 0 || [...o, ...e, ...i].length < r - (n ?? 0)
          ? this.shimmerTemplate(v, vi)
          : null
    );
  }
  createPaginationObserver() {
    const e = this.shadowRoot?.querySelector(`#${vi}`);
    e &&
      ((this.paginationObserver = new IntersectionObserver(([i]) => {
        if (i?.isIntersecting && !this.loading) {
          const { page: o, count: r, wallets: n } = S.state;
          n.length < r && S.fetchWalletsByPage({ page: o + 1 });
        }
      })),
      this.paginationObserver.observe(e));
  }
  onConnectWallet(e) {
    g.selectWalletConnector(e);
  }
};
fe.styles = Pn;
Ne([d()], fe.prototype, 'loading', void 0);
Ne([d()], fe.prototype, 'wallets', void 0);
Ne([d()], fe.prototype, 'recommended', void 0);
Ne([d()], fe.prototype, 'featured', void 0);
Ne([d()], fe.prototype, 'filteredWallets', void 0);
Ne([d()], fe.prototype, 'badge', void 0);
Ne([d()], fe.prototype, 'mobileFullScreen', void 0);
fe = Ne([p('w3m-all-wallets-list')], fe);
const Dn = ne`
  wui-grid,
  wui-loading-spinner,
  wui-flex {
    height: 360px;
  }

  wui-grid {
    overflow: scroll;
    scrollbar-width: none;
    grid-auto-rows: min-content;
    grid-template-columns: repeat(auto-fill, 104px);
  }

  :host([data-mobile-fullscreen='true']) wui-grid {
    max-height: none;
    height: auto;
  }

  wui-grid[data-scroll='false'] {
    overflow: hidden;
  }

  wui-grid::-webkit-scrollbar {
    display: none;
  }

  wui-loading-spinner {
    justify-content: center;
    align-items: center;
  }

  @media (max-width: 350px) {
    wui-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
`;
var mt = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let Ue = class extends f {
  constructor() {
    (super(...arguments),
      (this.prevQuery = ''),
      (this.prevBadge = void 0),
      (this.loading = !0),
      (this.mobileFullScreen = b.state.enableMobileFullScreen),
      (this.query = ''));
  }
  render() {
    return (
      this.mobileFullScreen && this.setAttribute('data-mobile-fullscreen', 'true'),
      this.onSearch(),
      this.loading ? l`<wui-loading-spinner color="accent-primary"></wui-loading-spinner>` : this.walletsTemplate()
    );
  }
  async onSearch() {
    (this.query.trim() !== this.prevQuery.trim() || this.badge !== this.prevBadge) &&
      ((this.prevQuery = this.query),
      (this.prevBadge = this.badge),
      (this.loading = !0),
      await S.searchWallet({ search: this.query, badge: this.badge }),
      (this.loading = !1));
  }
  walletsTemplate() {
    const { search: e } = S.state,
      i = st.markWalletsAsInstalled(e);
    return e.length
      ? l`
      <wui-grid
        data-testid="wallet-list"
        .padding=${['0', '3', '3', '3']}
        rowGap="4"
        columngap="2"
        justifyContent="space-between"
      >
        ${i.map(
          (o, r) => l`
            <w3m-all-wallets-list-item
              @click=${() => this.onConnectWallet(o)}
              .wallet=${o}
              data-testid="wallet-search-item-${o.id}"
              explorerId=${o.id}
              certified=${this.badge === 'certified'}
              walletQuery=${this.query}
              displayIndex=${r}
            ></w3m-all-wallets-list-item>
          `
        )}
      </wui-grid>
    `
      : l`
        <wui-flex
          data-testid="no-wallet-found"
          justifyContent="center"
          alignItems="center"
          gap="3"
          flexDirection="column"
        >
          <wui-icon-box size="lg" color="default" icon="wallet"></wui-icon-box>
          <wui-text data-testid="no-wallet-found-text" color="secondary" variant="md-medium">
            No Wallet found
          </wui-text>
        </wui-flex>
      `;
  }
  onConnectWallet(e) {
    g.selectWalletConnector(e);
  }
};
Ue.styles = Dn;
mt([d()], Ue.prototype, 'loading', void 0);
mt([d()], Ue.prototype, 'mobileFullScreen', void 0);
mt([c()], Ue.prototype, 'query', void 0);
mt([c()], Ue.prototype, 'badge', void 0);
Ue = mt([p('w3m-all-wallets-search')], Ue);
var ri = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let St = class extends f {
  constructor() {
    (super(...arguments),
      (this.search = ''),
      (this.badge = void 0),
      (this.onDebouncedSearch = m.debounce((e) => {
        this.search = e;
      })));
  }
  render() {
    const e = this.search.length >= 2;
    return l`
      <wui-flex .padding=${['1', '3', '3', '3']} gap="2" alignItems="center">
        <wui-search-bar @inputChange=${this.onInputChange.bind(this)}></wui-search-bar>
        <wui-certified-switch
          ?checked=${this.badge === 'certified'}
          @certifiedSwitchChange=${this.onCertifiedSwitchChange.bind(this)}
          data-testid="wui-certified-switch"
        ></wui-certified-switch>
        ${this.qrButtonTemplate()}
      </wui-flex>
      ${
        e || this.badge
          ? l`<w3m-all-wallets-search
            query=${this.search}
            .badge=${this.badge}
          ></w3m-all-wallets-search>`
          : l`<w3m-all-wallets-list .badge=${this.badge}></w3m-all-wallets-list>`
      }
    `;
  }
  onInputChange(e) {
    this.onDebouncedSearch(e.detail);
  }
  onCertifiedSwitchChange(e) {
    e.detail
      ? ((this.badge = 'certified'),
        A.showSvg('Only WalletConnect certified', {
          icon: 'walletConnectBrown',
          iconColor: 'accent-100',
        }))
      : (this.badge = void 0);
  }
  qrButtonTemplate() {
    return m.isMobile()
      ? l`
        <wui-icon-box
          size="xl"
          iconSize="xl"
          color="accent-primary"
          icon="qrCode"
          border
          borderColor="wui-accent-glass-010"
          @click=${this.onWalletConnectQr.bind(this)}
        ></wui-icon-box>
      `
      : null;
  }
  onWalletConnectQr() {
    h.push('ConnectingWalletConnect');
  }
};
ri([d()], St.prototype, 'search', void 0);
ri([d()], St.prototype, 'badge', void 0);
St = ri([p('w3m-all-wallets-view')], St);
const Ln = $`
  button {
    display: flex;
    gap: ${({ spacing: t }) => t[1]};
    padding: ${({ spacing: t }) => t[4]};
    width: 100%;
    background-color: ${({ tokens: t }) => t.theme.foregroundPrimary};
    border-radius: ${({ borderRadius: t }) => t[4]};
    justify-content: center;
    align-items: center;
  }

  :host([data-size='sm']) button {
    padding: ${({ spacing: t }) => t[2]};
    border-radius: ${({ borderRadius: t }) => t[2]};
  }

  :host([data-size='md']) button {
    padding: ${({ spacing: t }) => t[3]};
    border-radius: ${({ borderRadius: t }) => t[3]};
  }

  button:hover {
    background-color: ${({ tokens: t }) => t.theme.foregroundSecondary};
  }

  button:disabled {
    opacity: 0.5;
  }
`;
var et = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let _e = class extends f {
  constructor() {
    (super(...arguments),
      (this.text = ''),
      (this.disabled = !1),
      (this.size = 'lg'),
      (this.icon = 'copy'),
      (this.tabIdx = void 0));
  }
  render() {
    this.dataset.size = this.size;
    const e = `${this.size}-regular`;
    return l`
      <button ?disabled=${this.disabled} tabindex=${w(this.tabIdx)}>
        <wui-icon name=${this.icon} size=${this.size} color="default"></wui-icon>
        <wui-text align="center" variant=${e} color="primary">${this.text}</wui-text>
      </button>
    `;
  }
};
_e.styles = [I, T, Ln];
et([c()], _e.prototype, 'text', void 0);
et([c({ type: Boolean })], _e.prototype, 'disabled', void 0);
et([c()], _e.prototype, 'size', void 0);
et([c()], _e.prototype, 'icon', void 0);
et([c()], _e.prototype, 'tabIdx', void 0);
_e = et([p('wui-list-button')], _e);
const jn = $`
  wui-separator {
    margin: ${({ spacing: t }) => t[3]} calc(${({ spacing: t }) => t[3]} * -1);
    width: calc(100% + ${({ spacing: t }) => t[3]} * 2);
  }

  wui-email-input {
    width: 100%;
  }

  form {
    width: 100%;
    display: block;
    position: relative;
  }

  wui-icon-link,
  wui-loading-spinner {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
  }

  wui-icon-link {
    right: ${({ spacing: t }) => t[2]};
  }

  wui-loading-spinner {
    right: ${({ spacing: t }) => t[3]};
  }

  wui-text {
    margin: ${({ spacing: t }) => t[2]} ${({ spacing: t }) => t[3]}
      ${({ spacing: t }) => t[0]} ${({ spacing: t }) => t[3]};
  }
`;
var tt = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let Te = class extends f {
  constructor() {
    (super(),
      (this.unsubscribe = []),
      (this.formRef = ti()),
      (this.email = ''),
      (this.loading = !1),
      (this.error = ''),
      (this.remoteFeatures = b.state.remoteFeatures),
      this.unsubscribe.push(
        b.subscribeKey('remoteFeatures', (e) => {
          this.remoteFeatures = e;
        })
      ));
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((e) => e());
  }
  firstUpdated() {
    this.formRef.value?.addEventListener('keydown', (e) => {
      e.key === 'Enter' && this.onSubmitEmail(e);
    });
  }
  render() {
    const e = y.hasAnyConnection(k.CONNECTOR_ID.AUTH);
    return l`
      <form ${ii(this.formRef)} @submit=${this.onSubmitEmail.bind(this)}>
        <wui-email-input
          @focus=${this.onFocusEvent.bind(this)}
          .disabled=${this.loading}
          @inputChange=${this.onEmailInputChange.bind(this)}
          tabIdx=${w(this.tabIdx)}
          ?disabled=${e}
        >
        </wui-email-input>

        ${this.submitButtonTemplate()}${this.loadingTemplate()}
        <input type="submit" hidden />
      </form>
      ${this.templateError()}
    `;
  }
  submitButtonTemplate() {
    return !this.loading && this.email.length > 3
      ? l`
          <wui-icon-link
            size="sm"
            icon="chevronRight"
            iconcolor="accent-100"
            @click=${this.onSubmitEmail.bind(this)}
          >
          </wui-icon-link>
        `
      : null;
  }
  loadingTemplate() {
    return this.loading ? l`<wui-loading-spinner size="md" color="accent-primary"></wui-loading-spinner>` : null;
  }
  templateError() {
    return this.error ? l`<wui-text variant="sm-medium" color="error">${this.error}</wui-text>` : null;
  }
  onEmailInputChange(e) {
    ((this.email = e.detail.trim()), (this.error = ''));
  }
  async onSubmitEmail(e) {
    if (!ei.isValidEmail(this.email)) {
      Wi.open(
        {
          displayMessage: Yi.ALERT_WARNINGS.INVALID_EMAIL.displayMessage,
        },
        'warning'
      );
      return;
    }
    if (!k.AUTH_CONNECTOR_SUPPORTED_CHAINS.find((o) => o === u.state.activeChain)) {
      const o = u.getFirstCaipNetworkSupportsAuthConnector();
      if (o) {
        h.push('SwitchNetwork', { network: o });
        return;
      }
    }
    try {
      if (this.loading) return;
      ((this.loading = !0), e.preventDefault());
      const o = g.getAuthConnector();
      if (!o) throw new Error('w3m-email-login-widget: Auth connector not found');
      const { action: r } = await o.provider.connectEmail({ email: this.email });
      if ((C.sendEvent({ type: 'track', event: 'EMAIL_SUBMITTED' }), r === 'VERIFY_OTP'))
        (C.sendEvent({ type: 'track', event: 'EMAIL_VERIFICATION_CODE_SENT' }),
          h.push('EmailVerifyOtp', { email: this.email }));
      else if (r === 'VERIFY_DEVICE') h.push('EmailVerifyDevice', { email: this.email });
      else if (r === 'CONNECT') {
        const n = this.remoteFeatures?.multiWallet;
        (await y.connectExternal(o, u.state.activeChain),
          n ? (h.replace('ProfileWallets'), A.showSuccess('New Wallet Added')) : h.replace('Account'));
      }
    } catch (o) {
      m.parseError(o)?.includes('Invalid email') ? (this.error = 'Invalid email. Try again.') : A.showError(o);
    } finally {
      this.loading = !1;
    }
  }
  onFocusEvent() {
    C.sendEvent({ type: 'track', event: 'EMAIL_LOGIN_SELECTED' });
  }
};
Te.styles = jn;
tt([c()], Te.prototype, 'tabIdx', void 0);
tt([d()], Te.prototype, 'email', void 0);
tt([d()], Te.prototype, 'loading', void 0);
tt([d()], Te.prototype, 'error', void 0);
tt([d()], Te.prototype, 'remoteFeatures', void 0);
Te = tt([p('w3m-email-login-widget')], Te);
const Bn = $`
  :host {
    display: block;
    width: 100%;
  }

  button {
    width: 100%;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${({ tokens: t }) => t.theme.foregroundPrimary};
    border-radius: ${({ borderRadius: t }) => t[4]};
  }

  @media (hover: hover) {
    button:hover:enabled {
      background: ${({ tokens: t }) => t.theme.foregroundSecondary};
    }
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`;
var Dt = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let Ye = class extends f {
  constructor() {
    (super(...arguments), (this.logo = 'google'), (this.disabled = !1), (this.tabIdx = void 0));
  }
  render() {
    return l`
      <button ?disabled=${this.disabled} tabindex=${w(this.tabIdx)}>
        <wui-icon size="xxl" name=${this.logo}></wui-icon>
      </button>
    `;
  }
};
Ye.styles = [I, T, Bn];
Dt([c()], Ye.prototype, 'logo', void 0);
Dt([c({ type: Boolean })], Ye.prototype, 'disabled', void 0);
Dt([c()], Ye.prototype, 'tabIdx', void 0);
Ye = Dt([p('wui-logo-select')], Ye);
const Un = $`
  wui-separator {
    margin: ${({ spacing: t }) => t[3]} calc(${({ spacing: t }) => t[3]} * -1)
      ${({ spacing: t }) => t[3]} calc(${({ spacing: t }) => t[3]} * -1);
    width: calc(100% + ${({ spacing: t }) => t[3]} * 2);
  }
`;
var He = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
const xi = 2,
  $i = 6;
let xe = class extends f {
  constructor() {
    (super(),
      (this.unsubscribe = []),
      (this.walletGuide = 'get-started'),
      (this.tabIdx = void 0),
      (this.connectors = g.state.connectors),
      (this.remoteFeatures = b.state.remoteFeatures),
      (this.authConnector = this.connectors.find((e) => e.type === 'AUTH')),
      (this.isPwaLoading = !1),
      this.unsubscribe.push(
        g.subscribeKey('connectors', (e) => {
          ((this.connectors = e), (this.authConnector = this.connectors.find((i) => i.type === 'AUTH')));
        }),
        b.subscribeKey('remoteFeatures', (e) => (this.remoteFeatures = e))
      ));
  }
  connectedCallback() {
    (super.connectedCallback(), this.handlePwaFrameLoad());
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((e) => e());
  }
  render() {
    return l`
      <wui-flex
        class="container"
        flexDirection="column"
        gap="2"
        data-testid="w3m-social-login-widget"
      >
        ${this.topViewTemplate()}${this.bottomViewTemplate()}
      </wui-flex>
    `;
  }
  topViewTemplate() {
    const e = this.walletGuide === 'explore';
    let i = this.remoteFeatures?.socials;
    return !i && e ? ((i = N.DEFAULT_SOCIALS), this.renderTopViewContent(i)) : i ? this.renderTopViewContent(i) : null;
  }
  renderTopViewContent(e) {
    return e.length === 2
      ? l` <wui-flex gap="2">
        ${e.slice(0, xi).map(
          (i) => l`<wui-logo-select
              data-testid=${`social-selector-${i}`}
              @click=${() => {
                this.onSocialClick(i);
              }}
              logo=${i}
              tabIdx=${w(this.tabIdx)}
              ?disabled=${this.isPwaLoading || this.hasConnection()}
            ></wui-logo-select>`
        )}
      </wui-flex>`
      : l` <wui-list-button
      data-testid=${`social-selector-${e[0]}`}
      @click=${() => {
        this.onSocialClick(e[0]);
      }}
      size="lg"
      icon=${w(e[0])}
      text=${`Continue with ${j.capitalize(e[0])}`}
      tabIdx=${w(this.tabIdx)}
      ?disabled=${this.isPwaLoading || this.hasConnection()}
    ></wui-list-button>`;
  }
  bottomViewTemplate() {
    let e = this.remoteFeatures?.socials;
    const i = this.walletGuide === 'explore';
    return (
      (!this.authConnector || !e || e.length === 0) && i && (e = N.DEFAULT_SOCIALS),
      !e || e.length <= xi
        ? null
        : e && e.length > $i
          ? l`<wui-flex gap="2">
        ${e.slice(1, $i - 1).map(
          (r) => l`<wui-logo-select
              data-testid=${`social-selector-${r}`}
              @click=${() => {
                this.onSocialClick(r);
              }}
              logo=${r}
              tabIdx=${w(this.tabIdx)}
              ?focusable=${this.tabIdx !== void 0 && this.tabIdx >= 0}
              ?disabled=${this.isPwaLoading || this.hasConnection()}
            ></wui-logo-select>`
        )}
        <wui-logo-select
          logo="more"
          tabIdx=${w(this.tabIdx)}
          @click=${this.onMoreSocialsClick.bind(this)}
          ?disabled=${this.isPwaLoading || this.hasConnection()}
          data-testid="social-selector-more"
        ></wui-logo-select>
      </wui-flex>`
          : e
            ? l`<wui-flex gap="2">
      ${e.slice(1, e.length).map(
        (r) => l`<wui-logo-select
            data-testid=${`social-selector-${r}`}
            @click=${() => {
              this.onSocialClick(r);
            }}
            logo=${r}
            tabIdx=${w(this.tabIdx)}
            ?focusable=${this.tabIdx !== void 0 && this.tabIdx >= 0}
            ?disabled=${this.isPwaLoading || this.hasConnection()}
          ></wui-logo-select>`
      )}
    </wui-flex>`
            : null
    );
  }
  onMoreSocialsClick() {
    h.push('ConnectSocials');
  }
  async onSocialClick(e) {
    if (!k.AUTH_CONNECTOR_SUPPORTED_CHAINS.find((o) => o === u.state.activeChain)) {
      const o = u.getFirstCaipNetworkSupportsAuthConnector();
      if (o) {
        h.push('SwitchNetwork', { network: o });
        return;
      }
    }
    e && (await tn(e));
  }
  async handlePwaFrameLoad() {
    if (m.isPWA()) {
      this.isPwaLoading = !0;
      try {
        this.authConnector?.provider instanceof Xi && (await this.authConnector.provider.init());
      } catch (e) {
        Wi.open(
          {
            displayMessage: 'Error loading embedded wallet in PWA',
            debugMessage: e.message,
          },
          'error'
        );
      } finally {
        this.isPwaLoading = !1;
      }
    }
  }
  hasConnection() {
    return y.hasAnyConnection(k.CONNECTOR_ID.AUTH);
  }
};
xe.styles = Un;
He([c()], xe.prototype, 'walletGuide', void 0);
He([c()], xe.prototype, 'tabIdx', void 0);
He([d()], xe.prototype, 'connectors', void 0);
He([d()], xe.prototype, 'remoteFeatures', void 0);
He([d()], xe.prototype, 'authConnector', void 0);
He([d()], xe.prototype, 'isPwaLoading', void 0);
xe = He([p('w3m-social-login-widget')], xe);
var it = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let ze = class extends f {
  constructor() {
    (super(),
      (this.unsubscribe = []),
      (this.tabIdx = void 0),
      (this.connectors = g.state.connectors),
      (this.count = S.state.count),
      (this.filteredCount = S.state.filteredWallets.length),
      (this.isFetchingRecommendedWallets = S.state.isFetchingRecommendedWallets),
      this.unsubscribe.push(
        g.subscribeKey('connectors', (e) => (this.connectors = e)),
        S.subscribeKey('count', (e) => (this.count = e)),
        S.subscribeKey('filteredWallets', (e) => (this.filteredCount = e.length)),
        S.subscribeKey('isFetchingRecommendedWallets', (e) => (this.isFetchingRecommendedWallets = e))
      ));
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((e) => e());
  }
  render() {
    const e = this.connectors.find((v) => v.id === 'walletConnect'),
      { allWallets: i } = b.state;
    if (!e || i === 'HIDE' || (i === 'ONLY_MOBILE' && !m.isMobile())) return null;
    const o = S.state.featured.length,
      r = this.count + o,
      n = r < 10 ? r : Math.floor(r / 10) * 10,
      s = this.filteredCount > 0 ? this.filteredCount : n;
    let a = `${s}`;
    this.filteredCount > 0 ? (a = `${this.filteredCount}`) : s < r && (a = `${s}+`);
    const x = y.hasAnyConnection(k.CONNECTOR_ID.WALLET_CONNECT);
    return l`
      <wui-list-wallet
        name="Search Wallet"
        walletIcon="search"
        showAllWallets
        @click=${this.onAllWallets.bind(this)}
        tagLabel=${a}
        tagVariant="info"
        data-testid="all-wallets"
        tabIdx=${w(this.tabIdx)}
        .loading=${this.isFetchingRecommendedWallets}
        ?disabled=${x}
        size="sm"
      ></wui-list-wallet>
    `;
  }
  onAllWallets() {
    (C.sendEvent({ type: 'track', event: 'CLICK_ALL_WALLETS' }),
      h.push('AllWallets', { redirectView: h.state.data?.redirectView }));
  }
};
it([c()], ze.prototype, 'tabIdx', void 0);
it([d()], ze.prototype, 'connectors', void 0);
it([d()], ze.prototype, 'count', void 0);
it([d()], ze.prototype, 'filteredCount', void 0);
it([d()], ze.prototype, 'isFetchingRecommendedWallets', void 0);
ze = it([p('w3m-all-wallets-widget')], ze);
const zn = $`
  :host {
    margin-top: ${({ spacing: t }) => t[1]};
  }
  wui-separator {
    margin: ${({ spacing: t }) => t[3]} calc(${({ spacing: t }) => t[3]} * -1)
      ${({ spacing: t }) => t[2]} calc(${({ spacing: t }) => t[3]} * -1);
    width: calc(100% + ${({ spacing: t }) => t[3]} * 2);
  }
`;
var Se = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let de = class extends f {
  constructor() {
    (super(),
      (this.unsubscribe = []),
      (this.connectors = g.state.connectors),
      (this.recommended = S.state.recommended),
      (this.featured = S.state.featured),
      (this.explorerWallets = S.state.explorerWallets),
      (this.connections = y.state.connections),
      (this.connectorImages = Oe.state.connectorImages),
      (this.loadingTelegram = !1),
      this.unsubscribe.push(
        g.subscribeKey('connectors', (e) => (this.connectors = e)),
        y.subscribeKey('connections', (e) => (this.connections = e)),
        Oe.subscribeKey('connectorImages', (e) => (this.connectorImages = e)),
        S.subscribeKey('recommended', (e) => (this.recommended = e)),
        S.subscribeKey('featured', (e) => (this.featured = e)),
        S.subscribeKey('explorerFilteredWallets', (e) => {
          this.explorerWallets = e?.length ? e : S.state.explorerWallets;
        }),
        S.subscribeKey('explorerWallets', (e) => {
          this.explorerWallets?.length || (this.explorerWallets = e);
        })
      ),
      m.isTelegram() &&
        m.isIos() &&
        ((this.loadingTelegram = !y.state.wcUri),
        this.unsubscribe.push(y.subscribeKey('wcUri', (e) => (this.loadingTelegram = !e)))));
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((e) => e());
  }
  render() {
    return l`
      <wui-flex flexDirection="column" gap="2"> ${this.connectorListTemplate()} </wui-flex>
    `;
  }
  mapConnectorsToExplorerWallets(e, i) {
    return e.map((o) => {
      if (o.type === 'MULTI_CHAIN' && o.connectors) {
        const n = o.connectors.map((v) => v.id),
          s = o.connectors.map((v) => v.name),
          a = o.connectors.map((v) => v.info?.rdns),
          x = i?.find(
            (v) => n.includes(v.id) || s.includes(v.name) || (v.rdns && (a.includes(v.rdns) || n.includes(v.rdns)))
          );
        return ((o.explorerWallet = x ?? o.explorerWallet), o);
      }
      const r = i?.find((n) => n.id === o.id || n.rdns === o.info?.rdns || n.name === o.name);
      return ((o.explorerWallet = r ?? o.explorerWallet), o);
    });
  }
  processConnectorsByType(e, i = !0) {
    const o = ve.sortConnectorsByExplorerWallet([...e]);
    return i ? o.filter(ve.showConnector) : o;
  }
  connectorListTemplate() {
    const e = this.mapConnectorsToExplorerWallets(this.connectors, this.explorerWallets ?? []),
      i = ve.getConnectorsByType(e, this.recommended, this.featured),
      o = this.processConnectorsByType(i.announced.filter((M) => M.id !== 'walletConnect')),
      r = this.processConnectorsByType(i.injected),
      n = this.processConnectorsByType(
        i.multiChain.filter((M) => M.name !== 'WalletConnect'),
        !1
      ),
      s = i.custom,
      a = i.recent,
      x = this.processConnectorsByType(i.external.filter((M) => M.id !== k.CONNECTOR_ID.COINBASE_SDK)),
      v = i.recommended,
      _ = i.featured,
      F = ve.getConnectorTypeOrder({
        custom: s,
        recent: a,
        announced: o,
        injected: r,
        multiChain: n,
        recommended: v,
        featured: _,
        external: x,
      }),
      G = this.connectors.find((M) => M.id === 'walletConnect'),
      Ut = m.isMobile(),
      J = [];
    for (const M of F)
      switch (M) {
        case 'walletConnect': {
          !Ut && G && J.push({ kind: 'connector', subtype: 'walletConnect', connector: G });
          break;
        }
        case 'recent': {
          ve.getFilteredRecentWallets().forEach((ot) => J.push({ kind: 'wallet', subtype: 'recent', wallet: ot }));
          break;
        }
        case 'injected': {
          (n.forEach((L) => J.push({ kind: 'connector', subtype: 'multiChain', connector: L })),
            o.forEach((L) => J.push({ kind: 'connector', subtype: 'announced', connector: L })),
            r.forEach((L) => J.push({ kind: 'connector', subtype: 'injected', connector: L })));
          break;
        }
        case 'featured': {
          _.forEach((L) => J.push({ kind: 'wallet', subtype: 'featured', wallet: L }));
          break;
        }
        case 'custom': {
          ve.getFilteredCustomWallets(s ?? []).forEach((ot) =>
            J.push({ kind: 'wallet', subtype: 'custom', wallet: ot })
          );
          break;
        }
        case 'external': {
          x.forEach((L) => J.push({ kind: 'connector', subtype: 'external', connector: L }));
          break;
        }
        case 'recommended': {
          ve.getCappedRecommendedWallets(v).forEach((ot) =>
            J.push({ kind: 'wallet', subtype: 'recommended', wallet: ot })
          );
          break;
        }
        default:
          console.warn(`Unknown connector type: ${M}`);
      }
    return J.map((M, L) => (M.kind === 'connector' ? this.renderConnector(M, L) : this.renderWallet(M, L)));
  }
  renderConnector(e, i) {
    const o = e.connector,
      r = E.getConnectorImage(o) || this.connectorImages[o?.imageId ?? ''],
      s = (this.connections.get(o.chain) ?? []).some((F) => ee.isLowerCaseMatch(F.connectorId, o.id));
    let a, x;
    e.subtype === 'multiChain'
      ? ((a = 'multichain'), (x = 'info'))
      : e.subtype === 'walletConnect'
        ? ((a = 'qr code'), (x = 'accent'))
        : e.subtype === 'injected' || e.subtype === 'announced'
          ? ((a = s ? 'connected' : 'installed'), (x = s ? 'info' : 'success'))
          : ((a = void 0), (x = void 0));
    const v = y.hasAnyConnection(k.CONNECTOR_ID.WALLET_CONNECT),
      _ = e.subtype === 'walletConnect' || e.subtype === 'external' ? v : !1;
    return l`
      <w3m-list-wallet
        displayIndex=${i}
        imageSrc=${w(r)}
        .installed=${!0}
        name=${o.name ?? 'Unknown'}
        .tagVariant=${x}
        tagLabel=${w(a)}
        data-testid=${`wallet-selector-${o.id.toLowerCase()}`}
        size="sm"
        @click=${() => this.onClickConnector(e)}
        tabIdx=${w(this.tabIdx)}
        ?disabled=${_}
        rdnsId=${w(o.explorerWallet?.rdns || void 0)}
        walletRank=${w(o.explorerWallet?.order)}
      >
      </w3m-list-wallet>
    `;
  }
  onClickConnector(e) {
    const i = h.state.data?.redirectView;
    if (e.subtype === 'walletConnect') {
      (g.setActiveConnector(e.connector),
        m.isMobile() ? h.push('AllWallets') : h.push('ConnectingWalletConnect', { redirectView: i }));
      return;
    }
    if (e.subtype === 'multiChain') {
      (g.setActiveConnector(e.connector), h.push('ConnectingMultiChain', { redirectView: i }));
      return;
    }
    if (e.subtype === 'injected') {
      (g.setActiveConnector(e.connector),
        h.push('ConnectingExternal', {
          connector: e.connector,
          redirectView: i,
          wallet: e.connector.explorerWallet,
        }));
      return;
    }
    if (e.subtype === 'announced') {
      if (e.connector.id === 'walletConnect') {
        m.isMobile() ? h.push('AllWallets') : h.push('ConnectingWalletConnect', { redirectView: i });
        return;
      }
      h.push('ConnectingExternal', {
        connector: e.connector,
        redirectView: i,
        wallet: e.connector.explorerWallet,
      });
      return;
    }
    h.push('ConnectingExternal', {
      connector: e.connector,
      redirectView: i,
    });
  }
  renderWallet(e, i) {
    const o = e.wallet,
      r = E.getWalletImage(o),
      s = y.hasAnyConnection(k.CONNECTOR_ID.WALLET_CONNECT),
      a = this.loadingTelegram,
      x = e.subtype === 'recent' ? 'recent' : void 0,
      v = e.subtype === 'recent' ? 'info' : void 0;
    return l`
      <w3m-list-wallet
        displayIndex=${i}
        imageSrc=${w(r)}
        name=${o.name ?? 'Unknown'}
        @click=${() => this.onClickWallet(e)}
        size="sm"
        data-testid=${`wallet-selector-${o.id}`}
        tabIdx=${w(this.tabIdx)}
        ?loading=${a}
        ?disabled=${s}
        rdnsId=${w(o.rdns || void 0)}
        walletRank=${w(o.order)}
        tagLabel=${w(x)}
        .tagVariant=${v}
      >
      </w3m-list-wallet>
    `;
  }
  onClickWallet(e) {
    const i = h.state.data?.redirectView;
    if (e.subtype === 'featured') {
      g.selectWalletConnector(e.wallet);
      return;
    }
    if (e.subtype === 'recent') {
      if (this.loadingTelegram) return;
      g.selectWalletConnector(e.wallet);
      return;
    }
    if (e.subtype === 'custom') {
      if (this.loadingTelegram) return;
      h.push('ConnectingWalletConnect', { wallet: e.wallet, redirectView: i });
      return;
    }
    if (this.loadingTelegram) return;
    const o = g.getConnector({
      id: e.wallet.id,
      rdns: e.wallet.rdns,
    });
    o
      ? h.push('ConnectingExternal', { connector: o, redirectView: i })
      : h.push('ConnectingWalletConnect', { wallet: e.wallet, redirectView: i });
  }
};
de.styles = zn;
Se([c({ type: Number })], de.prototype, 'tabIdx', void 0);
Se([d()], de.prototype, 'connectors', void 0);
Se([d()], de.prototype, 'recommended', void 0);
Se([d()], de.prototype, 'featured', void 0);
Se([d()], de.prototype, 'explorerWallets', void 0);
Se([d()], de.prototype, 'connections', void 0);
Se([d()], de.prototype, 'connectorImages', void 0);
Se([d()], de.prototype, 'loadingTelegram', void 0);
de = Se([p('w3m-connector-list')], de);
var ji = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let qt = class extends f {
  constructor() {
    (super(...arguments), (this.tabIdx = void 0));
  }
  render() {
    return l`
      <wui-flex flexDirection="column" gap="2">
        <w3m-connector-list tabIdx=${w(this.tabIdx)}></w3m-connector-list>
        <w3m-all-wallets-widget tabIdx=${w(this.tabIdx)}></w3m-all-wallets-widget>
      </wui-flex>
    `;
  }
};
ji([c()], qt.prototype, 'tabIdx', void 0);
qt = ji([p('w3m-wallet-login-list')], qt);
const Fn = $`
  :host {
    --connect-scroll--top-opacity: 0;
    --connect-scroll--bottom-opacity: 0;
    --connect-mask-image: none;
  }

  .connect {
    max-height: clamp(360px, 470px, 80vh);
    scrollbar-width: none;
    overflow-y: scroll;
    overflow-x: hidden;
    transition: opacity ${({ durations: t }) => t.lg}
      ${({ easings: t }) => t['ease-out-power-2']};
    will-change: opacity;
    mask-image: var(--connect-mask-image);
  }

  .guide {
    transition: opacity ${({ durations: t }) => t.lg}
      ${({ easings: t }) => t['ease-out-power-2']};
    will-change: opacity;
  }

  .connect::-webkit-scrollbar {
    display: none;
  }

  .all-wallets {
    flex-flow: column;
  }

  .connect.disabled,
  .guide.disabled {
    opacity: 0.3;
    pointer-events: none;
    user-select: none;
  }

  wui-separator {
    margin: ${({ spacing: t }) => t[3]} calc(${({ spacing: t }) => t[3]} * -1);
    width: calc(100% + ${({ spacing: t }) => t[3]} * 2);
  }
`;
var ae = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
const Mn = 470;
let q = class extends f {
  constructor() {
    (super(),
      (this.unsubscribe = []),
      (this.connectors = g.state.connectors),
      (this.authConnector = this.connectors.find((e) => e.type === 'AUTH')),
      (this.features = b.state.features),
      (this.remoteFeatures = b.state.remoteFeatures),
      (this.enableWallets = b.state.enableWallets),
      (this.noAdapters = u.state.noAdapters),
      (this.walletGuide = 'get-started'),
      (this.checked = vt.state.isLegalCheckboxChecked),
      (this.isEmailEnabled = this.remoteFeatures?.email && !u.state.noAdapters),
      (this.isSocialEnabled =
        this.remoteFeatures?.socials && this.remoteFeatures.socials.length > 0 && !u.state.noAdapters),
      (this.isAuthEnabled = this.checkIfAuthEnabled(this.connectors)),
      this.unsubscribe.push(
        g.subscribeKey('connectors', (e) => {
          ((this.connectors = e),
            (this.authConnector = this.connectors.find((i) => i.type === 'AUTH')),
            (this.isAuthEnabled = this.checkIfAuthEnabled(this.connectors)));
        }),
        b.subscribeKey('features', (e) => {
          this.features = e;
        }),
        b.subscribeKey('remoteFeatures', (e) => {
          ((this.remoteFeatures = e), this.setEmailAndSocialEnableCheck(this.noAdapters, this.remoteFeatures));
        }),
        b.subscribeKey('enableWallets', (e) => (this.enableWallets = e)),
        u.subscribeKey('noAdapters', (e) => this.setEmailAndSocialEnableCheck(e, this.remoteFeatures)),
        vt.subscribeKey('isLegalCheckboxChecked', (e) => (this.checked = e))
      ));
  }
  disconnectedCallback() {
    (this.unsubscribe.forEach((i) => i()),
      this.resizeObserver?.disconnect(),
      this.shadowRoot
        ?.querySelector('.connect')
        ?.removeEventListener('scroll', this.handleConnectListScroll.bind(this)));
  }
  firstUpdated() {
    const e = this.shadowRoot?.querySelector('.connect');
    e &&
      (requestAnimationFrame(this.handleConnectListScroll.bind(this)),
      e?.addEventListener('scroll', this.handleConnectListScroll.bind(this)),
      (this.resizeObserver = new ResizeObserver(() => {
        this.handleConnectListScroll();
      })),
      this.resizeObserver?.observe(e),
      this.handleConnectListScroll());
  }
  render() {
    const { termsConditionsUrl: e, privacyPolicyUrl: i } = b.state,
      o = b.state.features?.legalCheckbox,
      s = !!(e || i) && !!o && this.walletGuide === 'get-started' && !this.checked,
      a = {
        connect: !0,
        disabled: s,
      },
      x = b.state.enableWalletGuide,
      v = this.enableWallets,
      _ = this.isSocialEnabled || this.authConnector,
      F = s ? -1 : void 0;
    return l`
      <wui-flex flexDirection="column">
        ${this.legalCheckboxTemplate()}
        <wui-flex
          data-testid="w3m-connect-scroll-view"
          flexDirection="column"
          .padding=${['0', '0', '4', '0']}
          class=${Ri(a)}
        >
          <wui-flex
            class="connect-methods"
            flexDirection="column"
            gap="2"
            .padding=${_ && v && x && this.walletGuide === 'get-started' ? ['0', '3', '0', '3'] : ['0', '3', '3', '3']}
          >
            ${this.renderConnectMethod(F)}
          </wui-flex>
        </wui-flex>
        ${this.reownBrandingTemplate()}
      </wui-flex>
    `;
  }
  reownBrandingTemplate() {
    return ei.hasFooter() || !this.remoteFeatures?.reownBranding ? null : l`<wui-ux-by-reown></wui-ux-by-reown>`;
  }
  setEmailAndSocialEnableCheck(e, i) {
    ((this.isEmailEnabled = i?.email && !e),
      (this.isSocialEnabled = i?.socials && i.socials.length > 0 && !e),
      (this.remoteFeatures = i),
      (this.noAdapters = e));
  }
  checkIfAuthEnabled(e) {
    const i = e.filter((r) => r.type === Qi.CONNECTOR_TYPE_AUTH).map((r) => r.chain);
    return k.AUTH_CONNECTOR_SUPPORTED_CHAINS.some((r) => i.includes(r));
  }
  renderConnectMethod(e) {
    const i = st.getConnectOrderMethod(this.features, this.connectors);
    return l`${i.map((o, r) => {
      switch (o) {
        case 'email':
          return l`${this.emailTemplate(e)} ${this.separatorTemplate(r, 'email')}`;
        case 'social':
          return l`${this.socialListTemplate(e)}
          ${this.separatorTemplate(r, 'social')}`;
        case 'wallet':
          return l`${this.walletListTemplate(e)}
          ${this.separatorTemplate(r, 'wallet')}`;
        default:
          return null;
      }
    })}`;
  }
  checkMethodEnabled(e) {
    switch (e) {
      case 'wallet':
        return this.enableWallets;
      case 'social':
        return this.isSocialEnabled && this.isAuthEnabled;
      case 'email':
        return this.isEmailEnabled && this.isAuthEnabled;
      default:
        return null;
    }
  }
  checkIsThereNextMethod(e) {
    const o = st.getConnectOrderMethod(this.features, this.connectors)[e + 1];
    return o ? (this.checkMethodEnabled(o) ? o : this.checkIsThereNextMethod(e + 1)) : void 0;
  }
  separatorTemplate(e, i) {
    const o = this.checkIsThereNextMethod(e),
      r = this.walletGuide === 'explore';
    switch (i) {
      case 'wallet':
        return this.enableWallets && o && !r
          ? l`<wui-separator data-testid="wui-separator" text="or"></wui-separator>`
          : null;
      case 'email': {
        const n = o === 'social';
        return this.isAuthEnabled && this.isEmailEnabled && !n && o
          ? l`<wui-separator
              data-testid="w3m-email-login-or-separator"
              text="or"
            ></wui-separator>`
          : null;
      }
      case 'social': {
        const n = o === 'email';
        return this.isAuthEnabled && this.isSocialEnabled && !n && o
          ? l`<wui-separator data-testid="wui-separator" text="or"></wui-separator>`
          : null;
      }
      default:
        return null;
    }
  }
  emailTemplate(e) {
    return !this.isEmailEnabled || !this.isAuthEnabled
      ? null
      : l`<w3m-email-login-widget tabIdx=${w(e)}></w3m-email-login-widget>`;
  }
  socialListTemplate(e) {
    return !this.isSocialEnabled || !this.isAuthEnabled
      ? null
      : l`<w3m-social-login-widget
      walletGuide=${this.walletGuide}
      tabIdx=${w(e)}
    ></w3m-social-login-widget>`;
  }
  walletListTemplate(e) {
    const i = this.enableWallets,
      o = this.features?.emailShowWallets === !1,
      r = this.features?.collapseWallets,
      n = o || r;
    return !i ||
      (m.isTelegram() && (m.isSafari() || m.isIos()) && y.connectWalletConnect().catch((a) => ({})),
      this.walletGuide === 'explore')
      ? null
      : this.isAuthEnabled && (this.isEmailEnabled || this.isSocialEnabled) && n
        ? l`<wui-list-button
        data-testid="w3m-collapse-wallets-button"
        tabIdx=${w(e)}
        @click=${this.onContinueWalletClick.bind(this)}
        text="Continue with a wallet"
      ></wui-list-button>`
        : l`<w3m-wallet-login-list tabIdx=${w(e)}></w3m-wallet-login-list>`;
  }
  legalCheckboxTemplate() {
    return this.walletGuide === 'explore'
      ? null
      : l`<w3m-legal-checkbox data-testid="w3m-legal-checkbox"></w3m-legal-checkbox>`;
  }
  handleConnectListScroll() {
    const e = this.shadowRoot?.querySelector('.connect');
    if (!e) return;
    e.scrollHeight > Mn
      ? (e.style.setProperty(
          '--connect-mask-image',
          `linear-gradient(
          to bottom,
          rgba(0, 0, 0, calc(1 - var(--connect-scroll--top-opacity))) 0px,
          rgba(200, 200, 200, calc(1 - var(--connect-scroll--top-opacity))) 1px,
          black 100px,
          black calc(100% - 100px),
          rgba(155, 155, 155, calc(1 - var(--connect-scroll--bottom-opacity))) calc(100% - 1px),
          rgba(0, 0, 0, calc(1 - var(--connect-scroll--bottom-opacity))) 100%
        )`
        ),
        e.style.setProperty('--connect-scroll--top-opacity', yt.interpolate([0, 50], [0, 1], e.scrollTop).toString()),
        e.style.setProperty(
          '--connect-scroll--bottom-opacity',
          yt.interpolate([0, 50], [0, 1], e.scrollHeight - e.scrollTop - e.offsetHeight).toString()
        ))
      : (e.style.setProperty('--connect-mask-image', 'none'),
        e.style.setProperty('--connect-scroll--top-opacity', '0'),
        e.style.setProperty('--connect-scroll--bottom-opacity', '0'));
  }
  onContinueWalletClick() {
    h.push('ConnectWallets');
  }
};
q.styles = Fn;
ae([d()], q.prototype, 'connectors', void 0);
ae([d()], q.prototype, 'authConnector', void 0);
ae([d()], q.prototype, 'features', void 0);
ae([d()], q.prototype, 'remoteFeatures', void 0);
ae([d()], q.prototype, 'enableWallets', void 0);
ae([d()], q.prototype, 'noAdapters', void 0);
ae([c()], q.prototype, 'walletGuide', void 0);
ae([d()], q.prototype, 'checked', void 0);
ae([d()], q.prototype, 'isEmailEnabled', void 0);
ae([d()], q.prototype, 'isSocialEnabled', void 0);
ae([d()], q.prototype, 'isAuthEnabled', void 0);
q = ae([p('w3m-connect-view')], q);
const Vn = $`
  wui-flex {
    width: 100%;
    height: 52px;
    box-sizing: border-box;
    background-color: ${({ tokens: t }) => t.theme.foregroundPrimary};
    border-radius: ${({ borderRadius: t }) => t[5]};
    padding-left: ${({ spacing: t }) => t[3]};
    padding-right: ${({ spacing: t }) => t[3]};
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${({ spacing: t }) => t[6]};
  }

  wui-text {
    color: ${({ tokens: t }) => t.theme.textSecondary};
  }

  wui-icon {
    width: 12px;
    height: 12px;
  }
`;
var Lt = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let Xe = class extends f {
  constructor() {
    (super(...arguments), (this.disabled = !1), (this.label = ''), (this.buttonLabel = ''));
  }
  render() {
    return l`
      <wui-flex justifyContent="space-between" alignItems="center">
        <wui-text variant="lg-regular" color="inherit">${this.label}</wui-text>
        <wui-button variant="accent-secondary" size="sm">
          ${this.buttonLabel}
          <wui-icon name="chevronRight" color="inherit" size="inherit" slot="iconRight"></wui-icon>
        </wui-button>
      </wui-flex>
    `;
  }
};
Xe.styles = [I, T, Vn];
Lt([c({ type: Boolean })], Xe.prototype, 'disabled', void 0);
Lt([c()], Xe.prototype, 'label', void 0);
Lt([c()], Xe.prototype, 'buttonLabel', void 0);
Xe = Lt([p('wui-cta-button')], Xe);
const Hn = $`
  :host {
    display: block;
    padding: 0 ${({ spacing: t }) => t[5]} ${({ spacing: t }) => t[5]};
  }
`;
var Bi = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let kt = class extends f {
  constructor() {
    (super(...arguments), (this.wallet = void 0));
  }
  render() {
    if (!this.wallet) return ((this.style.display = 'none'), null);
    const { name: e, app_store: i, play_store: o, chrome_store: r, homepage: n } = this.wallet,
      s = m.isMobile(),
      a = m.isIos(),
      x = m.isAndroid(),
      v = [i, o, n, r].filter(Boolean).length > 1,
      _ = j.getTruncateString({
        string: e,
        charsStart: 12,
        charsEnd: 0,
        truncate: 'end',
      });
    return v && !s
      ? l`
        <wui-cta-button
          label=${`Don't have ${_}?`}
          buttonLabel="Get"
          @click=${() => h.push('Downloads', { wallet: this.wallet })}
        ></wui-cta-button>
      `
      : !v && n
        ? l`
        <wui-cta-button
          label=${`Don't have ${_}?`}
          buttonLabel="Get"
          @click=${this.onHomePage.bind(this)}
        ></wui-cta-button>
      `
        : i && a
          ? l`
        <wui-cta-button
          label=${`Don't have ${_}?`}
          buttonLabel="Get"
          @click=${this.onAppStore.bind(this)}
        ></wui-cta-button>
      `
          : o && x
            ? l`
        <wui-cta-button
          label=${`Don't have ${_}?`}
          buttonLabel="Get"
          @click=${this.onPlayStore.bind(this)}
        ></wui-cta-button>
      `
            : ((this.style.display = 'none'), null);
  }
  onAppStore() {
    this.wallet?.app_store && m.openHref(this.wallet.app_store, '_blank');
  }
  onPlayStore() {
    this.wallet?.play_store && m.openHref(this.wallet.play_store, '_blank');
  }
  onHomePage() {
    this.wallet?.homepage && m.openHref(this.wallet.homepage, '_blank');
  }
};
kt.styles = [Hn];
Bi([c({ type: Object })], kt.prototype, 'wallet', void 0);
kt = Bi([p('w3m-mobile-download-links')], kt);
const qn = $`
  @keyframes shake {
    0% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(3px);
    }
    50% {
      transform: translateX(-3px);
    }
    75% {
      transform: translateX(3px);
    }
    100% {
      transform: translateX(0);
    }
  }

  wui-flex:first-child:not(:only-child) {
    position: relative;
  }

  wui-wallet-image {
    width: 56px;
    height: 56px;
  }

  wui-loading-thumbnail {
    position: absolute;
  }

  wui-icon-box {
    position: absolute;
    right: calc(${({ spacing: t }) => t[1]} * -1);
    bottom: calc(${({ spacing: t }) => t[1]} * -1);
    opacity: 0;
    transform: scale(0.5);
    transition-property: opacity, transform;
    transition-duration: ${({ durations: t }) => t.lg};
    transition-timing-function: ${({ easings: t }) => t['ease-out-power-2']};
    will-change: opacity, transform;
  }

  wui-text[align='center'] {
    width: 100%;
    padding: 0px ${({ spacing: t }) => t[4]};
  }

  [data-error='true'] wui-icon-box {
    opacity: 1;
    transform: scale(1);
  }

  [data-error='true'] > wui-flex:first-child {
    animation: shake 250ms ${({ easings: t }) => t['ease-out-power-2']} both;
  }

  [data-retry='false'] wui-link {
    display: none;
  }

  [data-retry='true'] wui-link {
    display: block;
    opacity: 1;
  }

  w3m-mobile-download-links {
    padding: 0px;
    width: 100%;
  }
`;
var we = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
class R extends f {
  constructor() {
    (super(),
      (this.wallet = h.state.data?.wallet),
      (this.connector = h.state.data?.connector),
      (this.timeout = void 0),
      (this.secondaryBtnIcon = 'refresh'),
      (this.onConnect = void 0),
      (this.onRender = void 0),
      (this.onAutoConnect = void 0),
      (this.isWalletConnect = !0),
      (this.unsubscribe = []),
      (this.imageSrc = E.getConnectorImage(this.connector) ?? E.getWalletImage(this.wallet)),
      (this.name = this.wallet?.name ?? this.connector?.name ?? 'Wallet'),
      (this.isRetrying = !1),
      (this.uri = y.state.wcUri),
      (this.error = y.state.wcError),
      (this.ready = !1),
      (this.showRetry = !1),
      (this.label = void 0),
      (this.secondaryBtnLabel = 'Try again'),
      (this.secondaryLabel = 'Accept connection request in the wallet'),
      (this.isLoading = !1),
      (this.isMobile = !1),
      (this.onRetry = void 0),
      this.unsubscribe.push(
        y.subscribeKey('wcUri', (e) => {
          ((this.uri = e), this.isRetrying && this.onRetry && ((this.isRetrying = !1), this.onConnect?.()));
        }),
        y.subscribeKey('wcError', (e) => (this.error = e))
      ),
      (m.isTelegram() || m.isSafari()) && m.isIos() && y.state.wcUri && this.onConnect?.());
  }
  firstUpdated() {
    (this.onAutoConnect?.(), (this.showRetry = !this.onAutoConnect));
  }
  disconnectedCallback() {
    (this.unsubscribe.forEach((e) => e()), y.setWcError(!1), clearTimeout(this.timeout));
  }
  render() {
    (this.onRender?.(), this.onShowRetry());
    const e = this.error ? 'Connection can be declined if a previous request is still active' : this.secondaryLabel;
    let i = '';
    return (
      this.label ? (i = this.label) : ((i = `Continue in ${this.name}`), this.error && (i = 'Connection declined')),
      l`
      <wui-flex
        data-error=${w(this.error)}
        data-retry=${this.showRetry}
        flexDirection="column"
        alignItems="center"
        .padding=${['10', '5', '5', '5']}
        gap="6"
      >
        <wui-flex gap="2" justifyContent="center" alignItems="center">
          <wui-wallet-image size="lg" imageSrc=${w(this.imageSrc)}></wui-wallet-image>

          ${this.error ? null : this.loaderTemplate()}

          <wui-icon-box
            color="error"
            icon="close"
            size="sm"
            border
            borderColor="wui-color-bg-125"
          ></wui-icon-box>
        </wui-flex>

        <wui-flex flexDirection="column" alignItems="center" gap="6"> <wui-flex
          flexDirection="column"
          alignItems="center"
          gap="2"
          .padding=${['2', '0', '0', '0']}
        >
          <wui-text align="center" variant="lg-medium" color=${this.error ? 'error' : 'primary'}>
            ${i}
          </wui-text>
          <wui-text align="center" variant="lg-regular" color="secondary">${e}</wui-text>
        </wui-flex>

        ${
          this.secondaryBtnLabel
            ? l`
                <wui-button
                  variant="neutral-secondary"
                  size="md"
                  ?disabled=${this.isRetrying || this.isLoading}
                  @click=${this.onTryAgain.bind(this)}
                  data-testid="w3m-connecting-widget-secondary-button"
                >
                  <wui-icon
                    color="inherit"
                    slot="iconLeft"
                    name=${this.secondaryBtnIcon}
                  ></wui-icon>
                  ${this.secondaryBtnLabel}
                </wui-button>
              `
            : null
        }
      </wui-flex>

      ${
        this.isWalletConnect
          ? l`
              <wui-flex .padding=${['0', '5', '5', '5']} justifyContent="center">
                <wui-link
                  @click=${this.onCopyUri}
                  variant="secondary"
                  icon="copy"
                  data-testid="wui-link-copy"
                >
                  Copy link
                </wui-link>
              </wui-flex>
            `
          : null
      }

      <w3m-mobile-download-links .wallet=${this.wallet}></w3m-mobile-download-links></wui-flex>
      </wui-flex>
    `
    );
  }
  onShowRetry() {
    this.error &&
      !this.showRetry &&
      ((this.showRetry = !0),
      this.shadowRoot?.querySelector('wui-button')?.animate([{ opacity: 0 }, { opacity: 1 }], {
        fill: 'forwards',
        easing: 'ease',
      }));
  }
  onTryAgain() {
    (y.setWcError(!1), this.onRetry ? ((this.isRetrying = !0), this.onRetry?.()) : this.onConnect?.());
  }
  loaderTemplate() {
    const e = Ft.state.themeVariables['--w3m-border-radius-master'],
      i = e ? parseInt(e.replace('px', ''), 10) : 4;
    return l`<wui-loading-thumbnail radius=${i * 9}></wui-loading-thumbnail>`;
  }
  onCopyUri() {
    try {
      this.uri && (m.copyToClopboard(this.uri), A.showSuccess('Link copied'));
    } catch {
      A.showError('Failed to copy');
    }
  }
}
R.styles = qn;
we([d()], R.prototype, 'isRetrying', void 0);
we([d()], R.prototype, 'uri', void 0);
we([d()], R.prototype, 'error', void 0);
we([d()], R.prototype, 'ready', void 0);
we([d()], R.prototype, 'showRetry', void 0);
we([d()], R.prototype, 'label', void 0);
we([d()], R.prototype, 'secondaryBtnLabel', void 0);
we([d()], R.prototype, 'secondaryLabel', void 0);
we([d()], R.prototype, 'isLoading', void 0);
we([c({ type: Boolean })], R.prototype, 'isMobile', void 0);
we([c()], R.prototype, 'onRetry', void 0);
var Kn = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let Ci = class extends R {
  constructor() {
    if (
      (super(),
      (this.externalViewUnsubscribe = []),
      (this.connectionsByNamespace = y.getConnections(this.connector?.chain)),
      (this.hasMultipleConnections = this.connectionsByNamespace.length > 0),
      (this.remoteFeatures = b.state.remoteFeatures),
      (this.currentActiveConnectorId = g.state.activeConnectorIds[this.connector?.chain]),
      !this.connector)
    )
      throw new Error('w3m-connecting-view: No connector provided');
    const e = this.connector?.chain;
    (this.isAlreadyConnected(this.connector) &&
      ((this.secondaryBtnLabel = void 0),
      (this.label = `This account is already linked, change your account in ${this.connector.name}`),
      (this.secondaryLabel = `To link a new account, open ${this.connector.name} and switch to the account you want to link`)),
      C.sendEvent({
        type: 'track',
        event: 'SELECT_WALLET',
        properties: {
          name: this.connector.name ?? 'Unknown',
          platform: 'browser',
          displayIndex: this.wallet?.display_index,
          walletRank: this.wallet?.order,
          view: h.state.view,
        },
      }),
      (this.onConnect = this.onConnectProxy.bind(this)),
      (this.onAutoConnect = this.onConnectProxy.bind(this)),
      (this.isWalletConnect = !1),
      this.externalViewUnsubscribe.push(
        g.subscribeKey('activeConnectorIds', (i) => {
          const o = i[e],
            r = this.remoteFeatures?.multiWallet,
            { redirectView: n } = h.state.data ?? {};
          o !== this.currentActiveConnectorId &&
            (this.hasMultipleConnections && r
              ? (h.replace('ProfileWallets'), A.showSuccess('New Wallet Added'))
              : n
                ? h.replace(n)
                : O.close());
        }),
        y.subscribeKey('connections', this.onConnectionsChange.bind(this))
      ));
  }
  disconnectedCallback() {
    this.externalViewUnsubscribe.forEach((e) => e());
  }
  async onConnectProxy() {
    try {
      if (((this.error = !1), this.connector)) {
        if (this.isAlreadyConnected(this.connector)) return;
        (this.connector.id !== k.CONNECTOR_ID.COINBASE_SDK || !this.error) &&
          (await y.connectExternal(this.connector, this.connector.chain),
          C.sendEvent({
            type: 'track',
            event: 'CONNECT_SUCCESS',
            properties: {
              method: 'browser',
              name: this.connector.name || 'Unknown',
              view: h.state.view,
              walletRank: this.wallet?.order,
            },
          }));
      }
    } catch (e) {
      (e instanceof Jt && e.originalName === Zt.PROVIDER_RPC_ERROR_NAME.USER_REJECTED_REQUEST
        ? C.sendEvent({
            type: 'track',
            event: 'USER_REJECTED',
            properties: { message: e.message },
          })
        : C.sendEvent({
            type: 'track',
            event: 'CONNECT_ERROR',
            properties: { message: e?.message ?? 'Unknown' },
          }),
        (this.error = !0));
    }
  }
  onConnectionsChange(e) {
    if (this.connector?.chain && e.get(this.connector.chain) && this.isAlreadyConnected(this.connector)) {
      const i = e.get(this.connector.chain) ?? [],
        o = this.remoteFeatures?.multiWallet;
      if (i.length === 0) h.replace('Connect');
      else {
        const r = ke
            .getConnectionsByConnectorId(this.connectionsByNamespace, this.connector.id)
            .flatMap((s) => s.accounts),
          n = ke.getConnectionsByConnectorId(i, this.connector.id).flatMap((s) => s.accounts);
        n.length === 0
          ? this.hasMultipleConnections && o
            ? (h.replace('ProfileWallets'), A.showSuccess('Wallet deleted'))
            : O.close()
          : !r.every((a) => n.some((x) => ee.isLowerCaseMatch(a.address, x.address))) &&
            o &&
            h.replace('ProfileWallets');
      }
    }
  }
  isAlreadyConnected(e) {
    return !!e && this.connectionsByNamespace.some((i) => ee.isLowerCaseMatch(i.connectorId, e.id));
  }
};
Ci = Kn([p('w3m-connecting-external-view')], Ci);
const Gn = ne`
  wui-flex,
  wui-list-wallet {
    width: 100%;
  }
`;
var Ui = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let Et = class extends f {
  constructor() {
    (super(),
      (this.unsubscribe = []),
      (this.activeConnector = g.state.activeConnector),
      this.unsubscribe.push(g.subscribeKey('activeConnector', (e) => (this.activeConnector = e))));
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((e) => e());
  }
  render() {
    return l`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        .padding=${['3', '5', '5', '5']}
        gap="5"
      >
        <wui-flex justifyContent="center" alignItems="center">
          <wui-wallet-image
            size="lg"
            imageSrc=${w(E.getConnectorImage(this.activeConnector))}
          ></wui-wallet-image>
        </wui-flex>
        <wui-flex
          flexDirection="column"
          alignItems="center"
          gap="2"
          .padding=${['0', '3', '0', '3']}
        >
          <wui-text variant="lg-medium" color="primary">
            Select Chain for ${this.activeConnector?.name}
          </wui-text>
          <wui-text align="center" variant="lg-regular" color="secondary"
            >Select which chain to connect to your multi chain wallet</wui-text
          >
        </wui-flex>
        <wui-flex
          flexGrow="1"
          flexDirection="column"
          alignItems="center"
          gap="2"
          .padding=${['2', '0', '2', '0']}
        >
          ${this.networksTemplate()}
        </wui-flex>
      </wui-flex>
    `;
  }
  networksTemplate() {
    return this.activeConnector?.connectors?.map((e, i) =>
      e.name
        ? l`
            <w3m-list-wallet
              displayIndex=${i}
              imageSrc=${w(E.getChainImage(e.chain))}
              name=${k.CHAIN_NAME_MAP[e.chain]}
              @click=${() => this.onConnector(e)}
              size="sm"
              data-testid="wui-list-chain-${e.chain}"
              rdnsId=${e.explorerWallet?.rdns}
            ></w3m-list-wallet>
          `
        : null
    );
  }
  onConnector(e) {
    const i = this.activeConnector?.connectors?.find((r) => r.chain === e.chain),
      o = h.state.data?.redirectView;
    if (!i) {
      A.showError('Failed to find connector');
      return;
    }
    i.id === 'walletConnect'
      ? m.isMobile()
        ? h.push('AllWallets')
        : h.push('ConnectingWalletConnect', { redirectView: o })
      : h.push('ConnectingExternal', {
          connector: i,
          redirectView: o,
          wallet: this.activeConnector?.explorerWallet,
        });
  }
};
Et.styles = Gn;
Ui([d()], Et.prototype, 'activeConnector', void 0);
Et = Ui([p('w3m-connecting-multi-chain-view')], Et);
var si = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let At = class extends f {
  constructor() {
    (super(...arguments),
      (this.platformTabs = []),
      (this.unsubscribe = []),
      (this.platforms = []),
      (this.onSelectPlatfrom = void 0));
  }
  disconnectCallback() {
    this.unsubscribe.forEach((e) => e());
  }
  render() {
    const e = this.generateTabs();
    return l`
      <wui-flex justifyContent="center" .padding=${['0', '0', '4', '0']}>
        <wui-tabs .tabs=${e} .onTabChange=${this.onTabChange.bind(this)}></wui-tabs>
      </wui-flex>
    `;
  }
  generateTabs() {
    const e = this.platforms.map((i) =>
      i === 'browser'
        ? { label: 'Browser', icon: 'extension', platform: 'browser' }
        : i === 'mobile'
          ? { label: 'Mobile', icon: 'mobile', platform: 'mobile' }
          : i === 'qrcode'
            ? { label: 'Mobile', icon: 'mobile', platform: 'qrcode' }
            : i === 'web'
              ? { label: 'Webapp', icon: 'browser', platform: 'web' }
              : i === 'desktop'
                ? { label: 'Desktop', icon: 'desktop', platform: 'desktop' }
                : { label: 'Browser', icon: 'extension', platform: 'unsupported' }
    );
    return ((this.platformTabs = e.map(({ platform: i }) => i)), e);
  }
  onTabChange(e) {
    const i = this.platformTabs[e];
    i && this.onSelectPlatfrom?.(i);
  }
};
si([c({ type: Array })], At.prototype, 'platforms', void 0);
si([c()], At.prototype, 'onSelectPlatfrom', void 0);
At = si([p('w3m-connecting-header')], At);
var Yn = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let Si = class extends R {
  constructor() {
    if ((super(), !this.wallet)) throw new Error('w3m-connecting-wc-browser: No wallet provided');
    ((this.onConnect = this.onConnectProxy.bind(this)),
      (this.onAutoConnect = this.onConnectProxy.bind(this)),
      C.sendEvent({
        type: 'track',
        event: 'SELECT_WALLET',
        properties: {
          name: this.wallet.name,
          platform: 'browser',
          displayIndex: this.wallet?.display_index,
          walletRank: this.wallet.order,
          view: h.state.view,
        },
      }));
  }
  async onConnectProxy() {
    try {
      this.error = !1;
      const { connectors: e } = g.state,
        i = e.find(
          (o) =>
            (o.type === 'ANNOUNCED' && o.info?.rdns === this.wallet?.rdns) ||
            o.type === 'INJECTED' ||
            o.name === this.wallet?.name
        );
      if (i) await y.connectExternal(i, i.chain);
      else throw new Error('w3m-connecting-wc-browser: No connector found');
      (O.close(),
        C.sendEvent({
          type: 'track',
          event: 'CONNECT_SUCCESS',
          properties: {
            method: 'browser',
            name: this.wallet?.name || 'Unknown',
            view: h.state.view,
            walletRank: this.wallet?.order,
          },
        }));
    } catch (e) {
      (e instanceof Jt && e.originalName === Zt.PROVIDER_RPC_ERROR_NAME.USER_REJECTED_REQUEST
        ? C.sendEvent({
            type: 'track',
            event: 'USER_REJECTED',
            properties: { message: e.message },
          })
        : C.sendEvent({
            type: 'track',
            event: 'CONNECT_ERROR',
            properties: { message: e?.message ?? 'Unknown' },
          }),
        (this.error = !0));
    }
  }
};
Si = Yn([p('w3m-connecting-wc-browser')], Si);
var Xn = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let ki = class extends R {
  constructor() {
    if ((super(), !this.wallet)) throw new Error('w3m-connecting-wc-desktop: No wallet provided');
    ((this.onConnect = this.onConnectProxy.bind(this)),
      (this.onRender = this.onRenderProxy.bind(this)),
      C.sendEvent({
        type: 'track',
        event: 'SELECT_WALLET',
        properties: {
          name: this.wallet.name,
          platform: 'desktop',
          displayIndex: this.wallet?.display_index,
          walletRank: this.wallet.order,
          view: h.state.view,
        },
      }));
  }
  onRenderProxy() {
    !this.ready && this.uri && ((this.ready = !0), this.onConnect?.());
  }
  onConnectProxy() {
    if (this.wallet?.desktop_link && this.uri)
      try {
        this.error = !1;
        const { desktop_link: e, name: i } = this.wallet,
          { redirect: o, href: r } = m.formatNativeUrl(e, this.uri);
        (y.setWcLinking({ name: i, href: r }), y.setRecentWallet(this.wallet), m.openHref(o, '_blank'));
      } catch {
        this.error = !0;
      }
  }
};
ki = Xn([p('w3m-connecting-wc-desktop')], ki);
var nt = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let Fe = class extends R {
  constructor() {
    if (
      (super(),
      (this.btnLabelTimeout = void 0),
      (this.redirectDeeplink = void 0),
      (this.redirectUniversalLink = void 0),
      (this.target = void 0),
      (this.preferUniversalLinks = b.state.experimental_preferUniversalLinks),
      (this.isLoading = !0),
      (this.onConnect = () => {
        if (this.wallet?.mobile_link && this.uri)
          try {
            this.error = !1;
            const { mobile_link: e, link_mode: i, name: o } = this.wallet,
              { redirect: r, redirectUniversalLink: n, href: s } = m.formatNativeUrl(e, this.uri, i);
            ((this.redirectDeeplink = r),
              (this.redirectUniversalLink = n),
              (this.target = m.isIframe() ? '_top' : '_self'),
              y.setWcLinking({ name: o, href: s }),
              y.setRecentWallet(this.wallet),
              this.preferUniversalLinks && this.redirectUniversalLink
                ? m.openHref(this.redirectUniversalLink, this.target)
                : m.openHref(this.redirectDeeplink, this.target));
          } catch (e) {
            (C.sendEvent({
              type: 'track',
              event: 'CONNECT_PROXY_ERROR',
              properties: {
                message: e instanceof Error ? e.message : 'Error parsing the deeplink',
                uri: this.uri,
                mobile_link: this.wallet.mobile_link,
                name: this.wallet.name,
              },
            }),
              (this.error = !0));
          }
      }),
      !this.wallet)
    )
      throw new Error('w3m-connecting-wc-mobile: No wallet provided');
    ((this.secondaryBtnLabel = 'Open'),
      (this.secondaryLabel = N.CONNECT_LABELS.MOBILE),
      (this.secondaryBtnIcon = 'externalLink'),
      this.onHandleURI(),
      this.unsubscribe.push(
        y.subscribeKey('wcUri', () => {
          this.onHandleURI();
        })
      ),
      C.sendEvent({
        type: 'track',
        event: 'SELECT_WALLET',
        properties: {
          name: this.wallet.name,
          platform: 'mobile',
          displayIndex: this.wallet?.display_index,
          walletRank: this.wallet.order,
          view: h.state.view,
        },
      }));
  }
  disconnectedCallback() {
    (super.disconnectedCallback(), clearTimeout(this.btnLabelTimeout));
  }
  onHandleURI() {
    ((this.isLoading = !this.uri), !this.ready && this.uri && ((this.ready = !0), this.onConnect?.()));
  }
  onTryAgain() {
    (y.setWcError(!1), this.onConnect?.());
  }
};
nt([d()], Fe.prototype, 'redirectDeeplink', void 0);
nt([d()], Fe.prototype, 'redirectUniversalLink', void 0);
nt([d()], Fe.prototype, 'target', void 0);
nt([d()], Fe.prototype, 'preferUniversalLinks', void 0);
nt([d()], Fe.prototype, 'isLoading', void 0);
Fe = nt([p('w3m-connecting-wc-mobile')], Fe);
const Qn = $`
  wui-shimmer {
    width: 100%;
    aspect-ratio: 1 / 1;
    border-radius: ${({ borderRadius: t }) => t[4]};
  }

  wui-qr-code {
    opacity: 0;
    animation-duration: ${({ durations: t }) => t.xl};
    animation-timing-function: ${({ easings: t }) => t['ease-out-power-2']};
    animation-name: fade-in;
    animation-fill-mode: forwards;
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
var zi = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let It = class extends R {
  constructor() {
    (super(),
      (this.basic = !1),
      (this.forceUpdate = () => {
        this.requestUpdate();
      }),
      window.addEventListener('resize', this.forceUpdate));
  }
  firstUpdated() {
    this.basic ||
      C.sendEvent({
        type: 'track',
        event: 'SELECT_WALLET',
        properties: {
          name: this.wallet?.name ?? 'WalletConnect',
          platform: 'qrcode',
          displayIndex: this.wallet?.display_index,
          walletRank: this.wallet?.order,
          view: h.state.view,
        },
      });
  }
  disconnectedCallback() {
    (super.disconnectedCallback(),
      this.unsubscribe?.forEach((e) => e()),
      window.removeEventListener('resize', this.forceUpdate));
  }
  render() {
    return (
      this.onRenderProxy(),
      l`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        .padding=${['0', '5', '5', '5']}
        gap="5"
      >
        <wui-shimmer width="100%"> ${this.qrCodeTemplate()} </wui-shimmer>
        <wui-text variant="lg-medium" color="primary"> Scan this QR Code with your phone </wui-text>
        ${this.copyTemplate()}
      </wui-flex>
      <w3m-mobile-download-links .wallet=${this.wallet}></w3m-mobile-download-links>
    `
    );
  }
  onRenderProxy() {
    !this.ready &&
      this.uri &&
      (this.timeout = setTimeout(() => {
        this.ready = !0;
      }, 200));
  }
  qrCodeTemplate() {
    if (!this.uri || !this.ready) return null;
    const e = this.getBoundingClientRect().width - 40,
      i = this.wallet ? this.wallet.name : void 0;
    (y.setWcLinking(void 0), y.setRecentWallet(this.wallet));
    let o = this.uri;
    if (this.wallet?.mobile_link) {
      const { redirect: r } = m.formatNativeUrl(this.wallet?.mobile_link, this.uri, null);
      o = r;
    }
    return l` <wui-qr-code
      size=${e}
      theme=${Ft.state.themeMode}
      uri=${o}
      imageSrc=${w(E.getWalletImage(this.wallet))}
      color=${w(Ft.state.themeVariables['--w3m-qr-color'])}
      alt=${w(i)}
      data-testid="wui-qr-code"
    ></wui-qr-code>`;
  }
  copyTemplate() {
    const e = !this.uri || !this.ready;
    return l`<wui-button
      .disabled=${e}
      @click=${this.onCopyUri}
      variant="neutral-secondary"
      size="sm"
      data-testid="copy-wc2-uri"
    >
      Copy link
      <wui-icon size="sm" color="inherit" name="copy" slot="iconRight"></wui-icon>
    </wui-button>`;
  }
};
It.styles = Qn;
zi([c({ type: Boolean })], It.prototype, 'basic', void 0);
It = zi([p('w3m-connecting-wc-qrcode')], It);
var Jn = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let Ei = class extends f {
  constructor() {
    if ((super(), (this.wallet = h.state.data?.wallet), !this.wallet))
      throw new Error('w3m-connecting-wc-unsupported: No wallet provided');
    C.sendEvent({
      type: 'track',
      event: 'SELECT_WALLET',
      properties: {
        name: this.wallet.name,
        platform: 'browser',
        displayIndex: this.wallet?.display_index,
        walletRank: this.wallet?.order,
        view: h.state.view,
      },
    });
  }
  render() {
    return l`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        .padding=${['10', '5', '5', '5']}
        gap="5"
      >
        <wui-wallet-image
          size="lg"
          imageSrc=${w(E.getWalletImage(this.wallet))}
        ></wui-wallet-image>

        <wui-text variant="md-regular" color="primary">Not Detected</wui-text>
      </wui-flex>

      <w3m-mobile-download-links .wallet=${this.wallet}></w3m-mobile-download-links>
    `;
  }
};
Ei = Jn([p('w3m-connecting-wc-unsupported')], Ei);
var Fi = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let Kt = class extends R {
  constructor() {
    if ((super(), (this.isLoading = !0), !this.wallet)) throw new Error('w3m-connecting-wc-web: No wallet provided');
    ((this.onConnect = this.onConnectProxy.bind(this)),
      (this.secondaryBtnLabel = 'Open'),
      (this.secondaryLabel = N.CONNECT_LABELS.MOBILE),
      (this.secondaryBtnIcon = 'externalLink'),
      this.updateLoadingState(),
      this.unsubscribe.push(
        y.subscribeKey('wcUri', () => {
          this.updateLoadingState();
        })
      ),
      C.sendEvent({
        type: 'track',
        event: 'SELECT_WALLET',
        properties: {
          name: this.wallet.name,
          platform: 'web',
          displayIndex: this.wallet?.display_index,
          walletRank: this.wallet?.order,
          view: h.state.view,
        },
      }));
  }
  updateLoadingState() {
    this.isLoading = !this.uri;
  }
  onConnectProxy() {
    if (this.wallet?.webapp_link && this.uri)
      try {
        this.error = !1;
        const { webapp_link: e, name: i } = this.wallet,
          { redirect: o, href: r } = m.formatUniversalUrl(e, this.uri);
        (y.setWcLinking({ name: i, href: r }), y.setRecentWallet(this.wallet), m.openHref(o, '_blank'));
      } catch {
        this.error = !0;
      }
  }
};
Fi([d()], Kt.prototype, 'isLoading', void 0);
Kt = Fi([p('w3m-connecting-wc-web')], Kt);
const Zn = $`
  :host([data-mobile-fullscreen='true']) {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  :host([data-mobile-fullscreen='true']) wui-ux-by-reown {
    margin-top: auto;
  }
`;
var qe = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let $e = class extends f {
  constructor() {
    (super(),
      (this.wallet = h.state.data?.wallet),
      (this.unsubscribe = []),
      (this.platform = void 0),
      (this.platforms = []),
      (this.isSiwxEnabled = !!b.state.siwx),
      (this.remoteFeatures = b.state.remoteFeatures),
      (this.displayBranding = !0),
      (this.basic = !1),
      this.determinePlatforms(),
      this.initializeConnection(),
      this.unsubscribe.push(b.subscribeKey('remoteFeatures', (e) => (this.remoteFeatures = e))));
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((e) => e());
  }
  render() {
    return (
      b.state.enableMobileFullScreen && this.setAttribute('data-mobile-fullscreen', 'true'),
      l`
      ${this.headerTemplate()}
      <div class="platform-container">${this.platformTemplate()}</div>
      ${this.reownBrandingTemplate()}
    `
    );
  }
  reownBrandingTemplate() {
    return !this.remoteFeatures?.reownBranding || !this.displayBranding ? null : l`<wui-ux-by-reown></wui-ux-by-reown>`;
  }
  async initializeConnection(e = !1) {
    if (!(this.platform === 'browser' || (b.state.manualWCControl && !e)))
      try {
        const { wcPairingExpiry: i, status: o } = y.state,
          { redirectView: r } = h.state.data ?? {};
        if (e || b.state.enableEmbedded || m.isPairingExpired(i) || o === 'connecting') {
          const n = y.getConnections(u.state.activeChain),
            s = this.remoteFeatures?.multiWallet,
            a = n.length > 0;
          (await y.connectWalletConnect({ cache: 'never' }),
            this.isSiwxEnabled ||
              (a && s
                ? (h.replace('ProfileWallets'), A.showSuccess('New Wallet Added'))
                : r
                  ? h.replace(r)
                  : O.close()));
        }
      } catch (i) {
        if (
          i instanceof Error &&
          i.message.includes('An error occurred when attempting to switch chain') &&
          !b.state.enableNetworkSwitch &&
          u.state.activeChain
        ) {
          (u.setActiveCaipNetwork(Ji.getUnsupportedNetwork(`${u.state.activeChain}:${u.state.activeCaipNetwork?.id}`)),
            u.showUnsupportedChainUI());
          return;
        }
        (i instanceof Jt && i.originalName === Zt.PROVIDER_RPC_ERROR_NAME.USER_REJECTED_REQUEST
          ? C.sendEvent({
              type: 'track',
              event: 'USER_REJECTED',
              properties: { message: i.message },
            })
          : C.sendEvent({
              type: 'track',
              event: 'CONNECT_ERROR',
              properties: { message: i?.message ?? 'Unknown' },
            }),
          y.setWcError(!0),
          A.showError(i.message ?? 'Connection error'),
          y.resetWcConnection(),
          h.goBack());
      }
  }
  determinePlatforms() {
    if (!this.wallet) {
      (this.platforms.push('qrcode'), (this.platform = 'qrcode'));
      return;
    }
    if (this.platform) return;
    const { mobile_link: e, desktop_link: i, webapp_link: o, injected: r, rdns: n } = this.wallet,
      s = r?.map(({ injected_id: J }) => J).filter(Boolean),
      a = [...(n ? [n] : (s ?? []))],
      x = b.state.isUniversalProvider ? !1 : a.length,
      v = e,
      _ = o,
      F = y.checkInstalled(a),
      G = x && F,
      Ut = i && !m.isMobile();
    (G && !u.state.noAdapters && this.platforms.push('browser'),
      v && this.platforms.push(m.isMobile() ? 'mobile' : 'qrcode'),
      _ && this.platforms.push('web'),
      Ut && this.platforms.push('desktop'),
      !G && x && !u.state.noAdapters && this.platforms.push('unsupported'),
      (this.platform = this.platforms[0]));
  }
  platformTemplate() {
    switch (this.platform) {
      case 'browser':
        return l`<w3m-connecting-wc-browser></w3m-connecting-wc-browser>`;
      case 'web':
        return l`<w3m-connecting-wc-web></w3m-connecting-wc-web>`;
      case 'desktop':
        return l`
          <w3m-connecting-wc-desktop .onRetry=${() => this.initializeConnection(!0)}>
          </w3m-connecting-wc-desktop>
        `;
      case 'mobile':
        return l`
          <w3m-connecting-wc-mobile isMobile .onRetry=${() => this.initializeConnection(!0)}>
          </w3m-connecting-wc-mobile>
        `;
      case 'qrcode':
        return l`<w3m-connecting-wc-qrcode ?basic=${this.basic}></w3m-connecting-wc-qrcode>`;
      default:
        return l`<w3m-connecting-wc-unsupported></w3m-connecting-wc-unsupported>`;
    }
  }
  headerTemplate() {
    return this.platforms.length > 1
      ? l`
      <w3m-connecting-header
        .platforms=${this.platforms}
        .onSelectPlatfrom=${this.onSelectPlatform.bind(this)}
      >
      </w3m-connecting-header>
    `
      : null;
  }
  async onSelectPlatform(e) {
    const i = this.shadowRoot?.querySelector('div');
    i &&
      (await i.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 200,
        fill: 'forwards',
        easing: 'ease',
      }).finished,
      (this.platform = e),
      i.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 200,
        fill: 'forwards',
        easing: 'ease',
      }));
  }
};
$e.styles = Zn;
qe([d()], $e.prototype, 'platform', void 0);
qe([d()], $e.prototype, 'platforms', void 0);
qe([d()], $e.prototype, 'isSiwxEnabled', void 0);
qe([d()], $e.prototype, 'remoteFeatures', void 0);
qe([c({ type: Boolean })], $e.prototype, 'displayBranding', void 0);
qe([c({ type: Boolean })], $e.prototype, 'basic', void 0);
$e = qe([p('w3m-connecting-wc-view')], $e);
var ai = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let _t = class extends f {
  constructor() {
    (super(),
      (this.unsubscribe = []),
      (this.isMobile = m.isMobile()),
      (this.remoteFeatures = b.state.remoteFeatures),
      this.unsubscribe.push(b.subscribeKey('remoteFeatures', (e) => (this.remoteFeatures = e))));
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((e) => e());
  }
  render() {
    if (this.isMobile) {
      const { featured: e, recommended: i } = S.state,
        { customWallets: o } = b.state,
        r = Ee.getRecentWallets(),
        n = e.length || i.length || o?.length || r.length;
      return l`<wui-flex flexDirection="column" gap="2" .margin=${['1', '3', '3', '3']}>
        ${n ? l`<w3m-connector-list></w3m-connector-list>` : null}
        <w3m-all-wallets-widget></w3m-all-wallets-widget>
      </wui-flex>`;
    }
    return l`<wui-flex flexDirection="column" .padding=${['0', '0', '4', '0']}>
        <w3m-connecting-wc-view ?basic=${!0} .displayBranding=${!1}></w3m-connecting-wc-view>
        <wui-flex flexDirection="column" .padding=${['0', '3', '0', '3']}>
          <w3m-all-wallets-widget></w3m-all-wallets-widget>
        </wui-flex>
      </wui-flex>
      ${this.reownBrandingTemplate()} `;
  }
  reownBrandingTemplate() {
    return this.remoteFeatures?.reownBranding
      ? l` <wui-flex flexDirection="column" .padding=${['1', '0', '1', '0']}>
      <wui-ux-by-reown></wui-ux-by-reown>
    </wui-flex>`
      : null;
  }
};
ai([d()], _t.prototype, 'isMobile', void 0);
ai([d()], _t.prototype, 'remoteFeatures', void 0);
_t = ai([p('w3m-connecting-wc-basic-view')], _t);
const eo = ne`
  .continue-button-container {
    width: 100%;
  }
`;
var Mi = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let Tt = class extends f {
  constructor() {
    (super(...arguments), (this.loading = !1));
  }
  render() {
    return l`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        gap="6"
        .padding=${['0', '0', '4', '0']}
      >
        ${this.onboardingTemplate()} ${this.buttonsTemplate()}
        <wui-link
          @click=${() => {
            m.openHref(nn.URLS.FAQ, '_blank');
          }}
        >
          Learn more about names
          <wui-icon color="inherit" slot="iconRight" name="externalLink"></wui-icon>
        </wui-link>
      </wui-flex>
    `;
  }
  onboardingTemplate() {
    return l` <wui-flex
      flexDirection="column"
      gap="6"
      alignItems="center"
      .padding=${['0', '6', '0', '6']}
    >
      <wui-flex gap="3" alignItems="center" justifyContent="center">
        <wui-icon-box icon="id" size="xl" iconSize="xxl" color="default"></wui-icon-box>
      </wui-flex>
      <wui-flex flexDirection="column" alignItems="center" gap="3">
        <wui-text align="center" variant="lg-medium" color="primary">
          Choose your account name
        </wui-text>
        <wui-text align="center" variant="md-regular" color="primary">
          Finally say goodbye to 0x addresses, name your account to make it easier to exchange
          assets
        </wui-text>
      </wui-flex>
    </wui-flex>`;
  }
  buttonsTemplate() {
    return l`<wui-flex
      .padding=${['0', '8', '0', '8']}
      gap="3"
      class="continue-button-container"
    >
      <wui-button
        fullWidth
        .loading=${this.loading}
        size="lg"
        borderRadius="xs"
        @click=${this.handleContinue.bind(this)}
        >Choose name
      </wui-button>
    </wui-flex>`;
  }
  handleContinue() {
    (h.push('RegisterAccountName'),
      C.sendEvent({
        type: 'track',
        event: 'OPEN_ENS_FLOW',
        properties: {
          isSmartAccount: Ae(u.state.activeChain) === le.ACCOUNT_TYPES.SMART_ACCOUNT,
        },
      }));
  }
};
Tt.styles = eo;
Mi([d()], Tt.prototype, 'loading', void 0);
Tt = Mi([p('w3m-choose-account-name-view')], Tt);
var to = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let Ai = class extends f {
  constructor() {
    (super(...arguments), (this.wallet = h.state.data?.wallet));
  }
  render() {
    if (!this.wallet) throw new Error('w3m-downloads-view');
    return l`
      <wui-flex gap="2" flexDirection="column" .padding=${['3', '3', '4', '3']}>
        ${this.chromeTemplate()} ${this.iosTemplate()} ${this.androidTemplate()}
        ${this.homepageTemplate()}
      </wui-flex>
    `;
  }
  chromeTemplate() {
    return this.wallet?.chrome_store
      ? l`<wui-list-item
      variant="icon"
      icon="chromeStore"
      iconVariant="square"
      @click=${this.onChromeStore.bind(this)}
      chevron
    >
      <wui-text variant="md-medium" color="primary">Chrome Extension</wui-text>
    </wui-list-item>`
      : null;
  }
  iosTemplate() {
    return this.wallet?.app_store
      ? l`<wui-list-item
      variant="icon"
      icon="appStore"
      iconVariant="square"
      @click=${this.onAppStore.bind(this)}
      chevron
    >
      <wui-text variant="md-medium" color="primary">iOS App</wui-text>
    </wui-list-item>`
      : null;
  }
  androidTemplate() {
    return this.wallet?.play_store
      ? l`<wui-list-item
      variant="icon"
      icon="playStore"
      iconVariant="square"
      @click=${this.onPlayStore.bind(this)}
      chevron
    >
      <wui-text variant="md-medium" color="primary">Android App</wui-text>
    </wui-list-item>`
      : null;
  }
  homepageTemplate() {
    return this.wallet?.homepage
      ? l`
      <wui-list-item
        variant="icon"
        icon="browser"
        iconVariant="square-blue"
        @click=${this.onHomePage.bind(this)}
        chevron
      >
        <wui-text variant="md-medium" color="primary">Website</wui-text>
      </wui-list-item>
    `
      : null;
  }
  openStore(e) {
    e.href &&
      this.wallet &&
      (C.sendEvent({
        type: 'track',
        event: 'GET_WALLET',
        properties: {
          name: this.wallet.name,
          walletRank: this.wallet.order,
          explorerId: this.wallet.id,
          type: e.type,
        },
      }),
      m.openHref(e.href, '_blank'));
  }
  onChromeStore() {
    this.wallet?.chrome_store && this.openStore({ href: this.wallet.chrome_store, type: 'chrome_store' });
  }
  onAppStore() {
    this.wallet?.app_store && this.openStore({ href: this.wallet.app_store, type: 'app_store' });
  }
  onPlayStore() {
    this.wallet?.play_store && this.openStore({ href: this.wallet.play_store, type: 'play_store' });
  }
  onHomePage() {
    this.wallet?.homepage && this.openStore({ href: this.wallet.homepage, type: 'homepage' });
  }
};
Ai = to([p('w3m-downloads-view')], Ai);
var io = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
const no = 'https://walletconnect.com/explorer';
let Ii = class extends f {
  render() {
    return l`
      <wui-flex flexDirection="column" .padding=${['0', '3', '3', '3']} gap="2">
        ${this.recommendedWalletsTemplate()}
        <w3m-list-wallet
          name="Explore all"
          showAllWallets
          walletIcon="allWallets"
          icon="externalLink"
          size="sm"
          @click=${() => {
            m.openHref('https://walletconnect.com/explorer?type=wallet', '_blank');
          }}
        ></w3m-list-wallet>
      </wui-flex>
    `;
  }
  recommendedWalletsTemplate() {
    const { recommended: e, featured: i } = S.state,
      { customWallets: o } = b.state;
    return [...i, ...(o ?? []), ...e].slice(0, 4).map(
      (n, s) => l`
        <w3m-list-wallet
          displayIndex=${s}
          name=${n.name ?? 'Unknown'}
          tagVariant="accent"
          size="sm"
          imageSrc=${w(E.getWalletImage(n))}
          @click=${() => {
            this.onWalletClick(n);
          }}
        ></w3m-list-wallet>
      `
    );
  }
  onWalletClick(e) {
    (C.sendEvent({
      type: 'track',
      event: 'GET_WALLET',
      properties: {
        name: e.name,
        walletRank: void 0,
        explorerId: e.id,
        type: 'homepage',
      },
    }),
      m.openHref(e.homepage ?? no, '_blank'));
  }
};
Ii = io([p('w3m-get-wallet-view')], Ii);
var Vi = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let Gt = class extends f {
  constructor() {
    (super(...arguments), (this.data = []));
  }
  render() {
    return l`
      <wui-flex flexDirection="column" alignItems="center" gap="4">
        ${this.data.map(
          (e) => l`
            <wui-flex flexDirection="column" alignItems="center" gap="5">
              <wui-flex flexDirection="row" justifyContent="center" gap="1">
                ${e.images.map((i) => l`<wui-visual size="sm" name=${i}></wui-visual>`)}
              </wui-flex>
            </wui-flex>
            <wui-flex flexDirection="column" alignItems="center" gap="1">
              <wui-text variant="md-regular" color="primary" align="center">${e.title}</wui-text>
              <wui-text variant="sm-regular" color="secondary" align="center"
                >${e.text}</wui-text
              >
            </wui-flex>
          `
        )}
      </wui-flex>
    `;
  }
};
Vi([c({ type: Array })], Gt.prototype, 'data', void 0);
Gt = Vi([p('w3m-help-widget')], Gt);
var oo = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
const ro = [
  {
    images: ['login', 'profile', 'lock'],
    title: 'One login for all of web3',
    text: 'Log in to any app by connecting your wallet. Say goodbye to countless passwords!',
  },
  {
    images: ['defi', 'nft', 'eth'],
    title: 'A home for your digital assets',
    text: 'A wallet lets you store, send and receive digital assets like cryptocurrencies and NFTs.',
  },
  {
    images: ['browser', 'noun', 'dao'],
    title: 'Your gateway to a new web',
    text: 'With your wallet, you can explore and interact with DeFi, NFTs, DAOs, and much more.',
  },
];
let _i = class extends f {
  render() {
    return l`
      <wui-flex
        flexDirection="column"
        .padding=${['6', '5', '5', '5']}
        alignItems="center"
        gap="5"
      >
        <w3m-help-widget .data=${ro}></w3m-help-widget>
        <wui-button variant="accent-primary" size="md" @click=${this.onGetWallet.bind(this)}>
          <wui-icon color="inherit" slot="iconLeft" name="wallet"></wui-icon>
          Get a wallet
        </wui-button>
      </wui-flex>
    `;
  }
  onGetWallet() {
    (C.sendEvent({ type: 'track', event: 'CLICK_GET_WALLET_HELP' }), h.push('GetWallet'));
  }
};
_i = oo([p('w3m-what-is-a-wallet-view')], _i);
const so = $`
  wui-flex {
    max-height: clamp(360px, 540px, 80vh);
    overflow: scroll;
    scrollbar-width: none;
    transition: opacity ${({ durations: t }) => t.lg}
      ${({ easings: t }) => t['ease-out-power-2']};
    will-change: opacity;
  }
  wui-flex::-webkit-scrollbar {
    display: none;
  }
  wui-flex.disabled {
    opacity: 0.3;
    pointer-events: none;
    user-select: none;
  }
`;
var Hi = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let Wt = class extends f {
  constructor() {
    (super(),
      (this.unsubscribe = []),
      (this.checked = vt.state.isLegalCheckboxChecked),
      this.unsubscribe.push(
        vt.subscribeKey('isLegalCheckboxChecked', (e) => {
          this.checked = e;
        })
      ));
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((e) => e());
  }
  render() {
    const { termsConditionsUrl: e, privacyPolicyUrl: i } = b.state,
      o = b.state.features?.legalCheckbox,
      n = !!(e || i) && !!o,
      s = n && !this.checked,
      a = s ? -1 : void 0;
    return l`
      <w3m-legal-checkbox></w3m-legal-checkbox>
      <wui-flex
        flexDirection="column"
        .padding=${n ? ['0', '3', '3', '3'] : '3'}
        gap="2"
        class=${w(s ? 'disabled' : void 0)}
      >
        <w3m-wallet-login-list tabIdx=${w(a)}></w3m-wallet-login-list>
      </wui-flex>
    `;
  }
};
Wt.styles = so;
Hi([d()], Wt.prototype, 'checked', void 0);
Wt = Hi([p('w3m-connect-wallets-view')], Wt);
const ao = $`
  :host {
    display: block;
    width: 120px;
    height: 120px;
  }

  svg {
    width: 120px;
    height: 120px;
    fill: none;
    stroke: transparent;
    stroke-linecap: round;
  }

  use {
    stroke: ${(t) => t.colors.accent100};
    stroke-width: 2px;
    stroke-dasharray: 54, 118;
    stroke-dashoffset: 172;
    animation: dash 1s linear infinite;
  }

  @keyframes dash {
    to {
      stroke-dashoffset: 0px;
    }
  }
`;
var lo = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let Yt = class extends f {
  render() {
    return l`
      <svg viewBox="0 0 54 59">
        <path
          id="wui-loader-path"
          d="M17.22 5.295c3.877-2.277 5.737-3.363 7.72-3.726a11.44 11.44 0 0 1 4.12 0c1.983.363 3.844 1.45 7.72 3.726l6.065 3.562c3.876 2.276 5.731 3.372 7.032 4.938a11.896 11.896 0 0 1 2.06 3.63c.683 1.928.688 4.11.688 8.663v7.124c0 4.553-.005 6.735-.688 8.664a11.896 11.896 0 0 1-2.06 3.63c-1.3 1.565-3.156 2.66-7.032 4.937l-6.065 3.563c-3.877 2.276-5.737 3.362-7.72 3.725a11.46 11.46 0 0 1-4.12 0c-1.983-.363-3.844-1.449-7.72-3.726l-6.065-3.562c-3.876-2.276-5.731-3.372-7.032-4.938a11.885 11.885 0 0 1-2.06-3.63c-.682-1.928-.688-4.11-.688-8.663v-7.124c0-4.553.006-6.735.688-8.664a11.885 11.885 0 0 1 2.06-3.63c1.3-1.565 3.156-2.66 7.032-4.937l6.065-3.562Z"
        />
        <use xlink:href="#wui-loader-path"></use>
      </svg>
    `;
  }
};
Yt.styles = [I, ao];
Yt = lo([p('wui-loading-hexagon')], Yt);
const co = ne`
  @keyframes shake {
    0% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(3px);
    }
    50% {
      transform: translateX(-3px);
    }
    75% {
      transform: translateX(3px);
    }
    100% {
      transform: translateX(0);
    }
  }

  wui-flex:first-child:not(:only-child) {
    position: relative;
  }

  wui-loading-hexagon {
    position: absolute;
  }

  wui-icon-box {
    position: absolute;
    right: 4px;
    bottom: 0;
    opacity: 0;
    transform: scale(0.5);
    z-index: 1;
  }

  wui-button {
    display: none;
  }

  [data-error='true'] wui-icon-box {
    opacity: 1;
    transform: scale(1);
  }

  [data-error='true'] > wui-flex:first-child {
    animation: shake 250ms cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  }

  wui-button[data-retry='true'] {
    display: block;
    opacity: 1;
  }
`;
var li = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let ct = class extends f {
  constructor() {
    (super(),
      (this.network = h.state.data?.network),
      (this.unsubscribe = []),
      (this.showRetry = !1),
      (this.error = !1));
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((e) => e());
  }
  firstUpdated() {
    this.onSwitchNetwork();
  }
  render() {
    if (!this.network) throw new Error('w3m-network-switch-view: No network provided');
    this.onShowRetry();
    const e = this.getLabel(),
      i = this.getSubLabel();
    return l`
      <wui-flex
        data-error=${this.error}
        flexDirection="column"
        alignItems="center"
        .padding=${['10', '5', '10', '5']}
        gap="7"
      >
        <wui-flex justifyContent="center" alignItems="center">
          <wui-network-image
            size="lg"
            imageSrc=${w(E.getNetworkImage(this.network))}
          ></wui-network-image>

          ${this.error ? null : l`<wui-loading-hexagon></wui-loading-hexagon>`}

          <wui-icon-box color="error" icon="close" size="sm"></wui-icon-box>
        </wui-flex>

        <wui-flex flexDirection="column" alignItems="center" gap="2">
          <wui-text align="center" variant="h6-regular" color="primary">${e}</wui-text>
          <wui-text align="center" variant="md-regular" color="secondary">${i}</wui-text>
        </wui-flex>

        <wui-button
          data-retry=${this.showRetry}
          variant="accent-primary"
          size="md"
          .disabled=${!this.error}
          @click=${this.onSwitchNetwork.bind(this)}
        >
          <wui-icon color="inherit" slot="iconLeft" name="refresh"></wui-icon>
          Try again
        </wui-button>
      </wui-flex>
    `;
  }
  getSubLabel() {
    const e = g.getConnectorId(u.state.activeChain);
    return g.getAuthConnector() && e === k.CONNECTOR_ID.AUTH
      ? ''
      : this.error
        ? 'Switch can be declined if chain is not supported by a wallet or previous request is still active'
        : 'Accept connection request in your wallet';
  }
  getLabel() {
    const e = g.getConnectorId(u.state.activeChain);
    return g.getAuthConnector() && e === k.CONNECTOR_ID.AUTH
      ? `Switching to ${this.network?.name ?? 'Unknown'} network...`
      : this.error
        ? 'Switch declined'
        : 'Approve in wallet';
  }
  onShowRetry() {
    this.error &&
      !this.showRetry &&
      ((this.showRetry = !0),
      this.shadowRoot?.querySelector('wui-button')?.animate([{ opacity: 0 }, { opacity: 1 }], {
        fill: 'forwards',
        easing: 'ease',
      }));
  }
  async onSwitchNetwork() {
    try {
      ((this.error = !1),
        u.state.activeChain !== this.network?.chainNamespace && u.setIsSwitchingNamespace(!0),
        this.network && (await u.switchActiveNetwork(this.network)));
    } catch {
      this.error = !0;
    }
  }
};
ct.styles = co;
li([d()], ct.prototype, 'showRetry', void 0);
li([d()], ct.prototype, 'error', void 0);
ct = li([p('w3m-network-switch-view')], ct);
const uo = $`
  :host {
    width: 100%;
  }

  button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: ${({ spacing: t }) => t[3]};
    width: 100%;
    background-color: transparent;
    border-radius: ${({ borderRadius: t }) => t[4]};
  }

  wui-text {
    text-transform: capitalize;
  }

  @media (hover: hover) {
    button:hover:enabled {
      background-color: ${({ tokens: t }) => t.theme.foregroundPrimary};
    }
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
var bt = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let Me = class extends f {
  constructor() {
    (super(...arguments), (this.imageSrc = 'ethereum'), (this.name = 'Ethereum'), (this.disabled = !1));
  }
  render() {
    return l`
      <button ?disabled=${this.disabled} tabindex=${w(this.tabIdx)}>
        <wui-flex gap="2" alignItems="center">
          <wui-image ?boxed=${!0} src=${this.imageSrc}></wui-image>
          <wui-text variant="lg-regular" color="primary">${this.name}</wui-text>
        </wui-flex>
        <wui-icon name="chevronRight" size="lg" color="default"></wui-icon>
      </button>
    `;
  }
};
Me.styles = [I, T, uo];
bt([c()], Me.prototype, 'imageSrc', void 0);
bt([c()], Me.prototype, 'name', void 0);
bt([c()], Me.prototype, 'tabIdx', void 0);
bt([c({ type: Boolean })], Me.prototype, 'disabled', void 0);
Me = bt([p('wui-list-network')], Me);
const ho = ne`
  .container {
    max-height: 360px;
    overflow: auto;
  }

  .container::-webkit-scrollbar {
    display: none;
  }
`;
var gt = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let Ve = class extends f {
  constructor() {
    (super(),
      (this.unsubscribe = []),
      (this.network = u.state.activeCaipNetwork),
      (this.requestedCaipNetworks = u.getCaipNetworks()),
      (this.search = ''),
      (this.onDebouncedSearch = m.debounce((e) => {
        this.search = e;
      }, 100)),
      this.unsubscribe.push(
        Oe.subscribeNetworkImages(() => this.requestUpdate()),
        u.subscribeKey('activeCaipNetwork', (e) => (this.network = e)),
        u.subscribe(() => {
          this.requestedCaipNetworks = u.getAllRequestedCaipNetworks();
        })
      ));
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((e) => e());
  }
  render() {
    return l`
      ${this.templateSearchInput()}
      <wui-flex
        class="container"
        .padding=${['0', '3', '3', '3']}
        flexDirection="column"
        gap="2"
      >
        ${this.networksTemplate()}
      </wui-flex>
    `;
  }
  templateSearchInput() {
    return l`
      <wui-flex gap="2" .padding=${['0', '3', '3', '3']}>
        <wui-input-text
          @inputChange=${this.onInputChange.bind(this)}
          class="network-search-input"
          size="md"
          placeholder="Search network"
          icon="search"
        ></wui-input-text>
      </wui-flex>
    `;
  }
  onInputChange(e) {
    this.onDebouncedSearch(e.detail);
  }
  networksTemplate() {
    const e = u.getAllApprovedCaipNetworkIds(),
      i = m.sortRequestedNetworks(e, this.requestedCaipNetworks);
    return (
      this.search
        ? (this.filteredNetworks = i?.filter((o) => o?.name?.toLowerCase().includes(this.search.toLowerCase())))
        : (this.filteredNetworks = i),
      this.filteredNetworks?.map(
        (o) => l`
        <wui-list-network
          .selected=${this.network?.id === o.id}
          imageSrc=${w(E.getNetworkImage(o))}
          type="network"
          name=${o.name ?? o.id}
          @click=${() => this.onSwitchNetwork(o)}
          .disabled=${u.isCaipNetworkDisabled(o)}
          data-testid=${`w3m-network-switch-${o.name ?? o.id}`}
        ></wui-list-network>
      `
      )
    );
  }
  onSwitchNetwork(e) {
    Zi.onSwitchNetwork({ network: e });
  }
};
Ve.styles = ho;
gt([d()], Ve.prototype, 'network', void 0);
gt([d()], Ve.prototype, 'requestedCaipNetworks', void 0);
gt([d()], Ve.prototype, 'filteredNetworks', void 0);
gt([d()], Ve.prototype, 'search', void 0);
Ve = gt([p('w3m-networks-view')], Ve);
const po = $`
  @keyframes shake {
    0% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(3px);
    }
    50% {
      transform: translateX(-3px);
    }
    75% {
      transform: translateX(3px);
    }
    100% {
      transform: translateX(0);
    }
  }

  wui-flex:first-child:not(:only-child) {
    position: relative;
  }

  wui-loading-thumbnail {
    position: absolute;
  }

  wui-visual {
    border-radius: calc(
      ${({ borderRadius: t }) => t[1]} * 9 - ${({ borderRadius: t }) => t[3]}
    );
    position: relative;
    overflow: hidden;
  }

  wui-visual::after {
    content: '';
    display: block;
    width: 100%;
    height: 100%;
    position: absolute;
    inset: 0;
    border-radius: calc(
      ${({ borderRadius: t }) => t[1]} * 9 - ${({ borderRadius: t }) => t[3]}
    );
    box-shadow: inset 0 0 0 1px ${({ tokens: t }) => t.core.glass010};
  }

  wui-icon-box {
    position: absolute;
    right: calc(${({ spacing: t }) => t[1]} * -1);
    bottom: calc(${({ spacing: t }) => t[1]} * -1);
    opacity: 0;
    transform: scale(0.5);
    transition:
      opacity ${({ durations: t }) => t.lg} ${({ easings: t }) => t['ease-out-power-2']},
      transform ${({ durations: t }) => t.lg}
        ${({ easings: t }) => t['ease-out-power-2']};
    will-change: opacity, transform;
  }

  wui-text[align='center'] {
    width: 100%;
    padding: 0px ${({ spacing: t }) => t[4]};
  }

  [data-error='true'] wui-icon-box {
    opacity: 1;
    transform: scale(1);
  }

  [data-error='true'] > wui-flex:first-child {
    animation: shake 250ms ${({ easings: t }) => t['ease-out-power-2']} both;
  }

  [data-retry='false'] wui-link {
    display: none;
  }

  [data-retry='true'] wui-link {
    display: block;
    opacity: 1;
  }

  wui-link {
    padding: ${({ spacing: t }) => t['01']} ${({ spacing: t }) => t[2]};
  }

  .capitalize {
    text-transform: capitalize;
  }
`;
var qi = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
const wo = {
  eip155: 'eth',
  solana: 'solana',
  bip122: 'bitcoin',
  polkadot: void 0,
};
let Rt = class extends f {
  constructor() {
    (super(...arguments),
      (this.unsubscribe = []),
      (this.switchToChain = h.state.data?.switchToChain),
      (this.caipNetwork = h.state.data?.network),
      (this.activeChain = u.state.activeChain));
  }
  firstUpdated() {
    this.unsubscribe.push(u.subscribeKey('activeChain', (e) => (this.activeChain = e)));
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((e) => e());
  }
  render() {
    const e = this.switchToChain ? k.CHAIN_NAME_MAP[this.switchToChain] : 'supported';
    if (!this.switchToChain) return null;
    const i = k.CHAIN_NAME_MAP[this.switchToChain];
    return l`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        .padding=${['4', '2', '2', '2']}
        gap="4"
      >
        <wui-flex justifyContent="center" flexDirection="column" alignItems="center" gap="2">
          <wui-visual
            size="md"
            name=${w(wo[this.switchToChain])}
          ></wui-visual>
          <wui-flex gap="2" flexDirection="column" alignItems="center">
            <wui-text
              data-testid=${`w3m-switch-active-chain-to-${i}`}
              variant="lg-regular"
              color="primary"
              align="center"
              >Switch to <span class="capitalize">${i}</span></wui-text
            >
            <wui-text variant="md-regular" color="secondary" align="center">
              Connected wallet doesn't support connecting to ${e} chain. You
              need to connect with a different wallet.
            </wui-text>
          </wui-flex>
          <wui-button
            data-testid="w3m-switch-active-chain-button"
            size="md"
            @click=${this.switchActiveChain.bind(this)}
            >Switch</wui-button
          >
        </wui-flex>
      </wui-flex>
    `;
  }
  async switchActiveChain() {
    this.switchToChain &&
      (u.setIsSwitchingNamespace(!0),
      g.setFilterByNamespace(this.switchToChain),
      this.caipNetwork ? await u.switchActiveNetwork(this.caipNetwork) : u.setActiveNamespace(this.switchToChain),
      h.reset('Connect'));
  }
};
Rt.styles = po;
qi([c()], Rt.prototype, 'activeChain', void 0);
Rt = qi([p('w3m-switch-active-chain-view')], Rt);
var fo = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
const mo = [
  {
    images: ['network', 'layers', 'system'],
    title: 'The system’s nuts and bolts',
    text: 'A network is what brings the blockchain to life, as this technical infrastructure allows apps to access the ledger and smart contract services.',
  },
  {
    images: ['noun', 'defiAlt', 'dao'],
    title: 'Designed for different uses',
    text: 'Each network is designed differently, and may therefore suit certain apps and experiences.',
  },
];
let Ti = class extends f {
  render() {
    return l`
      <wui-flex
        flexDirection="column"
        .padding=${['6', '5', '5', '5']}
        alignItems="center"
        gap="5"
      >
        <w3m-help-widget .data=${mo}></w3m-help-widget>
        <wui-button
          variant="accent-primary"
          size="md"
          @click=${() => {
            m.openHref('https://ethereum.org/en/developers/docs/networks/', '_blank');
          }}
        >
          Learn more
          <wui-icon color="inherit" slot="iconRight" name="externalLink"></wui-icon>
        </wui-button>
      </wui-flex>
    `;
  }
};
Ti = fo([p('w3m-what-is-a-network-view')], Ti);
const bo = ne`
  :host > wui-flex {
    max-height: clamp(360px, 540px, 80vh);
    overflow: scroll;
    scrollbar-width: none;
  }

  :host > wui-flex::-webkit-scrollbar {
    display: none;
  }
`;
var ci = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let dt = class extends f {
  constructor() {
    (super(),
      (this.swapUnsupportedChain = h.state.data?.swapUnsupportedChain),
      (this.unsubscribe = []),
      (this.disconnecting = !1),
      (this.remoteFeatures = b.state.remoteFeatures),
      this.unsubscribe.push(
        Oe.subscribeNetworkImages(() => this.requestUpdate()),
        b.subscribeKey('remoteFeatures', (e) => {
          this.remoteFeatures = e;
        })
      ));
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((e) => e());
  }
  render() {
    return l`
      <wui-flex class="container" flexDirection="column" gap="0">
        <wui-flex
          class="container"
          flexDirection="column"
          .padding=${['3', '5', '2', '5']}
          alignItems="center"
          gap="5"
        >
          ${this.descriptionTemplate()}
        </wui-flex>

        <wui-flex flexDirection="column" padding="3" gap="2"> ${this.networksTemplate()} </wui-flex>

        <wui-separator text="or"></wui-separator>
        <wui-flex flexDirection="column" padding="3" gap="2">
          <wui-list-item
            variant="icon"
            iconVariant="overlay"
            icon="signOut"
            ?chevron=${!1}
            .loading=${this.disconnecting}
            @click=${this.onDisconnect.bind(this)}
            data-testid="disconnect-button"
          >
            <wui-text variant="md-medium" color="secondary">Disconnect</wui-text>
          </wui-list-item>
        </wui-flex>
      </wui-flex>
    `;
  }
  descriptionTemplate() {
    return this.swapUnsupportedChain
      ? l`
        <wui-text variant="sm-regular" color="secondary" align="center">
          The swap feature doesn’t support your current network. Switch to an available option to
          continue.
        </wui-text>
      `
      : l`
      <wui-text variant="sm-regular" color="secondary" align="center">
        This app doesn’t support your current network. Switch to an available option to continue.
      </wui-text>
    `;
  }
  networksTemplate() {
    const e = u.getAllRequestedCaipNetworks(),
      i = u.getAllApprovedCaipNetworkIds(),
      o = m.sortRequestedNetworks(i, e);
    return (this.swapUnsupportedChain ? o.filter((n) => N.SWAP_SUPPORTED_NETWORKS.includes(n.caipNetworkId)) : o).map(
      (n) => l`
        <wui-list-network
          imageSrc=${w(E.getNetworkImage(n))}
          name=${n.name ?? 'Unknown'}
          @click=${() => this.onSwitchNetwork(n)}
        >
        </wui-list-network>
      `
    );
  }
  async onDisconnect() {
    try {
      this.disconnecting = !0;
      const e = u.state.activeChain,
        o = y.getConnections(e).length > 0,
        r = e && g.state.activeConnectorIds[e],
        n = this.remoteFeatures?.multiWallet;
      (await y.disconnect(n ? { id: r, namespace: e } : {}),
        o && n && (h.push('ProfileWallets'), A.showSuccess('Wallet deleted')));
    } catch {
      (C.sendEvent({
        type: 'track',
        event: 'DISCONNECT_ERROR',
        properties: { message: 'Failed to disconnect' },
      }),
        A.showError('Failed to disconnect'));
    } finally {
      this.disconnecting = !1;
    }
  }
  async onSwitchNetwork(e) {
    const i = u.getActiveCaipAddress(),
      o = u.getAllApprovedCaipNetworkIds(),
      r = u.getNetworkProp('supportsAllNetworks', e.chainNamespace),
      n = h.state.data;
    i
      ? o?.includes(e.caipNetworkId)
        ? await u.switchActiveNetwork(e)
        : r
          ? h.push('SwitchNetwork', { ...n, network: e })
          : h.push('SwitchNetwork', { ...n, network: e })
      : i || (u.setActiveCaipNetwork(e), h.push('Connect'));
  }
};
dt.styles = bo;
ci([d()], dt.prototype, 'disconnecting', void 0);
ci([d()], dt.prototype, 'remoteFeatures', void 0);
dt = ci([p('w3m-unsupported-chain-view')], dt);
const go = $`
  wui-flex {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${({ spacing: t }) => t[2]};
    border-radius: ${({ borderRadius: t }) => t[4]};
    padding: ${({ spacing: t }) => t[3]};
  }

  /* -- Types --------------------------------------------------------- */
  wui-flex[data-type='info'] {
    color: ${({ tokens: t }) => t.theme.textSecondary};
    background-color: ${({ tokens: t }) => t.theme.foregroundPrimary};
  }

  wui-flex[data-type='success'] {
    color: ${({ tokens: t }) => t.core.textSuccess};
    background-color: ${({ tokens: t }) => t.core.backgroundSuccess};
  }

  wui-flex[data-type='error'] {
    color: ${({ tokens: t }) => t.core.textError};
    background-color: ${({ tokens: t }) => t.core.backgroundError};
  }

  wui-flex[data-type='warning'] {
    color: ${({ tokens: t }) => t.core.textWarning};
    background-color: ${({ tokens: t }) => t.core.backgroundWarning};
  }

  wui-flex[data-type='info'] wui-icon-box {
    background-color: ${({ tokens: t }) => t.theme.foregroundSecondary};
  }

  wui-flex[data-type='success'] wui-icon-box {
    background-color: ${({ tokens: t }) => t.core.backgroundSuccess};
  }

  wui-flex[data-type='error'] wui-icon-box {
    background-color: ${({ tokens: t }) => t.core.backgroundError};
  }

  wui-flex[data-type='warning'] wui-icon-box {
    background-color: ${({ tokens: t }) => t.core.backgroundWarning};
  }

  wui-text {
    flex: 1;
  }
`;
var jt = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let Qe = class extends f {
  constructor() {
    (super(...arguments), (this.icon = 'externalLink'), (this.text = ''), (this.type = 'info'));
  }
  render() {
    return l`
      <wui-flex alignItems="center" data-type=${this.type}>
        <wui-icon-box size="sm" color="inherit" icon=${this.icon}></wui-icon-box>
        <wui-text variant="md-regular" color="inherit">${this.text}</wui-text>
      </wui-flex>
    `;
  }
};
Qe.styles = [I, T, go];
jt([c()], Qe.prototype, 'icon', void 0);
jt([c()], Qe.prototype, 'text', void 0);
jt([c()], Qe.prototype, 'type', void 0);
Qe = jt([p('wui-banner')], Qe);
const yo = ne`
  :host > wui-flex {
    max-height: clamp(360px, 540px, 80vh);
    overflow: scroll;
    scrollbar-width: none;
  }

  :host > wui-flex::-webkit-scrollbar {
    display: none;
  }
`;
var vo = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let Xt = class extends f {
  constructor() {
    (super(), (this.unsubscribe = []));
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((e) => e());
  }
  render() {
    return l` <wui-flex flexDirection="column" .padding=${['2', '3', '3', '3']} gap="2">
      <wui-banner
        icon="warningCircle"
        text="You can only receive assets on these networks"
      ></wui-banner>
      ${this.networkTemplate()}
    </wui-flex>`;
  }
  networkTemplate() {
    const e = u.getAllRequestedCaipNetworks(),
      i = u.getAllApprovedCaipNetworkIds(),
      o = u.state.activeCaipNetwork,
      r = u.checkIfSmartAccountEnabled();
    let n = m.sortRequestedNetworks(i, e);
    if (r && Ae(o?.chainNamespace) === le.ACCOUNT_TYPES.SMART_ACCOUNT) {
      if (!o) return null;
      n = [o];
    }
    return n
      .filter((a) => a.chainNamespace === o?.chainNamespace)
      .map(
        (a) => l`
        <wui-list-network
          imageSrc=${w(E.getNetworkImage(a))}
          name=${a.name ?? 'Unknown'}
          ?transparent=${!0}
        >
        </wui-list-network>
      `
      );
  }
};
Xt.styles = yo;
Xt = vo([p('w3m-wallet-compatible-networks-view')], Xt);
const xo = $`
  :host {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 56px;
    height: 56px;
    box-shadow: 0 0 0 8px ${({ tokens: t }) => t.theme.borderPrimary};
    border-radius: ${({ borderRadius: t }) => t[4]};
    overflow: hidden;
  }

  :host([data-border-radius-full='true']) {
    border-radius: 50px;
  }

  wui-icon {
    width: 32px;
    height: 32px;
  }
`;
var Bt = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let Je = class extends f {
  render() {
    return ((this.dataset.borderRadiusFull = this.borderRadiusFull ? 'true' : 'false'), l`${this.templateVisual()}`);
  }
  templateVisual() {
    return this.imageSrc
      ? l`<wui-image src=${this.imageSrc} alt=${this.alt ?? ''}></wui-image>`
      : l`<wui-icon
      data-parent-size="md"
      size="inherit"
      color="inherit"
      name="wallet"
    ></wui-icon>`;
  }
};
Je.styles = [I, xo];
Bt([c()], Je.prototype, 'imageSrc', void 0);
Bt([c()], Je.prototype, 'alt', void 0);
Bt([c({ type: Boolean })], Je.prototype, 'borderRadiusFull', void 0);
Je = Bt([p('wui-visual-thumbnail')], Je);
const $o = $`
  :host {
    display: flex;
    justify-content: center;
    gap: ${({ spacing: t }) => t[4]};
  }

  wui-visual-thumbnail:nth-child(1) {
    z-index: 1;
  }
`;
var Co = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let Qt = class extends f {
  constructor() {
    (super(...arguments),
      (this.dappImageUrl = b.state.metadata?.icons),
      (this.walletImageUrl = u.getAccountData()?.connectedWalletInfo?.icon));
  }
  firstUpdated() {
    const e = this.shadowRoot?.querySelectorAll('wui-visual-thumbnail');
    (e?.[0] && this.createAnimation(e[0], 'translate(18px)'), e?.[1] && this.createAnimation(e[1], 'translate(-18px)'));
  }
  render() {
    return l`
      <wui-visual-thumbnail
        ?borderRadiusFull=${!0}
        .imageSrc=${this.dappImageUrl?.[0]}
      ></wui-visual-thumbnail>
      <wui-visual-thumbnail .imageSrc=${this.walletImageUrl}></wui-visual-thumbnail>
    `;
  }
  createAnimation(e, i) {
    e.animate([{ transform: 'translateX(0px)' }, { transform: i }], {
      duration: 1600,
      easing: 'cubic-bezier(0.56, 0, 0.48, 1)',
      direction: 'alternate',
      iterations: 1 / 0,
    });
  }
};
Qt.styles = $o;
Qt = Co([p('w3m-siwx-sign-message-thumbnails')], Qt);
var di = function (t, e, i, o) {
  var r = arguments.length,
    n = r < 3 ? e : o === null ? (o = Object.getOwnPropertyDescriptor(e, i)) : o,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') n = Reflect.decorate(t, e, i, o);
  else for (var a = t.length - 1; a >= 0; a--) (s = t[a]) && (n = (r < 3 ? s(n) : r > 3 ? s(e, i, n) : s(e, i)) || n);
  return (r > 3 && n && Object.defineProperty(e, i, n), n);
};
let Nt = class extends f {
  constructor() {
    (super(...arguments), (this.dappName = b.state.metadata?.name), (this.isCancelling = !1), (this.isSigning = !1));
  }
  render() {
    return l`
      <wui-flex justifyContent="center" .padding=${['8', '0', '6', '0']}>
        <w3m-siwx-sign-message-thumbnails></w3m-siwx-sign-message-thumbnails>
      </wui-flex>
      <wui-flex .padding=${['0', '20', '5', '20']} gap="3" justifyContent="space-between">
        <wui-text variant="lg-medium" align="center" color="primary"
          >${this.dappName ?? 'Dapp'} needs to connect to your wallet</wui-text
        >
      </wui-flex>
      <wui-flex .padding=${['0', '10', '4', '10']} gap="3" justifyContent="space-between">
        <wui-text variant="md-regular" align="center" color="secondary"
          >Sign this message to prove you own this wallet and proceed. Canceling will disconnect
          you.</wui-text
        >
      </wui-flex>
      <wui-flex .padding=${['4', '5', '5', '5']} gap="3" justifyContent="space-between">
        <wui-button
          size="lg"
          borderRadius="xs"
          fullWidth
          variant="neutral-secondary"
          ?loading=${this.isCancelling}
          @click=${this.onCancel.bind(this)}
          data-testid="w3m-connecting-siwe-cancel"
        >
          ${this.isCancelling ? 'Cancelling...' : 'Cancel'}
        </wui-button>
        <wui-button
          size="lg"
          borderRadius="xs"
          fullWidth
          variant="neutral-primary"
          @click=${this.onSign.bind(this)}
          ?loading=${this.isSigning}
          data-testid="w3m-connecting-siwe-sign"
        >
          ${this.isSigning ? 'Signing...' : 'Sign'}
        </wui-button>
      </wui-flex>
    `;
  }
  async onSign() {
    this.isSigning = !0;
    try {
      await ui.requestSignMessage();
    } catch (e) {
      if (e instanceof Error && e.message.includes('OTP is required')) {
        (A.showError({
          message: 'Something went wrong. We need to verify your account again.',
        }),
          h.replace('DataCapture'));
        return;
      }
      throw e;
    } finally {
      this.isSigning = !1;
    }
  }
  async onCancel() {
    ((this.isCancelling = !0), await ui.cancelSignMessage().finally(() => (this.isCancelling = !1)));
  }
};
di([d()], Nt.prototype, 'isCancelling', void 0);
di([d()], Nt.prototype, 'isSigning', void 0);
Nt = di([p('w3m-siwx-sign-message-view')], Nt);
export {
  pi as AppKitAccountButton,
  fi as AppKitButton,
  bi as AppKitConnectButton,
  yi as AppKitNetworkButton,
  hi as W3mAccountButton,
  ce as W3mAccountSettingsView,
  Ht as W3mAccountView,
  St as W3mAllWalletsView,
  wi as W3mButton,
  Tt as W3mChooseAccountNameView,
  mi as W3mConnectButton,
  q as W3mConnectView,
  Wt as W3mConnectWalletsView,
  Ci as W3mConnectingExternalView,
  Et as W3mConnectingMultiChainView,
  _t as W3mConnectingWcBasicView,
  $e as W3mConnectingWcView,
  Ai as W3mDownloadsView,
  Ss as W3mFooter,
  Ii as W3mGetWalletView,
  gi as W3mNetworkButton,
  ct as W3mNetworkSwitchView,
  Ve as W3mNetworksView,
  B as W3mProfileWalletsView,
  ks as W3mRouter,
  Nt as W3mSIWXSignMessageView,
  Rt as W3mSwitchActiveChainView,
  dt as W3mUnsupportedChainView,
  Xt as W3mWalletCompatibleNetworksView,
  Ti as W3mWhatIsANetworkView,
  _i as W3mWhatIsAWalletView,
};
//# sourceMappingURL=index-qx1qb7fz.mjs.map
