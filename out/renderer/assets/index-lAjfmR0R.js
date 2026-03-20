import { n as css, r as resetStyles, q as i, x, o as elementStyles } from "./walletconnect-BVoLvI4P.js";
import { n, c as customElement } from "./index-5878y4Sm.js";
import { o } from "./if-defined-DpCpmSxP.js";
import "./index-Cm7UDlkl.js";
import "./index-Cztg-IpD.js";
import "./index-CBcUV-KC.js";
const styles$1 = css`
  :host {
    position: relative;
    border-radius: ${({ borderRadius }) => borderRadius[2]};
    width: 40px;
    height: 40px;
    overflow: hidden;
    background: ${({ tokens }) => tokens.theme.foregroundPrimary};
    display: flex;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
    column-gap: ${({ spacing }) => spacing[1]};
    padding: ${({ spacing }) => spacing[1]};
  }

  :host > wui-wallet-image {
    width: 14px;
    height: 14px;
    border-radius: 2px;
  }
`;
var __decorate$1 = function(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
const TOTAL_IMAGES = 4;
let WuiAllWalletsImage = class WuiAllWalletsImage2 extends i {
  constructor() {
    super(...arguments);
    this.walletImages = [];
  }
  render() {
    const isPlaceholders = this.walletImages.length < TOTAL_IMAGES;
    return x`${this.walletImages.slice(0, TOTAL_IMAGES).map(({ src, walletName }) => x`
          <wui-wallet-image
            size="sm"
            imageSrc=${src}
            name=${o(walletName)}
          ></wui-wallet-image>
        `)}
    ${isPlaceholders ? [...Array(TOTAL_IMAGES - this.walletImages.length)].map(() => x` <wui-wallet-image size="sm" name=""></wui-wallet-image>`) : null} `;
  }
};
WuiAllWalletsImage.styles = [resetStyles, styles$1];
__decorate$1([
  n({ type: Array })
], WuiAllWalletsImage.prototype, "walletImages", void 0);
WuiAllWalletsImage = __decorate$1([
  customElement("wui-all-wallets-image")
], WuiAllWalletsImage);
const styles = css`
  :host {
    width: 100%;
  }

  button {
    column-gap: ${({ spacing }) => spacing[2]};
    padding: ${({ spacing }) => spacing[3]};
    width: 100%;
    background-color: transparent;
    border-radius: ${({ borderRadius }) => borderRadius[4]};
    color: ${({ tokens }) => tokens.theme.textPrimary};
  }

  button > wui-wallet-image {
    background: ${({ tokens }) => tokens.theme.foregroundSecondary};
  }

  button > wui-text:nth-child(2) {
    display: flex;
    flex: 1;
  }

  button:hover:enabled {
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
  }

  button[data-all-wallets='true'] {
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
  }

  button[data-all-wallets='true']:hover:enabled {
    background-color: ${({ tokens }) => tokens.theme.foregroundSecondary};
  }

  button:focus-visible:enabled {
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
    box-shadow: 0 0 0 4px ${({ tokens }) => tokens.core.foregroundAccent020};
  }

  button:disabled {
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
    opacity: 0.5;
    cursor: not-allowed;
  }

  button:disabled > wui-tag {
    background-color: ${({ tokens }) => tokens.core.glass010};
    color: ${({ tokens }) => tokens.theme.foregroundTertiary};
  }

  wui-flex.namespace-icon {
    width: 16px;
    height: 16px;
    border-radius: ${({ borderRadius }) => borderRadius.round};
    background-color: ${({ tokens }) => tokens.theme.foregroundSecondary};
    box-shadow: 0 0 0 2px ${({ tokens }) => tokens.theme.backgroundPrimary};
    transition: box-shadow var(--apkt-durations-lg) var(--apkt-easings-ease-out-power-2);
  }

  button:hover:enabled wui-flex.namespace-icon {
    box-shadow: 0 0 0 2px ${({ tokens }) => tokens.theme.foregroundPrimary};
  }

  wui-flex.namespace-icon > wui-icon {
    width: 10px;
    height: 10px;
  }

  wui-flex.namespace-icon:not(:first-child) {
    margin-left: -4px;
  }
`;
var __decorate = function(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
const NAMESPACE_ICONS = {
  eip155: "ethereum",
  solana: "solana",
  bip122: "bitcoin",
  polkadot: void 0,
  cosmos: void 0,
  sui: void 0,
  stacks: void 0,
  ton: "ton"
};
let WuiListWallet = class WuiListWallet2 extends i {
  constructor() {
    super(...arguments);
    this.walletImages = [];
    this.imageSrc = "";
    this.name = "";
    this.size = "md";
    this.tabIdx = void 0;
    this.namespaces = [];
    this.disabled = false;
    this.showAllWallets = false;
    this.loading = false;
    this.loadingSpinnerColor = "accent-100";
  }
  render() {
    this.dataset["size"] = this.size;
    return x`
      <button
        ?disabled=${this.disabled}
        data-all-wallets=${this.showAllWallets}
        tabindex=${o(this.tabIdx)}
      >
        ${this.templateAllWallets()} ${this.templateWalletImage()}
        <wui-flex flexDirection="column" justifyContent="center" alignItems="flex-start" gap="1">
          <wui-text variant="lg-regular" color="inherit">${this.name}</wui-text>
          ${this.templateNamespaces()}
        </wui-flex>
        ${this.templateStatus()}
        <wui-icon name="chevronRight" size="lg" color="default"></wui-icon>
      </button>
    `;
  }
  templateNamespaces() {
    if (this.namespaces?.length) {
      return x`<wui-flex alignItems="center" gap="0">
        ${this.namespaces.map((namespace, index) => x`<wui-flex
              alignItems="center"
              justifyContent="center"
              zIndex=${(this.namespaces?.length ?? 0) * 2 - index}
              class="namespace-icon"
            >
              <wui-icon
                name=${o(NAMESPACE_ICONS[namespace])}
                size="sm"
                color="default"
              ></wui-icon>
            </wui-flex>`)}
      </wui-flex>`;
    }
    return null;
  }
  templateAllWallets() {
    if (this.showAllWallets && this.imageSrc) {
      return x` <wui-all-wallets-image .imageeSrc=${this.imageSrc}> </wui-all-wallets-image> `;
    } else if (this.showAllWallets && this.walletIcon) {
      return x` <wui-wallet-image .walletIcon=${this.walletIcon} size="sm"> </wui-wallet-image> `;
    }
    return null;
  }
  templateWalletImage() {
    if (!this.showAllWallets && this.imageSrc) {
      return x`<wui-wallet-image
        size=${o(this.size === "sm" ? "sm" : "md")}
        imageSrc=${this.imageSrc}
        name=${this.name}
      ></wui-wallet-image>`;
    } else if (!this.showAllWallets && !this.imageSrc) {
      return x`<wui-wallet-image size="sm" name=${this.name}></wui-wallet-image>`;
    }
    return null;
  }
  templateStatus() {
    if (this.loading) {
      return x`<wui-loading-spinner size="lg" color="accent-primary"></wui-loading-spinner>`;
    } else if (this.tagLabel && this.tagVariant) {
      return x`<wui-tag size="sm" variant=${this.tagVariant}>${this.tagLabel}</wui-tag>`;
    }
    return null;
  }
};
WuiListWallet.styles = [resetStyles, elementStyles, styles];
__decorate([
  n({ type: Array })
], WuiListWallet.prototype, "walletImages", void 0);
__decorate([
  n()
], WuiListWallet.prototype, "imageSrc", void 0);
__decorate([
  n()
], WuiListWallet.prototype, "name", void 0);
__decorate([
  n()
], WuiListWallet.prototype, "size", void 0);
__decorate([
  n()
], WuiListWallet.prototype, "tagLabel", void 0);
__decorate([
  n()
], WuiListWallet.prototype, "tagVariant", void 0);
__decorate([
  n()
], WuiListWallet.prototype, "walletIcon", void 0);
__decorate([
  n()
], WuiListWallet.prototype, "tabIdx", void 0);
__decorate([
  n({ type: Array })
], WuiListWallet.prototype, "namespaces", void 0);
__decorate([
  n({ type: Boolean })
], WuiListWallet.prototype, "disabled", void 0);
__decorate([
  n({ type: Boolean })
], WuiListWallet.prototype, "showAllWallets", void 0);
__decorate([
  n({ type: Boolean })
], WuiListWallet.prototype, "loading", void 0);
__decorate([
  n({ type: String })
], WuiListWallet.prototype, "loadingSpinnerColor", void 0);
WuiListWallet = __decorate([
  customElement("wui-list-wallet")
], WuiListWallet);
