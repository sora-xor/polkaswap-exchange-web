import { n as css, r as resetStyles, o as elementStyles, q as i, x, a as ChainController, R as RouterController, G as AssetUtil, S as SnackController, m as ConnectionController, c as CoreHelperUtil } from "./walletconnect-BVoLvI4P.js";
import { n, c as customElement, r } from "./index-5878y4Sm.js";
import { o } from "./if-defined-DpCpmSxP.js";
import "./index-SiM7Ib3-.js";
import "./index-W8RzVVH7.js";
import "./index-B80WMNJI.js";
import "./index-xvpTmtDJ.js";
import "./index-Bag94m_F.js";
import "./index-CyqVuigQ.js";
import "./index-Bz3_ZVag.js";
import { E as ExchangeController } from "./ExchangeController-B7cVzwpX.js";
import "./index-Cm7UDlkl.js";
import "./index-Oesj6-8K.js";
import "./index-BNTvwCof.js";
import "./index-B9aMMm-V.js";
import "./index-73GArslZ.js";
import "./index-DAKl5XGv.js";
import "./ref-j6LTZZuR.js";
const styles$2 = css`
  button {
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
        ${({ easings }) => easings["ease-out-power-2"]};
    will-change: background-color, box-shadow;
  }

  /* -- Variants --------------------------------------------------------------- */
  button[data-type='accent'] {
    background-color: ${({ tokens }) => tokens.core.backgroundAccentPrimary};
    color: ${({ tokens }) => tokens.theme.textPrimary};
  }

  button[data-type='neutral'] {
    background-color: ${({ tokens }) => tokens.theme.foregroundSecondary};
    color: ${({ tokens }) => tokens.theme.textPrimary};
  }

  /* -- Sizes --------------------------------------------------------------- */
  button[data-size='sm'] {
    height: 24px;
  }

  button[data-size='md'] {
    height: 28px;
  }

  button[data-size='lg'] {
    height: 32px;
  }

  button[data-size='sm'] > wui-image,
  button[data-size='sm'] > wui-icon {
    width: 16px;
    height: 16px;
  }

  button[data-size='md'] > wui-image,
  button[data-size='md'] > wui-icon {
    width: 20px;
    height: 20px;
  }

  button[data-size='lg'] > wui-image,
  button[data-size='lg'] > wui-icon {
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
    button[data-type='accent']:not(:disabled):hover {
      background-color: ${({ tokens }) => tokens.core.foregroundAccent060};
    }

    button[data-type='neutral']:not(:disabled):hover {
      background-color: ${({ tokens }) => tokens.theme.foregroundTertiary};
    }
  }

  button[data-type='accent']:not(:disabled):focus-visible,
  button[data-type='accent']:not(:disabled):active {
    box-shadow: 0 0 0 4px ${({ tokens }) => tokens.core.foregroundAccent020};
  }

  button[data-type='neutral']:not(:disabled):focus-visible,
  button[data-type='neutral']:not(:disabled):active {
    box-shadow: 0 0 0 4px ${({ tokens }) => tokens.core.foregroundAccent020};
  }

  button:disabled {
    opacity: 0.5;
  }
`;
var __decorate$3 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
const FONT_BY_SIZE = {
  sm: "sm-regular",
  md: "md-regular",
  lg: "lg-regular"
};
let WuiChipButton = class WuiChipButton2 extends i {
  constructor() {
    super(...arguments);
    this.type = "accent";
    this.size = "md";
    this.imageSrc = "";
    this.disabled = false;
    this.leftIcon = void 0;
    this.rightIcon = void 0;
    this.text = "";
  }
  render() {
    return x`
      <button ?disabled=${this.disabled} data-type=${this.type} data-size=${this.size}>
        ${this.imageSrc ? x`<wui-image src=${this.imageSrc}></wui-image>` : null}
        ${this.leftIcon ? x`<wui-icon name=${this.leftIcon} color="inherit" size="inherit"></wui-icon>` : null}
        <wui-text variant=${FONT_BY_SIZE[this.size]} color="inherit">${this.text}</wui-text>
        ${this.rightIcon ? x`<wui-icon name=${this.rightIcon} color="inherit" size="inherit"></wui-icon>` : null}
      </button>
    `;
  }
};
WuiChipButton.styles = [resetStyles, elementStyles, styles$2];
__decorate$3([
  n()
], WuiChipButton.prototype, "type", void 0);
__decorate$3([
  n()
], WuiChipButton.prototype, "size", void 0);
__decorate$3([
  n()
], WuiChipButton.prototype, "imageSrc", void 0);
__decorate$3([
  n({ type: Boolean })
], WuiChipButton.prototype, "disabled", void 0);
__decorate$3([
  n()
], WuiChipButton.prototype, "leftIcon", void 0);
__decorate$3([
  n()
], WuiChipButton.prototype, "rightIcon", void 0);
__decorate$3([
  n()
], WuiChipButton.prototype, "text", void 0);
WuiChipButton = __decorate$3([
  customElement("wui-chip-button")
], WuiChipButton);
var __decorate$2 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mFundInput = class W3mFundInput2 extends i {
  constructor() {
    super(...arguments);
    this.maxDecimals = void 0;
    this.maxIntegers = void 0;
  }
  render() {
    return x`
      <wui-flex alignItems="center" gap="1">
        <wui-input-amount
          widthVariant="fit"
          fontSize="h2"
          .maxDecimals=${o(this.maxDecimals)}
          .maxIntegers=${o(this.maxIntegers)}
          .value=${this.amount ? String(this.amount) : ""}
        ></wui-input-amount>
        <wui-text variant="md-regular" color="secondary">USD</wui-text>
      </wui-flex>
    `;
  }
};
__decorate$2([
  n({ type: Number })
], W3mFundInput.prototype, "amount", void 0);
__decorate$2([
  n({ type: Number })
], W3mFundInput.prototype, "maxDecimals", void 0);
__decorate$2([
  n({ type: Number })
], W3mFundInput.prototype, "maxIntegers", void 0);
W3mFundInput = __decorate$2([
  customElement("w3m-fund-input")
], W3mFundInput);
const styles$1 = css`
  .amount-input-container {
    border-radius: ${({ borderRadius }) => borderRadius["6"]};
    border-top-right-radius: 0;
    border-top-left-radius: 0;
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
    padding: ${({ spacing }) => spacing[1]};
  }

  .container {
    border-radius: 30px;
  }
`;
var __decorate$1 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
const PRESET_AMOUNTS = [10, 50, 100];
const MAX_DECIMALS = 6;
const MAX_INTEGERS = 10;
let W3mDepositFromExchangeView = class W3mDepositFromExchangeView2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.network = ChainController.state.activeCaipNetwork;
    this.exchanges = ExchangeController.state.exchanges;
    this.isLoading = ExchangeController.state.isLoading;
    this.amount = ExchangeController.state.amount;
    this.tokenAmount = ExchangeController.state.tokenAmount;
    this.priceLoading = ExchangeController.state.priceLoading;
    this.isPaymentInProgress = ExchangeController.state.isPaymentInProgress;
    this.currentPayment = ExchangeController.state.currentPayment;
    this.paymentId = ExchangeController.state.paymentId;
    this.paymentAsset = ExchangeController.state.paymentAsset;
    this.unsubscribe.push(ChainController.subscribeKey("activeCaipNetwork", (val) => {
      this.network = val;
      this.setDefaultPaymentAsset();
    }), ExchangeController.subscribe((exchangeState) => {
      this.exchanges = exchangeState.exchanges;
      this.isLoading = exchangeState.isLoading;
      this.amount = exchangeState.amount;
      this.tokenAmount = exchangeState.tokenAmount;
      this.priceLoading = exchangeState.priceLoading;
      this.paymentId = exchangeState.paymentId;
      this.isPaymentInProgress = exchangeState.isPaymentInProgress;
      this.currentPayment = exchangeState.currentPayment;
      this.paymentAsset = exchangeState.paymentAsset;
      const shouldHandlePaymentInProgress = exchangeState.isPaymentInProgress && exchangeState.currentPayment?.exchangeId && exchangeState.currentPayment?.sessionId && exchangeState.paymentId;
      if (shouldHandlePaymentInProgress) {
        this.handlePaymentInProgress();
      }
    }));
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
    const isInProgress = ExchangeController.state.isPaymentInProgress;
    if (!isInProgress) {
      ExchangeController.reset();
    }
  }
  async firstUpdated() {
    await this.getPaymentAssets();
    if (!this.paymentAsset) {
      await this.setDefaultPaymentAsset();
    }
    ExchangeController.setAmount(PRESET_AMOUNTS[0]);
    await ExchangeController.fetchExchanges();
  }
  render() {
    return x`
      <wui-flex flexDirection="column" class="container">
        ${this.amountInputTemplate()} ${this.exchangesTemplate()}
      </wui-flex>
    `;
  }
  exchangesLoadingTemplate() {
    return Array.from({ length: 2 }).map(() => x`<wui-shimmer width="100%" height="65px" borderRadius="xxs"></wui-shimmer>`);
  }
  _exchangesTemplate() {
    return this.exchanges.length > 0 ? this.exchanges.map((exchange) => x`<wui-list-item
              @click=${() => this.onExchangeClick(exchange)}
              chevron
              variant="image"
              imageSrc=${exchange.imageUrl}
              ?loading=${this.isLoading}
            >
              <wui-text variant="md-regular" color="primary">
                Deposit from ${exchange.name}
              </wui-text>
            </wui-list-item>`) : x`<wui-flex flexDirection="column" alignItems="center" gap="4" padding="4">
          <wui-text variant="lg-medium" align="center" color="primary">
            No exchanges support this asset on this network
          </wui-text>
        </wui-flex>`;
  }
  exchangesTemplate() {
    return x`<wui-flex
      flexDirection="column"
      gap="2"
      .padding=${["3", "3", "3", "3"]}
      class="exchanges-container"
    >
      ${this.isLoading ? this.exchangesLoadingTemplate() : this._exchangesTemplate()}
    </wui-flex>`;
  }
  amountInputTemplate() {
    return x`
      <wui-flex
        flexDirection="column"
        .padding=${["0", "3", "3", "3"]}
        class="amount-input-container"
      >
        <wui-flex
          justifyContent="space-between"
          alignItems="center"
          .margin=${["0", "0", "6", "0"]}
        >
          <wui-text variant="md-medium" color="secondary">Asset</wui-text>
          <wui-token-button
            data-testid="deposit-from-exchange-asset-button"
            flexDirection="row-reverse"
            text=${this.paymentAsset?.metadata.symbol || ""}
            imageSrc=${this.paymentAsset?.metadata.iconUrl || ""}
            @click=${() => RouterController.push("PayWithExchangeSelectAsset")}
            size="lg"
            .chainImageSrc=${o(AssetUtil.getNetworkImage(this.network))}
          >
          </wui-token-button>
        </wui-flex>
        <wui-flex
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          .margin=${["0", "0", "4", "0"]}
        >
          <w3m-fund-input
            @inputChange=${this.onAmountChange.bind(this)}
            .amount=${this.amount}
            .maxDecimals=${MAX_DECIMALS}
            .maxIntegers=${MAX_INTEGERS}
          >
          </w3m-fund-input>
          ${this.tokenAmountTemplate()}
        </wui-flex>
        <wui-flex justifyContent="center" gap="2">
          ${PRESET_AMOUNTS.map((amount) => x`<wui-chip-button
                @click=${() => ExchangeController.setAmount(amount)}
                type="neutral"
                size="lg"
                text=${`$${amount}`}
              ></wui-chip-button>`)}
        </wui-flex>
      </wui-flex>
    `;
  }
  tokenAmountTemplate() {
    if (this.priceLoading) {
      return x`<wui-shimmer
        width="65px"
        height="20px"
        borderRadius="xxs"
        variant="light"
      ></wui-shimmer>`;
    }
    return x`
      <wui-text variant="md-regular" color="secondary">
        ${this.tokenAmount.toFixed(4)} ${this.paymentAsset?.metadata.symbol}
      </wui-text>
    `;
  }
  async onExchangeClick(exchange) {
    if (!this.amount) {
      SnackController.showError("Please enter an amount");
      return;
    }
    await ExchangeController.handlePayWithExchange(exchange.id);
  }
  handlePaymentInProgress() {
    const namespace = ChainController.state.activeChain;
    const { redirectView = "Account" } = RouterController.state.data ?? {};
    if (this.isPaymentInProgress && this.currentPayment?.exchangeId && this.currentPayment?.sessionId && this.paymentId) {
      ExchangeController.waitUntilComplete({
        exchangeId: this.currentPayment.exchangeId,
        sessionId: this.currentPayment.sessionId,
        paymentId: this.paymentId
      }).then((status) => {
        if (status.status === "SUCCESS") {
          SnackController.showSuccess("Deposit completed");
          ExchangeController.reset();
          if (namespace) {
            ChainController.fetchTokenBalance();
            ConnectionController.updateBalance(namespace);
          }
          RouterController.replace("Transactions");
        } else if (status.status === "FAILED") {
          SnackController.showError("Deposit failed");
        }
      });
      SnackController.showLoading("Deposit in progress...");
      RouterController.replace(redirectView);
    }
  }
  onAmountChange({ detail }) {
    ExchangeController.setAmount(detail ? Number(detail) : null);
  }
  async getPaymentAssets() {
    if (this.network) {
      await ExchangeController.getAssetsForNetwork(this.network.caipNetworkId);
    }
  }
  async setDefaultPaymentAsset() {
    if (this.network) {
      const paymentAssets = await ExchangeController.getAssetsForNetwork(this.network.caipNetworkId);
      if (paymentAssets[0]) {
        ExchangeController.setPaymentAsset(paymentAssets[0]);
      }
    }
  }
};
W3mDepositFromExchangeView.styles = styles$1;
__decorate$1([
  r()
], W3mDepositFromExchangeView.prototype, "network", void 0);
__decorate$1([
  r()
], W3mDepositFromExchangeView.prototype, "exchanges", void 0);
__decorate$1([
  r()
], W3mDepositFromExchangeView.prototype, "isLoading", void 0);
__decorate$1([
  r()
], W3mDepositFromExchangeView.prototype, "amount", void 0);
__decorate$1([
  r()
], W3mDepositFromExchangeView.prototype, "tokenAmount", void 0);
__decorate$1([
  r()
], W3mDepositFromExchangeView.prototype, "priceLoading", void 0);
__decorate$1([
  r()
], W3mDepositFromExchangeView.prototype, "isPaymentInProgress", void 0);
__decorate$1([
  r()
], W3mDepositFromExchangeView.prototype, "currentPayment", void 0);
__decorate$1([
  r()
], W3mDepositFromExchangeView.prototype, "paymentId", void 0);
__decorate$1([
  r()
], W3mDepositFromExchangeView.prototype, "paymentAsset", void 0);
W3mDepositFromExchangeView = __decorate$1([
  customElement("w3m-deposit-from-exchange-view")
], W3mDepositFromExchangeView);
const styles = css`
  .contentContainer {
    height: 440px;
    overflow: scroll;
    scrollbar-width: none;
  }

  .contentContainer::-webkit-scrollbar {
    display: none;
  }

  wui-icon-box {
    width: 40px;
    height: 40px;
    border-radius: ${({ borderRadius }) => borderRadius["3"]};
  }
`;
var __decorate = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mDepositFromExchangeSelectAssetView = class W3mDepositFromExchangeSelectAssetView2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.assets = ExchangeController.state.assets;
    this.search = "";
    this.onDebouncedSearch = CoreHelperUtil.debounce((value) => {
      this.search = value;
    });
    this.unsubscribe.push(...[
      ExchangeController.subscribe((val) => {
        this.assets = val.assets;
      })
    ]);
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
  }
  render() {
    return x`
      <wui-flex flexDirection="column">
        ${this.templateSearchInput()} <wui-separator></wui-separator> ${this.templateTokens()}
      </wui-flex>
    `;
  }
  templateSearchInput() {
    return x`
      <wui-flex gap="2" padding="3">
        <wui-input-text
          @inputChange=${this.onInputChange.bind(this)}
          class="network-search-input"
          size="sm"
          placeholder="Search token"
          icon="search"
        ></wui-input-text>
      </wui-flex>
    `;
  }
  templateTokens() {
    const filteredAssets = this.assets.filter((asset) => asset.metadata.name.toLowerCase().includes(this.search.toLowerCase()));
    const hasAssets = filteredAssets.length > 0;
    return x`
      <wui-flex
        class="contentContainer"
        flexDirection="column"
        .padding=${["0", "3", "0", "3"]}
      >
        <wui-flex justifyContent="flex-start" .padding=${["4", "3", "3", "3"]}>
          <wui-text variant="md-medium" color="secondary">Available tokens</wui-text>
        </wui-flex>
        <wui-flex flexDirection="column" gap="2">
          ${hasAssets ? filteredAssets.map((asset) => x`<wui-list-item
                    .imageSrc=${asset.metadata.iconUrl}
                    ?clickable=${true}
                    @click=${this.handleTokenClick.bind(this, asset)}
                  >
                    <wui-text variant="md-medium" color="primary">${asset.metadata.name}</wui-text>
                    <wui-text variant="md-regular" color="secondary"
                      >${asset.metadata.symbol}</wui-text
                    >
                  </wui-list-item>`) : x`<wui-flex
                .padding=${["20", "0", "0", "0"]}
                alignItems="center"
                flexDirection="column"
                gap="4"
              >
                <wui-icon-box icon="coinPlaceholder" color="default" size="lg"></wui-icon-box>
                <wui-flex
                  class="textContent"
                  gap="2"
                  flexDirection="column"
                  justifyContent="center"
                >
                  <wui-text variant="lg-medium" align="center" color="primary">
                    No tokens found
                  </wui-text>
                </wui-flex>
                <wui-link @click=${this.onBuyClick.bind(this)}>Buy</wui-link>
              </wui-flex>`}
        </wui-flex>
      </wui-flex>
    `;
  }
  onBuyClick() {
    RouterController.push("OnRampProviders");
  }
  onInputChange(event) {
    this.onDebouncedSearch(event.detail);
  }
  handleTokenClick(asset) {
    ExchangeController.setPaymentAsset(asset);
    RouterController.goBack();
  }
};
W3mDepositFromExchangeSelectAssetView.styles = styles;
__decorate([
  r()
], W3mDepositFromExchangeSelectAssetView.prototype, "assets", void 0);
__decorate([
  r()
], W3mDepositFromExchangeSelectAssetView.prototype, "search", void 0);
W3mDepositFromExchangeSelectAssetView = __decorate([
  customElement("w3m-deposit-from-exchange-select-asset-view")
], W3mDepositFromExchangeSelectAssetView);
export {
  W3mDepositFromExchangeSelectAssetView,
  W3mDepositFromExchangeView
};
