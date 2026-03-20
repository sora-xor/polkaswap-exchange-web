import { F as b, n as css, r as resetStyles, q as i, x } from "./walletconnect-BVoLvI4P.js";
import { n, c as customElement } from "./index-5878y4Sm.js";
import "./index-SiM7Ib3-.js";
import "./index-Cm7UDlkl.js";
const networkSvgMd = b`<svg  viewBox="0 0 48 54" fill="none">
  <path
    d="M43.4605 10.7248L28.0485 1.61089C25.5438 0.129705 22.4562 0.129705 19.9515 1.61088L4.53951 10.7248C2.03626 12.2051 0.5 14.9365 0.5 17.886V36.1139C0.5 39.0635 2.03626 41.7949 4.53951 43.2752L19.9515 52.3891C22.4562 53.8703 25.5438 53.8703 28.0485 52.3891L43.4605 43.2752C45.9637 41.7949 47.5 39.0635 47.5 36.114V17.8861C47.5 14.9365 45.9637 12.2051 43.4605 10.7248Z"
  />
</svg>`;
const styles = css`
  :host {
    position: relative;
    background-color: ${({ tokens }) => tokens.theme.foregroundTertiary};
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: inherit;
    border-radius: var(--local-border-radius);
  }

  :host([data-image='true']) {
    background-color: transparent;
  }

  :host > wui-flex {
    overflow: hidden;
    border-radius: inherit;
    border-radius: var(--local-border-radius);
  }

  :host([data-size='sm']) {
    width: 32px;
    height: 32px;
  }

  :host([data-size='md']) {
    width: 40px;
    height: 40px;
  }

  :host([data-size='lg']) {
    width: 56px;
    height: 56px;
  }

  :host([name='Extension'])::after {
    border: 1px solid ${({ colors }) => colors.accent010};
  }

  :host([data-wallet-icon='allWallets'])::after {
    border: 1px solid ${({ colors }) => colors.accent010};
  }

  wui-icon[data-parent-size='inherit'] {
    width: 75%;
    height: 75%;
    align-items: center;
  }

  wui-icon {
    color: ${({ tokens }) => tokens.theme.iconDefault};
  }

  wui-icon[data-parent-size='sm'] {
    width: 24px;
    height: 24px;
  }

  wui-icon[data-parent-size='md'] {
    width: 32px;
    height: 32px;
  }

  :host > wui-icon-box {
    position: absolute;
    overflow: hidden;
    right: -1px;
    bottom: -2px;
    z-index: 1;
    border: 2px solid ${({ tokens }) => tokens.theme.backgroundPrimary};
    padding: 1px;
  }
`;
var __decorate = function(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
let WuiWalletImage = class WuiWalletImage2 extends i {
  constructor() {
    super(...arguments);
    this.size = "md";
    this.name = "";
    this.installed = false;
    this.badgeSize = "xs";
  }
  render() {
    let borderRadius = "1";
    if (this.size === "lg") {
      borderRadius = "4";
    } else if (this.size === "md") {
      borderRadius = "2";
    } else if (this.size === "sm") {
      borderRadius = "1";
    }
    this.style.cssText = `
       --local-border-radius: var(--apkt-borderRadius-${borderRadius});
   `;
    this.dataset["size"] = this.size;
    if (this.imageSrc) {
      this.dataset["image"] = "true";
    }
    if (this.walletIcon) {
      this.dataset["walletIcon"] = this.walletIcon;
    }
    return x`
      <wui-flex justifyContent="center" alignItems="center"> ${this.templateVisual()} </wui-flex>
    `;
  }
  templateVisual() {
    if (this.imageSrc) {
      return x`<wui-image src=${this.imageSrc} alt=${this.name}></wui-image>`;
    } else if (this.walletIcon) {
      return x`<wui-icon size="md" color="default" name=${this.walletIcon}></wui-icon>`;
    }
    return x`<wui-icon
      data-parent-size=${this.size}
      size="inherit"
      color="inherit"
      name="wallet"
    ></wui-icon>`;
  }
};
WuiWalletImage.styles = [resetStyles, styles];
__decorate([
  n()
], WuiWalletImage.prototype, "size", void 0);
__decorate([
  n()
], WuiWalletImage.prototype, "name", void 0);
__decorate([
  n()
], WuiWalletImage.prototype, "imageSrc", void 0);
__decorate([
  n()
], WuiWalletImage.prototype, "walletIcon", void 0);
__decorate([
  n({ type: Boolean })
], WuiWalletImage.prototype, "installed", void 0);
__decorate([
  n()
], WuiWalletImage.prototype, "badgeSize", void 0);
WuiWalletImage = __decorate([
  customElement("wui-wallet-image")
], WuiWalletImage);
export {
  networkSvgMd as n
};
