import {
  k as g,
  r as v,
  l as $,
  m as k,
  x as l,
  C as c,
  S as p,
  K as m,
  T as b,
  t as C,
  W as N,
  R,
  a as A,
} from './index-CgrbEUSl.mjs';
import { n as x, c as y, U as S, r as h } from './index-D1vJKCDW.mjs';
import { o as I } from './if-defined-DgIoGpc1.mjs';
import './index-DIEZAM9s.mjs';
import './index-CZQgiEVa.mjs';
const T = g`
  button {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${({ spacing: e }) => e[4]};
    background-color: ${({ tokens: e }) => e.theme.foregroundPrimary};
    border-radius: ${({ borderRadius: e }) => e[3]};
    border: none;
    padding: ${({ spacing: e }) => e[3]};
    transition: background-color ${({ durations: e }) => e.lg}
      ${({ easings: e }) => e['ease-out-power-2']};
    will-change: background-color;
  }

  /* -- Hover & Active states ----------------------------------------------------------- */
  button:hover:enabled,
  button:active:enabled {
    background-color: ${({ tokens: e }) => e.theme.foregroundSecondary};
  }

  wui-text {
    flex: 1;
    color: ${({ tokens: e }) => e.theme.textSecondary};
  }

  wui-flex {
    width: auto;
    display: flex;
    align-items: center;
    gap: ${({ spacing: e }) => e['01']};
  }

  wui-icon {
    color: ${({ tokens: e }) => e.theme.iconDefault};
  }

  .network-icon {
    position: relative;
    width: 20px;
    height: 20px;
    border-radius: ${({ borderRadius: e }) => e[4]};
    overflow: hidden;
    margin-left: -8px;
  }

  .network-icon:first-child {
    margin-left: 0px;
  }

  .network-icon:after {
    position: absolute;
    inset: 0;
    content: '';
    display: block;
    height: 100%;
    width: 100%;
    border-radius: ${({ borderRadius: e }) => e[4]};
    box-shadow: inset 0 0 0 1px ${({ tokens: e }) => e.core.glass010};
  }
`;
var f = function (e, t, o, r) {
  var n = arguments.length,
    i = n < 3 ? t : r === null ? (r = Object.getOwnPropertyDescriptor(t, o)) : r,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') i = Reflect.decorate(e, t, o, r);
  else for (var a = e.length - 1; a >= 0; a--) (s = e[a]) && (i = (n < 3 ? s(i) : n > 3 ? s(t, o, i) : s(t, o)) || i);
  return (n > 3 && i && Object.defineProperty(t, o, i), i);
};
let d = class extends k {
  constructor() {
    (super(...arguments), (this.networkImages = ['']), (this.text = ''));
  }
  render() {
    return l`
      <button>
        <wui-text variant="md-regular" color="inherit">${this.text}</wui-text>
        <wui-flex>
          ${this.networksTemplate()}
          <wui-icon name="chevronRight" size="sm" color="inherit"></wui-icon>
        </wui-flex>
      </button>
    `;
  }
  networksTemplate() {
    const t = this.networkImages.slice(0, 5);
    return l` <wui-flex class="networks">
      ${t?.map((o) => l` <wui-flex class="network-icon"> <wui-image src=${o}></wui-image> </wui-flex>`)}
    </wui-flex>`;
  }
};
d.styles = [v, $, T];
f([x({ type: Array })], d.prototype, 'networkImages', void 0);
f([x()], d.prototype, 'text', void 0);
d = f([y('wui-compatible-network')], d);
const O = g`
  wui-compatible-network {
    margin-top: ${({ spacing: e }) => e[4]};
    width: 100%;
  }

  wui-qr-code {
    width: unset !important;
    height: unset !important;
  }

  wui-icon {
    align-items: normal;
  }
`;
var w = function (e, t, o, r) {
  var n = arguments.length,
    i = n < 3 ? t : r === null ? (r = Object.getOwnPropertyDescriptor(t, o)) : r,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') i = Reflect.decorate(e, t, o, r);
  else for (var a = e.length - 1; a >= 0; a--) (s = e[a]) && (i = (n < 3 ? s(i) : n > 3 ? s(t, o, i) : s(t, o)) || i);
  return (n > 3 && i && Object.defineProperty(t, o, i), i);
};
let u = class extends k {
  constructor() {
    (super(),
      (this.unsubscribe = []),
      (this.address = c.getAccountData()?.address),
      (this.profileName = c.getAccountData()?.profileName),
      (this.network = c.state.activeCaipNetwork),
      this.unsubscribe.push(
        c.subscribeChainProp('accountState', (t) => {
          t ? ((this.address = t.address), (this.profileName = t.profileName)) : p.showError('Account not found');
        }),
        c.subscribeKey('activeCaipNetwork', (t) => {
          t?.id && (this.network = t);
        })
      ));
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((t) => t());
  }
  render() {
    if (!this.address) throw new Error('w3m-wallet-receive-view: No account provided');
    const t = m.getNetworkImage(this.network);
    return l` <wui-flex
      flexDirection="column"
      .padding=${['0', '4', '4', '4']}
      alignItems="center"
    >
      <wui-chip-button
        data-testid="receive-address-copy-button"
        @click=${this.onCopyClick.bind(this)}
        text=${S.getTruncateString({
          string: this.profileName || this.address || '',
          charsStart: this.profileName ? 18 : 4,
          charsEnd: this.profileName ? 0 : 4,
          truncate: this.profileName ? 'end' : 'middle',
        })}
        icon="copy"
        size="sm"
        imageSrc=${t || ''}
        variant="gray"
      ></wui-chip-button>
      <wui-flex
        flexDirection="column"
        .padding=${['4', '0', '0', '0']}
        alignItems="center"
        gap="4"
      >
        <wui-qr-code
          size=${232}
          theme=${b.state.themeMode}
          uri=${this.address}
          ?arenaClear=${!0}
          color=${I(b.state.themeVariables['--w3m-qr-color'])}
          data-testid="wui-qr-code"
        ></wui-qr-code>
        <wui-text variant="lg-regular" color="primary" align="center">
          Copy your address or scan this QR code
        </wui-text>
        <wui-button @click=${this.onCopyClick.bind(this)} size="sm" variant="neutral-secondary">
          <wui-icon slot="iconLeft" size="sm" color="inherit" name="copy"></wui-icon>
          <wui-text variant="md-regular" color="inherit">Copy address</wui-text>
        </wui-button>
      </wui-flex>
      ${this.networkTemplate()}
    </wui-flex>`;
  }
  networkTemplate() {
    const t = c.getAllRequestedCaipNetworks(),
      o = c.checkIfSmartAccountEnabled(),
      r = c.state.activeCaipNetwork,
      n = t.filter((a) => a?.chainNamespace === r?.chainNamespace);
    if (C(r?.chainNamespace) === N.ACCOUNT_TYPES.SMART_ACCOUNT && o)
      return r
        ? l`<wui-compatible-network
        @click=${this.onReceiveClick.bind(this)}
        text="Only receive assets on this network"
        .networkImages=${[m.getNetworkImage(r) ?? '']}
      ></wui-compatible-network>`
        : null;
    const s = n
      ?.filter((a) => a?.assets?.imageId)
      ?.slice(0, 5)
      .map(m.getNetworkImage)
      .filter(Boolean);
    return l`<wui-compatible-network
      @click=${this.onReceiveClick.bind(this)}
      text="Only receive assets on these networks"
      .networkImages=${s}
    ></wui-compatible-network>`;
  }
  onReceiveClick() {
    R.push('WalletCompatibleNetworks');
  }
  onCopyClick() {
    try {
      this.address && (A.copyToClopboard(this.address), p.showSuccess('Address copied'));
    } catch {
      p.showError('Failed to copy');
    }
  }
};
u.styles = O;
w([h()], u.prototype, 'address', void 0);
w([h()], u.prototype, 'profileName', void 0);
w([h()], u.prototype, 'network', void 0);
u = w([y('w3m-wallet-receive-view')], u);
export { u as W3mWalletReceiveView };
//# sourceMappingURL=receive-BVWuKFYu.mjs.map
