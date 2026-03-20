import { n as css, r as resetStyles, o as elementStyles, q as i, x } from "./walletconnect-BVoLvI4P.js";
import { n, c as customElement } from "./index-5878y4Sm.js";
import { o } from "./if-defined-DpCpmSxP.js";
import { e, n as n$1 } from "./ref-j6LTZZuR.js";
const styles = css`
  :host {
    position: relative;
    width: 100%;
    display: inline-flex;
    flex-direction: column;
    gap: ${({ spacing }) => spacing[3]};
    color: ${({ tokens }) => tokens.theme.textPrimary};
    caret-color: ${({ tokens }) => tokens.core.textAccentPrimary};
  }

  .wui-input-text-container {
    position: relative;
    display: flex;
  }

  input {
    width: 100%;
    border-radius: ${({ borderRadius }) => borderRadius[4]};
    color: inherit;
    background: transparent;
    border: 1px solid ${({ tokens }) => tokens.theme.borderPrimary};
    caret-color: ${({ tokens }) => tokens.core.textAccentPrimary};
    padding: ${({ spacing }) => spacing[3]} ${({ spacing }) => spacing[3]}
      ${({ spacing }) => spacing[3]} ${({ spacing }) => spacing[10]};
    font-size: ${({ textSize }) => textSize.large};
    line-height: ${({ typography }) => typography["lg-regular"].lineHeight};
    letter-spacing: ${({ typography }) => typography["lg-regular"].letterSpacing};
    font-weight: ${({ fontWeight }) => fontWeight.regular};
    font-family: ${({ fontFamily }) => fontFamily.regular};
  }

  input[data-size='lg'] {
    padding: ${({ spacing }) => spacing[4]} ${({ spacing }) => spacing[3]}
      ${({ spacing }) => spacing[4]} ${({ spacing }) => spacing[10]};
  }

  @media (hover: hover) and (pointer: fine) {
    input:hover:enabled {
      border: 1px solid ${({ tokens }) => tokens.theme.borderSecondary};
    }
  }

  input:disabled {
    cursor: unset;
    border: 1px solid ${({ tokens }) => tokens.theme.borderPrimary};
  }

  input::placeholder {
    color: ${({ tokens }) => tokens.theme.textSecondary};
  }

  input:focus:enabled {
    border: 1px solid ${({ tokens }) => tokens.theme.borderSecondary};
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
    -webkit-box-shadow: 0px 0px 0px 4px ${({ tokens }) => tokens.core.foregroundAccent040};
    -moz-box-shadow: 0px 0px 0px 4px ${({ tokens }) => tokens.core.foregroundAccent040};
    box-shadow: 0px 0px 0px 4px ${({ tokens }) => tokens.core.foregroundAccent040};
  }

  div.wui-input-text-container:has(input:disabled) {
    opacity: 0.5;
  }

  wui-icon.wui-input-text-left-icon {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    left: ${({ spacing }) => spacing[4]};
    color: ${({ tokens }) => tokens.theme.iconDefault};
  }

  button.wui-input-text-submit-button {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    right: ${({ spacing }) => spacing[3]};
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    border-radius: ${({ borderRadius }) => borderRadius[2]};
    color: ${({ tokens }) => tokens.core.textAccentPrimary};
  }

  button.wui-input-text-submit-button:disabled {
    opacity: 1;
  }

  button.wui-input-text-submit-button.loading wui-icon {
    animation: spin 1s linear infinite;
  }

  button.wui-input-text-submit-button:hover {
    background: ${({ tokens }) => tokens.core.foregroundAccent010};
  }

  input:has(+ .wui-input-text-submit-button) {
    padding-right: ${({ spacing }) => spacing[12]};
  }

  input[type='number'] {
    -moz-appearance: textfield;
  }

  input[type='search']::-webkit-search-decoration,
  input[type='search']::-webkit-search-cancel-button,
  input[type='search']::-webkit-search-results-button,
  input[type='search']::-webkit-search-results-decoration {
    -webkit-appearance: none;
  }

  /* -- Keyframes --------------------------------------------------- */
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;
var __decorate = function(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
let WuiInputText = class WuiInputText2 extends i {
  constructor() {
    super(...arguments);
    this.inputElementRef = e();
    this.disabled = false;
    this.loading = false;
    this.placeholder = "";
    this.type = "text";
    this.value = "";
    this.size = "md";
  }
  render() {
    return x` <div class="wui-input-text-container">
        ${this.templateLeftIcon()}
        <input
          data-size=${this.size}
          ${n$1(this.inputElementRef)}
          data-testid="wui-input-text"
          type=${this.type}
          enterkeyhint=${o(this.enterKeyHint)}
          ?disabled=${this.disabled}
          placeholder=${this.placeholder}
          @input=${this.dispatchInputChangeEvent.bind(this)}
          @keydown=${this.onKeyDown}
          .value=${this.value || ""}
        />
        ${this.templateSubmitButton()}
        <slot class="wui-input-text-slot"></slot>
      </div>
      ${this.templateError()} ${this.templateWarning()}`;
  }
  templateLeftIcon() {
    if (this.icon) {
      return x`<wui-icon
        class="wui-input-text-left-icon"
        size="md"
        data-size=${this.size}
        color="inherit"
        name=${this.icon}
      ></wui-icon>`;
    }
    return null;
  }
  templateSubmitButton() {
    if (this.onSubmit) {
      return x`<button
        class="wui-input-text-submit-button ${this.loading ? "loading" : ""}"
        @click=${this.onSubmit?.bind(this)}
        ?disabled=${this.disabled || this.loading}
      >
        ${this.loading ? x`<wui-icon name="spinner" size="md"></wui-icon>` : x`<wui-icon name="chevronRight" size="md"></wui-icon>`}
      </button>`;
    }
    return null;
  }
  templateError() {
    if (this.errorText) {
      return x`<wui-text variant="sm-regular" color="error">${this.errorText}</wui-text>`;
    }
    return null;
  }
  templateWarning() {
    if (this.warningText) {
      return x`<wui-text variant="sm-regular" color="warning">${this.warningText}</wui-text>`;
    }
    return null;
  }
  dispatchInputChangeEvent() {
    this.dispatchEvent(new CustomEvent("inputChange", {
      detail: this.inputElementRef.value?.value,
      bubbles: true,
      composed: true
    }));
  }
};
WuiInputText.styles = [resetStyles, elementStyles, styles];
__decorate([
  n()
], WuiInputText.prototype, "icon", void 0);
__decorate([
  n({ type: Boolean })
], WuiInputText.prototype, "disabled", void 0);
__decorate([
  n({ type: Boolean })
], WuiInputText.prototype, "loading", void 0);
__decorate([
  n()
], WuiInputText.prototype, "placeholder", void 0);
__decorate([
  n()
], WuiInputText.prototype, "type", void 0);
__decorate([
  n()
], WuiInputText.prototype, "value", void 0);
__decorate([
  n()
], WuiInputText.prototype, "errorText", void 0);
__decorate([
  n()
], WuiInputText.prototype, "warningText", void 0);
__decorate([
  n()
], WuiInputText.prototype, "onSubmit", void 0);
__decorate([
  n()
], WuiInputText.prototype, "size", void 0);
__decorate([
  n({ attribute: false })
], WuiInputText.prototype, "onKeyDown", void 0);
WuiInputText = __decorate([
  customElement("wui-input-text")
], WuiInputText);
