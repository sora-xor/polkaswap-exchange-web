import { p as proxy, s as subscribeKey, k as subscribe, n as css, r as resetStyles, q as i, x, O as OptionsController } from "./walletconnect-BVoLvI4P.js";
import { n, c as customElement, r } from "./index-5878y4Sm.js";
import { o } from "./if-defined-DpCpmSxP.js";
import { e, n as n$1 } from "./ref-j6LTZZuR.js";
const state = proxy({
  isLegalCheckboxChecked: false
});
const OptionsStateController = {
  state,
  subscribe(callback) {
    return subscribe(state, () => callback(state));
  },
  subscribeKey(key, callback) {
    return subscribeKey(state, key, callback);
  },
  setIsLegalCheckboxChecked(isLegalCheckboxChecked) {
    state.isLegalCheckboxChecked = isLegalCheckboxChecked;
  }
};
const styles$1 = css`
  label {
    display: inline-flex;
    align-items: center;
    cursor: pointer;
    user-select: none;
    column-gap: ${({ spacing }) => spacing[2]};
  }

  label > input[type='checkbox'] {
    height: 0;
    width: 0;
    opacity: 0;
    position: absolute;
  }

  label > span {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    width: 100%;
    border: 1px solid ${({ colors }) => colors.neutrals400};
    color: ${({ colors }) => colors.white};
    background-color: transparent;
    will-change: border-color, background-color;
  }

  label > span > wui-icon {
    opacity: 0;
    will-change: opacity;
  }

  label > input[type='checkbox']:checked + span > wui-icon {
    color: ${({ colors }) => colors.white};
  }

  label > input[type='checkbox']:not(:checked) > span > wui-icon {
    color: ${({ colors }) => colors.neutrals900};
  }

  label > input[type='checkbox']:checked + span > wui-icon {
    opacity: 1;
  }

  /* -- Sizes --------------------------------------------------- */
  label[data-size='lg'] > span {
    width: 24px;
    height: 24px;
    min-width: 24px;
    min-height: 24px;
    border-radius: ${({ borderRadius }) => borderRadius[10]};
  }

  label[data-size='md'] > span {
    width: 20px;
    height: 20px;
    min-width: 20px;
    min-height: 20px;
    border-radius: ${({ borderRadius }) => borderRadius[2]};
  }

  label[data-size='sm'] > span {
    width: 16px;
    height: 16px;
    min-width: 16px;
    min-height: 16px;
    border-radius: ${({ borderRadius }) => borderRadius[1]};
  }

  /* -- Focus states --------------------------------------------------- */
  label > input[type='checkbox']:focus-visible + span,
  label > input[type='checkbox']:focus + span {
    border: 1px solid ${({ tokens }) => tokens.core.borderAccentPrimary};
    box-shadow: 0px 0px 0px 4px rgba(9, 136, 240, 0.2);
  }

  /* -- Checked states --------------------------------------------------- */
  label > input[type='checkbox']:checked + span {
    background-color: ${({ tokens }) => tokens.core.iconAccentPrimary};
    border: 1px solid transparent;
  }

  /* -- Hover states --------------------------------------------------- */
  input[type='checkbox']:not(:checked):not(:disabled) + span:hover {
    border: 1px solid ${({ colors }) => colors.neutrals700};
    background-color: ${({ colors }) => colors.neutrals800};
    box-shadow: none;
  }

  input[type='checkbox']:checked:not(:disabled) + span:hover {
    border: 1px solid transparent;
    background-color: ${({ colors }) => colors.accent080};
    box-shadow: none;
  }

  /* -- Disabled state --------------------------------------------------- */
  label > input[type='checkbox']:checked:disabled + span {
    border: 1px solid transparent;
    opacity: 0.3;
  }

  label > input[type='checkbox']:not(:checked):disabled + span {
    border: 1px solid ${({ colors }) => colors.neutrals700};
  }

  label:has(input[type='checkbox']:disabled) {
    cursor: auto;
  }

  label > input[type='checkbox']:disabled + span {
    cursor: not-allowed;
  }
`;
var __decorate$1 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
const ICON_SIZE = {
  lg: "md",
  md: "sm",
  sm: "sm"
};
let WuiCheckBox = class WuiCheckBox2 extends i {
  constructor() {
    super(...arguments);
    this.inputElementRef = e();
    this.checked = void 0;
    this.disabled = false;
    this.size = "md";
  }
  render() {
    const iconSize = ICON_SIZE[this.size];
    return x`
      <label data-size=${this.size}>
        <input
          ${n$1(this.inputElementRef)}
          ?checked=${o(this.checked)}
          ?disabled=${this.disabled}
          type="checkbox"
          @change=${this.dispatchChangeEvent}
        />
        <span>
          <wui-icon name="checkmarkBold" size=${iconSize}></wui-icon>
        </span>
        <slot></slot>
      </label>
    `;
  }
  dispatchChangeEvent() {
    this.dispatchEvent(new CustomEvent("checkboxChange", {
      detail: this.inputElementRef.value?.checked,
      bubbles: true,
      composed: true
    }));
  }
};
WuiCheckBox.styles = [resetStyles, styles$1];
__decorate$1([
  n({ type: Boolean })
], WuiCheckBox.prototype, "checked", void 0);
__decorate$1([
  n({ type: Boolean })
], WuiCheckBox.prototype, "disabled", void 0);
__decorate$1([
  n()
], WuiCheckBox.prototype, "size", void 0);
WuiCheckBox = __decorate$1([
  customElement("wui-checkbox")
], WuiCheckBox);
const styles = css`
  :host {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  wui-checkbox {
    padding: ${({ spacing }) => spacing["3"]};
  }
  a {
    text-decoration: none;
    color: ${({ tokens }) => tokens.theme.textSecondary};
    font-weight: 500;
  }
`;
var __decorate = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mLegalCheckbox = class W3mLegalCheckbox2 extends i {
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
    if (!termsConditionsUrl && !privacyPolicyUrl) {
      return null;
    }
    if (!legalCheckbox) {
      return null;
    }
    return x`
      <wui-checkbox
        ?checked=${this.checked}
        @checkboxChange=${this.onCheckboxChange.bind(this)}
        data-testid="wui-checkbox"
      >
        <wui-text color="secondary" variant="sm-regular" align="left">
          I agree to our ${this.termsTemplate()} ${this.andTemplate()} ${this.privacyTemplate()}
        </wui-text>
      </wui-checkbox>
    `;
  }
  andTemplate() {
    const { termsConditionsUrl, privacyPolicyUrl } = OptionsController.state;
    return termsConditionsUrl && privacyPolicyUrl ? "and" : "";
  }
  termsTemplate() {
    const { termsConditionsUrl } = OptionsController.state;
    if (!termsConditionsUrl) {
      return null;
    }
    return x`<a rel="noreferrer" target="_blank" href=${termsConditionsUrl}>terms of service</a>`;
  }
  privacyTemplate() {
    const { privacyPolicyUrl } = OptionsController.state;
    if (!privacyPolicyUrl) {
      return null;
    }
    return x`<a rel="noreferrer" target="_blank" href=${privacyPolicyUrl}>privacy policy</a>`;
  }
  onCheckboxChange() {
    OptionsStateController.setIsLegalCheckboxChecked(!this.checked);
  }
};
W3mLegalCheckbox.styles = [styles];
__decorate([
  r()
], W3mLegalCheckbox.prototype, "checked", void 0);
W3mLegalCheckbox = __decorate([
  customElement("w3m-legal-checkbox")
], W3mLegalCheckbox);
export {
  OptionsStateController as O
};
