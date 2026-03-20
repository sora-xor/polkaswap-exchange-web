import { n as css, r as resetStyles, o as elementStyles, q as i, x } from "./walletconnect-BVoLvI4P.js";
import { n, c as customElement } from "./index-5878y4Sm.js";
const styles = css`
  button {
    background-color: transparent;
    padding: ${({ spacing }) => spacing[1]};
  }

  button:focus-visible {
    box-shadow: 0 0 0 4px ${({ tokens }) => tokens.core.foregroundAccent020};
  }

  button[data-variant='accent']:hover:enabled,
  button[data-variant='accent']:focus-visible {
    background-color: ${({ tokens }) => tokens.core.foregroundAccent010};
  }

  button[data-variant='primary']:hover:enabled,
  button[data-variant='primary']:focus-visible,
  button[data-variant='secondary']:hover:enabled,
  button[data-variant='secondary']:focus-visible {
    background-color: ${({ tokens }) => tokens.theme.foregroundSecondary};
  }

  button[data-size='xs'] > wui-icon {
    width: 8px;
    height: 8px;
  }

  button[data-size='sm'] > wui-icon {
    width: 12px;
    height: 12px;
  }

  button[data-size='xs'],
  button[data-size='sm'] {
    border-radius: ${({ borderRadius }) => borderRadius[1]};
  }

  button[data-size='md'],
  button[data-size='lg'] {
    border-radius: ${({ borderRadius }) => borderRadius[2]};
  }

  button[data-size='md'] > wui-icon {
    width: 16px;
    height: 16px;
  }

  button[data-size='lg'] > wui-icon {
    width: 20px;
    height: 20px;
  }

  button:disabled {
    background-color: transparent;
    cursor: not-allowed;
    opacity: 0.5;
  }

  button:hover:not(:disabled) {
    background-color: var(--wui-color-accent-glass-015);
  }

  button:focus-visible:not(:disabled) {
    background-color: var(--wui-color-accent-glass-015);
    box-shadow:
      inset 0 0 0 1px var(--wui-color-accent-100),
      0 0 0 4px var(--wui-color-accent-glass-020);
  }
`;
var __decorate = function(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
let WuiIconLink = class WuiIconLink2 extends i {
  constructor() {
    super(...arguments);
    this.size = "md";
    this.disabled = false;
    this.icon = "copy";
    this.iconColor = "default";
    this.variant = "accent";
  }
  render() {
    const iconColors = {
      accent: "accent-primary",
      primary: "inverse",
      secondary: "default"
    };
    return x`
      <button data-variant=${this.variant} ?disabled=${this.disabled} data-size=${this.size}>
        <wui-icon
          color=${iconColors[this.variant] || this.iconColor}
          size=${this.size}
          name=${this.icon}
        ></wui-icon>
      </button>
    `;
  }
};
WuiIconLink.styles = [resetStyles, elementStyles, styles];
__decorate([
  n()
], WuiIconLink.prototype, "size", void 0);
__decorate([
  n({ type: Boolean })
], WuiIconLink.prototype, "disabled", void 0);
__decorate([
  n()
], WuiIconLink.prototype, "icon", void 0);
__decorate([
  n()
], WuiIconLink.prototype, "iconColor", void 0);
__decorate([
  n()
], WuiIconLink.prototype, "variant", void 0);
WuiIconLink = __decorate([
  customElement("wui-icon-link")
], WuiIconLink);
