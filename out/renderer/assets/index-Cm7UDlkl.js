import { n as css, r as resetStyles, o as elementStyles, q as i, x } from "./walletconnect-BVoLvI4P.js";
import { n, c as customElement } from "./index-5878y4Sm.js";
import { o } from "./if-defined-DpCpmSxP.js";
const styles = css`
  :host {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    border-radius: ${({ borderRadius }) => borderRadius[2]};
    padding: ${({ spacing }) => spacing[1]} !important;
    background-color: ${({ tokens }) => tokens.theme.backgroundPrimary};
    position: relative;
  }

  :host([data-padding='2']) {
    padding: ${({ spacing }) => spacing[2]} !important;
  }

  :host:after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: ${({ borderRadius }) => borderRadius[2]};
  }

  :host > wui-icon {
    z-index: 10;
  }

  /* -- Colors --------------------------------------------------- */
  :host([data-color='accent-primary']) {
    color: ${({ tokens }) => tokens.core.iconAccentPrimary};
  }

  :host([data-color='accent-primary']):after {
    background-color: ${({ tokens }) => tokens.core.foregroundAccent010};
  }

  :host([data-color='default']),
  :host([data-color='secondary']) {
    color: ${({ tokens }) => tokens.theme.iconDefault};
  }

  :host([data-color='default']):after {
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
  }

  :host([data-color='secondary']):after {
    background-color: ${({ tokens }) => tokens.theme.foregroundSecondary};
  }

  :host([data-color='success']) {
    color: ${({ tokens }) => tokens.core.iconSuccess};
  }

  :host([data-color='success']):after {
    background-color: ${({ tokens }) => tokens.core.backgroundSuccess};
  }

  :host([data-color='error']) {
    color: ${({ tokens }) => tokens.core.iconError};
  }

  :host([data-color='error']):after {
    background-color: ${({ tokens }) => tokens.core.backgroundError};
  }

  :host([data-color='warning']) {
    color: ${({ tokens }) => tokens.core.iconWarning};
  }

  :host([data-color='warning']):after {
    background-color: ${({ tokens }) => tokens.core.backgroundWarning};
  }

  :host([data-color='inverse']) {
    color: ${({ tokens }) => tokens.theme.iconInverse};
  }

  :host([data-color='inverse']):after {
    background-color: transparent;
  }
`;
var __decorate = function(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
let WuiIconBox = class WuiIconBox2 extends i {
  constructor() {
    super(...arguments);
    this.icon = "copy";
    this.size = "md";
    this.padding = "1";
    this.color = "default";
  }
  render() {
    this.dataset["padding"] = this.padding;
    this.dataset["color"] = this.color;
    return x`
      <wui-icon size=${o(this.size)} name=${this.icon} color="inherit"></wui-icon>
    `;
  }
};
WuiIconBox.styles = [resetStyles, elementStyles, styles];
__decorate([
  n()
], WuiIconBox.prototype, "icon", void 0);
__decorate([
  n()
], WuiIconBox.prototype, "size", void 0);
__decorate([
  n()
], WuiIconBox.prototype, "padding", void 0);
__decorate([
  n()
], WuiIconBox.prototype, "color", void 0);
WuiIconBox = __decorate([
  customElement("wui-icon-box")
], WuiIconBox);
