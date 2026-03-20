import { n as css, q as i, a0 as OnRampController, a1 as AssetController, O as OptionsController, x, M as ModalController, a as ChainController, G as AssetUtil, R as RouterController, c as CoreHelperUtil, b as EventsController, u as getPreferredAccountType, W as W3mFrameRpcConstants, m as ConnectionController, T as ThemeController, S as SnackController } from "./walletconnect-BVoLvI4P.js";
import { r, c as customElement, n } from "./index-5878y4Sm.js";
import { o } from "./if-defined-DpCpmSxP.js";
import "./index-B80WMNJI.js";
import { O as OptionsStateController } from "./index-CqrG0F4W.js";
import "./index-SiM7Ib3-.js";
import "./index-DAKl5XGv.js";
import "./index-DlOLZoKC.js";
import "./index-D7Al7wfJ.js";
import "./index-Bag94m_F.js";
import "./index-Cm7UDlkl.js";
import "./index-Bz3_ZVag.js";
import "./index-DgvHPQm2.js";
import "./index-Oesj6-8K.js";
import "./index-73GArslZ.js";
import "./ref-j6LTZZuR.js";
import "./index-BH8iPnnC.js";
const styles$5 = css`
  :host > wui-grid {
    max-height: 360px;
    overflow: auto;
  }

  wui-flex {
    transition: opacity ${({ easings }) => easings["ease-out-power-1"]}
      ${({ durations }) => durations["md"]};
    will-change: opacity;
  }

  wui-grid::-webkit-scrollbar {
    display: none;
  }

  wui-flex.disabled {
    opacity: 0.3;
    pointer-events: none;
    user-select: none;
  }
`;
var __decorate$7 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mOnrampFiatSelectView = class W3mOnrampFiatSelectView2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.selectedCurrency = OnRampController.state.paymentCurrency;
    this.currencies = OnRampController.state.paymentCurrencies;
    this.currencyImages = AssetController.state.currencyImages;
    this.checked = OptionsStateController.state.isLegalCheckboxChecked;
    this.unsubscribe.push(...[
      OnRampController.subscribe((val) => {
        this.selectedCurrency = val.paymentCurrency;
        this.currencies = val.paymentCurrencies;
      }),
      AssetController.subscribeKey("currencyImages", (val) => this.currencyImages = val),
      OptionsStateController.subscribeKey("isLegalCheckboxChecked", (val) => {
        this.checked = val;
      })
    ]);
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
    return x`
      <w3m-legal-checkbox></w3m-legal-checkbox>
      <wui-flex
        flexDirection="column"
        .padding=${["0", "3", "3", "3"]}
        gap="2"
        class=${o(disabled ? "disabled" : void 0)}
      >
        ${this.currenciesTemplate(disabled)}
      </wui-flex>
    `;
  }
  currenciesTemplate(disabled = false) {
    return this.currencies.map((currency) => x`
        <wui-list-item
          imageSrc=${o(this.currencyImages?.[currency.id])}
          @click=${() => this.selectCurrency(currency)}
          variant="image"
          tabIdx=${o(disabled ? -1 : void 0)}
        >
          <wui-text variant="md-medium" color="primary">${currency.id}</wui-text>
        </wui-list-item>
      `);
  }
  selectCurrency(currency) {
    if (!currency) {
      return;
    }
    OnRampController.setPaymentCurrency(currency);
    ModalController.close();
  }
};
W3mOnrampFiatSelectView.styles = styles$5;
__decorate$7([
  r()
], W3mOnrampFiatSelectView.prototype, "selectedCurrency", void 0);
__decorate$7([
  r()
], W3mOnrampFiatSelectView.prototype, "currencies", void 0);
__decorate$7([
  r()
], W3mOnrampFiatSelectView.prototype, "currencyImages", void 0);
__decorate$7([
  r()
], W3mOnrampFiatSelectView.prototype, "checked", void 0);
W3mOnrampFiatSelectView = __decorate$7([
  customElement("w3m-onramp-fiat-select-view")
], W3mOnrampFiatSelectView);
const styles$4 = css`
  button {
    padding: ${({ spacing }) => spacing["3"]};
    border-radius: ${({ borderRadius }) => borderRadius["4"]};
    border: none;
    outline: none;
    background-color: ${({ tokens }) => tokens.core.glass010};
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: ${({ spacing }) => spacing["3"]};
    transition: background-color ${({ easings }) => easings["ease-out-power-1"]}
      ${({ durations }) => durations["md"]};
    will-change: background-color;
    cursor: pointer;
  }

  button:hover {
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
  }

  .provider-image {
    width: ${({ spacing }) => spacing["10"]};
    min-width: ${({ spacing }) => spacing["10"]};
    height: ${({ spacing }) => spacing["10"]};
    border-radius: calc(
      ${({ borderRadius }) => borderRadius["4"]} - calc(${({ spacing }) => spacing["3"]} / 2)
    );
    position: relative;
    overflow: hidden;
  }

  .network-icon {
    width: ${({ spacing }) => spacing["3"]};
    height: ${({ spacing }) => spacing["3"]};
    border-radius: calc(${({ spacing }) => spacing["3"]} / 2);
    overflow: hidden;
    box-shadow:
      0 0 0 3px ${({ tokens }) => tokens.theme.foregroundPrimary},
      0 0 0 3px ${({ tokens }) => tokens.theme.backgroundPrimary};
    transition: box-shadow ${({ easings }) => easings["ease-out-power-1"]}
      ${({ durations }) => durations["md"]};
    will-change: box-shadow;
  }

  button:hover .network-icon {
    box-shadow:
      0 0 0 3px ${({ tokens }) => tokens.core.glass010},
      0 0 0 3px ${({ tokens }) => tokens.theme.backgroundPrimary};
  }
`;
var __decorate$6 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mOnRampProviderItem = class W3mOnRampProviderItem2 extends i {
  constructor() {
    super(...arguments);
    this.disabled = false;
    this.color = "inherit";
    this.label = "";
    this.feeRange = "";
    this.loading = false;
    this.onClick = null;
  }
  render() {
    return x`
      <button ?disabled=${this.disabled} @click=${this.onClick} ontouchstart>
        <wui-visual name=${o(this.name)} class="provider-image"></wui-visual>
        <wui-flex flexDirection="column" gap="01">
          <wui-text variant="md-regular" color="primary">${this.label}</wui-text>
          <wui-flex alignItems="center" justifyContent="flex-start" gap="4">
            <wui-text variant="sm-medium" color="primary">
              <wui-text variant="sm-regular" color="secondary">Fees</wui-text>
              ${this.feeRange}
            </wui-text>
            <wui-flex gap="2">
              <wui-icon name="bank" size="sm" color="default"></wui-icon>
              <wui-icon name="card" size="sm" color="default"></wui-icon>
            </wui-flex>
            ${this.networksTemplate()}
          </wui-flex>
        </wui-flex>
        ${this.loading ? x`<wui-loading-spinner color="secondary" size="md"></wui-loading-spinner>` : x`<wui-icon name="chevronRight" color="default" size="sm"></wui-icon>`}
      </button>
    `;
  }
  networksTemplate() {
    const requestedCaipNetworks = ChainController.getAllRequestedCaipNetworks();
    const slicedNetworks = requestedCaipNetworks?.filter((network) => network?.assets?.imageId)?.slice(0, 5);
    return x`
      <wui-flex class="networks">
        ${slicedNetworks?.map((network) => x`
            <wui-flex class="network-icon">
              <wui-image src=${o(AssetUtil.getNetworkImage(network))}></wui-image>
            </wui-flex>
          `)}
      </wui-flex>
    `;
  }
};
W3mOnRampProviderItem.styles = [styles$4];
__decorate$6([
  n({ type: Boolean })
], W3mOnRampProviderItem.prototype, "disabled", void 0);
__decorate$6([
  n()
], W3mOnRampProviderItem.prototype, "color", void 0);
__decorate$6([
  n()
], W3mOnRampProviderItem.prototype, "name", void 0);
__decorate$6([
  n()
], W3mOnRampProviderItem.prototype, "label", void 0);
__decorate$6([
  n()
], W3mOnRampProviderItem.prototype, "feeRange", void 0);
__decorate$6([
  n({ type: Boolean })
], W3mOnRampProviderItem.prototype, "loading", void 0);
__decorate$6([
  n()
], W3mOnRampProviderItem.prototype, "onClick", void 0);
W3mOnRampProviderItem = __decorate$6([
  customElement("w3m-onramp-provider-item")
], W3mOnRampProviderItem);
var __decorate$5 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mOnRampProvidersView = class W3mOnRampProvidersView2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.providers = OnRampController.state.providers;
    this.unsubscribe.push(...[
      OnRampController.subscribeKey("providers", (val) => {
        this.providers = val;
      })
    ]);
  }
  render() {
    return x`
      <wui-flex flexDirection="column" .padding=${["0", "3", "3", "3"]} gap="2">
        ${this.onRampProvidersTemplate()}
      </wui-flex>
    `;
  }
  onRampProvidersTemplate() {
    return this.providers.filter((provider) => provider.supportedChains.includes(ChainController.state.activeChain ?? "eip155")).map((provider) => x`
          <w3m-onramp-provider-item
            label=${provider.label}
            name=${provider.name}
            feeRange=${provider.feeRange}
            @click=${() => {
      this.onClickProvider(provider);
    }}
            ?disabled=${!provider.url}
            data-testid=${`onramp-provider-${provider.name}`}
          ></w3m-onramp-provider-item>
        `);
  }
  onClickProvider(provider) {
    OnRampController.setSelectedProvider(provider);
    RouterController.push("BuyInProgress");
    CoreHelperUtil.openHref(OnRampController.state.selectedProvider?.url || provider.url, "popupWindow", "width=600,height=800,scrollbars=yes");
    EventsController.sendEvent({
      type: "track",
      event: "SELECT_BUY_PROVIDER",
      properties: {
        provider: provider.name,
        isSmartAccount: getPreferredAccountType(ChainController.state.activeChain) === W3mFrameRpcConstants.ACCOUNT_TYPES.SMART_ACCOUNT
      }
    });
  }
};
__decorate$5([
  r()
], W3mOnRampProvidersView.prototype, "providers", void 0);
W3mOnRampProvidersView = __decorate$5([
  customElement("w3m-onramp-providers-view")
], W3mOnRampProvidersView);
const styles$3 = css`
  :host > wui-grid {
    max-height: 360px;
    overflow: auto;
  }

  wui-flex {
    transition: opacity ${({ easings }) => easings["ease-out-power-1"]}
      ${({ durations }) => durations["md"]};
    will-change: opacity;
  }

  wui-grid::-webkit-scrollbar {
    display: none;
  }

  wui-flex.disabled {
    opacity: 0.3;
    pointer-events: none;
    user-select: none;
  }
`;
var __decorate$4 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mOnrampTokensView = class W3mOnrampTokensView2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.selectedCurrency = OnRampController.state.purchaseCurrencies;
    this.tokens = OnRampController.state.purchaseCurrencies;
    this.tokenImages = AssetController.state.tokenImages;
    this.checked = OptionsStateController.state.isLegalCheckboxChecked;
    this.unsubscribe.push(...[
      OnRampController.subscribe((val) => {
        this.selectedCurrency = val.purchaseCurrencies;
        this.tokens = val.purchaseCurrencies;
      }),
      AssetController.subscribeKey("tokenImages", (val) => this.tokenImages = val),
      OptionsStateController.subscribeKey("isLegalCheckboxChecked", (val) => {
        this.checked = val;
      })
    ]);
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
    return x`
      <w3m-legal-checkbox></w3m-legal-checkbox>
      <wui-flex
        flexDirection="column"
        .padding=${["0", "3", "3", "3"]}
        gap="2"
        class=${o(disabled ? "disabled" : void 0)}
      >
        ${this.currenciesTemplate(disabled)}
      </wui-flex>
    `;
  }
  currenciesTemplate(disabled = false) {
    return this.tokens.map((token) => x`
        <wui-list-item
          imageSrc=${o(this.tokenImages?.[token.symbol])}
          @click=${() => this.selectToken(token)}
          variant="image"
          tabIdx=${o(disabled ? -1 : void 0)}
        >
          <wui-flex gap="1" alignItems="center">
            <wui-text variant="md-medium" color="primary">${token.name}</wui-text>
            <wui-text variant="sm-regular" color="secondary">${token.symbol}</wui-text>
          </wui-flex>
        </wui-list-item>
      `);
  }
  selectToken(currency) {
    if (!currency) {
      return;
    }
    OnRampController.setPurchaseCurrency(currency);
    ModalController.close();
  }
};
W3mOnrampTokensView.styles = styles$3;
__decorate$4([
  r()
], W3mOnrampTokensView.prototype, "selectedCurrency", void 0);
__decorate$4([
  r()
], W3mOnrampTokensView.prototype, "tokens", void 0);
__decorate$4([
  r()
], W3mOnrampTokensView.prototype, "tokenImages", void 0);
__decorate$4([
  r()
], W3mOnrampTokensView.prototype, "checked", void 0);
W3mOnrampTokensView = __decorate$4([
  customElement("w3m-onramp-token-select-view")
], W3mOnrampTokensView);
const styles$2 = css`
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
`;
var __decorate$3 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mBuyInProgressView = class W3mBuyInProgressView2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.selectedOnRampProvider = OnRampController.state.selectedProvider;
    this.uri = ConnectionController.state.wcUri;
    this.ready = false;
    this.showRetry = false;
    this.buffering = false;
    this.error = false;
    this.isMobile = false;
    this.onRetry = void 0;
    this.unsubscribe.push(...[
      OnRampController.subscribeKey("selectedProvider", (val) => {
        this.selectedOnRampProvider = val;
      })
    ]);
  }
  disconnectedCallback() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
  render() {
    let label = "Continue in external window";
    if (this.error) {
      label = "Buy failed";
    } else if (this.selectedOnRampProvider) {
      label = `Buy in ${this.selectedOnRampProvider?.label}`;
    }
    const subLabel = this.error ? "Buy can be declined from your side or due to and error on the provider app" : `We’ll notify you once your Buy is processed`;
    return x`
      <wui-flex
        data-error=${o(this.error)}
        data-retry=${this.showRetry}
        flexDirection="column"
        alignItems="center"
        .padding=${["10", "5", "5", "5"]}
        gap="5"
      >
        <wui-flex justifyContent="center" alignItems="center">
          <wui-visual
            name=${o(this.selectedOnRampProvider?.name)}
            size="lg"
            class="provider-image"
          >
          </wui-visual>

          ${this.error ? null : this.loaderTemplate()}

          <wui-icon-box
            color="error"
            icon="close"
            size="sm"
            border
            borderColor="wui-color-bg-125"
          ></wui-icon-box>
        </wui-flex>

        <wui-flex
          flexDirection="column"
          alignItems="center"
          gap="2"
          .padding=${["4", "0", "0", "0"]}
        >
          <wui-text variant="md-medium" color=${this.error ? "error" : "primary"}>
            ${label}
          </wui-text>
          <wui-text align="center" variant="sm-medium" color="secondary">${subLabel}</wui-text>
        </wui-flex>

        ${this.error ? this.tryAgainTemplate() : null}
      </wui-flex>

      <wui-flex .padding=${["0", "5", "5", "5"]} justifyContent="center">
        <wui-link @click=${this.onCopyUri} color="secondary">
          <wui-icon size="sm" color="default" slot="iconLeft" name="copy"></wui-icon>
          Copy link
        </wui-link>
      </wui-flex>
    `;
  }
  onTryAgain() {
    if (!this.selectedOnRampProvider) {
      return;
    }
    this.error = false;
    CoreHelperUtil.openHref(this.selectedOnRampProvider.url, "popupWindow", "width=600,height=800,scrollbars=yes");
  }
  tryAgainTemplate() {
    if (!this.selectedOnRampProvider?.url) {
      return null;
    }
    return x`<wui-button size="md" variant="accent" @click=${this.onTryAgain.bind(this)}>
      <wui-icon color="inherit" slot="iconLeft" name="refresh"></wui-icon>
      Try again
    </wui-button>`;
  }
  loaderTemplate() {
    const borderRadiusMaster = ThemeController.state.themeVariables["--w3m-border-radius-master"];
    const radius = borderRadiusMaster ? parseInt(borderRadiusMaster.replace("px", ""), 10) : 4;
    return x`<wui-loading-thumbnail radius=${radius * 9}></wui-loading-thumbnail>`;
  }
  onCopyUri() {
    if (!this.selectedOnRampProvider?.url) {
      SnackController.showError("No link found");
      RouterController.goBack();
      return;
    }
    try {
      CoreHelperUtil.copyToClopboard(this.selectedOnRampProvider.url);
      SnackController.showSuccess("Link copied");
    } catch {
      SnackController.showError("Failed to copy");
    }
  }
};
W3mBuyInProgressView.styles = styles$2;
__decorate$3([
  r()
], W3mBuyInProgressView.prototype, "intervalId", void 0);
__decorate$3([
  r()
], W3mBuyInProgressView.prototype, "selectedOnRampProvider", void 0);
__decorate$3([
  r()
], W3mBuyInProgressView.prototype, "uri", void 0);
__decorate$3([
  r()
], W3mBuyInProgressView.prototype, "ready", void 0);
__decorate$3([
  r()
], W3mBuyInProgressView.prototype, "showRetry", void 0);
__decorate$3([
  r()
], W3mBuyInProgressView.prototype, "buffering", void 0);
__decorate$3([
  r()
], W3mBuyInProgressView.prototype, "error", void 0);
__decorate$3([
  n({ type: Boolean })
], W3mBuyInProgressView.prototype, "isMobile", void 0);
__decorate$3([
  n()
], W3mBuyInProgressView.prototype, "onRetry", void 0);
W3mBuyInProgressView = __decorate$3([
  customElement("w3m-buy-in-progress-view")
], W3mBuyInProgressView);
var __decorate$2 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mWhatIsABuyView = class W3mWhatIsABuyView2 extends i {
  render() {
    return x`
      <wui-flex
        flexDirection="column"
        .padding=${["6", "10", "5", "10"]}
        alignItems="center"
        gap="5"
      >
        <wui-visual name="onrampCard"></wui-visual>
        <wui-flex flexDirection="column" gap="2" alignItems="center">
          <wui-text align="center" variant="md-medium" color="primary">
            Quickly and easily buy digital assets!
          </wui-text>
          <wui-text align="center" variant="sm-regular" color="secondary">
            Simply select your preferred onramp provider and add digital assets to your account
            using your credit card or bank transfer
          </wui-text>
        </wui-flex>
        <wui-button @click=${RouterController.goBack}>
          <wui-icon size="sm" color="inherit" name="add" slot="iconLeft"></wui-icon>
          Buy
        </wui-button>
      </wui-flex>
    `;
  }
};
W3mWhatIsABuyView = __decorate$2([
  customElement("w3m-what-is-a-buy-view")
], W3mWhatIsABuyView);
const styles$1 = css`
  :host {
    width: 100%;
  }

  wui-loading-spinner {
    position: absolute;
    top: 50%;
    right: 20px;
    transform: translateY(-50%);
  }

  .currency-container {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    right: ${({ spacing }) => spacing["2"]};
    height: 40px;
    padding: ${({ spacing }) => spacing["2"]} ${({ spacing }) => spacing["2"]}
      ${({ spacing }) => spacing["2"]} ${({ spacing }) => spacing["2"]};
    min-width: 95px;
    border-radius: ${({ borderRadius }) => borderRadius["round"]};
    border: 1px solid ${({ tokens }) => tokens.theme.foregroundPrimary};
    background: ${({ tokens }) => tokens.theme.foregroundPrimary};
    cursor: pointer;
  }

  .currency-container > wui-image {
    height: 24px;
    width: 24px;
    border-radius: 50%;
  }
`;
var __decorate$1 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mInputCurrency = class W3mInputCurrency2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.type = "Token";
    this.value = 0;
    this.currencies = [];
    this.selectedCurrency = this.currencies?.[0];
    this.currencyImages = AssetController.state.currencyImages;
    this.tokenImages = AssetController.state.tokenImages;
    this.unsubscribe.push(OnRampController.subscribeKey("purchaseCurrency", (val) => {
      if (!val || this.type === "Fiat") {
        return;
      }
      this.selectedCurrency = this.formatPurchaseCurrency(val);
    }), OnRampController.subscribeKey("paymentCurrency", (val) => {
      if (!val || this.type === "Token") {
        return;
      }
      this.selectedCurrency = this.formatPaymentCurrency(val);
    }), OnRampController.subscribe((val) => {
      if (this.type === "Fiat") {
        this.currencies = val.purchaseCurrencies.map(this.formatPurchaseCurrency);
      } else {
        this.currencies = val.paymentCurrencies.map(this.formatPaymentCurrency);
      }
    }), AssetController.subscribe((val) => {
      this.currencyImages = { ...val.currencyImages };
      this.tokenImages = { ...val.tokenImages };
    }));
  }
  firstUpdated() {
    OnRampController.getAvailableCurrencies();
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
  }
  render() {
    const symbol = this.selectedCurrency?.symbol || "";
    const image = this.currencyImages[symbol] || this.tokenImages[symbol];
    return x`<wui-input-text type="number" size="lg" value=${this.value}>
      ${this.selectedCurrency ? x` <wui-flex
            class="currency-container"
            justifyContent="space-between"
            alignItems="center"
            gap="1"
            @click=${() => ModalController.open({ view: `OnRamp${this.type}Select` })}
          >
            <wui-image src=${o(image)}></wui-image>
            <wui-text color="primary">${this.selectedCurrency.symbol}</wui-text>
          </wui-flex>` : x`<wui-loading-spinner></wui-loading-spinner>`}
    </wui-input-text>`;
  }
  formatPaymentCurrency(currency) {
    return {
      name: currency.id,
      symbol: currency.id
    };
  }
  formatPurchaseCurrency(currency) {
    return {
      name: currency.name,
      symbol: currency.symbol
    };
  }
};
W3mInputCurrency.styles = styles$1;
__decorate$1([
  n({ type: String })
], W3mInputCurrency.prototype, "type", void 0);
__decorate$1([
  n({ type: Number })
], W3mInputCurrency.prototype, "value", void 0);
__decorate$1([
  r()
], W3mInputCurrency.prototype, "currencies", void 0);
__decorate$1([
  r()
], W3mInputCurrency.prototype, "selectedCurrency", void 0);
__decorate$1([
  r()
], W3mInputCurrency.prototype, "currencyImages", void 0);
__decorate$1([
  r()
], W3mInputCurrency.prototype, "tokenImages", void 0);
W3mInputCurrency = __decorate$1([
  customElement("w3m-onramp-input")
], W3mInputCurrency);
const styles = css`
  :host > wui-flex {
    width: 100%;
    max-width: 360px;
  }

  :host > wui-flex > wui-flex {
    border-radius: ${({ borderRadius }) => borderRadius["8"]};
    width: 100%;
  }

  .amounts-container {
    width: 100%;
  }
`;
var __decorate = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
const PAYMENT_CURRENCY_SYMBOLS = {
  USD: "$",
  EUR: "€",
  GBP: "£"
};
const BUY_PRESET_AMOUNTS = [100, 250, 500, 1e3];
let W3mOnrampWidget = class W3mOnrampWidget2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.disabled = false;
    this.caipAddress = ChainController.state.activeCaipAddress;
    this.loading = ModalController.state.loading;
    this.paymentCurrency = OnRampController.state.paymentCurrency;
    this.paymentAmount = OnRampController.state.paymentAmount;
    this.purchaseAmount = OnRampController.state.purchaseAmount;
    this.quoteLoading = OnRampController.state.quotesLoading;
    this.unsubscribe.push(...[
      ChainController.subscribeKey("activeCaipAddress", (val) => this.caipAddress = val),
      ModalController.subscribeKey("loading", (val) => {
        this.loading = val;
      }),
      OnRampController.subscribe((val) => {
        this.paymentCurrency = val.paymentCurrency;
        this.paymentAmount = val.paymentAmount;
        this.purchaseAmount = val.purchaseAmount;
        this.quoteLoading = val.quotesLoading;
      })
    ]);
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
  }
  render() {
    return x`
      <wui-flex flexDirection="column" justifyContent="center" alignItems="center">
        <wui-flex flexDirection="column" alignItems="center" gap="2">
          <w3m-onramp-input
            type="Fiat"
            @inputChange=${this.onPaymentAmountChange.bind(this)}
            .value=${this.paymentAmount || 0}
          ></w3m-onramp-input>
          <w3m-onramp-input
            type="Token"
            .value=${this.purchaseAmount || 0}
            .loading=${this.quoteLoading}
          ></w3m-onramp-input>
          <wui-flex justifyContent="space-evenly" class="amounts-container" gap="2">
            ${BUY_PRESET_AMOUNTS.map((amount) => x`<wui-button
                  variant=${this.paymentAmount === amount ? "accent-secondary" : "neutral-secondary"}
                  size="md"
                  textVariant="md-medium"
                  fullWidth
                  @click=${() => this.selectPresetAmount(amount)}
                  >${`${PAYMENT_CURRENCY_SYMBOLS[this.paymentCurrency?.id || "USD"]} ${amount}`}</wui-button
                >`)}
          </wui-flex>
          ${this.templateButton()}
        </wui-flex>
      </wui-flex>
    `;
  }
  templateButton() {
    return this.caipAddress ? x`<wui-button
          @click=${this.getQuotes.bind(this)}
          variant="accent-primary"
          fullWidth
          size="lg"
          borderRadius="xs"
        >
          Get quotes
        </wui-button>` : x`<wui-button
          @click=${this.openModal.bind(this)}
          variant="accent"
          fullWidth
          size="lg"
          borderRadius="xs"
        >
          Connect wallet
        </wui-button>`;
  }
  getQuotes() {
    if (!this.loading) {
      ModalController.open({ view: "OnRampProviders" });
    }
  }
  openModal() {
    ModalController.open({ view: "Connect" });
  }
  async onPaymentAmountChange(event) {
    OnRampController.setPaymentAmount(Number(event.detail));
    await OnRampController.getQuote();
  }
  async selectPresetAmount(amount) {
    OnRampController.setPaymentAmount(amount);
    await OnRampController.getQuote();
  }
};
W3mOnrampWidget.styles = styles;
__decorate([
  n({ type: Boolean })
], W3mOnrampWidget.prototype, "disabled", void 0);
__decorate([
  r()
], W3mOnrampWidget.prototype, "caipAddress", void 0);
__decorate([
  r()
], W3mOnrampWidget.prototype, "loading", void 0);
__decorate([
  r()
], W3mOnrampWidget.prototype, "paymentCurrency", void 0);
__decorate([
  r()
], W3mOnrampWidget.prototype, "paymentAmount", void 0);
__decorate([
  r()
], W3mOnrampWidget.prototype, "purchaseAmount", void 0);
__decorate([
  r()
], W3mOnrampWidget.prototype, "quoteLoading", void 0);
W3mOnrampWidget = __decorate([
  customElement("w3m-onramp-widget")
], W3mOnrampWidget);
export {
  W3mBuyInProgressView,
  W3mOnRampProvidersView,
  W3mOnrampFiatSelectView,
  W3mOnrampTokensView,
  W3mOnrampWidget,
  W3mWhatIsABuyView
};
