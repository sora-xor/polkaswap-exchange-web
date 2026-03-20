import { a as ChainController, b as EventsController, R as RouterController, l as ConnectorController, S as SnackController, c as CoreHelperUtil, H as ref, I as StorageUtil, C as ConstantsUtil, n as css, r as resetStyles, q as i, x, o as elementStyles } from "./walletconnect-BVoLvI4P.js";
import { n, c as customElement } from "./index-5878y4Sm.js";
import { o } from "./if-defined-DpCpmSxP.js";
function getPopupWindow() {
  try {
    return CoreHelperUtil.returnOpenHref(`${ConstantsUtil.SECURE_SITE_SDK_ORIGIN}/loading`, "popupWindow", "width=600,height=800,scrollbars=yes");
  } catch (error) {
    throw new Error("Could not open social popup");
  }
}
async function connectFarcaster() {
  RouterController.push("ConnectingFarcaster");
  const authConnector = ConnectorController.getAuthConnector();
  if (authConnector) {
    const accountData = ChainController.getAccountData();
    if (!accountData?.farcasterUrl) {
      try {
        const { url } = await authConnector.provider.getFarcasterUri();
        ChainController.setAccountProp("farcasterUrl", url, ChainController.state.activeChain);
      } catch (error) {
        RouterController.goBack();
        SnackController.showError(error);
      }
    }
  }
}
async function connectSocial(socialProvider) {
  RouterController.push("ConnectingSocial");
  const authConnector = ConnectorController.getAuthConnector();
  let popupWindow = null;
  try {
    const timeout = setTimeout(() => {
      throw new Error("Social login timed out. Please try again.");
    }, 45e3);
    if (authConnector && socialProvider) {
      if (!CoreHelperUtil.isTelegram()) {
        popupWindow = getPopupWindow();
      }
      if (popupWindow) {
        ChainController.setAccountProp("socialWindow", ref(popupWindow), ChainController.state.activeChain);
      } else if (!CoreHelperUtil.isTelegram()) {
        throw new Error("Could not create social popup");
      }
      const { uri } = await authConnector.provider.getSocialRedirectUri({
        provider: socialProvider
      });
      if (!uri) {
        popupWindow?.close();
        throw new Error("Could not fetch the social redirect uri");
      }
      if (popupWindow) {
        popupWindow.location.href = uri;
      }
      if (CoreHelperUtil.isTelegram()) {
        StorageUtil.setTelegramSocialProvider(socialProvider);
        const parsedUri = CoreHelperUtil.formatTelegramSocialLoginUrl(uri);
        CoreHelperUtil.openHref(parsedUri, "_top");
      }
      clearTimeout(timeout);
    }
  } catch (error) {
    popupWindow?.close();
    const errorMessage = CoreHelperUtil.parseError(error);
    SnackController.showError(errorMessage);
    EventsController.sendEvent({
      type: "track",
      event: "SOCIAL_LOGIN_ERROR",
      properties: { provider: socialProvider, message: errorMessage }
    });
  }
}
async function executeSocialLogin(socialProvider) {
  ChainController.setAccountProp("socialProvider", socialProvider, ChainController.state.activeChain);
  EventsController.sendEvent({
    type: "track",
    event: "SOCIAL_LOGIN_STARTED",
    properties: { provider: socialProvider }
  });
  if (socialProvider === "farcaster") {
    await connectFarcaster();
  } else {
    await connectSocial(socialProvider);
  }
}
const styles$1 = css`
  :host {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 40px;
    height: 40px;
    border-radius: ${({ borderRadius }) => borderRadius["20"]};
    overflow: hidden;
  }

  wui-icon {
    width: 100%;
    height: 100%;
  }
`;
var __decorate$1 = function(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
let WuiLogo = class WuiLogo2 extends i {
  constructor() {
    super(...arguments);
    this.logo = "google";
  }
  render() {
    return x`<wui-icon color="inherit" size="inherit" name=${this.logo}></wui-icon> `;
  }
};
WuiLogo.styles = [resetStyles, styles$1];
__decorate$1([
  n()
], WuiLogo.prototype, "logo", void 0);
WuiLogo = __decorate$1([
  customElement("wui-logo")
], WuiLogo);
const styles = css`
  :host {
    width: 100%;
  }

  button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: ${({ spacing }) => spacing[3]};
    width: 100%;
    background-color: transparent;
    border-radius: ${({ borderRadius }) => borderRadius[4]};
  }

  wui-text {
    text-transform: capitalize;
  }

  @media (hover: hover) {
    button:hover:enabled {
      background-color: ${({ tokens }) => tokens.theme.foregroundPrimary};
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
let WuiListSocial = class WuiListSocial2 extends i {
  constructor() {
    super(...arguments);
    this.logo = "google";
    this.name = "Continue with google";
    this.disabled = false;
  }
  render() {
    return x`
      <button ?disabled=${this.disabled} tabindex=${o(this.tabIdx)}>
        <wui-flex gap="2" alignItems="center">
          <wui-image ?boxed=${true} logo=${this.logo}></wui-image>
          <wui-text variant="lg-regular" color="primary">${this.name}</wui-text>
        </wui-flex>
        <wui-icon name="chevronRight" size="lg" color="default"></wui-icon>
      </button>
    `;
  }
};
WuiListSocial.styles = [resetStyles, elementStyles, styles];
__decorate([
  n()
], WuiListSocial.prototype, "logo", void 0);
__decorate([
  n()
], WuiListSocial.prototype, "name", void 0);
__decorate([
  n()
], WuiListSocial.prototype, "tabIdx", void 0);
__decorate([
  n({ type: Boolean })
], WuiListSocial.prototype, "disabled", void 0);
WuiListSocial = __decorate([
  customElement("wui-list-social")
], WuiListSocial);
export {
  executeSocialLogin as e
};
