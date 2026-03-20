import { n as css, r as resetStyles, q as i, x } from "./walletconnect-BVoLvI4P.js";
import { n, c as customElement } from "./index-5878y4Sm.js";
const styles = css`
  :host {
    position: relative;
    display: flex;
    width: 100%;
    height: 1px;
    background-color: ${({ tokens }) => tokens.theme.borderPrimary};
    justify-content: center;
    align-items: center;
  }

  :host > wui-text {
    position: absolute;
    padding: 0px 8px;
    transition: background-color ${({ durations }) => durations["lg"]}
      ${({ easings }) => easings["ease-out-power-2"]};
    will-change: background-color;
  }

  :host([data-bg-color='primary']) > wui-text {
    background-color: ${({ tokens }) => tokens.theme.backgroundPrimary};
  }

  :host([data-bg-color='secondary']) > wui-text {
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
  }
`;
var __decorate = function(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
let WuiSeparator = class WuiSeparator2 extends i {
  constructor() {
    super(...arguments);
    this.text = "";
    this.bgColor = "primary";
  }
  render() {
    this.dataset["bgColor"] = this.bgColor;
    return x`${this.template()}`;
  }
  template() {
    if (this.text) {
      return x`<wui-text variant="md-regular" color="secondary">${this.text}</wui-text>`;
    }
    return null;
  }
};
WuiSeparator.styles = [resetStyles, styles];
__decorate([
  n()
], WuiSeparator.prototype, "text", void 0);
__decorate([
  n()
], WuiSeparator.prototype, "bgColor", void 0);
WuiSeparator = __decorate([
  customElement("wui-separator")
], WuiSeparator);
