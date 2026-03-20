import { n as css, q as i, c as CoreHelperUtil, a as ChainController, m as ConnectionController, _ as SendController, x, R as RouterController, N as NumberUtil, M as ModalController, S as SnackController, h as ConstantsUtil, D as BalanceUtil, G as AssetUtil, r as resetStyles, o as elementStyles, a2 as AppKitError, a3 as ErrorUtil, b as EventsController } from "./walletconnect-BVoLvI4P.js";
import { n, r, c as customElement, U as UiHelperUtil } from "./index-5878y4Sm.js";
import "./index-Bag94m_F.js";
import "./index-Cm7UDlkl.js";
import "./index-B9aMMm-V.js";
import { e, n as n$1 } from "./ref-j6LTZZuR.js";
import "./index-CyqVuigQ.js";
import "./index-Bz3_ZVag.js";
import "./index-DhutyWBy.js";
import { S as SwapController } from "./SwapController-BZ4iHZ-m.js";
import "./index-Oesj6-8K.js";
import "./index-BNTvwCof.js";
import "./index-SiM7Ib3-.js";
import "./index-BIT3XyMh.js";
import { o } from "./if-defined-DpCpmSxP.js";
import "./index-73GArslZ.js";
import "./index-DAKl5XGv.js";
import "./index-xvpTmtDJ.js";
const styles$8 = css`
  :host {
    width: 100%;
    height: 100px;
    border-radius: ${({ borderRadius }) => borderRadius["5"]};
    border: 1px solid ${({ tokens }) => tokens.theme.foregroundPrimary};
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
    transition: background-color ${({ durations }) => durations["lg"]}
      ${({ easings }) => easings["ease-out-power-1"]};
    will-change: background-color;
    position: relative;
  }

  :host(:hover) {
    background-color: ${({ tokens }) => tokens.theme.foregroundSecondary};
  }

  wui-flex {
    width: 100%;
    height: fit-content;
  }

  wui-button {
    display: ruby;
    color: ${({ tokens }) => tokens.theme.textPrimary};
    margin: 0 ${({ spacing }) => spacing["2"]};
  }

  .instruction {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 2;
  }

  .paste {
    display: inline-flex;
  }

  textarea {
    background: transparent;
    width: 100%;
    font-family: ${({ fontFamily }) => fontFamily.regular};
    font-style: normal;
    font-size: ${({ textSize }) => textSize.large};
    font-weight: ${({ fontWeight }) => fontWeight.regular};
    line-height: ${({ typography }) => typography["lg-regular"].lineHeight};
    letter-spacing: ${({ typography }) => typography["lg-regular"].letterSpacing};
    color: ${({ tokens }) => tokens.theme.textPrimary};
    caret-color: ${({ tokens }) => tokens.core.backgroundAccentPrimary};
    box-sizing: border-box;
    -webkit-appearance: none;
    -moz-appearance: textfield;
    padding: 0px;
    border: none;
    outline: none;
    appearance: none;
    resize: none;
    overflow: hidden;
  }
`;
var __decorate$8 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mInputAddress = class W3mInputAddress2 extends i {
  constructor() {
    super(...arguments);
    this.inputElementRef = e();
    this.instructionElementRef = e();
    this.readOnly = false;
    this.instructionHidden = Boolean(this.value);
    this.pasting = false;
    this.onDebouncedSearch = CoreHelperUtil.debounce(async (value) => {
      if (!value.length) {
        this.setReceiverAddress("");
        return;
      }
      const activeChain = ChainController.state.activeChain;
      const isValidAddress = CoreHelperUtil.isAddress(value, activeChain);
      if (isValidAddress) {
        this.setReceiverAddress(value);
        return;
      }
      try {
        const resolvedAddress = await ConnectionController.getEnsAddress(value);
        if (resolvedAddress) {
          SendController.setReceiverProfileName(value);
          SendController.setReceiverAddress(resolvedAddress);
          const avatar = await ConnectionController.getEnsAvatar(value);
          SendController.setReceiverProfileImageUrl(avatar || void 0);
        }
      } catch (error) {
        this.setReceiverAddress(value);
      } finally {
        SendController.setLoading(false);
      }
    });
  }
  firstUpdated() {
    if (this.value) {
      this.instructionHidden = true;
    }
    this.checkHidden();
  }
  render() {
    if (this.readOnly) {
      return x` <wui-flex
        flexDirection="column"
        justifyContent="center"
        gap="01"
        .padding=${["8", "4", "5", "4"]}
      >
        <textarea
          spellcheck="false"
          ?disabled=${true}
          autocomplete="off"
          .value=${this.value ?? ""}
        >
           ${this.value ?? ""}</textarea
        >
      </wui-flex>`;
    }
    return x` <wui-flex
      @click=${this.onBoxClick.bind(this)}
      flexDirection="column"
      justifyContent="center"
      gap="01"
      .padding=${["8", "4", "5", "4"]}
    >
      <wui-text
        ${n$1(this.instructionElementRef)}
        class="instruction"
        color="secondary"
        variant="md-medium"
      >
        Type or
        <wui-button
          class="paste"
          size="md"
          variant="neutral-secondary"
          iconLeft="copy"
          @click=${this.onPasteClick.bind(this)}
        >
          <wui-icon size="sm" color="inherit" slot="iconLeft" name="copy"></wui-icon>
          Paste
        </wui-button>
        address
      </wui-text>
      <textarea
        spellcheck="false"
        ?disabled=${!this.instructionHidden}
        ${n$1(this.inputElementRef)}
        @input=${this.onInputChange.bind(this)}
        @blur=${this.onBlur.bind(this)}
        .value=${this.value ?? ""}
        autocomplete="off"
      >
${this.value ?? ""}</textarea
      >
    </wui-flex>`;
  }
  async focusInput() {
    if (this.instructionElementRef.value) {
      this.instructionHidden = true;
      await this.toggleInstructionFocus(false);
      this.instructionElementRef.value.style.pointerEvents = "none";
      this.inputElementRef.value?.focus();
      if (this.inputElementRef.value) {
        this.inputElementRef.value.selectionStart = this.inputElementRef.value.selectionEnd = this.inputElementRef.value.value.length;
      }
    }
  }
  async focusInstruction() {
    if (this.instructionElementRef.value) {
      this.instructionHidden = false;
      await this.toggleInstructionFocus(true);
      this.instructionElementRef.value.style.pointerEvents = "auto";
      this.inputElementRef.value?.blur();
    }
  }
  async toggleInstructionFocus(focus) {
    if (this.instructionElementRef.value) {
      await this.instructionElementRef.value.animate([{ opacity: focus ? 0 : 1 }, { opacity: focus ? 1 : 0 }], {
        duration: 100,
        easing: "ease",
        fill: "forwards"
      }).finished;
    }
  }
  onBoxClick() {
    if (!this.value && !this.instructionHidden) {
      this.focusInput();
    }
  }
  onBlur() {
    if (!this.value && this.instructionHidden && !this.pasting) {
      this.focusInstruction();
    }
  }
  checkHidden() {
    if (this.instructionHidden) {
      this.focusInput();
    }
  }
  async onPasteClick() {
    this.pasting = true;
    const text = await navigator.clipboard.readText();
    SendController.setReceiverAddress(text);
    this.focusInput();
  }
  onInputChange(e2) {
    const element = e2.target;
    this.pasting = false;
    this.value = e2.target?.value;
    if (element.value && !this.instructionHidden) {
      this.focusInput();
    }
    SendController.setLoading(true);
    this.onDebouncedSearch(element.value);
  }
  setReceiverAddress(address) {
    SendController.setReceiverAddress(address);
    SendController.setReceiverProfileName(void 0);
    SendController.setReceiverProfileImageUrl(void 0);
    SendController.setLoading(false);
  }
};
W3mInputAddress.styles = styles$8;
__decorate$8([
  n()
], W3mInputAddress.prototype, "value", void 0);
__decorate$8([
  n({ type: Boolean })
], W3mInputAddress.prototype, "readOnly", void 0);
__decorate$8([
  r()
], W3mInputAddress.prototype, "instructionHidden", void 0);
__decorate$8([
  r()
], W3mInputAddress.prototype, "pasting", void 0);
W3mInputAddress = __decorate$8([
  customElement("w3m-input-address")
], W3mInputAddress);
const styles$7 = css`
  :host {
    width: 100%;
    height: 100px;
    border-radius: ${({ borderRadius }) => borderRadius["5"]};
    border: 1px solid ${({ tokens }) => tokens.theme.foregroundPrimary};
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
    transition: background-color ${({ durations }) => durations["lg"]}
      ${({ easings }) => easings["ease-out-power-1"]};
    will-change: background-color;
    transition: all ${({ easings }) => easings["ease-out-power-1"]}
      ${({ durations }) => durations["lg"]};
  }

  :host(:hover) {
    background-color: ${({ tokens }) => tokens.theme.foregroundSecondary};
  }

  wui-flex {
    width: 100%;
    height: fit-content;
  }

  wui-button {
    width: 100%;
    display: flex;
    justify-content: flex-end;
  }

  wui-input-amount {
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

  .totalValue {
    width: 100%;
  }
`;
var __decorate$7 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mInputToken = class W3mInputToken2 extends i {
  constructor() {
    super(...arguments);
    this.readOnly = false;
    this.isInsufficientBalance = false;
  }
  render() {
    const isDisabled = this.readOnly || !this.token;
    return x` <wui-flex
      flexDirection="column"
      gap="01"
      .padding=${["5", "3", "4", "3"]}
    >
      <wui-flex alignItems="center">
        <wui-input-amount
          @inputChange=${this.onInputChange.bind(this)}
          ?disabled=${isDisabled}
          .value=${this.sendTokenAmount ? String(this.sendTokenAmount) : ""}
          ?error=${Boolean(this.isInsufficientBalance)}
        ></wui-input-amount>
        ${this.buttonTemplate()}
      </wui-flex>
      ${this.bottomTemplate()}
    </wui-flex>`;
  }
  buttonTemplate() {
    if (this.token) {
      return x`<wui-token-button
        text=${this.token.symbol}
        imageSrc=${this.token.iconUrl}
        @click=${this.handleSelectButtonClick.bind(this)}
      >
      </wui-token-button>`;
    }
    return x`<wui-button
      size="md"
      variant="neutral-secondary"
      @click=${this.handleSelectButtonClick.bind(this)}
      >Select token</wui-button
    >`;
  }
  handleSelectButtonClick() {
    if (!this.readOnly) {
      RouterController.push("WalletSendSelectToken");
    }
  }
  sendValueTemplate() {
    if (!this.readOnly && this.token && this.sendTokenAmount) {
      const price = this.token.price;
      const totalValue = price * this.sendTokenAmount;
      return x`<wui-text class="totalValue" variant="sm-regular" color="secondary"
        >${totalValue ? `$${NumberUtil.formatNumberToLocalString(totalValue, 2)}` : "Incorrect value"}</wui-text
      >`;
    }
    return null;
  }
  maxAmountTemplate() {
    if (this.token) {
      return x` <wui-text variant="sm-regular" color="secondary">
        ${UiHelperUtil.roundNumber(Number(this.token.quantity.numeric), 6, 5)}
      </wui-text>`;
    }
    return null;
  }
  actionTemplate() {
    if (this.token) {
      return x`<wui-link @click=${this.onMaxClick.bind(this)}>Max</wui-link>`;
    }
    return null;
  }
  bottomTemplate() {
    if (this.readOnly) {
      return null;
    }
    return x`<wui-flex alignItems="center" justifyContent="space-between">
      ${this.sendValueTemplate()}
      <wui-flex alignItems="center" gap="01" justifyContent="flex-end">
        ${this.maxAmountTemplate()} ${this.actionTemplate()}
      </wui-flex>
    </wui-flex>`;
  }
  onInputChange(event) {
    SendController.setTokenAmount(event.detail);
  }
  onMaxClick() {
    if (this.token) {
      const maxValue = NumberUtil.bigNumber(this.token.quantity.numeric);
      SendController.setTokenAmount(Number(maxValue.toFixed(20)));
    }
  }
};
W3mInputToken.styles = styles$7;
__decorate$7([
  n({ type: Object })
], W3mInputToken.prototype, "token", void 0);
__decorate$7([
  n({ type: Boolean })
], W3mInputToken.prototype, "readOnly", void 0);
__decorate$7([
  n({ type: Number })
], W3mInputToken.prototype, "sendTokenAmount", void 0);
__decorate$7([
  n({ type: Boolean })
], W3mInputToken.prototype, "isInsufficientBalance", void 0);
W3mInputToken = __decorate$7([
  customElement("w3m-input-token")
], W3mInputToken);
const styles$6 = css`
  :host {
    display: block;
  }

  wui-flex {
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

  wui-button {
    --local-border-radius: ${({ borderRadius }) => borderRadius["4"]} !important;
  }

  .inputContainer {
    height: fit-content;
  }
`;
var __decorate$6 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
const SEND_BUTTON_MESSAGE = {
  INSUFFICIENT_FUNDS: "Insufficient Funds",
  INCORRECT_VALUE: "Incorrect Value",
  INVALID_ADDRESS: "Invalid Address",
  ADD_ADDRESS: "Add Address",
  ADD_AMOUNT: "Add Amount",
  SELECT_TOKEN: "Select Token",
  PREVIEW_SEND: "Preview Send"
};
let W3mWalletSendView = class W3mWalletSendView2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.isTryingToChooseDifferentWallet = false;
    this.token = SendController.state.token;
    this.sendTokenAmount = SendController.state.sendTokenAmount;
    this.receiverAddress = SendController.state.receiverAddress;
    this.receiverProfileName = SendController.state.receiverProfileName;
    this.loading = SendController.state.loading;
    this.params = RouterController.state.data?.send;
    this.caipAddress = ChainController.getAccountData()?.caipAddress;
    this.message = SEND_BUTTON_MESSAGE.PREVIEW_SEND;
    this.disconnecting = false;
    if (this.token && !this.params) {
      this.fetchBalances();
      this.fetchNetworkPrice();
    }
    const unsubscribe = ChainController.subscribeKey("activeCaipAddress", (val) => {
      if (!val && this.isTryingToChooseDifferentWallet) {
        this.isTryingToChooseDifferentWallet = false;
        ModalController.open({
          view: "Connect",
          data: {
            redirectView: "WalletSend"
          }
        }).catch(() => null);
        unsubscribe();
      }
    });
    this.unsubscribe.push(...[
      ChainController.subscribeAccountStateProp("caipAddress", (val) => {
        this.caipAddress = val;
      }),
      SendController.subscribe((val) => {
        this.token = val.token;
        this.sendTokenAmount = val.sendTokenAmount;
        this.receiverAddress = val.receiverAddress;
        this.receiverProfileName = val.receiverProfileName;
        this.loading = val.loading;
      })
    ]);
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
  }
  async firstUpdated() {
    await this.handleSendParameters();
  }
  render() {
    this.getMessage();
    const isReadOnly = Boolean(this.params);
    return x` <wui-flex flexDirection="column" .padding=${["0", "4", "4", "4"]}>
      <wui-flex class="inputContainer" gap="2" flexDirection="column">
        <w3m-input-token
          .token=${this.token}
          .sendTokenAmount=${this.sendTokenAmount}
          ?readOnly=${isReadOnly}
          ?isInsufficientBalance=${this.message === SEND_BUTTON_MESSAGE.INSUFFICIENT_FUNDS}
        ></w3m-input-token>
        <wui-icon-box size="md" variant="secondary" icon="arrowBottom"></wui-icon-box>
        <w3m-input-address
          ?readOnly=${isReadOnly}
          .value=${this.receiverProfileName ? this.receiverProfileName : this.receiverAddress}
        ></w3m-input-address>
      </wui-flex>
      ${this.buttonTemplate()}
    </wui-flex>`;
  }
  async fetchBalances() {
    await SendController.fetchTokenBalance();
    SendController.fetchNetworkBalance();
  }
  async fetchNetworkPrice() {
    await SwapController.getNetworkTokenPrice();
  }
  onButtonClick() {
    RouterController.push("WalletSendPreview", {
      send: this.params
    });
  }
  onFundWalletClick() {
    RouterController.push("FundWallet", {
      redirectView: "WalletSend"
    });
  }
  async onConnectDifferentWalletClick() {
    try {
      this.isTryingToChooseDifferentWallet = true;
      this.disconnecting = true;
      await ConnectionController.disconnect();
    } finally {
      this.disconnecting = false;
    }
  }
  getMessage() {
    this.message = SEND_BUTTON_MESSAGE.PREVIEW_SEND;
    if (this.receiverAddress && !CoreHelperUtil.isAddress(this.receiverAddress, ChainController.state.activeChain)) {
      this.message = SEND_BUTTON_MESSAGE.INVALID_ADDRESS;
    }
    if (!this.receiverAddress) {
      this.message = SEND_BUTTON_MESSAGE.ADD_ADDRESS;
    }
    if (this.sendTokenAmount && this.token && this.sendTokenAmount > Number(this.token.quantity.numeric)) {
      this.message = SEND_BUTTON_MESSAGE.INSUFFICIENT_FUNDS;
    }
    if (!this.sendTokenAmount) {
      this.message = SEND_BUTTON_MESSAGE.ADD_AMOUNT;
    }
    if (this.sendTokenAmount && this.token?.price) {
      const value = this.sendTokenAmount * this.token.price;
      if (!value) {
        this.message = SEND_BUTTON_MESSAGE.INCORRECT_VALUE;
      }
    }
    if (!this.token) {
      this.message = SEND_BUTTON_MESSAGE.SELECT_TOKEN;
    }
  }
  buttonTemplate() {
    const isDisabled = !this.message.startsWith(SEND_BUTTON_MESSAGE.PREVIEW_SEND);
    const isInsufficientBalance = this.message === SEND_BUTTON_MESSAGE.INSUFFICIENT_FUNDS;
    const isReadOnly = Boolean(this.params);
    if (isInsufficientBalance && !isReadOnly) {
      return x`
        <wui-flex .margin=${["4", "0", "0", "0"]} flexDirection="column" gap="4">
          <wui-button
            @click=${this.onFundWalletClick.bind(this)}
            size="lg"
            variant="accent-secondary"
            fullWidth
          >
            Fund Wallet
          </wui-button>

          <wui-separator data-testid="wui-separator" text="or"></wui-separator>

          <wui-button
            @click=${this.onConnectDifferentWalletClick.bind(this)}
            size="lg"
            variant="neutral-secondary"
            fullWidth
            ?loading=${this.disconnecting}
          >
            Connect a different wallet
          </wui-button>
        </wui-flex>
      `;
    }
    return x`<wui-flex .margin=${["4", "0", "0", "0"]}>
      <wui-button
        @click=${this.onButtonClick.bind(this)}
        ?disabled=${isDisabled}
        size="lg"
        variant="accent-primary"
        ?loading=${this.loading}
        fullWidth
      >
        ${this.message}
      </wui-button>
    </wui-flex>`;
  }
  async handleSendParameters() {
    this.loading = true;
    if (!this.params) {
      this.loading = false;
      return;
    }
    const amount = Number(this.params.amount);
    if (isNaN(amount)) {
      SnackController.showError("Invalid amount");
      this.loading = false;
      return;
    }
    const { namespace, chainId, assetAddress } = this.params;
    if (!ConstantsUtil.SEND_PARAMS_SUPPORTED_CHAINS.includes(namespace)) {
      SnackController.showError(`Chain "${namespace}" is not supported for send parameters`);
      this.loading = false;
      return;
    }
    const caipNetwork = ChainController.getCaipNetworkById(chainId, namespace);
    if (!caipNetwork) {
      SnackController.showError(`Network with id "${chainId}" not found`);
      this.loading = false;
      return;
    }
    try {
      const { balance, name, symbol, decimals } = await BalanceUtil.fetchERC20Balance({
        caipAddress: this.caipAddress,
        assetAddress,
        caipNetwork
      });
      if (!name || !symbol || !decimals || !balance) {
        SnackController.showError("Token not found");
        return;
      }
      SendController.setToken({
        name,
        symbol,
        chainId: caipNetwork.id.toString(),
        address: `${caipNetwork.chainNamespace}:${caipNetwork.id}:${assetAddress}`,
        value: 0,
        price: 0,
        quantity: {
          decimals: decimals.toString(),
          numeric: balance.toString()
        },
        iconUrl: AssetUtil.getTokenImage(symbol) ?? ""
      });
      SendController.setTokenAmount(amount);
      SendController.setReceiverAddress(this.params.to);
    } catch (err) {
      console.error("Failed to load token information:", err);
      SnackController.showError("Failed to load token information");
    } finally {
      this.loading = false;
    }
  }
};
W3mWalletSendView.styles = styles$6;
__decorate$6([
  r()
], W3mWalletSendView.prototype, "token", void 0);
__decorate$6([
  r()
], W3mWalletSendView.prototype, "sendTokenAmount", void 0);
__decorate$6([
  r()
], W3mWalletSendView.prototype, "receiverAddress", void 0);
__decorate$6([
  r()
], W3mWalletSendView.prototype, "receiverProfileName", void 0);
__decorate$6([
  r()
], W3mWalletSendView.prototype, "loading", void 0);
__decorate$6([
  r()
], W3mWalletSendView.prototype, "params", void 0);
__decorate$6([
  r()
], W3mWalletSendView.prototype, "caipAddress", void 0);
__decorate$6([
  r()
], W3mWalletSendView.prototype, "message", void 0);
__decorate$6([
  r()
], W3mWalletSendView.prototype, "disconnecting", void 0);
W3mWalletSendView = __decorate$6([
  customElement("w3m-wallet-send-view")
], W3mWalletSendView);
const styles$5 = css`
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
var __decorate$5 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mSendSelectTokenView = class W3mSendSelectTokenView2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.tokenBalances = SendController.state.tokenBalances;
    this.search = "";
    this.onDebouncedSearch = CoreHelperUtil.debounce((value) => {
      this.search = value;
    });
    this.fetchBalancesAndNetworkPrice();
    this.unsubscribe.push(...[
      SendController.subscribe((val) => {
        this.tokenBalances = val.tokenBalances;
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
  async fetchBalancesAndNetworkPrice() {
    if (!this.tokenBalances || this.tokenBalances?.length === 0) {
      await this.fetchBalances();
      await this.fetchNetworkPrice();
    }
  }
  async fetchBalances() {
    await SendController.fetchTokenBalance();
    SendController.fetchNetworkBalance();
  }
  async fetchNetworkPrice() {
    await SwapController.getNetworkTokenPrice();
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
    this.tokens = this.tokenBalances?.filter((token) => token.chainId === ChainController.state.activeCaipNetwork?.caipNetworkId);
    if (this.search) {
      this.filteredTokens = this.tokenBalances?.filter((token) => token.name.toLowerCase().includes(this.search.toLowerCase()));
    } else {
      this.filteredTokens = this.tokens;
    }
    return x`
      <wui-flex
        class="contentContainer"
        flexDirection="column"
        .padding=${["0", "3", "0", "3"]}
      >
        <wui-flex justifyContent="flex-start" .padding=${["4", "3", "3", "3"]}>
          <wui-text variant="md-medium" color="secondary">Your tokens</wui-text>
        </wui-flex>
        <wui-flex flexDirection="column" gap="2">
          ${this.filteredTokens && this.filteredTokens.length > 0 ? this.filteredTokens.map((token) => x`<wui-list-token
                    @click=${this.handleTokenClick.bind(this, token)}
                    ?clickable=${true}
                    tokenName=${token.name}
                    tokenImageUrl=${token.iconUrl}
                    tokenAmount=${token.quantity.numeric}
                    tokenValue=${token.value}
                    tokenCurrency=${token.symbol}
                  ></wui-list-token>`) : x`<wui-flex
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
                  flexDirection="column"
                >
                  <wui-text variant="lg-medium" align="center" color="primary">
                    No tokens found
                  </wui-text>
                  <wui-text variant="lg-regular" align="center" color="secondary">
                    Your tokens will appear here
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
  handleTokenClick(token) {
    SendController.setToken(token);
    SendController.setTokenAmount(void 0);
    RouterController.goBack();
  }
};
W3mSendSelectTokenView.styles = styles$5;
__decorate$5([
  r()
], W3mSendSelectTokenView.prototype, "tokenBalances", void 0);
__decorate$5([
  r()
], W3mSendSelectTokenView.prototype, "tokens", void 0);
__decorate$5([
  r()
], W3mSendSelectTokenView.prototype, "filteredTokens", void 0);
__decorate$5([
  r()
], W3mSendSelectTokenView.prototype, "search", void 0);
W3mSendSelectTokenView = __decorate$5([
  customElement("w3m-wallet-send-select-token-view")
], W3mSendSelectTokenView);
const styles$4 = css`
  :host {
    height: 32px;
    display: flex;
    align-items: center;
    gap: ${({ spacing }) => spacing[1]};
    border-radius: ${({ borderRadius }) => borderRadius[32]};
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
    padding: ${({ spacing }) => spacing[1]};
    padding-left: ${({ spacing }) => spacing[2]};
  }

  wui-avatar,
  wui-image {
    width: 24px;
    height: 24px;
    border-radius: ${({ borderRadius }) => borderRadius[16]};
  }

  wui-icon {
    border-radius: ${({ borderRadius }) => borderRadius[16]};
  }
`;
var __decorate$4 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let WuiPreviewItem = class WuiPreviewItem2 extends i {
  constructor() {
    super(...arguments);
    this.text = "";
  }
  render() {
    return x`<wui-text variant="lg-regular" color="primary">${this.text}</wui-text>
      ${this.imageTemplate()}`;
  }
  imageTemplate() {
    if (this.address) {
      return x`<wui-avatar address=${this.address} .imageSrc=${this.imageSrc}></wui-avatar>`;
    } else if (this.imageSrc) {
      return x`<wui-image src=${this.imageSrc}></wui-image>`;
    }
    return x`<wui-icon size="lg" color="inverse" name="networkPlaceholder"></wui-icon>`;
  }
};
WuiPreviewItem.styles = [resetStyles, elementStyles, styles$4];
__decorate$4([
  n({ type: String })
], WuiPreviewItem.prototype, "text", void 0);
__decorate$4([
  n({ type: String })
], WuiPreviewItem.prototype, "address", void 0);
__decorate$4([
  n({ type: String })
], WuiPreviewItem.prototype, "imageSrc", void 0);
WuiPreviewItem = __decorate$4([
  customElement("wui-preview-item")
], WuiPreviewItem);
const styles$3 = css`
  :host {
    display: flex;
    padding: ${({ spacing }) => spacing[4]} ${({ spacing }) => spacing[3]};
    width: 100%;
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
    border-radius: ${({ borderRadius }) => borderRadius[4]};
  }

  wui-image {
    width: 20px;
    height: 20px;
    border-radius: ${({ borderRadius }) => borderRadius[16]};
  }

  wui-icon {
    width: 20px;
    height: 20px;
  }
`;
var __decorate$3 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let WuiListContent = class WuiListContent2 extends i {
  constructor() {
    super(...arguments);
    this.imageSrc = void 0;
    this.textTitle = "";
    this.textValue = void 0;
  }
  render() {
    return x`
      <wui-flex justifyContent="space-between" alignItems="center">
        <wui-text variant="lg-regular" color="primary"> ${this.textTitle} </wui-text>
        ${this.templateContent()}
      </wui-flex>
    `;
  }
  templateContent() {
    if (this.imageSrc) {
      return x`<wui-image src=${this.imageSrc} alt=${this.textTitle}></wui-image>`;
    } else if (this.textValue) {
      return x` <wui-text variant="md-regular" color="secondary"> ${this.textValue} </wui-text>`;
    }
    return x`<wui-icon size="inherit" color="default" name="networkPlaceholder"></wui-icon>`;
  }
};
WuiListContent.styles = [resetStyles, elementStyles, styles$3];
__decorate$3([
  n()
], WuiListContent.prototype, "imageSrc", void 0);
__decorate$3([
  n()
], WuiListContent.prototype, "textTitle", void 0);
__decorate$3([
  n()
], WuiListContent.prototype, "textValue", void 0);
WuiListContent = __decorate$3([
  customElement("wui-list-content")
], WuiListContent);
const styles$2 = css`
  :host {
    display: flex;
    width: auto;
    flex-direction: column;
    gap: ${({ spacing }) => spacing["1"]};
    border-radius: ${({ borderRadius }) => borderRadius["5"]};
    background: ${({ tokens }) => tokens.theme.foregroundPrimary};
    padding: ${({ spacing }) => spacing["3"]} ${({ spacing }) => spacing["2"]}
      ${({ spacing }) => spacing["2"]} ${({ spacing }) => spacing["2"]};
  }

  wui-list-content {
    width: -webkit-fill-available !important;
  }

  wui-text {
    padding: 0 ${({ spacing }) => spacing["2"]};
  }

  wui-flex {
    margin-top: ${({ spacing }) => spacing["2"]};
  }

  .network {
    cursor: pointer;
    transition: background-color ${({ durations }) => durations["lg"]}
      ${({ easings }) => easings["ease-out-power-1"]};
    will-change: background-color;
  }

  .network:focus-visible {
    border: 1px solid ${({ tokens }) => tokens.core.textAccentPrimary};
    background-color: ${({ tokens }) => tokens.core.glass010};
    -webkit-box-shadow: 0px 0px 0px 4px ${({ tokens }) => tokens.core.foregroundAccent010};
    -moz-box-shadow: 0px 0px 0px 4px ${({ tokens }) => tokens.core.foregroundAccent010};
    box-shadow: 0px 0px 0px 4px ${({ tokens }) => tokens.core.foregroundAccent010};
  }

  .network:hover {
    background-color: ${({ tokens }) => tokens.core.glass010};
  }

  .network:active {
    background-color: ${({ tokens }) => tokens.core.glass010};
  }
`;
var __decorate$2 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mWalletSendDetails = class W3mWalletSendDetails2 extends i {
  constructor() {
    super(...arguments);
    this.params = RouterController.state.data?.send;
  }
  render() {
    return x` <wui-text variant="sm-regular" color="secondary">Details</wui-text>
      <wui-flex flexDirection="column" gap="1">
        <wui-list-content
          textTitle="Address"
          textValue=${UiHelperUtil.getTruncateString({
      string: this.receiverAddress ?? "",
      charsStart: 4,
      charsEnd: 4,
      truncate: "middle"
    })}
        >
        </wui-list-content>
        ${this.networkTemplate()}
      </wui-flex>`;
  }
  networkTemplate() {
    if (this.caipNetwork?.name) {
      return x` <wui-list-content
        @click=${() => this.onNetworkClick(this.caipNetwork)}
        class="network"
        textTitle="Network"
        imageSrc=${o(AssetUtil.getNetworkImage(this.caipNetwork))}
      ></wui-list-content>`;
    }
    return null;
  }
  onNetworkClick(network) {
    if (network && !this.params) {
      RouterController.push("Networks", { network });
    }
  }
};
W3mWalletSendDetails.styles = styles$2;
__decorate$2([
  n()
], W3mWalletSendDetails.prototype, "receiverAddress", void 0);
__decorate$2([
  n({ type: Object })
], W3mWalletSendDetails.prototype, "caipNetwork", void 0);
__decorate$2([
  r()
], W3mWalletSendDetails.prototype, "params", void 0);
W3mWalletSendDetails = __decorate$2([
  customElement("w3m-wallet-send-details")
], W3mWalletSendDetails);
const styles$1 = css`
  wui-avatar,
  wui-image {
    display: ruby;
    width: 32px;
    height: 32px;
    border-radius: ${({ borderRadius }) => borderRadius["20"]};
  }

  .sendButton {
    width: 70%;
    --local-width: 100% !important;
    --local-border-radius: ${({ borderRadius }) => borderRadius["4"]} !important;
  }

  .cancelButton {
    width: 30%;
    --local-width: 100% !important;
    --local-border-radius: ${({ borderRadius }) => borderRadius["4"]} !important;
  }
`;
var __decorate$1 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mWalletSendPreviewView = class W3mWalletSendPreviewView2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.token = SendController.state.token;
    this.sendTokenAmount = SendController.state.sendTokenAmount;
    this.receiverAddress = SendController.state.receiverAddress;
    this.receiverProfileName = SendController.state.receiverProfileName;
    this.receiverProfileImageUrl = SendController.state.receiverProfileImageUrl;
    this.caipNetwork = ChainController.state.activeCaipNetwork;
    this.loading = SendController.state.loading;
    this.params = RouterController.state.data?.send;
    this.unsubscribe.push(...[
      SendController.subscribe((val) => {
        this.token = val.token;
        this.sendTokenAmount = val.sendTokenAmount;
        this.receiverAddress = val.receiverAddress;
        this.receiverProfileName = val.receiverProfileName;
        this.receiverProfileImageUrl = val.receiverProfileImageUrl;
        this.loading = val.loading;
      }),
      ChainController.subscribeKey("activeCaipNetwork", (val) => this.caipNetwork = val)
    ]);
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
  }
  render() {
    return x` <wui-flex flexDirection="column" .padding=${["0", "4", "4", "4"]}>
      <wui-flex gap="2" flexDirection="column" .padding=${["0", "2", "0", "2"]}>
        <wui-flex alignItems="center" justifyContent="space-between">
          <wui-flex flexDirection="column" gap="01">
            <wui-text variant="sm-regular" color="secondary">Send</wui-text>
            ${this.sendValueTemplate()}
          </wui-flex>
          <wui-preview-item
            text="${this.sendTokenAmount ? UiHelperUtil.roundNumber(this.sendTokenAmount, 6, 5) : "unknown"} ${this.token?.symbol}"
            .imageSrc=${this.token?.iconUrl}
          ></wui-preview-item>
        </wui-flex>
        <wui-flex>
          <wui-icon color="default" size="md" name="arrowBottom"></wui-icon>
        </wui-flex>
        <wui-flex alignItems="center" justifyContent="space-between">
          <wui-text variant="sm-regular" color="secondary">To</wui-text>
          <wui-preview-item
            text="${this.receiverProfileName ? UiHelperUtil.getTruncateString({
      string: this.receiverProfileName,
      charsStart: 20,
      charsEnd: 0,
      truncate: "end"
    }) : UiHelperUtil.getTruncateString({
      string: this.receiverAddress ? this.receiverAddress : "",
      charsStart: 4,
      charsEnd: 4,
      truncate: "middle"
    })}"
            address=${this.receiverAddress ?? ""}
            .imageSrc=${this.receiverProfileImageUrl ?? void 0}
            .isAddress=${true}
          ></wui-preview-item>
        </wui-flex>
      </wui-flex>
      <wui-flex flexDirection="column" .padding=${["6", "0", "0", "0"]}>
        <w3m-wallet-send-details
          .caipNetwork=${this.caipNetwork}
          .receiverAddress=${this.receiverAddress}
        ></w3m-wallet-send-details>
        <wui-flex justifyContent="center" gap="1" .padding=${["3", "0", "0", "0"]}>
          <wui-icon size="sm" color="default" name="warningCircle"></wui-icon>
          <wui-text variant="sm-regular" color="secondary">Review transaction carefully</wui-text>
        </wui-flex>
        <wui-flex justifyContent="center" gap="3" .padding=${["4", "0", "0", "0"]}>
          <wui-button
            class="cancelButton"
            @click=${this.onCancelClick.bind(this)}
            size="lg"
            variant="neutral-secondary"
          >
            Cancel
          </wui-button>
          <wui-button
            class="sendButton"
            @click=${this.onSendClick.bind(this)}
            size="lg"
            variant="accent-primary"
            .loading=${this.loading}
          >
            Send
          </wui-button>
        </wui-flex>
      </wui-flex></wui-flex
    >`;
  }
  sendValueTemplate() {
    if (!this.params && this.token && this.sendTokenAmount) {
      const price = this.token.price;
      const totalValue = price * this.sendTokenAmount;
      return x`<wui-text variant="md-regular" color="primary"
        >$${totalValue.toFixed(2)}</wui-text
      >`;
    }
    return null;
  }
  async onSendClick() {
    if (!this.sendTokenAmount || !this.receiverAddress) {
      SnackController.showError("Please enter a valid amount and receiver address");
      return;
    }
    try {
      await SendController.sendToken();
      if (this.params) {
        RouterController.reset("WalletSendConfirmed");
      } else {
        SnackController.showSuccess("Transaction started");
        RouterController.replace("Account");
      }
    } catch (error) {
      let errMessage = "Failed to send transaction";
      const isUserRejectedRequestError = error instanceof AppKitError && error.originalName === ErrorUtil.PROVIDER_RPC_ERROR_NAME.USER_REJECTED_REQUEST;
      const isSendTransactionError = error instanceof AppKitError && error.originalName === ErrorUtil.PROVIDER_RPC_ERROR_NAME.SEND_TRANSACTION_ERROR;
      if (isUserRejectedRequestError || isSendTransactionError) {
        errMessage = error.message;
      }
      EventsController.sendEvent({
        type: "track",
        event: isUserRejectedRequestError ? "SEND_REJECTED" : "SEND_ERROR",
        properties: SendController.getSdkEventProperties(error)
      });
      SnackController.showError(errMessage);
    }
  }
  onCancelClick() {
    RouterController.goBack();
  }
};
W3mWalletSendPreviewView.styles = styles$1;
__decorate$1([
  r()
], W3mWalletSendPreviewView.prototype, "token", void 0);
__decorate$1([
  r()
], W3mWalletSendPreviewView.prototype, "sendTokenAmount", void 0);
__decorate$1([
  r()
], W3mWalletSendPreviewView.prototype, "receiverAddress", void 0);
__decorate$1([
  r()
], W3mWalletSendPreviewView.prototype, "receiverProfileName", void 0);
__decorate$1([
  r()
], W3mWalletSendPreviewView.prototype, "receiverProfileImageUrl", void 0);
__decorate$1([
  r()
], W3mWalletSendPreviewView.prototype, "caipNetwork", void 0);
__decorate$1([
  r()
], W3mWalletSendPreviewView.prototype, "loading", void 0);
__decorate$1([
  r()
], W3mWalletSendPreviewView.prototype, "params", void 0);
W3mWalletSendPreviewView = __decorate$1([
  customElement("w3m-wallet-send-preview-view")
], W3mWalletSendPreviewView);
const styles = css`
  .icon-box {
    width: 64px;
    height: 64px;
    border-radius: 16px;
    background-color: ${({ spacing }) => spacing[16]};
    border: 8px solid ${({ tokens }) => tokens.theme.borderPrimary};
    border-radius: ${({ borderRadius }) => borderRadius.round};
  }
`;
var __decorate = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mSendConfirmedView = class W3mSendConfirmedView2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.unsubscribe.push(...[]);
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
          <wui-icon size="xxl" color="success" name="checkmark"></wui-icon>
        </wui-flex>

        <wui-text variant="h6-medium" color="primary">You successfully sent asset</wui-text>

        <wui-button
          fullWidth
          @click=${this.onCloseClick.bind(this)}
          size="lg"
          variant="neutral-secondary"
        >
          Close
        </wui-button>
      </wui-flex>
    `;
  }
  onCloseClick() {
    ModalController.close();
  }
};
W3mSendConfirmedView.styles = styles;
W3mSendConfirmedView = __decorate([
  customElement("w3m-send-confirmed-view")
], W3mSendConfirmedView);
export {
  W3mSendConfirmedView,
  W3mSendSelectTokenView,
  W3mWalletSendPreviewView,
  W3mWalletSendView
};
