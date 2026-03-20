import { n as css, q as i, l as ConnectorController, O as OptionsController, U as ApiController, R as RouterController, h as ConstantsUtil, x, c as CoreHelperUtil, V as W3mFrameProvider, z as AlertController, a as ChainController, m as ConnectionController, b as EventsController, I as StorageUtil, S as SnackController, X as ErrorUtil, M as ModalController, T as ThemeController } from "./walletconnect-BVoLvI4P.js";
import { n, r, c as customElement } from "./index-5878y4Sm.js";
import { o } from "./if-defined-DpCpmSxP.js";
import { O as OptionsStateController } from "./index-CqrG0F4W.js";
import { e as executeSocialLogin } from "./index-BYXJPSCB.js";
import "./index-Cm7UDlkl.js";
import "./index-DgvHPQm2.js";
import { C as ConstantsUtil$1 } from "./ConstantsUtil-BrK1znIM.js";
import "./index-Bag94m_F.js";
import "./index-Bga-Wh90.js";
import "./index-xvpTmtDJ.js";
import "./index-73GArslZ.js";
import "./ref-j6LTZZuR.js";
import "./index-DAKl5XGv.js";
import "./index-SiM7Ib3-.js";
import "./browser-3QHqHj2W.js";
const styles$3 = css`
  :host {
    margin-top: ${({ spacing }) => spacing["1"]};
  }
  wui-separator {
    margin: ${({ spacing }) => spacing["3"]} calc(${({ spacing }) => spacing["3"]} * -1)
      ${({ spacing }) => spacing["2"]} calc(${({ spacing }) => spacing["3"]} * -1);
    width: calc(100% + ${({ spacing }) => spacing["3"]} * 2);
  }
`;
var __decorate$3 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mSocialLoginList = class W3mSocialLoginList2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.tabIdx = void 0;
    this.connectors = ConnectorController.state.connectors;
    this.authConnector = this.connectors.find((c) => c.type === "AUTH");
    this.remoteFeatures = OptionsController.state.remoteFeatures;
    this.isPwaLoading = false;
    this.hasExceededUsageLimit = ApiController.state.plan.hasExceededUsageLimit;
    this.unsubscribe.push(ConnectorController.subscribeKey("connectors", (val) => {
      this.connectors = val;
      this.authConnector = this.connectors.find((c) => c.type === "AUTH");
    }), OptionsController.subscribeKey("remoteFeatures", (val) => this.remoteFeatures = val));
  }
  connectedCallback() {
    super.connectedCallback();
    this.handlePwaFrameLoad();
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
  }
  render() {
    let socials = this.remoteFeatures?.socials || [];
    const isAuthConnectorExist = Boolean(this.authConnector);
    const isSocialsEnabled = socials?.length;
    const isConnectSocialsView = RouterController.state.view === "ConnectSocials";
    if ((!isAuthConnectorExist || !isSocialsEnabled) && !isConnectSocialsView) {
      return null;
    }
    if (isConnectSocialsView && !isSocialsEnabled) {
      socials = ConstantsUtil.DEFAULT_SOCIALS;
    }
    return x` <wui-flex flexDirection="column" gap="2">
      ${socials.map((social) => x`<wui-list-social
            @click=${() => {
      this.onSocialClick(social);
    }}
            data-testid=${`social-selector-${social}`}
            name=${social}
            logo=${social}
            ?disabled=${this.isPwaLoading}
          ></wui-list-social>`)}
    </wui-flex>`;
  }
  async onSocialClick(socialProvider) {
    if (this.hasExceededUsageLimit) {
      RouterController.push("UsageExceeded");
      return;
    }
    if (socialProvider) {
      await executeSocialLogin(socialProvider);
    }
  }
  async handlePwaFrameLoad() {
    if (CoreHelperUtil.isPWA()) {
      this.isPwaLoading = true;
      try {
        if (this.authConnector?.provider instanceof W3mFrameProvider) {
          await this.authConnector.provider.init();
        }
      } catch (error) {
        AlertController.open({
          displayMessage: "Error loading embedded wallet in PWA",
          debugMessage: error.message
        }, "error");
      } finally {
        this.isPwaLoading = false;
      }
    }
  }
};
W3mSocialLoginList.styles = styles$3;
__decorate$3([
  n()
], W3mSocialLoginList.prototype, "tabIdx", void 0);
__decorate$3([
  r()
], W3mSocialLoginList.prototype, "connectors", void 0);
__decorate$3([
  r()
], W3mSocialLoginList.prototype, "authConnector", void 0);
__decorate$3([
  r()
], W3mSocialLoginList.prototype, "remoteFeatures", void 0);
__decorate$3([
  r()
], W3mSocialLoginList.prototype, "isPwaLoading", void 0);
__decorate$3([
  r()
], W3mSocialLoginList.prototype, "hasExceededUsageLimit", void 0);
W3mSocialLoginList = __decorate$3([
  customElement("w3m-social-login-list")
], W3mSocialLoginList);
const styles$2 = css`
  wui-flex {
    max-height: clamp(360px, 540px, 80vh);
    overflow: scroll;
    scrollbar-width: none;
    transition: opacity ${({ durations }) => durations["md"]}
      ${({ easings }) => easings["ease-out-power-1"]};
    will-change: opacity;
  }

  wui-flex::-webkit-scrollbar {
    display: none;
  }

  wui-flex.disabled {
    opacity: 0.3;
    pointer-events: none;
    user-select: none;
  }
`;
var __decorate$2 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mConnectSocialsView = class W3mConnectSocialsView2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.checked = OptionsStateController.state.isLegalCheckboxChecked;
    this.unsubscribe.push(OptionsStateController.subscribeKey("isLegalCheckboxChecked", (val) => {
      this.checked = val;
    }));
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
  }
  render() {
    const { termsConditionsUrl, privacyPolicyUrl } = OptionsController.state;
    const legalCheckbox = OptionsController.state.features?.legalCheckbox;
    const legalUrl = termsConditionsUrl || privacyPolicyUrl;
    const showLegalCheckbox = Boolean(legalUrl) && Boolean(legalCheckbox);
    const disabled = showLegalCheckbox && !this.checked;
    const tabIndex = disabled ? -1 : void 0;
    return x`
      <w3m-legal-checkbox></w3m-legal-checkbox>
      <wui-flex
        flexDirection="column"
        .padding=${["0", "3", "3", "3"]}
        gap="01"
        class=${o(disabled ? "disabled" : void 0)}
      >
        <w3m-social-login-list tabIdx=${o(tabIndex)}></w3m-social-login-list>
      </wui-flex>
    `;
  }
};
W3mConnectSocialsView.styles = styles$2;
__decorate$2([
  r()
], W3mConnectSocialsView.prototype, "checked", void 0);
W3mConnectSocialsView = __decorate$2([
  customElement("w3m-connect-socials-view")
], W3mConnectSocialsView);
const styles$1 = css`
  wui-logo {
    width: 80px;
    height: 80px;
    border-radius: ${({ borderRadius }) => borderRadius["8"]};
  }
  @keyframes shake {
    0% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(3px);
    }
    50% {
      transform: translateX(-3px);
    }
    75% {
      transform: translateX(3px);
    }
    100% {
      transform: translateX(0);
    }
  }
  wui-flex:first-child:not(:only-child) {
    position: relative;
  }
  wui-loading-thumbnail {
    position: absolute;
  }
  wui-icon-box {
    position: absolute;
    right: calc(${({ spacing }) => spacing["1"]} * -1);
    bottom: calc(${({ spacing }) => spacing["1"]} * -1);
    opacity: 0;
    transform: scale(0.5);
    transition: all ${({ easings }) => easings["ease-out-power-2"]}
      ${({ durations }) => durations["lg"]};
  }
  wui-text[align='center'] {
    width: 100%;
    padding: 0px ${({ spacing }) => spacing["4"]};
  }
  [data-error='true'] wui-icon-box {
    opacity: 1;
    transform: scale(1);
  }
  [data-error='true'] > wui-flex:first-child {
    animation: shake 250ms ${({ easings }) => easings["ease-out-power-2"]} both;
  }
  .capitalize {
    text-transform: capitalize;
  }
`;
var __decorate$1 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mConnectingSocialView = class W3mConnectingSocialView2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.socialProvider = ChainController.getAccountData()?.socialProvider;
    this.socialWindow = ChainController.getAccountData()?.socialWindow;
    this.error = false;
    this.connecting = false;
    this.message = "Connect in the provider window";
    this.remoteFeatures = OptionsController.state.remoteFeatures;
    this.address = ChainController.getAccountData()?.address;
    this.connectionsByNamespace = ConnectionController.getConnections(ChainController.state.activeChain);
    this.hasMultipleConnections = this.connectionsByNamespace.length > 0;
    this.authConnector = ConnectorController.getAuthConnector();
    this.handleSocialConnection = async (event) => {
      if (event.data?.resultUri) {
        if (event.origin === ConstantsUtil$1.SECURE_SITE_ORIGIN) {
          window.removeEventListener("message", this.handleSocialConnection, false);
          try {
            if (this.authConnector && !this.connecting) {
              this.connecting = true;
              const error = this.parseURLError(event.data.resultUri);
              if (error) {
                this.handleSocialError(error);
                return;
              }
              this.closeSocialWindow();
              this.updateMessage();
              const uri = event.data.resultUri;
              if (this.socialProvider) {
                EventsController.sendEvent({
                  type: "track",
                  event: "SOCIAL_LOGIN_REQUEST_USER_DATA",
                  properties: { provider: this.socialProvider }
                });
              }
              await ConnectionController.connectExternal({
                id: this.authConnector.id,
                type: this.authConnector.type,
                socialUri: uri
              }, this.authConnector.chain);
              if (this.socialProvider) {
                StorageUtil.setConnectedSocialProvider(this.socialProvider);
                EventsController.sendEvent({
                  type: "track",
                  event: "SOCIAL_LOGIN_SUCCESS",
                  properties: { provider: this.socialProvider }
                });
              }
            }
          } catch (error) {
            this.error = true;
            this.updateMessage();
            if (this.socialProvider) {
              EventsController.sendEvent({
                type: "track",
                event: "SOCIAL_LOGIN_ERROR",
                properties: {
                  provider: this.socialProvider,
                  message: CoreHelperUtil.parseError(error)
                }
              });
            }
          }
        } else {
          RouterController.goBack();
          SnackController.showError("Untrusted Origin");
          if (this.socialProvider) {
            EventsController.sendEvent({
              type: "track",
              event: "SOCIAL_LOGIN_ERROR",
              properties: {
                provider: this.socialProvider,
                message: "Untrusted Origin"
              }
            });
          }
        }
      }
    };
    const abortController = ErrorUtil.EmbeddedWalletAbortController;
    abortController.signal.addEventListener("abort", () => {
      this.closeSocialWindow();
    });
    this.unsubscribe.push(...[
      ChainController.subscribeChainProp("accountState", (val) => {
        if (val) {
          this.socialProvider = val.socialProvider;
          if (val.socialWindow) {
            this.socialWindow = val.socialWindow;
          }
          if (val.address) {
            const isMultiWalletEnabled = this.remoteFeatures?.multiWallet;
            if (val.address !== this.address) {
              if (this.hasMultipleConnections && isMultiWalletEnabled) {
                RouterController.replace("ProfileWallets");
                SnackController.showSuccess("New Wallet Added");
                this.address = val.address;
              } else if (ModalController.state.open || OptionsController.state.enableEmbedded) {
                ModalController.close();
              }
            }
          }
        }
      }),
      OptionsController.subscribeKey("remoteFeatures", (val) => {
        this.remoteFeatures = val;
      })
    ]);
    if (this.authConnector) {
      this.connectSocial();
    }
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
    window.removeEventListener("message", this.handleSocialConnection, false);
    const isConnected = ChainController.state.activeCaipAddress;
    if (!isConnected && this.socialProvider && !this.connecting) {
      EventsController.sendEvent({
        type: "track",
        event: "SOCIAL_LOGIN_CANCELED",
        properties: { provider: this.socialProvider }
      });
    }
    this.closeSocialWindow();
  }
  render() {
    return x`
      <wui-flex
        data-error=${o(this.error)}
        flexDirection="column"
        alignItems="center"
        .padding=${["10", "5", "5", "5"]}
        gap="6"
      >
        <wui-flex justifyContent="center" alignItems="center">
          <wui-logo logo=${o(this.socialProvider)}></wui-logo>
          ${this.error ? null : this.loaderTemplate()}
          <wui-icon-box color="error" icon="close" size="sm"></wui-icon-box>
        </wui-flex>
        <wui-flex flexDirection="column" alignItems="center" gap="2">
          <wui-text align="center" variant="lg-medium" color="primary"
            >Log in with
            <span class="capitalize">${this.socialProvider ?? "Social"}</span></wui-text
          >
          <wui-text align="center" variant="lg-regular" color=${this.error ? "error" : "secondary"}
            >${this.message}</wui-text
          ></wui-flex
        >
      </wui-flex>
    `;
  }
  loaderTemplate() {
    const borderRadiusMaster = ThemeController.state.themeVariables["--w3m-border-radius-master"];
    const radius = borderRadiusMaster ? parseInt(borderRadiusMaster.replace("px", ""), 10) : 4;
    return x`<wui-loading-thumbnail radius=${radius * 9}></wui-loading-thumbnail>`;
  }
  parseURLError(uri) {
    try {
      const errorKey = "error=";
      const errorIndex = uri.indexOf(errorKey);
      if (errorIndex === -1) {
        return null;
      }
      const error = uri.substring(errorIndex + errorKey.length);
      return error;
    } catch {
      return null;
    }
  }
  connectSocial() {
    const interval = setInterval(() => {
      if (this.socialWindow?.closed) {
        if (!this.connecting && RouterController.state.view === "ConnectingSocial") {
          RouterController.goBack();
        }
        clearInterval(interval);
      }
    }, 1e3);
    window.addEventListener("message", this.handleSocialConnection, false);
  }
  updateMessage() {
    if (this.error) {
      this.message = "Something went wrong";
    } else if (this.connecting) {
      this.message = "Retrieving user data";
    } else {
      this.message = "Connect in the provider window";
    }
  }
  handleSocialError(error) {
    this.error = true;
    this.updateMessage();
    if (this.socialProvider) {
      EventsController.sendEvent({
        type: "track",
        event: "SOCIAL_LOGIN_ERROR",
        properties: { provider: this.socialProvider, message: error }
      });
    }
    this.closeSocialWindow();
  }
  closeSocialWindow() {
    if (this.socialWindow) {
      this.socialWindow.close();
      ChainController.setAccountProp("socialWindow", void 0, ChainController.state.activeChain);
    }
  }
};
W3mConnectingSocialView.styles = styles$1;
__decorate$1([
  r()
], W3mConnectingSocialView.prototype, "socialProvider", void 0);
__decorate$1([
  r()
], W3mConnectingSocialView.prototype, "socialWindow", void 0);
__decorate$1([
  r()
], W3mConnectingSocialView.prototype, "error", void 0);
__decorate$1([
  r()
], W3mConnectingSocialView.prototype, "connecting", void 0);
__decorate$1([
  r()
], W3mConnectingSocialView.prototype, "message", void 0);
__decorate$1([
  r()
], W3mConnectingSocialView.prototype, "remoteFeatures", void 0);
W3mConnectingSocialView = __decorate$1([
  customElement("w3m-connecting-social-view")
], W3mConnectingSocialView);
const styles = css`
  wui-shimmer {
    width: 100%;
    aspect-ratio: 1 / 1;
    border-radius: ${({ borderRadius }) => borderRadius[4]};
  }

  wui-qr-code {
    opacity: 0;
    animation-duration: ${({ durations }) => durations["xl"]};
    animation-timing-function: ${({ easings }) => easings["ease-out-power-2"]};
    animation-name: fade-in;
    animation-fill-mode: forwards;
  }

  wui-logo {
    width: 80px;
    height: 80px;
    border-radius: ${({ borderRadius }) => borderRadius["8"]};
  }

  wui-flex:first-child:not(:only-child) {
    position: relative;
  }

  wui-loading-thumbnail {
    position: absolute;
  }

  wui-icon-box {
    position: absolute;
    right: calc(${({ spacing }) => spacing["1"]} * -1);
    bottom: calc(${({ spacing }) => spacing["1"]} * -1);
    opacity: 0;
    transform: scale(0.5);
    transition:
      opacity ${({ durations }) => durations["lg"]} ${({ easings }) => easings["ease-out-power-2"]},
      transform ${({ durations }) => durations["lg"]}
        ${({ easings }) => easings["ease-out-power-2"]};
    will-change: opacity, transform;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;
var __decorate = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mConnectingFarcasterView = class W3mConnectingFarcasterView2 extends i {
  constructor() {
    super();
    this.unsubscribe = [];
    this.timeout = void 0;
    this.socialProvider = ChainController.getAccountData()?.socialProvider;
    this.uri = ChainController.getAccountData()?.farcasterUrl;
    this.ready = false;
    this.loading = false;
    this.remoteFeatures = OptionsController.state.remoteFeatures;
    this.authConnector = ConnectorController.getAuthConnector();
    this.forceUpdate = () => {
      this.requestUpdate();
    };
    this.unsubscribe.push(...[
      ChainController.subscribeChainProp("accountState", (val) => {
        this.socialProvider = val?.socialProvider;
        this.uri = val?.farcasterUrl;
        this.connectFarcaster();
      }),
      OptionsController.subscribeKey("remoteFeatures", (val) => {
        this.remoteFeatures = val;
      })
    ]);
    window.addEventListener("resize", this.forceUpdate);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this.timeout);
    window.removeEventListener("resize", this.forceUpdate);
    const isConnected = ChainController.state.activeCaipAddress;
    if (!isConnected && this.socialProvider && (this.uri || this.loading)) {
      EventsController.sendEvent({
        type: "track",
        event: "SOCIAL_LOGIN_CANCELED",
        properties: { provider: this.socialProvider }
      });
    }
  }
  render() {
    this.onRenderProxy();
    return x`${this.platformTemplate()}`;
  }
  platformTemplate() {
    if (CoreHelperUtil.isMobile()) {
      return x`${this.mobileTemplate()}`;
    }
    return x`${this.desktopTemplate()}`;
  }
  desktopTemplate() {
    if (this.loading) {
      return x`${this.loadingTemplate()}`;
    }
    return x`${this.qrTemplate()}`;
  }
  qrTemplate() {
    return x` <wui-flex
      flexDirection="column"
      alignItems="center"
      .padding=${["0", "5", "5", "5"]}
      gap="5"
    >
      <wui-shimmer width="100%"> ${this.qrCodeTemplate()} </wui-shimmer>

      <wui-text variant="lg-medium" color="primary"> Scan this QR Code with your phone </wui-text>
      ${this.copyTemplate()}
    </wui-flex>`;
  }
  loadingTemplate() {
    return x`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        .padding=${["5", "5", "5", "5"]}
        gap="5"
      >
        <wui-flex justifyContent="center" alignItems="center">
          <wui-logo logo="farcaster"></wui-logo>
          ${this.loaderTemplate()}
          <wui-icon-box color="error" icon="close" size="sm"></wui-icon-box>
        </wui-flex>
        <wui-flex flexDirection="column" alignItems="center" gap="2">
          <wui-text align="center" variant="md-medium" color="primary">
            Loading user data
          </wui-text>
          <wui-text align="center" variant="sm-regular" color="secondary">
            Please wait a moment while we load your data.
          </wui-text>
        </wui-flex>
      </wui-flex>
    `;
  }
  mobileTemplate() {
    return x` <wui-flex
      flexDirection="column"
      alignItems="center"
      .padding=${["10", "5", "5", "5"]}
      gap="5"
    >
      <wui-flex justifyContent="center" alignItems="center">
        <wui-logo logo="farcaster"></wui-logo>
        ${this.loaderTemplate()}
        <wui-icon-box
          color="error"
          icon="close"
          size="sm"
        ></wui-icon-box>
      </wui-flex>
      <wui-flex flexDirection="column" alignItems="center" gap="2">
        <wui-text align="center" variant="md-medium" color="primary"
          >Continue in Farcaster</span></wui-text
        >
        <wui-text align="center" variant="sm-regular" color="secondary"
          >Accept connection request in the app</wui-text
        ></wui-flex
      >
      ${this.mobileLinkTemplate()}
    </wui-flex>`;
  }
  loaderTemplate() {
    const borderRadiusMaster = ThemeController.state.themeVariables["--w3m-border-radius-master"];
    const radius = borderRadiusMaster ? parseInt(borderRadiusMaster.replace("px", ""), 10) : 4;
    return x`<wui-loading-thumbnail radius=${radius * 9}></wui-loading-thumbnail>`;
  }
  async connectFarcaster() {
    if (this.authConnector) {
      try {
        await this.authConnector?.provider.connectFarcaster();
        if (this.socialProvider) {
          StorageUtil.setConnectedSocialProvider(this.socialProvider);
          EventsController.sendEvent({
            type: "track",
            event: "SOCIAL_LOGIN_REQUEST_USER_DATA",
            properties: { provider: this.socialProvider }
          });
        }
        this.loading = true;
        const connectionsByNamespace = ConnectionController.getConnections(this.authConnector.chain);
        const hasConnections = connectionsByNamespace.length > 0;
        await ConnectionController.connectExternal(this.authConnector, this.authConnector.chain);
        const isMultiWalletEnabled = this.remoteFeatures?.multiWallet;
        if (this.socialProvider) {
          EventsController.sendEvent({
            type: "track",
            event: "SOCIAL_LOGIN_SUCCESS",
            properties: { provider: this.socialProvider }
          });
        }
        this.loading = false;
        if (hasConnections && isMultiWalletEnabled) {
          RouterController.replace("ProfileWallets");
          SnackController.showSuccess("New Wallet Added");
        } else {
          ModalController.close();
        }
      } catch (error) {
        if (this.socialProvider) {
          EventsController.sendEvent({
            type: "track",
            event: "SOCIAL_LOGIN_ERROR",
            properties: { provider: this.socialProvider, message: CoreHelperUtil.parseError(error) }
          });
        }
        RouterController.goBack();
        SnackController.showError(error);
      }
    }
  }
  mobileLinkTemplate() {
    return x`<wui-button
      size="md"
      ?loading=${this.loading}
      ?disabled=${!this.uri || this.loading}
      @click=${() => {
      if (this.uri) {
        CoreHelperUtil.openHref(this.uri, "_blank");
      }
    }}
    >
      Open farcaster</wui-button
    >`;
  }
  onRenderProxy() {
    if (!this.ready && this.uri) {
      this.timeout = setTimeout(() => {
        this.ready = true;
      }, 200);
    }
  }
  qrCodeTemplate() {
    if (!this.uri || !this.ready) {
      return null;
    }
    const size = this.getBoundingClientRect().width - 40;
    const qrColor = ThemeController.state.themeVariables["--apkt-qr-color"] ?? ThemeController.state.themeVariables["--w3m-qr-color"];
    return x` <wui-qr-code
      size=${size}
      theme=${ThemeController.state.themeMode}
      uri=${this.uri}
      ?farcaster=${true}
      data-testid="wui-qr-code"
      color=${o(qrColor)}
    ></wui-qr-code>`;
  }
  copyTemplate() {
    const inactive = !this.uri || !this.ready;
    return x`<wui-button
      .disabled=${inactive}
      @click=${this.onCopyUri}
      variant="neutral-secondary"
      size="sm"
      data-testid="copy-wc2-uri"
    >
      <wui-icon size="sm" color="default" slot="iconRight" name="copy"></wui-icon>
      Copy link
    </wui-button>`;
  }
  onCopyUri() {
    try {
      if (this.uri) {
        CoreHelperUtil.copyToClopboard(this.uri);
        SnackController.showSuccess("Link copied");
      }
    } catch {
      SnackController.showError("Failed to copy");
    }
  }
};
W3mConnectingFarcasterView.styles = styles;
__decorate([
  r()
], W3mConnectingFarcasterView.prototype, "socialProvider", void 0);
__decorate([
  r()
], W3mConnectingFarcasterView.prototype, "uri", void 0);
__decorate([
  r()
], W3mConnectingFarcasterView.prototype, "ready", void 0);
__decorate([
  r()
], W3mConnectingFarcasterView.prototype, "loading", void 0);
__decorate([
  r()
], W3mConnectingFarcasterView.prototype, "remoteFeatures", void 0);
W3mConnectingFarcasterView = __decorate([
  customElement("w3m-connecting-farcaster-view")
], W3mConnectingFarcasterView);
export {
  W3mConnectSocialsView,
  W3mConnectingFarcasterView,
  W3mConnectingSocialView
};
