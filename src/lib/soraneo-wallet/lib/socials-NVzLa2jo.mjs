import {
  k as L,
  m as O,
  z as P,
  O as h,
  R as w,
  d as W,
  x as c,
  a as b,
  X as T,
  A as U,
  C as l,
  o as S,
  J as F,
  E as u,
  P as R,
  S as v,
  Y as D,
  M as A,
  T as $,
} from './index-CgrbEUSl.mjs';
import { n as N, r as d, c as _ } from './index-D1vJKCDW.mjs';
import { o as x } from './if-defined-DgIoGpc1.mjs';
import { O as I } from './index-BikJzTW8.mjs';
import { e as j } from './index-CC0ezhfo.mjs';
import './index-v0YluuaR.mjs';
import './index-CkAsfbcC.mjs';
import './index-CbYcNY2E.mjs';
import './index-CZQgiEVa.mjs';
import './index-C3dyjDT6.mjs';
const M = L`
  :host {
    margin-top: ${({ spacing: t }) => t[1]};
  }
  wui-separator {
    margin: ${({ spacing: t }) => t[3]} calc(${({ spacing: t }) => t[3]} * -1)
      ${({ spacing: t }) => t[2]} calc(${({ spacing: t }) => t[3]} * -1);
    width: calc(100% + ${({ spacing: t }) => t[3]} * 2);
  }
`;
var C = function (t, e, i, r) {
  var s = arguments.length,
    o = s < 3 ? e : r === null ? (r = Object.getOwnPropertyDescriptor(e, i)) : r,
    n;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') o = Reflect.decorate(t, e, i, r);
  else for (var a = t.length - 1; a >= 0; a--) (n = t[a]) && (o = (s < 3 ? n(o) : s > 3 ? n(e, i, o) : n(e, i)) || o);
  return (s > 3 && o && Object.defineProperty(e, i, o), o);
};
let m = class extends O {
  constructor() {
    (super(),
      (this.unsubscribe = []),
      (this.tabIdx = void 0),
      (this.connectors = P.state.connectors),
      (this.authConnector = this.connectors.find((e) => e.type === 'AUTH')),
      (this.remoteFeatures = h.state.remoteFeatures),
      (this.isPwaLoading = !1),
      this.unsubscribe.push(
        P.subscribeKey('connectors', (e) => {
          ((this.connectors = e), (this.authConnector = this.connectors.find((i) => i.type === 'AUTH')));
        }),
        h.subscribeKey('remoteFeatures', (e) => (this.remoteFeatures = e))
      ));
  }
  connectedCallback() {
    (super.connectedCallback(), this.handlePwaFrameLoad());
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((e) => e());
  }
  render() {
    let e = this.remoteFeatures?.socials || [];
    const i = !!this.authConnector,
      r = e?.length,
      s = w.state.view === 'ConnectSocials';
    return (!i || !r) && !s
      ? null
      : (s && !r && (e = W.DEFAULT_SOCIALS),
        c` <wui-flex flexDirection="column" gap="2">
      ${e.map(
        (o) => c`<wui-list-social
            @click=${() => {
              this.onSocialClick(o);
            }}
            data-testid=${`social-selector-${o}`}
            name=${o}
            logo=${o}
            ?disabled=${this.isPwaLoading}
          ></wui-list-social>`
      )}
    </wui-flex>`);
  }
  async onSocialClick(e) {
    e && (await j(e));
  }
  async handlePwaFrameLoad() {
    if (b.isPWA()) {
      this.isPwaLoading = !0;
      try {
        this.authConnector?.provider instanceof T && (await this.authConnector.provider.init());
      } catch (e) {
        U.open(
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
};
m.styles = M;
C([N()], m.prototype, 'tabIdx', void 0);
C([d()], m.prototype, 'connectors', void 0);
C([d()], m.prototype, 'authConnector', void 0);
C([d()], m.prototype, 'remoteFeatures', void 0);
C([d()], m.prototype, 'isPwaLoading', void 0);
m = C([_('w3m-social-login-list')], m);
const z = L`
  wui-flex {
    max-height: clamp(360px, 540px, 80vh);
    overflow: scroll;
    scrollbar-width: none;
    transition: opacity ${({ durations: t }) => t.md}
      ${({ easings: t }) => t['ease-out-power-1']};
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
var k = function (t, e, i, r) {
  var s = arguments.length,
    o = s < 3 ? e : r === null ? (r = Object.getOwnPropertyDescriptor(e, i)) : r,
    n;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') o = Reflect.decorate(t, e, i, r);
  else for (var a = t.length - 1; a >= 0; a--) (n = t[a]) && (o = (s < 3 ? n(o) : s > 3 ? n(e, i, o) : n(e, i)) || o);
  return (s > 3 && o && Object.defineProperty(e, i, o), o);
};
let E = class extends O {
  constructor() {
    (super(),
      (this.unsubscribe = []),
      (this.checked = I.state.isLegalCheckboxChecked),
      this.unsubscribe.push(
        I.subscribeKey('isLegalCheckboxChecked', (e) => {
          this.checked = e;
        })
      ));
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((e) => e());
  }
  render() {
    const { termsConditionsUrl: e, privacyPolicyUrl: i } = h.state,
      r = h.state.features?.legalCheckbox,
      n = !!(e || i) && !!r && !this.checked,
      a = n ? -1 : void 0;
    return c`
      <w3m-legal-checkbox></w3m-legal-checkbox>
      <wui-flex
        flexDirection="column"
        .padding=${['0', '3', '3', '3']}
        gap="01"
        class=${x(n ? 'disabled' : void 0)}
      >
        <w3m-social-login-list tabIdx=${x(a)}></w3m-social-login-list>
      </wui-flex>
    `;
  }
};
E.styles = z;
k([d()], E.prototype, 'checked', void 0);
E = k([_('w3m-connect-socials-view')], E);
const q = L`
  wui-logo {
    width: 80px;
    height: 80px;
    border-radius: ${({ borderRadius: t }) => t[8]};
  }
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
  wui-icon-box {
    position: absolute;
    right: calc(${({ spacing: t }) => t[1]} * -1);
    bottom: calc(${({ spacing: t }) => t[1]} * -1);
    opacity: 0;
    transform: scale(0.5);
    transition: all ${({ easings: t }) => t['ease-out-power-2']}
      ${({ durations: t }) => t.lg};
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
  .capitalize {
    text-transform: capitalize;
  }
`;
var g = function (t, e, i, r) {
  var s = arguments.length,
    o = s < 3 ? e : r === null ? (r = Object.getOwnPropertyDescriptor(e, i)) : r,
    n;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') o = Reflect.decorate(t, e, i, r);
  else for (var a = t.length - 1; a >= 0; a--) (n = t[a]) && (o = (s < 3 ? n(o) : s > 3 ? n(e, i, o) : n(e, i)) || o);
  return (s > 3 && o && Object.defineProperty(e, i, o), o);
};
let p = class extends O {
  constructor() {
    (super(),
      (this.unsubscribe = []),
      (this.socialProvider = l.getAccountData()?.socialProvider),
      (this.socialWindow = l.getAccountData()?.socialWindow),
      (this.error = !1),
      (this.connecting = !1),
      (this.message = 'Connect in the provider window'),
      (this.remoteFeatures = h.state.remoteFeatures),
      (this.address = l.getAccountData()?.address),
      (this.connectionsByNamespace = S.getConnections(l.state.activeChain)),
      (this.hasMultipleConnections = this.connectionsByNamespace.length > 0),
      (this.authConnector = P.getAuthConnector()),
      (this.handleSocialConnection = async (i) => {
        if (i.data?.resultUri)
          if (i.origin === F.SECURE_SITE_ORIGIN) {
            window.removeEventListener('message', this.handleSocialConnection, !1);
            try {
              if (this.authConnector && !this.connecting) {
                (this.socialWindow &&
                  (this.socialWindow.close(), l.setAccountProp('socialWindow', void 0, l.state.activeChain)),
                  (this.connecting = !0),
                  this.updateMessage());
                const r = i.data.resultUri;
                (this.socialProvider &&
                  u.sendEvent({
                    type: 'track',
                    event: 'SOCIAL_LOGIN_REQUEST_USER_DATA',
                    properties: { provider: this.socialProvider },
                  }),
                  await S.connectExternal(
                    {
                      id: this.authConnector.id,
                      type: this.authConnector.type,
                      socialUri: r,
                    },
                    this.authConnector.chain
                  ),
                  this.socialProvider &&
                    (R.setConnectedSocialProvider(this.socialProvider),
                    u.sendEvent({
                      type: 'track',
                      event: 'SOCIAL_LOGIN_SUCCESS',
                      properties: { provider: this.socialProvider },
                    })));
              }
            } catch (r) {
              ((this.error = !0),
                this.updateMessage(),
                this.socialProvider &&
                  u.sendEvent({
                    type: 'track',
                    event: 'SOCIAL_LOGIN_ERROR',
                    properties: {
                      provider: this.socialProvider,
                      message: b.parseError(r),
                    },
                  }));
            }
          } else
            (w.goBack(),
              v.showError('Untrusted Origin'),
              this.socialProvider &&
                u.sendEvent({
                  type: 'track',
                  event: 'SOCIAL_LOGIN_ERROR',
                  properties: {
                    provider: this.socialProvider,
                    message: 'Untrusted Origin',
                  },
                }));
      }),
      D.EmbeddedWalletAbortController.signal.addEventListener('abort', () => {
        this.socialWindow && (this.socialWindow.close(), l.setAccountProp('socialWindow', void 0, l.state.activeChain));
      }),
      this.unsubscribe.push(
        l.subscribeChainProp('accountState', (i) => {
          if (
            i &&
            ((this.socialProvider = i.socialProvider),
            i.socialWindow && (this.socialWindow = i.socialWindow),
            i.address)
          ) {
            const r = this.remoteFeatures?.multiWallet;
            i.address !== this.address &&
              (this.hasMultipleConnections && r
                ? (w.replace('ProfileWallets'), v.showSuccess('New Wallet Added'), (this.address = i.address))
                : (A.state.open || h.state.enableEmbedded) && A.close());
          }
        }),
        h.subscribeKey('remoteFeatures', (i) => {
          this.remoteFeatures = i;
        })
      ),
      this.authConnector && this.connectSocial());
  }
  disconnectedCallback() {
    (this.unsubscribe.forEach((i) => i()),
      window.removeEventListener('message', this.handleSocialConnection, !1),
      !l.state.activeCaipAddress &&
        this.socialProvider &&
        !this.connecting &&
        u.sendEvent({
          type: 'track',
          event: 'SOCIAL_LOGIN_CANCELED',
          properties: { provider: this.socialProvider },
        }),
      this.socialWindow?.close(),
      l.setAccountProp('socialWindow', void 0, l.state.activeChain));
  }
  render() {
    return c`
      <wui-flex
        data-error=${x(this.error)}
        flexDirection="column"
        alignItems="center"
        .padding=${['10', '5', '5', '5']}
        gap="6"
      >
        <wui-flex justifyContent="center" alignItems="center">
          <wui-logo logo=${x(this.socialProvider)}></wui-logo>
          ${this.error ? null : this.loaderTemplate()}
          <wui-icon-box color="error" icon="close" size="sm"></wui-icon-box>
        </wui-flex>
        <wui-flex flexDirection="column" alignItems="center" gap="2">
          <wui-text align="center" variant="lg-medium" color="primary"
            >Log in with
            <span class="capitalize">${this.socialProvider ?? 'Social'}</span></wui-text
          >
          <wui-text align="center" variant="lg-regular" color=${this.error ? 'error' : 'secondary'}
            >${this.message}</wui-text
          ></wui-flex
        >
      </wui-flex>
    `;
  }
  loaderTemplate() {
    const e = $.state.themeVariables['--w3m-border-radius-master'],
      i = e ? parseInt(e.replace('px', ''), 10) : 4;
    return c`<wui-loading-thumbnail radius=${i * 9}></wui-loading-thumbnail>`;
  }
  connectSocial() {
    const e = setInterval(() => {
      this.socialWindow?.closed &&
        (!this.connecting && w.state.view === 'ConnectingSocial' && w.goBack(), clearInterval(e));
    }, 1e3);
    window.addEventListener('message', this.handleSocialConnection, !1);
  }
  updateMessage() {
    this.error
      ? (this.message = 'Something went wrong')
      : this.connecting
        ? (this.message = 'Retrieving user data')
        : (this.message = 'Connect in the provider window');
  }
};
p.styles = q;
g([d()], p.prototype, 'socialProvider', void 0);
g([d()], p.prototype, 'socialWindow', void 0);
g([d()], p.prototype, 'error', void 0);
g([d()], p.prototype, 'connecting', void 0);
g([d()], p.prototype, 'message', void 0);
g([d()], p.prototype, 'remoteFeatures', void 0);
p = g([_('w3m-connecting-social-view')], p);
const B = L`
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

  wui-logo {
    width: 80px;
    height: 80px;
    border-radius: ${({ borderRadius: t }) => t[8]};
  }

  wui-flex:first-child:not(:only-child) {
    position: relative;
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
    transition:
      opacity ${({ durations: t }) => t.lg} ${({ easings: t }) => t['ease-out-power-2']},
      transform ${({ durations: t }) => t.lg}
        ${({ easings: t }) => t['ease-out-power-2']};
    will-change: opacity, transform;
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
var y = function (t, e, i, r) {
  var s = arguments.length,
    o = s < 3 ? e : r === null ? (r = Object.getOwnPropertyDescriptor(e, i)) : r,
    n;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') o = Reflect.decorate(t, e, i, r);
  else for (var a = t.length - 1; a >= 0; a--) (n = t[a]) && (o = (s < 3 ? n(o) : s > 3 ? n(e, i, o) : n(e, i)) || o);
  return (s > 3 && o && Object.defineProperty(e, i, o), o);
};
let f = class extends O {
  constructor() {
    (super(),
      (this.unsubscribe = []),
      (this.timeout = void 0),
      (this.socialProvider = l.getAccountData()?.socialProvider),
      (this.uri = l.getAccountData()?.farcasterUrl),
      (this.ready = !1),
      (this.loading = !1),
      (this.remoteFeatures = h.state.remoteFeatures),
      (this.authConnector = P.getAuthConnector()),
      (this.forceUpdate = () => {
        this.requestUpdate();
      }),
      this.unsubscribe.push(
        l.subscribeChainProp('accountState', (e) => {
          ((this.socialProvider = e?.socialProvider), (this.uri = e?.farcasterUrl), this.connectFarcaster());
        }),
        h.subscribeKey('remoteFeatures', (e) => {
          this.remoteFeatures = e;
        })
      ),
      window.addEventListener('resize', this.forceUpdate));
  }
  disconnectedCallback() {
    (super.disconnectedCallback(),
      clearTimeout(this.timeout),
      window.removeEventListener('resize', this.forceUpdate),
      !l.state.activeCaipAddress &&
        this.socialProvider &&
        (this.uri || this.loading) &&
        u.sendEvent({
          type: 'track',
          event: 'SOCIAL_LOGIN_CANCELED',
          properties: { provider: this.socialProvider },
        }));
  }
  render() {
    return (this.onRenderProxy(), c`${this.platformTemplate()}`);
  }
  platformTemplate() {
    return b.isMobile() ? c`${this.mobileTemplate()}` : c`${this.desktopTemplate()}`;
  }
  desktopTemplate() {
    return this.loading ? c`${this.loadingTemplate()}` : c`${this.qrTemplate()}`;
  }
  qrTemplate() {
    return c` <wui-flex
      flexDirection="column"
      alignItems="center"
      .padding=${['0', '5', '5', '5']}
      gap="5"
    >
      <wui-shimmer width="100%"> ${this.qrCodeTemplate()} </wui-shimmer>

      <wui-text variant="lg-medium" color="primary"> Scan this QR Code with your phone </wui-text>
      ${this.copyTemplate()}
    </wui-flex>`;
  }
  loadingTemplate() {
    return c`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        .padding=${['5', '5', '5', '5']}
        gap="5"
      >
        <wui-flex justifyContent="center" alignItems="center">
          <wui-logo logo="farcaster"></wui-logo>
          ${this.loaderTemplate()}
          <wui-icon-box color="error" icon="close" size="sm"></wui-icon-box>
        </wui-flex>
        <wui-flex flexDirection="column" alignItems="center" gap="2">
          <wui-text align="center" variant="md-medium" color="primary">
            Loading user data
          </wui-text>
          <wui-text align="center" variant="sm-regular" color="secondary">
            Please wait a moment while we load your data.
          </wui-text>
        </wui-flex>
      </wui-flex>
    `;
  }
  mobileTemplate() {
    return c` <wui-flex
      flexDirection="column"
      alignItems="center"
      .padding=${['10', '5', '5', '5']}
      gap="5"
    >
      <wui-flex justifyContent="center" alignItems="center">
        <wui-logo logo="farcaster"></wui-logo>
        ${this.loaderTemplate()}
        <wui-icon-box
          color="error"
          icon="close"
          size="sm"
        ></wui-icon-box>
      </wui-flex>
      <wui-flex flexDirection="column" alignItems="center" gap="2">
        <wui-text align="center" variant="md-medium" color="primary"
          >Continue in Farcaster</span></wui-text
        >
        <wui-text align="center" variant="sm-regular" color="secondary"
          >Accept connection request in the app</wui-text
        ></wui-flex
      >
      ${this.mobileLinkTemplate()}
    </wui-flex>`;
  }
  loaderTemplate() {
    const e = $.state.themeVariables['--w3m-border-radius-master'],
      i = e ? parseInt(e.replace('px', ''), 10) : 4;
    return c`<wui-loading-thumbnail radius=${i * 9}></wui-loading-thumbnail>`;
  }
  async connectFarcaster() {
    if (this.authConnector)
      try {
        (await this.authConnector?.provider.connectFarcaster(),
          this.socialProvider &&
            (R.setConnectedSocialProvider(this.socialProvider),
            u.sendEvent({
              type: 'track',
              event: 'SOCIAL_LOGIN_REQUEST_USER_DATA',
              properties: { provider: this.socialProvider },
            })),
          (this.loading = !0));
        const i = S.getConnections(this.authConnector.chain).length > 0;
        await S.connectExternal(this.authConnector, this.authConnector.chain);
        const r = this.remoteFeatures?.multiWallet;
        (this.socialProvider &&
          u.sendEvent({
            type: 'track',
            event: 'SOCIAL_LOGIN_SUCCESS',
            properties: { provider: this.socialProvider },
          }),
          (this.loading = !1),
          i && r ? (w.replace('ProfileWallets'), v.showSuccess('New Wallet Added')) : A.close());
      } catch (e) {
        (this.socialProvider &&
          u.sendEvent({
            type: 'track',
            event: 'SOCIAL_LOGIN_ERROR',
            properties: { provider: this.socialProvider, message: b.parseError(e) },
          }),
          w.goBack(),
          v.showError(e));
      }
  }
  mobileLinkTemplate() {
    return c`<wui-button
      size="md"
      ?loading=${this.loading}
      ?disabled=${!this.uri || this.loading}
      @click=${() => {
        this.uri && b.openHref(this.uri, '_blank');
      }}
    >
      Open farcaster</wui-button
    >`;
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
    const e = this.getBoundingClientRect().width - 40;
    return c` <wui-qr-code
      size=${e}
      theme=${$.state.themeMode}
      uri=${this.uri}
      ?farcaster=${!0}
      data-testid="wui-qr-code"
      color=${x($.state.themeVariables['--w3m-qr-color'])}
    ></wui-qr-code>`;
  }
  copyTemplate() {
    const e = !this.uri || !this.ready;
    return c`<wui-button
      .disabled=${e}
      @click=${this.onCopyUri}
      variant="neutral-secondary"
      size="sm"
      data-testid="copy-wc2-uri"
    >
      <wui-icon size="sm" color="default" slot="iconRight" name="copy"></wui-icon>
      Copy link
    </wui-button>`;
  }
  onCopyUri() {
    try {
      this.uri && (b.copyToClopboard(this.uri), v.showSuccess('Link copied'));
    } catch {
      v.showError('Failed to copy');
    }
  }
};
f.styles = B;
y([d()], f.prototype, 'socialProvider', void 0);
y([d()], f.prototype, 'uri', void 0);
y([d()], f.prototype, 'ready', void 0);
y([d()], f.prototype, 'loading', void 0);
y([d()], f.prototype, 'remoteFeatures', void 0);
f = y([_('w3m-connecting-farcaster-view')], f);
export { E as W3mConnectSocialsView, f as W3mConnectingFarcasterView, p as W3mConnectingSocialView };
//# sourceMappingURL=socials-NVzLa2jo.mjs.map
