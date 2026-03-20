import { n as css, r as resetStyles, o as elementStyles, q as i, x, a as ChainController, S as SnackController, G as AssetUtil, T as ThemeController, u as getPreferredAccountType, W as W3mFrameRpcConstants, R as RouterController, c as CoreHelperUtil } from "./walletconnect-BVoLvI4P.js";
import { n, c as customElement, U as UiHelperUtil, r } from "./index-5878y4Sm.js";
import { o } from "./if-defined-DpCpmSxP.js";
import "./index-SiM7Ib3-.js";
import "./index-Bga-Wh90.js";
import "./index-73GArslZ.js";
import "./browser-3QHqHj2W.js";
const styles$1 = css`
  button {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${({ spacing }) => spacing[4]};
    background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
    border-radius: ${({ borderRadius }) => borderRadius[3]};
    border: none;
    padding: ${({ spacing }) => spacing[3]};
    transition: background-color ${({ durations }) => durations["lg"]}
      ${({ easings }) => easings["ease-out-power-2"]};
    will-change: background-color;
  }

  /* -- Hover & Active states ----------------------------------------------------------- */
  button:hover:enabled,
  button:active:enabled {
    background-color: ${({ tokens }) => tokens.theme.foregroundSecondary};
  }

  wui-text {
    flex: 1;
    color: ${({ tokens }) => tokens.theme.textSecondary};
  }

  wui-flex {
    width: auto;
    display: flex;
    align-items: center;
    gap: ${({ spacing }) => spacing["01"]};
  }

  wui-icon {
    color: ${({ tokens }) => tokens.theme.iconDefault};
  }

  .network-icon {
    position: relative;
    width: 20px;
    height: 20px;
    border-radius: ${({ borderRadius }) => borderRadius[4]};
    overflow: hidden;
    margin-left: -8px;
  }

  .network-icon:first-child {
    margin-left: 0px;
  }

  .network-icon:after {
    position: absolute;
    inset: 0;
    content: '';
    display: block;
    height: 100%;
    width: 100%;
    border-radius: ${({ borderRadius }) => borderRadius[4]};
    box-shadow: inset 0 0 0 1px ${({ tokens }) => tokens.core.glass010};
  }
`;
var __decorate$1 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let WuiCompatibleNetwork = class WuiCompatibleNetwork2 extends i {
  constructor() {
    super(...arguments);
    this.networkImages = [""];
    this.text = "";
  }
  render() {
    return x`
      <button>
        <wui-text variant="md-regular" color="inherit">${this.text}</wui-text>
        <wui-flex>
          ${this.networksTemplate()}
          <wui-icon name="chevronRight" size="sm" color="inherit"></wui-icon>
        </wui-flex>
      </button>
    `;
  }
  networksTemplate() {
    const slicedNetworks = this.networkImages.slice(0, 5);
    return x` <wui-flex class="networks">
      ${slicedNetworks?.map((network) => x` <wui-flex class="network-icon"> <wui-image src=${network}></wui-image> </wui-flex>`)}
    </wui-flex>`;
  }
};
WuiCompatibleNetwork.styles = [resetStyles, elementStyles, styles$1];
__decorate$1([
  n({ type: Array })
], WuiCompatibleNetwork.prototype, "networkImages", void 0);
__decorate$1([
  n()
], WuiCompatibleNetwork.prototype, "text", void 0);
WuiCompatibleNetwork = __decorate$1([
  customElement("wui-compatible-network")
], WuiCompatibleNetwork);
const styles = css`
  wui-compatible-network {
    margin-top: ${({ spacing }) => spacing["4"]};
    width: 100%;
  }

  wui-qr-code {
    width: unset !important;
    height: unset !important;
  }

  wui-icon {
    align-items: normal;
  }
`;
var __decorate = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mWalletReceiveView = class W3mWalletReceiveView2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.address = ChainController.getAccountData()?.address;
    this.profileName = ChainController.getAccountData()?.profileName;
    this.network = ChainController.state.activeCaipNetwork;
    this.unsubscribe.push(...[
      ChainController.subscribeChainProp("accountState", (val) => {
        if (val) {
          this.address = val.address;
          this.profileName = val.profileName;
        } else {
          SnackController.showError("Account not found");
        }
      })
    ], ChainController.subscribeKey("activeCaipNetwork", (val) => {
      if (val?.id) {
        this.network = val;
      }
    }));
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
  }
  render() {
    if (!this.address) {
      throw new Error("w3m-wallet-receive-view: No account provided");
    }
    const networkImage = AssetUtil.getNetworkImage(this.network);
    return x` <wui-flex
      flexDirection="column"
      .padding=${["0", "4", "4", "4"]}
      alignItems="center"
    >
      <wui-chip-button
        data-testid="receive-address-copy-button"
        @click=${this.onCopyClick.bind(this)}
        text=${UiHelperUtil.getTruncateString({
      string: this.profileName || this.address || "",
      charsStart: this.profileName ? 18 : 4,
      charsEnd: this.profileName ? 0 : 4,
      truncate: this.profileName ? "end" : "middle"
    })}
        icon="copy"
        size="sm"
        imageSrc=${networkImage ? networkImage : ""}
        variant="gray"
      ></wui-chip-button>
      <wui-flex
        flexDirection="column"
        .padding=${["4", "0", "0", "0"]}
        alignItems="center"
        gap="4"
      >
        <wui-qr-code
          size=${232}
          theme=${ThemeController.state.themeMode}
          uri=${this.address}
          ?arenaClear=${true}
          color=${o(ThemeController.state.themeVariables["--apkt-qr-color"] ?? ThemeController.state.themeVariables["--w3m-qr-color"])}
          data-testid="wui-qr-code"
        ></wui-qr-code>
        <wui-text variant="lg-regular" color="primary" align="center">
          Copy your address or scan this QR code
        </wui-text>
        <wui-button @click=${this.onCopyClick.bind(this)} size="sm" variant="neutral-secondary">
          <wui-icon slot="iconLeft" size="sm" color="inherit" name="copy"></wui-icon>
          <wui-text variant="md-regular" color="inherit">Copy address</wui-text>
        </wui-button>
      </wui-flex>
      ${this.networkTemplate()}
    </wui-flex>`;
  }
  networkTemplate() {
    const requestedCaipNetworks = ChainController.getAllRequestedCaipNetworks();
    const isNetworkEnabledForSmartAccounts = ChainController.checkIfSmartAccountEnabled();
    const caipNetwork = ChainController.state.activeCaipNetwork;
    const namespaceNetworks = requestedCaipNetworks.filter((network) => network?.chainNamespace === caipNetwork?.chainNamespace);
    if (getPreferredAccountType(caipNetwork?.chainNamespace) === W3mFrameRpcConstants.ACCOUNT_TYPES.SMART_ACCOUNT && isNetworkEnabledForSmartAccounts) {
      if (!caipNetwork) {
        return null;
      }
      return x`<wui-compatible-network
        @click=${this.onReceiveClick.bind(this)}
        text="Only receive assets on this network"
        .networkImages=${[AssetUtil.getNetworkImage(caipNetwork) ?? ""]}
      ></wui-compatible-network>`;
    }
    const slicedNetworks = namespaceNetworks?.filter((network) => network?.assets?.imageId)?.slice(0, 5);
    const imagesArray = slicedNetworks.map(AssetUtil.getNetworkImage).filter(Boolean);
    return x`<wui-compatible-network
      @click=${this.onReceiveClick.bind(this)}
      text="Only receive assets on these networks"
      .networkImages=${imagesArray}
    ></wui-compatible-network>`;
  }
  onReceiveClick() {
    RouterController.push("WalletCompatibleNetworks");
  }
  onCopyClick() {
    try {
      if (this.address) {
        CoreHelperUtil.copyToClopboard(this.address);
        SnackController.showSuccess("Address copied");
      }
    } catch {
      SnackController.showError("Failed to copy");
    }
  }
};
W3mWalletReceiveView.styles = styles;
__decorate([
  r()
], W3mWalletReceiveView.prototype, "address", void 0);
__decorate([
  r()
], W3mWalletReceiveView.prototype, "profileName", void 0);
__decorate([
  r()
], W3mWalletReceiveView.prototype, "network", void 0);
W3mWalletReceiveView = __decorate([
  customElement("w3m-wallet-receive-view")
], W3mWalletReceiveView);
export {
  W3mWalletReceiveView
};
