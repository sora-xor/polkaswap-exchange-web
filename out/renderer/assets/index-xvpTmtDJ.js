import { n as css, q as i, x } from "./walletconnect-BVoLvI4P.js";
import { n, c as customElement } from "./index-5878y4Sm.js";
const styles = css`
  :host {
    display: block;
    background: linear-gradient(
      90deg,
      ${({ tokens }) => tokens.theme.foregroundPrimary} 0%,
      ${({ tokens }) => tokens.theme.foregroundSecondary} 50%,
      ${({ tokens }) => tokens.theme.foregroundPrimary} 100%
    );
    background-size: 200% 100%;
    animation: shimmer 2s linear infinite;
    border-radius: ${({ borderRadius }) => borderRadius[1]};
  }

  :host([data-rounded='true']) {
    border-radius: ${({ borderRadius }) => borderRadius[16]};
  }

  @keyframes shimmer {
    0% {
      background-position: 100% 0;
    }
    100% {
      background-position: -100% 0;
    }
  }
`;
var __decorate = function(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
let WuiShimmer = class WuiShimmer2 extends i {
  constructor() {
    super(...arguments);
    this.width = "";
    this.height = "";
    this.variant = "default";
    this.rounded = false;
  }
  render() {
    this.style.cssText = `
      width: ${this.width};
      height: ${this.height};
    `;
    this.dataset["rounded"] = this.rounded ? "true" : "false";
    return x`<slot></slot>`;
  }
};
WuiShimmer.styles = [styles];
__decorate([
  n()
], WuiShimmer.prototype, "width", void 0);
__decorate([
  n()
], WuiShimmer.prototype, "height", void 0);
__decorate([
  n()
], WuiShimmer.prototype, "variant", void 0);
__decorate([
  n({ type: Boolean })
], WuiShimmer.prototype, "rounded", void 0);
WuiShimmer = __decorate([
  customElement("wui-shimmer")
], WuiShimmer);
