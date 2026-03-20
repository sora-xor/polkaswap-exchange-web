import { n as css, r as resetStyles, o as elementStyles, q as i, N as NumberUtil, x } from "./walletconnect-BVoLvI4P.js";
import { n, c as customElement } from "./index-5878y4Sm.js";
import "./index-SiM7Ib3-.js";
const styles = css`
  :host {
    width: 100%;
  }

  button {
    padding: ${({ spacing }) => spacing[3]};
    display: flex;
    gap: ${({ spacing }) => spacing[3]};
    justify-content: space-between;
    width: 100%;
    border-radius: ${({ borderRadius }) => borderRadius[4]};
    background-color: transparent;
  }

  @media (hover: hover) {
    button:hover:enabled {
      background-color: ${({ tokens }) => tokens.theme.foregroundSecondary};
    }
  }

  button:focus-visible:enabled {
    background-color: ${({ tokens }) => tokens.theme.foregroundSecondary};
    box-shadow: 0 0 0 4px ${({ tokens }) => tokens.core.foregroundAccent040};
  }

  button[data-clickable='false'] {
    pointer-events: none;
    background-color: transparent;
  }

  wui-image,
  wui-icon {
    width: ${({ spacing }) => spacing[10]};
    height: ${({ spacing }) => spacing[10]};
  }

  wui-image {
    border-radius: ${({ borderRadius }) => borderRadius[16]};
  }

  .token-name-container {
    flex: 1;
  }
`;
var __decorate = function(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
let WuiListToken = class WuiListToken2 extends i {
  constructor() {
    super(...arguments);
    this.tokenName = "";
    this.tokenImageUrl = "";
    this.tokenValue = 0;
    this.tokenAmount = "0.0";
    this.tokenCurrency = "";
    this.clickable = false;
  }
  render() {
    return x`
      <button data-clickable=${String(this.clickable)}>
        <wui-flex gap="2" alignItems="center">
          ${this.visualTemplate()}
          <wui-flex
            flexDirection="column"
            justifyContent="space-between"
            gap="1"
            class="token-name-container"
          >
            <wui-text variant="md-regular" color="primary" lineClamp="1">
              ${this.tokenName}
            </wui-text>
            <wui-text variant="sm-regular-mono" color="secondary">
              ${NumberUtil.formatNumberToLocalString(this.tokenAmount, 4)} ${this.tokenCurrency}
            </wui-text>
          </wui-flex>
        </wui-flex>
        <wui-flex
          flexDirection="column"
          justifyContent="space-between"
          gap="1"
          alignItems="flex-end"
          width="auto"
        >
          <wui-text variant="md-regular-mono" color="primary"
            >$${this.tokenValue.toFixed(2)}</wui-text
          >
          <wui-text variant="sm-regular-mono" color="secondary">
            ${NumberUtil.formatNumberToLocalString(this.tokenAmount, 4)}
          </wui-text>
        </wui-flex>
      </button>
    `;
  }
  visualTemplate() {
    if (this.tokenName && this.tokenImageUrl) {
      return x`<wui-image alt=${this.tokenName} src=${this.tokenImageUrl}></wui-image>`;
    }
    return x`<wui-icon name="coinPlaceholder" color="default"></wui-icon>`;
  }
};
WuiListToken.styles = [resetStyles, elementStyles, styles];
__decorate([
  n()
], WuiListToken.prototype, "tokenName", void 0);
__decorate([
  n()
], WuiListToken.prototype, "tokenImageUrl", void 0);
__decorate([
  n({ type: Number })
], WuiListToken.prototype, "tokenValue", void 0);
__decorate([
  n()
], WuiListToken.prototype, "tokenAmount", void 0);
__decorate([
  n()
], WuiListToken.prototype, "tokenCurrency", void 0);
__decorate([
  n({ type: Boolean })
], WuiListToken.prototype, "clickable", void 0);
WuiListToken = __decorate([
  customElement("wui-list-token")
], WuiListToken);
