import { n as css, r as resetStyles, q as i, x } from "./walletconnect-BVoLvI4P.js";
import { n, c as customElement, U as UiHelperUtil } from "./index-5878y4Sm.js";
import "./index-SiM7Ib3-.js";
const styles = css`
  :host {
    display: block;
    width: var(--local-width);
    height: var(--local-height);
    border-radius: ${({ borderRadius }) => borderRadius[16]};
    overflow: hidden;
    position: relative;
  }

  :host([data-variant='generated']) {
    --mixed-local-color-1: var(--local-color-1);
    --mixed-local-color-2: var(--local-color-2);
    --mixed-local-color-3: var(--local-color-3);
    --mixed-local-color-4: var(--local-color-4);
    --mixed-local-color-5: var(--local-color-5);
  }

  :host([data-variant='generated']) {
    background: radial-gradient(
      var(--local-radial-circle),
      #fff 0.52%,
      var(--mixed-local-color-5) 31.25%,
      var(--mixed-local-color-3) 51.56%,
      var(--mixed-local-color-2) 65.63%,
      var(--mixed-local-color-1) 82.29%,
      var(--mixed-local-color-4) 100%
    );
  }

  :host([data-variant='default']) {
    background: radial-gradient(
      75.29% 75.29% at 64.96% 24.36%,
      #fff 0.52%,
      #f5ccfc 31.25%,
      #dba4f5 51.56%,
      #9a8ee8 65.63%,
      #6493da 82.29%,
      #6ebdea 100%
    );
  }
`;
var __decorate = function(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
let WuiAvatar = class WuiAvatar2 extends i {
  constructor() {
    super(...arguments);
    this.imageSrc = void 0;
    this.alt = void 0;
    this.address = void 0;
    this.size = "xl";
  }
  render() {
    const getSize = {
      inherit: "inherit",
      xxs: "3",
      xs: "5",
      sm: "6",
      md: "8",
      mdl: "8",
      lg: "10",
      xl: "16",
      xxl: "20"
    };
    this.style.cssText = `
    --local-width: var(--apkt-spacing-${getSize[this.size ?? "xl"]});
    --local-height: var(--apkt-spacing-${getSize[this.size ?? "xl"]});
    `;
    return x`${this.visualTemplate()}`;
  }
  visualTemplate() {
    if (this.imageSrc) {
      this.dataset["variant"] = "image";
      return x`<wui-image src=${this.imageSrc} alt=${this.alt ?? "avatar"}></wui-image>`;
    } else if (this.address) {
      this.dataset["variant"] = "generated";
      const cssColors = UiHelperUtil.generateAvatarColors(this.address);
      this.style.cssText += `
 ${cssColors}`;
      return null;
    }
    this.dataset["variant"] = "default";
    return null;
  }
};
WuiAvatar.styles = [resetStyles, styles];
__decorate([
  n()
], WuiAvatar.prototype, "imageSrc", void 0);
__decorate([
  n()
], WuiAvatar.prototype, "alt", void 0);
__decorate([
  n()
], WuiAvatar.prototype, "address", void 0);
__decorate([
  n()
], WuiAvatar.prototype, "size", void 0);
WuiAvatar = __decorate([
  customElement("wui-avatar")
], WuiAvatar);
