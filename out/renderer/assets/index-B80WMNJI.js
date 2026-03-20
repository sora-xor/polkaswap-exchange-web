import { n as css, r as resetStyles, o as elementStyles, q as i, x } from "./walletconnect-BVoLvI4P.js";
import { n, c as customElement } from "./index-5878y4Sm.js";
import { o } from "./if-defined-DpCpmSxP.js";
import "./index-DAKl5XGv.js";
const styles = css`
  :host {
    width: 100%;
  }

  :host([data-type='primary']) > button {
    background-color: ${({ tokens }) => tokens.theme.backgroundPrimary};
  }

  :host([data-type='secondary']) > button {
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
  }

  button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: ${({ spacing }) => spacing[3]};
    width: 100%;
    border-radius: ${({ borderRadius }) => borderRadius[4]};
    transition:
      background-color ${({ durations }) => durations["lg"]}
        ${({ easings }) => easings["ease-out-power-2"]},
      scale ${({ durations }) => durations["lg"]} ${({ easings }) => easings["ease-out-power-2"]};
    will-change: background-color, scale;
  }

  wui-text {
    text-transform: capitalize;
  }

  wui-image {
    color: ${({ tokens }) => tokens.theme.textPrimary};
  }

  @media (hover: hover) {
    :host([data-type='primary']) > button:hover:enabled {
      background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
    }

    :host([data-type='secondary']) > button:hover:enabled {
      background-color: ${({ tokens }) => tokens.theme.foregroundSecondary};
    }
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
var __decorate = function(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
let WuiListItem = class WuiListItem2 extends i {
  constructor() {
    super(...arguments);
    this.type = "primary";
    this.imageSrc = "google";
    this.imageSize = void 0;
    this.loading = false;
    this.boxColor = "foregroundPrimary";
    this.disabled = false;
    this.rightIcon = true;
    this.boxed = true;
    this.rounded = false;
    this.fullSize = false;
  }
  render() {
    this.dataset["rounded"] = this.rounded ? "true" : "false";
    this.dataset["type"] = this.type;
    return x`
      <button
        ?disabled=${this.loading ? true : Boolean(this.disabled)}
        data-loading=${this.loading}
        tabindex=${o(this.tabIdx)}
      >
        <wui-flex gap="2" alignItems="center">
          ${this.templateLeftIcon()}
          <wui-flex gap="1">
            <slot></slot>
          </wui-flex>
        </wui-flex>
        ${this.templateRightIcon()}
      </button>
    `;
  }
  templateLeftIcon() {
    if (this.icon) {
      return x`<wui-image
        icon=${this.icon}
        iconColor=${o(this.iconColor)}
        ?boxed=${this.boxed}
        ?rounded=${this.rounded}
        boxColor=${this.boxColor}
      ></wui-image>`;
    }
    return x`<wui-image
      ?boxed=${this.boxed}
      ?rounded=${this.rounded}
      ?fullSize=${this.fullSize}
      size=${o(this.imageSize)}
      src=${this.imageSrc}
      boxColor=${this.boxColor}
    ></wui-image>`;
  }
  templateRightIcon() {
    if (!this.rightIcon) {
      return null;
    }
    if (this.loading) {
      return x`<wui-loading-spinner size="md" color="accent-primary"></wui-loading-spinner>`;
    }
    return x`<wui-icon name="chevronRight" size="lg" color="default"></wui-icon>`;
  }
};
WuiListItem.styles = [resetStyles, elementStyles, styles];
__decorate([
  n()
], WuiListItem.prototype, "type", void 0);
__decorate([
  n()
], WuiListItem.prototype, "imageSrc", void 0);
__decorate([
  n()
], WuiListItem.prototype, "imageSize", void 0);
__decorate([
  n()
], WuiListItem.prototype, "icon", void 0);
__decorate([
  n()
], WuiListItem.prototype, "iconColor", void 0);
__decorate([
  n({ type: Boolean })
], WuiListItem.prototype, "loading", void 0);
__decorate([
  n()
], WuiListItem.prototype, "tabIdx", void 0);
__decorate([
  n()
], WuiListItem.prototype, "boxColor", void 0);
__decorate([
  n({ type: Boolean })
], WuiListItem.prototype, "disabled", void 0);
__decorate([
  n({ type: Boolean })
], WuiListItem.prototype, "rightIcon", void 0);
__decorate([
  n({ type: Boolean })
], WuiListItem.prototype, "boxed", void 0);
__decorate([
  n({ type: Boolean })
], WuiListItem.prototype, "rounded", void 0);
__decorate([
  n({ type: Boolean })
], WuiListItem.prototype, "fullSize", void 0);
WuiListItem = __decorate([
  customElement("wui-list-item")
], WuiListItem);
