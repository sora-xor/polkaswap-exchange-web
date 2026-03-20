import { F as b, n as css, r as resetStyles, q as i, x, o as elementStyles } from "./walletconnect-BVoLvI4P.js";
import { n, c as customElement, U as UiHelperUtil } from "./index-5878y4Sm.js";
import { n as networkSvgMd } from "./index-Cztg-IpD.js";
import "./index-SiM7Ib3-.js";
import { o } from "./if-defined-DpCpmSxP.js";
const networkSvgLg = b`<svg width="86" height="96" fill="none">
  <path
    d="M78.3244 18.926L50.1808 2.45078C45.7376 -0.150261 40.2624 -0.150262 35.8192 2.45078L7.6756 18.926C3.23322 21.5266 0.5 26.3301 0.5 31.5248V64.4752C0.5 69.6699 3.23322 74.4734 7.6756 77.074L35.8192 93.5492C40.2624 96.1503 45.7376 96.1503 50.1808 93.5492L78.3244 77.074C82.7668 74.4734 85.5 69.6699 85.5 64.4752V31.5248C85.5 26.3301 82.7668 21.5266 78.3244 18.926Z"
  />
</svg>`;
const networkSvgSm = b`
  <svg fill="none" viewBox="0 0 36 40">
    <path
      d="M15.4 2.1a5.21 5.21 0 0 1 5.2 0l11.61 6.7a5.21 5.21 0 0 1 2.61 4.52v13.4c0 1.87-1 3.59-2.6 4.52l-11.61 6.7c-1.62.93-3.6.93-5.22 0l-11.6-6.7a5.21 5.21 0 0 1-2.61-4.51v-13.4c0-1.87 1-3.6 2.6-4.52L15.4 2.1Z"
    />
  </svg>
`;
const styles$1 = css`
  :host {
    position: relative;
    border-radius: inherit;
    display: flex;
    justify-content: center;
    align-items: center;
    width: var(--local-width);
    height: var(--local-height);
  }

  :host([data-round='true']) {
    background: ${({ tokens }) => tokens.theme.foregroundPrimary};
    border-radius: 100%;
    outline: 1px solid ${({ tokens }) => tokens.core.glass010};
  }

  svg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
  }

  svg > path {
    stroke: var(--local-stroke);
  }

  wui-image {
    width: 100%;
    height: 100%;
    -webkit-clip-path: var(--local-path);
    clip-path: var(--local-path);
    background: ${({ tokens }) => tokens.theme.foregroundPrimary};
  }

  wui-icon {
    transform: translateY(-5%);
    width: var(--local-icon-size);
    height: var(--local-icon-size);
  }
`;
var __decorate$1 = function(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
let WuiNetworkImage = class WuiNetworkImage2 extends i {
  constructor() {
    super(...arguments);
    this.size = "md";
    this.name = "uknown";
    this.networkImagesBySize = {
      sm: networkSvgSm,
      md: networkSvgMd,
      lg: networkSvgLg
    };
    this.selected = false;
    this.round = false;
  }
  render() {
    const getSize = {
      sm: "4",
      md: "6",
      lg: "10"
    };
    if (this.round) {
      this.dataset["round"] = "true";
      this.style.cssText = `
      --local-width: var(--apkt-spacing-10);
      --local-height: var(--apkt-spacing-10);
      --local-icon-size: var(--apkt-spacing-4);
    `;
    } else {
      this.style.cssText = `

      --local-path: var(--apkt-path-network-${this.size});
      --local-width:  var(--apkt-width-network-${this.size});
      --local-height:  var(--apkt-height-network-${this.size});
      --local-icon-size:  var(--apkt-spacing-${getSize[this.size]});
    `;
    }
    return x`${this.templateVisual()} ${this.svgTemplate()} `;
  }
  svgTemplate() {
    if (this.round) {
      return null;
    }
    return this.networkImagesBySize[this.size];
  }
  templateVisual() {
    if (this.imageSrc) {
      return x`<wui-image src=${this.imageSrc} alt=${this.name}></wui-image>`;
    }
    return x`<wui-icon size="inherit" color="default" name="networkPlaceholder"></wui-icon>`;
  }
};
WuiNetworkImage.styles = [resetStyles, styles$1];
__decorate$1([
  n()
], WuiNetworkImage.prototype, "size", void 0);
__decorate$1([
  n()
], WuiNetworkImage.prototype, "name", void 0);
__decorate$1([
  n({ type: Object })
], WuiNetworkImage.prototype, "networkImagesBySize", void 0);
__decorate$1([
  n()
], WuiNetworkImage.prototype, "imageSrc", void 0);
__decorate$1([
  n({ type: Boolean })
], WuiNetworkImage.prototype, "selected", void 0);
__decorate$1([
  n({ type: Boolean })
], WuiNetworkImage.prototype, "round", void 0);
WuiNetworkImage = __decorate$1([
  customElement("wui-network-image")
], WuiNetworkImage);
const styles = css`
  button {
    display: flex;
    align-items: center;
    height: 40px;
    padding: ${({ spacing }) => spacing[2]};
    border-radius: ${({ borderRadius }) => borderRadius[4]};
    column-gap: ${({ spacing }) => spacing[1]};
    background-color: transparent;
    transition: background-color ${({ durations }) => durations["lg"]}
      ${({ easings }) => easings["ease-out-power-2"]};
    will-change: background-color;
  }

  wui-image,
  .icon-box {
    width: ${({ spacing }) => spacing[6]};
    height: ${({ spacing }) => spacing[6]};
    border-radius: ${({ borderRadius }) => borderRadius[4]};
  }

  wui-text {
    flex: 1;
  }

  .icon-box {
    position: relative;
  }

  .icon-box[data-active='true'] {
    background-color: ${({ tokens }) => tokens.theme.foregroundSecondary};
  }

  .circle {
    position: absolute;
    left: 16px;
    top: 15px;
    width: 8px;
    height: 8px;
    background-color: ${({ tokens }) => tokens.core.textSuccess};
    box-shadow: 0 0 0 2px ${({ tokens }) => tokens.theme.foregroundPrimary};
    border-radius: 50%;
  }

  /* -- Hover & Active states ----------------------------------------------------------- */
  @media (hover: hover) {
    button:hover:enabled,
    button:active:enabled {
      background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
    }
  }
`;
var __decorate = function(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
let WuiWalletSwitch = class WuiWalletSwitch2 extends i {
  constructor() {
    super(...arguments);
    this.address = "";
    this.profileName = "";
    this.alt = "";
    this.imageSrc = "";
    this.icon = void 0;
    this.iconSize = "md";
    this.enableGreenCircle = true;
    this.loading = false;
    this.charsStart = 4;
    this.charsEnd = 6;
  }
  render() {
    return x`
      <button>
        ${this.leftImageTemplate()} ${this.textTemplate()} ${this.rightImageTemplate()}
      </button>
    `;
  }
  leftImageTemplate() {
    const imageOrIconContent = this.icon ? x`<wui-icon
          size=${o(this.iconSize)}
          color="default"
          name=${this.icon}
          class="icon"
        ></wui-icon>` : x`<wui-image src=${this.imageSrc} alt=${this.alt}></wui-image>`;
    return x`
      <wui-flex
        alignItems="center"
        justifyContent="center"
        class="icon-box"
        data-active=${Boolean(this.icon)}
      >
        ${imageOrIconContent}
        ${this.enableGreenCircle ? x`<wui-flex class="circle"></wui-flex>` : null}
      </wui-flex>
    `;
  }
  textTemplate() {
    return x`
      <wui-text variant="lg-regular" color="primary">
        ${UiHelperUtil.getTruncateString({
      string: this.profileName || this.address,
      charsStart: this.profileName ? 16 : this.charsStart,
      charsEnd: this.profileName ? 0 : this.charsEnd,
      truncate: this.profileName ? "end" : "middle"
    })}
      </wui-text>
    `;
  }
  rightImageTemplate() {
    return x`<wui-icon name="chevronBottom" size="sm" color="default"></wui-icon>`;
  }
};
WuiWalletSwitch.styles = [resetStyles, elementStyles, styles];
__decorate([
  n()
], WuiWalletSwitch.prototype, "address", void 0);
__decorate([
  n()
], WuiWalletSwitch.prototype, "profileName", void 0);
__decorate([
  n()
], WuiWalletSwitch.prototype, "alt", void 0);
__decorate([
  n()
], WuiWalletSwitch.prototype, "imageSrc", void 0);
__decorate([
  n()
], WuiWalletSwitch.prototype, "icon", void 0);
__decorate([
  n()
], WuiWalletSwitch.prototype, "iconSize", void 0);
__decorate([
  n({ type: Boolean })
], WuiWalletSwitch.prototype, "enableGreenCircle", void 0);
__decorate([
  n({ type: Boolean })
], WuiWalletSwitch.prototype, "loading", void 0);
__decorate([
  n({ type: Number })
], WuiWalletSwitch.prototype, "charsStart", void 0);
__decorate([
  n({ type: Number })
], WuiWalletSwitch.prototype, "charsEnd", void 0);
WuiWalletSwitch = __decorate([
  customElement("wui-wallet-switch")
], WuiWalletSwitch);
