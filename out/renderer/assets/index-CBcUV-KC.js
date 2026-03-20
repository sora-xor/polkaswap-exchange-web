import { n as css, r as resetStyles, q as i, x } from "./walletconnect-BVoLvI4P.js";
import { n, c as customElement } from "./index-5878y4Sm.js";
const styles = css`
  :host {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: ${({ spacing }) => spacing[1]};
    text-transform: uppercase;
    white-space: nowrap;
  }

  :host([data-variant='accent']) {
    background-color: ${({ tokens }) => tokens.core.foregroundAccent010};
    color: ${({ tokens }) => tokens.core.textAccentPrimary};
  }

  :host([data-variant='info']) {
    background-color: ${({ tokens }) => tokens.theme.foregroundSecondary};
    color: ${({ tokens }) => tokens.theme.textSecondary};
  }

  :host([data-variant='success']) {
    background-color: ${({ tokens }) => tokens.core.backgroundSuccess};
    color: ${({ tokens }) => tokens.core.textSuccess};
  }

  :host([data-variant='warning']) {
    background-color: ${({ tokens }) => tokens.core.backgroundWarning};
    color: ${({ tokens }) => tokens.core.textWarning};
  }

  :host([data-variant='error']) {
    background-color: ${({ tokens }) => tokens.core.backgroundError};
    color: ${({ tokens }) => tokens.core.textError};
  }

  :host([data-variant='certified']) {
    background-color: ${({ tokens }) => tokens.theme.foregroundSecondary};
    color: ${({ tokens }) => tokens.theme.textSecondary};
  }

  :host([data-size='md']) {
    height: 30px;
    padding: 0 ${({ spacing }) => spacing[2]};
    border-radius: ${({ borderRadius }) => borderRadius[2]};
  }

  :host([data-size='sm']) {
    height: 20px;
    padding: 0 ${({ spacing }) => spacing[1]};
    border-radius: ${({ borderRadius }) => borderRadius[1]};
  }
`;
var __decorate = function(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
let WuiTag = class WuiTag2 extends i {
  constructor() {
    super(...arguments);
    this.variant = "accent";
    this.size = "md";
    this.icon = void 0;
  }
  render() {
    this.dataset["variant"] = this.variant;
    this.dataset["size"] = this.size;
    const textVariant = this.size === "md" ? "md-medium" : "sm-medium";
    const iconSize = this.size === "md" ? "md" : "sm";
    return x`
      ${this.icon ? x`<wui-icon size=${iconSize} name=${this.icon}></wui-icon>` : null}
      <wui-text
        display="inline"
        data-variant=${this.variant}
        variant=${textVariant}
        color="inherit"
      >
        <slot></slot>
      </wui-text>
    `;
  }
};
WuiTag.styles = [resetStyles, styles];
__decorate([
  n()
], WuiTag.prototype, "variant", void 0);
__decorate([
  n()
], WuiTag.prototype, "size", void 0);
__decorate([
  n()
], WuiTag.prototype, "icon", void 0);
WuiTag = __decorate([
  customElement("wui-tag")
], WuiTag);
