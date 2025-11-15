import {
  n as U,
  m as h,
  M as P,
  O as H,
  x as c,
  z as V,
  T as k,
  a0 as F,
  k as R,
  r as z,
  l as B,
  d as E,
  a1 as w,
  C as v,
  a as I,
  q as D,
  E as C,
  t as _,
  W as A,
  S as Y,
  R as K,
} from './index-CgrbEUSl.mjs';
import { r as y, c as f, n as l } from './index-D1vJKCDW.mjs';
import './index-DIEZAM9s.mjs';
import { e as G, n as L } from './ref-CBFqMm98.mjs';
import './index-D9i8epM-.mjs';
import { H as T } from './HelpersUtil-OM-sIAZ4.mjs';
import { o as q } from './if-defined-DgIoGpc1.mjs';
import './index-Dmgyii2r.mjs';
import './index-Cv1k-Ah8.mjs';
import './index-CbYcNY2E.mjs';
import './index-v0YluuaR.mjs';
import './index-CAs464gf.mjs';
import { N as X } from './NavigationUtil-kj9LEOOd.mjs';
const Q = U`
  div {
    width: 100%;
  }

  [data-ready='false'] {
    transform: scale(1.05);
  }

  @media (max-width: 430px) {
    [data-ready='false'] {
      transform: translateY(-50px);
    }
  }
`;
var M = function (e, t, i, r) {
  var n = arguments.length,
    o = n < 3 ? t : r === null ? (r = Object.getOwnPropertyDescriptor(t, i)) : r,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') o = Reflect.decorate(e, t, i, r);
  else for (var a = e.length - 1; a >= 0; a--) (s = e[a]) && (o = (n < 3 ? s(o) : n > 3 ? s(t, i, o) : s(t, i)) || o);
  return (n > 3 && o && Object.defineProperty(t, i, o), o);
};
const N = 600,
  W = 360,
  Z = 64;
let S = class extends h {
  constructor() {
    (super(),
      (this.bodyObserver = void 0),
      (this.unsubscribe = []),
      (this.iframe = document.getElementById('w3m-iframe')),
      (this.ready = !1),
      this.unsubscribe.push(
        P.subscribeKey('open', (t) => {
          t || this.onHideIframe();
        }),
        P.subscribeKey('shake', (t) => {
          t
            ? (this.iframe.style.animation = 'w3m-shake 500ms var(--apkt-easings-ease-out-power-2)')
            : (this.iframe.style.animation = 'none');
        })
      ));
  }
  disconnectedCallback() {
    (this.onHideIframe(), this.unsubscribe.forEach((t) => t()), this.bodyObserver?.unobserve(window.document.body));
  }
  async firstUpdated() {
    (await this.syncTheme(), (this.iframe.style.display = 'block'));
    const t = this?.renderRoot?.querySelector('div');
    ((this.bodyObserver = new ResizeObserver((i) => {
      const n = i?.[0]?.contentBoxSize?.[0]?.inlineSize;
      ((this.iframe.style.height = `${N}px`),
        (t.style.height = `${N}px`),
        H.state.enableEmbedded
          ? this.updateFrameSizeForEmbeddedMode()
          : n && n <= 430
            ? ((this.iframe.style.width = '100%'),
              (this.iframe.style.left = '0px'),
              (this.iframe.style.bottom = '0px'),
              (this.iframe.style.top = 'unset'),
              this.onShowIframe())
            : ((this.iframe.style.width = `${W}px`),
              (this.iframe.style.left = `calc(50% - ${W / 2}px)`),
              (this.iframe.style.top = `calc(50% - ${N / 2}px + ${Z / 2}px)`),
              (this.iframe.style.bottom = 'unset'),
              this.onShowIframe()));
    })),
      this.bodyObserver.observe(window.document.body));
  }
  render() {
    return c`<div data-ready=${this.ready} id="w3m-frame-container"></div>`;
  }
  onShowIframe() {
    const t = window.innerWidth <= 430;
    ((this.ready = !0),
      (this.iframe.style.animation = t
        ? 'w3m-iframe-zoom-in-mobile 200ms var(--apkt-easings-ease-out-power-2)'
        : 'w3m-iframe-zoom-in 200ms var(--apkt-easings-ease-out-power-2)'));
  }
  onHideIframe() {
    ((this.iframe.style.display = 'none'),
      (this.iframe.style.animation = 'w3m-iframe-fade-out 200ms var(--apkt-easings-ease-out-power-2)'));
  }
  async syncTheme() {
    const t = V.getAuthConnector();
    if (t) {
      const i = k.getSnapshot().themeMode,
        r = k.getSnapshot().themeVariables;
      await t.provider.syncTheme({
        themeVariables: r,
        w3mThemeVariables: F(r, i),
      });
    }
  }
  async updateFrameSizeForEmbeddedMode() {
    const t = this?.renderRoot?.querySelector('div');
    await new Promise((r) => {
      setTimeout(r, 300);
    });
    const i = this.getBoundingClientRect();
    ((t.style.width = '100%'),
      (this.iframe.style.left = `${i.left}px`),
      (this.iframe.style.top = `${i.top}px`),
      (this.iframe.style.width = `${i.width}px`),
      (this.iframe.style.height = `${i.height}px`),
      this.onShowIframe());
  }
};
S.styles = Q;
M([y()], S.prototype, 'ready', void 0);
S = M([f('w3m-approve-transaction-view')], S);
const J = R`
  a {
    border: none;
    border-radius: ${({ borderRadius: e }) => e[20]};
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: ${({ spacing: e }) => e[1]};
    transition:
      background-color ${({ durations: e }) => e.lg}
        ${({ easings: e }) => e['ease-out-power-2']},
      box-shadow ${({ durations: e }) => e.lg}
        ${({ easings: e }) => e['ease-out-power-2']},
      border ${({ durations: e }) => e.lg} ${({ easings: e }) => e['ease-out-power-2']};
    will-change: background-color, box-shadow, border;
  }

  /* -- Variants --------------------------------------------------------------- */
  a[data-type='success'] {
    background-color: ${({ tokens: e }) => e.core.backgroundSuccess};
    color: ${({ tokens: e }) => e.core.textSuccess};
  }

  a[data-type='error'] {
    background-color: ${({ tokens: e }) => e.core.backgroundError};
    color: ${({ tokens: e }) => e.core.textError};
  }

  a[data-type='warning'] {
    background-color: ${({ tokens: e }) => e.core.backgroundWarning};
    color: ${({ tokens: e }) => e.core.textWarning};
  }

  /* -- Sizes --------------------------------------------------------------- */
  a[data-size='sm'] {
    height: 24px;
  }

  a[data-size='md'] {
    height: 28px;
  }

  a[data-size='lg'] {
    height: 32px;
  }

  a[data-size='sm'] > wui-image,
  a[data-size='sm'] > wui-icon {
    width: 16px;
    height: 16px;
  }

  a[data-size='md'] > wui-image,
  a[data-size='md'] > wui-icon {
    width: 20px;
    height: 20px;
  }

  a[data-size='lg'] > wui-image,
  a[data-size='lg'] > wui-icon {
    width: 24px;
    height: 24px;
  }

  wui-text {
    padding-left: ${({ spacing: e }) => e[1]};
    padding-right: ${({ spacing: e }) => e[1]};
  }

  wui-image {
    border-radius: ${({ borderRadius: e }) => e[3]};
    overflow: hidden;
    user-drag: none;
    user-select: none;
    -moz-user-select: none;
    -webkit-user-drag: none;
    -webkit-user-select: none;
    -ms-user-select: none;
  }

  /* -- States --------------------------------------------------------------- */
  @media (hover: hover) and (pointer: fine) {
    a[data-type='success']:not(:disabled):hover {
      background-color: ${({ tokens: e }) => e.theme.foregroundPrimary};
      box-shadow: 0px 0px 0px 1px ${({ tokens: e }) => e.core.borderSuccess};
    }

    a[data-type='error']:not(:disabled):hover {
      background-color: ${({ tokens: e }) => e.theme.foregroundPrimary};
      box-shadow: 0px 0px 0px 1px ${({ tokens: e }) => e.core.borderError};
    }

    a[data-type='warning']:not(:disabled):hover {
      background-color: ${({ tokens: e }) => e.theme.foregroundPrimary};
      box-shadow: 0px 0px 0px 1px ${({ tokens: e }) => e.core.borderWarning};
    }
  }

  a[data-type='success']:not(:disabled):focus-visible {
    box-shadow:
      0px 0px 0px 1px ${({ tokens: e }) => e.core.backgroundAccentPrimary},
      0px 0px 0px 4px ${({ tokens: e }) => e.core.foregroundAccent020};
  }

  a[data-type='error']:not(:disabled):focus-visible {
    box-shadow:
      0px 0px 0px 1px ${({ tokens: e }) => e.core.backgroundAccentPrimary},
      0px 0px 0px 4px ${({ tokens: e }) => e.core.foregroundAccent020};
  }

  a[data-type='warning']:not(:disabled):focus-visible {
    box-shadow:
      0px 0px 0px 1px ${({ tokens: e }) => e.core.backgroundAccentPrimary},
      0px 0px 0px 4px ${({ tokens: e }) => e.core.foregroundAccent020};
  }

  a:disabled {
    opacity: 0.5;
  }
`;
var g = function (e, t, i, r) {
  var n = arguments.length,
    o = n < 3 ? t : r === null ? (r = Object.getOwnPropertyDescriptor(t, i)) : r,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') o = Reflect.decorate(e, t, i, r);
  else for (var a = e.length - 1; a >= 0; a--) (s = e[a]) && (o = (n < 3 ? s(o) : n > 3 ? s(t, i, o) : s(t, i)) || o);
  return (n > 3 && o && Object.defineProperty(t, i, o), o);
};
const ee = {
    sm: 'md-regular',
    md: 'lg-regular',
    lg: 'lg-regular',
  },
  te = {
    success: 'sealCheck',
    error: 'warning',
    warning: 'exclamationCircle',
  };
let d = class extends h {
  constructor() {
    (super(...arguments),
      (this.type = 'success'),
      (this.size = 'md'),
      (this.imageSrc = void 0),
      (this.disabled = !1),
      (this.href = ''),
      (this.text = void 0));
  }
  render() {
    return c`
      <a
        rel="noreferrer"
        target="_blank"
        href=${this.href}
        class=${this.disabled ? 'disabled' : ''}
        data-type=${this.type}
        data-size=${this.size}
      >
        ${this.imageTemplate()}
        <wui-text variant=${ee[this.size]} color="inherit">${this.text}</wui-text>
      </a>
    `;
  }
  imageTemplate() {
    return this.imageSrc
      ? c`<wui-image src=${this.imageSrc} size="inherit"></wui-image>`
      : c`<wui-icon
      name=${te[this.type]}
      weight="fill"
      color="inherit"
      size="inherit"
      class="image-icon"
    ></wui-icon>`;
  }
};
d.styles = [z, B, J];
g([l()], d.prototype, 'type', void 0);
g([l()], d.prototype, 'size', void 0);
g([l()], d.prototype, 'imageSrc', void 0);
g([l({ type: Boolean })], d.prototype, 'disabled', void 0);
g([l()], d.prototype, 'href', void 0);
g([l()], d.prototype, 'text', void 0);
d = g([f('wui-semantic-chip')], d);
var ie = function (e, t, i, r) {
  var n = arguments.length,
    o = n < 3 ? t : r === null ? (r = Object.getOwnPropertyDescriptor(t, i)) : r,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') o = Reflect.decorate(e, t, i, r);
  else for (var a = e.length - 1; a >= 0; a--) (s = e[a]) && (o = (n < 3 ? s(o) : n > 3 ? s(t, i, o) : s(t, i)) || o);
  return (n > 3 && o && Object.defineProperty(t, i, o), o);
};
let j = class extends h {
  render() {
    return c`
      <wui-flex flexDirection="column" alignItems="center" gap="5" padding="5">
        <wui-text variant="md-regular" color="primary">Follow the instructions on</wui-text>
        <wui-semantic-chip
          icon="externalLink"
          variant="fill"
          text=${E.SECURE_SITE_DASHBOARD}
          href=${E.SECURE_SITE_DASHBOARD}
          imageSrc=${E.SECURE_SITE_FAVICON}
          data-testid="w3m-secure-website-button"
        >
        </wui-semantic-chip>
        <wui-text variant="sm-regular" color="secondary">
          You will have to reconnect for security reasons
        </wui-text>
      </wui-flex>
    `;
  }
};
j = ie([f('w3m-upgrade-wallet-view')], j);
const oe = R`
  :host {
    width: 100%;
  }

  button {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: ${({ tokens: e }) => e.theme.foregroundPrimary};
    border-radius: ${({ borderRadius: e }) => e[4]};
    padding: ${({ spacing: e }) => e[4]};
  }

  .name {
    max-width: 75%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (hover: hover) and (pointer: fine) {
    button:hover:enabled {
      cursor: pointer;
      background-color: ${({ tokens: e }) => e.theme.foregroundSecondary};
      border-radius: ${({ borderRadius: e }) => e[6]};
    }
  }

  button:disabled {
    opacity: 0.5;
    cursor: default;
  }

  button:focus-visible:enabled {
    box-shadow: 0 0 0 4px ${({ tokens: e }) => e.core.foregroundAccent040};
    background-color: ${({ tokens: e }) => e.theme.foregroundSecondary};
  }
`;
var $ = function (e, t, i, r) {
  var n = arguments.length,
    o = n < 3 ? t : r === null ? (r = Object.getOwnPropertyDescriptor(t, i)) : r,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') o = Reflect.decorate(e, t, i, r);
  else for (var a = e.length - 1; a >= 0; a--) (s = e[a]) && (o = (n < 3 ? s(o) : n > 3 ? s(t, i, o) : s(t, i)) || o);
  return (n > 3 && o && Object.defineProperty(t, i, o), o);
};
let m = class extends h {
  constructor() {
    (super(...arguments), (this.name = ''), (this.registered = !1), (this.loading = !1), (this.disabled = !1));
  }
  render() {
    return c`
      <button ?disabled=${this.disabled}>
        <wui-text class="name" color="primary" variant="md-regular">${this.name}</wui-text>
        ${this.templateRightContent()}
      </button>
    `;
  }
  templateRightContent() {
    return this.loading
      ? c`<wui-loading-spinner size="lg" color="primary"></wui-loading-spinner>`
      : this.registered
        ? c`<wui-tag variant="info" size="sm">Registered</wui-tag>`
        : c`<wui-tag variant="success" size="sm">Available</wui-tag>`;
  }
};
m.styles = [z, B, oe];
$([l()], m.prototype, 'name', void 0);
$([l({ type: Boolean })], m.prototype, 'registered', void 0);
$([l({ type: Boolean })], m.prototype, 'loading', void 0);
$([l({ type: Boolean })], m.prototype, 'disabled', void 0);
m = $([f('wui-account-name-suggestion-item')], m);
const re = R`
  :host {
    position: relative;
    width: 100%;
    display: inline-block;
  }

  :host([disabled]) {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .base-name {
    position: absolute;
    right: ${({ spacing: e }) => e[4]};
    top: 50%;
    transform: translateY(-50%);
    text-align: right;
    padding: ${({ spacing: e }) => e[1]};
    background-color: ${({ tokens: e }) => e.theme.foregroundSecondary};
    border-radius: ${({ borderRadius: e }) => e[1]};
  }
`;
var x = function (e, t, i, r) {
  var n = arguments.length,
    o = n < 3 ? t : r === null ? (r = Object.getOwnPropertyDescriptor(t, i)) : r,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') o = Reflect.decorate(e, t, i, r);
  else for (var a = e.length - 1; a >= 0; a--) (s = e[a]) && (o = (n < 3 ? s(o) : n > 3 ? s(t, i, o) : s(t, i)) || o);
  return (n > 3 && o && Object.defineProperty(t, i, o), o);
};
let p = class extends h {
  constructor() {
    (super(...arguments), (this.disabled = !1), (this.loading = !1));
  }
  render() {
    return c`
      <wui-input-text
        value=${q(this.value)}
        ?disabled=${this.disabled}
        .value=${this.value || ''}
        data-testid="wui-ens-input"
        icon="search"
        inputRightPadding="5xl"
        .onKeyDown=${this.onKeyDown}
      ></wui-input-text>
    `;
  }
};
p.styles = [z, re];
x([l()], p.prototype, 'errorMessage', void 0);
x([l({ type: Boolean })], p.prototype, 'disabled', void 0);
x([l()], p.prototype, 'value', void 0);
x([l({ type: Boolean })], p.prototype, 'loading', void 0);
x([l({ attribute: !1 })], p.prototype, 'onKeyDown', void 0);
p = x([f('wui-ens-input')], p);
const ne = R`
  wui-flex {
    width: 100%;
  }

  .suggestion {
    background-color: ${({ tokens: e }) => e.theme.foregroundPrimary};
    border-radius: ${({ borderRadius: e }) => e[4]};
  }

  .suggestion:hover:not(:disabled) {
    cursor: pointer;
    border: none;
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: ${({ tokens: e }) => e.theme.foregroundSecondary};
    border-radius: ${({ borderRadius: e }) => e[6]};
    padding: ${({ spacing: e }) => e[4]};
  }

  .suggestion:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .suggestion:focus-visible:not(:disabled) {
    box-shadow: 0 0 0 4px ${({ tokens: e }) => e.core.foregroundAccent040};
    background-color: ${({ tokens: e }) => e.theme.foregroundSecondary};
  }

  .suggested-name {
    max-width: 75%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  form {
    width: 100%;
    position: relative;
  }

  .input-submit-button,
  .input-loading-spinner {
    position: absolute;
    top: 22px;
    transform: translateY(-50%);
    right: 10px;
  }
`;
var b = function (e, t, i, r) {
  var n = arguments.length,
    o = n < 3 ? t : r === null ? (r = Object.getOwnPropertyDescriptor(t, i)) : r,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') o = Reflect.decorate(e, t, i, r);
  else for (var a = e.length - 1; a >= 0; a--) (s = e[a]) && (o = (n < 3 ? s(o) : n > 3 ? s(t, i, o) : s(t, i)) || o);
  return (n > 3 && o && Object.defineProperty(t, i, o), o);
};
let u = class extends h {
  constructor() {
    (super(),
      (this.formRef = G()),
      (this.usubscribe = []),
      (this.name = ''),
      (this.error = ''),
      (this.loading = w.state.loading),
      (this.suggestions = w.state.suggestions),
      (this.profileName = v.getAccountData()?.profileName),
      (this.onDebouncedNameInputChange = I.debounce((t) => {
        t.length < 4
          ? (this.error = 'Name must be at least 4 characters long')
          : T.isValidReownName(t)
            ? ((this.error = ''), w.getSuggestions(t))
            : (this.error = 'The value is not a valid username');
      })),
      this.usubscribe.push(
        w.subscribe((t) => {
          ((this.suggestions = t.suggestions), (this.loading = t.loading));
        }),
        v.subscribeChainProp('accountState', (t) => {
          ((this.profileName = t?.profileName), t?.profileName && (this.error = 'You already own a name'));
        })
      ));
  }
  firstUpdated() {
    this.formRef.value?.addEventListener('keydown', this.onEnterKey.bind(this));
  }
  disconnectedCallback() {
    (super.disconnectedCallback(),
      this.usubscribe.forEach((t) => t()),
      this.formRef.value?.removeEventListener('keydown', this.onEnterKey.bind(this)));
  }
  render() {
    return c`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        gap="4"
        .padding=${['1', '3', '4', '3']}
      >
        <form ${L(this.formRef)} @submit=${this.onSubmitName.bind(this)}>
          <wui-ens-input
            @inputChange=${this.onNameInputChange.bind(this)}
            .errorMessage=${this.error}
            .value=${this.name}
            .onKeyDown=${this.onKeyDown.bind(this)}
          >
          </wui-ens-input>
          ${this.submitButtonTemplate()}
          <input type="submit" hidden />
        </form>
        ${this.templateSuggestions()}
      </wui-flex>
    `;
  }
  submitButtonTemplate() {
    const t = this.suggestions.find((r) => r.name?.split('.')?.[0] === this.name && r.registered);
    if (this.loading)
      return c`<wui-loading-spinner
        class="input-loading-spinner"
        color="secondary"
      ></wui-loading-spinner>`;
    const i = `${this.name}${D.WC_NAME_SUFFIX}`;
    return c`
      <wui-icon-link
        ?disabled=${!!t}
        class="input-submit-button"
        size="sm"
        icon="chevronRight"
        iconColor=${t ? 'default' : 'accent-primary'}
        @click=${() => this.onSubmitName(i)}
      >
      </wui-icon-link>
    `;
  }
  onNameInputChange(t) {
    const i = T.validateReownName(t.detail || '');
    ((this.name = i), this.onDebouncedNameInputChange(i));
  }
  onKeyDown(t) {
    t.key.length === 1 && !T.isValidReownName(t.key) && t.preventDefault();
  }
  templateSuggestions() {
    return !this.name || this.name.length < 4 || this.error
      ? null
      : c`<wui-flex flexDirection="column" gap="1" alignItems="center">
      ${this.suggestions.map(
        (t) => c`<wui-account-name-suggestion-item
            name=${t.name}
            ?registered=${t.registered}
            ?loading=${this.loading}
            ?disabled=${t.registered || this.loading}
            data-testid="account-name-suggestion"
            @click=${() => this.onSubmitName(t.name)}
          ></wui-account-name-suggestion-item>`
      )}
    </wui-flex>`;
  }
  isAllowedToSubmit(t) {
    const i = t.split('.')?.[0],
      r = this.suggestions.find((n) => n.name?.split('.')?.[0] === i && n.registered);
    return !this.loading && !this.error && !this.profileName && i && w.validateName(i) && !r;
  }
  async onSubmitName(t) {
    try {
      if (!this.isAllowedToSubmit(t)) return;
      (C.sendEvent({
        type: 'track',
        event: 'REGISTER_NAME_INITIATED',
        properties: {
          isSmartAccount: _(v.state.activeChain) === A.ACCOUNT_TYPES.SMART_ACCOUNT,
          ensName: t,
        },
      }),
        await w.registerName(t),
        C.sendEvent({
          type: 'track',
          event: 'REGISTER_NAME_SUCCESS',
          properties: {
            isSmartAccount: _(v.state.activeChain) === A.ACCOUNT_TYPES.SMART_ACCOUNT,
            ensName: t,
          },
        }));
    } catch (i) {
      (Y.showError(i.message),
        C.sendEvent({
          type: 'track',
          event: 'REGISTER_NAME_ERROR',
          properties: {
            isSmartAccount: _(v.state.activeChain) === A.ACCOUNT_TYPES.SMART_ACCOUNT,
            ensName: t,
            error: I.parseError(i),
          },
        }));
    }
  }
  onEnterKey(t) {
    if (t.key === 'Enter' && this.name && this.isAllowedToSubmit(this.name)) {
      const i = `${this.name}${D.WC_NAME_SUFFIX}`;
      this.onSubmitName(i);
    }
  }
};
u.styles = ne;
b([l()], u.prototype, 'errorMessage', void 0);
b([y()], u.prototype, 'name', void 0);
b([y()], u.prototype, 'error', void 0);
b([y()], u.prototype, 'loading', void 0);
b([y()], u.prototype, 'suggestions', void 0);
b([y()], u.prototype, 'profileName', void 0);
u = b([f('w3m-register-account-name-view')], u);
const se = U`
  .continue-button-container {
    width: 100%;
  }
`;
var ae = function (e, t, i, r) {
  var n = arguments.length,
    o = n < 3 ? t : r === null ? (r = Object.getOwnPropertyDescriptor(t, i)) : r,
    s;
  if (typeof Reflect == 'object' && typeof Reflect.decorate == 'function') o = Reflect.decorate(e, t, i, r);
  else for (var a = e.length - 1; a >= 0; a--) (s = e[a]) && (o = (n < 3 ? s(o) : n > 3 ? s(t, i, o) : s(t, i)) || o);
  return (n > 3 && o && Object.defineProperty(t, i, o), o);
};
let O = class extends h {
  render() {
    return c`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        gap="6"
        .padding=${['0', '0', '4', '0']}
      >
        ${this.onboardingTemplate()} ${this.buttonsTemplate()}
        <wui-link
          @click=${() => {
            I.openHref(X.URLS.FAQ, '_blank');
          }}
        >
          Learn more
          <wui-icon color="inherit" slot="iconRight" name="externalLink"></wui-icon>
        </wui-link>
      </wui-flex>
    `;
  }
  onboardingTemplate() {
    return c` <wui-flex
      flexDirection="column"
      gap="6"
      alignItems="center"
      .padding=${['0', '6', '0', '6']}
    >
      <wui-flex gap="3" alignItems="center" justifyContent="center">
        <wui-icon-box size="xl" color="success" icon="checkmark"></wui-icon-box>
      </wui-flex>
      <wui-flex flexDirection="column" alignItems="center" gap="3">
        <wui-text align="center" variant="md-medium" color="primary">
          Account name chosen successfully
        </wui-text>
        <wui-text align="center" variant="md-regular" color="primary">
          You can now fund your account and trade crypto
        </wui-text>
      </wui-flex>
    </wui-flex>`;
  }
  buttonsTemplate() {
    return c`<wui-flex
      .padding=${['0', '4', '0', '4']}
      gap="3"
      class="continue-button-container"
    >
      <wui-button fullWidth size="lg" borderRadius="xs" @click=${this.redirectToAccount.bind(this)}
        >Let's Go!
      </wui-button>
    </wui-flex>`;
  }
  redirectToAccount() {
    K.replace('Account');
  }
};
O.styles = se;
O = ae([f('w3m-register-account-name-success-view')], O);
export {
  S as W3mApproveTransactionView,
  O as W3mRegisterAccountNameSuccess,
  u as W3mRegisterAccountNameView,
  j as W3mUpgradeWalletView,
};
//# sourceMappingURL=embedded-wallet-b2AXXcbR.mjs.map
