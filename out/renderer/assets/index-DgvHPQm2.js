import { n as css, r as resetStyles, q as i, x } from "./walletconnect-BVoLvI4P.js";
import { n, c as customElement } from "./index-5878y4Sm.js";
const styles = css`
  :host {
    display: block;
    width: 100px;
    height: 100px;
  }

  svg {
    width: 100px;
    height: 100px;
  }

  rect {
    fill: none;
    stroke: ${(tokens) => tokens.colors.accent100};
    stroke-width: 3px;
    stroke-linecap: round;
    animation: dash 1s linear infinite;
  }

  @keyframes dash {
    to {
      stroke-dashoffset: 0px;
    }
  }
`;
var __decorate = function(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
let WuiLoadingThumbnail = class WuiLoadingThumbnail2 extends i {
  constructor() {
    super(...arguments);
    this.radius = 36;
  }
  render() {
    return this.svgLoaderTemplate();
  }
  svgLoaderTemplate() {
    const radius = this.radius > 50 ? 50 : this.radius;
    const standardValue = 36;
    const radiusFactor = standardValue - radius;
    const dashArrayStart = 116 + radiusFactor;
    const dashArrayEnd = 245 + radiusFactor;
    const dashOffset = 360 + radiusFactor * 1.75;
    return x`
      <svg viewBox="0 0 110 110" width="110" height="110">
        <rect
          x="2"
          y="2"
          width="106"
          height="106"
          rx=${radius}
          stroke-dasharray="${dashArrayStart} ${dashArrayEnd}"
          stroke-dashoffset=${dashOffset}
        />
      </svg>
    `;
  }
};
WuiLoadingThumbnail.styles = [resetStyles, styles];
__decorate([
  n({ type: Number })
], WuiLoadingThumbnail.prototype, "radius", void 0);
WuiLoadingThumbnail = __decorate([
  customElement("wui-loading-thumbnail")
], WuiLoadingThumbnail);
