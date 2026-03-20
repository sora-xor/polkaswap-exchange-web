import { n as css, q as i, R as RouterController, x, b as EventsController } from "./walletconnect-BVoLvI4P.js";
import { r, c as customElement } from "./index-5878y4Sm.js";
import "./index-D7Al7wfJ.js";
import { H as HelpersUtil } from "./HelpersUtil-DHNzaUb2.js";
const styles$1 = css`
  :host {
    display: block;
  }

  div.container {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    overflow: hidden;
    height: auto;
    display: block;
  }

  div.container[status='hide'] {
    animation: fade-out;
    animation-duration: var(--apkt-duration-dynamic);
    animation-timing-function: ${({ easings }) => easings["ease-out-power-2"]};
    animation-fill-mode: both;
    animation-delay: 0s;
  }

  div.container[status='show'] {
    animation: fade-in;
    animation-duration: var(--apkt-duration-dynamic);
    animation-timing-function: ${({ easings }) => easings["ease-out-power-2"]};
    animation-fill-mode: both;
    animation-delay: var(--apkt-duration-dynamic);
  }

  @keyframes fade-in {
    from {
      opacity: 0;
      filter: blur(6px);
    }
    to {
      opacity: 1;
      filter: blur(0px);
    }
  }

  @keyframes fade-out {
    from {
      opacity: 1;
      filter: blur(0px);
    }
    to {
      opacity: 0;
      filter: blur(6px);
    }
  }
`;
var __decorate$1 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mFooter = class W3mFooter2 extends i {
  constructor() {
    super(...arguments);
    this.resizeObserver = void 0;
    this.unsubscribe = [];
    this.status = "hide";
    this.view = RouterController.state.view;
  }
  firstUpdated() {
    this.status = HelpersUtil.hasFooter() ? "show" : "hide";
    this.unsubscribe.push(RouterController.subscribeKey("view", (val) => {
      this.view = val;
      this.status = HelpersUtil.hasFooter() ? "show" : "hide";
      if (this.status === "hide") {
        const globalStyles = document.documentElement.style;
        globalStyles.setProperty("--apkt-footer-height", "0px");
      }
    }));
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === this.getWrapper()) {
          const newHeight = `${entry.contentRect.height}px`;
          const globalStyles = document.documentElement.style;
          globalStyles.setProperty("--apkt-footer-height", newHeight);
        }
      }
    });
    this.resizeObserver.observe(this.getWrapper());
  }
  render() {
    return x`
      <div class="container" status=${this.status}>${this.templatePageContainer()}</div>
    `;
  }
  templatePageContainer() {
    if (HelpersUtil.hasFooter()) {
      return x` ${this.templateFooter()}`;
    }
    return null;
  }
  templateFooter() {
    switch (this.view) {
      case "Networks":
        return this.templateNetworksFooter();
      case "Connect":
      case "ConnectWallets":
      case "OnRampFiatSelect":
      case "OnRampTokenSelect":
        return x`<w3m-legal-footer></w3m-legal-footer>`;
      case "OnRampProviders":
        return x`<w3m-onramp-providers-footer></w3m-onramp-providers-footer>`;
      default:
        return null;
    }
  }
  templateNetworksFooter() {
    return x` <wui-flex
      class="footer-in"
      padding="3"
      flexDirection="column"
      gap="3"
      alignItems="center"
    >
      <wui-text variant="md-regular" color="secondary" align="center">
        Your connected wallet may not support some of the networks available for this dApp
      </wui-text>
      <wui-link @click=${this.onNetworkHelp.bind(this)}>
        <wui-icon size="sm" color="accent-primary" slot="iconLeft" name="helpCircle"></wui-icon>
        What is a network
      </wui-link>
    </wui-flex>`;
  }
  onNetworkHelp() {
    EventsController.sendEvent({ type: "track", event: "CLICK_NETWORK_HELP" });
    RouterController.push("WhatIsANetwork");
  }
  getWrapper() {
    return this.shadowRoot?.querySelector("div.container");
  }
};
W3mFooter.styles = [styles$1];
__decorate$1([
  r()
], W3mFooter.prototype, "status", void 0);
__decorate$1([
  r()
], W3mFooter.prototype, "view", void 0);
W3mFooter = __decorate$1([
  customElement("w3m-footer")
], W3mFooter);
const styles = css`
  :host {
    display: block;
    width: inherit;
  }
`;
var __decorate = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mRouter = class W3mRouter2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.viewState = RouterController.state.view;
    this.history = RouterController.state.history.join(",");
    this.unsubscribe.push(RouterController.subscribeKey("view", () => {
      this.history = RouterController.state.history.join(",");
      document.documentElement.style.setProperty("--apkt-duration-dynamic", "var(--apkt-durations-lg)");
    }));
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
    document.documentElement.style.setProperty("--apkt-duration-dynamic", "0s");
  }
  render() {
    return x`${this.templatePageContainer()}`;
  }
  templatePageContainer() {
    return x`<w3m-router-container
      history=${this.history}
      .setView=${() => {
      this.viewState = RouterController.state.view;
    }}
    >
      ${this.viewTemplate(this.viewState)}
    </w3m-router-container>`;
  }
  viewTemplate(view) {
    switch (view) {
      case "AccountSettings":
        return x`<w3m-account-settings-view></w3m-account-settings-view>`;
      case "Account":
        return x`<w3m-account-view></w3m-account-view>`;
      case "AllWallets":
        return x`<w3m-all-wallets-view></w3m-all-wallets-view>`;
      case "ApproveTransaction":
        return x`<w3m-approve-transaction-view></w3m-approve-transaction-view>`;
      case "BuyInProgress":
        return x`<w3m-buy-in-progress-view></w3m-buy-in-progress-view>`;
      case "ChooseAccountName":
        return x`<w3m-choose-account-name-view></w3m-choose-account-name-view>`;
      case "Connect":
        return x`<w3m-connect-view></w3m-connect-view>`;
      case "Create":
        return x`<w3m-connect-view walletGuide="explore"></w3m-connect-view>`;
      case "ConnectingWalletConnect":
        return x`<w3m-connecting-wc-view></w3m-connecting-wc-view>`;
      case "ConnectingWalletConnectBasic":
        return x`<w3m-connecting-wc-basic-view></w3m-connecting-wc-basic-view>`;
      case "ConnectingExternal":
        return x`<w3m-connecting-external-view></w3m-connecting-external-view>`;
      case "ConnectingSiwe":
        return x`<w3m-connecting-siwe-view></w3m-connecting-siwe-view>`;
      case "ConnectWallets":
        return x`<w3m-connect-wallets-view></w3m-connect-wallets-view>`;
      case "ConnectSocials":
        return x`<w3m-connect-socials-view></w3m-connect-socials-view>`;
      case "ConnectingSocial":
        return x`<w3m-connecting-social-view></w3m-connecting-social-view>`;
      case "DataCapture":
        return x`<w3m-data-capture-view></w3m-data-capture-view>`;
      case "DataCaptureOtpConfirm":
        return x`<w3m-data-capture-otp-confirm-view></w3m-data-capture-otp-confirm-view>`;
      case "Downloads":
        return x`<w3m-downloads-view></w3m-downloads-view>`;
      case "EmailLogin":
        return x`<w3m-email-login-view></w3m-email-login-view>`;
      case "EmailVerifyOtp":
        return x`<w3m-email-verify-otp-view></w3m-email-verify-otp-view>`;
      case "EmailVerifyDevice":
        return x`<w3m-email-verify-device-view></w3m-email-verify-device-view>`;
      case "GetWallet":
        return x`<w3m-get-wallet-view></w3m-get-wallet-view>`;
      case "Networks":
        return x`<w3m-networks-view></w3m-networks-view>`;
      case "SwitchNetwork":
        return x`<w3m-network-switch-view></w3m-network-switch-view>`;
      case "ProfileWallets":
        return x`<w3m-profile-wallets-view></w3m-profile-wallets-view>`;
      case "Transactions":
        return x`<w3m-transactions-view></w3m-transactions-view>`;
      case "OnRampProviders":
        return x`<w3m-onramp-providers-view></w3m-onramp-providers-view>`;
      case "OnRampTokenSelect":
        return x`<w3m-onramp-token-select-view></w3m-onramp-token-select-view>`;
      case "OnRampFiatSelect":
        return x`<w3m-onramp-fiat-select-view></w3m-onramp-fiat-select-view>`;
      case "UpgradeEmailWallet":
        return x`<w3m-upgrade-wallet-view></w3m-upgrade-wallet-view>`;
      case "UpdateEmailWallet":
        return x`<w3m-update-email-wallet-view></w3m-update-email-wallet-view>`;
      case "UpdateEmailPrimaryOtp":
        return x`<w3m-update-email-primary-otp-view></w3m-update-email-primary-otp-view>`;
      case "UpdateEmailSecondaryOtp":
        return x`<w3m-update-email-secondary-otp-view></w3m-update-email-secondary-otp-view>`;
      case "UnsupportedChain":
        return x`<w3m-unsupported-chain-view></w3m-unsupported-chain-view>`;
      case "Swap":
        return x`<w3m-swap-view></w3m-swap-view>`;
      case "SwapSelectToken":
        return x`<w3m-swap-select-token-view></w3m-swap-select-token-view>`;
      case "SwapPreview":
        return x`<w3m-swap-preview-view></w3m-swap-preview-view>`;
      case "WalletSend":
        return x`<w3m-wallet-send-view></w3m-wallet-send-view>`;
      case "WalletSendSelectToken":
        return x`<w3m-wallet-send-select-token-view></w3m-wallet-send-select-token-view>`;
      case "WalletSendPreview":
        return x`<w3m-wallet-send-preview-view></w3m-wallet-send-preview-view>`;
      case "WalletSendConfirmed":
        return x`<w3m-send-confirmed-view></w3m-send-confirmed-view>`;
      case "WhatIsABuy":
        return x`<w3m-what-is-a-buy-view></w3m-what-is-a-buy-view>`;
      case "WalletReceive":
        return x`<w3m-wallet-receive-view></w3m-wallet-receive-view>`;
      case "WalletCompatibleNetworks":
        return x`<w3m-wallet-compatible-networks-view></w3m-wallet-compatible-networks-view>`;
      case "WhatIsAWallet":
        return x`<w3m-what-is-a-wallet-view></w3m-what-is-a-wallet-view>`;
      case "ConnectingMultiChain":
        return x`<w3m-connecting-multi-chain-view></w3m-connecting-multi-chain-view>`;
      case "WhatIsANetwork":
        return x`<w3m-what-is-a-network-view></w3m-what-is-a-network-view>`;
      case "ConnectingFarcaster":
        return x`<w3m-connecting-farcaster-view></w3m-connecting-farcaster-view>`;
      case "SwitchActiveChain":
        return x`<w3m-switch-active-chain-view></w3m-switch-active-chain-view>`;
      case "RegisterAccountName":
        return x`<w3m-register-account-name-view></w3m-register-account-name-view>`;
      case "RegisterAccountNameSuccess":
        return x`<w3m-register-account-name-success-view></w3m-register-account-name-success-view>`;
      case "SmartSessionCreated":
        return x`<w3m-smart-session-created-view></w3m-smart-session-created-view>`;
      case "SmartSessionList":
        return x`<w3m-smart-session-list-view></w3m-smart-session-list-view>`;
      case "SIWXSignMessage":
        return x`<w3m-siwx-sign-message-view></w3m-siwx-sign-message-view>`;
      case "Pay":
        return x`<w3m-pay-view></w3m-pay-view>`;
      case "PayLoading":
        return x`<w3m-pay-loading-view></w3m-pay-loading-view>`;
      case "PayQuote":
        return x`<w3m-pay-quote-view></w3m-pay-quote-view>`;
      case "FundWallet":
        return x`<w3m-fund-wallet-view></w3m-fund-wallet-view>`;
      case "PayWithExchange":
        return x`<w3m-deposit-from-exchange-view></w3m-deposit-from-exchange-view>`;
      case "PayWithExchangeSelectAsset":
        return x`<w3m-deposit-from-exchange-select-asset-view></w3m-deposit-from-exchange-select-asset-view>`;
      case "UsageExceeded":
        return x`<w3m-usage-exceeded-view></w3m-usage-exceeded-view>`;
      case "SmartAccountSettings":
        return x`<w3m-smart-account-settings-view></w3m-smart-account-settings-view>`;
      default:
        return x`<w3m-connect-view></w3m-connect-view>`;
    }
  }
};
W3mRouter.styles = [styles];
__decorate([
  r()
], W3mRouter.prototype, "viewState", void 0);
__decorate([
  r()
], W3mRouter.prototype, "history", void 0);
W3mRouter = __decorate([
  customElement("w3m-router")
], W3mRouter);
export {
  W3mRouter as W,
  W3mFooter as a
};
