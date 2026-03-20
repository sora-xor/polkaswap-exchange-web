import { n as css, r as resetStyles, q as i, x } from "./walletconnect-BVoLvI4P.js";
import { n, c as customElement } from "./index-5878y4Sm.js";
import { o } from "./if-defined-DpCpmSxP.js";
const styles = css`
  :host {
    display: block;
    width: var(--local-width);
    height: var(--local-height);
  }

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center center;
    border-radius: inherit;
    user-select: none;
    user-drag: none;
    -webkit-user-drag: none;
    -khtml-user-drag: none;
    -moz-user-drag: none;
    -o-user-drag: none;
  }

  :host([data-boxed='true']) {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
    border-radius: ${({ borderRadius }) => borderRadius[2]};
  }

  :host([data-boxed='true']) img {
    width: 20px;
    height: 20px;
    border-radius: ${({ borderRadius }) => borderRadius[16]};
  }

  :host([data-full='true']) img {
    width: 100%;
    height: 100%;
  }

  :host([data-boxed='true']) wui-icon {
    width: 20px;
    height: 20px;
  }

  :host([data-icon='error']) {
    background-color: ${({ tokens }) => tokens.core.backgroundError};
  }

  :host([data-rounded='true']) {
    border-radius: ${({ borderRadius }) => borderRadius[16]};
  }
`;
var __decorate = function(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
let WuiImage = class WuiImage2 extends i {
  constructor() {
    super(...arguments);
    this.src = "./path/to/image.jpg";
    this.alt = "Image";
    this.size = void 0;
    this.boxed = false;
    this.rounded = false;
    this.fullSize = false;
  }
  render() {
    const getSize = {
      inherit: "inherit",
      xxs: "2",
      xs: "3",
      sm: "4",
      md: "4",
      mdl: "5",
      lg: "5",
      xl: "6",
      xxl: "7",
      "3xl": "8",
      "4xl": "9",
      "5xl": "10"
    };
    this.style.cssText = `
      --local-width: ${this.size ? `var(--apkt-spacing-${getSize[this.size]});` : "100%"};
      --local-height: ${this.size ? `var(--apkt-spacing-${getSize[this.size]});` : "100%"};
      `;
    this.dataset["boxed"] = this.boxed ? "true" : "false";
    this.dataset["rounded"] = this.rounded ? "true" : "false";
    this.dataset["full"] = this.fullSize ? "true" : "false";
    this.dataset["icon"] = this.iconColor || "inherit";
    if (this.icon) {
      return x`<wui-icon
        color=${this.iconColor || "inherit"}
        name=${this.icon}
        size="lg"
      ></wui-icon> `;
    }
    if (this.logo) {
      return x`<wui-icon size="lg" color="inherit" name=${this.logo}></wui-icon> `;
    }
    return x`<img src=${o(this.src)} alt=${this.alt} @error=${this.handleImageError} />`;
  }
  handleImageError() {
    this.dispatchEvent(new CustomEvent("onLoadError", { bubbles: true, composed: true }));
  }
};
WuiImage.styles = [resetStyles, styles];
__decorate([
  n()
], WuiImage.prototype, "src", void 0);
__decorate([
  n()
], WuiImage.prototype, "logo", void 0);
__decorate([
  n()
], WuiImage.prototype, "icon", void 0);
__decorate([
  n()
], WuiImage.prototype, "iconColor", void 0);
__decorate([
  n()
], WuiImage.prototype, "alt", void 0);
__decorate([
  n()
], WuiImage.prototype, "size", void 0);
__decorate([
  n({ type: Boolean })
], WuiImage.prototype, "boxed", void 0);
__decorate([
  n({ type: Boolean })
], WuiImage.prototype, "rounded", void 0);
__decorate([
  n({ type: Boolean })
], WuiImage.prototype, "fullSize", void 0);
WuiImage = __decorate([
  customElement("wui-image")
], WuiImage);
