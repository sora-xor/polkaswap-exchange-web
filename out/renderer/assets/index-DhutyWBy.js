import { n as css, r as resetStyles, o as elementStyles, q as i, x } from "./walletconnect-BVoLvI4P.js";
import { n, c as customElement } from "./index-5878y4Sm.js";
import "./index-SiM7Ib3-.js";
import "./index-xvpTmtDJ.js";
const styles = css`
  button {
    display: block;
    display: flex;
    align-items: center;
    padding: ${({ spacing }) => spacing[1]};
    transition: background-color ${({ durations }) => durations["lg"]}
      ${({ easings }) => easings["ease-out-power-2"]};
    will-change: background-color;
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
    border-radius: ${({ borderRadius }) => borderRadius[32]};
  }

  wui-image {
    border-radius: ${({ borderRadius }) => borderRadius[32]};
  }

  wui-text {
    padding-left: ${({ spacing }) => spacing[1]};
    padding-right: ${({ spacing }) => spacing[1]};
  }

  .left-icon-container {
    width: 24px;
    height: 24px;
    justify-content: center;
    align-items: center;
  }

  .left-image-container {
    position: relative;
    justify-content: center;
    align-items: center;
  }

  .chain-image {
    position: absolute;
    border: 1px solid ${({ tokens }) => tokens.theme.foregroundPrimary};
  }

  /* -- Sizes --------------------------------------------------- */
  button[data-size='lg'] {
    height: 32px;
  }

  button[data-size='md'] {
    height: 28px;
  }

  button[data-size='sm'] {
    height: 24px;
  }

  button[data-size='lg'] .token-image {
    width: 24px;
    height: 24px;
  }

  button[data-size='md'] .token-image {
    width: 20px;
    height: 20px;
  }

  button[data-size='sm'] .token-image {
    width: 16px;
    height: 16px;
  }

  button[data-size='lg'] .left-icon-container {
    width: 24px;
    height: 24px;
  }

  button[data-size='md'] .left-icon-container {
    width: 20px;
    height: 20px;
  }

  button[data-size='sm'] .left-icon-container {
    width: 16px;
    height: 16px;
  }

  button[data-size='lg'] .chain-image {
    width: 12px;
    height: 12px;
    bottom: 2px;
    right: -4px;
  }

  button[data-size='md'] .chain-image {
    width: 10px;
    height: 10px;
    bottom: 2px;
    right: -4px;
  }

  button[data-size='sm'] .chain-image {
    width: 8px;
    height: 8px;
    bottom: 2px;
    right: -3px;
  }

  /* -- Focus states --------------------------------------------------- */
  button:focus-visible:enabled {
    background-color: ${({ tokens }) => tokens.theme.foregroundSecondary};
    box-shadow: 0 0 0 4px ${({ tokens }) => tokens.core.foregroundAccent040};
  }

  /* -- Hover & Active states ----------------------------------------------------------- */
  @media (hover: hover) {
    button:hover:enabled,
    button:active:enabled {
      background-color: ${({ tokens }) => tokens.theme.foregroundSecondary};
    }
  }

  /* -- Disabled states --------------------------------------------------- */
  button:disabled {
    background-color: ${({ tokens }) => tokens.theme.foregroundSecondary};
    opacity: 0.5;
  }
`;
var __decorate = function(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
const TEXT_VARIANT_BY_SIZE = {
  lg: "lg-regular",
  md: "lg-regular",
  sm: "md-regular"
};
const ICON_SIZE_BY_SIZE = {
  lg: "lg",
  md: "md",
  sm: "sm"
};
let WuiTokenButton = class WuiTokenButton2 extends i {
  constructor() {
    super(...arguments);
    this.size = "md";
    this.disabled = false;
    this.text = "";
    this.loading = false;
  }
  render() {
    if (this.loading) {
      return x` <wui-flex alignItems="center" gap="01" padding="01">
        <wui-shimmer width="20px" height="20px"></wui-shimmer>
        <wui-shimmer width="32px" height="18px" borderRadius="4xs"></wui-shimmer>
      </wui-flex>`;
    }
    return x`
      <button ?disabled=${this.disabled} data-size=${this.size}>
        ${this.imageTemplate()} ${this.textTemplate()}
      </button>
    `;
  }
  imageTemplate() {
    if (this.imageSrc && this.chainImageSrc) {
      return x`<wui-flex class="left-image-container">
        <wui-image src=${this.imageSrc} class="token-image"></wui-image>
        <wui-image src=${this.chainImageSrc} class="chain-image"></wui-image>
      </wui-flex>`;
    }
    if (this.imageSrc) {
      return x`<wui-image src=${this.imageSrc} class="token-image"></wui-image>`;
    }
    const iconSize = ICON_SIZE_BY_SIZE[this.size];
    return x`<wui-flex class="left-icon-container">
      <wui-icon size=${iconSize} name="networkPlaceholder"></wui-icon>
    </wui-flex>`;
  }
  textTemplate() {
    const textVariant = TEXT_VARIANT_BY_SIZE[this.size];
    return x`<wui-text color="primary" variant=${textVariant}
      >${this.text}</wui-text
    >`;
  }
};
WuiTokenButton.styles = [resetStyles, elementStyles, styles];
__decorate([
  n()
], WuiTokenButton.prototype, "size", void 0);
__decorate([
  n()
], WuiTokenButton.prototype, "imageSrc", void 0);
__decorate([
  n()
], WuiTokenButton.prototype, "chainImageSrc", void 0);
__decorate([
  n({ type: Boolean })
], WuiTokenButton.prototype, "disabled", void 0);
__decorate([
  n()
], WuiTokenButton.prototype, "text", void 0);
__decorate([
  n({ type: Boolean })
], WuiTokenButton.prototype, "loading", void 0);
WuiTokenButton = __decorate([
  customElement("wui-token-button")
], WuiTokenButton);
