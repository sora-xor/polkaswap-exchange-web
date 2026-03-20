import { n as css, q as i, a as ChainController, N as NumberUtil, x, h as ConstantsUtil, b as EventsController, R as RouterController, c as CoreHelperUtil, M as ModalController, u as getPreferredAccountType, W as W3mFrameRpcConstants, r as resetStyles, o as elementStyles } from "./walletconnect-BVoLvI4P.js";
import { r, n, c as customElement } from "./index-5878y4Sm.js";
import "./index-Bag94m_F.js";
import "./index-Cm7UDlkl.js";
import "./index-B6Sdk_ow.js";
import { S as SwapController } from "./SwapController-BZ4iHZ-m.js";
import "./index-xvpTmtDJ.js";
import "./index-DhutyWBy.js";
import { M as MathUtil } from "./MathUtil-BspOY7Kj.js";
import "./index-Oesj6-8K.js";
import "./index-SiM7Ib3-.js";
import "./index-73GArslZ.js";
import "./index-DAKl5XGv.js";
import "./if-defined-DpCpmSxP.js";
import "./ref-j6LTZZuR.js";
const InputUtil = {
  numericInputKeyDown(event, currentValue, onChange) {
    const allowedKeys = [
      "Backspace",
      "Meta",
      "Ctrl",
      "a",
      "A",
      "c",
      "C",
      "x",
      "X",
      "v",
      "V",
      "ArrowLeft",
      "ArrowRight",
      "Tab"
    ];
    const controlPressed = event.metaKey || event.ctrlKey;
    const eventKey = event.key;
    const lowercaseEventKey = eventKey.toLocaleLowerCase();
    const selectAll = lowercaseEventKey === "a";
    const copyKey = lowercaseEventKey === "c";
    const pasteKey = lowercaseEventKey === "v";
    const cutKey = lowercaseEventKey === "x";
    const isComma = eventKey === ",";
    const isDot = eventKey === ".";
    const isNumericKey = eventKey >= "0" && eventKey <= "9";
    if (!controlPressed && (selectAll || copyKey || pasteKey || cutKey)) {
      event.preventDefault();
    }
    if (currentValue === "0" && !isComma && !isDot && eventKey === "0") {
      event.preventDefault();
    }
    if (currentValue === "0" && isNumericKey) {
      onChange(eventKey);
      event.preventDefault();
    }
    if (isComma || isDot) {
      if (!currentValue) {
        onChange("0.");
        event.preventDefault();
      }
      if (currentValue?.includes(".") || currentValue?.includes(",")) {
        event.preventDefault();
      }
    }
    if (!isNumericKey && !allowedKeys.includes(eventKey) && !isDot && !isComma) {
      event.preventDefault();
    }
  }
};
const styles$7 = css`
  :host {
    width: 100%;
  }

  .details-container > wui-flex {
    background: ${({ tokens }) => tokens.theme.foregroundPrimary};
    border-radius: ${({ borderRadius }) => borderRadius["3"]};
    width: 100%;
  }

  .details-container > wui-flex > button {
    border: none;
    background: none;
    padding: ${({ spacing }) => spacing["3"]};
    border-radius: ${({ borderRadius }) => borderRadius["3"]};
    cursor: pointer;
  }

  .details-content-container {
    padding: ${({ spacing }) => spacing["2"]};
    padding-top: 0px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .details-content-container > wui-flex {
    width: 100%;
  }

  .details-row {
    width: 100%;
    padding: ${({ spacing }) => spacing["3"]};
    padding-left: ${({ spacing }) => spacing["3"]};
    padding-right: ${({ spacing }) => spacing["2"]};
    border-radius: calc(
      ${({ borderRadius }) => borderRadius["1"]} + ${({ borderRadius }) => borderRadius["1"]}
    );
    background: ${({ tokens }) => tokens.theme.foregroundPrimary};
  }

  .details-row-title {
    white-space: nowrap;
  }

  .details-row.provider-free-row {
    padding-right: ${({ spacing }) => spacing["2"]};
  }
`;
var __decorate$7 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
const slippageRate = ConstantsUtil.CONVERT_SLIPPAGE_TOLERANCE;
let WuiSwapDetails = class WuiSwapDetails2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.networkName = ChainController.state.activeCaipNetwork?.name;
    this.detailsOpen = false;
    this.sourceToken = SwapController.state.sourceToken;
    this.toToken = SwapController.state.toToken;
    this.toTokenAmount = SwapController.state.toTokenAmount;
    this.sourceTokenPriceInUSD = SwapController.state.sourceTokenPriceInUSD;
    this.toTokenPriceInUSD = SwapController.state.toTokenPriceInUSD;
    this.priceImpact = SwapController.state.priceImpact;
    this.maxSlippage = SwapController.state.maxSlippage;
    this.networkTokenSymbol = SwapController.state.networkTokenSymbol;
    this.inputError = SwapController.state.inputError;
    this.unsubscribe.push(...[
      SwapController.subscribe((newState) => {
        this.sourceToken = newState.sourceToken;
        this.toToken = newState.toToken;
        this.toTokenAmount = newState.toTokenAmount;
        this.priceImpact = newState.priceImpact;
        this.maxSlippage = newState.maxSlippage;
        this.sourceTokenPriceInUSD = newState.sourceTokenPriceInUSD;
        this.toTokenPriceInUSD = newState.toTokenPriceInUSD;
        this.inputError = newState.inputError;
      })
    ]);
  }
  render() {
    const minReceivedAmount = this.toTokenAmount && this.maxSlippage ? NumberUtil.bigNumber(this.toTokenAmount).minus(this.maxSlippage).toString() : null;
    if (!this.sourceToken || !this.toToken || this.inputError) {
      return null;
    }
    const toTokenSwappedAmount = this.sourceTokenPriceInUSD && this.toTokenPriceInUSD ? 1 / this.toTokenPriceInUSD * this.sourceTokenPriceInUSD : 0;
    return x`
      <wui-flex flexDirection="column" alignItems="center" gap="01" class="details-container">
        <wui-flex flexDirection="column">
          <button @click=${this.toggleDetails.bind(this)}>
            <wui-flex justifyContent="space-between" .padding=${["0", "2", "0", "2"]}>
              <wui-flex justifyContent="flex-start" flexGrow="1" gap="2">
                <wui-text variant="sm-regular" color="primary">
                  1 ${this.sourceToken.symbol} =
                  ${NumberUtil.formatNumberToLocalString(toTokenSwappedAmount, 3)}
                  ${this.toToken.symbol}
                </wui-text>
                <wui-text variant="sm-regular" color="secondary">
                  $${NumberUtil.formatNumberToLocalString(this.sourceTokenPriceInUSD)}
                </wui-text>
              </wui-flex>
              <wui-icon name="chevronBottom"></wui-icon>
            </wui-flex>
          </button>
          ${this.detailsOpen ? x`
                <wui-flex flexDirection="column" gap="2" class="details-content-container">
                  ${this.priceImpact ? x` <wui-flex flexDirection="column" gap="2">
                        <wui-flex
                          justifyContent="space-between"
                          alignItems="center"
                          class="details-row"
                        >
                          <wui-flex alignItems="center" gap="2">
                            <wui-text
                              class="details-row-title"
                              variant="sm-regular"
                              color="secondary"
                            >
                              Price impact
                            </wui-text>
                            <w3m-tooltip-trigger
                              text="Price impact reflects the change in market price due to your trade"
                            >
                              <wui-icon size="sm" color="default" name="info"></wui-icon>
                            </w3m-tooltip-trigger>
                          </wui-flex>
                          <wui-flex>
                            <wui-text variant="sm-regular" color="secondary">
                              ${NumberUtil.formatNumberToLocalString(this.priceImpact, 3)}%
                            </wui-text>
                          </wui-flex>
                        </wui-flex>
                      </wui-flex>` : null}
                  ${this.maxSlippage && this.sourceToken.symbol ? x`<wui-flex flexDirection="column" gap="2">
                        <wui-flex
                          justifyContent="space-between"
                          alignItems="center"
                          class="details-row"
                        >
                          <wui-flex alignItems="center" gap="2">
                            <wui-text
                              class="details-row-title"
                              variant="sm-regular"
                              color="secondary"
                            >
                              Max. slippage
                            </wui-text>
                            <w3m-tooltip-trigger
                              text=${`Max slippage sets the minimum amount you must receive for the transaction to proceed. ${minReceivedAmount ? `Transaction will be reversed if you receive less than ${NumberUtil.formatNumberToLocalString(minReceivedAmount, 6)} ${this.toToken.symbol} due to price changes.` : ""}`}
                            >
                              <wui-icon size="sm" color="default" name="info"></wui-icon>
                            </w3m-tooltip-trigger>
                          </wui-flex>
                          <wui-flex>
                            <wui-text variant="sm-regular" color="secondary">
                              ${NumberUtil.formatNumberToLocalString(this.maxSlippage, 6)}
                              ${this.toToken.symbol} ${slippageRate}%
                            </wui-text>
                          </wui-flex>
                        </wui-flex>
                      </wui-flex>` : null}
                  <wui-flex flexDirection="column" gap="2">
                    <wui-flex
                      justifyContent="space-between"
                      alignItems="center"
                      class="details-row provider-free-row"
                    >
                      <wui-flex alignItems="center" gap="2">
                        <wui-text class="details-row-title" variant="sm-regular" color="secondary">
                          Provider fee
                        </wui-text>
                      </wui-flex>
                      <wui-flex>
                        <wui-text variant="sm-regular" color="secondary">0.85%</wui-text>
                      </wui-flex>
                    </wui-flex>
                  </wui-flex>
                </wui-flex>
              ` : null}
        </wui-flex>
      </wui-flex>
    `;
  }
  toggleDetails() {
    this.detailsOpen = !this.detailsOpen;
  }
};
WuiSwapDetails.styles = [styles$7];
__decorate$7([
  r()
], WuiSwapDetails.prototype, "networkName", void 0);
__decorate$7([
  n()
], WuiSwapDetails.prototype, "detailsOpen", void 0);
__decorate$7([
  r()
], WuiSwapDetails.prototype, "sourceToken", void 0);
__decorate$7([
  r()
], WuiSwapDetails.prototype, "toToken", void 0);
__decorate$7([
  r()
], WuiSwapDetails.prototype, "toTokenAmount", void 0);
__decorate$7([
  r()
], WuiSwapDetails.prototype, "sourceTokenPriceInUSD", void 0);
__decorate$7([
  r()
], WuiSwapDetails.prototype, "toTokenPriceInUSD", void 0);
__decorate$7([
  r()
], WuiSwapDetails.prototype, "priceImpact", void 0);
__decorate$7([
  r()
], WuiSwapDetails.prototype, "maxSlippage", void 0);
__decorate$7([
  r()
], WuiSwapDetails.prototype, "networkTokenSymbol", void 0);
__decorate$7([
  r()
], WuiSwapDetails.prototype, "inputError", void 0);
WuiSwapDetails = __decorate$7([
  customElement("w3m-swap-details")
], WuiSwapDetails);
const styles$6 = css`
  :host {
    width: 100%;
  }

  :host > wui-flex {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    border-radius: ${({ borderRadius }) => borderRadius["5"]};
    padding: ${({ spacing }) => spacing["5"]};
    padding-right: ${({ spacing }) => spacing["3"]};
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
    box-shadow: inset 0px 0px 0px 1px ${({ tokens }) => tokens.theme.foregroundPrimary};
    width: 100%;
    height: 100px;
    box-sizing: border-box;
    position: relative;
  }

  wui-shimmer.market-value {
    opacity: 0;
  }

  :host > wui-flex > svg.input_mask {
    position: absolute;
    inset: 0;
    z-index: 5;
  }

  :host wui-flex .input_mask__border,
  :host wui-flex .input_mask__background {
    transition: fill ${({ durations }) => durations["md"]}
      ${({ easings }) => easings["ease-out-power-1"]};
    will-change: fill;
  }

  :host wui-flex .input_mask__border {
    fill: ${({ tokens }) => tokens.core.glass010};
  }

  :host wui-flex .input_mask__background {
    fill: ${({ tokens }) => tokens.theme.foregroundPrimary};
  }
`;
var __decorate$6 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mSwapInputSkeleton = class W3mSwapInputSkeleton2 extends i {
  constructor() {
    super(...arguments);
    this.target = "sourceToken";
  }
  render() {
    return x`
      <wui-flex class justifyContent="space-between">
        <wui-flex
          flex="1"
          flexDirection="column"
          alignItems="flex-start"
          justifyContent="center"
          class="swap-input"
          gap="1"
        >
          <wui-shimmer width="80px" height="40px" rounded variant="light"></wui-shimmer>
        </wui-flex>
        ${this.templateTokenSelectButton()}
      </wui-flex>
    `;
  }
  templateTokenSelectButton() {
    return x`
      <wui-flex
        class="swap-token-button"
        flexDirection="column"
        alignItems="flex-end"
        justifyContent="center"
        gap="1"
      >
        <wui-shimmer width="80px" height="40px" rounded variant="light"></wui-shimmer>
      </wui-flex>
    `;
  }
};
W3mSwapInputSkeleton.styles = [styles$6];
__decorate$6([
  n()
], W3mSwapInputSkeleton.prototype, "target", void 0);
W3mSwapInputSkeleton = __decorate$6([
  customElement("w3m-swap-input-skeleton")
], W3mSwapInputSkeleton);
const styles$5 = css`
  :host > wui-flex {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    border-radius: ${({ borderRadius }) => borderRadius["5"]};
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
    padding: ${({ spacing }) => spacing["5"]};
    padding-right: ${({ spacing }) => spacing["3"]};
    width: 100%;
    height: 100px;
    box-sizing: border-box;
    box-shadow: inset 0px 0px 0px 1px ${({ tokens }) => tokens.theme.foregroundPrimary};
    position: relative;
    transition: box-shadow ${({ easings }) => easings["ease-out-power-1"]}
      ${({ durations }) => durations["lg"]};
    will-change: background-color;
  }

  :host wui-flex.focus {
    box-shadow: inset 0px 0px 0px 1px ${({ tokens }) => tokens.core.glass010};
  }

  :host > wui-flex .swap-input,
  :host > wui-flex .swap-token-button {
    z-index: 10;
  }

  :host > wui-flex .swap-input {
    -webkit-mask-image: linear-gradient(
      270deg,
      transparent 0px,
      transparent 8px,
      black 24px,
      black 25px,
      black 32px,
      black 100%
    );
    mask-image: linear-gradient(
      270deg,
      transparent 0px,
      transparent 8px,
      black 24px,
      black 25px,
      black 32px,
      black 100%
    );
  }

  :host > wui-flex .swap-input input {
    background: none;
    border: none;
    height: 42px;
    width: 100%;
    font-size: 32px;
    font-style: normal;
    font-weight: 400;
    line-height: 130%;
    letter-spacing: -1.28px;
    outline: none;
    caret-color: ${({ tokens }) => tokens.core.textAccentPrimary};
    color: ${({ tokens }) => tokens.theme.textPrimary};
    padding: 0px;
  }

  :host > wui-flex .swap-input input:focus-visible {
    outline: none;
  }

  :host > wui-flex .swap-input input::-webkit-outer-spin-button,
  :host > wui-flex .swap-input input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .max-value-button {
    background-color: transparent;
    border: none;
    cursor: pointer;
    color: ${({ tokens }) => tokens.core.glass010};
    padding-left: 0px;
  }

  .market-value {
    min-height: 18px;
  }
`;
var __decorate$5 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
const MINIMUM_USD_VALUE_TO_CONVERT = 5e-5;
let W3mSwapInput = class W3mSwapInput2 extends i {
  constructor() {
    super(...arguments);
    this.focused = false;
    this.price = 0;
    this.target = "sourceToken";
    this.onSetAmount = null;
    this.onSetMaxValue = null;
  }
  render() {
    const marketValue = this.marketValue || "0";
    const isMarketValueGreaterThanZero = NumberUtil.bigNumber(marketValue).gt("0");
    return x`
      <wui-flex
        class="${this.focused ? "focus" : ""}"
        justifyContent="space-between"
        alignItems="center"
      >
        <wui-flex
          flex="1"
          flexDirection="column"
          alignItems="flex-start"
          justifyContent="center"
          class="swap-input"
        >
          <input
            data-testid="swap-input-${this.target}"
            @focusin=${() => this.onFocusChange(true)}
            @focusout=${() => this.onFocusChange(false)}
            ?disabled=${this.disabled}
            value=${this.value || ""}
            @input=${this.dispatchInputChangeEvent}
            @keydown=${this.handleKeydown}
            placeholder="0"
            type="text"
            inputmode="decimal"
            pattern="[0-9,.]*"
          />
          <wui-text class="market-value" variant="sm-regular" color="secondary">
            ${isMarketValueGreaterThanZero ? `$${NumberUtil.formatNumberToLocalString(this.marketValue, 2)}` : null}
          </wui-text>
        </wui-flex>
        ${this.templateTokenSelectButton()}
      </wui-flex>
    `;
  }
  handleKeydown(event) {
    return InputUtil.numericInputKeyDown(event, this.value, (value) => this.onSetAmount?.(this.target, value));
  }
  dispatchInputChangeEvent(event) {
    if (!this.onSetAmount) {
      return;
    }
    const value = event.target.value.replace(/[^0-9.]/gu, "");
    if (value === "," || value === ".") {
      this.onSetAmount(this.target, "0.");
    } else if (value.endsWith(",")) {
      this.onSetAmount(this.target, value.replace(",", "."));
    } else {
      this.onSetAmount(this.target, value);
    }
  }
  setMaxValueToInput() {
    this.onSetMaxValue?.(this.target, this.balance);
  }
  templateTokenSelectButton() {
    if (!this.token) {
      return x` <wui-button
        data-testid="swap-select-token-button-${this.target}"
        class="swap-token-button"
        size="md"
        variant="neutral-secondary"
        @click=${this.onSelectToken.bind(this)}
      >
        Select token
      </wui-button>`;
    }
    return x`
      <wui-flex
        class="swap-token-button"
        flexDirection="column"
        alignItems="flex-end"
        justifyContent="center"
        gap="1"
      >
        <wui-token-button
          data-testid="swap-input-token-${this.target}"
          text=${this.token.symbol}
          imageSrc=${this.token.logoUri}
          @click=${this.onSelectToken.bind(this)}
        >
        </wui-token-button>
        <wui-flex alignItems="center" gap="1"> ${this.tokenBalanceTemplate()} </wui-flex>
      </wui-flex>
    `;
  }
  tokenBalanceTemplate() {
    const balanceValueInUSD = NumberUtil.multiply(this.balance, this.price);
    const haveBalance = balanceValueInUSD ? balanceValueInUSD?.gt(MINIMUM_USD_VALUE_TO_CONVERT) : false;
    return x`
      ${haveBalance ? x`<wui-text variant="sm-regular" color="secondary">
            ${NumberUtil.formatNumberToLocalString(this.balance, 2)}
          </wui-text>` : null}
      ${this.target === "sourceToken" ? this.tokenActionButtonTemplate(haveBalance) : null}
    `;
  }
  tokenActionButtonTemplate(haveBalance) {
    if (haveBalance) {
      return x` <button class="max-value-button" @click=${this.setMaxValueToInput.bind(this)}>
        <wui-text color="accent-primary" variant="sm-medium">Max</wui-text>
      </button>`;
    }
    return x` <button class="max-value-button" @click=${this.onBuyToken.bind(this)}>
      <wui-text color="accent-primary" variant="sm-medium">Buy</wui-text>
    </button>`;
  }
  onFocusChange(state) {
    this.focused = state;
  }
  onSelectToken() {
    EventsController.sendEvent({ type: "track", event: "CLICK_SELECT_TOKEN_TO_SWAP" });
    RouterController.push("SwapSelectToken", {
      target: this.target
    });
  }
  onBuyToken() {
    RouterController.push("OnRampProviders");
  }
};
W3mSwapInput.styles = [styles$5];
__decorate$5([
  n()
], W3mSwapInput.prototype, "focused", void 0);
__decorate$5([
  n()
], W3mSwapInput.prototype, "balance", void 0);
__decorate$5([
  n()
], W3mSwapInput.prototype, "value", void 0);
__decorate$5([
  n()
], W3mSwapInput.prototype, "price", void 0);
__decorate$5([
  n()
], W3mSwapInput.prototype, "marketValue", void 0);
__decorate$5([
  n()
], W3mSwapInput.prototype, "disabled", void 0);
__decorate$5([
  n()
], W3mSwapInput.prototype, "target", void 0);
__decorate$5([
  n()
], W3mSwapInput.prototype, "token", void 0);
__decorate$5([
  n()
], W3mSwapInput.prototype, "onSetAmount", void 0);
__decorate$5([
  n()
], W3mSwapInput.prototype, "onSetMaxValue", void 0);
W3mSwapInput = __decorate$5([
  customElement("w3m-swap-input")
], W3mSwapInput);
const styles$4 = css`
  :host > wui-flex:first-child {
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;
  }

  :host > wui-flex:first-child::-webkit-scrollbar {
    display: none;
  }

  wui-loading-hexagon {
    position: absolute;
  }

  .action-button {
    width: 100%;
    border-radius: ${({ borderRadius }) => borderRadius["4"]};
  }

  .action-button:disabled {
    border-color: 1px solid ${({ tokens }) => tokens.core.glass010};
  }

  .swap-inputs-container {
    position: relative;
  }

  wui-icon-box {
    width: 32px;
    height: 32px;
    border-radius: ${({ borderRadius }) => borderRadius["10"]} !important;
    border: 4px solid ${({ tokens }) => tokens.theme.backgroundPrimary};
    background: ${({ tokens }) => tokens.theme.foregroundPrimary};
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 3;
  }

  .replace-tokens-button-container {
    display: flex;
    justify-content: center;
    align-items: center;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    gap: ${({ spacing }) => spacing["2"]};
    border-radius: ${({ borderRadius }) => borderRadius["4"]};
    background-color: ${({ tokens }) => tokens.theme.backgroundPrimary};
    padding: ${({ spacing }) => spacing["2"]};
  }

  .details-container > wui-flex {
    background: ${({ tokens }) => tokens.theme.foregroundPrimary};
    border-radius: ${({ borderRadius }) => borderRadius["3"]};
    width: 100%;
  }

  .details-container > wui-flex > button {
    border: none;
    background: none;
    padding: ${({ spacing }) => spacing["3"]};
    border-radius: ${({ borderRadius }) => borderRadius["3"]};
    transition: background ${({ durations }) => durations["lg"]}
      ${({ easings }) => easings["ease-out-power-2"]};
    will-change: background;
  }

  .details-container > wui-flex > button:hover {
    background: ${({ tokens }) => tokens.theme.foregroundPrimary};
  }

  .details-content-container {
    padding: ${({ spacing }) => spacing["2"]};
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .details-content-container > wui-flex {
    width: 100%;
  }

  .details-row {
    width: 100%;
    padding: ${({ spacing }) => spacing["3"]} ${({ spacing }) => spacing["5"]};
    border-radius: ${({ borderRadius }) => borderRadius["3"]};
    background: ${({ tokens }) => tokens.theme.foregroundPrimary};
  }
`;
var __decorate$4 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mSwapView = class W3mSwapView2 extends i {
  subscribe({ resetSwapState, initializeSwapState }) {
    return () => {
      ChainController.subscribeKey("activeCaipNetwork", (newCaipNetwork) => this.onCaipNetworkChange({
        newCaipNetwork,
        resetSwapState,
        initializeSwapState
      }));
      ChainController.subscribeChainProp("accountState", (val) => {
        this.onCaipAddressChange({
          newCaipAddress: val?.caipAddress,
          resetSwapState,
          initializeSwapState
        });
      });
    };
  }
  constructor() {
    super();
    this.unsubscribe = [];
    this.initialParams = RouterController.state.data?.swap;
    this.detailsOpen = false;
    this.caipAddress = ChainController.getAccountData()?.caipAddress;
    this.caipNetworkId = ChainController.state.activeCaipNetwork?.caipNetworkId;
    this.initialized = SwapController.state.initialized;
    this.loadingQuote = SwapController.state.loadingQuote;
    this.loadingPrices = SwapController.state.loadingPrices;
    this.loadingTransaction = SwapController.state.loadingTransaction;
    this.sourceToken = SwapController.state.sourceToken;
    this.sourceTokenAmount = SwapController.state.sourceTokenAmount;
    this.sourceTokenPriceInUSD = SwapController.state.sourceTokenPriceInUSD;
    this.toToken = SwapController.state.toToken;
    this.toTokenAmount = SwapController.state.toTokenAmount;
    this.toTokenPriceInUSD = SwapController.state.toTokenPriceInUSD;
    this.inputError = SwapController.state.inputError;
    this.fetchError = SwapController.state.fetchError;
    this.lastTokenPriceUpdate = 0;
    this.minTokenPriceUpdateInterval = 1e4;
    this.visibilityChangeHandler = () => {
      if (document?.hidden) {
        clearInterval(this.interval);
        this.interval = void 0;
      } else {
        this.startTokenPriceInterval();
      }
    };
    this.startTokenPriceInterval = () => {
      if (this.interval && Date.now() - this.lastTokenPriceUpdate < this.minTokenPriceUpdateInterval) {
        return;
      }
      if (this.lastTokenPriceUpdate && Date.now() - this.lastTokenPriceUpdate > this.minTokenPriceUpdateInterval) {
        this.fetchTokensAndValues();
      }
      clearInterval(this.interval);
      this.interval = setInterval(() => {
        this.fetchTokensAndValues();
      }, this.minTokenPriceUpdateInterval);
    };
    this.watchTokensAndValues = () => {
      if (!this.sourceToken || !this.toToken) {
        return;
      }
      this.subscribeToVisibilityChange();
      this.startTokenPriceInterval();
    };
    this.onDebouncedGetSwapCalldata = CoreHelperUtil.debounce(async () => {
      await SwapController.swapTokens();
    }, 200);
    this.subscribe({ resetSwapState: true, initializeSwapState: false })();
    this.unsubscribe.push(...[
      this.subscribe({ resetSwapState: false, initializeSwapState: true }),
      ModalController.subscribeKey("open", (isOpen) => {
        if (!isOpen) {
          SwapController.resetState();
        }
      }),
      RouterController.subscribeKey("view", (newRoute) => {
        if (!newRoute.includes("Swap")) {
          SwapController.resetValues();
        }
      }),
      SwapController.subscribe((newState) => {
        this.initialized = newState.initialized;
        this.loadingQuote = newState.loadingQuote;
        this.loadingPrices = newState.loadingPrices;
        this.loadingTransaction = newState.loadingTransaction;
        this.sourceToken = newState.sourceToken;
        this.sourceTokenAmount = newState.sourceTokenAmount;
        this.sourceTokenPriceInUSD = newState.sourceTokenPriceInUSD;
        this.toToken = newState.toToken;
        this.toTokenAmount = newState.toTokenAmount;
        this.toTokenPriceInUSD = newState.toTokenPriceInUSD;
        this.inputError = newState.inputError;
        this.fetchError = newState.fetchError;
        if (newState.sourceToken && newState.toToken) {
          this.watchTokensAndValues();
        }
      })
    ]);
  }
  async firstUpdated() {
    SwapController.initializeState();
    this.watchTokensAndValues();
    await this.handleSwapParameters();
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe?.());
    clearInterval(this.interval);
    document?.removeEventListener("visibilitychange", this.visibilityChangeHandler);
  }
  render() {
    return x`
      <wui-flex flexDirection="column" .padding=${["0", "4", "4", "4"]} gap="3">
        ${this.initialized ? this.templateSwap() : this.templateLoading()}
      </wui-flex>
    `;
  }
  subscribeToVisibilityChange() {
    document?.removeEventListener("visibilitychange", this.visibilityChangeHandler);
    document?.addEventListener("visibilitychange", this.visibilityChangeHandler);
  }
  fetchTokensAndValues() {
    SwapController.getNetworkTokenPrice();
    SwapController.getMyTokensWithBalance();
    SwapController.swapTokens();
    this.lastTokenPriceUpdate = Date.now();
  }
  templateSwap() {
    return x`
      <wui-flex flexDirection="column" gap="3">
        <wui-flex flexDirection="column" alignItems="center" gap="2" class="swap-inputs-container">
          ${this.templateTokenInput("sourceToken", this.sourceToken)}
          ${this.templateTokenInput("toToken", this.toToken)} ${this.templateReplaceTokensButton()}
        </wui-flex>
        ${this.templateDetails()} ${this.templateActionButton()}
      </wui-flex>
    `;
  }
  actionButtonLabel() {
    const haveNoAmount = !this.sourceTokenAmount || this.sourceTokenAmount === "0";
    if (this.fetchError) {
      return "Swap";
    }
    if (!this.sourceToken || !this.toToken) {
      return "Select token";
    }
    if (haveNoAmount) {
      return "Enter amount";
    }
    if (this.inputError) {
      return this.inputError;
    }
    return "Review swap";
  }
  templateReplaceTokensButton() {
    return x`
      <wui-flex class="replace-tokens-button-container">
        <wui-icon-box
          @click=${this.onSwitchTokens.bind(this)}
          icon="recycleHorizontal"
          size="md"
          variant="default"
        ></wui-icon-box>
      </wui-flex>
    `;
  }
  templateLoading() {
    return x`
      <wui-flex flexDirection="column" gap="4">
        <wui-flex flexDirection="column" alignItems="center" gap="2" class="swap-inputs-container">
          <w3m-swap-input-skeleton target="sourceToken"></w3m-swap-input-skeleton>
          <w3m-swap-input-skeleton target="toToken"></w3m-swap-input-skeleton>
          ${this.templateReplaceTokensButton()}
        </wui-flex>
        ${this.templateActionButton()}
      </wui-flex>
    `;
  }
  templateTokenInput(target, token) {
    const myToken = SwapController.state.myTokensWithBalance?.find((ct) => ct?.address === token?.address);
    const amount = target === "toToken" ? this.toTokenAmount : this.sourceTokenAmount;
    const price = target === "toToken" ? this.toTokenPriceInUSD : this.sourceTokenPriceInUSD;
    const marketValue = NumberUtil.parseLocalStringToNumber(amount) * price;
    return x`<w3m-swap-input
      .value=${target === "toToken" ? this.toTokenAmount : this.sourceTokenAmount}
      .disabled=${target === "toToken"}
      .onSetAmount=${this.handleChangeAmount.bind(this)}
      target=${target}
      .token=${token}
      .balance=${myToken?.quantity?.numeric}
      .price=${myToken?.price}
      .marketValue=${marketValue}
      .onSetMaxValue=${this.onSetMaxValue.bind(this)}
    ></w3m-swap-input>`;
  }
  onSetMaxValue(target, balance) {
    const maxValue = NumberUtil.bigNumber(balance || "0");
    this.handleChangeAmount(target, maxValue.gt(0) ? maxValue.toFixed(20) : "0");
  }
  templateDetails() {
    if (!this.sourceToken || !this.toToken || this.inputError) {
      return null;
    }
    return x`<w3m-swap-details .detailsOpen=${this.detailsOpen}></w3m-swap-details>`;
  }
  handleChangeAmount(target, value) {
    SwapController.clearError();
    if (target === "sourceToken") {
      SwapController.setSourceTokenAmount(value);
    } else {
      SwapController.setToTokenAmount(value);
    }
    this.onDebouncedGetSwapCalldata();
  }
  templateActionButton() {
    const haveNoTokenSelected = !this.toToken || !this.sourceToken;
    const haveNoAmount = !this.sourceTokenAmount || this.sourceTokenAmount === "0";
    const loading = this.loadingQuote || this.loadingPrices || this.loadingTransaction;
    const disabled = loading || haveNoTokenSelected || haveNoAmount || this.inputError;
    return x` <wui-flex gap="2">
      <wui-button
        data-testid="swap-action-button"
        class="action-button"
        fullWidth
        size="lg"
        borderRadius="xs"
        variant="accent-primary"
        ?loading=${Boolean(loading)}
        ?disabled=${Boolean(disabled)}
        @click=${this.onSwapPreview.bind(this)}
      >
        ${this.actionButtonLabel()}
      </wui-button>
    </wui-flex>`;
  }
  async onSwitchTokens() {
    await SwapController.switchTokens();
  }
  async onSwapPreview() {
    if (this.fetchError) {
      await SwapController.swapTokens();
    }
    EventsController.sendEvent({
      type: "track",
      event: "INITIATE_SWAP",
      properties: {
        network: this.caipNetworkId || "",
        swapFromToken: this.sourceToken?.symbol || "",
        swapToToken: this.toToken?.symbol || "",
        swapFromAmount: this.sourceTokenAmount || "",
        swapToAmount: this.toTokenAmount || "",
        isSmartAccount: getPreferredAccountType(ChainController.state.activeChain) === W3mFrameRpcConstants.ACCOUNT_TYPES.SMART_ACCOUNT
      }
    });
    RouterController.push("SwapPreview");
  }
  async handleSwapParameters() {
    if (!this.initialParams) {
      return;
    }
    if (!SwapController.state.initialized) {
      const waitForInitialization = new Promise((resolve) => {
        const unsubscribe = SwapController.subscribeKey("initialized", (initialized) => {
          if (initialized) {
            unsubscribe?.();
            resolve();
          }
        });
      });
      await waitForInitialization;
    }
    await this.setSwapParameters(this.initialParams);
  }
  async setSwapParameters({ amount, fromToken, toToken }) {
    if (!SwapController.state.tokens || !SwapController.state.myTokensWithBalance) {
      const waitForTokens = new Promise((resolve) => {
        const unsubscribe = SwapController.subscribeKey("myTokensWithBalance", (tokens) => {
          if (tokens && tokens.length > 0) {
            unsubscribe?.();
            resolve();
          }
        });
        setTimeout(() => {
          unsubscribe?.();
          resolve();
        }, 5e3);
      });
      await waitForTokens;
    }
    const allTokens = [
      ...SwapController.state.tokens || [],
      ...SwapController.state.myTokensWithBalance || []
    ];
    if (fromToken) {
      const token = allTokens.find((t) => t.symbol.toLowerCase() === fromToken.toLowerCase());
      if (token) {
        SwapController.setSourceToken(token);
      }
    }
    if (toToken) {
      const token = allTokens.find((t) => t.symbol.toLowerCase() === toToken.toLowerCase());
      if (token) {
        SwapController.setToToken(token);
      }
    }
    if (amount && !isNaN(Number(amount))) {
      SwapController.setSourceTokenAmount(amount);
    }
  }
  onCaipAddressChange({ newCaipAddress, resetSwapState, initializeSwapState }) {
    if (this.caipAddress !== newCaipAddress) {
      this.caipAddress = newCaipAddress;
      if (resetSwapState) {
        SwapController.resetState();
      }
      if (initializeSwapState) {
        SwapController.initializeState();
      }
    }
  }
  onCaipNetworkChange({ newCaipNetwork, resetSwapState, initializeSwapState }) {
    if (this.caipNetworkId !== newCaipNetwork?.caipNetworkId) {
      this.caipNetworkId = newCaipNetwork?.caipNetworkId;
      if (resetSwapState) {
        SwapController.resetState();
      }
      if (initializeSwapState) {
        SwapController.initializeState();
      }
    }
  }
};
W3mSwapView.styles = styles$4;
__decorate$4([
  n({ type: Object })
], W3mSwapView.prototype, "initialParams", void 0);
__decorate$4([
  r()
], W3mSwapView.prototype, "interval", void 0);
__decorate$4([
  r()
], W3mSwapView.prototype, "detailsOpen", void 0);
__decorate$4([
  r()
], W3mSwapView.prototype, "caipAddress", void 0);
__decorate$4([
  r()
], W3mSwapView.prototype, "caipNetworkId", void 0);
__decorate$4([
  r()
], W3mSwapView.prototype, "initialized", void 0);
__decorate$4([
  r()
], W3mSwapView.prototype, "loadingQuote", void 0);
__decorate$4([
  r()
], W3mSwapView.prototype, "loadingPrices", void 0);
__decorate$4([
  r()
], W3mSwapView.prototype, "loadingTransaction", void 0);
__decorate$4([
  r()
], W3mSwapView.prototype, "sourceToken", void 0);
__decorate$4([
  r()
], W3mSwapView.prototype, "sourceTokenAmount", void 0);
__decorate$4([
  r()
], W3mSwapView.prototype, "sourceTokenPriceInUSD", void 0);
__decorate$4([
  r()
], W3mSwapView.prototype, "toToken", void 0);
__decorate$4([
  r()
], W3mSwapView.prototype, "toTokenAmount", void 0);
__decorate$4([
  r()
], W3mSwapView.prototype, "toTokenPriceInUSD", void 0);
__decorate$4([
  r()
], W3mSwapView.prototype, "inputError", void 0);
__decorate$4([
  r()
], W3mSwapView.prototype, "fetchError", void 0);
__decorate$4([
  r()
], W3mSwapView.prototype, "lastTokenPriceUpdate", void 0);
W3mSwapView = __decorate$4([
  customElement("w3m-swap-view")
], W3mSwapView);
const styles$3 = css`
  :host > wui-flex:first-child {
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;
  }

  :host > wui-flex:first-child::-webkit-scrollbar {
    display: none;
  }

  .preview-container,
  .details-container {
    width: 100%;
  }

  .token-image {
    width: 24px;
    height: 24px;
    box-shadow: 0 0 0 2px ${({ tokens }) => tokens.core.glass010};
    border-radius: 12px;
  }

  wui-loading-hexagon {
    position: absolute;
  }

  .token-item {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${({ spacing }) => spacing["2"]};
    padding: ${({ spacing }) => spacing["2"]};
    height: 40px;
    border: none;
    border-radius: 80px;
    background: ${({ tokens }) => tokens.theme.foregroundPrimary};
    box-shadow: inset 0 0 0 1px ${({ tokens }) => tokens.theme.foregroundPrimary};
    cursor: pointer;
    transition: background ${({ durations }) => durations["lg"]}
      ${({ easings }) => easings["ease-out-power-2"]};
    will-change: background;
  }

  .token-item:hover {
    background: ${({ tokens }) => tokens.core.glass010};
  }

  .preview-token-details-container {
    width: 100%;
  }

  .details-row {
    width: 100%;
    padding: ${({ spacing }) => spacing["3"]} ${({ spacing }) => spacing["5"]};
    border-radius: ${({ borderRadius }) => borderRadius["3"]};
    background: ${({ tokens }) => tokens.theme.foregroundPrimary};
  }

  .action-buttons-container {
    width: 100%;
    gap: ${({ spacing }) => spacing["2"]};
  }

  .action-buttons-container > button {
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    height: 48px;
    border-radius: ${({ borderRadius }) => borderRadius["4"]};
    border: none;
    box-shadow: inset 0 0 0 1px ${({ tokens }) => tokens.core.glass010};
  }

  .action-buttons-container > button:disabled {
    opacity: 0.8;
    cursor: not-allowed;
  }

  .action-button > wui-loading-spinner {
    display: inline-block;
  }

  .cancel-button:hover,
  .action-button:hover {
    cursor: pointer;
  }

  .action-buttons-container > wui-button.cancel-button {
    flex: 2;
  }

  .action-buttons-container > wui-button.action-button {
    flex: 4;
  }

  .action-buttons-container > button.action-button > wui-text {
    color: white;
  }

  .details-container > wui-flex {
    background: ${({ tokens }) => tokens.theme.foregroundPrimary};
    border-radius: ${({ borderRadius }) => borderRadius["3"]};
    width: 100%;
  }

  .details-container > wui-flex > button {
    border: none;
    background: none;
    padding: ${({ spacing }) => spacing["3"]};
    border-radius: ${({ borderRadius }) => borderRadius["3"]};
    transition: background ${({ durations }) => durations["lg"]}
      ${({ easings }) => easings["ease-out-power-2"]};
    will-change: background;
  }

  .details-container > wui-flex > button:hover {
    background: ${({ tokens }) => tokens.theme.foregroundPrimary};
  }

  .details-content-container {
    padding: ${({ spacing }) => spacing["2"]};
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .details-content-container > wui-flex {
    width: 100%;
  }

  .details-row {
    width: 100%;
    padding: ${({ spacing }) => spacing["3"]} ${({ spacing }) => spacing["5"]};
    border-radius: ${({ borderRadius }) => borderRadius["3"]};
    background: ${({ tokens }) => tokens.theme.foregroundPrimary};
  }
`;
var __decorate$3 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mSwapPreviewView = class W3mSwapPreviewView2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.detailsOpen = true;
    this.approvalTransaction = SwapController.state.approvalTransaction;
    this.swapTransaction = SwapController.state.swapTransaction;
    this.sourceToken = SwapController.state.sourceToken;
    this.sourceTokenAmount = SwapController.state.sourceTokenAmount ?? "";
    this.sourceTokenPriceInUSD = SwapController.state.sourceTokenPriceInUSD;
    this.balanceSymbol = ChainController.getAccountData()?.balanceSymbol;
    this.toToken = SwapController.state.toToken;
    this.toTokenAmount = SwapController.state.toTokenAmount ?? "";
    this.toTokenPriceInUSD = SwapController.state.toTokenPriceInUSD;
    this.caipNetwork = ChainController.state.activeCaipNetwork;
    this.inputError = SwapController.state.inputError;
    this.loadingQuote = SwapController.state.loadingQuote;
    this.loadingApprovalTransaction = SwapController.state.loadingApprovalTransaction;
    this.loadingBuildTransaction = SwapController.state.loadingBuildTransaction;
    this.loadingTransaction = SwapController.state.loadingTransaction;
    this.unsubscribe.push(...[
      ChainController.subscribeChainProp("accountState", (val) => {
        if (val?.balanceSymbol !== this.balanceSymbol) {
          RouterController.goBack();
        }
      }),
      ChainController.subscribeKey("activeCaipNetwork", (newCaipNetwork) => {
        if (this.caipNetwork !== newCaipNetwork) {
          this.caipNetwork = newCaipNetwork;
        }
      }),
      SwapController.subscribe((newState) => {
        this.approvalTransaction = newState.approvalTransaction;
        this.swapTransaction = newState.swapTransaction;
        this.sourceToken = newState.sourceToken;
        this.toToken = newState.toToken;
        this.toTokenPriceInUSD = newState.toTokenPriceInUSD;
        this.sourceTokenAmount = newState.sourceTokenAmount ?? "";
        this.toTokenAmount = newState.toTokenAmount ?? "";
        this.inputError = newState.inputError;
        if (newState.inputError) {
          RouterController.goBack();
        }
        this.loadingQuote = newState.loadingQuote;
        this.loadingApprovalTransaction = newState.loadingApprovalTransaction;
        this.loadingBuildTransaction = newState.loadingBuildTransaction;
        this.loadingTransaction = newState.loadingTransaction;
      })
    ]);
  }
  firstUpdated() {
    SwapController.getTransaction();
    this.refreshTransaction();
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe?.());
    clearInterval(this.interval);
  }
  render() {
    return x`
      <wui-flex flexDirection="column" .padding=${["0", "4", "4", "4"]} gap="3">
        ${this.templateSwap()}
      </wui-flex>
    `;
  }
  refreshTransaction() {
    this.interval = setInterval(() => {
      if (!SwapController.getApprovalLoadingState()) {
        SwapController.getTransaction();
      }
    }, 1e4);
  }
  templateSwap() {
    const sourceTokenText = `${NumberUtil.formatNumberToLocalString(parseFloat(this.sourceTokenAmount))} ${this.sourceToken?.symbol}`;
    const toTokenText = `${NumberUtil.formatNumberToLocalString(parseFloat(this.toTokenAmount))} ${this.toToken?.symbol}`;
    const sourceTokenValue = parseFloat(this.sourceTokenAmount) * this.sourceTokenPriceInUSD;
    const toTokenValue = parseFloat(this.toTokenAmount) * this.toTokenPriceInUSD;
    const sentPrice = NumberUtil.formatNumberToLocalString(sourceTokenValue);
    const receivePrice = NumberUtil.formatNumberToLocalString(toTokenValue);
    const loading = this.loadingQuote || this.loadingBuildTransaction || this.loadingTransaction || this.loadingApprovalTransaction;
    return x`
      <wui-flex flexDirection="column" alignItems="center" gap="4">
        <wui-flex class="preview-container" flexDirection="column" alignItems="flex-start" gap="4">
          <wui-flex
            class="preview-token-details-container"
            alignItems="center"
            justifyContent="space-between"
            gap="4"
          >
            <wui-flex flexDirection="column" alignItems="flex-start" gap="01">
              <wui-text variant="sm-regular" color="secondary">Send</wui-text>
              <wui-text variant="md-regular" color="primary">$${sentPrice}</wui-text>
            </wui-flex>
            <wui-token-button
              flexDirection="row-reverse"
              text=${sourceTokenText}
              imageSrc=${this.sourceToken?.logoUri}
            >
            </wui-token-button>
          </wui-flex>
          <wui-icon name="recycleHorizontal" color="default" size="md"></wui-icon>
          <wui-flex
            class="preview-token-details-container"
            alignItems="center"
            justifyContent="space-between"
            gap="4"
          >
            <wui-flex flexDirection="column" alignItems="flex-start" gap="01">
              <wui-text variant="sm-regular" color="secondary">Receive</wui-text>
              <wui-text variant="md-regular" color="primary">$${receivePrice}</wui-text>
            </wui-flex>
            <wui-token-button
              flexDirection="row-reverse"
              text=${toTokenText}
              imageSrc=${this.toToken?.logoUri}
            >
            </wui-token-button>
          </wui-flex>
        </wui-flex>

        ${this.templateDetails()}

        <wui-flex flexDirection="row" alignItems="center" justifyContent="center" gap="2">
          <wui-icon size="sm" color="default" name="info"></wui-icon>
          <wui-text variant="sm-regular" color="secondary">Review transaction carefully</wui-text>
        </wui-flex>

        <wui-flex
          class="action-buttons-container"
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          gap="2"
        >
          <wui-button
            class="cancel-button"
            fullWidth
            size="lg"
            borderRadius="xs"
            variant="neutral-secondary"
            @click=${this.onCancelTransaction.bind(this)}
          >
            <wui-text variant="md-medium" color="secondary">Cancel</wui-text>
          </wui-button>
          <wui-button
            class="action-button"
            fullWidth
            size="lg"
            borderRadius="xs"
            variant="accent-primary"
            ?loading=${loading}
            ?disabled=${loading}
            @click=${this.onSendTransaction.bind(this)}
          >
            <wui-text variant="md-medium" color="invert"> ${this.actionButtonLabel()} </wui-text>
          </wui-button>
        </wui-flex>
      </wui-flex>
    `;
  }
  templateDetails() {
    if (!this.sourceToken || !this.toToken || this.inputError) {
      return null;
    }
    return x`<w3m-swap-details .detailsOpen=${this.detailsOpen}></w3m-swap-details>`;
  }
  actionButtonLabel() {
    if (this.loadingApprovalTransaction) {
      return "Approving...";
    }
    if (this.approvalTransaction) {
      return "Approve";
    }
    return "Swap";
  }
  onCancelTransaction() {
    RouterController.goBack();
  }
  onSendTransaction() {
    if (this.approvalTransaction) {
      SwapController.sendTransactionForApproval(this.approvalTransaction);
    } else {
      SwapController.sendTransactionForSwap(this.swapTransaction);
    }
  }
};
W3mSwapPreviewView.styles = styles$3;
__decorate$3([
  r()
], W3mSwapPreviewView.prototype, "interval", void 0);
__decorate$3([
  r()
], W3mSwapPreviewView.prototype, "detailsOpen", void 0);
__decorate$3([
  r()
], W3mSwapPreviewView.prototype, "approvalTransaction", void 0);
__decorate$3([
  r()
], W3mSwapPreviewView.prototype, "swapTransaction", void 0);
__decorate$3([
  r()
], W3mSwapPreviewView.prototype, "sourceToken", void 0);
__decorate$3([
  r()
], W3mSwapPreviewView.prototype, "sourceTokenAmount", void 0);
__decorate$3([
  r()
], W3mSwapPreviewView.prototype, "sourceTokenPriceInUSD", void 0);
__decorate$3([
  r()
], W3mSwapPreviewView.prototype, "balanceSymbol", void 0);
__decorate$3([
  r()
], W3mSwapPreviewView.prototype, "toToken", void 0);
__decorate$3([
  r()
], W3mSwapPreviewView.prototype, "toTokenAmount", void 0);
__decorate$3([
  r()
], W3mSwapPreviewView.prototype, "toTokenPriceInUSD", void 0);
__decorate$3([
  r()
], W3mSwapPreviewView.prototype, "caipNetwork", void 0);
__decorate$3([
  r()
], W3mSwapPreviewView.prototype, "inputError", void 0);
__decorate$3([
  r()
], W3mSwapPreviewView.prototype, "loadingQuote", void 0);
__decorate$3([
  r()
], W3mSwapPreviewView.prototype, "loadingApprovalTransaction", void 0);
__decorate$3([
  r()
], W3mSwapPreviewView.prototype, "loadingBuildTransaction", void 0);
__decorate$3([
  r()
], W3mSwapPreviewView.prototype, "loadingTransaction", void 0);
W3mSwapPreviewView = __decorate$3([
  customElement("w3m-swap-preview-view")
], W3mSwapPreviewView);
const styles$2 = css`
  :host {
    width: 100%;
    height: 60px;
    min-height: 60px;
  }

  :host > wui-flex {
    cursor: pointer;
    height: 100%;
    display: flex;
    column-gap: ${({ spacing }) => spacing["3"]};
    padding: ${({ spacing }) => spacing["2"]};
    padding-right: ${({ spacing }) => spacing["4"]};
    width: 100%;
    background-color: transparent;
    border-radius: ${({ borderRadius }) => borderRadius["4"]};
    color: ${({ tokens }) => tokens.theme.foregroundSecondary};
    transition:
      background-color ${({ durations }) => durations["lg"]}
        ${({ easings }) => easings["ease-out-power-2"]},
      opacity ${({ durations }) => durations["lg"]} ${({ easings }) => easings["ease-out-power-2"]};
    will-change: background-color, opacity;
  }

  @media (hover: hover) and (pointer: fine) {
    :host > wui-flex:hover {
      background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
    }

    :host > wui-flex:active {
      background-color: ${({ tokens }) => tokens.core.glass010};
    }
  }

  :host([disabled]) > wui-flex {
    opacity: 0.6;
  }

  :host([disabled]) > wui-flex:hover {
    background-color: transparent;
  }

  :host > wui-flex > wui-flex {
    flex: 1;
  }

  :host > wui-flex > wui-image,
  :host > wui-flex > .token-item-image-placeholder {
    width: 40px;
    max-width: 40px;
    height: 40px;
    border-radius: ${({ borderRadius }) => borderRadius["20"]};
    position: relative;
  }

  :host > wui-flex > .token-item-image-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  :host > wui-flex > wui-image::after,
  :host > wui-flex > .token-item-image-placeholder::after {
    position: absolute;
    content: '';
    inset: 0;
    box-shadow: inset 0 0 0 1px ${({ tokens }) => tokens.core.glass010};
    border-radius: ${({ borderRadius }) => borderRadius["8"]};
  }

  button > wui-icon-box[data-variant='square-blue'] {
    border-radius: ${({ borderRadius }) => borderRadius["2"]};
    position: relative;
    border: none;
    width: 36px;
    height: 36px;
  }
`;
var __decorate$2 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let WuiTokenListItem = class WuiTokenListItem2 extends i {
  constructor() {
    super();
    this.observer = new IntersectionObserver(() => void 0);
    this.imageSrc = void 0;
    this.name = void 0;
    this.symbol = void 0;
    this.price = void 0;
    this.amount = void 0;
    this.visible = false;
    this.imageError = false;
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          this.visible = true;
        } else {
          this.visible = false;
        }
      });
    }, { threshold: 0.1 });
  }
  firstUpdated() {
    this.observer.observe(this);
  }
  disconnectedCallback() {
    this.observer.disconnect();
  }
  render() {
    if (!this.visible) {
      return null;
    }
    const value = this.amount && this.price ? NumberUtil.multiply(this.price, this.amount)?.toFixed(3) : null;
    return x`
      <wui-flex alignItems="center">
        ${this.visualTemplate()}
        <wui-flex flexDirection="column" gap="1">
          <wui-flex justifyContent="space-between">
            <wui-text variant="md-medium" color="primary" lineClamp="1">${this.name}</wui-text>
            ${value ? x`
                  <wui-text variant="md-medium" color="primary">
                    $${NumberUtil.formatNumberToLocalString(value, 3)}
                  </wui-text>
                ` : null}
          </wui-flex>
          <wui-flex justifyContent="space-between">
            <wui-text variant="sm-regular" color="secondary" lineClamp="1">${this.symbol}</wui-text>
            ${this.amount ? x`<wui-text variant="sm-regular" color="secondary">
                  ${NumberUtil.formatNumberToLocalString(this.amount, 5)}
                </wui-text>` : null}
          </wui-flex>
        </wui-flex>
      </wui-flex>
    `;
  }
  visualTemplate() {
    if (this.imageError) {
      return x`<wui-flex class="token-item-image-placeholder">
        <wui-icon name="image" color="inherit"></wui-icon>
      </wui-flex>`;
    }
    if (this.imageSrc) {
      return x`<wui-image
        width="40"
        height="40"
        src=${this.imageSrc}
        @onLoadError=${this.imageLoadError}
      ></wui-image>`;
    }
    return null;
  }
  imageLoadError() {
    this.imageError = true;
  }
};
WuiTokenListItem.styles = [resetStyles, elementStyles, styles$2];
__decorate$2([
  n()
], WuiTokenListItem.prototype, "imageSrc", void 0);
__decorate$2([
  n()
], WuiTokenListItem.prototype, "name", void 0);
__decorate$2([
  n()
], WuiTokenListItem.prototype, "symbol", void 0);
__decorate$2([
  n()
], WuiTokenListItem.prototype, "price", void 0);
__decorate$2([
  n()
], WuiTokenListItem.prototype, "amount", void 0);
__decorate$2([
  r()
], WuiTokenListItem.prototype, "visible", void 0);
__decorate$2([
  r()
], WuiTokenListItem.prototype, "imageError", void 0);
WuiTokenListItem = __decorate$2([
  customElement("wui-token-list-item")
], WuiTokenListItem);
const styles$1 = css`
  :host {
    width: 100%;
  }

  :host > wui-flex {
    cursor: pointer;
    height: 100%;
    width: 100%;
    display: flex;
    column-gap: ${({ spacing }) => spacing["3"]};
    padding: ${({ spacing }) => spacing["2"]};
    padding-right: ${({ spacing }) => spacing["4"]};
  }

  wui-flex {
    display: flex;
    flex: 1;
  }
`;
var __decorate$1 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let WuiTokenListItemLoader = class WuiTokenListItemLoader2 extends i {
  render() {
    return x`
      <wui-flex alignItems="center">
        <wui-shimmer width="40px" height="40px"></wui-shimmer>
        <wui-flex flexDirection="column" gap="1">
          <wui-shimmer width="72px" height="16px" borderRadius="4xs"></wui-shimmer>
          <wui-shimmer width="148px" height="14px" borderRadius="4xs"></wui-shimmer>
        </wui-flex>
        <wui-flex flexDirection="column" gap="1" alignItems="flex-end">
          <wui-shimmer width="24px" height="12px" borderRadius="4xs"></wui-shimmer>
          <wui-shimmer width="32px" height="12px" borderRadius="4xs"></wui-shimmer>
        </wui-flex>
      </wui-flex>
    `;
  }
};
WuiTokenListItemLoader.styles = [resetStyles, styles$1];
WuiTokenListItemLoader = __decorate$1([
  customElement("wui-token-list-item-loader")
], WuiTokenListItemLoader);
const styles = css`
  :host {
    --tokens-scroll--top-opacity: 0;
    --tokens-scroll--bottom-opacity: 1;
    --suggested-tokens-scroll--left-opacity: 0;
    --suggested-tokens-scroll--right-opacity: 1;
  }

  :host > wui-flex:first-child {
    overflow-y: hidden;
    overflow-x: hidden;
    scrollbar-width: none;
    scrollbar-height: none;
  }

  :host > wui-flex:first-child::-webkit-scrollbar {
    display: none;
  }

  wui-loading-hexagon {
    position: absolute;
  }

  .suggested-tokens-container {
    overflow-x: auto;
    mask-image: linear-gradient(
      to right,
      rgba(0, 0, 0, calc(1 - var(--suggested-tokens-scroll--left-opacity))) 0px,
      rgba(200, 200, 200, calc(1 - var(--suggested-tokens-scroll--left-opacity))) 1px,
      black 50px,
      black 90px,
      black calc(100% - 90px),
      black calc(100% - 50px),
      rgba(155, 155, 155, calc(1 - var(--suggested-tokens-scroll--right-opacity))) calc(100% - 1px),
      rgba(0, 0, 0, calc(1 - var(--suggested-tokens-scroll--right-opacity))) 100%
    );
  }

  .suggested-tokens-container::-webkit-scrollbar {
    display: none;
  }

  .tokens-container {
    border-top: 1px solid ${({ tokens }) => tokens.core.glass010};
    height: 100%;
    max-height: 390px;
  }

  .tokens {
    width: 100%;
    overflow-y: auto;
    mask-image: linear-gradient(
      to bottom,
      rgba(0, 0, 0, calc(1 - var(--tokens-scroll--top-opacity))) 0px,
      rgba(200, 200, 200, calc(1 - var(--tokens-scroll--top-opacity))) 1px,
      black 50px,
      black 90px,
      black calc(100% - 90px),
      black calc(100% - 50px),
      rgba(155, 155, 155, calc(1 - var(--tokens-scroll--bottom-opacity))) calc(100% - 1px),
      rgba(0, 0, 0, calc(1 - var(--tokens-scroll--bottom-opacity))) 100%
    );
  }

  .network-search-input,
  .select-network-button {
    height: 40px;
  }

  .select-network-button {
    border: none;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: ${({ spacing }) => spacing["2"]};
    box-shadow: inset 0 0 0 1px ${({ tokens }) => tokens.core.glass010};
    background-color: transparent;
    border-radius: ${({ borderRadius }) => borderRadius["3"]};
    padding: ${({ spacing }) => spacing["2"]};
    align-items: center;
    transition: background-color ${({ durations }) => durations["lg"]}
      ${({ easings }) => easings["ease-out-power-2"]};
    will-change: background-color;
  }

  .select-network-button:hover {
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
  }

  .select-network-button > wui-image {
    width: 26px;
    height: 26px;
    border-radius: ${({ borderRadius }) => borderRadius["4"]};
    box-shadow: inset 0 0 0 1px ${({ tokens }) => tokens.core.glass010};
  }
`;
var __decorate = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mSwapSelectTokenView = class W3mSwapSelectTokenView2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.targetToken = RouterController.state.data?.target;
    this.sourceToken = SwapController.state.sourceToken;
    this.sourceTokenAmount = SwapController.state.sourceTokenAmount;
    this.toToken = SwapController.state.toToken;
    this.myTokensWithBalance = SwapController.state.myTokensWithBalance;
    this.popularTokens = SwapController.state.popularTokens;
    this.suggestedTokens = SwapController.state.suggestedTokens;
    this.tokensLoading = SwapController.state.tokensLoading;
    this.searchValue = "";
    this.unsubscribe.push(SwapController.subscribe((newState) => {
      this.sourceToken = newState.sourceToken;
      this.toToken = newState.toToken;
      this.myTokensWithBalance = newState.myTokensWithBalance;
      this.popularTokens = newState.popularTokens;
      this.suggestedTokens = newState.suggestedTokens;
      this.tokensLoading = newState.tokensLoading;
    }));
  }
  async firstUpdated() {
    await SwapController.getTokenList();
  }
  updated() {
    const suggestedTokensContainer = this.renderRoot?.querySelector(".suggested-tokens-container");
    suggestedTokensContainer?.addEventListener("scroll", this.handleSuggestedTokensScroll.bind(this));
    const tokensList = this.renderRoot?.querySelector(".tokens");
    tokensList?.addEventListener("scroll", this.handleTokenListScroll.bind(this));
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    const suggestedTokensContainer = this.renderRoot?.querySelector(".suggested-tokens-container");
    const tokensList = this.renderRoot?.querySelector(".tokens");
    suggestedTokensContainer?.removeEventListener("scroll", this.handleSuggestedTokensScroll.bind(this));
    tokensList?.removeEventListener("scroll", this.handleTokenListScroll.bind(this));
    clearInterval(this.interval);
  }
  render() {
    return x`
      <wui-flex flexDirection="column" gap="3">
        ${this.templateSearchInput()} ${this.templateSuggestedTokens()} ${this.templateTokens()}
      </wui-flex>
    `;
  }
  onSelectToken(token) {
    if (this.targetToken === "sourceToken") {
      SwapController.setSourceToken(token);
    } else {
      SwapController.setToToken(token);
      if (this.sourceToken && this.sourceTokenAmount) {
        SwapController.swapTokens();
      }
    }
    RouterController.goBack();
  }
  templateSearchInput() {
    return x`
      <wui-flex .padding=${["1", "3", "0", "3"]} gap="2">
        <wui-input-text
          data-testid="swap-select-token-search-input"
          class="network-search-input"
          size="sm"
          placeholder="Search token"
          icon="search"
          .value=${this.searchValue}
          @inputChange=${this.onSearchInputChange.bind(this)}
        ></wui-input-text>
      </wui-flex>
    `;
  }
  templateMyTokens() {
    const yourTokens = this.myTokensWithBalance ? Object.values(this.myTokensWithBalance) : [];
    const filteredYourTokens = this.filterTokensWithText(yourTokens, this.searchValue);
    if (filteredYourTokens?.length > 0) {
      return x`<wui-flex justifyContent="flex-start" padding="2">
          <wui-text variant="md-medium" color="secondary">Your tokens</wui-text>
        </wui-flex>
        ${filteredYourTokens.map((token) => {
        const selected = token.symbol === this.sourceToken?.symbol || token.symbol === this.toToken?.symbol;
        return x`
            <wui-token-list-item
              data-testid="swap-select-token-item-${token.symbol}"
              name=${token.name}
              ?disabled=${selected}
              symbol=${token.symbol}
              price=${token?.price}
              amount=${token?.quantity?.numeric}
              imageSrc=${token.logoUri}
              @click=${() => {
          if (!selected) {
            this.onSelectToken(token);
          }
        }}
            >
            </wui-token-list-item>
          `;
      })}`;
    }
    return null;
  }
  templateAllTokens() {
    const tokens = this.popularTokens ? this.popularTokens : [];
    const filteredTokens = this.filterTokensWithText(tokens, this.searchValue);
    if (this.tokensLoading) {
      return x`
        <wui-token-list-item-loader></wui-token-list-item-loader>
        <wui-token-list-item-loader></wui-token-list-item-loader>
        <wui-token-list-item-loader></wui-token-list-item-loader>
        <wui-token-list-item-loader></wui-token-list-item-loader>
        <wui-token-list-item-loader></wui-token-list-item-loader>
      `;
    }
    if (filteredTokens?.length > 0) {
      return x`
        ${filteredTokens.map((token) => x`
            <wui-token-list-item
              data-testid="swap-select-token-item-${token.symbol}"
              name=${token.name}
              symbol=${token.symbol}
              imageSrc=${token.logoUri}
              @click=${() => this.onSelectToken(token)}
            >
            </wui-token-list-item>
          `)}
      `;
    }
    return null;
  }
  templateTokens() {
    return x`
      <wui-flex class="tokens-container">
        <wui-flex class="tokens" .padding=${["0", "2", "2", "2"]} flexDirection="column">
          ${this.templateMyTokens()}
          <wui-flex justifyContent="flex-start" padding="3">
            <wui-text variant="md-medium" color="secondary">Tokens</wui-text>
          </wui-flex>
          ${this.templateAllTokens()}
        </wui-flex>
      </wui-flex>
    `;
  }
  templateSuggestedTokens() {
    const tokens = this.suggestedTokens ? this.suggestedTokens.slice(0, 8) : null;
    if (this.tokensLoading) {
      return x`
        <wui-flex
          class="suggested-tokens-container"
          .padding=${["0", "3", "0", "3"]}
          gap="2"
        >
          <wui-token-button loading></wui-token-button>
          <wui-token-button loading></wui-token-button>
          <wui-token-button loading></wui-token-button>
          <wui-token-button loading></wui-token-button>
          <wui-token-button loading></wui-token-button>
        </wui-flex>
      `;
    }
    if (!tokens) {
      return null;
    }
    return x`
      <wui-flex
        class="suggested-tokens-container"
        .padding=${["0", "3", "0", "3"]}
        gap="2"
      >
        ${tokens.map((token) => x`
            <wui-token-button
              text=${token.symbol}
              imageSrc=${token.logoUri}
              @click=${() => this.onSelectToken(token)}
            >
            </wui-token-button>
          `)}
      </wui-flex>
    `;
  }
  onSearchInputChange(event) {
    this.searchValue = event.detail;
  }
  handleSuggestedTokensScroll() {
    const container = this.renderRoot?.querySelector(".suggested-tokens-container");
    if (!container) {
      return;
    }
    container.style.setProperty("--suggested-tokens-scroll--left-opacity", MathUtil.interpolate([0, 100], [0, 1], container.scrollLeft).toString());
    container.style.setProperty("--suggested-tokens-scroll--right-opacity", MathUtil.interpolate([0, 100], [0, 1], container.scrollWidth - container.scrollLeft - container.offsetWidth).toString());
  }
  handleTokenListScroll() {
    const container = this.renderRoot?.querySelector(".tokens");
    if (!container) {
      return;
    }
    container.style.setProperty("--tokens-scroll--top-opacity", MathUtil.interpolate([0, 100], [0, 1], container.scrollTop).toString());
    container.style.setProperty("--tokens-scroll--bottom-opacity", MathUtil.interpolate([0, 100], [0, 1], container.scrollHeight - container.scrollTop - container.offsetHeight).toString());
  }
  filterTokensWithText(tokens, text) {
    return tokens.filter((token) => `${token.symbol} ${token.name} ${token.address}`.toLowerCase().includes(text.toLowerCase())).sort((a, b) => {
      const aText = `${a.symbol} ${a.name} ${a.address}`.toLowerCase();
      const bText = `${b.symbol} ${b.name} ${b.address}`.toLowerCase();
      const aIndex = aText.indexOf(text.toLowerCase());
      const bIndex = bText.indexOf(text.toLowerCase());
      return aIndex - bIndex;
    });
  }
};
W3mSwapSelectTokenView.styles = styles;
__decorate([
  r()
], W3mSwapSelectTokenView.prototype, "interval", void 0);
__decorate([
  r()
], W3mSwapSelectTokenView.prototype, "targetToken", void 0);
__decorate([
  r()
], W3mSwapSelectTokenView.prototype, "sourceToken", void 0);
__decorate([
  r()
], W3mSwapSelectTokenView.prototype, "sourceTokenAmount", void 0);
__decorate([
  r()
], W3mSwapSelectTokenView.prototype, "toToken", void 0);
__decorate([
  r()
], W3mSwapSelectTokenView.prototype, "myTokensWithBalance", void 0);
__decorate([
  r()
], W3mSwapSelectTokenView.prototype, "popularTokens", void 0);
__decorate([
  r()
], W3mSwapSelectTokenView.prototype, "suggestedTokens", void 0);
__decorate([
  r()
], W3mSwapSelectTokenView.prototype, "tokensLoading", void 0);
__decorate([
  r()
], W3mSwapSelectTokenView.prototype, "searchValue", void 0);
W3mSwapSelectTokenView = __decorate([
  customElement("w3m-swap-select-token-view")
], W3mSwapSelectTokenView);
export {
  W3mSwapPreviewView,
  W3mSwapSelectTokenView,
  W3mSwapView
};
