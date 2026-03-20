import { n as css, r as resetStyles, o as elementStyles, q as i, x, a as ChainController, O as OptionsController, a1 as AssetController, G as AssetUtil, c as CoreHelperUtil, M as ModalController, t as i$1, b as EventsController, I as StorageUtil, l as ConnectorController, C as ConstantsUtil, R as RouterController, h as ConstantsUtil$1, S as SnackController, m as ConnectionController, u as getPreferredAccountType, W as W3mFrameRpcConstants, ah as ConnectorUtil, ai as ConnectionControllerUtil, ac as HelpersUtil$1, aa as ParseUtil, U as ApiController, z as AlertController, X as ErrorUtil, V as W3mFrameProvider, Q as ConstantsUtil$2, aj as WalletUtil, a2 as AppKitError, a3 as ErrorUtil$1, a5 as SIWXUtil, ak as NetworkUtil } from "./walletconnect-BVoLvI4P.js";
import { n, c as customElement, U as UiHelperUtil, r, b as e } from "./index-5878y4Sm.js";
import { o } from "./if-defined-DpCpmSxP.js";
import "./index-SiM7Ib3-.js";
import "./index-DAKl5XGv.js";
import "./index-BIT3XyMh.js";
import "./index-Cm7UDlkl.js";
import { a, W } from "./index-4b6jC2di.js";
import "./index-W8RzVVH7.js";
import "./index-B80WMNJI.js";
import "./index-Bag94m_F.js";
import { W as W3mConnectingWidget } from "./basic-BdHQPBTW.js";
import { a as a2, c, b, d } from "./basic-BdHQPBTW.js";
import "./index-CBcUV-KC.js";
import "./index-FTJ7N_Mw.js";
import { E as ExchangeController } from "./ExchangeController-B7cVzwpX.js";
import { H as HelpersUtil } from "./HelpersUtil-DHNzaUb2.js";
import "./index-DD4AQ_vp.js";
import "./index-BNTvwCof.js";
import "./index-B6Sdk_ow.js";
import { M as MathUtil } from "./MathUtil-BspOY7Kj.js";
import "./index-Cztg-IpD.js";
import "./index-B9aMMm-V.js";
import "./index-BH8iPnnC.js";
import { e as e$1, n as n$1 } from "./ref-j6LTZZuR.js";
import "./index-DMZ0VmVF.js";
import { O as OptionsStateController } from "./index-CqrG0F4W.js";
import { e as executeSocialLogin } from "./index-BYXJPSCB.js";
import "./index-Bz3_ZVag.js";
import { N as NavigationUtil } from "./NavigationUtil-Ci15WS4K.js";
import "./index-DlOLZoKC.js";
import "./index-Oesj6-8K.js";
import "./index-73GArslZ.js";
import "./index-D7Al7wfJ.js";
import "./index-lAjfmR0R.js";
import "./index-DgvHPQm2.js";
import "./index-Bga-Wh90.js";
import "./browser-3QHqHj2W.js";
import "./index-xvpTmtDJ.js";
import "./ConstantsUtil-BrK1znIM.js";
import "./relativeTime-8MZMp0Re.js";
const styles$x = css`
  :host {
    display: block;
  }

  button {
    border-radius: ${({ borderRadius }) => borderRadius["20"]};
    background: ${({ tokens }) => tokens.theme.foregroundPrimary};
    display: flex;
    gap: ${({ spacing }) => spacing[1]};
    padding: ${({ spacing }) => spacing[1]};
    color: ${({ tokens }) => tokens.theme.textSecondary};
    border-radius: ${({ borderRadius }) => borderRadius[16]};
    height: 32px;
    transition: box-shadow ${({ durations }) => durations["lg"]}
      ${({ easings }) => easings["ease-out-power-2"]};
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

    wui-flex.network-image-container wui-icon {
      background: ${({ tokens }) => tokens.theme.foregroundPrimary};
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
    border-radius: ${({ borderRadius }) => borderRadius[16]};
  }

  wui-text {
    white-space: nowrap;
  }

  button wui-flex.balance-container {
    height: 100%;
    border-radius: ${({ borderRadius }) => borderRadius[16]};
    padding-left: ${({ spacing }) => spacing[1]};
    padding-right: ${({ spacing }) => spacing[1]};
    background: ${({ tokens }) => tokens.theme.foregroundSecondary};
    color: ${({ tokens }) => tokens.theme.textPrimary};
    transition: background-color ${({ durations }) => durations["lg"]}
      ${({ easings }) => easings["ease-out-power-2"]};
    will-change: background-color;
  }

  /* -- Hover & Active states ----------------------------------------------------------- */
  button:hover:enabled,
  button:focus-visible:enabled,
  button:active:enabled {
    box-shadow: 0px 0px 8px 0px rgba(0, 0, 0, 0.2);

    wui-flex.balance-container {
      background: ${({ tokens }) => tokens.theme.foregroundTertiary};
    }
  }

  /* -- Disabled states --------------------------------------------------- */
  button:disabled wui-text,
  button:disabled wui-flex.avatar-container {
    opacity: 0.3;
  }
`;
var __decorate$K = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let WuiAccountButton = class WuiAccountButton2 extends i {
  constructor() {
    super(...arguments);
    this.networkSrc = void 0;
    this.avatarSrc = void 0;
    this.balance = void 0;
    this.isUnsupportedChain = void 0;
    this.disabled = false;
    this.loading = false;
    this.address = "";
    this.profileName = "";
    this.charsStart = 4;
    this.charsEnd = 6;
  }
  render() {
    return x`
      <button
        ?disabled=${this.disabled}
        class=${o(this.balance ? void 0 : "local-no-balance")}
        data-error=${o(this.isUnsupportedChain)}
      >
        ${this.imageTemplate()} ${this.addressTemplate()} ${this.balanceTemplate()}
      </button>
    `;
  }
  imageTemplate() {
    const networkElement = this.networkSrc ? x`<wui-image src=${this.networkSrc}></wui-image>` : x` <wui-icon size="inherit" color="inherit" name="networkPlaceholder"></wui-icon> `;
    return x`<wui-flex class="avatar-container">
      <wui-avatar
        .imageSrc=${this.avatarSrc}
        alt=${this.address}
        address=${this.address}
      ></wui-avatar>

      <wui-flex class="network-image-container">${networkElement}</wui-flex>
    </wui-flex>`;
  }
  addressTemplate() {
    return x`<wui-text variant="md-regular" color="inherit">
      ${this.address ? UiHelperUtil.getTruncateString({
      string: this.profileName || this.address,
      charsStart: this.profileName ? 18 : this.charsStart,
      charsEnd: this.profileName ? 0 : this.charsEnd,
      truncate: this.profileName ? "end" : "middle"
    }) : null}
    </wui-text>`;
  }
  balanceTemplate() {
    if (this.balance) {
      const balanceTemplate = this.loading ? x`<wui-loading-spinner size="md" color="inherit"></wui-loading-spinner>` : x`<wui-text variant="md-regular" color="inherit"> ${this.balance}</wui-text>`;
      return x`<wui-flex alignItems="center" justifyContent="center" class="balance-container"
        >${balanceTemplate}</wui-flex
      >`;
    }
    return null;
  }
};
WuiAccountButton.styles = [resetStyles, elementStyles, styles$x];
__decorate$K([
  n()
], WuiAccountButton.prototype, "networkSrc", void 0);
__decorate$K([
  n()
], WuiAccountButton.prototype, "avatarSrc", void 0);
__decorate$K([
  n()
], WuiAccountButton.prototype, "balance", void 0);
__decorate$K([
  n({ type: Boolean })
], WuiAccountButton.prototype, "isUnsupportedChain", void 0);
__decorate$K([
  n({ type: Boolean })
], WuiAccountButton.prototype, "disabled", void 0);
__decorate$K([
  n({ type: Boolean })
], WuiAccountButton.prototype, "loading", void 0);
__decorate$K([
  n()
], WuiAccountButton.prototype, "address", void 0);
__decorate$K([
  n()
], WuiAccountButton.prototype, "profileName", void 0);
__decorate$K([
  n()
], WuiAccountButton.prototype, "charsStart", void 0);
__decorate$K([
  n()
], WuiAccountButton.prototype, "charsEnd", void 0);
WuiAccountButton = __decorate$K([
  customElement("wui-account-button")
], WuiAccountButton);
var __decorate$J = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
class W3mAccountButtonBase extends i {
  constructor() {
    super(...arguments);
    this.unsubscribe = [];
    this.disabled = false;
    this.balance = "show";
    this.charsStart = 4;
    this.charsEnd = 6;
    this.namespace = void 0;
    this.isSupported = OptionsController.state.allowUnsupportedChain ? true : ChainController.state.activeChain ? ChainController.checkIfSupportedNetwork(ChainController.state.activeChain) : true;
  }
  connectedCallback() {
    super.connectedCallback();
    this.setAccountData(ChainController.getAccountData(this.namespace));
    this.setNetworkData(ChainController.getNetworkData(this.namespace));
  }
  firstUpdated() {
    const namespace = this.namespace;
    if (namespace) {
      this.unsubscribe.push(ChainController.subscribeChainProp("accountState", (val) => {
        this.setAccountData(val);
      }, namespace), ChainController.subscribeChainProp("networkState", (val) => {
        this.setNetworkData(val);
        this.isSupported = ChainController.checkIfSupportedNetwork(namespace, val?.caipNetwork?.caipNetworkId);
      }, namespace));
    } else {
      this.unsubscribe.push(AssetController.subscribeNetworkImages(() => {
        this.networkImage = AssetUtil.getNetworkImage(this.network);
      }), ChainController.subscribeKey("activeCaipAddress", (val) => {
        this.caipAddress = val;
      }), ChainController.subscribeChainProp("accountState", (accountState) => {
        this.setAccountData(accountState);
      }), ChainController.subscribeKey("activeCaipNetwork", (val) => {
        this.network = val;
        this.networkImage = AssetUtil.getNetworkImage(val);
        this.isSupported = val?.chainNamespace ? ChainController.checkIfSupportedNetwork(val?.chainNamespace) : true;
        this.fetchNetworkImage(val);
      }));
    }
  }
  updated() {
    this.fetchNetworkImage(this.network);
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
  }
  render() {
    if (!ChainController.state.activeChain) {
      return null;
    }
    const shouldShowBalance = this.balance === "show";
    const shouldShowLoading = typeof this.balanceVal !== "string";
    const { formattedText } = CoreHelperUtil.parseBalance(this.balanceVal, this.balanceSymbol);
    return x`
      <wui-account-button
        .disabled=${Boolean(this.disabled)}
        .isUnsupportedChain=${OptionsController.state.allowUnsupportedChain ? false : !this.isSupported}
        address=${o(CoreHelperUtil.getPlainAddress(this.caipAddress))}
        profileName=${o(this.profileName)}
        networkSrc=${o(this.networkImage)}
        avatarSrc=${o(this.profileImage)}
        balance=${shouldShowBalance ? formattedText : ""}
        @click=${this.onClick.bind(this)}
        data-testid=${`account-button${this.namespace ? `-${this.namespace}` : ""}`}
        .charsStart=${this.charsStart}
        .charsEnd=${this.charsEnd}
        ?loading=${shouldShowLoading}
      >
      </wui-account-button>
    `;
  }
  onClick() {
    if (this.isSupported || OptionsController.state.allowUnsupportedChain) {
      ModalController.open({ namespace: this.namespace });
    } else {
      ModalController.open({ view: "UnsupportedChain" });
    }
  }
  async fetchNetworkImage(network) {
    if (network?.assets?.imageId) {
      this.networkImage = await AssetUtil.fetchNetworkImage(network?.assets?.imageId);
    }
  }
  setAccountData(accountState) {
    if (!accountState) {
      return;
    }
    this.caipAddress = accountState.caipAddress;
    this.balanceVal = accountState.balance;
    this.balanceSymbol = accountState.balanceSymbol;
    this.profileName = accountState.profileName;
    this.profileImage = accountState.profileImage;
  }
  setNetworkData(networkState) {
    if (!networkState) {
      return;
    }
    this.network = networkState.caipNetwork;
    this.networkImage = AssetUtil.getNetworkImage(networkState.caipNetwork);
  }
}
__decorate$J([
  n({ type: Boolean })
], W3mAccountButtonBase.prototype, "disabled", void 0);
__decorate$J([
  n()
], W3mAccountButtonBase.prototype, "balance", void 0);
__decorate$J([
  n()
], W3mAccountButtonBase.prototype, "charsStart", void 0);
__decorate$J([
  n()
], W3mAccountButtonBase.prototype, "charsEnd", void 0);
__decorate$J([
  n()
], W3mAccountButtonBase.prototype, "namespace", void 0);
__decorate$J([
  r()
], W3mAccountButtonBase.prototype, "caipAddress", void 0);
__decorate$J([
  r()
], W3mAccountButtonBase.prototype, "balanceVal", void 0);
__decorate$J([
  r()
], W3mAccountButtonBase.prototype, "balanceSymbol", void 0);
__decorate$J([
  r()
], W3mAccountButtonBase.prototype, "profileName", void 0);
__decorate$J([
  r()
], W3mAccountButtonBase.prototype, "profileImage", void 0);
__decorate$J([
  r()
], W3mAccountButtonBase.prototype, "network", void 0);
__decorate$J([
  r()
], W3mAccountButtonBase.prototype, "networkImage", void 0);
__decorate$J([
  r()
], W3mAccountButtonBase.prototype, "isSupported", void 0);
let W3mAccountButton = class W3mAccountButton2 extends W3mAccountButtonBase {
};
W3mAccountButton = __decorate$J([
  customElement("w3m-account-button")
], W3mAccountButton);
let AppKitAccountButton = class AppKitAccountButton2 extends W3mAccountButtonBase {
};
AppKitAccountButton = __decorate$J([
  customElement("appkit-account-button")
], AppKitAccountButton);
const styles$w = i$1`
  :host {
    display: block;
    width: max-content;
  }
`;
var __decorate$I = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
class W3mButtonBase extends i {
  constructor() {
    super(...arguments);
    this.unsubscribe = [];
    this.disabled = false;
    this.balance = void 0;
    this.size = void 0;
    this.label = void 0;
    this.loadingLabel = void 0;
    this.charsStart = 4;
    this.charsEnd = 6;
    this.namespace = void 0;
  }
  firstUpdated() {
    this.caipAddress = this.namespace ? ChainController.getAccountData(this.namespace)?.caipAddress : ChainController.state.activeCaipAddress;
    if (this.namespace) {
      this.unsubscribe.push(ChainController.subscribeChainProp("accountState", (val) => {
        this.caipAddress = val?.caipAddress;
      }, this.namespace));
    } else {
      this.unsubscribe.push(ChainController.subscribeKey("activeCaipAddress", (val) => this.caipAddress = val));
    }
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
  }
  render() {
    return this.caipAddress ? x`
          <appkit-account-button
            .disabled=${Boolean(this.disabled)}
            balance=${o(this.balance)}
            .charsStart=${o(this.charsStart)}
            .charsEnd=${o(this.charsEnd)}
            namespace=${o(this.namespace)}
          >
          </appkit-account-button>
        ` : x`
          <appkit-connect-button
            size=${o(this.size)}
            label=${o(this.label)}
            loadingLabel=${o(this.loadingLabel)}
            namespace=${o(this.namespace)}
          ></appkit-connect-button>
        `;
  }
}
W3mButtonBase.styles = styles$w;
__decorate$I([
  n({ type: Boolean })
], W3mButtonBase.prototype, "disabled", void 0);
__decorate$I([
  n()
], W3mButtonBase.prototype, "balance", void 0);
__decorate$I([
  n()
], W3mButtonBase.prototype, "size", void 0);
__decorate$I([
  n()
], W3mButtonBase.prototype, "label", void 0);
__decorate$I([
  n()
], W3mButtonBase.prototype, "loadingLabel", void 0);
__decorate$I([
  n()
], W3mButtonBase.prototype, "charsStart", void 0);
__decorate$I([
  n()
], W3mButtonBase.prototype, "charsEnd", void 0);
__decorate$I([
  n()
], W3mButtonBase.prototype, "namespace", void 0);
__decorate$I([
  r()
], W3mButtonBase.prototype, "caipAddress", void 0);
let W3mButton = class W3mButton2 extends W3mButtonBase {
};
W3mButton = __decorate$I([
  customElement("w3m-button")
], W3mButton);
let AppKitButton = class AppKitButton2 extends W3mButtonBase {
};
AppKitButton = __decorate$I([
  customElement("appkit-button")
], AppKitButton);
const styles$v = css`
  :host {
    position: relative;
    display: block;
  }

  button {
    border-radius: ${({ borderRadius }) => borderRadius[2]};
  }

  button[data-size='sm'] {
    padding: ${({ spacing }) => spacing[2]};
  }

  button[data-size='md'] {
    padding: ${({ spacing }) => spacing[3]};
  }

  button[data-size='lg'] {
    padding: ${({ spacing }) => spacing[4]};
  }

  button[data-variant='primary'] {
    background: ${({ tokens }) => tokens.core.backgroundAccentPrimary};
  }

  button[data-variant='secondary'] {
    background: ${({ tokens }) => tokens.core.foregroundAccent010};
  }

  button:hover:enabled {
    border-radius: ${({ borderRadius }) => borderRadius[3]};
  }

  button:disabled {
    cursor: not-allowed;
  }

  button[data-loading='true'] {
    cursor: not-allowed;
  }

  button[data-loading='true'][data-size='sm'] {
    border-radius: ${({ borderRadius }) => borderRadius[32]};
    padding: ${({ spacing }) => spacing[2]} ${({ spacing }) => spacing[3]};
  }

  button[data-loading='true'][data-size='md'] {
    border-radius: ${({ borderRadius }) => borderRadius[20]};
    padding: ${({ spacing }) => spacing[3]} ${({ spacing }) => spacing[4]};
  }

  button[data-loading='true'][data-size='lg'] {
    border-radius: ${({ borderRadius }) => borderRadius[16]};
    padding: ${({ spacing }) => spacing[4]} ${({ spacing }) => spacing[5]};
  }
`;
var __decorate$H = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let WuiConnectButton = class WuiConnectButton2 extends i {
  constructor() {
    super(...arguments);
    this.size = "md";
    this.variant = "primary";
    this.loading = false;
    this.text = "Connect Wallet";
  }
  render() {
    return x`
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
    const textVariants = {
      lg: "lg-regular",
      md: "md-regular",
      sm: "sm-regular"
    };
    const colors = {
      primary: "invert",
      secondary: "accent-primary"
    };
    if (!this.loading) {
      return x` <wui-text variant=${textVariants[this.size]} color=${colors[this.variant]}>
        ${this.text}
      </wui-text>`;
    }
    return x`<wui-loading-spinner
      color=${colors[this.variant]}
      size=${this.size}
    ></wui-loading-spinner>`;
  }
};
WuiConnectButton.styles = [resetStyles, elementStyles, styles$v];
__decorate$H([
  n()
], WuiConnectButton.prototype, "size", void 0);
__decorate$H([
  n()
], WuiConnectButton.prototype, "variant", void 0);
__decorate$H([
  n({ type: Boolean })
], WuiConnectButton.prototype, "loading", void 0);
__decorate$H([
  n()
], WuiConnectButton.prototype, "text", void 0);
WuiConnectButton = __decorate$H([
  customElement("wui-connect-button")
], WuiConnectButton);
var __decorate$G = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
class W3mConnectButtonBase extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.size = "md";
    this.label = "Connect Wallet";
    this.loadingLabel = "Connecting...";
    this.open = ModalController.state.open;
    this.loading = this.namespace ? ModalController.state.loadingNamespaceMap.get(this.namespace) : ModalController.state.loading;
    this.unsubscribe.push(ModalController.subscribe((val) => {
      this.open = val.open;
      this.loading = this.namespace ? val.loadingNamespaceMap.get(this.namespace) : val.loading;
    }));
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
  }
  render() {
    return x`
      <wui-connect-button
        size=${o(this.size)}
        .loading=${this.loading}
        @click=${this.onClick.bind(this)}
        data-testid=${`connect-button${this.namespace ? `-${this.namespace}` : ""}`}
      >
        ${this.loading ? this.loadingLabel : this.label}
      </wui-connect-button>
    `;
  }
  onClick() {
    if (this.open) {
      ModalController.close();
    } else if (!this.loading) {
      ModalController.open({ view: "Connect", namespace: this.namespace });
    }
  }
}
__decorate$G([
  n()
], W3mConnectButtonBase.prototype, "size", void 0);
__decorate$G([
  n()
], W3mConnectButtonBase.prototype, "label", void 0);
__decorate$G([
  n()
], W3mConnectButtonBase.prototype, "loadingLabel", void 0);
__decorate$G([
  n()
], W3mConnectButtonBase.prototype, "namespace", void 0);
__decorate$G([
  r()
], W3mConnectButtonBase.prototype, "open", void 0);
__decorate$G([
  r()
], W3mConnectButtonBase.prototype, "loading", void 0);
let W3mConnectButton = class W3mConnectButton2 extends W3mConnectButtonBase {
};
W3mConnectButton = __decorate$G([
  customElement("w3m-connect-button")
], W3mConnectButton);
let AppKitConnectButton = class AppKitConnectButton2 extends W3mConnectButtonBase {
};
AppKitConnectButton = __decorate$G([
  customElement("appkit-connect-button")
], AppKitConnectButton);
const styles$u = css`
  :host {
    display: block;
  }

  button {
    border-radius: ${({ borderRadius }) => borderRadius[32]};
    display: flex;
    gap: ${({ spacing }) => spacing[1]};
    padding: ${({ spacing }) => spacing[1]} ${({ spacing }) => spacing[2]}
      ${({ spacing }) => spacing[1]} ${({ spacing }) => spacing[1]};
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (hover: hover) {
    button:hover:enabled {
      background-color: ${({ tokens }) => tokens.theme.foregroundSecondary};
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
    border-radius: ${({ borderRadius }) => borderRadius[32]};
  }
`;
var __decorate$F = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let WuiNetworkButton = class WuiNetworkButton2 extends i {
  constructor() {
    super(...arguments);
    this.imageSrc = void 0;
    this.isUnsupportedChain = void 0;
    this.disabled = false;
    this.size = "lg";
  }
  render() {
    const textVariant = {
      sm: "sm-regular",
      md: "md-regular",
      lg: "lg-regular"
    };
    return x`
      <button data-size=${this.size} data-testid="wui-network-button" ?disabled=${this.disabled}>
        ${this.visualTemplate()}
        <wui-text variant=${textVariant[this.size]} color="primary">
          <slot></slot>
        </wui-text>
      </button>
    `;
  }
  visualTemplate() {
    if (this.isUnsupportedChain) {
      return x` <wui-icon-box color="error" icon="warningCircle"></wui-icon-box> `;
    }
    if (this.imageSrc) {
      return x`<wui-image src=${this.imageSrc}></wui-image>`;
    }
    return x` <wui-icon size="xl" color="default" name="networkPlaceholder"></wui-icon> `;
  }
};
WuiNetworkButton.styles = [resetStyles, elementStyles, styles$u];
__decorate$F([
  n()
], WuiNetworkButton.prototype, "imageSrc", void 0);
__decorate$F([
  n({ type: Boolean })
], WuiNetworkButton.prototype, "isUnsupportedChain", void 0);
__decorate$F([
  n({ type: Boolean })
], WuiNetworkButton.prototype, "disabled", void 0);
__decorate$F([
  n()
], WuiNetworkButton.prototype, "size", void 0);
WuiNetworkButton = __decorate$F([
  customElement("wui-network-button")
], WuiNetworkButton);
const styles$t = i$1`
  :host {
    display: block;
    width: max-content;
  }
`;
var __decorate$E = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
class W3mNetworkButtonBase extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.disabled = false;
    this.network = ChainController.state.activeCaipNetwork;
    this.networkImage = AssetUtil.getNetworkImage(this.network);
    this.caipAddress = ChainController.state.activeCaipAddress;
    this.loading = ModalController.state.loading;
    this.isSupported = OptionsController.state.allowUnsupportedChain ? true : ChainController.state.activeChain ? ChainController.checkIfSupportedNetwork(ChainController.state.activeChain) : true;
    this.unsubscribe.push(...[
      AssetController.subscribeNetworkImages(() => {
        this.networkImage = AssetUtil.getNetworkImage(this.network);
      }),
      ChainController.subscribeKey("activeCaipAddress", (val) => {
        this.caipAddress = val;
      }),
      ChainController.subscribeKey("activeCaipNetwork", (val) => {
        this.network = val;
        this.networkImage = AssetUtil.getNetworkImage(val);
        this.isSupported = val?.chainNamespace ? ChainController.checkIfSupportedNetwork(val.chainNamespace) : true;
        AssetUtil.fetchNetworkImage(val?.assets?.imageId);
      }),
      ModalController.subscribeKey("loading", (val) => this.loading = val)
    ]);
  }
  firstUpdated() {
    AssetUtil.fetchNetworkImage(this.network?.assets?.imageId);
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
  }
  render() {
    const isSupported = this.network ? ChainController.checkIfSupportedNetwork(this.network.chainNamespace) : true;
    return x`
      <wui-network-button
        .disabled=${Boolean(this.disabled || this.loading)}
        .isUnsupportedChain=${OptionsController.state.allowUnsupportedChain ? false : !isSupported}
        imageSrc=${o(this.networkImage)}
        @click=${this.onClick.bind(this)}
        data-testid="w3m-network-button"
      >
        ${this.getLabel()}
        <slot></slot>
      </wui-network-button>
    `;
  }
  getLabel() {
    if (this.network) {
      if (!this.isSupported && !OptionsController.state.allowUnsupportedChain) {
        return "Switch Network";
      }
      return this.network.name;
    }
    if (this.label) {
      return this.label;
    }
    if (this.caipAddress) {
      return "Unknown Network";
    }
    return "Select Network";
  }
  onClick() {
    if (!this.loading) {
      EventsController.sendEvent({ type: "track", event: "CLICK_NETWORKS" });
      ModalController.open({ view: "Networks" });
    }
  }
}
W3mNetworkButtonBase.styles = styles$t;
__decorate$E([
  n({ type: Boolean })
], W3mNetworkButtonBase.prototype, "disabled", void 0);
__decorate$E([
  n({ type: String })
], W3mNetworkButtonBase.prototype, "label", void 0);
__decorate$E([
  r()
], W3mNetworkButtonBase.prototype, "network", void 0);
__decorate$E([
  r()
], W3mNetworkButtonBase.prototype, "networkImage", void 0);
__decorate$E([
  r()
], W3mNetworkButtonBase.prototype, "caipAddress", void 0);
__decorate$E([
  r()
], W3mNetworkButtonBase.prototype, "loading", void 0);
__decorate$E([
  r()
], W3mNetworkButtonBase.prototype, "isSupported", void 0);
let W3mNetworkButton = class W3mNetworkButton2 extends W3mNetworkButtonBase {
};
W3mNetworkButton = __decorate$E([
  customElement("w3m-network-button")
], W3mNetworkButton);
let AppKitNetworkButton = class AppKitNetworkButton2 extends W3mNetworkButtonBase {
};
AppKitNetworkButton = __decorate$E([
  customElement("appkit-network-button")
], AppKitNetworkButton);
const styles$s = css`
  :host {
    display: block;
  }

  button {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${({ spacing }) => spacing[4]};
    padding: ${({ spacing }) => spacing[3]};
    border-radius: ${({ borderRadius }) => borderRadius[4]};
    background-color: ${({ tokens }) => tokens.core.foregroundAccent010};
  }

  wui-flex > wui-icon {
    padding: ${({ spacing }) => spacing[2]};
    color: ${({ tokens }) => tokens.theme.textInvert};
    background-color: ${({ tokens }) => tokens.core.backgroundAccentPrimary};
    border-radius: ${({ borderRadius }) => borderRadius[2]};
    align-items: center;
  }

  @media (hover: hover) {
    button:hover:enabled {
      background-color: ${({ tokens }) => tokens.core.foregroundAccent020};
    }
  }
`;
var __decorate$D = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let WuiNoticeCard = class WuiNoticeCard2 extends i {
  constructor() {
    super(...arguments);
    this.label = "";
    this.description = "";
    this.icon = "wallet";
  }
  render() {
    return x`
      <button>
        <wui-flex gap="2" alignItems="center">
          <wui-icon weight="fill" size="lg" name=${this.icon} color="inherit"></wui-icon>
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
WuiNoticeCard.styles = [resetStyles, elementStyles, styles$s];
__decorate$D([
  n()
], WuiNoticeCard.prototype, "label", void 0);
__decorate$D([
  n()
], WuiNoticeCard.prototype, "description", void 0);
__decorate$D([
  n()
], WuiNoticeCard.prototype, "icon", void 0);
WuiNoticeCard = __decorate$D([
  customElement("wui-notice-card")
], WuiNoticeCard);
var __decorate$C = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mAccountAuthButton = class W3mAccountAuthButton2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.socialProvider = StorageUtil.getConnectedSocialProvider();
    this.socialUsername = StorageUtil.getConnectedSocialUsername();
    this.namespace = ChainController.state.activeChain;
    this.unsubscribe.push(ChainController.subscribeKey("activeChain", (namespace) => {
      this.namespace = namespace;
    }));
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsub) => unsub());
  }
  render() {
    const connectorId = ConnectorController.getConnectorId(this.namespace);
    const authConnector = ConnectorController.getAuthConnector();
    if (!authConnector || connectorId !== ConstantsUtil.CONNECTOR_ID.AUTH) {
      this.style.cssText = `display: none`;
      return null;
    }
    const email = authConnector.provider.getEmail() ?? "";
    if (!email && !this.socialUsername) {
      this.style.cssText = `display: none`;
      return null;
    }
    return x`
      <wui-list-item
        ?rounded=${true}
        icon=${this.socialProvider ?? "mail"}
        data-testid="w3m-account-email-update"
        ?chevron=${!this.socialProvider}
        @click=${() => {
      this.onGoToUpdateEmail(email, this.socialProvider);
    }}
      >
        <wui-text variant="lg-regular" color="primary">${this.getAuthName(email)}</wui-text>
      </wui-list-item>
    `;
  }
  onGoToUpdateEmail(email, socialProvider) {
    if (!socialProvider) {
      RouterController.push("UpdateEmailWallet", { email, redirectView: "Account" });
    }
  }
  getAuthName(email) {
    if (this.socialUsername) {
      if (this.socialProvider === "discord" && this.socialUsername.endsWith("0")) {
        return this.socialUsername.slice(0, -1);
      }
      return this.socialUsername;
    }
    return email.length > 30 ? `${email.slice(0, -3)}...` : email;
  }
};
__decorate$C([
  r()
], W3mAccountAuthButton.prototype, "namespace", void 0);
W3mAccountAuthButton = __decorate$C([
  customElement("w3m-account-auth-button")
], W3mAccountAuthButton);
var __decorate$B = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mAccountSettingsView = class W3mAccountSettingsView2 extends i {
  constructor() {
    super();
    this.usubscribe = [];
    this.networkImages = AssetController.state.networkImages;
    this.address = ChainController.getAccountData()?.address;
    this.profileImage = ChainController.getAccountData()?.profileImage;
    this.profileName = ChainController.getAccountData()?.profileName;
    this.network = ChainController.state.activeCaipNetwork;
    this.disconnecting = false;
    this.remoteFeatures = OptionsController.state.remoteFeatures;
    this.usubscribe.push(...[
      ChainController.subscribeChainProp("accountState", (val) => {
        if (val) {
          this.address = val.address;
          this.profileImage = val.profileImage;
          this.profileName = val.profileName;
        }
      }),
      ChainController.subscribeKey("activeCaipNetwork", (val) => {
        if (val?.id) {
          this.network = val;
        }
      }),
      OptionsController.subscribeKey("remoteFeatures", (val) => {
        this.remoteFeatures = val;
      })
    ]);
  }
  disconnectedCallback() {
    this.usubscribe.forEach((unsubscribe) => unsubscribe());
  }
  render() {
    if (!this.address) {
      throw new Error("w3m-account-settings-view: No account provided");
    }
    const networkImage = this.networkImages[this.network?.assets?.imageId ?? ""];
    return x`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        gap="4"
        .padding=${["0", "5", "3", "5"]}
      >
        <wui-avatar
          alt=${this.address}
          address=${this.address}
          imageSrc=${o(this.profileImage)}
          size="lg"
        ></wui-avatar>
        <wui-flex flexDirection="column" alignItems="center">
          <wui-flex gap="1" alignItems="center" justifyContent="center">
            <wui-text variant="h5-medium" color="primary" data-testid="account-settings-address">
              ${UiHelperUtil.getTruncateString({
      string: this.address,
      charsStart: 4,
      charsEnd: 6,
      truncate: "middle"
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
        <wui-flex flexDirection="column" gap="2" .padding=${["6", "4", "3", "4"]}>
          ${this.authCardTemplate()}
          <w3m-account-auth-button></w3m-account-auth-button>
          <wui-list-item
            imageSrc=${o(networkImage)}
            ?chevron=${this.isAllowedNetworkSwitch()}
            ?fullSize=${true}
            ?rounded=${true}
            @click=${this.onNetworks.bind(this)}
            data-testid="account-switch-network-button"
          >
            <wui-text variant="lg-regular" color="primary">
              ${this.network?.name ?? "Unknown"}
            </wui-text>
          </wui-list-item>
          ${this.smartAccountSettingsTemplate()} ${this.chooseNameButtonTemplate()}
          <wui-list-item
            ?rounded=${true}
            icon="power"
            iconColor="error"
            ?chevron=${false}
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
    const namespace = this.network?.chainNamespace;
    const connectorId = ConnectorController.getConnectorId(namespace);
    const authConnector = ConnectorController.getAuthConnector();
    const hasNetworkSupport = ChainController.checkIfNamesSupported();
    if (!hasNetworkSupport || !authConnector || connectorId !== ConstantsUtil.CONNECTOR_ID.AUTH || this.profileName) {
      return null;
    }
    return x`
      <wui-list-item
        icon="id"
        ?rounded=${true}
        ?chevron=${true}
        @click=${this.onChooseName.bind(this)}
        data-testid="account-choose-name-button"
      >
        <wui-text variant="lg-regular" color="primary">Choose account name </wui-text>
      </wui-list-item>
    `;
  }
  authCardTemplate() {
    const connectorId = ConnectorController.getConnectorId(this.network?.chainNamespace);
    const authConnector = ConnectorController.getAuthConnector();
    const { origin } = location;
    if (!authConnector || connectorId !== ConstantsUtil.CONNECTOR_ID.AUTH || origin.includes(ConstantsUtil$1.SECURE_SITE)) {
      return null;
    }
    return x`
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
    const requestedCaipNetworks = ChainController.getAllRequestedCaipNetworks();
    const isMultiNetwork = requestedCaipNetworks ? requestedCaipNetworks.length > 1 : false;
    const isValidNetwork = requestedCaipNetworks?.find(({ id }) => id === this.network?.id);
    return isMultiNetwork || !isValidNetwork;
  }
  onCopyAddress() {
    try {
      if (this.address) {
        CoreHelperUtil.copyToClopboard(this.address);
        SnackController.showSuccess("Address copied");
      }
    } catch {
      SnackController.showError("Failed to copy");
    }
  }
  smartAccountSettingsTemplate() {
    const namespace = this.network?.chainNamespace;
    const isNetworkEnabled = ChainController.checkIfSmartAccountEnabled();
    const connectorId = ConnectorController.getConnectorId(namespace);
    const authConnector = ConnectorController.getAuthConnector();
    if (!authConnector || connectorId !== ConstantsUtil.CONNECTOR_ID.AUTH || !isNetworkEnabled) {
      return null;
    }
    return x`
      <wui-list-item
        icon="user"
        ?rounded=${true}
        ?chevron=${true}
        @click=${this.onSmartAccountSettings.bind(this)}
        data-testid="account-smart-account-settings-button"
      >
        <wui-text variant="lg-regular" color="primary">Smart Account Settings</wui-text>
      </wui-list-item>
    `;
  }
  onChooseName() {
    RouterController.push("ChooseAccountName");
  }
  onNetworks() {
    if (this.isAllowedNetworkSwitch()) {
      RouterController.push("Networks");
    }
  }
  async onDisconnect() {
    try {
      this.disconnecting = true;
      const namespace = this.network?.chainNamespace;
      const connectionsByNamespace = ConnectionController.getConnections(namespace);
      const hasConnections = connectionsByNamespace.length > 0;
      const connectorId = namespace && ConnectorController.state.activeConnectorIds[namespace];
      const isMultiWalletEnabled = this.remoteFeatures?.multiWallet;
      await ConnectionController.disconnect(isMultiWalletEnabled ? { id: connectorId, namespace } : {});
      if (hasConnections && isMultiWalletEnabled) {
        RouterController.push("ProfileWallets");
        SnackController.showSuccess("Wallet deleted");
      }
    } catch {
      EventsController.sendEvent({
        type: "track",
        event: "DISCONNECT_ERROR",
        properties: { message: "Failed to disconnect" }
      });
      SnackController.showError("Failed to disconnect");
    } finally {
      this.disconnecting = false;
    }
  }
  onGoToUpgradeView() {
    EventsController.sendEvent({ type: "track", event: "EMAIL_UPGRADE_FROM_MODAL" });
    RouterController.push("UpgradeEmailWallet");
  }
  onSmartAccountSettings() {
    RouterController.push("SmartAccountSettings");
  }
};
__decorate$B([
  r()
], W3mAccountSettingsView.prototype, "address", void 0);
__decorate$B([
  r()
], W3mAccountSettingsView.prototype, "profileImage", void 0);
__decorate$B([
  r()
], W3mAccountSettingsView.prototype, "profileName", void 0);
__decorate$B([
  r()
], W3mAccountSettingsView.prototype, "network", void 0);
__decorate$B([
  r()
], W3mAccountSettingsView.prototype, "disconnecting", void 0);
__decorate$B([
  r()
], W3mAccountSettingsView.prototype, "remoteFeatures", void 0);
W3mAccountSettingsView = __decorate$B([
  customElement("w3m-account-settings-view")
], W3mAccountSettingsView);
const styles$r = css`
  wui-icon-link {
    margin-right: calc(${({ spacing }) => spacing["8"]} * -1);
  }

  wui-notice-card {
    margin-bottom: ${({ spacing }) => spacing["1"]};
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
    gap: ${({ spacing }) => spacing["3"]};
    height: 48px;
    padding: ${({ spacing }) => spacing["2"]};
    padding-right: ${({ spacing }) => spacing["3"]};
    box-shadow: inset 0 0 0 1px ${({ tokens }) => tokens.theme.foregroundPrimary};
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
    border-radius: ${({ borderRadius }) => borderRadius[6]};
    transition: background-color ${({ durations }) => durations["lg"]}
      ${({ easings }) => easings["ease-out-power-2"]};
  }

  .account-button:hover {
    background-color: ${({ tokens }) => tokens.core.glass010};
  }

  .avatar-container {
    position: relative;
  }

  wui-avatar.avatar {
    width: 32px;
    height: 32px;
    box-shadow: 0 0 0 2px ${({ tokens }) => tokens.core.glass010};
  }

  wui-wallet-switch {
    margin-top: ${({ spacing }) => spacing["2"]};
  }

  wui-avatar.network-avatar {
    width: 16px;
    height: 16px;
    position: absolute;
    left: 100%;
    top: 100%;
    transform: translate(-75%, -75%);
    box-shadow: 0 0 0 2px ${({ tokens }) => tokens.core.glass010};
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
      background-color ${({ durations }) => durations["md"]}
        ${({ easings }) => easings["ease-out-power-1"]},
      opacity ${({ durations }) => durations["md"]} ${({ easings }) => easings["ease-out-power-1"]};
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
var __decorate$A = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mAccountDefaultWidget = class W3mAccountDefaultWidget2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.caipAddress = ChainController.getAccountData()?.caipAddress;
    this.address = CoreHelperUtil.getPlainAddress(ChainController.getAccountData()?.caipAddress);
    this.profileImage = ChainController.getAccountData()?.profileImage;
    this.profileName = ChainController.getAccountData()?.profileName;
    this.disconnecting = false;
    this.balance = ChainController.getAccountData()?.balance;
    this.balanceSymbol = ChainController.getAccountData()?.balanceSymbol;
    this.features = OptionsController.state.features;
    this.remoteFeatures = OptionsController.state.remoteFeatures;
    this.namespace = ChainController.state.activeChain;
    this.activeConnectorIds = ConnectorController.state.activeConnectorIds;
    this.unsubscribe.push(...[
      ChainController.subscribeChainProp("accountState", (val) => {
        this.address = CoreHelperUtil.getPlainAddress(val?.caipAddress);
        this.caipAddress = val?.caipAddress;
        this.balance = val?.balance;
        this.balanceSymbol = val?.balanceSymbol;
        this.profileName = val?.profileName;
        this.profileImage = val?.profileImage;
      }),
      OptionsController.subscribeKey("features", (val) => this.features = val),
      OptionsController.subscribeKey("remoteFeatures", (val) => this.remoteFeatures = val),
      ConnectorController.subscribeKey("activeConnectorIds", (newActiveConnectorIds) => {
        this.activeConnectorIds = newActiveConnectorIds;
      }),
      ChainController.subscribeKey("activeChain", (val) => this.namespace = val),
      ChainController.subscribeKey("activeCaipNetwork", (val) => {
        if (val?.chainNamespace) {
          this.namespace = val?.chainNamespace;
        }
      })
    ]);
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
  }
  render() {
    if (!this.caipAddress || !this.namespace) {
      return null;
    }
    const connectorId = this.activeConnectorIds[this.namespace];
    const connector = connectorId ? ConnectorController.getConnectorById(connectorId) : void 0;
    const connectorImage = AssetUtil.getConnectorImage(connector);
    const { value, decimals, symbol } = CoreHelperUtil.parseBalance(this.balance, this.balanceSymbol);
    return x`<wui-flex
        flexDirection="column"
        .padding=${["0", "5", "4", "5"]}
        alignItems="center"
        gap="3"
      >
        <wui-avatar
          alt=${o(this.caipAddress)}
          address=${o(CoreHelperUtil.getPlainAddress(this.caipAddress))}
          imageSrc=${o(this.profileImage === null ? void 0 : this.profileImage)}
          data-testid="single-account-avatar"
        ></wui-avatar>
        <wui-wallet-switch
          profileName=${this.profileName}
          address=${this.address}
          imageSrc=${connectorImage}
          alt=${connector?.name}
          @click=${this.onGoToProfileWalletsView.bind(this)}
          data-testid="wui-wallet-switch"
        ></wui-wallet-switch>
        <div class="balance-container">
          <wui-text variant="h3-regular" color="primary">${value}</wui-text>
          <wui-text variant="h3-regular" color="secondary">.${decimals}</wui-text>
          <wui-text variant="h6-medium" color="primary" class="symbol">${symbol}</wui-text>
        </div>
        ${this.explorerBtnTemplate()}
      </wui-flex>

      <wui-flex flexDirection="column" gap="2" .padding=${["0", "3", "3", "3"]}>
        ${this.authCardTemplate()} <w3m-account-auth-button></w3m-account-auth-button>
        ${this.orderedFeaturesTemplate()} ${this.activityTemplate()}
        <wui-list-item
          .rounded=${true}
          icon="power"
          iconColor="error"
          ?chevron=${false}
          .loading=${this.disconnecting}
          .rightIcon=${false}
          @click=${this.onDisconnect.bind(this)}
          data-testid="disconnect-button"
        >
          <wui-text variant="lg-regular" color="primary">Disconnect</wui-text>
        </wui-list-item>
      </wui-flex>`;
  }
  fundWalletTemplate() {
    if (!this.namespace) {
      return null;
    }
    const isOnrampSupported = ConstantsUtil$1.ONRAMP_SUPPORTED_CHAIN_NAMESPACES.includes(this.namespace);
    const isReceiveEnabled = Boolean(this.features?.receive);
    const isOnrampEnabled = this.remoteFeatures?.onramp && isOnrampSupported;
    const isPayWithExchangeEnabled = ExchangeController.isPayWithExchangeEnabled();
    if (!isOnrampEnabled && !isReceiveEnabled && !isPayWithExchangeEnabled) {
      return null;
    }
    return x`
      <wui-list-item
        .rounded=${true}
        data-testid="w3m-account-default-fund-wallet-button"
        iconVariant="blue"
        icon="dollar"
        ?chevron=${true}
        @click=${this.handleClickFundWallet.bind(this)}
      >
        <wui-text variant="lg-regular" color="primary">Fund wallet</wui-text>
      </wui-list-item>
    `;
  }
  orderedFeaturesTemplate() {
    const featuresOrder = this.features?.walletFeaturesOrder || ConstantsUtil$1.DEFAULT_FEATURES.walletFeaturesOrder;
    return featuresOrder.map((feature) => {
      switch (feature) {
        case "onramp":
          return this.fundWalletTemplate();
        case "swaps":
          return this.swapsTemplate();
        case "send":
          return this.sendTemplate();
        default:
          return null;
      }
    });
  }
  activityTemplate() {
    if (!this.namespace) {
      return null;
    }
    const isEnabled = this.remoteFeatures?.activity && ConstantsUtil$1.ACTIVITY_ENABLED_CHAIN_NAMESPACES.includes(this.namespace);
    return isEnabled ? x` <wui-list-item
          .rounded=${true}
          icon="clock"
          ?chevron=${true}
          @click=${this.onTransactions.bind(this)}
          data-testid="w3m-account-default-activity-button"
        >
          <wui-text variant="lg-regular" color="primary">Activity</wui-text>
        </wui-list-item>` : null;
  }
  swapsTemplate() {
    const isSwapsEnabled = this.remoteFeatures?.swaps;
    const isEvm = ChainController.state.activeChain === ConstantsUtil.CHAIN.EVM;
    if (!isSwapsEnabled || !isEvm) {
      return null;
    }
    return x`
      <wui-list-item
        .rounded=${true}
        icon="recycleHorizontal"
        ?chevron=${true}
        @click=${this.handleClickSwap.bind(this)}
        data-testid="w3m-account-default-swaps-button"
      >
        <wui-text variant="lg-regular" color="primary">Swap</wui-text>
      </wui-list-item>
    `;
  }
  sendTemplate() {
    const isSendEnabled = this.features?.send;
    const namespace = ChainController.state.activeChain;
    if (!namespace) {
      throw new Error("SendController:sendTemplate - namespace is required");
    }
    const isSendSupported = ConstantsUtil$1.SEND_SUPPORTED_NAMESPACES.includes(namespace);
    if (!isSendEnabled || !isSendSupported) {
      return null;
    }
    return x`
      <wui-list-item
        .rounded=${true}
        icon="send"
        ?chevron=${true}
        @click=${this.handleClickSend.bind(this)}
        data-testid="w3m-account-default-send-button"
      >
        <wui-text variant="lg-regular" color="primary">Send</wui-text>
      </wui-list-item>
    `;
  }
  authCardTemplate() {
    const namespace = ChainController.state.activeChain;
    if (!namespace) {
      throw new Error("AuthCardTemplate:authCardTemplate - namespace is required");
    }
    const connectorId = ConnectorController.getConnectorId(namespace);
    const authConnector = ConnectorController.getAuthConnector();
    const { origin } = location;
    if (!authConnector || connectorId !== ConstantsUtil.CONNECTOR_ID.AUTH || origin.includes(ConstantsUtil$1.SECURE_SITE)) {
      return null;
    }
    return x`
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
    RouterController.push("FundWallet");
  }
  handleClickSwap() {
    RouterController.push("Swap");
  }
  handleClickSend() {
    RouterController.push("WalletSend");
  }
  explorerBtnTemplate() {
    const addressExplorerUrl = ChainController.getAccountData()?.addressExplorerUrl;
    if (!addressExplorerUrl) {
      return null;
    }
    return x`
      <wui-button size="md" variant="accent-primary" @click=${this.onExplorer.bind(this)}>
        <wui-icon size="sm" color="inherit" slot="iconLeft" name="compass"></wui-icon>
        Block Explorer
        <wui-icon size="sm" color="inherit" slot="iconRight" name="externalLink"></wui-icon>
      </wui-button>
    `;
  }
  onTransactions() {
    EventsController.sendEvent({
      type: "track",
      event: "CLICK_TRANSACTIONS",
      properties: {
        isSmartAccount: getPreferredAccountType(ChainController.state.activeChain) === W3mFrameRpcConstants.ACCOUNT_TYPES.SMART_ACCOUNT
      }
    });
    RouterController.push("Transactions");
  }
  async onDisconnect() {
    try {
      this.disconnecting = true;
      const connectionsByNamespace = ConnectionController.getConnections(this.namespace);
      const hasConnections = connectionsByNamespace.length > 0;
      const connectorId = this.namespace && ConnectorController.state.activeConnectorIds[this.namespace];
      const isMultiWalletEnabled = this.remoteFeatures?.multiWallet;
      await ConnectionController.disconnect(isMultiWalletEnabled ? { id: connectorId, namespace: this.namespace } : {});
      if (hasConnections && isMultiWalletEnabled) {
        RouterController.push("ProfileWallets");
        SnackController.showSuccess("Wallet deleted");
      }
    } catch {
      EventsController.sendEvent({
        type: "track",
        event: "DISCONNECT_ERROR",
        properties: { message: "Failed to disconnect" }
      });
      SnackController.showError("Failed to disconnect");
    } finally {
      this.disconnecting = false;
    }
  }
  onExplorer() {
    const addressExplorerUrl = ChainController.getAccountData()?.addressExplorerUrl;
    if (addressExplorerUrl) {
      CoreHelperUtil.openHref(addressExplorerUrl, "_blank");
    }
  }
  onGoToUpgradeView() {
    EventsController.sendEvent({ type: "track", event: "EMAIL_UPGRADE_FROM_MODAL" });
    RouterController.push("UpgradeEmailWallet");
  }
  onGoToProfileWalletsView() {
    RouterController.push("ProfileWallets");
  }
};
W3mAccountDefaultWidget.styles = styles$r;
__decorate$A([
  r()
], W3mAccountDefaultWidget.prototype, "caipAddress", void 0);
__decorate$A([
  r()
], W3mAccountDefaultWidget.prototype, "address", void 0);
__decorate$A([
  r()
], W3mAccountDefaultWidget.prototype, "profileImage", void 0);
__decorate$A([
  r()
], W3mAccountDefaultWidget.prototype, "profileName", void 0);
__decorate$A([
  r()
], W3mAccountDefaultWidget.prototype, "disconnecting", void 0);
__decorate$A([
  r()
], W3mAccountDefaultWidget.prototype, "balance", void 0);
__decorate$A([
  r()
], W3mAccountDefaultWidget.prototype, "balanceSymbol", void 0);
__decorate$A([
  r()
], W3mAccountDefaultWidget.prototype, "features", void 0);
__decorate$A([
  r()
], W3mAccountDefaultWidget.prototype, "remoteFeatures", void 0);
__decorate$A([
  r()
], W3mAccountDefaultWidget.prototype, "namespace", void 0);
__decorate$A([
  r()
], W3mAccountDefaultWidget.prototype, "activeConnectorIds", void 0);
W3mAccountDefaultWidget = __decorate$A([
  customElement("w3m-account-default-widget")
], W3mAccountDefaultWidget);
const styles$q = css`
  span {
    font-weight: 500;
    font-size: 38px;
    color: ${({ tokens }) => tokens.theme.textPrimary};
    line-height: 38px;
    letter-spacing: -2%;
    text-align: center;
    font-family: var(--apkt-fontFamily-regular);
  }

  .pennies {
    color: ${({ tokens }) => tokens.theme.textSecondary};
  }
`;
var __decorate$z = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let WuiBalance = class WuiBalance2 extends i {
  constructor() {
    super(...arguments);
    this.dollars = "0";
    this.pennies = "00";
  }
  render() {
    return x`<span>$${this.dollars}<span class="pennies">.${this.pennies}</span></span>`;
  }
};
WuiBalance.styles = [resetStyles, styles$q];
__decorate$z([
  n()
], WuiBalance.prototype, "dollars", void 0);
__decorate$z([
  n()
], WuiBalance.prototype, "pennies", void 0);
WuiBalance = __decorate$z([
  customElement("wui-balance")
], WuiBalance);
const styles$p = css`
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
    background-color: ${({ colors }) => colors.neutrals100};
  }

  :host([data-variant='shade']) {
    background-color: ${({ colors }) => colors.neutrals900};
  }

  :host([data-variant='fill']) > wui-text {
    color: ${({ colors }) => colors.black};
  }

  :host([data-variant='shade']) > wui-text {
    color: ${({ colors }) => colors.white};
  }

  :host([data-variant='fill']) > wui-icon {
    color: ${({ colors }) => colors.neutrals100};
  }

  :host([data-variant='shade']) > wui-icon {
    color: ${({ colors }) => colors.neutrals900};
  }

  /* -- Sizes --------------------------------------------------------- */
  :host([data-size='sm']) {
    padding: ${({ spacing }) => spacing[1]} ${({ spacing }) => spacing[2]};
    border-radius: ${({ borderRadius }) => borderRadius[2]};
  }

  :host([data-size='md']) {
    padding: ${({ spacing }) => spacing[2]} ${({ spacing }) => spacing[3]};
    border-radius: ${({ borderRadius }) => borderRadius[3]};
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
var __decorate$y = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
const TEXT_SIZE = {
  sm: "sm-regular",
  md: "md-regular"
};
let WuiTooltip = class WuiTooltip2 extends i {
  constructor() {
    super(...arguments);
    this.placement = "top";
    this.variant = "fill";
    this.size = "md";
    this.message = "";
  }
  render() {
    this.dataset["variant"] = this.variant;
    this.dataset["size"] = this.size;
    return x`<wui-icon data-placement=${this.placement} size="inherit" name="cursor"></wui-icon>
      <wui-text variant=${TEXT_SIZE[this.size]}>${this.message}</wui-text>`;
  }
};
WuiTooltip.styles = [resetStyles, elementStyles, styles$p];
__decorate$y([
  n()
], WuiTooltip.prototype, "placement", void 0);
__decorate$y([
  n()
], WuiTooltip.prototype, "variant", void 0);
__decorate$y([
  n()
], WuiTooltip.prototype, "size", void 0);
__decorate$y([
  n()
], WuiTooltip.prototype, "message", void 0);
WuiTooltip = __decorate$y([
  customElement("wui-tooltip")
], WuiTooltip);
const styles$o = i$1`
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
var __decorate$x = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mAccountActivityWidget = class W3mAccountActivityWidget2 extends i {
  render() {
    return x`<w3m-activity-list page="account"></w3m-activity-list>`;
  }
};
W3mAccountActivityWidget.styles = styles$o;
W3mAccountActivityWidget = __decorate$x([
  customElement("w3m-account-activity-widget")
], W3mAccountActivityWidget);
const styles$n = css`
  :host {
    width: 100%;
  }

  button {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: ${({ spacing }) => spacing[4]};
    padding: ${({ spacing }) => spacing[4]};
    background-color: transparent;
    border-radius: ${({ borderRadius }) => borderRadius[4]};
  }

  wui-text {
    max-width: 174px;
  }

  .tag-container {
    width: fit-content;
  }

  @media (hover: hover) {
    button:hover:enabled {
      background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
    }
  }
`;
var __decorate$w = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let WuiListDescription = class WuiListDescription2 extends i {
  constructor() {
    super(...arguments);
    this.icon = "card";
    this.text = "";
    this.description = "";
    this.tag = void 0;
    this.disabled = false;
  }
  render() {
    return x`
      <button ?disabled=${this.disabled}>
        <wui-flex alignItems="center" gap="3">
          <wui-icon-box padding="2" color="secondary" icon=${this.icon} size="lg"></wui-icon-box>
          <wui-flex flexDirection="column" gap="1">
            <wui-text variant="md-medium" color="primary">${this.text}</wui-text>
            ${this.description ? x`<wui-text variant="md-regular" color="secondary">
                  ${this.description}</wui-text
                >` : null}
          </wui-flex>
        </wui-flex>

        <wui-flex class="tag-container" alignItems="center" gap="1" justifyContent="flex-end">
          ${this.tag ? x`<wui-tag tagType="main" size="sm">${this.tag}</wui-tag>` : null}
          <wui-icon size="md" name="chevronRight" color="default"></wui-icon>
        </wui-flex>
      </button>
    `;
  }
};
WuiListDescription.styles = [resetStyles, elementStyles, styles$n];
__decorate$w([
  n()
], WuiListDescription.prototype, "icon", void 0);
__decorate$w([
  n()
], WuiListDescription.prototype, "text", void 0);
__decorate$w([
  n()
], WuiListDescription.prototype, "description", void 0);
__decorate$w([
  n()
], WuiListDescription.prototype, "tag", void 0);
__decorate$w([
  n({ type: Boolean })
], WuiListDescription.prototype, "disabled", void 0);
WuiListDescription = __decorate$w([
  customElement("wui-list-description")
], WuiListDescription);
const styles$m = i$1`
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
var __decorate$v = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mAccountTokensWidget = class W3mAccountTokensWidget2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.tokenBalance = ChainController.getAccountData()?.tokenBalance;
    this.remoteFeatures = OptionsController.state.remoteFeatures;
    this.unsubscribe.push(...[
      ChainController.subscribeChainProp("accountState", (val) => {
        this.tokenBalance = val?.tokenBalance;
      }),
      OptionsController.subscribeKey("remoteFeatures", (val) => {
        this.remoteFeatures = val;
      })
    ]);
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
  }
  render() {
    return x`${this.tokenTemplate()}`;
  }
  tokenTemplate() {
    if (this.tokenBalance && this.tokenBalance?.length > 0) {
      return x`<wui-flex class="contentContainer" flexDirection="column" gap="2">
        ${this.tokenItemTemplate()}
      </wui-flex>`;
    }
    return x` <wui-flex flexDirection="column">
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
    if (this.remoteFeatures?.onramp) {
      return x`<wui-list-description
        @click=${this.onBuyClick.bind(this)}
        text="Buy Crypto"
        description="Easy with card or bank account"
        icon="card"
        iconColor="success-100"
        iconBackgroundColor="success-100"
        tag="popular"
        data-testid="w3m-account-onramp-button"
      ></wui-list-description>`;
    }
    return x``;
  }
  tokenItemTemplate() {
    return this.tokenBalance?.map((token) => x`<wui-list-token
          tokenName=${token.name}
          tokenImageUrl=${token.iconUrl}
          tokenAmount=${token.quantity.numeric}
          tokenValue=${token.value}
          tokenCurrency=${token.symbol}
        ></wui-list-token>`);
  }
  onReceiveClick() {
    RouterController.push("WalletReceive");
  }
  onBuyClick() {
    EventsController.sendEvent({
      type: "track",
      event: "SELECT_BUY_CRYPTO",
      properties: {
        isSmartAccount: getPreferredAccountType(ChainController.state.activeChain) === W3mFrameRpcConstants.ACCOUNT_TYPES.SMART_ACCOUNT
      }
    });
    RouterController.push("OnRampProviders");
  }
};
W3mAccountTokensWidget.styles = styles$m;
__decorate$v([
  r()
], W3mAccountTokensWidget.prototype, "tokenBalance", void 0);
__decorate$v([
  r()
], W3mAccountTokensWidget.prototype, "remoteFeatures", void 0);
W3mAccountTokensWidget = __decorate$v([
  customElement("w3m-account-tokens-widget")
], W3mAccountTokensWidget);
const styles$l = css`
  wui-flex {
    width: 100%;
  }

  wui-promo {
    position: absolute;
    top: -32px;
  }

  wui-profile-button {
    margin-top: calc(-1 * ${({ spacing }) => spacing["4"]});
  }

  wui-promo + wui-profile-button {
    margin-top: ${({ spacing }) => spacing["4"]};
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
    border-radius: ${({ borderRadius }) => borderRadius["3"]};
  }

  .contentContainer > .textContent {
    width: 65%;
  }
`;
var __decorate$u = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mAccountWalletFeaturesWidget = class W3mAccountWalletFeaturesWidget2 extends i {
  constructor() {
    super(...arguments);
    this.unsubscribe = [];
    this.network = ChainController.state.activeCaipNetwork;
    this.profileName = ChainController.getAccountData()?.profileName;
    this.address = ChainController.getAccountData()?.address;
    this.currentTab = ChainController.getAccountData()?.currentTab;
    this.tokenBalance = ChainController.getAccountData()?.tokenBalance;
    this.features = OptionsController.state.features;
    this.namespace = ChainController.state.activeChain;
    this.activeConnectorIds = ConnectorController.state.activeConnectorIds;
    this.remoteFeatures = OptionsController.state.remoteFeatures;
  }
  firstUpdated() {
    ChainController.fetchTokenBalance();
    this.unsubscribe.push(...[
      ChainController.subscribeChainProp("accountState", (val) => {
        if (val?.address) {
          this.address = val.address;
          this.profileName = val.profileName;
          this.currentTab = val.currentTab;
          this.tokenBalance = val.tokenBalance;
        } else {
          ModalController.close();
        }
      })
    ], ConnectorController.subscribeKey("activeConnectorIds", (newActiveConnectorIds) => {
      this.activeConnectorIds = newActiveConnectorIds;
    }), ChainController.subscribeKey("activeChain", (val) => this.namespace = val), ChainController.subscribeKey("activeCaipNetwork", (val) => this.network = val), OptionsController.subscribeKey("features", (val) => this.features = val), OptionsController.subscribeKey("remoteFeatures", (val) => this.remoteFeatures = val));
    this.watchSwapValues();
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
    clearInterval(this.watchTokenBalance);
  }
  render() {
    if (!this.address) {
      throw new Error("w3m-account-features-widget: No account provided");
    }
    if (!this.namespace) {
      return null;
    }
    const connectorId = this.activeConnectorIds[this.namespace];
    const connector = connectorId ? ConnectorController.getConnectorById(connectorId) : void 0;
    const { icon, iconSize } = this.getAuthData();
    return x`<wui-flex
      flexDirection="column"
      .padding=${["0", "3", "4", "3"]}
      alignItems="center"
      gap="4"
      data-testid="w3m-account-wallet-features-widget"
    >
      <wui-flex flexDirection="column" justifyContent="center" alignItems="center" gap="2">
        <wui-wallet-switch
          profileName=${this.profileName}
          address=${this.address}
          icon=${icon}
          iconSize=${iconSize}
          alt=${connector?.name}
          @click=${this.onGoToProfileWalletsView.bind(this)}
          data-testid="wui-wallet-switch"
        ></wui-wallet-switch>

        ${this.tokenBalanceTemplate()}
      </wui-flex>
      ${this.orderedWalletFeatures()} ${this.tabsTemplate()} ${this.listContentTemplate()}
    </wui-flex>`;
  }
  orderedWalletFeatures() {
    const walletFeaturesOrder = this.features?.walletFeaturesOrder || ConstantsUtil$1.DEFAULT_FEATURES.walletFeaturesOrder;
    const isAllDisabled = walletFeaturesOrder.every((feature) => {
      if (feature === "send" || feature === "receive") {
        return !this.features?.[feature];
      }
      if (feature === "swaps" || feature === "onramp") {
        return !this.remoteFeatures?.[feature];
      }
      return true;
    });
    if (isAllDisabled) {
      return null;
    }
    const mergedFeaturesOrder = walletFeaturesOrder.map((feature) => {
      if (feature === "receive" || feature === "onramp") {
        return "fund";
      }
      return feature;
    });
    const deduplicatedFeaturesOrder = [...new Set(mergedFeaturesOrder)];
    return x`<wui-flex gap="2">
      ${deduplicatedFeaturesOrder.map((feature) => {
      switch (feature) {
        case "fund":
          return this.fundWalletTemplate();
        case "swaps":
          return this.swapsTemplate();
        case "send":
          return this.sendTemplate();
        default:
          return null;
      }
    })}
    </wui-flex>`;
  }
  fundWalletTemplate() {
    if (!this.namespace) {
      return null;
    }
    const isOnrampSupported = ConstantsUtil$1.ONRAMP_SUPPORTED_CHAIN_NAMESPACES.includes(this.namespace);
    const isReceiveEnabled = this.features?.receive;
    const isOnrampEnabled = this.remoteFeatures?.onramp && isOnrampSupported;
    const isPayWithExchangeEnabled = ExchangeController.isPayWithExchangeEnabled();
    if (!isOnrampEnabled && !isReceiveEnabled && !isPayWithExchangeEnabled) {
      return null;
    }
    return x`
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
    const isSwapsEnabled = this.remoteFeatures?.swaps;
    const isEvm = ChainController.state.activeChain === ConstantsUtil.CHAIN.EVM;
    if (!isSwapsEnabled || !isEvm) {
      return null;
    }
    return x`
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
    const isSendEnabled = this.features?.send;
    const activeNamespace = ChainController.state.activeChain;
    const isSendSupported = ConstantsUtil$1.SEND_SUPPORTED_NAMESPACES.includes(activeNamespace);
    if (!isSendEnabled || !isSendSupported) {
      return null;
    }
    return x`
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
    this.watchTokenBalance = setInterval(() => ChainController.fetchTokenBalance((error) => this.onTokenBalanceError(error)), 1e4);
  }
  onTokenBalanceError(error) {
    if (error instanceof Error && error.cause instanceof Response) {
      const statusCode = error.cause.status;
      if (statusCode === ConstantsUtil.HTTP_STATUS_CODES.SERVICE_UNAVAILABLE) {
        clearInterval(this.watchTokenBalance);
      }
    }
  }
  listContentTemplate() {
    if (this.currentTab === 0) {
      return x`<w3m-account-tokens-widget></w3m-account-tokens-widget>`;
    }
    if (this.currentTab === 1) {
      return x`<w3m-account-activity-widget></w3m-account-activity-widget>`;
    }
    return x`<w3m-account-tokens-widget></w3m-account-tokens-widget>`;
  }
  tokenBalanceTemplate() {
    if (this.tokenBalance && this.tokenBalance?.length >= 0) {
      const value = CoreHelperUtil.calculateBalance(this.tokenBalance);
      const { dollars = "0", pennies = "00" } = CoreHelperUtil.formatTokenBalance(value);
      return x`<wui-balance dollars=${dollars} pennies=${pennies}></wui-balance>`;
    }
    return x`<wui-balance dollars="0" pennies="00"></wui-balance>`;
  }
  tabsTemplate() {
    const tabsByNamespace = HelpersUtil.getTabsByNamespace(ChainController.state.activeChain);
    if (tabsByNamespace.length === 0) {
      return null;
    }
    return x`<wui-tabs
      .onTabChange=${this.onTabChange.bind(this)}
      .activeTab=${this.currentTab}
      .tabs=${tabsByNamespace}
    ></wui-tabs>`;
  }
  onTabChange(index) {
    ChainController.setAccountProp("currentTab", index, this.namespace);
  }
  onFundWalletClick() {
    RouterController.push("FundWallet");
  }
  onSwapClick() {
    if (this.network?.caipNetworkId && !ConstantsUtil$1.SWAP_SUPPORTED_NETWORKS.includes(this.network?.caipNetworkId)) {
      RouterController.push("UnsupportedChain", {
        swapUnsupportedChain: true
      });
    } else {
      EventsController.sendEvent({
        type: "track",
        event: "OPEN_SWAP",
        properties: {
          network: this.network?.caipNetworkId || "",
          isSmartAccount: getPreferredAccountType(ChainController.state.activeChain) === W3mFrameRpcConstants.ACCOUNT_TYPES.SMART_ACCOUNT
        }
      });
      RouterController.push("Swap");
    }
  }
  getAuthData() {
    const socialProvider = StorageUtil.getConnectedSocialProvider();
    const socialUsername = StorageUtil.getConnectedSocialUsername();
    const authConnector = ConnectorController.getAuthConnector();
    const email = authConnector?.provider.getEmail() ?? "";
    return {
      name: ConnectorUtil.getAuthName({
        email,
        socialUsername,
        socialProvider
      }),
      icon: socialProvider ?? "mail",
      iconSize: socialProvider ? "xl" : "md"
    };
  }
  onGoToProfileWalletsView() {
    RouterController.push("ProfileWallets");
  }
  onSendClick() {
    EventsController.sendEvent({
      type: "track",
      event: "OPEN_SEND",
      properties: {
        network: this.network?.caipNetworkId || "",
        isSmartAccount: getPreferredAccountType(ChainController.state.activeChain) === W3mFrameRpcConstants.ACCOUNT_TYPES.SMART_ACCOUNT
      }
    });
    RouterController.push("WalletSend");
  }
};
W3mAccountWalletFeaturesWidget.styles = styles$l;
__decorate$u([
  r()
], W3mAccountWalletFeaturesWidget.prototype, "watchTokenBalance", void 0);
__decorate$u([
  r()
], W3mAccountWalletFeaturesWidget.prototype, "network", void 0);
__decorate$u([
  r()
], W3mAccountWalletFeaturesWidget.prototype, "profileName", void 0);
__decorate$u([
  r()
], W3mAccountWalletFeaturesWidget.prototype, "address", void 0);
__decorate$u([
  r()
], W3mAccountWalletFeaturesWidget.prototype, "currentTab", void 0);
__decorate$u([
  r()
], W3mAccountWalletFeaturesWidget.prototype, "tokenBalance", void 0);
__decorate$u([
  r()
], W3mAccountWalletFeaturesWidget.prototype, "features", void 0);
__decorate$u([
  r()
], W3mAccountWalletFeaturesWidget.prototype, "namespace", void 0);
__decorate$u([
  r()
], W3mAccountWalletFeaturesWidget.prototype, "activeConnectorIds", void 0);
__decorate$u([
  r()
], W3mAccountWalletFeaturesWidget.prototype, "remoteFeatures", void 0);
W3mAccountWalletFeaturesWidget = __decorate$u([
  customElement("w3m-account-wallet-features-widget")
], W3mAccountWalletFeaturesWidget);
var __decorate$t = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mAccountView = class W3mAccountView2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.namespace = ChainController.state.activeChain;
    this.unsubscribe.push(ChainController.subscribeKey("activeChain", (namespace) => {
      this.namespace = namespace;
    }));
  }
  render() {
    if (!this.namespace) {
      return null;
    }
    const connectorId = ConnectorController.getConnectorId(this.namespace);
    const authConnector = ConnectorController.getAuthConnector();
    return x`
      ${authConnector && connectorId === ConstantsUtil.CONNECTOR_ID.AUTH ? this.walletFeaturesTemplate() : this.defaultTemplate()}
    `;
  }
  walletFeaturesTemplate() {
    return x`<w3m-account-wallet-features-widget></w3m-account-wallet-features-widget>`;
  }
  defaultTemplate() {
    return x`<w3m-account-default-widget></w3m-account-default-widget>`;
  }
};
__decorate$t([
  r()
], W3mAccountView.prototype, "namespace", void 0);
W3mAccountView = __decorate$t([
  customElement("w3m-account-view")
], W3mAccountView);
const styles$k = css`
  wui-image {
    width: 24px;
    height: 24px;
    border-radius: ${({ borderRadius }) => borderRadius[2]};
  }

  wui-image,
  .icon-box {
    width: 32px;
    height: 32px;
    border-radius: ${({ borderRadius }) => borderRadius[2]};
  }

  wui-icon:not(.custom-icon, .icon-badge) {
    cursor: pointer;
  }

  .icon-box {
    position: relative;
    border-radius: ${({ borderRadius }) => borderRadius[2]};
    background-color: ${({ tokens }) => tokens.theme.foregroundSecondary};
  }

  .icon-badge {
    position: absolute;
    top: 18px;
    left: 23px;
    z-index: 3;
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
    border: 2px solid ${({ tokens }) => tokens.theme.backgroundPrimary};
    border-radius: 50%;
    padding: ${({ spacing }) => spacing["01"]};
  }

  .icon-badge {
    width: 8px;
    height: 8px;
  }
`;
var __decorate$s = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let WuiActiveProfileWalletItem = class WuiActiveProfileWalletItem2 extends i {
  constructor() {
    super(...arguments);
    this.address = "";
    this.profileName = "";
    this.content = [];
    this.alt = "";
    this.imageSrc = "";
    this.icon = void 0;
    this.iconSize = "md";
    this.iconBadge = void 0;
    this.iconBadgeSize = "md";
    this.buttonVariant = "neutral-primary";
    this.enableMoreButton = false;
    this.charsStart = 4;
    this.charsEnd = 6;
  }
  render() {
    return x`
      <wui-flex flexDirection="column" rowgap="2">
        ${this.topTemplate()} ${this.bottomTemplate()}
      </wui-flex>
    `;
  }
  topTemplate() {
    return x`
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
        ${this.enableMoreButton ? x`<wui-icon-link
              variant="secondary"
              size="md"
              icon="threeDots"
              @click=${this.dispatchMoreButtonEvent}
              data-testid="wui-active-profile-wallet-item-more-button"
            ></wui-icon-link>` : null}
      </wui-flex>
    `;
  }
  bottomTemplate() {
    return x` <wui-flex flexDirection="column">${this.contentTemplate()}</wui-flex> `;
  }
  imageOrIconTemplate() {
    if (this.icon) {
      return x`
        <wui-flex flexGrow="1" alignItems="center">
          <wui-flex alignItems="center" justifyContent="center" class="icon-box">
            <wui-icon size="lg" color="default" name=${this.icon} class="custom-icon"></wui-icon>

            ${this.iconBadge ? x`<wui-icon
                  color="accent-primary"
                  size="inherit"
                  name=${this.iconBadge}
                  class="icon-badge"
                ></wui-icon>` : null}
          </wui-flex>
        </wui-flex>
      `;
    }
    return x`
      <wui-flex flexGrow="1" alignItems="center">
        <wui-image objectFit="contain" src=${this.imageSrc} alt=${this.alt}></wui-image>
      </wui-flex>
    `;
  }
  contentTemplate() {
    if (this.content.length === 0) {
      return null;
    }
    return x`
      <wui-flex flexDirection="column" rowgap="3">
        ${this.content.map((item) => this.labelAndTagTemplate(item))}
      </wui-flex>
    `;
  }
  labelAndTagTemplate({ address, profileName, label, description, enableButton, buttonType, buttonLabel, buttonVariant, tagVariant, tagLabel, alignItems = "flex-end" }) {
    return x`
      <wui-flex justifyContent="space-between" alignItems=${alignItems} columngap="1">
        <wui-flex flexDirection="column" rowgap="01">
          ${label ? x`<wui-text variant="sm-medium" color="secondary">${label}</wui-text>` : null}

          <wui-flex alignItems="center" columngap="1">
            <wui-text variant="md-regular" color="primary">
              ${UiHelperUtil.getTruncateString({
      string: profileName || address,
      charsStart: profileName ? 16 : this.charsStart,
      charsEnd: profileName ? 0 : this.charsEnd,
      truncate: profileName ? "end" : "middle"
    })}
            </wui-text>

            ${tagVariant && tagLabel ? x`<wui-tag variant=${tagVariant} size="sm">${tagLabel}</wui-tag>` : null}
          </wui-flex>

          ${description ? x`<wui-text variant="sm-regular" color="secondary">${description}</wui-text>` : null}
        </wui-flex>

        ${enableButton ? this.buttonTemplate({ buttonType, buttonLabel, buttonVariant }) : null}
      </wui-flex>
    `;
  }
  buttonTemplate({ buttonType, buttonLabel, buttonVariant }) {
    return x`
      <wui-button
        size="sm"
        variant=${buttonVariant}
        @click=${buttonType === "disconnect" ? this.dispatchDisconnectEvent.bind(this) : this.dispatchSwitchEvent.bind(this)}
        data-testid=${buttonType === "disconnect" ? "wui-active-profile-wallet-item-disconnect-button" : "wui-active-profile-wallet-item-switch-button"}
      >
        ${buttonLabel}
      </wui-button>
    `;
  }
  dispatchDisconnectEvent() {
    this.dispatchEvent(new CustomEvent("disconnect", { bubbles: true, composed: true }));
  }
  dispatchSwitchEvent() {
    this.dispatchEvent(new CustomEvent("switch", { bubbles: true, composed: true }));
  }
  dispatchExternalLinkEvent() {
    this.dispatchEvent(new CustomEvent("externalLink", { bubbles: true, composed: true }));
  }
  dispatchMoreButtonEvent() {
    this.dispatchEvent(new CustomEvent("more", { bubbles: true, composed: true }));
  }
  dispatchCopyEvent() {
    this.dispatchEvent(new CustomEvent("copy", { bubbles: true, composed: true }));
  }
};
WuiActiveProfileWalletItem.styles = [resetStyles, elementStyles, styles$k];
__decorate$s([
  n()
], WuiActiveProfileWalletItem.prototype, "address", void 0);
__decorate$s([
  n()
], WuiActiveProfileWalletItem.prototype, "profileName", void 0);
__decorate$s([
  n({ type: Array })
], WuiActiveProfileWalletItem.prototype, "content", void 0);
__decorate$s([
  n()
], WuiActiveProfileWalletItem.prototype, "alt", void 0);
__decorate$s([
  n()
], WuiActiveProfileWalletItem.prototype, "imageSrc", void 0);
__decorate$s([
  n()
], WuiActiveProfileWalletItem.prototype, "icon", void 0);
__decorate$s([
  n()
], WuiActiveProfileWalletItem.prototype, "iconSize", void 0);
__decorate$s([
  n()
], WuiActiveProfileWalletItem.prototype, "iconBadge", void 0);
__decorate$s([
  n()
], WuiActiveProfileWalletItem.prototype, "iconBadgeSize", void 0);
__decorate$s([
  n()
], WuiActiveProfileWalletItem.prototype, "buttonVariant", void 0);
__decorate$s([
  n({ type: Boolean })
], WuiActiveProfileWalletItem.prototype, "enableMoreButton", void 0);
__decorate$s([
  n({ type: Number })
], WuiActiveProfileWalletItem.prototype, "charsStart", void 0);
__decorate$s([
  n({ type: Number })
], WuiActiveProfileWalletItem.prototype, "charsEnd", void 0);
WuiActiveProfileWalletItem = __decorate$s([
  customElement("wui-active-profile-wallet-item")
], WuiActiveProfileWalletItem);
const styles$j = css`
  wui-image,
  .icon-box {
    width: 32px;
    height: 32px;
    border-radius: ${({ borderRadius }) => borderRadius[2]};
  }

  .right-icon {
    cursor: pointer;
  }

  .icon-box {
    position: relative;
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
  }

  .icon-badge {
    position: absolute;
    top: 18px;
    left: 23px;
    z-index: 3;
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
    border: 2px solid ${({ tokens }) => tokens.theme.backgroundPrimary};
    border-radius: 50%;
    padding: ${({ spacing }) => spacing["01"]};
  }

  .icon-badge {
    width: 8px;
    height: 8px;
  }
`;
var __decorate$r = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let WuiInactiveProfileWalletItem = class WuiInactiveProfileWalletItem2 extends i {
  constructor() {
    super(...arguments);
    this.address = "";
    this.profileName = "";
    this.alt = "";
    this.buttonLabel = "";
    this.buttonVariant = "accent-primary";
    this.imageSrc = "";
    this.icon = void 0;
    this.iconSize = "md";
    this.iconBadgeSize = "md";
    this.rightIcon = "signOut";
    this.rightIconSize = "md";
    this.loading = false;
    this.charsStart = 4;
    this.charsEnd = 6;
  }
  render() {
    return x`
      <wui-flex alignItems="center" columngap="2">
        ${this.imageOrIconTemplate()} ${this.labelAndDescriptionTemplate()}
        ${this.buttonActionTemplate()}
      </wui-flex>
    `;
  }
  imageOrIconTemplate() {
    if (this.icon) {
      return x`
        <wui-flex alignItems="center" justifyContent="center" class="icon-box">
          <wui-flex alignItems="center" justifyContent="center" class="icon-box">
            <wui-icon size="lg" color="default" name=${this.icon} class="custom-icon"></wui-icon>

            ${this.iconBadge ? x`<wui-icon
                  color="default"
                  size="inherit"
                  name=${this.iconBadge}
                  class="icon-badge"
                ></wui-icon>` : null}
          </wui-flex>
        </wui-flex>
      `;
    }
    return x`<wui-image objectFit="contain" src=${this.imageSrc} alt=${this.alt}></wui-image>`;
  }
  labelAndDescriptionTemplate() {
    return x`
      <wui-flex
        flexDirection="column"
        flexGrow="1"
        justifyContent="flex-start"
        alignItems="flex-start"
      >
        <wui-text variant="lg-regular" color="primary">
          ${UiHelperUtil.getTruncateString({
      string: this.profileName || this.address,
      charsStart: this.profileName ? 16 : this.charsStart,
      charsEnd: this.profileName ? 0 : this.charsEnd,
      truncate: this.profileName ? "end" : "middle"
    })}
        </wui-text>
      </wui-flex>
    `;
  }
  buttonActionTemplate() {
    return x`
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
          icon=${o(this.rightIcon)}
          class="right-icon"
          @click=${this.handleIconClick}
        ></wui-icon-link>
      </wui-flex>
    `;
  }
  handleButtonClick() {
    this.dispatchEvent(new CustomEvent("buttonClick", { bubbles: true, composed: true }));
  }
  handleIconClick() {
    this.dispatchEvent(new CustomEvent("iconClick", { bubbles: true, composed: true }));
  }
};
WuiInactiveProfileWalletItem.styles = [resetStyles, elementStyles, styles$j];
__decorate$r([
  n()
], WuiInactiveProfileWalletItem.prototype, "address", void 0);
__decorate$r([
  n()
], WuiInactiveProfileWalletItem.prototype, "profileName", void 0);
__decorate$r([
  n()
], WuiInactiveProfileWalletItem.prototype, "alt", void 0);
__decorate$r([
  n()
], WuiInactiveProfileWalletItem.prototype, "buttonLabel", void 0);
__decorate$r([
  n()
], WuiInactiveProfileWalletItem.prototype, "buttonVariant", void 0);
__decorate$r([
  n()
], WuiInactiveProfileWalletItem.prototype, "imageSrc", void 0);
__decorate$r([
  n()
], WuiInactiveProfileWalletItem.prototype, "icon", void 0);
__decorate$r([
  n()
], WuiInactiveProfileWalletItem.prototype, "iconSize", void 0);
__decorate$r([
  n()
], WuiInactiveProfileWalletItem.prototype, "iconBadge", void 0);
__decorate$r([
  n()
], WuiInactiveProfileWalletItem.prototype, "iconBadgeSize", void 0);
__decorate$r([
  n()
], WuiInactiveProfileWalletItem.prototype, "rightIcon", void 0);
__decorate$r([
  n()
], WuiInactiveProfileWalletItem.prototype, "rightIconSize", void 0);
__decorate$r([
  n({ type: Boolean })
], WuiInactiveProfileWalletItem.prototype, "loading", void 0);
__decorate$r([
  n({ type: Number })
], WuiInactiveProfileWalletItem.prototype, "charsStart", void 0);
__decorate$r([
  n({ type: Number })
], WuiInactiveProfileWalletItem.prototype, "charsEnd", void 0);
WuiInactiveProfileWalletItem = __decorate$r([
  customElement("wui-inactive-profile-wallet-item")
], WuiInactiveProfileWalletItem);
const ConnectionUtil = {
  getAuthData(connection) {
    const isAuth = connection.connectorId === ConstantsUtil.CONNECTOR_ID.AUTH;
    if (!isAuth) {
      return { isAuth: false, icon: void 0, iconSize: void 0, name: void 0 };
    }
    const socialProvider = connection?.auth?.name ?? StorageUtil.getConnectedSocialProvider();
    const socialUsername = connection?.auth?.username ?? StorageUtil.getConnectedSocialUsername();
    const authConnector = ConnectorController.getAuthConnector();
    const email = authConnector?.provider.getEmail() ?? "";
    return {
      isAuth: true,
      icon: socialProvider ?? "mail",
      iconSize: socialProvider ? "xl" : "md",
      name: isAuth ? ConnectorUtil.getAuthName({ email, socialUsername, socialProvider }) : void 0
    };
  }
};
const styles$i = css`
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
    transition: opacity ${({ easings }) => easings["ease-out-power-1"]}
      ${({ durations }) => durations["md"]};
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
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
    border-radius: ${({ borderRadius }) => borderRadius["4"]};
  }

  .active-wallets-box {
    height: 330px;
  }

  .empty-wallet-list-box {
    height: 400px;
  }

  .empty-box {
    width: 100%;
    padding: ${({ spacing }) => spacing["4"]};
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
    border-radius: ${({ borderRadius }) => borderRadius["4"]};
  }

  wui-separator {
    margin: ${({ spacing }) => spacing["2"]} 0 ${({ spacing }) => spacing["2"]} 0;
  }

  .active-connection {
    padding: ${({ spacing }) => spacing["2"]};
  }

  .recent-connection {
    padding: ${({ spacing }) => spacing["2"]} 0 ${({ spacing }) => spacing["2"]} 0;
  }

  @media (max-width: 430px) {
    .active-wallets-box,
    .empty-wallet-list-box {
      height: auto;
      max-height: clamp(360px, 470px, 80vh);
    }
  }
`;
var __decorate$q = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
const UI_CONFIG = {
  ADDRESS_DISPLAY: { START: 4, END: 6 },
  BADGE: { SIZE: "md", ICON: "lightbulb" },
  SCROLL_THRESHOLD: 50,
  OPACITY_RANGE: [0, 1]
};
const NAMESPACE_ICONS = {
  eip155: "ethereum",
  solana: "solana",
  bip122: "bitcoin",
  ton: "ton"
};
const NAMESPACE_TABS = [
  { namespace: "eip155", icon: NAMESPACE_ICONS.eip155, label: "EVM" },
  { namespace: "solana", icon: NAMESPACE_ICONS.solana, label: "Solana" },
  { namespace: "bip122", icon: NAMESPACE_ICONS.bip122, label: "Bitcoin" },
  { namespace: "ton", icon: NAMESPACE_ICONS.ton, label: "Ton" }
];
const CHAIN_LABELS = {
  eip155: { title: "Add EVM Wallet", description: "Add your first EVM wallet" },
  solana: { title: "Add Solana Wallet", description: "Add your first Solana wallet" },
  bip122: { title: "Add Bitcoin Wallet", description: "Add your first Bitcoin wallet" },
  ton: { title: "Add TON Wallet", description: "Add your first TON wallet" }
};
let W3mProfileWalletsView = class W3mProfileWalletsView2 extends i {
  constructor() {
    super();
    this.unsubscribers = [];
    this.currentTab = 0;
    this.namespace = ChainController.state.activeChain;
    this.namespaces = Array.from(ChainController.state.chains.keys());
    this.caipAddress = void 0;
    this.profileName = void 0;
    this.activeConnectorIds = ConnectorController.state.activeConnectorIds;
    this.lastSelectedAddress = "";
    this.lastSelectedConnectorId = "";
    this.isSwitching = false;
    this.caipNetwork = ChainController.state.activeCaipNetwork;
    this.user = ChainController.getAccountData()?.user;
    this.remoteFeatures = OptionsController.state.remoteFeatures;
    this.currentTab = this.namespace ? this.namespaces.indexOf(this.namespace) : 0;
    this.caipAddress = ChainController.getAccountData(this.namespace)?.caipAddress;
    this.profileName = ChainController.getAccountData(this.namespace)?.profileName;
    this.unsubscribers.push(...[
      ConnectionController.subscribeKey("connections", () => this.onConnectionsChange()),
      ConnectionController.subscribeKey("recentConnections", () => this.requestUpdate()),
      ConnectorController.subscribeKey("activeConnectorIds", (ids) => {
        this.activeConnectorIds = ids;
      }),
      ChainController.subscribeKey("activeCaipNetwork", (val) => this.caipNetwork = val),
      ChainController.subscribeChainProp("accountState", (val) => {
        this.user = val?.user;
      }),
      OptionsController.subscribeKey("remoteFeatures", (val) => this.remoteFeatures = val)
    ]);
    this.chainListener = ChainController.subscribeChainProp("accountState", (accountState) => {
      this.caipAddress = accountState?.caipAddress;
      this.profileName = accountState?.profileName;
    }, this.namespace);
  }
  disconnectedCallback() {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.resizeObserver?.disconnect();
    this.removeScrollListener();
    this.chainListener?.();
  }
  firstUpdated() {
    const walletListEl = this.shadowRoot?.querySelector(".wallet-list");
    if (!walletListEl) {
      return;
    }
    const handleScroll = () => this.updateScrollOpacity(walletListEl);
    requestAnimationFrame(handleScroll);
    walletListEl.addEventListener("scroll", handleScroll);
    this.resizeObserver = new ResizeObserver(handleScroll);
    this.resizeObserver.observe(walletListEl);
    handleScroll();
  }
  render() {
    const namespace = this.namespace;
    if (!namespace) {
      throw new Error("Namespace is not set");
    }
    return x`
      <wui-flex flexDirection="column" .padding=${["0", "4", "4", "4"]} gap="4">
        ${this.renderTabs()} ${this.renderHeader(namespace)} ${this.renderConnections(namespace)}
        ${this.renderAddConnectionButton(namespace)}
      </wui-flex>
    `;
  }
  renderTabs() {
    const availableTabs = this.namespaces.map((namespace) => NAMESPACE_TABS.find((tab) => tab.namespace === namespace)).filter(Boolean);
    const tabCount = availableTabs.length;
    if (tabCount > 1) {
      return x`
        <wui-tabs
          .onTabChange=${(index) => this.handleTabChange(index)}
          .activeTab=${this.currentTab}
          .tabs=${availableTabs}
        ></wui-tabs>
      `;
    }
    return null;
  }
  renderHeader(namespace) {
    const connections = this.getActiveConnections(namespace);
    const totalConnections = connections.flatMap(({ accounts }) => accounts).length + (this.caipAddress ? 1 : 0);
    return x`
      <wui-flex alignItems="center" columngap="1">
        <wui-icon
          size="sm"
          name=${NAMESPACE_ICONS[namespace] ?? NAMESPACE_ICONS.eip155}
        ></wui-icon>
        <wui-text color="secondary" variant="lg-regular"
          >${totalConnections > 1 ? "Wallets" : "Wallet"}</wui-text
        >
        <wui-text
          color="primary"
          variant="lg-regular"
          class="balance-amount"
          data-testid="balance-amount"
        >
          ${totalConnections}
        </wui-text>
        <wui-link
          color="secondary"
          variant="secondary"
          @click=${() => ConnectionController.disconnect({ namespace })}
          ?disabled=${!this.hasAnyConnections(namespace)}
          data-testid="disconnect-all-button"
        >
          Disconnect All
        </wui-link>
      </wui-flex>
    `;
  }
  renderConnections(namespace) {
    const hasConnections = this.hasAnyConnections(namespace);
    const classes = {
      "wallet-list": true,
      "active-wallets-box": hasConnections,
      "empty-wallet-list-box": !hasConnections
    };
    return x`
      <wui-flex flexDirection="column" class=${e(classes)} rowgap="3">
        ${hasConnections ? this.renderActiveConnections(namespace) : this.renderEmptyState(namespace)}
      </wui-flex>
    `;
  }
  renderActiveConnections(namespace) {
    const connections = this.getActiveConnections(namespace);
    const connectorId = this.activeConnectorIds[namespace];
    const plainAddress = this.getPlainAddress();
    return x`
      ${plainAddress || connectorId || connections.length > 0 ? x`<wui-flex
            flexDirection="column"
            .padding=${["4", "0", "4", "0"]}
            class="active-wallets"
          >
            ${this.renderActiveProfile(namespace)} ${this.renderActiveConnectionsList(namespace)}
          </wui-flex>` : null}
      ${this.renderRecentConnections(namespace)}
    `;
  }
  renderActiveProfile(namespace) {
    const connectorId = this.activeConnectorIds[namespace];
    if (!connectorId) {
      return null;
    }
    const { connections } = ConnectionControllerUtil.getConnectionsData(namespace);
    const connector = ConnectorController.getConnectorById(connectorId);
    const connectorImage = AssetUtil.getConnectorImage(connector);
    const plainAddress = this.getPlainAddress();
    if (!plainAddress) {
      return null;
    }
    const isBitcoin = namespace === ConstantsUtil.CHAIN.BITCOIN;
    const authData = ConnectionUtil.getAuthData({ connectorId, accounts: [] });
    const shouldShowSeparator = this.getActiveConnections(namespace).flatMap((connection2) => connection2.accounts).length > 0;
    const connection = connections.find((c2) => c2.connectorId === connectorId);
    const account = connection?.accounts.filter((a3) => !HelpersUtil$1.isLowerCaseMatch(a3.address, plainAddress));
    return x`
      <wui-flex flexDirection="column" .padding=${["0", "4", "0", "4"]}>
        <wui-active-profile-wallet-item
          address=${plainAddress}
          alt=${connector?.name}
          .content=${this.getProfileContent({
      address: plainAddress,
      connections,
      connectorId,
      namespace
    })}
          .charsStart=${UI_CONFIG.ADDRESS_DISPLAY.START}
          .charsEnd=${UI_CONFIG.ADDRESS_DISPLAY.END}
          .icon=${authData.icon}
          .iconSize=${authData.iconSize}
          .iconBadge=${this.isSmartAccount(plainAddress) ? UI_CONFIG.BADGE.ICON : void 0}
          .iconBadgeSize=${this.isSmartAccount(plainAddress) ? UI_CONFIG.BADGE.SIZE : void 0}
          imageSrc=${connectorImage}
          ?enableMoreButton=${authData.isAuth}
          @copy=${() => this.handleCopyAddress(plainAddress)}
          @disconnect=${() => this.handleDisconnect(namespace, connectorId)}
          @switch=${() => {
      if (isBitcoin && connection && account?.[0]) {
        this.handleSwitchWallet(connection, account[0].address, namespace);
      }
    }}
          @externalLink=${() => this.handleExternalLink(plainAddress)}
          @more=${() => this.handleMore()}
          data-testid="wui-active-profile-wallet-item"
        ></wui-active-profile-wallet-item>
        ${shouldShowSeparator ? x`<wui-separator></wui-separator>` : null}
      </wui-flex>
    `;
  }
  renderActiveConnectionsList(namespace) {
    const connections = this.getActiveConnections(namespace);
    if (connections.length === 0) {
      return null;
    }
    return x`
      <wui-flex flexDirection="column" .padding=${["0", "2", "0", "2"]}>
        ${this.renderConnectionList(connections, false, namespace)}
      </wui-flex>
    `;
  }
  renderRecentConnections(namespace) {
    const { recentConnections } = ConnectionControllerUtil.getConnectionsData(namespace);
    const allAccounts = recentConnections.flatMap((connection) => connection.accounts);
    if (allAccounts.length === 0) {
      return null;
    }
    return x`
      <wui-flex flexDirection="column" .padding=${["0", "2", "0", "2"]} rowGap="2">
        <wui-text color="secondary" variant="sm-medium" data-testid="recently-connected-text"
          >RECENTLY CONNECTED</wui-text
        >
        <wui-flex flexDirection="column" .padding=${["0", "2", "0", "2"]}>
          ${this.renderConnectionList(recentConnections, true, namespace)}
        </wui-flex>
      </wui-flex>
    `;
  }
  renderConnectionList(connections, isRecentConnections, namespace) {
    return connections.filter((connection) => connection.accounts.length > 0).map((connection, connectionIdx) => {
      const connector = ConnectorController.getConnectorById(connection.connectorId);
      const connectorImage = AssetUtil.getConnectorImage(connector) ?? "";
      const authData = ConnectionUtil.getAuthData(connection);
      return connection.accounts.map((account, accountIdx) => {
        const shouldShowSeparator = connectionIdx !== 0 || accountIdx !== 0;
        const isLoading = this.isAccountLoading(connection.connectorId, account.address);
        return x`
            <wui-flex flexDirection="column">
              ${shouldShowSeparator ? x`<wui-separator></wui-separator>` : null}
              <wui-inactive-profile-wallet-item
                address=${account.address}
                alt=${connection.connectorId}
                buttonLabel=${isRecentConnections ? "Connect" : "Switch"}
                buttonVariant=${isRecentConnections ? "neutral-secondary" : "accent-secondary"}
                rightIcon=${isRecentConnections ? "bin" : "power"}
                rightIconSize="sm"
                class=${isRecentConnections ? "recent-connection" : "active-connection"}
                data-testid=${isRecentConnections ? "recent-connection" : "active-connection"}
                imageSrc=${connectorImage}
                .iconBadge=${this.isSmartAccount(account.address) ? UI_CONFIG.BADGE.ICON : void 0}
                .iconBadgeSize=${this.isSmartAccount(account.address) ? UI_CONFIG.BADGE.SIZE : void 0}
                .icon=${authData.icon}
                .iconSize=${authData.iconSize}
                .loading=${isLoading}
                .showBalance=${false}
                .charsStart=${UI_CONFIG.ADDRESS_DISPLAY.START}
                .charsEnd=${UI_CONFIG.ADDRESS_DISPLAY.END}
                @buttonClick=${() => this.handleSwitchWallet(connection, account.address, namespace)}
                @iconClick=${() => this.handleWalletAction({
          connection,
          address: account.address,
          isRecentConnection: isRecentConnections,
          namespace
        })}
              ></wui-inactive-profile-wallet-item>
            </wui-flex>
          `;
      });
    });
  }
  renderAddConnectionButton(namespace) {
    if (!this.isMultiWalletEnabled() && this.caipAddress) {
      return null;
    }
    if (!this.hasAnyConnections(namespace)) {
      return null;
    }
    const { title } = this.getChainLabelInfo(namespace);
    return x`
      <wui-list-item
        variant="icon"
        iconVariant="overlay"
        icon="plus"
        iconSize="sm"
        ?chevron=${true}
        @click=${() => this.handleAddConnection(namespace)}
        data-testid="add-connection-button"
      >
        <wui-text variant="md-medium" color="secondary">${title}</wui-text>
      </wui-list-item>
    `;
  }
  renderEmptyState(namespace) {
    const { title, description } = this.getChainLabelInfo(namespace);
    return x`
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
              >${description}</wui-text
            >
          </wui-flex>

          <wui-link
            @click=${() => this.handleAddConnection(namespace)}
            data-testid="empty-state-button"
            icon="plus"
          >
            ${title}
          </wui-link>
        </wui-flex>
      </wui-flex>
    `;
  }
  handleTabChange(index) {
    const nextNamespace = this.namespaces[index];
    if (nextNamespace) {
      this.chainListener?.();
      this.currentTab = this.namespaces.indexOf(nextNamespace);
      this.namespace = nextNamespace;
      this.caipAddress = ChainController.getAccountData(nextNamespace)?.caipAddress;
      this.profileName = ChainController.getAccountData(nextNamespace)?.profileName;
      this.chainListener = ChainController.subscribeChainProp("accountState", (accountState) => {
        this.caipAddress = accountState?.caipAddress;
      }, nextNamespace);
    }
  }
  async handleSwitchWallet(connection, address, namespace) {
    try {
      this.isSwitching = true;
      this.lastSelectedConnectorId = connection.connectorId;
      this.lastSelectedAddress = address;
      const isDifferentNamespace = this.caipNetwork?.chainNamespace !== namespace;
      if (isDifferentNamespace && connection?.caipNetwork) {
        ConnectorController.setFilterByNamespace(namespace);
        await ChainController.switchActiveNetwork(connection?.caipNetwork);
      }
      await ConnectionController.switchConnection({
        connection,
        address,
        namespace,
        closeModalOnConnect: false,
        onChange({ hasSwitchedAccount, hasSwitchedWallet }) {
          if (hasSwitchedWallet) {
            SnackController.showSuccess("Wallet switched");
          } else if (hasSwitchedAccount) {
            SnackController.showSuccess("Account switched");
          }
        }
      });
    } catch (error) {
      SnackController.showError("Failed to switch wallet");
    } finally {
      this.isSwitching = false;
    }
  }
  handleWalletAction(params) {
    const { connection, address, isRecentConnection, namespace } = params;
    if (isRecentConnection) {
      StorageUtil.deleteAddressFromConnection({
        connectorId: connection.connectorId,
        address,
        namespace
      });
      ConnectionController.syncStorageConnections();
      SnackController.showSuccess("Wallet deleted");
    } else {
      this.handleDisconnect(namespace, connection.connectorId);
    }
  }
  async handleDisconnect(namespace, id) {
    try {
      await ConnectionController.disconnect({ id, namespace });
      SnackController.showSuccess("Wallet disconnected");
    } catch {
      SnackController.showError("Failed to disconnect wallet");
    }
  }
  handleCopyAddress(address) {
    CoreHelperUtil.copyToClopboard(address);
    SnackController.showSuccess("Address copied");
  }
  handleMore() {
    RouterController.push("AccountSettings");
  }
  handleExternalLink(address) {
    const explorerUrl = this.caipNetwork?.blockExplorers?.default.url;
    if (explorerUrl) {
      CoreHelperUtil.openHref(`${explorerUrl}/address/${address}`, "_blank");
    }
  }
  handleAddConnection(namespace) {
    ConnectorController.setFilterByNamespace(namespace);
    RouterController.push("Connect", {
      addWalletForNamespace: namespace
    });
  }
  getChainLabelInfo(namespace) {
    return CHAIN_LABELS[namespace] ?? {
      title: "Add Wallet",
      description: "Add your first wallet"
    };
  }
  isSmartAccount(address) {
    if (!this.namespace) {
      return false;
    }
    const smartAccount = this.user?.accounts?.find((account) => account.type === "smartAccount");
    if (smartAccount && address) {
      return HelpersUtil$1.isLowerCaseMatch(smartAccount.address, address);
    }
    return false;
  }
  getPlainAddress() {
    return this.caipAddress ? CoreHelperUtil.getPlainAddress(this.caipAddress) : void 0;
  }
  getActiveConnections(namespace) {
    const connectorId = this.activeConnectorIds[namespace];
    const { connections } = ConnectionControllerUtil.getConnectionsData(namespace);
    const [connectedConnection] = connections.filter((connection) => HelpersUtil$1.isLowerCaseMatch(connection.connectorId, connectorId));
    if (!connectorId) {
      return connections;
    }
    const isBitcoin = namespace === ConstantsUtil.CHAIN.BITCOIN;
    const { address } = this.caipAddress ? ParseUtil.parseCaipAddress(this.caipAddress) : {};
    let addresses = [...address ? [address] : []];
    if (isBitcoin && connectedConnection) {
      addresses = connectedConnection.accounts.map((account) => account.address) || [];
    }
    return ConnectionControllerUtil.excludeConnectorAddressFromConnections({
      connectorId,
      addresses,
      connections
    });
  }
  hasAnyConnections(namespace) {
    const connections = this.getActiveConnections(namespace);
    const { recentConnections } = ConnectionControllerUtil.getConnectionsData(namespace);
    return Boolean(this.caipAddress) || connections.length > 0 || recentConnections.length > 0;
  }
  isAccountLoading(connectorId, address) {
    return HelpersUtil$1.isLowerCaseMatch(this.lastSelectedConnectorId, connectorId) && HelpersUtil$1.isLowerCaseMatch(this.lastSelectedAddress, address) && this.isSwitching;
  }
  getProfileContent(params) {
    const { address, connections, connectorId, namespace } = params;
    const [connectedConnection] = connections.filter((connection) => HelpersUtil$1.isLowerCaseMatch(connection.connectorId, connectorId));
    if (namespace === ConstantsUtil.CHAIN.BITCOIN && connectedConnection?.accounts.every((account) => typeof account.type === "string")) {
      return this.getBitcoinProfileContent(connectedConnection.accounts, address);
    }
    const authData = ConnectionUtil.getAuthData({ connectorId, accounts: [] });
    return [
      {
        address,
        tagLabel: "Active",
        tagVariant: "success",
        enableButton: true,
        profileName: this.profileName,
        buttonType: "disconnect",
        buttonLabel: "Disconnect",
        buttonVariant: "neutral-secondary",
        ...authData.isAuth ? { description: this.isSmartAccount(address) ? "Smart Account" : "EOA Account" } : {}
      }
    ];
  }
  getBitcoinProfileContent(accounts, address) {
    const hasMultipleAccounts = accounts.length > 1;
    const plainAddress = this.getPlainAddress();
    return accounts.map((account) => {
      const isConnected = HelpersUtil$1.isLowerCaseMatch(account.address, plainAddress);
      let label = "PAYMENT";
      if (account.type === "ordinal") {
        label = "ORDINALS";
      }
      return {
        address: account.address,
        tagLabel: HelpersUtil$1.isLowerCaseMatch(account.address, address) ? "Active" : void 0,
        tagVariant: HelpersUtil$1.isLowerCaseMatch(account.address, address) ? "success" : void 0,
        enableButton: true,
        ...hasMultipleAccounts ? {
          label,
          alignItems: "flex-end",
          buttonType: isConnected ? "disconnect" : "switch",
          buttonLabel: isConnected ? "Disconnect" : "Switch",
          buttonVariant: isConnected ? "neutral-secondary" : "accent-secondary"
        } : {
          alignItems: "center",
          buttonType: "disconnect",
          buttonLabel: "Disconnect",
          buttonVariant: "neutral-secondary"
        }
      };
    });
  }
  removeScrollListener() {
    const connectEl = this.shadowRoot?.querySelector(".wallet-list");
    if (connectEl) {
      connectEl.removeEventListener("scroll", () => this.handleConnectListScroll());
    }
  }
  handleConnectListScroll() {
    const walletListEl = this.shadowRoot?.querySelector(".wallet-list");
    if (walletListEl) {
      this.updateScrollOpacity(walletListEl);
    }
  }
  isMultiWalletEnabled() {
    return Boolean(this.remoteFeatures?.multiWallet);
  }
  updateScrollOpacity(element) {
    element.style.setProperty("--connect-scroll--top-opacity", MathUtil.interpolate([0, UI_CONFIG.SCROLL_THRESHOLD], UI_CONFIG.OPACITY_RANGE, element.scrollTop).toString());
    element.style.setProperty("--connect-scroll--bottom-opacity", MathUtil.interpolate([0, UI_CONFIG.SCROLL_THRESHOLD], UI_CONFIG.OPACITY_RANGE, element.scrollHeight - element.scrollTop - element.offsetHeight).toString());
  }
  onConnectionsChange() {
    if (this.isMultiWalletEnabled()) {
      if (this.namespace) {
        const { connections } = ConnectionControllerUtil.getConnectionsData(this.namespace);
        if (connections.length === 0) {
          RouterController.reset("ProfileWallets");
        }
      }
    }
    this.requestUpdate();
  }
};
W3mProfileWalletsView.styles = styles$i;
__decorate$q([
  r()
], W3mProfileWalletsView.prototype, "currentTab", void 0);
__decorate$q([
  r()
], W3mProfileWalletsView.prototype, "namespace", void 0);
__decorate$q([
  r()
], W3mProfileWalletsView.prototype, "namespaces", void 0);
__decorate$q([
  r()
], W3mProfileWalletsView.prototype, "caipAddress", void 0);
__decorate$q([
  r()
], W3mProfileWalletsView.prototype, "profileName", void 0);
__decorate$q([
  r()
], W3mProfileWalletsView.prototype, "activeConnectorIds", void 0);
__decorate$q([
  r()
], W3mProfileWalletsView.prototype, "lastSelectedAddress", void 0);
__decorate$q([
  r()
], W3mProfileWalletsView.prototype, "lastSelectedConnectorId", void 0);
__decorate$q([
  r()
], W3mProfileWalletsView.prototype, "isSwitching", void 0);
__decorate$q([
  r()
], W3mProfileWalletsView.prototype, "caipNetwork", void 0);
__decorate$q([
  r()
], W3mProfileWalletsView.prototype, "user", void 0);
__decorate$q([
  r()
], W3mProfileWalletsView.prototype, "remoteFeatures", void 0);
W3mProfileWalletsView = __decorate$q([
  customElement("w3m-profile-wallets-view")
], W3mProfileWalletsView);
var __decorate$p = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mFundWalletView = class W3mFundWalletView2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.activeCaipNetwork = ChainController.state.activeCaipNetwork;
    this.features = OptionsController.state.features;
    this.remoteFeatures = OptionsController.state.remoteFeatures;
    this.exchangesLoading = ExchangeController.state.isLoading;
    this.exchanges = ExchangeController.state.exchanges;
    this.unsubscribe.push(...[
      OptionsController.subscribeKey("features", (val) => this.features = val),
      OptionsController.subscribeKey("remoteFeatures", (val) => this.remoteFeatures = val),
      ChainController.subscribeKey("activeCaipNetwork", (val) => {
        this.activeCaipNetwork = val;
        this.setDefaultPaymentAsset();
      }),
      ExchangeController.subscribeKey("isLoading", (val) => this.exchangesLoading = val),
      ExchangeController.subscribeKey("exchanges", (val) => this.exchanges = val)
    ]);
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
  }
  async firstUpdated() {
    const isPayWithExchangeSupported = ExchangeController.isPayWithExchangeSupported();
    if (isPayWithExchangeSupported) {
      await this.setDefaultPaymentAsset();
      await ExchangeController.fetchExchanges();
    }
  }
  render() {
    return x`
      <wui-flex flexDirection="column" .padding=${["1", "3", "3", "3"]} gap="2">
        ${this.onrampTemplate()} ${this.receiveTemplate()} ${this.depositFromExchangeTemplate()}
      </wui-flex>
    `;
  }
  async setDefaultPaymentAsset() {
    if (!this.activeCaipNetwork) {
      return;
    }
    const assets = await ExchangeController.getAssetsForNetwork(this.activeCaipNetwork.caipNetworkId);
    const usdc = assets.find((asset) => asset.metadata.symbol === "USDC") || assets[0];
    if (usdc) {
      ExchangeController.setPaymentAsset(usdc);
    }
  }
  onrampTemplate() {
    if (!this.activeCaipNetwork) {
      return null;
    }
    const isOnrampEnabled = this.remoteFeatures?.onramp;
    const hasNetworkSupport = ConstantsUtil$1.ONRAMP_SUPPORTED_CHAIN_NAMESPACES.includes(this.activeCaipNetwork.chainNamespace);
    if (!isOnrampEnabled || !hasNetworkSupport) {
      return null;
    }
    return x`
      <wui-list-item
        @click=${this.onBuyCrypto.bind(this)}
        icon="card"
        data-testid="wallet-features-onramp-button"
      >
        <wui-text variant="lg-regular" color="primary">Buy crypto</wui-text>
      </wui-list-item>
    `;
  }
  depositFromExchangeTemplate() {
    if (!this.activeCaipNetwork) {
      return null;
    }
    const isPayWithExchangeSupported = ExchangeController.isPayWithExchangeSupported();
    if (!isPayWithExchangeSupported) {
      return null;
    }
    return x`
      <wui-list-item
        @click=${this.onDepositFromExchange.bind(this)}
        icon="arrowBottomCircle"
        data-testid="wallet-features-deposit-from-exchange-button"
        ?loading=${this.exchangesLoading}
        ?disabled=${this.exchangesLoading || !this.exchanges.length}
      >
        <wui-text variant="lg-regular" color="primary">Deposit from exchange</wui-text>
      </wui-list-item>
    `;
  }
  receiveTemplate() {
    const isReceiveEnabled = Boolean(this.features?.receive);
    if (!isReceiveEnabled) {
      return null;
    }
    return x`
      <wui-list-item
        @click=${this.onReceive.bind(this)}
        icon="qrCode"
        data-testid="wallet-features-receive-button"
      >
        <wui-text variant="lg-regular" color="primary">Receive funds</wui-text>
      </wui-list-item>
    `;
  }
  onBuyCrypto() {
    RouterController.push("OnRampProviders");
  }
  onReceive() {
    RouterController.push("WalletReceive");
  }
  onDepositFromExchange() {
    ExchangeController.reset();
    RouterController.push("PayWithExchange", {
      redirectView: RouterController.state.data?.redirectView
    });
  }
};
__decorate$p([
  r()
], W3mFundWalletView.prototype, "activeCaipNetwork", void 0);
__decorate$p([
  r()
], W3mFundWalletView.prototype, "features", void 0);
__decorate$p([
  r()
], W3mFundWalletView.prototype, "remoteFeatures", void 0);
__decorate$p([
  r()
], W3mFundWalletView.prototype, "exchangesLoading", void 0);
__decorate$p([
  r()
], W3mFundWalletView.prototype, "exchanges", void 0);
W3mFundWalletView = __decorate$p([
  customElement("w3m-fund-wallet-view")
], W3mFundWalletView);
const styles$h = css`
  button {
    display: flex;
    gap: ${({ spacing }) => spacing[1]};
    padding: ${({ spacing }) => spacing[4]};
    width: 100%;
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
    border-radius: ${({ borderRadius }) => borderRadius[4]};
    justify-content: center;
    align-items: center;
  }

  :host([data-size='sm']) button {
    padding: ${({ spacing }) => spacing[2]};
    border-radius: ${({ borderRadius }) => borderRadius[2]};
  }

  :host([data-size='md']) button {
    padding: ${({ spacing }) => spacing[3]};
    border-radius: ${({ borderRadius }) => borderRadius[3]};
  }

  button:hover {
    background-color: ${({ tokens }) => tokens.theme.foregroundSecondary};
  }

  button:disabled {
    opacity: 0.5;
  }
`;
var __decorate$o = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let WuiListButton = class WuiListButton2 extends i {
  constructor() {
    super(...arguments);
    this.text = "";
    this.disabled = false;
    this.size = "lg";
    this.icon = "copy";
    this.tabIdx = void 0;
  }
  render() {
    this.dataset["size"] = this.size;
    const textVariant = `${this.size}-regular`;
    return x`
      <button ?disabled=${this.disabled} tabindex=${o(this.tabIdx)}>
        <wui-icon name=${this.icon} size=${this.size} color="default"></wui-icon>
        <wui-text align="center" variant=${textVariant} color="primary">${this.text}</wui-text>
      </button>
    `;
  }
};
WuiListButton.styles = [resetStyles, elementStyles, styles$h];
__decorate$o([
  n()
], WuiListButton.prototype, "text", void 0);
__decorate$o([
  n({ type: Boolean })
], WuiListButton.prototype, "disabled", void 0);
__decorate$o([
  n()
], WuiListButton.prototype, "size", void 0);
__decorate$o([
  n()
], WuiListButton.prototype, "icon", void 0);
__decorate$o([
  n()
], WuiListButton.prototype, "tabIdx", void 0);
WuiListButton = __decorate$o([
  customElement("wui-list-button")
], WuiListButton);
const styles$g = css`
  wui-separator {
    margin: ${({ spacing }) => spacing["3"]} calc(${({ spacing }) => spacing["3"]} * -1);
    width: calc(100% + ${({ spacing }) => spacing["3"]} * 2);
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
    right: ${({ spacing }) => spacing["2"]};
  }

  wui-loading-spinner {
    right: ${({ spacing }) => spacing["3"]};
  }

  wui-text {
    margin: ${({ spacing }) => spacing["2"]} ${({ spacing }) => spacing["3"]}
      ${({ spacing }) => spacing["0"]} ${({ spacing }) => spacing["3"]};
  }
`;
var __decorate$n = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mEmailLoginWidget = class W3mEmailLoginWidget2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.formRef = e$1();
    this.email = "";
    this.loading = false;
    this.error = "";
    this.remoteFeatures = OptionsController.state.remoteFeatures;
    this.hasExceededUsageLimit = ApiController.state.plan.hasExceededUsageLimit;
    this.unsubscribe.push(OptionsController.subscribeKey("remoteFeatures", (val) => {
      this.remoteFeatures = val;
    }), ApiController.subscribeKey("plan", (val) => this.hasExceededUsageLimit = val.hasExceededUsageLimit));
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
  }
  firstUpdated() {
    this.formRef.value?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        this.onSubmitEmail(event);
      }
    });
  }
  render() {
    const hasConnection = ConnectionController.hasAnyConnection(ConstantsUtil.CONNECTOR_ID.AUTH);
    return x`
      <form ${n$1(this.formRef)} @submit=${this.onSubmitEmail.bind(this)}>
        <wui-email-input
          @focus=${this.onFocusEvent.bind(this)}
          .disabled=${this.loading}
          @inputChange=${this.onEmailInputChange.bind(this)}
          tabIdx=${o(this.tabIdx)}
          ?disabled=${hasConnection || this.hasExceededUsageLimit}
        >
        </wui-email-input>

        ${this.submitButtonTemplate()}${this.loadingTemplate()}
        <input type="submit" hidden />
      </form>
      ${this.templateError()}
    `;
  }
  submitButtonTemplate() {
    const showSubmit = !this.loading && this.email.length > 3;
    return showSubmit ? x`
          <wui-icon-link
            size="sm"
            icon="chevronRight"
            iconcolor="accent-100"
            @click=${this.onSubmitEmail.bind(this)}
          >
          </wui-icon-link>
        ` : null;
  }
  loadingTemplate() {
    return this.loading ? x`<wui-loading-spinner size="md" color="accent-primary"></wui-loading-spinner>` : null;
  }
  templateError() {
    if (this.error) {
      return x`<wui-text variant="sm-medium" color="error">${this.error}</wui-text>`;
    }
    return null;
  }
  onEmailInputChange(event) {
    this.email = event.detail.trim();
    this.error = "";
  }
  async onSubmitEmail(event) {
    if (!HelpersUtil.isValidEmail(this.email)) {
      AlertController.open({
        displayMessage: ErrorUtil.ALERT_WARNINGS.INVALID_EMAIL.displayMessage
      }, "warning");
      return;
    }
    const isAvailableChain = ConstantsUtil.AUTH_CONNECTOR_SUPPORTED_CHAINS.find((chain) => chain === ChainController.state.activeChain);
    if (!isAvailableChain) {
      const caipNetwork = ChainController.getFirstCaipNetworkSupportsAuthConnector();
      if (caipNetwork) {
        RouterController.push("SwitchNetwork", { network: caipNetwork });
        return;
      }
    }
    try {
      if (this.loading) {
        return;
      }
      this.loading = true;
      event.preventDefault();
      const authConnector = ConnectorController.getAuthConnector();
      if (!authConnector) {
        throw new Error("w3m-email-login-widget: Auth connector not found");
      }
      const { action } = await authConnector.provider.connectEmail({ email: this.email });
      EventsController.sendEvent({ type: "track", event: "EMAIL_SUBMITTED" });
      if (action === "VERIFY_OTP") {
        EventsController.sendEvent({ type: "track", event: "EMAIL_VERIFICATION_CODE_SENT" });
        RouterController.push("EmailVerifyOtp", { email: this.email });
      } else if (action === "VERIFY_DEVICE") {
        RouterController.push("EmailVerifyDevice", { email: this.email });
      } else if (action === "CONNECT") {
        const isMultiWalletEnabled = this.remoteFeatures?.multiWallet;
        await ConnectionController.connectExternal(authConnector, ChainController.state.activeChain);
        if (isMultiWalletEnabled) {
          RouterController.replace("ProfileWallets");
          SnackController.showSuccess("New Wallet Added");
        } else {
          RouterController.replace("Account");
        }
      }
    } catch (error) {
      const parsedError = CoreHelperUtil.parseError(error);
      if (parsedError?.includes("Invalid email")) {
        this.error = "Invalid email. Try again.";
      } else {
        SnackController.showError(error);
      }
    } finally {
      this.loading = false;
    }
  }
  onFocusEvent() {
    EventsController.sendEvent({ type: "track", event: "EMAIL_LOGIN_SELECTED" });
  }
};
W3mEmailLoginWidget.styles = styles$g;
__decorate$n([
  n()
], W3mEmailLoginWidget.prototype, "tabIdx", void 0);
__decorate$n([
  r()
], W3mEmailLoginWidget.prototype, "email", void 0);
__decorate$n([
  r()
], W3mEmailLoginWidget.prototype, "loading", void 0);
__decorate$n([
  r()
], W3mEmailLoginWidget.prototype, "error", void 0);
__decorate$n([
  r()
], W3mEmailLoginWidget.prototype, "remoteFeatures", void 0);
__decorate$n([
  r()
], W3mEmailLoginWidget.prototype, "hasExceededUsageLimit", void 0);
W3mEmailLoginWidget = __decorate$n([
  customElement("w3m-email-login-widget")
], W3mEmailLoginWidget);
const styles$f = css`
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
    background: ${({ tokens }) => tokens.theme.foregroundPrimary};
    border-radius: ${({ borderRadius }) => borderRadius[4]};
  }

  @media (hover: hover) {
    button:hover:enabled {
      background: ${({ tokens }) => tokens.theme.foregroundSecondary};
    }
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`;
var __decorate$m = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let WuiLogoSelect = class WuiLogoSelect2 extends i {
  constructor() {
    super(...arguments);
    this.logo = "google";
    this.disabled = false;
    this.tabIdx = void 0;
  }
  render() {
    return x`
      <button ?disabled=${this.disabled} tabindex=${o(this.tabIdx)}>
        <wui-icon size="xxl" name=${this.logo}></wui-icon>
      </button>
    `;
  }
};
WuiLogoSelect.styles = [resetStyles, elementStyles, styles$f];
__decorate$m([
  n()
], WuiLogoSelect.prototype, "logo", void 0);
__decorate$m([
  n({ type: Boolean })
], WuiLogoSelect.prototype, "disabled", void 0);
__decorate$m([
  n()
], WuiLogoSelect.prototype, "tabIdx", void 0);
WuiLogoSelect = __decorate$m([
  customElement("wui-logo-select")
], WuiLogoSelect);
const styles$e = css`
  wui-separator {
    margin: ${({ spacing }) => spacing["3"]} calc(${({ spacing }) => spacing["3"]} * -1)
      ${({ spacing }) => spacing["3"]} calc(${({ spacing }) => spacing["3"]} * -1);
    width: calc(100% + ${({ spacing }) => spacing["3"]} * 2);
  }
`;
var __decorate$l = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
const MAX_TOP_VIEW = 2;
const MAXIMUM_LENGTH = 6;
let W3mSocialLoginWidget = class W3mSocialLoginWidget2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.walletGuide = "get-started";
    this.tabIdx = void 0;
    this.connectors = ConnectorController.state.connectors;
    this.remoteFeatures = OptionsController.state.remoteFeatures;
    this.authConnector = this.connectors.find((c2) => c2.type === "AUTH");
    this.isPwaLoading = false;
    this.hasExceededUsageLimit = ApiController.state.plan.hasExceededUsageLimit;
    this.unsubscribe.push(ConnectorController.subscribeKey("connectors", (val) => {
      this.connectors = val;
      this.authConnector = this.connectors.find((c2) => c2.type === "AUTH");
    }), OptionsController.subscribeKey("remoteFeatures", (val) => this.remoteFeatures = val), ApiController.subscribeKey("plan", (val) => this.hasExceededUsageLimit = val.hasExceededUsageLimit));
  }
  connectedCallback() {
    super.connectedCallback();
    this.handlePwaFrameLoad();
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
  }
  render() {
    return x`
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
    const isCreateWalletPage = this.walletGuide === "explore";
    let socials = this.remoteFeatures?.socials;
    if (!socials && isCreateWalletPage) {
      socials = ConstantsUtil$1.DEFAULT_SOCIALS;
      return this.renderTopViewContent(socials);
    }
    if (!socials) {
      return null;
    }
    return this.renderTopViewContent(socials);
  }
  renderTopViewContent(socials) {
    if (socials.length === 2) {
      return x` <wui-flex gap="2">
        ${socials.slice(0, MAX_TOP_VIEW).map((social) => x`<wui-logo-select
              data-testid=${`social-selector-${social}`}
              @click=${() => {
        this.onSocialClick(social);
      }}
              logo=${social}
              tabIdx=${o(this.tabIdx)}
              ?disabled=${this.isPwaLoading || this.hasConnection()}
            ></wui-logo-select>`)}
      </wui-flex>`;
    }
    return x` <wui-list-button
      data-testid=${`social-selector-${socials[0]}`}
      @click=${() => {
      this.onSocialClick(socials[0]);
    }}
      size="lg"
      icon=${o(socials[0])}
      text=${`Continue with ${UiHelperUtil.capitalize(socials[0])}`}
      tabIdx=${o(this.tabIdx)}
      ?disabled=${this.isPwaLoading || this.hasConnection()}
    ></wui-list-button>`;
  }
  bottomViewTemplate() {
    let socials = this.remoteFeatures?.socials;
    const isCreateWalletPage = this.walletGuide === "explore";
    const isSocialDisabled = !this.authConnector || !socials || socials.length === 0;
    if (isSocialDisabled && isCreateWalletPage) {
      socials = ConstantsUtil$1.DEFAULT_SOCIALS;
    }
    if (!socials) {
      return null;
    }
    if (socials.length <= MAX_TOP_VIEW) {
      return null;
    }
    if (socials && socials.length > MAXIMUM_LENGTH) {
      return x`<wui-flex gap="2">
        ${socials.slice(1, MAXIMUM_LENGTH - 1).map((social) => x`<wui-logo-select
              data-testid=${`social-selector-${social}`}
              @click=${() => {
        this.onSocialClick(social);
      }}
              logo=${social}
              tabIdx=${o(this.tabIdx)}
              ?focusable=${this.tabIdx !== void 0 && this.tabIdx >= 0}
              ?disabled=${this.isPwaLoading || this.hasConnection()}
            ></wui-logo-select>`)}
        <wui-logo-select
          logo="more"
          tabIdx=${o(this.tabIdx)}
          @click=${this.onMoreSocialsClick.bind(this)}
          ?disabled=${this.isPwaLoading || this.hasConnection()}
          data-testid="social-selector-more"
        ></wui-logo-select>
      </wui-flex>`;
    }
    if (!socials) {
      return null;
    }
    return x`<wui-flex gap="2">
      ${socials.slice(1, socials.length).map((social) => x`<wui-logo-select
            data-testid=${`social-selector-${social}`}
            @click=${() => {
      this.onSocialClick(social);
    }}
            logo=${social}
            tabIdx=${o(this.tabIdx)}
            ?focusable=${this.tabIdx !== void 0 && this.tabIdx >= 0}
            ?disabled=${this.isPwaLoading || this.hasConnection()}
          ></wui-logo-select>`)}
    </wui-flex>`;
  }
  onMoreSocialsClick() {
    RouterController.push("ConnectSocials");
  }
  async onSocialClick(socialProvider) {
    if (this.hasExceededUsageLimit) {
      RouterController.push("UsageExceeded");
      return;
    }
    const isAvailableChain = ConstantsUtil.AUTH_CONNECTOR_SUPPORTED_CHAINS.find((chain) => chain === ChainController.state.activeChain);
    if (!isAvailableChain) {
      const caipNetwork = ChainController.getFirstCaipNetworkSupportsAuthConnector();
      if (caipNetwork) {
        RouterController.push("SwitchNetwork", { network: caipNetwork });
        return;
      }
    }
    if (socialProvider) {
      await executeSocialLogin(socialProvider);
    }
  }
  async handlePwaFrameLoad() {
    if (CoreHelperUtil.isPWA()) {
      this.isPwaLoading = true;
      try {
        if (this.authConnector?.provider instanceof W3mFrameProvider) {
          await this.authConnector.provider.init();
        }
      } catch (error) {
        AlertController.open({
          displayMessage: "Error loading embedded wallet in PWA",
          debugMessage: error.message
        }, "error");
      } finally {
        this.isPwaLoading = false;
      }
    }
  }
  hasConnection() {
    return ConnectionController.hasAnyConnection(ConstantsUtil.CONNECTOR_ID.AUTH);
  }
};
W3mSocialLoginWidget.styles = styles$e;
__decorate$l([
  n()
], W3mSocialLoginWidget.prototype, "walletGuide", void 0);
__decorate$l([
  n()
], W3mSocialLoginWidget.prototype, "tabIdx", void 0);
__decorate$l([
  r()
], W3mSocialLoginWidget.prototype, "connectors", void 0);
__decorate$l([
  r()
], W3mSocialLoginWidget.prototype, "remoteFeatures", void 0);
__decorate$l([
  r()
], W3mSocialLoginWidget.prototype, "authConnector", void 0);
__decorate$l([
  r()
], W3mSocialLoginWidget.prototype, "isPwaLoading", void 0);
__decorate$l([
  r()
], W3mSocialLoginWidget.prototype, "hasExceededUsageLimit", void 0);
W3mSocialLoginWidget = __decorate$l([
  customElement("w3m-social-login-widget")
], W3mSocialLoginWidget);
var __decorate$k = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mWalletLoginList = class W3mWalletLoginList2 extends i {
  constructor() {
    super(...arguments);
    this.tabIdx = void 0;
  }
  render() {
    return x`
      <wui-flex flexDirection="column" gap="2">
        <w3m-connector-list tabIdx=${o(this.tabIdx)}></w3m-connector-list>
        <w3m-all-wallets-widget tabIdx=${o(this.tabIdx)}></w3m-all-wallets-widget>
      </wui-flex>
    `;
  }
};
__decorate$k([
  n()
], W3mWalletLoginList.prototype, "tabIdx", void 0);
W3mWalletLoginList = __decorate$k([
  customElement("w3m-wallet-login-list")
], W3mWalletLoginList);
const styles$d = css`
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
    transition: opacity ${({ durations }) => durations["lg"]}
      ${({ easings }) => easings["ease-out-power-2"]};
    will-change: opacity;
    mask-image: var(--connect-mask-image);
  }

  .guide {
    transition: opacity ${({ durations }) => durations["lg"]}
      ${({ easings }) => easings["ease-out-power-2"]};
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
    margin: ${({ spacing }) => spacing["3"]} calc(${({ spacing }) => spacing["3"]} * -1);
    width: calc(100% + ${({ spacing }) => spacing["3"]} * 2);
  }
`;
var __decorate$j = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
const SCROLL_THRESHOLD = 470;
let W3mConnectView = class W3mConnectView2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.connectors = ConnectorController.state.connectors;
    this.authConnector = this.connectors.find((c2) => c2.type === "AUTH");
    this.features = OptionsController.state.features;
    this.remoteFeatures = OptionsController.state.remoteFeatures;
    this.enableWallets = OptionsController.state.enableWallets;
    this.noAdapters = ChainController.state.noAdapters;
    this.walletGuide = "get-started";
    this.checked = OptionsStateController.state.isLegalCheckboxChecked;
    this.isEmailEnabled = this.remoteFeatures?.email && !ChainController.state.noAdapters;
    this.isSocialEnabled = this.remoteFeatures?.socials && this.remoteFeatures.socials.length > 0 && !ChainController.state.noAdapters;
    this.isAuthEnabled = this.checkIfAuthEnabled(this.connectors);
    this.unsubscribe.push(ConnectorController.subscribeKey("connectors", (val) => {
      this.connectors = val;
      this.authConnector = this.connectors.find((c2) => c2.type === "AUTH");
      this.isAuthEnabled = this.checkIfAuthEnabled(this.connectors);
    }), OptionsController.subscribeKey("features", (val) => {
      this.features = val;
    }), OptionsController.subscribeKey("remoteFeatures", (val) => {
      this.remoteFeatures = val;
      this.setEmailAndSocialEnableCheck(this.noAdapters, this.remoteFeatures);
    }), OptionsController.subscribeKey("enableWallets", (val) => this.enableWallets = val), ChainController.subscribeKey("noAdapters", (val) => this.setEmailAndSocialEnableCheck(val, this.remoteFeatures)), OptionsStateController.subscribeKey("isLegalCheckboxChecked", (val) => this.checked = val));
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.resizeObserver?.disconnect();
    const connectEl = this.shadowRoot?.querySelector(".connect");
    connectEl?.removeEventListener("scroll", this.handleConnectListScroll.bind(this));
  }
  firstUpdated() {
    const connectEl = this.shadowRoot?.querySelector(".connect");
    if (connectEl) {
      requestAnimationFrame(this.handleConnectListScroll.bind(this));
      connectEl?.addEventListener("scroll", this.handleConnectListScroll.bind(this));
      this.resizeObserver = new ResizeObserver(() => {
        this.handleConnectListScroll();
      });
      this.resizeObserver?.observe(connectEl);
      this.handleConnectListScroll();
    }
  }
  render() {
    const { termsConditionsUrl, privacyPolicyUrl } = OptionsController.state;
    const isLegalCheckbox = OptionsController.state.features?.legalCheckbox;
    const legalUrl = termsConditionsUrl || privacyPolicyUrl;
    const isShowLegalCheckbox = Boolean(legalUrl) && Boolean(isLegalCheckbox) && this.walletGuide === "get-started";
    const isDisabled = isShowLegalCheckbox && !this.checked;
    const classes = {
      connect: true,
      disabled: isDisabled
    };
    const isEnableWalletGuide = OptionsController.state.enableWalletGuide;
    const isEnableWallets = this.enableWallets;
    const socialOrEmailLoginEnabled = this.isSocialEnabled || this.authConnector;
    const tabIndex = isDisabled ? -1 : void 0;
    return x`
      <wui-flex flexDirection="column">
        ${this.legalCheckboxTemplate()}
        <wui-flex
          data-testid="w3m-connect-scroll-view"
          flexDirection="column"
          .padding=${["0", "0", "4", "0"]}
          class=${e(classes)}
        >
          <wui-flex
            class="connect-methods"
            flexDirection="column"
            gap="2"
            .padding=${socialOrEmailLoginEnabled && isEnableWallets && isEnableWalletGuide && this.walletGuide === "get-started" ? ["0", "3", "0", "3"] : ["0", "3", "3", "3"]}
          >
            ${this.renderConnectMethod(tabIndex)}
          </wui-flex>
        </wui-flex>
        ${this.reownBrandingTemplate()}
      </wui-flex>
    `;
  }
  reownBrandingTemplate() {
    if (HelpersUtil.hasFooter()) {
      return null;
    }
    if (!this.remoteFeatures?.reownBranding) {
      return null;
    }
    return x`<wui-ux-by-reown></wui-ux-by-reown>`;
  }
  setEmailAndSocialEnableCheck(noAdapters, remoteFeatures) {
    this.isEmailEnabled = remoteFeatures?.email && !noAdapters;
    this.isSocialEnabled = remoteFeatures?.socials && remoteFeatures.socials.length > 0 && !noAdapters;
    this.remoteFeatures = remoteFeatures;
    this.noAdapters = noAdapters;
  }
  checkIfAuthEnabled(connectors) {
    const namespacesWithAuthConnector = connectors.filter((c2) => c2.type === ConstantsUtil$2.CONNECTOR_TYPE_AUTH).map((i2) => i2.chain);
    const authSupportedNamespaces = ConstantsUtil.AUTH_CONNECTOR_SUPPORTED_CHAINS;
    return authSupportedNamespaces.some((ns) => namespacesWithAuthConnector.includes(ns));
  }
  renderConnectMethod(tabIndex) {
    const connectMethodsOrder = WalletUtil.getConnectOrderMethod(this.features, this.connectors);
    return x`${connectMethodsOrder.map((method, index) => {
      switch (method) {
        case "email":
          return x`${this.emailTemplate(tabIndex)} ${this.separatorTemplate(index, "email")}`;
        case "social":
          return x`${this.socialListTemplate(tabIndex)}
          ${this.separatorTemplate(index, "social")}`;
        case "wallet":
          return x`${this.walletListTemplate(tabIndex)}
          ${this.separatorTemplate(index, "wallet")}`;
        default:
          return null;
      }
    })}`;
  }
  checkMethodEnabled(name) {
    switch (name) {
      case "wallet":
        return this.enableWallets;
      case "social":
        return this.isSocialEnabled && this.isAuthEnabled;
      case "email":
        return this.isEmailEnabled && this.isAuthEnabled;
      default:
        return null;
    }
  }
  checkIsThereNextMethod(currentIndex) {
    const connectMethodsOrder = WalletUtil.getConnectOrderMethod(this.features, this.connectors);
    const nextMethod = connectMethodsOrder[currentIndex + 1];
    if (!nextMethod) {
      return void 0;
    }
    const isNextMethodEnabled = this.checkMethodEnabled(nextMethod);
    if (isNextMethodEnabled) {
      return nextMethod;
    }
    return this.checkIsThereNextMethod(currentIndex + 1);
  }
  separatorTemplate(index, type) {
    const nextEnabledMethod = this.checkIsThereNextMethod(index);
    const isExplore = this.walletGuide === "explore";
    switch (type) {
      case "wallet": {
        const isWalletEnable = this.enableWallets;
        return isWalletEnable && nextEnabledMethod && !isExplore ? x`<wui-separator data-testid="wui-separator" text="or"></wui-separator>` : null;
      }
      case "email": {
        const isNextMethodSocial = nextEnabledMethod === "social";
        return this.isAuthEnabled && this.isEmailEnabled && !isNextMethodSocial && nextEnabledMethod ? x`<wui-separator
              data-testid="w3m-email-login-or-separator"
              text="or"
            ></wui-separator>` : null;
      }
      case "social": {
        const isNextMethodEmail = nextEnabledMethod === "email";
        return this.isAuthEnabled && this.isSocialEnabled && !isNextMethodEmail && nextEnabledMethod ? x`<wui-separator data-testid="wui-separator" text="or"></wui-separator>` : null;
      }
      default:
        return null;
    }
  }
  emailTemplate(tabIndex) {
    if (!this.isEmailEnabled || !this.isAuthEnabled) {
      return null;
    }
    return x`<w3m-email-login-widget tabIdx=${o(tabIndex)}></w3m-email-login-widget>`;
  }
  socialListTemplate(tabIndex) {
    if (!this.isSocialEnabled || !this.isAuthEnabled) {
      return null;
    }
    return x`<w3m-social-login-widget
      walletGuide=${this.walletGuide}
      tabIdx=${o(tabIndex)}
    ></w3m-social-login-widget>`;
  }
  walletListTemplate(tabIndex) {
    const isEnableWallets = this.enableWallets;
    const isCollapseWalletsOldProp = this.features?.emailShowWallets === false;
    const isCollapseWallets = this.features?.collapseWallets;
    const shouldCollapseWallets = isCollapseWalletsOldProp || isCollapseWallets;
    if (!isEnableWallets) {
      return null;
    }
    if (CoreHelperUtil.isTelegram() && (CoreHelperUtil.isSafari() || CoreHelperUtil.isIos())) {
      ConnectionController.connectWalletConnect().catch((_e) => ({}));
    }
    if (this.walletGuide === "explore") {
      return null;
    }
    const hasOtherMethods = this.isAuthEnabled && (this.isEmailEnabled || this.isSocialEnabled);
    if (hasOtherMethods && shouldCollapseWallets) {
      return x`<wui-list-button
        data-testid="w3m-collapse-wallets-button"
        tabIdx=${o(tabIndex)}
        @click=${this.onContinueWalletClick.bind(this)}
        text="Continue with a wallet"
        icon="wallet"
      ></wui-list-button>`;
    }
    return x`<w3m-wallet-login-list tabIdx=${o(tabIndex)}></w3m-wallet-login-list>`;
  }
  legalCheckboxTemplate() {
    if (this.walletGuide === "explore") {
      return null;
    }
    return x`<w3m-legal-checkbox data-testid="w3m-legal-checkbox"></w3m-legal-checkbox>`;
  }
  handleConnectListScroll() {
    const connectEl = this.shadowRoot?.querySelector(".connect");
    if (!connectEl) {
      return;
    }
    const shouldApplyMask = connectEl.scrollHeight > SCROLL_THRESHOLD;
    if (shouldApplyMask) {
      connectEl.style.setProperty("--connect-mask-image", `linear-gradient(
          to bottom,
          rgba(0, 0, 0, calc(1 - var(--connect-scroll--top-opacity))) 0px,
          rgba(200, 200, 200, calc(1 - var(--connect-scroll--top-opacity))) 1px,
          black 100px,
          black calc(100% - 100px),
          rgba(155, 155, 155, calc(1 - var(--connect-scroll--bottom-opacity))) calc(100% - 1px),
          rgba(0, 0, 0, calc(1 - var(--connect-scroll--bottom-opacity))) 100%
        )`);
      connectEl.style.setProperty("--connect-scroll--top-opacity", MathUtil.interpolate([0, 50], [0, 1], connectEl.scrollTop).toString());
      connectEl.style.setProperty("--connect-scroll--bottom-opacity", MathUtil.interpolate([0, 50], [0, 1], connectEl.scrollHeight - connectEl.scrollTop - connectEl.offsetHeight).toString());
    } else {
      connectEl.style.setProperty("--connect-mask-image", "none");
      connectEl.style.setProperty("--connect-scroll--top-opacity", "0");
      connectEl.style.setProperty("--connect-scroll--bottom-opacity", "0");
    }
  }
  onContinueWalletClick() {
    RouterController.push("ConnectWallets");
  }
};
W3mConnectView.styles = styles$d;
__decorate$j([
  r()
], W3mConnectView.prototype, "connectors", void 0);
__decorate$j([
  r()
], W3mConnectView.prototype, "authConnector", void 0);
__decorate$j([
  r()
], W3mConnectView.prototype, "features", void 0);
__decorate$j([
  r()
], W3mConnectView.prototype, "remoteFeatures", void 0);
__decorate$j([
  r()
], W3mConnectView.prototype, "enableWallets", void 0);
__decorate$j([
  r()
], W3mConnectView.prototype, "noAdapters", void 0);
__decorate$j([
  n()
], W3mConnectView.prototype, "walletGuide", void 0);
__decorate$j([
  r()
], W3mConnectView.prototype, "checked", void 0);
__decorate$j([
  r()
], W3mConnectView.prototype, "isEmailEnabled", void 0);
__decorate$j([
  r()
], W3mConnectView.prototype, "isSocialEnabled", void 0);
__decorate$j([
  r()
], W3mConnectView.prototype, "isAuthEnabled", void 0);
W3mConnectView = __decorate$j([
  customElement("w3m-connect-view")
], W3mConnectView);
var __decorate$i = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mConnectingExternalView = class W3mConnectingExternalView2 extends W3mConnectingWidget {
  constructor() {
    super();
    this.externalViewUnsubscribe = [];
    this.connectionsByNamespace = ConnectionController.getConnections(this.connector?.chain);
    this.hasMultipleConnections = this.connectionsByNamespace.length > 0;
    this.remoteFeatures = OptionsController.state.remoteFeatures;
    this.currentActiveConnectorId = ConnectorController.state.activeConnectorIds[this.connector?.chain];
    if (!this.connector) {
      throw new Error("w3m-connecting-view: No connector provided");
    }
    const namespace = this.connector?.chain;
    if (this.isAlreadyConnected(this.connector)) {
      this.secondaryBtnLabel = void 0;
      this.label = `This account is already linked, change your account in ${this.connector.name}`;
      this.secondaryLabel = `To link a new account, open ${this.connector.name} and switch to the account you want to link`;
    }
    EventsController.sendEvent({
      type: "track",
      event: "SELECT_WALLET",
      properties: {
        name: this.connector.name ?? "Unknown",
        platform: "browser",
        displayIndex: this.wallet?.display_index,
        walletRank: this.wallet?.order,
        view: RouterController.state.view
      }
    });
    this.onConnect = this.onConnectProxy.bind(this);
    this.onAutoConnect = this.onConnectProxy.bind(this);
    this.isWalletConnect = false;
    this.externalViewUnsubscribe.push(ConnectorController.subscribeKey("activeConnectorIds", (val) => {
      const newActiveConnectorId = val[namespace];
      const isMultiWalletEnabled = this.remoteFeatures?.multiWallet;
      const { redirectView } = RouterController.state.data ?? {};
      if (newActiveConnectorId !== this.currentActiveConnectorId) {
        if (this.hasMultipleConnections && isMultiWalletEnabled) {
          RouterController.replace("ProfileWallets");
          SnackController.showSuccess("New Wallet Added");
        } else if (redirectView) {
          RouterController.replace(redirectView);
        } else {
          ModalController.close();
        }
      }
    }), ConnectionController.subscribeKey("connections", this.onConnectionsChange.bind(this)));
  }
  disconnectedCallback() {
    this.externalViewUnsubscribe.forEach((unsubscribe) => unsubscribe());
  }
  async onConnectProxy() {
    try {
      this.error = false;
      if (this.connector) {
        if (this.isAlreadyConnected(this.connector)) {
          return;
        }
        if (this.connector.id !== ConstantsUtil.CONNECTOR_ID.COINBASE_SDK || !this.error) {
          await ConnectionController.connectExternal(this.connector, this.connector.chain);
        }
      }
    } catch (error) {
      const isUserRejectedRequestError = error instanceof AppKitError && error.originalName === ErrorUtil$1.PROVIDER_RPC_ERROR_NAME.USER_REJECTED_REQUEST;
      if (isUserRejectedRequestError) {
        EventsController.sendEvent({
          type: "track",
          event: "USER_REJECTED",
          properties: { message: error.message }
        });
      } else {
        EventsController.sendEvent({
          type: "track",
          event: "CONNECT_ERROR",
          properties: { message: error?.message ?? "Unknown" }
        });
      }
      this.error = true;
    }
  }
  onConnectionsChange(connections) {
    if (this.connector?.chain && connections.get(this.connector.chain) && this.isAlreadyConnected(this.connector)) {
      const newConnections = connections.get(this.connector.chain) ?? [];
      const isMultiWalletEnabled = this.remoteFeatures?.multiWallet;
      if (newConnections.length === 0) {
        RouterController.replace("Connect");
      } else {
        const accounts = ConnectionControllerUtil.getConnectionsByConnectorId(this.connectionsByNamespace, this.connector.id).flatMap((c2) => c2.accounts);
        const newAccounts = ConnectionControllerUtil.getConnectionsByConnectorId(newConnections, this.connector.id).flatMap((c2) => c2.accounts);
        if (newAccounts.length === 0) {
          if (this.hasMultipleConnections && isMultiWalletEnabled) {
            RouterController.replace("ProfileWallets");
            SnackController.showSuccess("Wallet deleted");
          } else {
            ModalController.close();
          }
        } else {
          const isAllAccountsSame = accounts.every((a3) => newAccounts.some((b2) => HelpersUtil$1.isLowerCaseMatch(a3.address, b2.address)));
          if (!isAllAccountsSame && isMultiWalletEnabled) {
            RouterController.replace("ProfileWallets");
          }
        }
      }
    }
  }
  isAlreadyConnected(connector) {
    return Boolean(connector) && this.connectionsByNamespace.some((c2) => HelpersUtil$1.isLowerCaseMatch(c2.connectorId, connector.id));
  }
};
W3mConnectingExternalView = __decorate$i([
  customElement("w3m-connecting-external-view")
], W3mConnectingExternalView);
const styles$c = i$1`
  wui-flex,
  wui-list-wallet {
    width: 100%;
  }
`;
var __decorate$h = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mConnectingMultiChainView = class W3mConnectingMultiChainView2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.activeConnector = ConnectorController.state.activeConnector;
    this.unsubscribe.push(...[ConnectorController.subscribeKey("activeConnector", (val) => this.activeConnector = val)]);
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
  }
  render() {
    return x`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        .padding=${["3", "5", "5", "5"]}
        gap="5"
      >
        <wui-flex justifyContent="center" alignItems="center">
          <wui-wallet-image
            size="lg"
            imageSrc=${o(AssetUtil.getConnectorImage(this.activeConnector))}
          ></wui-wallet-image>
        </wui-flex>
        <wui-flex
          flexDirection="column"
          alignItems="center"
          gap="2"
          .padding=${["0", "3", "0", "3"]}
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
          .padding=${["2", "0", "2", "0"]}
        >
          ${this.networksTemplate()}
        </wui-flex>
      </wui-flex>
    `;
  }
  networksTemplate() {
    return this.activeConnector?.connectors?.map((connector, index) => connector.name ? x`
            <w3m-list-wallet
              displayIndex=${index}
              imageSrc=${o(AssetUtil.getChainImage(connector.chain))}
              name=${ConstantsUtil.CHAIN_NAME_MAP[connector.chain]}
              @click=${() => this.onConnector(connector)}
              size="sm"
              data-testid="wui-list-chain-${connector.chain}"
              rdnsId=${connector.explorerWallet?.rdns}
            ></w3m-list-wallet>
          ` : null);
  }
  onConnector(provider) {
    const connector = this.activeConnector?.connectors?.find((p) => p.chain === provider.chain);
    const redirectView = RouterController.state.data?.redirectView;
    if (!connector) {
      SnackController.showError("Failed to find connector");
      return;
    }
    if (connector.id === "walletConnect") {
      if (CoreHelperUtil.isMobile()) {
        RouterController.push("AllWallets");
      } else {
        RouterController.push("ConnectingWalletConnect", { redirectView });
      }
    } else {
      RouterController.push("ConnectingExternal", {
        connector,
        redirectView,
        wallet: this.activeConnector?.explorerWallet
      });
    }
  }
};
W3mConnectingMultiChainView.styles = styles$c;
__decorate$h([
  r()
], W3mConnectingMultiChainView.prototype, "activeConnector", void 0);
W3mConnectingMultiChainView = __decorate$h([
  customElement("w3m-connecting-multi-chain-view")
], W3mConnectingMultiChainView);
const styles$b = i$1`
  .continue-button-container {
    width: 100%;
  }
`;
var __decorate$g = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mChooseAccountNameView = class W3mChooseAccountNameView2 extends i {
  constructor() {
    super(...arguments);
    this.loading = false;
  }
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
          Learn more about names
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
    return x`<wui-flex
      .padding=${["0", "8", "0", "8"]}
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
    RouterController.push("RegisterAccountName");
    EventsController.sendEvent({
      type: "track",
      event: "OPEN_ENS_FLOW",
      properties: {
        isSmartAccount: getPreferredAccountType(ChainController.state.activeChain) === W3mFrameRpcConstants.ACCOUNT_TYPES.SMART_ACCOUNT
      }
    });
  }
};
W3mChooseAccountNameView.styles = styles$b;
__decorate$g([
  r()
], W3mChooseAccountNameView.prototype, "loading", void 0);
W3mChooseAccountNameView = __decorate$g([
  customElement("w3m-choose-account-name-view")
], W3mChooseAccountNameView);
var __decorate$f = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
const EXPLORER = "https://walletconnect.com/explorer";
let W3mGetWalletView = class W3mGetWalletView2 extends i {
  render() {
    return x`
      <wui-flex flexDirection="column" .padding=${["0", "3", "3", "3"]} gap="2">
        ${this.recommendedWalletsTemplate()}
        <w3m-list-wallet
          name="Explore all"
          showAllWallets
          walletIcon="allWallets"
          icon="externalLink"
          size="sm"
          @click=${() => {
      CoreHelperUtil.openHref("https://walletconnect.com/explorer?type=wallet", "_blank");
    }}
        ></w3m-list-wallet>
      </wui-flex>
    `;
  }
  recommendedWalletsTemplate() {
    const { recommended, featured } = ApiController.state;
    const { customWallets } = OptionsController.state;
    const wallets = [...featured, ...customWallets ?? [], ...recommended].slice(0, 4);
    return wallets.map((wallet, index) => x`
        <w3m-list-wallet
          displayIndex=${index}
          name=${wallet.name ?? "Unknown"}
          tagVariant="accent"
          size="sm"
          imageSrc=${o(AssetUtil.getWalletImage(wallet))}
          @click=${() => {
      this.onWalletClick(wallet);
    }}
        ></w3m-list-wallet>
      `);
  }
  onWalletClick(wallet) {
    EventsController.sendEvent({
      type: "track",
      event: "GET_WALLET",
      properties: {
        name: wallet.name,
        walletRank: void 0,
        explorerId: wallet.id,
        type: "homepage"
      }
    });
    CoreHelperUtil.openHref(wallet.homepage ?? EXPLORER, "_blank");
  }
};
W3mGetWalletView = __decorate$f([
  customElement("w3m-get-wallet-view")
], W3mGetWalletView);
var __decorate$e = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mHelpWidget = class W3mHelpWidget2 extends i {
  constructor() {
    super(...arguments);
    this.data = [];
  }
  render() {
    return x`
      <wui-flex flexDirection="column" alignItems="center" gap="4">
        ${this.data.map((item) => x`
            <wui-flex flexDirection="column" alignItems="center" gap="5">
              <wui-flex flexDirection="row" justifyContent="center" gap="1">
                ${item.images.map((image) => x`<wui-visual size="sm" name=${image}></wui-visual>`)}
              </wui-flex>
            </wui-flex>
            <wui-flex flexDirection="column" alignItems="center" gap="1">
              <wui-text variant="md-regular" color="primary" align="center">${item.title}</wui-text>
              <wui-text variant="sm-regular" color="secondary" align="center"
                >${item.text}</wui-text
              >
            </wui-flex>
          `)}
      </wui-flex>
    `;
  }
};
__decorate$e([
  n({ type: Array })
], W3mHelpWidget.prototype, "data", void 0);
W3mHelpWidget = __decorate$e([
  customElement("w3m-help-widget")
], W3mHelpWidget);
var __decorate$d = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
const data$1 = [
  {
    images: ["login", "profile", "lock"],
    title: "One login for all of web3",
    text: "Log in to any app by connecting your wallet. Say goodbye to countless passwords!"
  },
  {
    images: ["defi", "nft", "eth"],
    title: "A home for your digital assets",
    text: "A wallet lets you store, send and receive digital assets like cryptocurrencies and NFTs."
  },
  {
    images: ["browser", "noun", "dao"],
    title: "Your gateway to a new web",
    text: "With your wallet, you can explore and interact with DeFi, NFTs, DAOs, and much more."
  }
];
let W3mWhatIsAWalletView = class W3mWhatIsAWalletView2 extends i {
  render() {
    return x`
      <wui-flex
        flexDirection="column"
        .padding=${["6", "5", "5", "5"]}
        alignItems="center"
        gap="5"
      >
        <w3m-help-widget .data=${data$1}></w3m-help-widget>
        <wui-button variant="accent-primary" size="md" @click=${this.onGetWallet.bind(this)}>
          <wui-icon color="inherit" slot="iconLeft" name="wallet"></wui-icon>
          Get a wallet
        </wui-button>
      </wui-flex>
    `;
  }
  onGetWallet() {
    EventsController.sendEvent({ type: "track", event: "CLICK_GET_WALLET_HELP" });
    RouterController.push("GetWallet");
  }
};
W3mWhatIsAWalletView = __decorate$d([
  customElement("w3m-what-is-a-wallet-view")
], W3mWhatIsAWalletView);
const styles$a = css`
  wui-flex {
    max-height: clamp(360px, 540px, 80vh);
    overflow: scroll;
    scrollbar-width: none;
    transition: opacity ${({ durations }) => durations["lg"]}
      ${({ easings }) => easings["ease-out-power-2"]};
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
var __decorate$c = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mConnectWalletsView = class W3mConnectWalletsView2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.checked = OptionsStateController.state.isLegalCheckboxChecked;
    this.unsubscribe.push(OptionsStateController.subscribeKey("isLegalCheckboxChecked", (val) => {
      this.checked = val;
    }));
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
  }
  render() {
    const { termsConditionsUrl, privacyPolicyUrl } = OptionsController.state;
    const legalCheckbox = OptionsController.state.features?.legalCheckbox;
    const legalUrl = termsConditionsUrl || privacyPolicyUrl;
    const showLegalCheckbox = Boolean(legalUrl) && Boolean(legalCheckbox);
    const disabled = showLegalCheckbox && !this.checked;
    const tabIndex = disabled ? -1 : void 0;
    return x`
      <w3m-legal-checkbox></w3m-legal-checkbox>
      <wui-flex
        flexDirection="column"
        .padding=${showLegalCheckbox ? ["0", "3", "3", "3"] : "3"}
        gap="2"
        class=${o(disabled ? "disabled" : void 0)}
      >
        <w3m-wallet-login-list tabIdx=${o(tabIndex)}></w3m-wallet-login-list>
      </wui-flex>
    `;
  }
};
W3mConnectWalletsView.styles = styles$a;
__decorate$c([
  r()
], W3mConnectWalletsView.prototype, "checked", void 0);
W3mConnectWalletsView = __decorate$c([
  customElement("w3m-connect-wallets-view")
], W3mConnectWalletsView);
const styles$9 = css`
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
    stroke: ${(tokens) => tokens.colors.accent100};
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
var __decorate$b = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let WuiLoadingHexagon = class WuiLoadingHexagon2 extends i {
  render() {
    return x`
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
WuiLoadingHexagon.styles = [resetStyles, styles$9];
WuiLoadingHexagon = __decorate$b([
  customElement("wui-loading-hexagon")
], WuiLoadingHexagon);
const styles$8 = i$1`
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
var __decorate$a = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mNetworkSwitchView = class W3mNetworkSwitchView2 extends i {
  constructor() {
    super();
    this.network = RouterController.state.data?.network;
    this.unsubscribe = [];
    this.showRetry = false;
    this.error = false;
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
  }
  firstUpdated() {
    this.onSwitchNetwork();
  }
  render() {
    if (!this.network) {
      throw new Error("w3m-network-switch-view: No network provided");
    }
    this.onShowRetry();
    const label = this.getLabel();
    const subLabel = this.getSubLabel();
    return x`
      <wui-flex
        data-error=${this.error}
        flexDirection="column"
        alignItems="center"
        .padding=${["10", "5", "10", "5"]}
        gap="7"
      >
        <wui-flex justifyContent="center" alignItems="center">
          <wui-network-image
            size="lg"
            imageSrc=${o(AssetUtil.getNetworkImage(this.network))}
          ></wui-network-image>

          ${this.error ? null : x`<wui-loading-hexagon></wui-loading-hexagon>`}

          <wui-icon-box color="error" icon="close" size="sm"></wui-icon-box>
        </wui-flex>

        <wui-flex flexDirection="column" alignItems="center" gap="2">
          <wui-text align="center" variant="h6-regular" color="primary">${label}</wui-text>
          <wui-text align="center" variant="md-regular" color="secondary">${subLabel}</wui-text>
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
    const connectorId = ConnectorController.getConnectorId(ChainController.state.activeChain);
    const authConnector = ConnectorController.getAuthConnector();
    if (authConnector && connectorId === ConstantsUtil.CONNECTOR_ID.AUTH) {
      return "";
    }
    return this.error ? "Switch can be declined if chain is not supported by a wallet or previous request is still active" : "Accept connection request in your wallet";
  }
  getLabel() {
    const connectorId = ConnectorController.getConnectorId(ChainController.state.activeChain);
    const authConnector = ConnectorController.getAuthConnector();
    if (authConnector && connectorId === ConstantsUtil.CONNECTOR_ID.AUTH) {
      return `Switching to ${this.network?.name ?? "Unknown"} network...`;
    }
    return this.error ? "Switch declined" : "Approve in wallet";
  }
  onShowRetry() {
    if (this.error && !this.showRetry) {
      this.showRetry = true;
      const retryButton = this.shadowRoot?.querySelector("wui-button");
      retryButton?.animate([{ opacity: 0 }, { opacity: 1 }], {
        fill: "forwards",
        easing: "ease"
      });
    }
  }
  async onSwitchNetwork() {
    try {
      this.error = false;
      if (ChainController.state.activeChain !== this.network?.chainNamespace) {
        ChainController.setIsSwitchingNamespace(true);
      }
      if (this.network) {
        await ChainController.switchActiveNetwork(this.network);
        const isAuthenticated = await SIWXUtil.isAuthenticated();
        if (isAuthenticated) {
          RouterController.goBack();
        }
      }
    } catch (error) {
      this.error = true;
    }
  }
};
W3mNetworkSwitchView.styles = styles$8;
__decorate$a([
  r()
], W3mNetworkSwitchView.prototype, "showRetry", void 0);
__decorate$a([
  r()
], W3mNetworkSwitchView.prototype, "error", void 0);
W3mNetworkSwitchView = __decorate$a([
  customElement("w3m-network-switch-view")
], W3mNetworkSwitchView);
const styles$7 = css`
  :host {
    width: 100%;
  }

  button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: ${({ spacing }) => spacing[3]};
    width: 100%;
    background-color: transparent;
    border-radius: ${({ borderRadius }) => borderRadius[4]};
  }

  wui-text {
    text-transform: capitalize;
  }

  @media (hover: hover) {
    button:hover:enabled {
      background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
    }
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
var __decorate$9 = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let WuiListNetwork = class WuiListNetwork2 extends i {
  constructor() {
    super(...arguments);
    this.imageSrc = void 0;
    this.name = "Ethereum";
    this.disabled = false;
  }
  render() {
    return x`
      <button ?disabled=${this.disabled} tabindex=${o(this.tabIdx)}>
        <wui-flex gap="2" alignItems="center">
          ${this.imageTemplate()}
          <wui-text variant="lg-regular" color="primary">${this.name}</wui-text>
        </wui-flex>
        <wui-icon name="chevronRight" size="lg" color="default"></wui-icon>
      </button>
    `;
  }
  imageTemplate() {
    if (this.imageSrc) {
      return x`<wui-image ?boxed=${true} src=${this.imageSrc}></wui-image>`;
    }
    return x`<wui-image
      ?boxed=${true}
      icon="networkPlaceholder"
      size="lg"
      iconColor="default"
    ></wui-image>`;
  }
};
WuiListNetwork.styles = [resetStyles, elementStyles, styles$7];
__decorate$9([
  n()
], WuiListNetwork.prototype, "imageSrc", void 0);
__decorate$9([
  n()
], WuiListNetwork.prototype, "name", void 0);
__decorate$9([
  n()
], WuiListNetwork.prototype, "tabIdx", void 0);
__decorate$9([
  n({ type: Boolean })
], WuiListNetwork.prototype, "disabled", void 0);
WuiListNetwork = __decorate$9([
  customElement("wui-list-network")
], WuiListNetwork);
const styles$6 = i$1`
  .container {
    max-height: 360px;
    overflow: auto;
  }

  .container::-webkit-scrollbar {
    display: none;
  }
`;
var __decorate$8 = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mNetworksView = class W3mNetworksView2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.network = ChainController.state.activeCaipNetwork;
    this.requestedCaipNetworks = ChainController.getCaipNetworks();
    this.search = "";
    this.onDebouncedSearch = CoreHelperUtil.debounce((value) => {
      this.search = value;
    }, 100);
    this.unsubscribe.push(AssetController.subscribeNetworkImages(() => this.requestUpdate()), ChainController.subscribeKey("activeCaipNetwork", (val) => this.network = val), ChainController.subscribe(() => {
      this.requestedCaipNetworks = ChainController.getAllRequestedCaipNetworks();
    }));
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
  }
  render() {
    return x`
      ${this.templateSearchInput()}
      <wui-flex
        class="container"
        .padding=${["0", "3", "3", "3"]}
        flexDirection="column"
        gap="2"
      >
        ${this.networksTemplate()}
      </wui-flex>
    `;
  }
  templateSearchInput() {
    return x`
      <wui-flex gap="2" .padding=${["0", "3", "3", "3"]}>
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
  onInputChange(event) {
    this.onDebouncedSearch(event.detail);
  }
  networksTemplate() {
    const approvedCaipNetworkIds = ChainController.getAllApprovedCaipNetworkIds();
    const sortedNetworks = CoreHelperUtil.sortRequestedNetworks(approvedCaipNetworkIds, this.requestedCaipNetworks);
    if (this.search) {
      this.filteredNetworks = sortedNetworks?.filter((network) => network?.name?.toLowerCase().includes(this.search.toLowerCase()));
    } else {
      this.filteredNetworks = sortedNetworks;
    }
    return this.filteredNetworks?.map((network) => x`
        <wui-list-network
          .selected=${this.network?.id === network.id}
          imageSrc=${o(AssetUtil.getNetworkImage(network))}
          type="network"
          name=${network.name ?? network.id}
          @click=${() => this.onSwitchNetwork(network)}
          .disabled=${ChainController.isCaipNetworkDisabled(network)}
          data-testid=${`w3m-network-switch-${network.name ?? network.id}`}
        ></wui-list-network>
      `);
  }
  onSwitchNetwork(network) {
    NetworkUtil.onSwitchNetwork({ network });
  }
};
W3mNetworksView.styles = styles$6;
__decorate$8([
  r()
], W3mNetworksView.prototype, "network", void 0);
__decorate$8([
  r()
], W3mNetworksView.prototype, "requestedCaipNetworks", void 0);
__decorate$8([
  r()
], W3mNetworksView.prototype, "filteredNetworks", void 0);
__decorate$8([
  r()
], W3mNetworksView.prototype, "search", void 0);
W3mNetworksView = __decorate$8([
  customElement("w3m-networks-view")
], W3mNetworksView);
const styles$5 = css`
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
      ${({ borderRadius }) => borderRadius["1"]} * 9 - ${({ borderRadius }) => borderRadius["3"]}
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
      ${({ borderRadius }) => borderRadius["1"]} * 9 - ${({ borderRadius }) => borderRadius["3"]}
    );
    box-shadow: inset 0 0 0 1px ${({ tokens }) => tokens.core.glass010};
  }

  wui-icon-box {
    position: absolute;
    right: calc(${({ spacing }) => spacing["1"]} * -1);
    bottom: calc(${({ spacing }) => spacing["1"]} * -1);
    opacity: 0;
    transform: scale(0.5);
    transition:
      opacity ${({ durations }) => durations["lg"]} ${({ easings }) => easings["ease-out-power-2"]},
      transform ${({ durations }) => durations["lg"]}
        ${({ easings }) => easings["ease-out-power-2"]};
    will-change: opacity, transform;
  }

  wui-text[align='center'] {
    width: 100%;
    padding: 0px ${({ spacing }) => spacing["4"]};
  }

  [data-error='true'] wui-icon-box {
    opacity: 1;
    transform: scale(1);
  }

  [data-error='true'] > wui-flex:first-child {
    animation: shake 250ms ${({ easings }) => easings["ease-out-power-2"]} both;
  }

  [data-retry='false'] wui-link {
    display: none;
  }

  [data-retry='true'] wui-link {
    display: block;
    opacity: 1;
  }

  wui-link {
    padding: ${({ spacing }) => spacing["01"]} ${({ spacing }) => spacing["2"]};
  }

  .capitalize {
    text-transform: capitalize;
  }
`;
var __decorate$7 = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
const chainIconNameMap = {
  eip155: "eth",
  solana: "solana",
  bip122: "bitcoin",
  polkadot: void 0
};
let W3mSwitchActiveChainView = class W3mSwitchActiveChainView2 extends i {
  constructor() {
    super(...arguments);
    this.unsubscribe = [];
    this.switchToChain = RouterController.state.data?.switchToChain;
    this.caipNetwork = RouterController.state.data?.network;
    this.activeChain = ChainController.state.activeChain;
  }
  firstUpdated() {
    this.unsubscribe.push(ChainController.subscribeKey("activeChain", (val) => this.activeChain = val));
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
  }
  render() {
    const switchedChainNameString = this.switchToChain ? ConstantsUtil.CHAIN_NAME_MAP[this.switchToChain] : "supported";
    if (!this.switchToChain) {
      return null;
    }
    const nextChainName = ConstantsUtil.CHAIN_NAME_MAP[this.switchToChain];
    return x`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        .padding=${["4", "2", "2", "2"]}
        gap="4"
      >
        <wui-flex justifyContent="center" flexDirection="column" alignItems="center" gap="2">
          <wui-visual
            size="md"
            name=${o(chainIconNameMap[this.switchToChain])}
          ></wui-visual>
          <wui-flex gap="2" flexDirection="column" alignItems="center">
            <wui-text
              data-testid=${`w3m-switch-active-chain-to-${nextChainName}`}
              variant="lg-regular"
              color="primary"
              align="center"
              >Switch to <span class="capitalize">${nextChainName}</span></wui-text
            >
            <wui-text variant="md-regular" color="secondary" align="center">
              Connected wallet doesn't support connecting to ${switchedChainNameString} chain. You
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
    if (!this.switchToChain) {
      return;
    }
    ChainController.setIsSwitchingNamespace(true);
    ConnectorController.setFilterByNamespace(this.switchToChain);
    if (this.caipNetwork) {
      await ChainController.switchActiveNetwork(this.caipNetwork);
    } else {
      ChainController.setActiveNamespace(this.switchToChain);
    }
    RouterController.reset("Connect");
  }
};
W3mSwitchActiveChainView.styles = styles$5;
__decorate$7([
  n()
], W3mSwitchActiveChainView.prototype, "activeChain", void 0);
W3mSwitchActiveChainView = __decorate$7([
  customElement("w3m-switch-active-chain-view")
], W3mSwitchActiveChainView);
var __decorate$6 = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
const data = [
  {
    images: ["network", "layers", "system"],
    title: "The system’s nuts and bolts",
    text: "A network is what brings the blockchain to life, as this technical infrastructure allows apps to access the ledger and smart contract services."
  },
  {
    images: ["noun", "defiAlt", "dao"],
    title: "Designed for different uses",
    text: "Each network is designed differently, and may therefore suit certain apps and experiences."
  }
];
let W3mWhatIsANetworkView = class W3mWhatIsANetworkView2 extends i {
  render() {
    return x`
      <wui-flex
        flexDirection="column"
        .padding=${["6", "5", "5", "5"]}
        alignItems="center"
        gap="5"
      >
        <w3m-help-widget .data=${data}></w3m-help-widget>
        <wui-button
          variant="accent-primary"
          size="md"
          @click=${() => {
      CoreHelperUtil.openHref("https://ethereum.org/en/developers/docs/networks/", "_blank");
    }}
        >
          Learn more
          <wui-icon color="inherit" slot="iconRight" name="externalLink"></wui-icon>
        </wui-button>
      </wui-flex>
    `;
  }
};
W3mWhatIsANetworkView = __decorate$6([
  customElement("w3m-what-is-a-network-view")
], W3mWhatIsANetworkView);
const styles$4 = i$1`
  :host > wui-flex {
    max-height: clamp(360px, 540px, 80vh);
    overflow: scroll;
    scrollbar-width: none;
  }

  :host > wui-flex::-webkit-scrollbar {
    display: none;
  }
`;
var __decorate$5 = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mUnsupportedChainView = class W3mUnsupportedChainView2 extends i {
  constructor() {
    super();
    this.swapUnsupportedChain = RouterController.state.data?.swapUnsupportedChain;
    this.unsubscribe = [];
    this.disconnecting = false;
    this.remoteFeatures = OptionsController.state.remoteFeatures;
    this.unsubscribe.push(AssetController.subscribeNetworkImages(() => this.requestUpdate()), OptionsController.subscribeKey("remoteFeatures", (val) => {
      this.remoteFeatures = val;
    }));
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
  }
  render() {
    return x`
      <wui-flex class="container" flexDirection="column" gap="0">
        <wui-flex
          class="container"
          flexDirection="column"
          .padding=${["3", "5", "2", "5"]}
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
            ?chevron=${false}
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
    if (this.swapUnsupportedChain) {
      return x`
        <wui-text variant="sm-regular" color="secondary" align="center">
          The swap feature doesn’t support your current network. Switch to an available option to
          continue.
        </wui-text>
      `;
    }
    return x`
      <wui-text variant="sm-regular" color="secondary" align="center">
        This app doesn’t support your current network. Switch to an available option to continue.
      </wui-text>
    `;
  }
  networksTemplate() {
    const requestedCaipNetworks = ChainController.getAllRequestedCaipNetworks();
    const approvedCaipNetworkIds = ChainController.getAllApprovedCaipNetworkIds();
    const sortedNetworks = CoreHelperUtil.sortRequestedNetworks(approvedCaipNetworkIds, requestedCaipNetworks);
    const filteredNetworks = this.swapUnsupportedChain ? sortedNetworks.filter((network) => ConstantsUtil$1.SWAP_SUPPORTED_NETWORKS.includes(network.caipNetworkId)) : sortedNetworks;
    return filteredNetworks.map((network) => x`
        <wui-list-network
          imageSrc=${o(AssetUtil.getNetworkImage(network))}
          name=${network.name ?? "Unknown"}
          @click=${() => this.onSwitchNetwork(network)}
        >
        </wui-list-network>
      `);
  }
  async onDisconnect() {
    try {
      this.disconnecting = true;
      const namespace = ChainController.state.activeChain;
      const connectionsByNamespace = ConnectionController.getConnections(namespace);
      const hasConnections = connectionsByNamespace.length > 0;
      const connectorId = namespace && ConnectorController.state.activeConnectorIds[namespace];
      const isMultiWalletEnabled = this.remoteFeatures?.multiWallet;
      await ConnectionController.disconnect(isMultiWalletEnabled ? { id: connectorId, namespace } : {});
      if (hasConnections && isMultiWalletEnabled) {
        RouterController.push("ProfileWallets");
        SnackController.showSuccess("Wallet deleted");
      }
    } catch {
      EventsController.sendEvent({
        type: "track",
        event: "DISCONNECT_ERROR",
        properties: { message: "Failed to disconnect" }
      });
      SnackController.showError("Failed to disconnect");
    } finally {
      this.disconnecting = false;
    }
  }
  async onSwitchNetwork(network) {
    const caipAddress = ChainController.getActiveCaipAddress();
    const approvedCaipNetworkIds = ChainController.getAllApprovedCaipNetworkIds();
    const shouldSupportAllNetworks = ChainController.getNetworkProp("supportsAllNetworks", network.chainNamespace);
    const routerData = RouterController.state.data;
    if (caipAddress) {
      if (approvedCaipNetworkIds?.includes(network.caipNetworkId)) {
        await ChainController.switchActiveNetwork(network);
      } else if (shouldSupportAllNetworks) {
        RouterController.push("SwitchNetwork", { ...routerData, network });
      } else {
        RouterController.push("SwitchNetwork", { ...routerData, network });
      }
    } else if (!caipAddress) {
      ChainController.setActiveCaipNetwork(network);
      RouterController.push("Connect");
    }
  }
};
W3mUnsupportedChainView.styles = styles$4;
__decorate$5([
  r()
], W3mUnsupportedChainView.prototype, "disconnecting", void 0);
__decorate$5([
  r()
], W3mUnsupportedChainView.prototype, "remoteFeatures", void 0);
W3mUnsupportedChainView = __decorate$5([
  customElement("w3m-unsupported-chain-view")
], W3mUnsupportedChainView);
const styles$3 = css`
  wui-flex {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${({ spacing }) => spacing[2]};
    border-radius: ${({ borderRadius }) => borderRadius[4]};
    padding: ${({ spacing }) => spacing[3]};
  }

  /* -- Types --------------------------------------------------------- */
  wui-flex[data-type='info'] {
    color: ${({ tokens }) => tokens.theme.textSecondary};
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
  }

  wui-flex[data-type='success'] {
    color: ${({ tokens }) => tokens.core.textSuccess};
    background-color: ${({ tokens }) => tokens.core.backgroundSuccess};
  }

  wui-flex[data-type='error'] {
    color: ${({ tokens }) => tokens.core.textError};
    background-color: ${({ tokens }) => tokens.core.backgroundError};
  }

  wui-flex[data-type='warning'] {
    color: ${({ tokens }) => tokens.core.textWarning};
    background-color: ${({ tokens }) => tokens.core.backgroundWarning};
  }

  wui-flex[data-type='info'] wui-icon-box {
    background-color: ${({ tokens }) => tokens.theme.foregroundSecondary};
  }

  wui-flex[data-type='success'] wui-icon-box {
    background-color: ${({ tokens }) => tokens.core.backgroundSuccess};
  }

  wui-flex[data-type='error'] wui-icon-box {
    background-color: ${({ tokens }) => tokens.core.backgroundError};
  }

  wui-flex[data-type='warning'] wui-icon-box {
    background-color: ${({ tokens }) => tokens.core.backgroundWarning};
  }

  wui-text {
    flex: 1;
  }
`;
var __decorate$4 = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let WuiBanner = class WuiBanner2 extends i {
  constructor() {
    super(...arguments);
    this.icon = "externalLink";
    this.text = "";
    this.type = "info";
  }
  render() {
    return x`
      <wui-flex alignItems="center" data-type=${this.type}>
        <wui-icon-box size="sm" color="inherit" icon=${this.icon}></wui-icon-box>
        <wui-text variant="md-regular" color="inherit">${this.text}</wui-text>
      </wui-flex>
    `;
  }
};
WuiBanner.styles = [resetStyles, elementStyles, styles$3];
__decorate$4([
  n()
], WuiBanner.prototype, "icon", void 0);
__decorate$4([
  n()
], WuiBanner.prototype, "text", void 0);
__decorate$4([
  n()
], WuiBanner.prototype, "type", void 0);
WuiBanner = __decorate$4([
  customElement("wui-banner")
], WuiBanner);
const styles$2 = i$1`
  :host > wui-flex {
    max-height: clamp(360px, 540px, 80vh);
    overflow: scroll;
    scrollbar-width: none;
  }

  :host > wui-flex::-webkit-scrollbar {
    display: none;
  }
`;
var __decorate$3 = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mWalletCompatibleNetworksView = class W3mWalletCompatibleNetworksView2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
  }
  render() {
    return x` <wui-flex flexDirection="column" .padding=${["2", "3", "3", "3"]} gap="2">
      <wui-banner
        icon="warningCircle"
        text="You can only receive assets on these networks"
      ></wui-banner>
      ${this.networkTemplate()}
    </wui-flex>`;
  }
  networkTemplate() {
    const requestedCaipNetworks = ChainController.getAllRequestedCaipNetworks();
    const approvedCaipNetworkIds = ChainController.getAllApprovedCaipNetworkIds();
    const caipNetwork = ChainController.state.activeCaipNetwork;
    const isNetworkEnabledForSmartAccounts = ChainController.checkIfSmartAccountEnabled();
    let sortedNetworks = CoreHelperUtil.sortRequestedNetworks(approvedCaipNetworkIds, requestedCaipNetworks);
    if (isNetworkEnabledForSmartAccounts && getPreferredAccountType(caipNetwork?.chainNamespace) === W3mFrameRpcConstants.ACCOUNT_TYPES.SMART_ACCOUNT) {
      if (!caipNetwork) {
        return null;
      }
      sortedNetworks = [caipNetwork];
    }
    const namespaceNetworks = sortedNetworks.filter((network) => network.chainNamespace === caipNetwork?.chainNamespace);
    return namespaceNetworks.map((network) => x`
        <wui-list-network
          imageSrc=${o(AssetUtil.getNetworkImage(network))}
          name=${network.name ?? "Unknown"}
          ?transparent=${true}
        >
        </wui-list-network>
      `);
  }
};
W3mWalletCompatibleNetworksView.styles = styles$2;
W3mWalletCompatibleNetworksView = __decorate$3([
  customElement("w3m-wallet-compatible-networks-view")
], W3mWalletCompatibleNetworksView);
const styles$1 = css`
  :host {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 56px;
    height: 56px;
    box-shadow: 0 0 0 8px ${({ tokens }) => tokens.theme.borderPrimary};
    border-radius: ${({ borderRadius }) => borderRadius[4]};
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
var __decorate$2 = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let WuiVisualThumbnail = class WuiVisualThumbnail2 extends i {
  render() {
    this.dataset["borderRadiusFull"] = this.borderRadiusFull ? "true" : "false";
    return x`${this.templateVisual()}`;
  }
  templateVisual() {
    if (this.imageSrc) {
      return x`<wui-image src=${this.imageSrc} alt=${this.alt ?? ""}></wui-image>`;
    }
    return x`<wui-icon
      data-parent-size="md"
      size="inherit"
      color="inherit"
      name="wallet"
    ></wui-icon>`;
  }
};
WuiVisualThumbnail.styles = [resetStyles, styles$1];
__decorate$2([
  n()
], WuiVisualThumbnail.prototype, "imageSrc", void 0);
__decorate$2([
  n()
], WuiVisualThumbnail.prototype, "alt", void 0);
__decorate$2([
  n({ type: Boolean })
], WuiVisualThumbnail.prototype, "borderRadiusFull", void 0);
WuiVisualThumbnail = __decorate$2([
  customElement("wui-visual-thumbnail")
], WuiVisualThumbnail);
const styles = css`
  :host {
    display: flex;
    justify-content: center;
    gap: ${({ spacing }) => spacing["4"]};
  }

  wui-visual-thumbnail:nth-child(1) {
    z-index: 1;
  }
`;
var __decorate$1 = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mSIWXSignMessageThumbnails = class W3mSIWXSignMessageThumbnails2 extends i {
  constructor() {
    super(...arguments);
    this.dappImageUrl = OptionsController.state.metadata?.icons;
    this.walletImageUrl = ChainController.getAccountData()?.connectedWalletInfo?.icon;
  }
  firstUpdated() {
    const visuals = this.shadowRoot?.querySelectorAll("wui-visual-thumbnail");
    if (visuals?.[0]) {
      this.createAnimation(visuals[0], "translate(18px)");
    }
    if (visuals?.[1]) {
      this.createAnimation(visuals[1], "translate(-18px)");
    }
  }
  render() {
    return x`
      <wui-visual-thumbnail
        ?borderRadiusFull=${true}
        .imageSrc=${this.dappImageUrl?.[0]}
      ></wui-visual-thumbnail>
      <wui-visual-thumbnail .imageSrc=${this.walletImageUrl}></wui-visual-thumbnail>
    `;
  }
  createAnimation(element, translation) {
    element.animate([{ transform: "translateX(0px)" }, { transform: translation }], {
      duration: 1600,
      easing: "cubic-bezier(0.56, 0, 0.48, 1)",
      direction: "alternate",
      iterations: Infinity
    });
  }
};
W3mSIWXSignMessageThumbnails.styles = styles;
W3mSIWXSignMessageThumbnails = __decorate$1([
  customElement("w3m-siwx-sign-message-thumbnails")
], W3mSIWXSignMessageThumbnails);
var __decorate = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d2;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d2 = decorators[i2]) r2 = (c2 < 3 ? d2(r2) : c2 > 3 ? d2(target, key, r2) : d2(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mSIWXSignMessageView = class W3mSIWXSignMessageView2 extends i {
  constructor() {
    super(...arguments);
    this.dappName = OptionsController.state.metadata?.name;
    this.isCancelling = false;
    this.isSigning = false;
  }
  render() {
    return x`
      <wui-flex justifyContent="center" .padding=${["8", "0", "6", "0"]}>
        <w3m-siwx-sign-message-thumbnails></w3m-siwx-sign-message-thumbnails>
      </wui-flex>
      <wui-flex .padding=${["0", "20", "5", "20"]} gap="3" justifyContent="space-between">
        <wui-text variant="lg-medium" align="center" color="primary"
          >${this.dappName ?? "Dapp"} needs to connect to your wallet</wui-text
        >
      </wui-flex>
      <wui-flex .padding=${["0", "10", "4", "10"]} gap="3" justifyContent="space-between">
        <wui-text variant="md-regular" align="center" color="secondary"
          >Sign this message to prove you own this wallet and proceed. Canceling will disconnect
          you.</wui-text
        >
      </wui-flex>
      <wui-flex .padding=${["4", "5", "5", "5"]} gap="3" justifyContent="space-between">
        <wui-button
          size="lg"
          borderRadius="xs"
          fullWidth
          variant="neutral-secondary"
          ?loading=${this.isCancelling}
          @click=${this.onCancel.bind(this)}
          data-testid="w3m-connecting-siwe-cancel"
        >
          ${this.isCancelling ? "Cancelling..." : "Cancel"}
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
          ${this.isSigning ? "Signing..." : "Sign"}
        </wui-button>
      </wui-flex>
    `;
  }
  async onSign() {
    this.isSigning = true;
    try {
      await SIWXUtil.requestSignMessage();
    } catch (error) {
      if (error instanceof Error && error.message.includes("OTP is required")) {
        SnackController.showError({
          message: "Something went wrong. We need to verify your account again."
        });
        RouterController.replace("DataCapture");
        return;
      }
      throw error;
    } finally {
      this.isSigning = false;
    }
  }
  async onCancel() {
    this.isCancelling = true;
    await SIWXUtil.cancelSignMessage().finally(() => this.isCancelling = false);
  }
};
__decorate([
  r()
], W3mSIWXSignMessageView.prototype, "isCancelling", void 0);
__decorate([
  r()
], W3mSIWXSignMessageView.prototype, "isSigning", void 0);
W3mSIWXSignMessageView = __decorate([
  customElement("w3m-siwx-sign-message-view")
], W3mSIWXSignMessageView);
export {
  AppKitAccountButton,
  AppKitButton,
  AppKitConnectButton,
  AppKitNetworkButton,
  W3mAccountButton,
  W3mAccountSettingsView,
  W3mAccountView,
  a2 as W3mAllWalletsView,
  W3mButton,
  W3mChooseAccountNameView,
  W3mConnectButton,
  W3mConnectView,
  W3mConnectWalletsView,
  W3mConnectingExternalView,
  W3mConnectingMultiChainView,
  c as W3mConnectingWcBasicView,
  b as W3mConnectingWcView,
  d as W3mDownloadsView,
  a as W3mFooter,
  W3mFundWalletView,
  W3mGetWalletView,
  W3mNetworkButton,
  W3mNetworkSwitchView,
  W3mNetworksView,
  W3mProfileWalletsView,
  W as W3mRouter,
  W3mSIWXSignMessageView,
  W3mSwitchActiveChainView,
  W3mUnsupportedChainView,
  W3mWalletCompatibleNetworksView,
  W3mWhatIsANetworkView,
  W3mWhatIsAWalletView
};
