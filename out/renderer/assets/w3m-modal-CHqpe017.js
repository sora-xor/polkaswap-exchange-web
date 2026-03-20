import { M as ModalController, a5 as SIWXUtil, R as RouterController, m as ConnectionController, n as css, r as resetStyles, q as i, x, z as AlertController, o as elementStyles, a as ChainController, v as vars, G as AssetUtil, a1 as AssetController, b as EventsController, O as OptionsController, l as ConnectorController, t as i$1, S as SnackController, U as ApiController, T as ThemeController, a6 as initializeTheming, a7 as AdapterController } from "./walletconnect-BVoLvI4P.js";
import { c as customElement, n, r, U as UiHelperUtil } from "./index-5878y4Sm.js";
import { o } from "./if-defined-DpCpmSxP.js";
import { P as PayController } from "./index-CNGtVqwE.js";
import "./index-SiM7Ib3-.js";
import "./index-CBcUV-KC.js";
import { C as ConstantsUtil } from "./ConstantsUtil-BrK1znIM.js";
import "./index-DAKl5XGv.js";
import "./index-Cm7UDlkl.js";
import "./index-B6Sdk_ow.js";
import { H as HelpersUtil } from "./HelpersUtil-DHNzaUb2.js";
import "./index-4b6jC2di.js";
import { S as SwapController } from "./SwapController-BZ4iHZ-m.js";
import "./index-Bag94m_F.js";
import "./index-lAjfmR0R.js";
import "./index-73GArslZ.js";
import "./index-W8RzVVH7.js";
import "./index-B80WMNJI.js";
import "./index-FTJ7N_Mw.js";
import "./index-Cztg-IpD.js";
import "./index-B9aMMm-V.js";
import "./index-xvpTmtDJ.js";
import "./MathUtil-BspOY7Kj.js";
import "./index-D7Al7wfJ.js";
import "./index-Bz3_ZVag.js";
import "./index-BH8iPnnC.js";
const ModalUtil = {
  isUnsupportedChainView() {
    return RouterController.state.view === "UnsupportedChain" || RouterController.state.view === "SwitchNetwork" && RouterController.state.history.includes("UnsupportedChain");
  },
  async safeClose() {
    if (this.isUnsupportedChainView()) {
      ModalController.shake();
      return;
    }
    const isSIWXCloseDisabled = await SIWXUtil.isSIWXCloseDisabled();
    if (isSIWXCloseDisabled) {
      ModalController.shake();
      return;
    }
    if (RouterController.state.view === "DataCapture" || RouterController.state.view === "DataCaptureOtpConfirm") {
      ConnectionController.disconnect();
    }
    ModalController.close();
  }
};
const styles$b = css`
  :host {
    display: block;
    border-radius: clamp(0px, ${({ borderRadius }) => borderRadius["8"]}, 44px);
    box-shadow: 0 0 0 1px ${({ tokens }) => tokens.theme.foregroundPrimary};
    overflow: hidden;
  }
`;
var __decorate$b = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let WuiCard = class WuiCard2 extends i {
  render() {
    return x`<slot></slot>`;
  }
};
WuiCard.styles = [resetStyles, styles$b];
WuiCard = __decorate$b([
  customElement("wui-card")
], WuiCard);
const styles$a = css`
  :host {
    width: 100%;
  }

  :host > wui-flex {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${({ spacing }) => spacing[2]};
    padding: ${({ spacing }) => spacing[3]};
    border-radius: ${({ borderRadius }) => borderRadius[6]};
    border: 1px solid ${({ tokens }) => tokens.theme.borderPrimary};
    box-sizing: border-box;
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
    box-shadow: 0px 0px 16px 0px rgba(0, 0, 0, 0.25);
    color: ${({ tokens }) => tokens.theme.textPrimary};
  }

  :host > wui-flex[data-type='info'] {
    .icon-box {
      background-color: ${({ tokens }) => tokens.theme.foregroundSecondary};

      wui-icon {
        color: ${({ tokens }) => tokens.theme.iconDefault};
      }
    }
  }
  :host > wui-flex[data-type='success'] {
    .icon-box {
      background-color: ${({ tokens }) => tokens.core.backgroundSuccess};

      wui-icon {
        color: ${({ tokens }) => tokens.core.borderSuccess};
      }
    }
  }
  :host > wui-flex[data-type='warning'] {
    .icon-box {
      background-color: ${({ tokens }) => tokens.core.backgroundWarning};

      wui-icon {
        color: ${({ tokens }) => tokens.core.borderWarning};
      }
    }
  }
  :host > wui-flex[data-type='error'] {
    .icon-box {
      background-color: ${({ tokens }) => tokens.core.backgroundError};

      wui-icon {
        color: ${({ tokens }) => tokens.core.borderError};
      }
    }
  }

  wui-flex {
    width: 100%;
  }

  wui-text {
    word-break: break-word;
    flex: 1;
  }

  .close {
    cursor: pointer;
    color: ${({ tokens }) => tokens.theme.iconDefault};
  }

  .icon-box {
    height: 40px;
    width: 40px;
    border-radius: ${({ borderRadius }) => borderRadius["2"]};
    background-color: var(--local-icon-bg-value);
  }
`;
var __decorate$a = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
const TYPE_ICON_NAME = {
  info: "info",
  success: "checkmark",
  warning: "warningCircle",
  error: "warning"
};
let WuiAlertBar = class WuiAlertBar2 extends i {
  constructor() {
    super(...arguments);
    this.message = "";
    this.type = "info";
  }
  render() {
    return x`
      <wui-flex
        data-type=${o(this.type)}
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        gap="2"
      >
        <wui-flex columnGap="2" flexDirection="row" alignItems="center">
          <wui-flex
            flexDirection="row"
            alignItems="center"
            justifyContent="center"
            class="icon-box"
          >
            <wui-icon color="inherit" size="md" name=${TYPE_ICON_NAME[this.type]}></wui-icon>
          </wui-flex>
          <wui-text variant="md-medium" color="inherit" data-testid="wui-alertbar-text"
            >${this.message}</wui-text
          >
        </wui-flex>
        <wui-icon
          class="close"
          color="inherit"
          size="sm"
          name="close"
          @click=${this.onClose}
        ></wui-icon>
      </wui-flex>
    `;
  }
  onClose() {
    AlertController.close();
  }
};
WuiAlertBar.styles = [resetStyles, styles$a];
__decorate$a([
  n()
], WuiAlertBar.prototype, "message", void 0);
__decorate$a([
  n()
], WuiAlertBar.prototype, "type", void 0);
WuiAlertBar = __decorate$a([
  customElement("wui-alertbar")
], WuiAlertBar);
const styles$9 = css`
  :host {
    display: block;
    position: absolute;
    top: ${({ spacing }) => spacing["3"]};
    left: ${({ spacing }) => spacing["4"]};
    right: ${({ spacing }) => spacing["4"]};
    opacity: 0;
    pointer-events: none;
  }
`;
var __decorate$9 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
const presets = {
  info: {
    backgroundColor: "fg-350",
    iconColor: "fg-325",
    icon: "info"
  },
  success: {
    backgroundColor: "success-glass-reown-020",
    iconColor: "success-125",
    icon: "checkmark"
  },
  warning: {
    backgroundColor: "warning-glass-reown-020",
    iconColor: "warning-100",
    icon: "warningCircle"
  },
  error: {
    backgroundColor: "error-glass-reown-020",
    iconColor: "error-125",
    icon: "warning"
  }
};
let W3mAlertBar = class W3mAlertBar2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.open = AlertController.state.open;
    this.onOpen(true);
    this.unsubscribe.push(AlertController.subscribeKey("open", (val) => {
      this.open = val;
      this.onOpen(false);
    }));
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
  }
  render() {
    const { message, variant } = AlertController.state;
    const preset = presets[variant];
    return x`
      <wui-alertbar
        message=${message}
        backgroundColor=${preset?.backgroundColor}
        iconColor=${preset?.iconColor}
        icon=${preset?.icon}
        type=${variant}
      ></wui-alertbar>
    `;
  }
  onOpen(isMounted) {
    if (this.open) {
      this.animate([
        { opacity: 0, transform: "scale(0.85)" },
        { opacity: 1, transform: "scale(1)" }
      ], {
        duration: 150,
        fill: "forwards",
        easing: "ease"
      });
      this.style.cssText = `pointer-events: auto`;
    } else if (!isMounted) {
      this.animate([
        { opacity: 1, transform: "scale(1)" },
        { opacity: 0, transform: "scale(0.85)" }
      ], {
        duration: 150,
        fill: "forwards",
        easing: "ease"
      });
      this.style.cssText = `pointer-events: none`;
    }
  }
};
W3mAlertBar.styles = styles$9;
__decorate$9([
  r()
], W3mAlertBar.prototype, "open", void 0);
W3mAlertBar = __decorate$9([
  customElement("w3m-alertbar")
], W3mAlertBar);
const styles$8 = css`
  button {
    display: block;
    display: flex;
    align-items: center;
    padding: ${({ spacing }) => spacing[1]};
    transition: background-color ${({ durations }) => durations["lg"]}
      ${({ easings }) => easings["ease-out-power-2"]};
    will-change: background-color;
    border-radius: ${({ borderRadius }) => borderRadius[32]};
  }

  wui-image {
    border-radius: 100%;
  }

  wui-text {
    padding-left: ${({ spacing }) => spacing[1]};
  }

  .left-icon-container,
  .right-icon-container {
    width: 24px;
    height: 24px;
    justify-content: center;
    align-items: center;
  }

  wui-icon {
    color: ${({ tokens }) => tokens.theme.iconDefault};
  }

  /* -- Sizes --------------------------------------------------- */
  button[data-size='lg'] {
    height: 32px;
  }

  button[data-size='md'] {
    height: 28px;
  }

  button[data-size='sm'] {
    height: 24px;
  }

  button[data-size='lg'] wui-image {
    width: 24px;
    height: 24px;
  }

  button[data-size='md'] wui-image {
    width: 20px;
    height: 20px;
  }

  button[data-size='sm'] wui-image {
    width: 16px;
    height: 16px;
  }

  button[data-size='lg'] .left-icon-container {
    width: 24px;
    height: 24px;
  }

  button[data-size='md'] .left-icon-container {
    width: 20px;
    height: 20px;
  }

  button[data-size='sm'] .left-icon-container {
    width: 16px;
    height: 16px;
  }

  /* -- Variants --------------------------------------------------------- */
  button[data-type='filled-dropdown'] {
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
  }

  button[data-type='text-dropdown'] {
    background-color: transparent;
  }

  /* -- Focus states --------------------------------------------------- */
  button:focus-visible:enabled {
    background-color: ${({ tokens }) => tokens.theme.foregroundSecondary};
    box-shadow: 0 0 0 4px ${({ tokens }) => tokens.core.foregroundAccent040};
  }

  /* -- Hover & Active states ----------------------------------------------------------- */
  @media (hover: hover) and (pointer: fine) {
    button:hover:enabled,
    button:active:enabled {
      background-color: ${({ tokens }) => tokens.theme.foregroundSecondary};
    }
  }

  /* -- Disabled states --------------------------------------------------- */
  button:disabled {
    background-color: ${({ tokens }) => tokens.theme.foregroundSecondary};
    opacity: 0.5;
  }
`;
var __decorate$8 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
const TEXT_VARIANT_BY_SIZE = {
  lg: "lg-regular",
  md: "md-regular",
  sm: "sm-regular"
};
const ICON_SIZE_BY_SIZE = {
  lg: "lg",
  md: "md",
  sm: "sm"
};
let WuiSelect = class WuiSelect2 extends i {
  constructor() {
    super(...arguments);
    this.imageSrc = "";
    this.text = "";
    this.size = "lg";
    this.type = "text-dropdown";
    this.disabled = false;
  }
  render() {
    return x`<button ?disabled=${this.disabled} data-size=${this.size} data-type=${this.type}>
      ${this.imageTemplate()} ${this.textTemplate()}
      <wui-flex class="right-icon-container">
        <wui-icon name="chevronBottom"></wui-icon>
      </wui-flex>
    </button>`;
  }
  textTemplate() {
    const textSize = TEXT_VARIANT_BY_SIZE[this.size];
    if (this.text) {
      return x`<wui-text color="primary" variant=${textSize}>${this.text}</wui-text>`;
    }
    return null;
  }
  imageTemplate() {
    if (this.imageSrc) {
      return x`<wui-image src=${this.imageSrc} alt="select visual"></wui-image>`;
    }
    const iconSize = ICON_SIZE_BY_SIZE[this.size];
    return x` <wui-flex class="left-icon-container">
      <wui-icon size=${iconSize} name="networkPlaceholder"></wui-icon>
    </wui-flex>`;
  }
};
WuiSelect.styles = [resetStyles, elementStyles, styles$8];
__decorate$8([
  n()
], WuiSelect.prototype, "imageSrc", void 0);
__decorate$8([
  n()
], WuiSelect.prototype, "text", void 0);
__decorate$8([
  n()
], WuiSelect.prototype, "size", void 0);
__decorate$8([
  n()
], WuiSelect.prototype, "type", void 0);
__decorate$8([
  n({ type: Boolean })
], WuiSelect.prototype, "disabled", void 0);
WuiSelect = __decorate$8([
  customElement("wui-select")
], WuiSelect);
const styles$7 = css`
  wui-image {
    border-radius: ${({ borderRadius }) => borderRadius.round};
  }

  .transfers-badge {
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
    border: 1px solid ${({ tokens }) => tokens.theme.foregroundSecondary};
    border-radius: ${({ borderRadius }) => borderRadius[4]};
  }
`;
var __decorate$7 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mPayHeader = class W3mPayHeader2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.paymentAsset = PayController.state.paymentAsset;
    this.amount = PayController.state.amount;
    this.unsubscribe.push(PayController.subscribeKey("paymentAsset", (val) => {
      this.paymentAsset = val;
    }), PayController.subscribeKey("amount", (val) => {
      this.amount = val;
    }));
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
  }
  render() {
    const allNetworks = ChainController.getAllRequestedCaipNetworks();
    const targetNetwork = allNetworks.find((net) => net.caipNetworkId === this.paymentAsset.network);
    return x`<wui-flex
      alignItems="center"
      gap="1"
      .padding=${["1", "2", "1", "1"]}
      class="transfers-badge"
    >
      <wui-image src=${o(this.paymentAsset.metadata.logoURI)} size="xl"></wui-image>
      <wui-text variant="lg-regular" color="primary">
        ${this.amount} ${this.paymentAsset.metadata.symbol}
      </wui-text>
      <wui-text variant="sm-regular" color="secondary">
        on ${targetNetwork?.name ?? "Unknown"}
      </wui-text>
    </wui-flex>`;
  }
};
W3mPayHeader.styles = [styles$7];
__decorate$7([
  n()
], W3mPayHeader.prototype, "paymentAsset", void 0);
__decorate$7([
  n()
], W3mPayHeader.prototype, "amount", void 0);
W3mPayHeader = __decorate$7([
  customElement("w3m-pay-header")
], W3mPayHeader);
const styles$6 = css`
  :host {
    height: 60px;
  }

  :host > wui-flex {
    box-sizing: border-box;
    background-color: var(--local-header-background-color);
  }

  wui-text {
    background-color: var(--local-header-background-color);
  }

  wui-flex.w3m-header-title {
    transform: translateY(0);
    opacity: 1;
  }

  wui-flex.w3m-header-title[view-direction='prev'] {
    animation:
      slide-down-out 120ms forwards ${({ easings }) => easings["ease-out-power-2"]},
      slide-down-in 120ms forwards ${({ easings }) => easings["ease-out-power-2"]};
    animation-delay: 0ms, 200ms;
  }

  wui-flex.w3m-header-title[view-direction='next'] {
    animation:
      slide-up-out 120ms forwards ${({ easings }) => easings["ease-out-power-2"]},
      slide-up-in 120ms forwards ${({ easings }) => easings["ease-out-power-2"]};
    animation-delay: 0ms, 200ms;
  }

  wui-icon-button[data-hidden='true'] {
    opacity: 0 !important;
    pointer-events: none;
  }

  @keyframes slide-up-out {
    from {
      transform: translateY(0px);
      opacity: 1;
    }
    to {
      transform: translateY(3px);
      opacity: 0;
    }
  }

  @keyframes slide-up-in {
    from {
      transform: translateY(-3px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @keyframes slide-down-out {
    from {
      transform: translateY(0px);
      opacity: 1;
    }
    to {
      transform: translateY(-3px);
      opacity: 0;
    }
  }

  @keyframes slide-down-in {
    from {
      transform: translateY(3px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;
var __decorate$6 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
const BETA_SCREENS = ["SmartSessionList"];
const BACKGROUND_OVERRIDES = {
  PayWithExchange: vars.tokens.theme.foregroundPrimary
};
function headings() {
  const connectorName = RouterController.state.data?.connector?.name;
  const walletName = RouterController.state.data?.wallet?.name;
  const networkName = RouterController.state.data?.network?.name;
  const name = walletName ?? connectorName;
  const connectors = ConnectorController.getConnectors();
  const isEmail = connectors.length === 1 && connectors[0]?.id === "w3m-email";
  const socialProvider = ChainController.getAccountData()?.socialProvider;
  const socialTitle = socialProvider ? socialProvider.charAt(0).toUpperCase() + socialProvider.slice(1) : "Connect Social";
  return {
    Connect: `Connect ${isEmail ? "Email" : ""} Wallet`,
    Create: "Create Wallet",
    ChooseAccountName: void 0,
    Account: void 0,
    AccountSettings: void 0,
    AllWallets: "All Wallets",
    ApproveTransaction: "Approve Transaction",
    BuyInProgress: "Buy",
    UsageExceeded: "Usage Exceeded",
    ConnectingExternal: name ?? "Connect Wallet",
    ConnectingWalletConnect: name ?? "WalletConnect",
    ConnectingWalletConnectBasic: "WalletConnect",
    ConnectingSiwe: "Sign In",
    Convert: "Convert",
    ConvertSelectToken: "Select token",
    ConvertPreview: "Preview Convert",
    Downloads: name ? `Get ${name}` : "Downloads",
    EmailLogin: "Email Login",
    EmailVerifyOtp: "Confirm Email",
    EmailVerifyDevice: "Register Device",
    GetWallet: "Get a Wallet",
    Networks: "Choose Network",
    OnRampProviders: "Choose Provider",
    OnRampActivity: "Activity",
    OnRampTokenSelect: "Select Token",
    OnRampFiatSelect: "Select Currency",
    Pay: "How you pay",
    ProfileWallets: "Wallets",
    SwitchNetwork: networkName ?? "Switch Network",
    Transactions: "Activity",
    UnsupportedChain: "Switch Network",
    UpgradeEmailWallet: "Upgrade Your Wallet",
    UpdateEmailWallet: "Edit Email",
    UpdateEmailPrimaryOtp: "Confirm Current Email",
    UpdateEmailSecondaryOtp: "Confirm New Email",
    WhatIsABuy: "What is Buy?",
    RegisterAccountName: "Choose Name",
    RegisterAccountNameSuccess: "",
    WalletReceive: "Receive",
    WalletCompatibleNetworks: "Compatible Networks",
    Swap: "Swap",
    SwapSelectToken: "Select Token",
    SwapPreview: "Preview Swap",
    WalletSend: "Send",
    WalletSendPreview: "Review Send",
    WalletSendSelectToken: "Select Token",
    WalletSendConfirmed: "Confirmed",
    WhatIsANetwork: "What is a network?",
    WhatIsAWallet: "What is a Wallet?",
    ConnectWallets: "Connect Wallet",
    ConnectSocials: "All Socials",
    ConnectingSocial: socialTitle,
    ConnectingMultiChain: "Select Chain",
    ConnectingFarcaster: "Farcaster",
    SwitchActiveChain: "Switch Chain",
    SmartSessionCreated: void 0,
    SmartSessionList: "Smart Sessions",
    SIWXSignMessage: "Sign In",
    PayLoading: "Processing payment...",
    PayQuote: "Payment Quote",
    DataCapture: "Profile",
    DataCaptureOtpConfirm: "Confirm Email",
    FundWallet: "Fund Wallet",
    PayWithExchange: "Deposit from Exchange",
    PayWithExchangeSelectAsset: "Select Asset",
    SmartAccountSettings: "Smart Account Settings"
  };
}
let W3mHeader = class W3mHeader2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.heading = headings()[RouterController.state.view];
    this.network = ChainController.state.activeCaipNetwork;
    this.networkImage = AssetUtil.getNetworkImage(this.network);
    this.showBack = false;
    this.prevHistoryLength = 1;
    this.view = RouterController.state.view;
    this.viewDirection = "";
    this.unsubscribe.push(AssetController.subscribeNetworkImages(() => {
      this.networkImage = AssetUtil.getNetworkImage(this.network);
    }), RouterController.subscribeKey("view", (val) => {
      setTimeout(() => {
        this.view = val;
        this.heading = headings()[val];
      }, ConstantsUtil.ANIMATION_DURATIONS.HeaderText);
      this.onViewChange();
      this.onHistoryChange();
    }), ChainController.subscribeKey("activeCaipNetwork", (val) => {
      this.network = val;
      this.networkImage = AssetUtil.getNetworkImage(this.network);
    }));
  }
  disconnectCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
  }
  render() {
    const backgroundColor = BACKGROUND_OVERRIDES[RouterController.state.view] ?? vars.tokens.theme.backgroundPrimary;
    this.style.setProperty("--local-header-background-color", backgroundColor);
    return x`
      <wui-flex
        .padding=${["0", "4", "0", "4"]}
        justifyContent="space-between"
        alignItems="center"
      >
        ${this.leftHeaderTemplate()} ${this.titleTemplate()} ${this.rightHeaderTemplate()}
      </wui-flex>
    `;
  }
  onWalletHelp() {
    EventsController.sendEvent({ type: "track", event: "CLICK_WALLET_HELP" });
    RouterController.push("WhatIsAWallet");
  }
  async onClose() {
    await ModalUtil.safeClose();
  }
  rightHeaderTemplate() {
    const isSmartSessionsEnabled = OptionsController?.state?.features?.smartSessions;
    if (RouterController.state.view !== "Account" || !isSmartSessionsEnabled) {
      return this.closeButtonTemplate();
    }
    return x`<wui-flex>
      <wui-icon-button
        icon="clock"
        size="lg"
        iconSize="lg"
        type="neutral"
        variant="primary"
        @click=${() => RouterController.push("SmartSessionList")}
        data-testid="w3m-header-smart-sessions"
      ></wui-icon-button>
      ${this.closeButtonTemplate()}
    </wui-flex> `;
  }
  closeButtonTemplate() {
    return x`
      <wui-icon-button
        icon="close"
        size="lg"
        type="neutral"
        variant="primary"
        iconSize="lg"
        @click=${this.onClose.bind(this)}
        data-testid="w3m-header-close"
      ></wui-icon-button>
    `;
  }
  titleTemplate() {
    if (this.view === "PayQuote") {
      return x`<w3m-pay-header></w3m-pay-header>`;
    }
    const isBeta = BETA_SCREENS.includes(this.view);
    return x`
      <wui-flex
        view-direction="${this.viewDirection}"
        class="w3m-header-title"
        alignItems="center"
        gap="2"
      >
        <wui-text
          display="inline"
          variant="lg-regular"
          color="primary"
          data-testid="w3m-header-text"
        >
          ${this.heading}
        </wui-text>
        ${isBeta ? x`<wui-tag variant="accent" size="md">Beta</wui-tag>` : null}
      </wui-flex>
    `;
  }
  leftHeaderTemplate() {
    const { view } = RouterController.state;
    const isConnectHelp = view === "Connect";
    const isEmbeddedEnable = OptionsController.state.enableEmbedded;
    const isApproveTransaction = view === "ApproveTransaction";
    const isConnectingSIWEView = view === "ConnectingSiwe";
    const isAccountView = view === "Account";
    const enableNetworkSwitch = OptionsController.state.enableNetworkSwitch;
    const shouldHideBack = isApproveTransaction || isConnectingSIWEView || isConnectHelp && isEmbeddedEnable;
    if (isAccountView && enableNetworkSwitch) {
      return x`<wui-select
        id="dynamic"
        data-testid="w3m-account-select-network"
        active-network=${o(this.network?.name)}
        @click=${this.onNetworks.bind(this)}
        imageSrc=${o(this.networkImage)}
      ></wui-select>`;
    }
    if (this.showBack && !shouldHideBack) {
      return x`<wui-icon-button
        data-testid="header-back"
        id="dynamic"
        icon="chevronLeft"
        size="lg"
        iconSize="lg"
        type="neutral"
        variant="primary"
        @click=${this.onGoBack.bind(this)}
      ></wui-icon-button>`;
    }
    return x`<wui-icon-button
      data-hidden=${!isConnectHelp}
      id="dynamic"
      icon="helpCircle"
      size="lg"
      iconSize="lg"
      type="neutral"
      variant="primary"
      @click=${this.onWalletHelp.bind(this)}
    ></wui-icon-button>`;
  }
  onNetworks() {
    if (this.isAllowedNetworkSwitch()) {
      EventsController.sendEvent({ type: "track", event: "CLICK_NETWORKS" });
      RouterController.push("Networks");
    }
  }
  isAllowedNetworkSwitch() {
    const requestedCaipNetworks = ChainController.getAllRequestedCaipNetworks();
    const isMultiNetwork = requestedCaipNetworks ? requestedCaipNetworks.length > 1 : false;
    const isValidNetwork = requestedCaipNetworks?.find(({ id }) => id === this.network?.id);
    return isMultiNetwork || !isValidNetwork;
  }
  onViewChange() {
    const { history } = RouterController.state;
    let direction = ConstantsUtil.VIEW_DIRECTION.Next;
    if (history.length < this.prevHistoryLength) {
      direction = ConstantsUtil.VIEW_DIRECTION.Prev;
    }
    this.prevHistoryLength = history.length;
    this.viewDirection = direction;
  }
  async onHistoryChange() {
    const { history } = RouterController.state;
    const buttonEl = this.shadowRoot?.querySelector("#dynamic");
    if (history.length > 1 && !this.showBack && buttonEl) {
      await buttonEl.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 200,
        fill: "forwards",
        easing: "ease"
      }).finished;
      this.showBack = true;
      buttonEl.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 200,
        fill: "forwards",
        easing: "ease"
      });
    } else if (history.length <= 1 && this.showBack && buttonEl) {
      await buttonEl.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 200,
        fill: "forwards",
        easing: "ease"
      }).finished;
      this.showBack = false;
      buttonEl.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 200,
        fill: "forwards",
        easing: "ease"
      });
    }
  }
  onGoBack() {
    RouterController.goBack();
  }
};
W3mHeader.styles = styles$6;
__decorate$6([
  r()
], W3mHeader.prototype, "heading", void 0);
__decorate$6([
  r()
], W3mHeader.prototype, "network", void 0);
__decorate$6([
  r()
], W3mHeader.prototype, "networkImage", void 0);
__decorate$6([
  r()
], W3mHeader.prototype, "showBack", void 0);
__decorate$6([
  r()
], W3mHeader.prototype, "prevHistoryLength", void 0);
__decorate$6([
  r()
], W3mHeader.prototype, "view", void 0);
__decorate$6([
  r()
], W3mHeader.prototype, "viewDirection", void 0);
W3mHeader = __decorate$6([
  customElement("w3m-header")
], W3mHeader);
const styles$5 = css`
  :host {
    display: flex;
    align-items: center;
    gap: ${({ spacing }) => spacing[1]};
    padding: ${({ spacing }) => spacing[2]} ${({ spacing }) => spacing[3]}
      ${({ spacing }) => spacing[2]} ${({ spacing }) => spacing[2]};
    border-radius: ${({ borderRadius }) => borderRadius[20]};
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
    box-shadow:
      0px 0px 8px 0px rgba(0, 0, 0, 0.1),
      inset 0 0 0 1px ${({ tokens }) => tokens.theme.borderPrimary};
    max-width: 320px;
  }

  wui-icon-box {
    border-radius: ${({ borderRadius }) => borderRadius.round} !important;
    overflow: hidden;
  }

  wui-loading-spinner {
    padding: ${({ spacing }) => spacing[1]};
    background-color: ${({ tokens }) => tokens.core.foregroundAccent010};
    border-radius: ${({ borderRadius }) => borderRadius.round} !important;
  }
`;
var __decorate$5 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let WuiSnackbar = class WuiSnackbar2 extends i {
  constructor() {
    super(...arguments);
    this.message = "";
    this.variant = "success";
  }
  render() {
    return x`
      ${this.templateIcon()}
      <wui-text variant="lg-regular" color="primary" data-testid="wui-snackbar-message"
        >${this.message}</wui-text
      >
    `;
  }
  templateIcon() {
    const COLOR = {
      success: "success",
      error: "error",
      warning: "warning",
      info: "default"
    };
    const ICON = {
      success: "checkmark",
      error: "warning",
      warning: "warningCircle",
      info: "info"
    };
    if (this.variant === "loading") {
      return x`<wui-loading-spinner size="md" color="accent-primary"></wui-loading-spinner>`;
    }
    return x`<wui-icon-box
      size="md"
      color=${COLOR[this.variant]}
      icon=${ICON[this.variant]}
    ></wui-icon-box>`;
  }
};
WuiSnackbar.styles = [resetStyles, styles$5];
__decorate$5([
  n()
], WuiSnackbar.prototype, "message", void 0);
__decorate$5([
  n()
], WuiSnackbar.prototype, "variant", void 0);
WuiSnackbar = __decorate$5([
  customElement("wui-snackbar")
], WuiSnackbar);
const styles$4 = i$1`
  :host {
    display: block;
    position: absolute;
    opacity: 0;
    pointer-events: none;
    top: 11px;
    left: 50%;
    width: max-content;
  }
`;
var __decorate$4 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mSnackBar = class W3mSnackBar2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.timeout = void 0;
    this.open = SnackController.state.open;
    this.unsubscribe.push(SnackController.subscribeKey("open", (val) => {
      this.open = val;
      this.onOpen();
    }));
  }
  disconnectedCallback() {
    clearTimeout(this.timeout);
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
  }
  render() {
    const { message, variant } = SnackController.state;
    return x` <wui-snackbar message=${message} variant=${variant}></wui-snackbar> `;
  }
  onOpen() {
    clearTimeout(this.timeout);
    if (this.open) {
      this.animate([
        { opacity: 0, transform: "translateX(-50%) scale(0.85)" },
        { opacity: 1, transform: "translateX(-50%) scale(1)" }
      ], {
        duration: 150,
        fill: "forwards",
        easing: "ease"
      });
      if (this.timeout) {
        clearTimeout(this.timeout);
      }
      if (SnackController.state.autoClose) {
        this.timeout = setTimeout(() => SnackController.hide(), 2500);
      }
    } else {
      this.animate([
        { opacity: 1, transform: "translateX(-50%) scale(1)" },
        { opacity: 0, transform: "translateX(-50%) scale(0.85)" }
      ], {
        duration: 150,
        fill: "forwards",
        easing: "ease"
      });
    }
  }
};
W3mSnackBar.styles = styles$4;
__decorate$4([
  r()
], W3mSnackBar.prototype, "open", void 0);
W3mSnackBar = __decorate$4([
  customElement("w3m-snackbar")
], W3mSnackBar);
const styles$3 = css`
  :host {
    z-index: ${({ tokens }) => tokens.core.zIndex};
    display: block;
    backface-visibility: hidden;
    will-change: opacity;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    opacity: 0;
    background-color: ${({ tokens }) => tokens.theme.overlay};
    backdrop-filter: blur(0px);
    transition:
      opacity ${({ durations }) => durations["lg"]} ${({ easings }) => easings["ease-out-power-2"]},
      backdrop-filter ${({ durations }) => durations["lg"]}
        ${({ easings }) => easings["ease-out-power-2"]};
    will-change: opacity;
  }

  :host(.open) {
    opacity: 1;
    backdrop-filter: blur(8px);
  }

  :host(.appkit-modal) {
    position: relative;
    pointer-events: unset;
    background: none;
    width: 100%;
    opacity: 1;
  }

  wui-card {
    max-width: var(--apkt-modal-width);
    width: 100%;
    position: relative;
    outline: none;
    transform: translateY(4px);
    box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.05);
    transition:
      transform ${({ durations }) => durations["lg"]}
        ${({ easings }) => easings["ease-out-power-2"]},
      border-radius ${({ durations }) => durations["lg"]}
        ${({ easings }) => easings["ease-out-power-1"]},
      background-color ${({ durations }) => durations["lg"]}
        ${({ easings }) => easings["ease-out-power-1"]},
      box-shadow ${({ durations }) => durations["lg"]}
        ${({ easings }) => easings["ease-out-power-1"]};
    will-change: border-radius, background-color, transform, box-shadow;
    background-color: ${({ tokens }) => tokens.theme.backgroundPrimary};
    padding: var(--local-modal-padding);
    box-sizing: border-box;
  }

  :host(.open) wui-card {
    transform: translateY(0px);
  }

  wui-card::before {
    z-index: 1;
    pointer-events: none;
    content: '';
    position: absolute;
    inset: 0;
    border-radius: clamp(0px, var(--apkt-borderRadius-8), 44px);
    transition: box-shadow ${({ durations }) => durations["lg"]}
      ${({ easings }) => easings["ease-out-power-2"]};
    transition-delay: ${({ durations }) => durations["md"]};
    will-change: box-shadow;
  }

  :host([data-mobile-fullscreen='true']) wui-card::before {
    border-radius: 0px;
  }

  :host([data-border='true']) wui-card::before {
    box-shadow: inset 0px 0px 0px 4px ${({ tokens }) => tokens.theme.foregroundSecondary};
  }

  :host([data-border='false']) wui-card::before {
    box-shadow: inset 0px 0px 0px 1px ${({ tokens }) => tokens.theme.borderPrimaryDark};
  }

  :host([data-border='true']) wui-card {
    animation:
      fade-in ${({ durations }) => durations["lg"]} ${({ easings }) => easings["ease-out-power-2"]},
      card-background-border var(--apkt-duration-dynamic)
        ${({ easings }) => easings["ease-out-power-2"]};
    animation-fill-mode: backwards, both;
    animation-delay: var(--apkt-duration-dynamic);
  }

  :host([data-border='false']) wui-card {
    animation:
      fade-in ${({ durations }) => durations["lg"]} ${({ easings }) => easings["ease-out-power-2"]},
      card-background-default var(--apkt-duration-dynamic)
        ${({ easings }) => easings["ease-out-power-2"]};
    animation-fill-mode: backwards, both;
    animation-delay: 0s;
  }

  :host(.appkit-modal) wui-card {
    max-width: var(--apkt-modal-width);
  }

  wui-card[shake='true'] {
    animation:
      fade-in ${({ durations }) => durations["lg"]} ${({ easings }) => easings["ease-out-power-2"]},
      w3m-shake ${({ durations }) => durations["xl"]}
        ${({ easings }) => easings["ease-out-power-2"]};
  }

  wui-flex {
    overflow-x: hidden;
    overflow-y: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  @media (max-height: 700px) and (min-width: 431px) {
    wui-flex {
      align-items: flex-start;
    }

    wui-card {
      margin: var(--apkt-spacing-6) 0px;
    }
  }

  @media (max-width: 430px) {
    :host([data-mobile-fullscreen='true']) {
      height: 100dvh;
    }
    :host([data-mobile-fullscreen='true']) wui-flex {
      align-items: stretch;
    }
    :host([data-mobile-fullscreen='true']) wui-card {
      max-width: 100%;
      height: 100%;
      border-radius: 0;
      border: none;
    }
    :host(:not([data-mobile-fullscreen='true'])) wui-flex {
      align-items: flex-end;
    }

    :host(:not([data-mobile-fullscreen='true'])) wui-card {
      max-width: 100%;
      border-bottom: none;
    }

    :host(:not([data-mobile-fullscreen='true'])) wui-card[data-embedded='true'] {
      border-bottom-left-radius: clamp(0px, var(--apkt-borderRadius-8), 44px);
      border-bottom-right-radius: clamp(0px, var(--apkt-borderRadius-8), 44px);
    }

    :host(:not([data-mobile-fullscreen='true'])) wui-card:not([data-embedded='true']) {
      border-bottom-left-radius: 0px;
      border-bottom-right-radius: 0px;
    }

    wui-card[shake='true'] {
      animation: w3m-shake 0.5s ${({ easings }) => easings["ease-out-power-2"]};
    }
  }

  @keyframes fade-in {
    0% {
      transform: scale(0.99) translateY(4px);
    }
    100% {
      transform: scale(1) translateY(0);
    }
  }

  @keyframes w3m-shake {
    0% {
      transform: scale(1) rotate(0deg);
    }
    20% {
      transform: scale(1) rotate(-1deg);
    }
    40% {
      transform: scale(1) rotate(1.5deg);
    }
    60% {
      transform: scale(1) rotate(-1.5deg);
    }
    80% {
      transform: scale(1) rotate(1deg);
    }
    100% {
      transform: scale(1) rotate(0deg);
    }
  }

  @keyframes card-background-border {
    from {
      background-color: ${({ tokens }) => tokens.theme.backgroundPrimary};
    }
    to {
      background-color: ${({ tokens }) => tokens.theme.foregroundSecondary};
    }
  }

  @keyframes card-background-default {
    from {
      background-color: ${({ tokens }) => tokens.theme.foregroundSecondary};
    }
    to {
      background-color: ${({ tokens }) => tokens.theme.backgroundPrimary};
    }
  }
`;
var __decorate$3 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
const SCROLL_LOCK = "scroll-lock";
const PADDING_OVERRIDES = {
  PayWithExchange: "0",
  PayWithExchangeSelectAsset: "0",
  Pay: "0",
  PayQuote: "0",
  PayLoading: "0"
};
class W3mModalBase extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.abortController = void 0;
    this.hasPrefetched = false;
    this.enableEmbedded = OptionsController.state.enableEmbedded;
    this.open = ModalController.state.open;
    this.caipAddress = ChainController.state.activeCaipAddress;
    this.caipNetwork = ChainController.state.activeCaipNetwork;
    this.shake = ModalController.state.shake;
    this.filterByNamespace = ConnectorController.state.filterByNamespace;
    this.padding = vars.spacing[1];
    this.mobileFullScreen = OptionsController.state.enableMobileFullScreen;
    this.initializeTheming();
    ApiController.prefetchAnalyticsConfig();
    this.unsubscribe.push(...[
      ModalController.subscribeKey("open", (val) => val ? this.onOpen() : this.onClose()),
      ModalController.subscribeKey("shake", (val) => this.shake = val),
      ChainController.subscribeKey("activeCaipNetwork", (val) => this.onNewNetwork(val)),
      ChainController.subscribeKey("activeCaipAddress", (val) => this.onNewAddress(val)),
      OptionsController.subscribeKey("enableEmbedded", (val) => this.enableEmbedded = val),
      ConnectorController.subscribeKey("filterByNamespace", (val) => {
        if (this.filterByNamespace !== val && !ChainController.getAccountData(val)?.caipAddress) {
          ApiController.fetchRecommendedWallets();
          this.filterByNamespace = val;
        }
      }),
      RouterController.subscribeKey("view", () => {
        this.dataset["border"] = HelpersUtil.hasFooter() ? "true" : "false";
        this.padding = PADDING_OVERRIDES[RouterController.state.view] ?? vars.spacing[1];
      })
    ]);
  }
  firstUpdated() {
    this.dataset["border"] = HelpersUtil.hasFooter() ? "true" : "false";
    if (this.mobileFullScreen) {
      this.setAttribute("data-mobile-fullscreen", "true");
    }
    if (this.caipAddress) {
      if (this.enableEmbedded) {
        ModalController.close();
        this.prefetch();
        return;
      }
      this.onNewAddress(this.caipAddress);
    }
    if (this.open) {
      this.onOpen();
    }
    if (this.enableEmbedded) {
      this.prefetch();
    }
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.onRemoveKeyboardListener();
  }
  render() {
    this.style.setProperty("--local-modal-padding", this.padding);
    if (this.enableEmbedded) {
      return x`${this.contentTemplate()}
        <w3m-tooltip></w3m-tooltip> `;
    }
    return this.open ? x`
          <wui-flex @click=${this.onOverlayClick.bind(this)} data-testid="w3m-modal-overlay">
            ${this.contentTemplate()}
          </wui-flex>
          <w3m-tooltip></w3m-tooltip>
        ` : null;
  }
  contentTemplate() {
    return x` <wui-card
      shake="${this.shake}"
      data-embedded="${o(this.enableEmbedded)}"
      role="alertdialog"
      aria-modal="true"
      tabindex="0"
      data-testid="w3m-modal-card"
    >
      <w3m-header></w3m-header>
      <w3m-router></w3m-router>
      <w3m-footer></w3m-footer>
      <w3m-snackbar></w3m-snackbar>
      <w3m-alertbar></w3m-alertbar>
    </wui-card>`;
  }
  async onOverlayClick(event) {
    if (event.target === event.currentTarget) {
      if (this.mobileFullScreen) {
        return;
      }
      await this.handleClose();
    }
  }
  async handleClose() {
    await ModalUtil.safeClose();
  }
  initializeTheming() {
    const { themeVariables, themeMode } = ThemeController.state;
    const defaultThemeMode = UiHelperUtil.getColorTheme(themeMode);
    initializeTheming(themeVariables, defaultThemeMode);
  }
  onClose() {
    this.open = false;
    this.classList.remove("open");
    this.onScrollUnlock();
    SnackController.hide();
    this.onRemoveKeyboardListener();
  }
  onOpen() {
    this.open = true;
    this.classList.add("open");
    this.onScrollLock();
    this.onAddKeyboardListener();
  }
  onScrollLock() {
    const styleTag = document.createElement("style");
    styleTag.dataset["w3m"] = SCROLL_LOCK;
    styleTag.textContent = `
      body {
        touch-action: none;
        overflow: hidden;
        overscroll-behavior: contain;
      }
      w3m-modal {
        pointer-events: auto;
      }
    `;
    document.head.appendChild(styleTag);
  }
  onScrollUnlock() {
    const styleTag = document.head.querySelector(`style[data-w3m="${SCROLL_LOCK}"]`);
    if (styleTag) {
      styleTag.remove();
    }
  }
  onAddKeyboardListener() {
    this.abortController = new AbortController();
    const card = this.shadowRoot?.querySelector("wui-card");
    card?.focus();
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        this.handleClose();
      } else if (event.key === "Tab") {
        const { tagName } = event.target;
        if (tagName && !tagName.includes("W3M-") && !tagName.includes("WUI-")) {
          card?.focus();
        }
      }
    }, this.abortController);
  }
  onRemoveKeyboardListener() {
    this.abortController?.abort();
    this.abortController = void 0;
  }
  async onNewAddress(caipAddress) {
    const isSwitchingNamespace = ChainController.state.isSwitchingNamespace;
    const isInProfileView = RouterController.state.view === "ProfileWallets";
    const shouldClose = !caipAddress && !isSwitchingNamespace && !isInProfileView;
    if (shouldClose) {
      ModalController.close();
    }
    await SIWXUtil.initializeIfEnabled(caipAddress);
    this.caipAddress = caipAddress;
    ChainController.setIsSwitchingNamespace(false);
  }
  onNewNetwork(nextCaipNetwork) {
    const prevCaipNetwork = this.caipNetwork;
    const prevCaipNetworkId = prevCaipNetwork?.caipNetworkId?.toString();
    const nextNetworkId = nextCaipNetwork?.caipNetworkId?.toString();
    const didNetworkChange = prevCaipNetworkId !== nextNetworkId;
    const isUnsupportedNetworkScreen = RouterController.state.view === "UnsupportedChain";
    const isModalOpen = ModalController.state.open;
    let shouldGoBack = false;
    if (this.enableEmbedded && RouterController.state.view === "SwitchNetwork") {
      shouldGoBack = true;
    }
    if (didNetworkChange) {
      SwapController.resetState();
    }
    if (isModalOpen && isUnsupportedNetworkScreen) {
      shouldGoBack = true;
    }
    if (shouldGoBack && RouterController.state.view !== "SIWXSignMessage") {
      RouterController.goBack();
    }
    this.caipNetwork = nextCaipNetwork;
  }
  prefetch() {
    if (!this.hasPrefetched) {
      ApiController.prefetch();
      ApiController.fetchWalletsByPage({ page: 1 });
      this.hasPrefetched = true;
    }
  }
}
W3mModalBase.styles = styles$3;
__decorate$3([
  n({ type: Boolean })
], W3mModalBase.prototype, "enableEmbedded", void 0);
__decorate$3([
  r()
], W3mModalBase.prototype, "open", void 0);
__decorate$3([
  r()
], W3mModalBase.prototype, "caipAddress", void 0);
__decorate$3([
  r()
], W3mModalBase.prototype, "caipNetwork", void 0);
__decorate$3([
  r()
], W3mModalBase.prototype, "shake", void 0);
__decorate$3([
  r()
], W3mModalBase.prototype, "filterByNamespace", void 0);
__decorate$3([
  r()
], W3mModalBase.prototype, "padding", void 0);
__decorate$3([
  r()
], W3mModalBase.prototype, "mobileFullScreen", void 0);
let W3mModal = class W3mModal2 extends W3mModalBase {
};
W3mModal = __decorate$3([
  customElement("w3m-modal")
], W3mModal);
let AppKitModal = class AppKitModal2 extends W3mModalBase {
};
AppKitModal = __decorate$3([
  customElement("appkit-modal")
], AppKitModal);
const styles$2 = css`
  .icon-box {
    width: 64px;
    height: 64px;
    border-radius: ${({ borderRadius }) => borderRadius[5]};
    background-color: ${({ colors }) => colors.semanticError010};
  }
`;
var __decorate$2 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mUsageExceededView = class W3mUsageExceededView2 extends i {
  constructor() {
    super();
  }
  render() {
    return x`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        gap="4"
        .padding="${["1", "3", "4", "3"]}"
      >
        <wui-flex justifyContent="center" alignItems="center" class="icon-box">
          <wui-icon size="xxl" color="error" name="warningCircle"></wui-icon>
        </wui-flex>

        <wui-text variant="lg-medium" color="primary" align="center">
          The app isn't responding as expected
        </wui-text>
        <wui-text variant="md-regular" color="secondary" align="center">
          Try again or reach out to the app team for help.
        </wui-text>

        <wui-button
          variant="neutral-secondary"
          size="md"
          @click=${this.onTryAgainClick.bind(this)}
          data-testid="w3m-usage-exceeded-button"
        >
          <wui-icon color="inherit" slot="iconLeft" name="refresh"></wui-icon>
          Try Again
        </wui-button>
      </wui-flex>
    `;
  }
  onTryAgainClick() {
    RouterController.goBack();
  }
};
W3mUsageExceededView.styles = styles$2;
W3mUsageExceededView = __decorate$2([
  customElement("w3m-usage-exceeded-view")
], W3mUsageExceededView);
const styles$1 = css`
  :host {
    width: 100%;
  }
`;
var __decorate$1 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mListWallet = class W3mListWallet2 extends i {
  constructor() {
    super(...arguments);
    this.hasImpressionSent = false;
    this.walletImages = [];
    this.imageSrc = "";
    this.name = "";
    this.size = "md";
    this.tabIdx = void 0;
    this.disabled = false;
    this.showAllWallets = false;
    this.loading = false;
    this.loadingSpinnerColor = "accent-100";
    this.rdnsId = "";
    this.displayIndex = void 0;
    this.walletRank = void 0;
    this.namespaces = [];
  }
  connectedCallback() {
    super.connectedCallback();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.cleanupIntersectionObserver();
  }
  updated(changedProperties) {
    super.updated(changedProperties);
    if (changedProperties.has("name") || changedProperties.has("imageSrc") || changedProperties.has("walletRank")) {
      this.hasImpressionSent = false;
    }
    const hasWalletRankChanged = changedProperties.has("walletRank") && this.walletRank;
    if (hasWalletRankChanged && !this.intersectionObserver) {
      this.setupIntersectionObserver();
    }
  }
  setupIntersectionObserver() {
    this.intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !this.loading && !this.hasImpressionSent) {
          this.sendImpressionEvent();
        }
      });
    }, { threshold: 0.1 });
    this.intersectionObserver.observe(this);
  }
  cleanupIntersectionObserver() {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = void 0;
    }
  }
  sendImpressionEvent() {
    if (!this.name || this.hasImpressionSent || !this.walletRank) {
      return;
    }
    this.hasImpressionSent = true;
    if (this.rdnsId || this.name) {
      EventsController.sendWalletImpressionEvent({
        name: this.name,
        walletRank: this.walletRank,
        rdnsId: this.rdnsId,
        view: RouterController.state.view,
        displayIndex: this.displayIndex
      });
    }
  }
  handleGetWalletNamespaces() {
    const isMultiChain = Object.keys(AdapterController.state.adapters).length > 1;
    if (isMultiChain) {
      return this.namespaces;
    }
    return [];
  }
  render() {
    return x`
      <wui-list-wallet
        .walletImages=${this.walletImages}
        imageSrc=${o(this.imageSrc)}
        name=${this.name}
        size=${o(this.size)}
        tagLabel=${o(this.tagLabel)}
        .tagVariant=${this.tagVariant}
        .walletIcon=${this.walletIcon}
        .tabIdx=${this.tabIdx}
        .disabled=${this.disabled}
        .showAllWallets=${this.showAllWallets}
        .loading=${this.loading}
        loadingSpinnerColor=${this.loadingSpinnerColor}
        .namespaces=${this.handleGetWalletNamespaces()}
      ></wui-list-wallet>
    `;
  }
};
W3mListWallet.styles = styles$1;
__decorate$1([
  n({ type: Array })
], W3mListWallet.prototype, "walletImages", void 0);
__decorate$1([
  n()
], W3mListWallet.prototype, "imageSrc", void 0);
__decorate$1([
  n()
], W3mListWallet.prototype, "name", void 0);
__decorate$1([
  n()
], W3mListWallet.prototype, "size", void 0);
__decorate$1([
  n()
], W3mListWallet.prototype, "tagLabel", void 0);
__decorate$1([
  n()
], W3mListWallet.prototype, "tagVariant", void 0);
__decorate$1([
  n()
], W3mListWallet.prototype, "walletIcon", void 0);
__decorate$1([
  n()
], W3mListWallet.prototype, "tabIdx", void 0);
__decorate$1([
  n({ type: Boolean })
], W3mListWallet.prototype, "disabled", void 0);
__decorate$1([
  n({ type: Boolean })
], W3mListWallet.prototype, "showAllWallets", void 0);
__decorate$1([
  n({ type: Boolean })
], W3mListWallet.prototype, "loading", void 0);
__decorate$1([
  n({ type: String })
], W3mListWallet.prototype, "loadingSpinnerColor", void 0);
__decorate$1([
  n()
], W3mListWallet.prototype, "rdnsId", void 0);
__decorate$1([
  n()
], W3mListWallet.prototype, "displayIndex", void 0);
__decorate$1([
  n()
], W3mListWallet.prototype, "walletRank", void 0);
__decorate$1([
  n({ type: Array })
], W3mListWallet.prototype, "namespaces", void 0);
W3mListWallet = __decorate$1([
  customElement("w3m-list-wallet")
], W3mListWallet);
const styles = css`
  :host {
    --local-duration-height: 0s;
    --local-duration: ${({ durations }) => durations["lg"]};
    --local-transition: ${({ easings }) => easings["ease-out-power-2"]};
  }

  .container {
    display: block;
    overflow: hidden;
    overflow: hidden;
    position: relative;
    height: var(--local-container-height);
    transition: height var(--local-duration-height) var(--local-transition);
    will-change: height, padding-bottom;
  }

  .container[data-mobile-fullscreen='true'] {
    overflow: scroll;
  }

  .page {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    width: 100%;
    height: auto;
    width: inherit;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    background-color: ${({ tokens }) => tokens.theme.backgroundPrimary};
    border-bottom-left-radius: var(--local-border-bottom-radius);
    border-bottom-right-radius: var(--local-border-bottom-radius);
    transition: border-bottom-left-radius var(--local-duration) var(--local-transition);
  }

  .page[data-mobile-fullscreen='true'] {
    height: 100%;
  }

  .page-content {
    display: flex;
    flex-direction: column;
    min-height: 100%;
  }

  .footer {
    height: var(--apkt-footer-height);
  }

  div.page[view-direction^='prev-'] .page-content {
    animation:
      slide-left-out var(--local-duration) forwards var(--local-transition),
      slide-left-in var(--local-duration) forwards var(--local-transition);
    animation-delay: 0ms, var(--local-duration, ${({ durations }) => durations["lg"]});
  }

  div.page[view-direction^='next-'] .page-content {
    animation:
      slide-right-out var(--local-duration) forwards var(--local-transition),
      slide-right-in var(--local-duration) forwards var(--local-transition);
    animation-delay: 0ms, var(--local-duration, ${({ durations }) => durations["lg"]});
  }

  @keyframes slide-left-out {
    from {
      transform: translateX(0px) scale(1);
      opacity: 1;
      filter: blur(0px);
    }
    to {
      transform: translateX(8px) scale(0.99);
      opacity: 0;
      filter: blur(4px);
    }
  }

  @keyframes slide-left-in {
    from {
      transform: translateX(-8px) scale(0.99);
      opacity: 0;
      filter: blur(4px);
    }
    to {
      transform: translateX(0) translateY(0) scale(1);
      opacity: 1;
      filter: blur(0px);
    }
  }

  @keyframes slide-right-out {
    from {
      transform: translateX(0px) scale(1);
      opacity: 1;
      filter: blur(0px);
    }
    to {
      transform: translateX(-8px) scale(0.99);
      opacity: 0;
      filter: blur(4px);
    }
  }

  @keyframes slide-right-in {
    from {
      transform: translateX(8px) scale(0.99);
      opacity: 0;
      filter: blur(4px);
    }
    to {
      transform: translateX(0) translateY(0) scale(1);
      opacity: 1;
      filter: blur(0px);
    }
  }
`;
var __decorate = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
const HEADER_HEIGHT = 60;
let W3mRouterContainer = class W3mRouterContainer2 extends i {
  constructor() {
    super(...arguments);
    this.resizeObserver = void 0;
    this.transitionDuration = "0.15s";
    this.transitionFunction = "";
    this.history = "";
    this.view = "";
    this.setView = void 0;
    this.viewDirection = "";
    this.historyState = "";
    this.previousHeight = "0px";
    this.mobileFullScreen = OptionsController.state.enableMobileFullScreen;
    this.onViewportResize = () => {
      this.updateContainerHeight();
    };
  }
  updated(changedProps) {
    if (changedProps.has("history")) {
      const newHistory = this.history;
      if (this.historyState !== "" && this.historyState !== newHistory) {
        this.onViewChange(newHistory);
      }
    }
    if (changedProps.has("transitionDuration")) {
      this.style.setProperty("--local-duration", this.transitionDuration);
    }
    if (changedProps.has("transitionFunction")) {
      this.style.setProperty("--local-transition", this.transitionFunction);
    }
  }
  firstUpdated() {
    if (this.transitionFunction) {
      this.style.setProperty("--local-transition", this.transitionFunction);
    }
    this.style.setProperty("--local-duration", this.transitionDuration);
    this.historyState = this.history;
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === this.getWrapper()) {
          let newHeight = entry.contentRect.height;
          const footerHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--apkt-footer-height") || "0");
          if (this.mobileFullScreen) {
            const viewportHeight = window.visualViewport?.height || window.innerHeight;
            const headerHeight = this.getHeaderHeight();
            newHeight = viewportHeight - headerHeight - footerHeight;
            this.style.setProperty("--local-border-bottom-radius", "0px");
          } else {
            const totalHeight = newHeight + footerHeight;
            newHeight = totalHeight;
            this.style.setProperty("--local-border-bottom-radius", footerHeight ? "var(--apkt-borderRadius-5)" : "0px");
          }
          this.style.setProperty("--local-container-height", `${newHeight}px`);
          if (this.previousHeight !== "0px") {
            this.style.setProperty("--local-duration-height", this.transitionDuration);
          }
          this.previousHeight = `${newHeight}px`;
        }
      }
    });
    this.resizeObserver.observe(this.getWrapper());
    this.updateContainerHeight();
    window.addEventListener("resize", this.onViewportResize);
    window.visualViewport?.addEventListener("resize", this.onViewportResize);
  }
  disconnectedCallback() {
    const wrapper = this.getWrapper();
    if (wrapper && this.resizeObserver) {
      this.resizeObserver.unobserve(wrapper);
    }
    window.removeEventListener("resize", this.onViewportResize);
    window.visualViewport?.removeEventListener("resize", this.onViewportResize);
  }
  render() {
    return x`
      <div class="container" data-mobile-fullscreen="${o(this.mobileFullScreen)}">
        <div
          class="page"
          data-mobile-fullscreen="${o(this.mobileFullScreen)}"
          view-direction="${this.viewDirection}"
        >
          <div class="page-content">
            <slot></slot>
          </div>
        </div>
      </div>
    `;
  }
  onViewChange(history) {
    const historyArr = history.split(",").filter(Boolean);
    const prevArr = this.historyState.split(",").filter(Boolean);
    const prevLength = prevArr.length;
    const newLength = historyArr.length;
    const newView = historyArr[historyArr.length - 1] || "";
    const duration = UiHelperUtil.cssDurationToNumber(this.transitionDuration);
    let direction = "";
    if (newLength > prevLength) {
      direction = "next";
    } else if (newLength < prevLength) {
      direction = "prev";
    } else if (newLength === prevLength && historyArr[newLength - 1] !== prevArr[prevLength - 1]) {
      direction = "next";
    }
    this.viewDirection = `${direction}-${newView}`;
    setTimeout(() => {
      this.historyState = history;
      this.setView?.(newView);
    }, duration);
    setTimeout(() => {
      this.viewDirection = "";
    }, duration * 2);
  }
  getWrapper() {
    return this.shadowRoot?.querySelector("div.page");
  }
  updateContainerHeight() {
    const wrapper = this.getWrapper();
    if (!wrapper) {
      return;
    }
    const footerHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--apkt-footer-height") || "0");
    let newHeight = 0;
    if (this.mobileFullScreen) {
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const headerHeight = this.getHeaderHeight();
      newHeight = viewportHeight - headerHeight - footerHeight;
      this.style.setProperty("--local-border-bottom-radius", "0px");
    } else {
      newHeight = wrapper.getBoundingClientRect().height + footerHeight;
      this.style.setProperty("--local-border-bottom-radius", footerHeight ? "var(--apkt-borderRadius-5)" : "0px");
    }
    this.style.setProperty("--local-container-height", `${newHeight}px`);
    if (this.previousHeight !== "0px") {
      this.style.setProperty("--local-duration-height", this.transitionDuration);
    }
    this.previousHeight = `${newHeight}px`;
  }
  getHeaderHeight() {
    return HEADER_HEIGHT;
  }
};
W3mRouterContainer.styles = [styles];
__decorate([
  n({ type: String })
], W3mRouterContainer.prototype, "transitionDuration", void 0);
__decorate([
  n({ type: String })
], W3mRouterContainer.prototype, "transitionFunction", void 0);
__decorate([
  n({ type: String })
], W3mRouterContainer.prototype, "history", void 0);
__decorate([
  n({ type: String })
], W3mRouterContainer.prototype, "view", void 0);
__decorate([
  n({ attribute: false })
], W3mRouterContainer.prototype, "setView", void 0);
__decorate([
  r()
], W3mRouterContainer.prototype, "viewDirection", void 0);
__decorate([
  r()
], W3mRouterContainer.prototype, "historyState", void 0);
__decorate([
  r()
], W3mRouterContainer.prototype, "previousHeight", void 0);
__decorate([
  r()
], W3mRouterContainer.prototype, "mobileFullScreen", void 0);
W3mRouterContainer = __decorate([
  customElement("w3m-router-container")
], W3mRouterContainer);
export {
  AppKitModal,
  W3mListWallet,
  W3mModal,
  W3mModalBase,
  W3mRouterContainer,
  W3mUsageExceededView
};
