import { t as i, q as i$1, M as ModalController, O as OptionsController, x, l as ConnectorController, T as ThemeController, Y as getW3mThemeVariables, n as css, r as resetStyles, o as elementStyles, h as ConstantsUtil, a as ChainController, Z as W3mFrameStorage, C as ConstantsUtil$1, u as getPreferredAccountType, W as W3mFrameRpcConstants, m as ConnectionController, _ as SendController, $ as EnsController, c as CoreHelperUtil, b as EventsController, S as SnackController, R as RouterController } from "./walletconnect-BVoLvI4P.js";
import { r, c as customElement, n } from "./index-5878y4Sm.js";
import "./index-SiM7Ib3-.js";
import { e, n as n$1 } from "./ref-j6LTZZuR.js";
import "./index-DAKl5XGv.js";
import "./index-CBcUV-KC.js";
import { o } from "./if-defined-DpCpmSxP.js";
import "./index-Oesj6-8K.js";
import "./index-W8RzVVH7.js";
import { H as HelpersUtil } from "./HelpersUtil-DHNzaUb2.js";
import "./index-Bag94m_F.js";
import "./index-Cm7UDlkl.js";
import "./index-Bz3_ZVag.js";
import { N as NavigationUtil } from "./NavigationUtil-Ci15WS4K.js";
import "./index-73GArslZ.js";
import "./ConstantsUtil-BrK1znIM.js";
const styles$5 = i`
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
var __decorate$7 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
const PAGE_HEIGHT = 600;
const PAGE_WIDTH = 360;
const HEADER_HEIGHT = 64;
let W3mApproveTransactionView = class W3mApproveTransactionView2 extends i$1 {
  constructor() {
    super();
    this.bodyObserver = void 0;
    this.unsubscribe = [];
    this.iframe = document.getElementById("w3m-iframe");
    this.ready = false;
    this.unsubscribe.push(...[
      ModalController.subscribeKey("open", (isOpen) => {
        if (!isOpen) {
          this.onHideIframe();
        }
      }),
      ModalController.subscribeKey("shake", (val) => {
        if (val) {
          this.iframe.style.animation = `w3m-shake 500ms var(--apkt-easings-ease-out-power-2)`;
        } else {
          this.iframe.style.animation = "none";
        }
      })
    ]);
  }
  disconnectedCallback() {
    this.onHideIframe();
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.bodyObserver?.unobserve(window.document.body);
  }
  async firstUpdated() {
    await this.syncTheme();
    this.iframe.style.display = "block";
    const container = this?.renderRoot?.querySelector("div");
    this.bodyObserver = new ResizeObserver((entries) => {
      const contentBoxSize = entries?.[0]?.contentBoxSize;
      const width = contentBoxSize?.[0]?.inlineSize;
      this.iframe.style.height = `${PAGE_HEIGHT}px`;
      container.style.height = `${PAGE_HEIGHT}px`;
      if (OptionsController.state.enableEmbedded) {
        this.updateFrameSizeForEmbeddedMode();
      } else if (width && width <= 430) {
        this.iframe.style.width = "100%";
        this.iframe.style.left = "0px";
        this.iframe.style.bottom = "0px";
        this.iframe.style.top = "unset";
        this.onShowIframe();
      } else {
        this.iframe.style.width = `${PAGE_WIDTH}px`;
        this.iframe.style.left = `calc(50% - ${PAGE_WIDTH / 2}px)`;
        this.iframe.style.top = `calc(50% - ${PAGE_HEIGHT / 2}px + ${HEADER_HEIGHT / 2}px)`;
        this.iframe.style.bottom = "unset";
        this.onShowIframe();
      }
    });
    this.bodyObserver.observe(window.document.body);
  }
  render() {
    return x`<div data-ready=${this.ready} id="w3m-frame-container"></div>`;
  }
  onShowIframe() {
    const isMobile = window.innerWidth <= 430;
    this.ready = true;
    this.iframe.style.animation = isMobile ? "w3m-iframe-zoom-in-mobile 200ms var(--apkt-easings-ease-out-power-2)" : "w3m-iframe-zoom-in 200ms var(--apkt-easings-ease-out-power-2)";
  }
  onHideIframe() {
    this.iframe.style.display = "none";
    this.iframe.style.animation = "w3m-iframe-fade-out 200ms var(--apkt-easings-ease-out-power-2)";
  }
  async syncTheme() {
    const authConnector = ConnectorController.getAuthConnector();
    if (authConnector) {
      const themeMode = ThemeController.getSnapshot().themeMode;
      const themeVariables = ThemeController.getSnapshot().themeVariables;
      await authConnector.provider.syncTheme({
        themeVariables,
        w3mThemeVariables: getW3mThemeVariables(themeVariables, themeMode)
      });
    }
  }
  async updateFrameSizeForEmbeddedMode() {
    const container = this?.renderRoot?.querySelector("div");
    await new Promise((resolve) => {
      setTimeout(resolve, 300);
    });
    const rect = this.getBoundingClientRect();
    container.style.width = "100%";
    this.iframe.style.left = `${rect.left}px`;
    this.iframe.style.top = `${rect.top}px`;
    this.iframe.style.width = `${rect.width}px`;
    this.iframe.style.height = `${rect.height}px`;
    this.onShowIframe();
  }
};
W3mApproveTransactionView.styles = styles$5;
__decorate$7([
  r()
], W3mApproveTransactionView.prototype, "ready", void 0);
W3mApproveTransactionView = __decorate$7([
  customElement("w3m-approve-transaction-view")
], W3mApproveTransactionView);
const styles$4 = css`
  a {
    border: none;
    border-radius: ${({ borderRadius }) => borderRadius["20"]};
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: ${({ spacing }) => spacing[1]};
    transition:
      background-color ${({ durations }) => durations["lg"]}
        ${({ easings }) => easings["ease-out-power-2"]},
      box-shadow ${({ durations }) => durations["lg"]}
        ${({ easings }) => easings["ease-out-power-2"]},
      border ${({ durations }) => durations["lg"]} ${({ easings }) => easings["ease-out-power-2"]};
    will-change: background-color, box-shadow, border;
  }

  /* -- Variants --------------------------------------------------------------- */
  a[data-type='success'] {
    background-color: ${({ tokens }) => tokens.core.backgroundSuccess};
    color: ${({ tokens }) => tokens.core.textSuccess};
  }

  a[data-type='error'] {
    background-color: ${({ tokens }) => tokens.core.backgroundError};
    color: ${({ tokens }) => tokens.core.textError};
  }

  a[data-type='warning'] {
    background-color: ${({ tokens }) => tokens.core.backgroundWarning};
    color: ${({ tokens }) => tokens.core.textWarning};
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
    padding-left: ${({ spacing }) => spacing[1]};
    padding-right: ${({ spacing }) => spacing[1]};
  }

  wui-image {
    border-radius: ${({ borderRadius }) => borderRadius[3]};
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
      background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
      box-shadow: 0px 0px 0px 1px ${({ tokens }) => tokens.core.borderSuccess};
    }

    a[data-type='error']:not(:disabled):hover {
      background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
      box-shadow: 0px 0px 0px 1px ${({ tokens }) => tokens.core.borderError};
    }

    a[data-type='warning']:not(:disabled):hover {
      background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
      box-shadow: 0px 0px 0px 1px ${({ tokens }) => tokens.core.borderWarning};
    }
  }

  a[data-type='success']:not(:disabled):focus-visible {
    box-shadow:
      0px 0px 0px 1px ${({ tokens }) => tokens.core.backgroundAccentPrimary},
      0px 0px 0px 4px ${({ tokens }) => tokens.core.foregroundAccent020};
  }

  a[data-type='error']:not(:disabled):focus-visible {
    box-shadow:
      0px 0px 0px 1px ${({ tokens }) => tokens.core.backgroundAccentPrimary},
      0px 0px 0px 4px ${({ tokens }) => tokens.core.foregroundAccent020};
  }

  a[data-type='warning']:not(:disabled):focus-visible {
    box-shadow:
      0px 0px 0px 1px ${({ tokens }) => tokens.core.backgroundAccentPrimary},
      0px 0px 0px 4px ${({ tokens }) => tokens.core.foregroundAccent020};
  }

  a:disabled {
    opacity: 0.5;
  }
`;
var __decorate$6 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
const TEXT_BY_SIZE = {
  sm: "md-regular",
  md: "lg-regular",
  lg: "lg-regular"
};
const ICON_BY_TYPE = {
  success: "sealCheck",
  error: "warning",
  warning: "exclamationCircle"
};
let WuiSemanticChip = class WuiSemanticChip2 extends i$1 {
  constructor() {
    super(...arguments);
    this.type = "success";
    this.size = "md";
    this.imageSrc = void 0;
    this.disabled = false;
    this.href = "";
    this.text = void 0;
  }
  render() {
    return x`
      <a
        rel="noreferrer"
        target="_blank"
        href=${this.href}
        class=${this.disabled ? "disabled" : ""}
        data-type=${this.type}
        data-size=${this.size}
      >
        ${this.imageTemplate()}
        <wui-text variant=${TEXT_BY_SIZE[this.size]} color="inherit">${this.text}</wui-text>
      </a>
    `;
  }
  imageTemplate() {
    if (this.imageSrc) {
      return x`<wui-image src=${this.imageSrc} size="inherit"></wui-image>`;
    }
    return x`<wui-icon
      name=${ICON_BY_TYPE[this.type]}
      weight="fill"
      color="inherit"
      size="inherit"
      class="image-icon"
    ></wui-icon>`;
  }
};
WuiSemanticChip.styles = [resetStyles, elementStyles, styles$4];
__decorate$6([
  n()
], WuiSemanticChip.prototype, "type", void 0);
__decorate$6([
  n()
], WuiSemanticChip.prototype, "size", void 0);
__decorate$6([
  n()
], WuiSemanticChip.prototype, "imageSrc", void 0);
__decorate$6([
  n({ type: Boolean })
], WuiSemanticChip.prototype, "disabled", void 0);
__decorate$6([
  n()
], WuiSemanticChip.prototype, "href", void 0);
__decorate$6([
  n()
], WuiSemanticChip.prototype, "text", void 0);
WuiSemanticChip = __decorate$6([
  customElement("wui-semantic-chip")
], WuiSemanticChip);
var __decorate$5 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mUpgradeWalletView = class W3mUpgradeWalletView2 extends i$1 {
  render() {
    return x`
      <wui-flex flexDirection="column" alignItems="center" gap="5" padding="5">
        <wui-text variant="md-regular" color="primary">Follow the instructions on</wui-text>
        <wui-semantic-chip
          icon="externalLink"
          variant="fill"
          text=${ConstantsUtil.SECURE_SITE_DASHBOARD}
          href=${ConstantsUtil.SECURE_SITE_DASHBOARD}
          imageSrc=${ConstantsUtil.SECURE_SITE_FAVICON}
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
W3mUpgradeWalletView = __decorate$5([
  customElement("w3m-upgrade-wallet-view")
], W3mUpgradeWalletView);
var __decorate$4 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mSmartAccountSettingsView = class W3mSmartAccountSettingsView2 extends i$1 {
  constructor() {
    super(...arguments);
    this.loading = false;
    this.switched = false;
    this.text = "";
    this.network = ChainController.state.activeCaipNetwork;
  }
  render() {
    return x`
      <wui-flex flexDirection="column" gap="2" .padding=${["6", "4", "3", "4"]}>
        ${this.togglePreferredAccountTypeTemplate()} ${this.toggleSmartAccountVersionTemplate()}
      </wui-flex>
    `;
  }
  toggleSmartAccountVersionTemplate() {
    return x`
      <w3m-tooltip-trigger text="Changing the smart account version will reload the page">
        <wui-list-item
          icon=${this.isV6() ? "arrowTop" : "arrowBottom"}
          ?rounded=${true}
          ?chevron=${true}
          data-testid="account-toggle-smart-account-version"
          @click=${this.toggleSmartAccountVersion.bind(this)}
        >
          <wui-text variant="lg-regular" color="primary"
            >Force Smart Account Version ${this.isV6() ? "7" : "6"}</wui-text
          >
        </wui-list-item>
      </w3m-tooltip-trigger>
    `;
  }
  isV6() {
    const currentVersion = W3mFrameStorage.get("dapp_smart_account_version") || "v6";
    return currentVersion === "v6";
  }
  toggleSmartAccountVersion() {
    W3mFrameStorage.set("dapp_smart_account_version", this.isV6() ? "v7" : "v6");
    if (typeof window !== "undefined") {
      window?.location?.reload();
    }
  }
  togglePreferredAccountTypeTemplate() {
    const namespace = this.network?.chainNamespace;
    const isNetworkEnabled = ChainController.checkIfSmartAccountEnabled();
    const connectorId = ConnectorController.getConnectorId(namespace);
    const authConnector = ConnectorController.getAuthConnector();
    if (!authConnector || connectorId !== ConstantsUtil$1.CONNECTOR_ID.AUTH || !isNetworkEnabled) {
      return null;
    }
    if (!this.switched) {
      this.text = getPreferredAccountType(namespace) === W3mFrameRpcConstants.ACCOUNT_TYPES.SMART_ACCOUNT ? "Switch to your EOA" : "Switch to your Smart Account";
    }
    return x`
      <wui-list-item
        icon="swapHorizontal"
        ?rounded=${true}
        ?chevron=${true}
        ?loading=${this.loading}
        @click=${this.changePreferredAccountType.bind(this)}
        data-testid="account-toggle-preferred-account-type"
      >
        <wui-text variant="lg-regular" color="primary">${this.text}</wui-text>
      </wui-list-item>
    `;
  }
  async changePreferredAccountType() {
    const namespace = this.network?.chainNamespace;
    const isSmartAccountEnabled = ChainController.checkIfSmartAccountEnabled();
    const accountTypeTarget = getPreferredAccountType(namespace) === W3mFrameRpcConstants.ACCOUNT_TYPES.SMART_ACCOUNT || !isSmartAccountEnabled ? W3mFrameRpcConstants.ACCOUNT_TYPES.EOA : W3mFrameRpcConstants.ACCOUNT_TYPES.SMART_ACCOUNT;
    const authConnector = ConnectorController.getAuthConnector();
    if (!authConnector) {
      return;
    }
    this.loading = true;
    await ConnectionController.setPreferredAccountType(accountTypeTarget, namespace);
    this.text = accountTypeTarget === W3mFrameRpcConstants.ACCOUNT_TYPES.SMART_ACCOUNT ? "Switch to your EOA" : "Switch to your Smart Account";
    this.switched = true;
    SendController.resetSend();
    this.loading = false;
    this.requestUpdate();
  }
};
__decorate$4([
  r()
], W3mSmartAccountSettingsView.prototype, "loading", void 0);
__decorate$4([
  r()
], W3mSmartAccountSettingsView.prototype, "switched", void 0);
__decorate$4([
  r()
], W3mSmartAccountSettingsView.prototype, "text", void 0);
__decorate$4([
  r()
], W3mSmartAccountSettingsView.prototype, "network", void 0);
W3mSmartAccountSettingsView = __decorate$4([
  customElement("w3m-smart-account-settings-view")
], W3mSmartAccountSettingsView);
const styles$3 = css`
  :host {
    width: 100%;
  }

  button {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
    border-radius: ${({ borderRadius }) => borderRadius[4]};
    padding: ${({ spacing }) => spacing[4]};
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
      background-color: ${({ tokens }) => tokens.theme.foregroundSecondary};
      border-radius: ${({ borderRadius }) => borderRadius[6]};
    }
  }

  button:disabled {
    opacity: 0.5;
    cursor: default;
  }

  button:focus-visible:enabled {
    box-shadow: 0 0 0 4px ${({ tokens }) => tokens.core.foregroundAccent040};
    background-color: ${({ tokens }) => tokens.theme.foregroundSecondary};
  }
`;
var __decorate$3 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let WuiAccountNameSuggestionItem = class WuiAccountNameSuggestionItem2 extends i$1 {
  constructor() {
    super(...arguments);
    this.name = "";
    this.registered = false;
    this.loading = false;
    this.disabled = false;
  }
  render() {
    return x`
      <button ?disabled=${this.disabled}>
        <wui-text class="name" color="primary" variant="md-regular">${this.name}</wui-text>
        ${this.templateRightContent()}
      </button>
    `;
  }
  templateRightContent() {
    if (this.loading) {
      return x`<wui-loading-spinner size="lg" color="primary"></wui-loading-spinner>`;
    }
    return this.registered ? x`<wui-tag variant="info" size="sm">Registered</wui-tag>` : x`<wui-tag variant="success" size="sm">Available</wui-tag>`;
  }
};
WuiAccountNameSuggestionItem.styles = [resetStyles, elementStyles, styles$3];
__decorate$3([
  n()
], WuiAccountNameSuggestionItem.prototype, "name", void 0);
__decorate$3([
  n({ type: Boolean })
], WuiAccountNameSuggestionItem.prototype, "registered", void 0);
__decorate$3([
  n({ type: Boolean })
], WuiAccountNameSuggestionItem.prototype, "loading", void 0);
__decorate$3([
  n({ type: Boolean })
], WuiAccountNameSuggestionItem.prototype, "disabled", void 0);
WuiAccountNameSuggestionItem = __decorate$3([
  customElement("wui-account-name-suggestion-item")
], WuiAccountNameSuggestionItem);
const styles$2 = css`
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
    right: ${({ spacing }) => spacing[4]};
    top: 50%;
    transform: translateY(-50%);
    text-align: right;
    padding: ${({ spacing }) => spacing[1]};
    background-color: ${({ tokens }) => tokens.theme.foregroundSecondary};
    border-radius: ${({ borderRadius }) => borderRadius[1]};
  }
`;
var __decorate$2 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let WuiEnsInput = class WuiEnsInput2 extends i$1 {
  constructor() {
    super(...arguments);
    this.disabled = false;
    this.loading = false;
  }
  render() {
    return x`
      <wui-input-text
        value=${o(this.value)}
        ?disabled=${this.disabled}
        .value=${this.value || ""}
        data-testid="wui-ens-input"
        icon="search"
        inputRightPadding="5xl"
        .onKeyDown=${this.onKeyDown}
      ></wui-input-text>
    `;
  }
};
WuiEnsInput.styles = [resetStyles, styles$2];
__decorate$2([
  n()
], WuiEnsInput.prototype, "errorMessage", void 0);
__decorate$2([
  n({ type: Boolean })
], WuiEnsInput.prototype, "disabled", void 0);
__decorate$2([
  n()
], WuiEnsInput.prototype, "value", void 0);
__decorate$2([
  n({ type: Boolean })
], WuiEnsInput.prototype, "loading", void 0);
__decorate$2([
  n({ attribute: false })
], WuiEnsInput.prototype, "onKeyDown", void 0);
WuiEnsInput = __decorate$2([
  customElement("wui-ens-input")
], WuiEnsInput);
const styles$1 = css`
  wui-flex {
    width: 100%;
  }

  .suggestion {
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
    border-radius: ${({ borderRadius }) => borderRadius[4]};
  }

  .suggestion:hover:not(:disabled) {
    cursor: pointer;
    border: none;
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: ${({ tokens }) => tokens.theme.foregroundSecondary};
    border-radius: ${({ borderRadius }) => borderRadius[6]};
    padding: ${({ spacing }) => spacing[4]};
  }

  .suggestion:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .suggestion:focus-visible:not(:disabled) {
    box-shadow: 0 0 0 4px ${({ tokens }) => tokens.core.foregroundAccent040};
    background-color: ${({ tokens }) => tokens.theme.foregroundSecondary};
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
var __decorate$1 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mRegisterAccountNameView = class W3mRegisterAccountNameView2 extends i$1 {
  constructor() {
    super();
    this.formRef = e();
    this.usubscribe = [];
    this.name = "";
    this.error = "";
    this.loading = EnsController.state.loading;
    this.suggestions = EnsController.state.suggestions;
    this.profileName = ChainController.getAccountData()?.profileName;
    this.onDebouncedNameInputChange = CoreHelperUtil.debounce((value) => {
      if (value.length < 4) {
        this.error = "Name must be at least 4 characters long";
      } else if (!HelpersUtil.isValidReownName(value)) {
        this.error = "The value is not a valid username";
      } else {
        this.error = "";
        EnsController.getSuggestions(value);
      }
    });
    this.usubscribe.push(...[
      EnsController.subscribe((val) => {
        this.suggestions = val.suggestions;
        this.loading = val.loading;
      }),
      ChainController.subscribeChainProp("accountState", (val) => {
        this.profileName = val?.profileName;
        if (val?.profileName) {
          this.error = "You already own a name";
        }
      })
    ]);
  }
  firstUpdated() {
    this.formRef.value?.addEventListener("keydown", this.onEnterKey.bind(this));
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.usubscribe.forEach((unsub) => unsub());
    this.formRef.value?.removeEventListener("keydown", this.onEnterKey.bind(this));
  }
  render() {
    return x`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        gap="4"
        .padding=${["1", "3", "4", "3"]}
      >
        <form ${n$1(this.formRef)} @submit=${this.onSubmitName.bind(this)}>
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
    const isRegistered = this.suggestions.find((s) => s.name?.split(".")?.[0] === this.name && s.registered);
    if (this.loading) {
      return x`<wui-loading-spinner
        class="input-loading-spinner"
        color="secondary"
      ></wui-loading-spinner>`;
    }
    const reownName = `${this.name}${ConstantsUtil$1.WC_NAME_SUFFIX}`;
    return x`
      <wui-icon-link
        ?disabled=${Boolean(isRegistered)}
        class="input-submit-button"
        size="sm"
        icon="chevronRight"
        iconColor=${isRegistered ? "default" : "accent-primary"}
        @click=${() => this.onSubmitName(reownName)}
      >
      </wui-icon-link>
    `;
  }
  onNameInputChange(event) {
    const value = HelpersUtil.validateReownName(event.detail || "");
    this.name = value;
    this.onDebouncedNameInputChange(value);
  }
  onKeyDown(event) {
    if (event.key.length === 1 && !HelpersUtil.isValidReownName(event.key)) {
      event.preventDefault();
    }
  }
  templateSuggestions() {
    if (!this.name || this.name.length < 4 || this.error) {
      return null;
    }
    return x`<wui-flex flexDirection="column" gap="1" alignItems="center">
      ${this.suggestions.map((suggestion) => x`<wui-account-name-suggestion-item
            name=${suggestion.name}
            ?registered=${suggestion.registered}
            ?loading=${this.loading}
            ?disabled=${suggestion.registered || this.loading}
            data-testid="account-name-suggestion"
            @click=${() => this.onSubmitName(suggestion.name)}
          ></wui-account-name-suggestion-item>`)}
    </wui-flex>`;
  }
  isAllowedToSubmit(name) {
    const pureName = name.split(".")?.[0];
    const isRegistered = this.suggestions.find((s) => s.name?.split(".")?.[0] === pureName && s.registered);
    return !this.loading && !this.error && !this.profileName && pureName && EnsController.validateName(pureName) && !isRegistered;
  }
  async onSubmitName(name) {
    try {
      if (!this.isAllowedToSubmit(name)) {
        return;
      }
      EventsController.sendEvent({
        type: "track",
        event: "REGISTER_NAME_INITIATED",
        properties: {
          isSmartAccount: getPreferredAccountType(ChainController.state.activeChain) === W3mFrameRpcConstants.ACCOUNT_TYPES.SMART_ACCOUNT,
          ensName: name
        }
      });
      await EnsController.registerName(name);
      EventsController.sendEvent({
        type: "track",
        event: "REGISTER_NAME_SUCCESS",
        properties: {
          isSmartAccount: getPreferredAccountType(ChainController.state.activeChain) === W3mFrameRpcConstants.ACCOUNT_TYPES.SMART_ACCOUNT,
          ensName: name
        }
      });
    } catch (error) {
      SnackController.showError(error.message);
      EventsController.sendEvent({
        type: "track",
        event: "REGISTER_NAME_ERROR",
        properties: {
          isSmartAccount: getPreferredAccountType(ChainController.state.activeChain) === W3mFrameRpcConstants.ACCOUNT_TYPES.SMART_ACCOUNT,
          ensName: name,
          error: CoreHelperUtil.parseError(error)
        }
      });
    }
  }
  onEnterKey(event) {
    if (event.key === "Enter" && this.name && this.isAllowedToSubmit(this.name)) {
      const reownName = `${this.name}${ConstantsUtil$1.WC_NAME_SUFFIX}`;
      this.onSubmitName(reownName);
    }
  }
};
W3mRegisterAccountNameView.styles = styles$1;
__decorate$1([
  n()
], W3mRegisterAccountNameView.prototype, "errorMessage", void 0);
__decorate$1([
  r()
], W3mRegisterAccountNameView.prototype, "name", void 0);
__decorate$1([
  r()
], W3mRegisterAccountNameView.prototype, "error", void 0);
__decorate$1([
  r()
], W3mRegisterAccountNameView.prototype, "loading", void 0);
__decorate$1([
  r()
], W3mRegisterAccountNameView.prototype, "suggestions", void 0);
__decorate$1([
  r()
], W3mRegisterAccountNameView.prototype, "profileName", void 0);
W3mRegisterAccountNameView = __decorate$1([
  customElement("w3m-register-account-name-view")
], W3mRegisterAccountNameView);
const styles = i`
  .continue-button-container {
    width: 100%;
  }
`;
var __decorate = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mRegisterAccountNameSuccess = class W3mRegisterAccountNameSuccess2 extends i$1 {
  render() {
    return x`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        gap="6"
        .padding=${["0", "0", "4", "0"]}
      >
        ${this.onboardingTemplate()} ${this.buttonsTemplate()}
        <wui-link
          @click=${() => {
      CoreHelperUtil.openHref(NavigationUtil.URLS.FAQ, "_blank");
    }}
        >
          Learn more
          <wui-icon color="inherit" slot="iconRight" name="externalLink"></wui-icon>
        </wui-link>
      </wui-flex>
    `;
  }
  onboardingTemplate() {
    return x` <wui-flex
      flexDirection="column"
      gap="6"
      alignItems="center"
      .padding=${["0", "6", "0", "6"]}
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
    return x`<wui-flex
      .padding=${["0", "4", "0", "4"]}
      gap="3"
      class="continue-button-container"
    >
      <wui-button fullWidth size="lg" borderRadius="xs" @click=${this.redirectToAccount.bind(this)}
        >Let's Go!
      </wui-button>
    </wui-flex>`;
  }
  redirectToAccount() {
    RouterController.replace("Account");
  }
};
W3mRegisterAccountNameSuccess.styles = styles;
W3mRegisterAccountNameSuccess = __decorate([
  customElement("w3m-register-account-name-success-view")
], W3mRegisterAccountNameSuccess);
export {
  W3mApproveTransactionView,
  W3mRegisterAccountNameSuccess,
  W3mRegisterAccountNameView,
  W3mSmartAccountSettingsView,
  W3mUpgradeWalletView
};
