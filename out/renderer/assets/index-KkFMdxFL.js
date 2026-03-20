import { n as css, r as resetStyles, o as elementStyles, q as i, x, t as i$1, J as W3mFrameHelpers, R as RouterController, l as ConnectorController, c as CoreHelperUtil, S as SnackController } from "./walletconnect-BVoLvI4P.js";
import { n, c as customElement, r, U as UiHelperUtil } from "./index-5878y4Sm.js";
import "./index-Bz3_ZVag.js";
import "./index-DAKl5XGv.js";
const styles$2 = css`
  :host {
    position: relative;
    display: inline-block;
  }

  input {
    width: 48px;
    height: 48px;
    background: ${({ tokens }) => tokens.theme.foregroundPrimary};
    border-radius: ${({ borderRadius }) => borderRadius[4]};
    border: 1px solid ${({ tokens }) => tokens.theme.borderPrimary};
    font-family: ${({ fontFamily }) => fontFamily.regular};
    font-size: ${({ textSize }) => textSize.large};
    line-height: 18px;
    letter-spacing: -0.16px;
    text-align: center;
    color: ${({ tokens }) => tokens.theme.textPrimary};
    caret-color: ${({ tokens }) => tokens.core.textAccentPrimary};
    transition:
      background-color ${({ durations }) => durations["lg"]}
        ${({ easings }) => easings["ease-out-power-2"]},
      border-color ${({ durations }) => durations["lg"]}
        ${({ easings }) => easings["ease-out-power-2"]},
      box-shadow ${({ durations }) => durations["lg"]}
        ${({ easings }) => easings["ease-out-power-2"]};
    will-change: background-color, border-color, box-shadow;
    box-sizing: border-box;
    -webkit-appearance: none;
    -moz-appearance: textfield;
    padding: ${({ spacing }) => spacing[4]};
  }

  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  input[type='number'] {
    -moz-appearance: textfield;
  }

  input:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  input:focus-visible:enabled {
    background-color: transparent;
    border: 1px solid ${({ tokens }) => tokens.theme.borderSecondary};
    box-shadow: 0px 0px 0px 4px ${({ tokens }) => tokens.core.foregroundAccent040};
  }
`;
var __decorate$2 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let WuiInputNumeric = class WuiInputNumeric2 extends i {
  constructor() {
    super(...arguments);
    this.disabled = false;
    this.value = "";
  }
  render() {
    return x`<input
      type="number"
      maxlength="1"
      inputmode="numeric"
      autofocus
      ?disabled=${this.disabled}
      value=${this.value}
    /> `;
  }
};
WuiInputNumeric.styles = [resetStyles, elementStyles, styles$2];
__decorate$2([
  n({ type: Boolean })
], WuiInputNumeric.prototype, "disabled", void 0);
__decorate$2([
  n({ type: String })
], WuiInputNumeric.prototype, "value", void 0);
WuiInputNumeric = __decorate$2([
  customElement("wui-input-numeric")
], WuiInputNumeric);
const styles$1 = i$1`
  :host {
    position: relative;
    display: block;
  }
`;
var __decorate$1 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let WuiOtp = class WuiOtp2 extends i {
  constructor() {
    super(...arguments);
    this.length = 6;
    this.otp = "";
    this.values = Array.from({ length: this.length }).map(() => "");
    this.numerics = [];
    this.shouldInputBeEnabled = (index) => {
      const previousInputs = this.values.slice(0, index);
      return previousInputs.every((input) => input !== "");
    };
    this.handleKeyDown = (e, index) => {
      const inputElement = e.target;
      const input = this.getInputElement(inputElement);
      const keyArr = ["ArrowLeft", "ArrowRight", "Shift", "Delete"];
      if (!input) {
        return;
      }
      if (keyArr.includes(e.key)) {
        e.preventDefault();
      }
      const currentCaretPos = input.selectionStart;
      switch (e.key) {
        case "ArrowLeft":
          if (currentCaretPos) {
            input.setSelectionRange(currentCaretPos + 1, currentCaretPos + 1);
          }
          this.focusInputField("prev", index);
          break;
        case "ArrowRight":
          this.focusInputField("next", index);
          break;
        case "Shift":
          this.focusInputField("next", index);
          break;
        case "Delete":
          if (input.value === "") {
            this.focusInputField("prev", index);
          } else {
            this.updateInput(input, index, "");
          }
          break;
        case "Backspace":
          if (input.value === "") {
            this.focusInputField("prev", index);
          } else {
            this.updateInput(input, index, "");
          }
          break;
      }
    };
    this.focusInputField = (dir, index) => {
      if (dir === "next") {
        const nextIndex = index + 1;
        if (!this.shouldInputBeEnabled(nextIndex)) {
          return;
        }
        const numeric = this.numerics[nextIndex < this.length ? nextIndex : index];
        const input = numeric ? this.getInputElement(numeric) : void 0;
        if (input) {
          input.disabled = false;
          input.focus();
        }
      }
      if (dir === "prev") {
        const nextIndex = index - 1;
        const numeric = this.numerics[nextIndex > -1 ? nextIndex : index];
        const input = numeric ? this.getInputElement(numeric) : void 0;
        if (input) {
          input.focus();
        }
      }
    };
  }
  firstUpdated() {
    if (this.otp) {
      this.values = this.otp.split("");
    }
    const numericElements = this.shadowRoot?.querySelectorAll("wui-input-numeric");
    if (numericElements) {
      this.numerics = Array.from(numericElements);
    }
    this.numerics[0]?.focus();
  }
  render() {
    return x`
      <wui-flex gap="1" data-testid="wui-otp-input">
        ${Array.from({ length: this.length }).map((_, index) => x`
            <wui-input-numeric
              @input=${(e) => this.handleInput(e, index)}
              @click=${(e) => this.selectInput(e)}
              @keydown=${(e) => this.handleKeyDown(e, index)}
              .disabled=${!this.shouldInputBeEnabled(index)}
              .value=${this.values[index] || ""}
            >
            </wui-input-numeric>
          `)}
      </wui-flex>
    `;
  }
  updateInput(element, index, value) {
    const numeric = this.numerics[index];
    const input = element || (numeric ? this.getInputElement(numeric) : void 0);
    if (input) {
      input.value = value;
      this.values = this.values.map((val, i2) => i2 === index ? value : val);
    }
  }
  selectInput(e) {
    const targetElement = e.target;
    if (targetElement) {
      const inputElement = this.getInputElement(targetElement);
      inputElement?.select();
    }
  }
  handleInput(e, index) {
    const inputElement = e.target;
    const input = this.getInputElement(inputElement);
    if (input) {
      const inputValue = input.value;
      if (e.inputType === "insertFromPaste") {
        this.handlePaste(input, inputValue, index);
      } else {
        const isValid = UiHelperUtil.isNumber(inputValue);
        if (isValid && e.data) {
          this.updateInput(input, index, e.data);
          this.focusInputField("next", index);
        } else {
          this.updateInput(input, index, "");
        }
      }
    }
    this.dispatchInputChangeEvent();
  }
  handlePaste(input, inputValue, index) {
    const value = inputValue[0];
    const isValid = value && UiHelperUtil.isNumber(value);
    if (isValid) {
      this.updateInput(input, index, value);
      const inputString = inputValue.substring(1);
      if (index + 1 < this.length && inputString.length) {
        const nextNumeric = this.numerics[index + 1];
        const nextInput = nextNumeric ? this.getInputElement(nextNumeric) : void 0;
        if (nextInput) {
          this.handlePaste(nextInput, inputString, index + 1);
        }
      } else {
        this.focusInputField("next", index);
      }
    } else {
      this.updateInput(input, index, "");
    }
  }
  getInputElement(el) {
    if (el.shadowRoot?.querySelector("input")) {
      return el.shadowRoot.querySelector("input");
    }
    return null;
  }
  dispatchInputChangeEvent() {
    const value = this.values.join("");
    this.dispatchEvent(new CustomEvent("inputChange", {
      detail: value,
      bubbles: true,
      composed: true
    }));
  }
};
WuiOtp.styles = [resetStyles, styles$1];
__decorate$1([
  n({ type: Number })
], WuiOtp.prototype, "length", void 0);
__decorate$1([
  n({ type: String })
], WuiOtp.prototype, "otp", void 0);
__decorate$1([
  r()
], WuiOtp.prototype, "values", void 0);
WuiOtp = __decorate$1([
  customElement("wui-otp")
], WuiOtp);
const styles = i$1`
  wui-loading-spinner {
    margin: 9px auto;
  }

  .email-display,
  .email-display wui-text {
    max-width: 100%;
  }
`;
var __decorate = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
var W3mEmailOtpWidget_1;
let W3mEmailOtpWidget = W3mEmailOtpWidget_1 = class W3mEmailOtpWidget2 extends i {
  firstUpdated() {
    this.startOTPTimeout();
  }
  disconnectedCallback() {
    clearTimeout(this.OTPTimeout);
  }
  constructor() {
    super();
    this.loading = false;
    this.timeoutTimeLeft = W3mFrameHelpers.getTimeToNextEmailLogin();
    this.error = "";
    this.otp = "";
    this.email = RouterController.state.data?.email;
    this.authConnector = ConnectorController.getAuthConnector();
  }
  render() {
    if (!this.email) {
      throw new Error("w3m-email-otp-widget: No email provided");
    }
    const isResendDisabled = Boolean(this.timeoutTimeLeft);
    const footerLabels = this.getFooterLabels(isResendDisabled);
    return x`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        .padding=${["4", "0", "4", "0"]}
        gap="4"
      >
        <wui-flex
          class="email-display"
          flexDirection="column"
          alignItems="center"
          .padding=${["0", "5", "0", "5"]}
        >
          <wui-text variant="md-regular" color="primary" align="center">
            Enter the code we sent to
          </wui-text>
          <wui-text variant="md-medium" color="primary" lineClamp="1" align="center">
            ${this.email}
          </wui-text>
        </wui-flex>

        <wui-text variant="sm-regular" color="secondary">The code expires in 20 minutes</wui-text>

        ${this.loading ? x`<wui-loading-spinner size="xl" color="accent-primary"></wui-loading-spinner>` : x` <wui-flex flexDirection="column" alignItems="center" gap="2">
              <wui-otp
                dissabled
                length="6"
                @inputChange=${this.onOtpInputChange.bind(this)}
                .otp=${this.otp}
              ></wui-otp>
              ${this.error ? x`
                    <wui-text variant="sm-regular" align="center" color="error">
                      ${this.error}. Try Again
                    </wui-text>
                  ` : null}
            </wui-flex>`}

        <wui-flex alignItems="center" gap="2">
          <wui-text variant="sm-regular" color="secondary">${footerLabels.title}</wui-text>
          <wui-link @click=${this.onResendCode.bind(this)} .disabled=${isResendDisabled}>
            ${footerLabels.action}
          </wui-link>
        </wui-flex>
      </wui-flex>
    `;
  }
  startOTPTimeout() {
    this.timeoutTimeLeft = W3mFrameHelpers.getTimeToNextEmailLogin();
    this.OTPTimeout = setInterval(() => {
      if (this.timeoutTimeLeft > 0) {
        this.timeoutTimeLeft = W3mFrameHelpers.getTimeToNextEmailLogin();
      } else {
        clearInterval(this.OTPTimeout);
      }
    }, 1e3);
  }
  async onOtpInputChange(event) {
    try {
      if (!this.loading) {
        this.otp = event.detail;
        if (this.shouldSubmitOnOtpChange()) {
          this.loading = true;
          await this.onOtpSubmit?.(this.otp);
        }
      }
    } catch (error) {
      this.error = CoreHelperUtil.parseError(error);
      this.loading = false;
    }
  }
  async onResendCode() {
    try {
      if (this.onOtpResend) {
        if (!this.loading && !this.timeoutTimeLeft) {
          this.error = "";
          this.otp = "";
          const authConnector = ConnectorController.getAuthConnector();
          if (!authConnector || !this.email) {
            throw new Error("w3m-email-otp-widget: Unable to resend email");
          }
          this.loading = true;
          await this.onOtpResend(this.email);
          this.startOTPTimeout();
          SnackController.showSuccess("Code email resent");
        }
      } else if (this.onStartOver) {
        this.onStartOver();
      }
    } catch (error) {
      SnackController.showError(error);
    } finally {
      this.loading = false;
    }
  }
  getFooterLabels(isResendDisabled) {
    if (this.onStartOver) {
      return {
        title: "Something wrong?",
        action: `Try again ${isResendDisabled ? `in ${this.timeoutTimeLeft}s` : ""}`
      };
    }
    return {
      title: `Didn't receive it?`,
      action: `Resend ${isResendDisabled ? `in ${this.timeoutTimeLeft}s` : "Code"}`
    };
  }
  shouldSubmitOnOtpChange() {
    return this.authConnector && this.otp.length === W3mEmailOtpWidget_1.OTP_LENGTH;
  }
};
W3mEmailOtpWidget.OTP_LENGTH = 6;
W3mEmailOtpWidget.styles = styles;
__decorate([
  r()
], W3mEmailOtpWidget.prototype, "loading", void 0);
__decorate([
  r()
], W3mEmailOtpWidget.prototype, "timeoutTimeLeft", void 0);
__decorate([
  r()
], W3mEmailOtpWidget.prototype, "error", void 0);
W3mEmailOtpWidget = W3mEmailOtpWidget_1 = __decorate([
  customElement("w3m-email-otp-widget")
], W3mEmailOtpWidget);
export {
  W3mEmailOtpWidget as W
};
