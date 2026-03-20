import { t as i, r as resetStyles, q as i$1, x } from "./walletconnect-BVoLvI4P.js";
import { n, c as customElement } from "./index-5878y4Sm.js";
import { o } from "./if-defined-DpCpmSxP.js";
import "./index-Oesj6-8K.js";
const styles = i`
  :host {
    position: relative;
    display: inline-block;
    width: 100%;
  }
`;
var __decorate = function(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
let WuiEmailInput = class WuiEmailInput2 extends i$1 {
  constructor() {
    super(...arguments);
    this.disabled = false;
  }
  render() {
    return x`
      <wui-input-text
        type="email"
        placeholder="Email"
        icon="mail"
        size="lg"
        .disabled=${this.disabled}
        .value=${this.value}
        data-testid="wui-email-input"
        tabIdx=${o(this.tabIdx)}
      ></wui-input-text>
      ${this.templateError()}
    `;
  }
  templateError() {
    if (this.errorMessage) {
      return x`<wui-text variant="sm-regular" color="error">${this.errorMessage}</wui-text>`;
    }
    return null;
  }
};
WuiEmailInput.styles = [resetStyles, styles];
__decorate([
  n()
], WuiEmailInput.prototype, "errorMessage", void 0);
__decorate([
  n({ type: Boolean })
], WuiEmailInput.prototype, "disabled", void 0);
__decorate([
  n()
], WuiEmailInput.prototype, "value", void 0);
__decorate([
  n()
], WuiEmailInput.prototype, "tabIdx", void 0);
WuiEmailInput = __decorate([
  customElement("wui-email-input")
], WuiEmailInput);
