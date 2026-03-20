import { n as css, r as resetStyles, o as elementStyles, q as i, v as vars, x } from "./walletconnect-BVoLvI4P.js";
import { n, c as customElement, U as UiHelperUtil } from "./index-5878y4Sm.js";
import { e, n as n$1 } from "./ref-j6LTZZuR.js";
const styles = css`
  :host {
    position: relative;
    display: inline-block;
  }

  :host([data-error='true']) > input {
    color: ${({ tokens }) => tokens.core.textError};
  }

  :host([data-error='false']) > input {
    color: ${({ tokens }) => tokens.theme.textPrimary};
  }

  input {
    background: transparent;
    height: auto;
    box-sizing: border-box;
    color: ${({ tokens }) => tokens.theme.textPrimary};
    font-feature-settings: 'case' on;
    font-size: ${({ textSize }) => textSize.h4};
    caret-color: ${({ tokens }) => tokens.core.backgroundAccentPrimary};
    line-height: ${({ typography }) => typography["h4-regular-mono"].lineHeight};
    letter-spacing: ${({ typography }) => typography["h4-regular-mono"].letterSpacing};
    -webkit-appearance: none;
    -moz-appearance: textfield;
    padding: 0px;
    font-family: ${({ fontFamily }) => fontFamily.mono};
  }

  :host([data-width-variant='auto']) input {
    width: 100%;
  }

  :host([data-width-variant='fit']) input {
    width: 1ch;
  }

  .wui-input-amount-fit-mirror {
    position: absolute;
    visibility: hidden;
    white-space: pre;
    font-size: var(--local-font-size);
    line-height: 130%;
    letter-spacing: -1.28px;
    font-family: ${({ fontFamily }) => fontFamily.mono};
  }

  .wui-input-amount-fit-width {
    display: inline-block;
    position: relative;
  }

  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  input::placeholder {
    color: ${({ tokens }) => tokens.theme.textSecondary};
  }
`;
var __decorate = function(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
let WuiInputAmount = class WuiInputAmount2 extends i {
  constructor() {
    super(...arguments);
    this.inputElementRef = e();
    this.disabled = false;
    this.value = "";
    this.placeholder = "0";
    this.widthVariant = "auto";
    this.maxDecimals = void 0;
    this.maxIntegers = void 0;
    this.fontSize = "h4";
    this.error = false;
  }
  firstUpdated() {
    this.resizeInput();
  }
  updated() {
    this.style.setProperty("--local-font-size", vars.textSize[this.fontSize]);
    this.resizeInput();
  }
  render() {
    this.dataset["widthVariant"] = this.widthVariant;
    this.dataset["error"] = String(this.error);
    if (this.inputElementRef?.value && this.value) {
      this.inputElementRef.value.value = this.value;
    }
    if (this.widthVariant === "auto") {
      return this.inputTemplate();
    }
    return x`
      <div class="wui-input-amount-fit-width">
        <span class="wui-input-amount-fit-mirror"></span>
        ${this.inputTemplate()}
      </div>
    `;
  }
  inputTemplate() {
    return x`<input
      ${n$1(this.inputElementRef)}
      type="text"
      inputmode="decimal"
      pattern="[0-9,.]*"
      placeholder=${this.placeholder}
      ?disabled=${this.disabled}
      autofocus
      value=${this.value ?? ""}
      @input=${this.dispatchInputChangeEvent.bind(this)}
    />`;
  }
  dispatchInputChangeEvent() {
    if (this.inputElementRef.value) {
      this.inputElementRef.value.value = UiHelperUtil.maskInput({
        value: this.inputElementRef.value.value,
        decimals: this.maxDecimals,
        integers: this.maxIntegers
      });
      this.dispatchEvent(new CustomEvent("inputChange", {
        detail: this.inputElementRef.value.value,
        bubbles: true,
        composed: true
      }));
      this.resizeInput();
    }
  }
  resizeInput() {
    if (this.widthVariant === "fit") {
      const inputElement = this.inputElementRef.value;
      if (inputElement) {
        const mirror = inputElement.previousElementSibling;
        if (mirror) {
          mirror.textContent = inputElement.value || "0";
          inputElement.style.width = `${mirror.offsetWidth}px`;
        }
      }
    }
  }
};
WuiInputAmount.styles = [resetStyles, elementStyles, styles];
__decorate([
  n({ type: Boolean })
], WuiInputAmount.prototype, "disabled", void 0);
__decorate([
  n({ type: String })
], WuiInputAmount.prototype, "value", void 0);
__decorate([
  n({ type: String })
], WuiInputAmount.prototype, "placeholder", void 0);
__decorate([
  n({ type: String })
], WuiInputAmount.prototype, "widthVariant", void 0);
__decorate([
  n({ type: Number })
], WuiInputAmount.prototype, "maxDecimals", void 0);
__decorate([
  n({ type: Number })
], WuiInputAmount.prototype, "maxIntegers", void 0);
__decorate([
  n({ type: String })
], WuiInputAmount.prototype, "fontSize", void 0);
__decorate([
  n({ type: Boolean })
], WuiInputAmount.prototype, "error", void 0);
WuiInputAmount = __decorate([
  customElement("wui-input-amount")
], WuiInputAmount);
