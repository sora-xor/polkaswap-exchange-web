import { a as ChainController, m as ConnectionController, O as OptionsController, b as EventsController, M as ModalController, R as RouterController, S as SnackController, c as CoreHelperUtil, n as css, q as i, l as ConnectorController, x, t as i$1, Q as ConstantsUtil, C as ConstantsUtil$1 } from "./walletconnect-BVoLvI4P.js";
import { c as customElement, r } from "./index-5878y4Sm.js";
import { W as W3mEmailOtpWidget } from "./index-KkFMdxFL.js";
import "./index-Cm7UDlkl.js";
import "./index-Bz3_ZVag.js";
import { e, n } from "./ref-j6LTZZuR.js";
import "./index-Bag94m_F.js";
import "./index-DMZ0VmVF.js";
import "./index-73GArslZ.js";
import "./index-DAKl5XGv.js";
import "./if-defined-DpCpmSxP.js";
import "./index-Oesj6-8K.js";
var __decorate$5 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mEmailVerifyOtpView = class W3mEmailVerifyOtpView2 extends W3mEmailOtpWidget {
  constructor() {
    super(...arguments);
    this.onOtpSubmit = async (otp) => {
      try {
        if (this.authConnector) {
          const namespace = ChainController.state.activeChain;
          const connectionsByNamespace = ConnectionController.getConnections(namespace);
          const isMultiWalletEnabled = OptionsController.state.remoteFeatures?.multiWallet;
          const hasConnections = connectionsByNamespace.length > 0;
          await this.authConnector.provider.connectOtp({ otp });
          EventsController.sendEvent({ type: "track", event: "EMAIL_VERIFICATION_CODE_PASS" });
          if (namespace) {
            await ConnectionController.connectExternal(this.authConnector, namespace);
          } else {
            throw new Error("Active chain is not set on ChainController");
          }
          if (OptionsController.state.remoteFeatures?.emailCapture) {
            return;
          }
          if (OptionsController.state.siwx) {
            ModalController.close();
            return;
          }
          if (hasConnections && isMultiWalletEnabled) {
            RouterController.replace("ProfileWallets");
            SnackController.showSuccess("New Wallet Added");
            return;
          }
          ModalController.close();
        }
      } catch (error) {
        EventsController.sendEvent({
          type: "track",
          event: "EMAIL_VERIFICATION_CODE_FAIL",
          properties: { message: CoreHelperUtil.parseError(error) }
        });
        throw error;
      }
    };
    this.onOtpResend = async (email) => {
      if (this.authConnector) {
        await this.authConnector.provider.connectEmail({ email });
        EventsController.sendEvent({ type: "track", event: "EMAIL_VERIFICATION_CODE_SENT" });
      }
    };
  }
};
W3mEmailVerifyOtpView = __decorate$5([
  customElement("w3m-email-verify-otp-view")
], W3mEmailVerifyOtpView);
const styles$1 = css`
  wui-icon-box {
    height: ${({ spacing }) => spacing["16"]};
    width: ${({ spacing }) => spacing["16"]};
  }
`;
var __decorate$4 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mEmailVerifyDeviceView = class W3mEmailVerifyDeviceView2 extends i {
  constructor() {
    super();
    this.email = RouterController.state.data?.email;
    this.authConnector = ConnectorController.getAuthConnector();
    this.loading = false;
    this.listenForDeviceApproval();
  }
  render() {
    if (!this.email) {
      throw new Error("w3m-email-verify-device-view: No email provided");
    }
    if (!this.authConnector) {
      throw new Error("w3m-email-verify-device-view: No auth connector provided");
    }
    return x`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        .padding=${["6", "3", "6", "3"]}
        gap="4"
      >
        <wui-icon-box size="xl" color="accent-primary" icon="sealCheck"></wui-icon-box>

        <wui-flex flexDirection="column" alignItems="center" gap="3">
          <wui-flex flexDirection="column" alignItems="center">
            <wui-text variant="md-regular" color="primary">
              Approve the login link we sent to
            </wui-text>
            <wui-text variant="md-regular" color="primary"><b>${this.email}</b></wui-text>
          </wui-flex>

          <wui-text variant="sm-regular" color="secondary" align="center">
            The code expires in 20 minutes
          </wui-text>

          <wui-flex alignItems="center" id="w3m-resend-section" gap="2">
            <wui-text variant="sm-regular" color="primary" align="center">
              Didn't receive it?
            </wui-text>
            <wui-link @click=${this.onResendCode.bind(this)} .disabled=${this.loading}>
              Resend email
            </wui-link>
          </wui-flex>
        </wui-flex>
      </wui-flex>
    `;
  }
  async listenForDeviceApproval() {
    if (this.authConnector) {
      try {
        await this.authConnector.provider.connectDevice();
        EventsController.sendEvent({ type: "track", event: "DEVICE_REGISTERED_FOR_EMAIL" });
        EventsController.sendEvent({ type: "track", event: "EMAIL_VERIFICATION_CODE_SENT" });
        RouterController.replace("EmailVerifyOtp", { email: this.email });
      } catch (error) {
        RouterController.goBack();
      }
    }
  }
  async onResendCode() {
    try {
      if (!this.loading) {
        if (!this.authConnector || !this.email) {
          throw new Error("w3m-email-login-widget: Unable to resend email");
        }
        this.loading = true;
        await this.authConnector.provider.connectEmail({ email: this.email });
        this.listenForDeviceApproval();
        SnackController.showSuccess("Code email resent");
      }
    } catch (error) {
      SnackController.showError(error);
    } finally {
      this.loading = false;
    }
  }
};
W3mEmailVerifyDeviceView.styles = styles$1;
__decorate$4([
  r()
], W3mEmailVerifyDeviceView.prototype, "loading", void 0);
W3mEmailVerifyDeviceView = __decorate$4([
  customElement("w3m-email-verify-device-view")
], W3mEmailVerifyDeviceView);
const styles = i$1`
  wui-email-input {
    width: 100%;
  }

  form {
    width: 100%;
    display: block;
    position: relative;
  }
`;
var __decorate$3 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mUpdateEmailWalletView = class W3mUpdateEmailWalletView2 extends i {
  constructor() {
    super(...arguments);
    this.formRef = e();
    this.initialEmail = RouterController.state.data?.email ?? "";
    this.redirectView = RouterController.state.data?.redirectView;
    this.email = "";
    this.loading = false;
  }
  firstUpdated() {
    this.formRef.value?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        this.onSubmitEmail(event);
      }
    });
  }
  render() {
    return x`
      <wui-flex flexDirection="column" padding="4" gap="4">
        <form ${n(this.formRef)} @submit=${this.onSubmitEmail.bind(this)}>
          <wui-email-input
            value=${this.initialEmail}
            .disabled=${this.loading}
            @inputChange=${this.onEmailInputChange.bind(this)}
          >
          </wui-email-input>
          <input type="submit" hidden />
        </form>
        ${this.buttonsTemplate()}
      </wui-flex>
    `;
  }
  onEmailInputChange(event) {
    this.email = event.detail;
  }
  async onSubmitEmail(event) {
    try {
      if (this.loading) {
        return;
      }
      this.loading = true;
      event.preventDefault();
      const authConnector = ConnectorController.getAuthConnector();
      if (!authConnector) {
        throw new Error("w3m-update-email-wallet: Auth connector not found");
      }
      const response = await authConnector.provider.updateEmail({ email: this.email });
      EventsController.sendEvent({ type: "track", event: "EMAIL_EDIT" });
      if (response.action === "VERIFY_SECONDARY_OTP") {
        RouterController.push("UpdateEmailSecondaryOtp", {
          email: this.initialEmail,
          newEmail: this.email,
          redirectView: this.redirectView
        });
      } else {
        RouterController.push("UpdateEmailPrimaryOtp", {
          email: this.initialEmail,
          newEmail: this.email,
          redirectView: this.redirectView
        });
      }
    } catch (error) {
      SnackController.showError(error);
      this.loading = false;
    }
  }
  buttonsTemplate() {
    const showSubmit = !this.loading && this.email.length > 3 && this.email !== this.initialEmail;
    if (!this.redirectView) {
      return x`
        <wui-button
          size="md"
          variant="accent-primary"
          fullWidth
          @click=${this.onSubmitEmail.bind(this)}
          .disabled=${!showSubmit}
          .loading=${this.loading}
        >
          Save
        </wui-button>
      `;
    }
    return x`
      <wui-flex gap="3">
        <wui-button size="md" variant="neutral" fullWidth @click=${RouterController.goBack}>
          Cancel
        </wui-button>

        <wui-button
          size="md"
          variant="accent-primary"
          fullWidth
          @click=${this.onSubmitEmail.bind(this)}
          .disabled=${!showSubmit}
          .loading=${this.loading}
        >
          Save
        </wui-button>
      </wui-flex>
    `;
  }
};
W3mUpdateEmailWalletView.styles = styles;
__decorate$3([
  r()
], W3mUpdateEmailWalletView.prototype, "email", void 0);
__decorate$3([
  r()
], W3mUpdateEmailWalletView.prototype, "loading", void 0);
W3mUpdateEmailWalletView = __decorate$3([
  customElement("w3m-update-email-wallet-view")
], W3mUpdateEmailWalletView);
var __decorate$2 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mUpdateEmailPrimaryOtpView = class W3mUpdateEmailPrimaryOtpView2 extends W3mEmailOtpWidget {
  constructor() {
    super();
    this.email = RouterController.state.data?.email;
    this.onOtpSubmit = async (otp) => {
      try {
        if (this.authConnector) {
          await this.authConnector.provider.updateEmailPrimaryOtp({ otp });
          EventsController.sendEvent({ type: "track", event: "EMAIL_VERIFICATION_CODE_PASS" });
          RouterController.replace("UpdateEmailSecondaryOtp", RouterController.state.data);
        }
      } catch (error) {
        EventsController.sendEvent({
          type: "track",
          event: "EMAIL_VERIFICATION_CODE_FAIL",
          properties: { message: CoreHelperUtil.parseError(error) }
        });
        throw error;
      }
    };
    this.onStartOver = () => {
      RouterController.replace("UpdateEmailWallet", RouterController.state.data);
    };
  }
};
W3mUpdateEmailPrimaryOtpView = __decorate$2([
  customElement("w3m-update-email-primary-otp-view")
], W3mUpdateEmailPrimaryOtpView);
var __decorate$1 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mUpdateEmailSecondaryOtpView = class W3mUpdateEmailSecondaryOtpView2 extends W3mEmailOtpWidget {
  constructor() {
    super();
    this.email = RouterController.state.data?.newEmail;
    this.redirectView = RouterController.state.data?.redirectView;
    this.onOtpSubmit = async (otp) => {
      try {
        if (this.authConnector) {
          await this.authConnector.provider.updateEmailSecondaryOtp({ otp });
          EventsController.sendEvent({ type: "track", event: "EMAIL_VERIFICATION_CODE_PASS" });
          if (this.redirectView) {
            RouterController.reset(this.redirectView);
          }
        }
      } catch (error) {
        EventsController.sendEvent({
          type: "track",
          event: "EMAIL_VERIFICATION_CODE_FAIL",
          properties: { message: CoreHelperUtil.parseError(error) }
        });
        throw error;
      }
    };
    this.onStartOver = () => {
      RouterController.replace("UpdateEmailWallet", RouterController.state.data);
    };
  }
};
W3mUpdateEmailSecondaryOtpView = __decorate$1([
  customElement("w3m-update-email-secondary-otp-view")
], W3mUpdateEmailSecondaryOtpView);
var __decorate = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mEmailLoginView = class W3mEmailLoginView2 extends i {
  constructor() {
    super();
    this.authConnector = ConnectorController.getAuthConnector();
    this.isEmailEnabled = OptionsController.state.remoteFeatures?.email;
    this.isAuthEnabled = this.checkIfAuthEnabled(ConnectorController.state.connectors);
    this.connectors = ConnectorController.state.connectors;
    ConnectorController.subscribeKey("connectors", (val) => {
      this.connectors = val;
      this.isAuthEnabled = this.checkIfAuthEnabled(this.connectors);
    });
  }
  render() {
    if (!this.isEmailEnabled) {
      throw new Error("w3m-email-login-view: Email is not enabled");
    }
    if (!this.isAuthEnabled) {
      throw new Error("w3m-email-login-view: No auth connector provided");
    }
    return x`<wui-flex flexDirection="column" .padding=${["1", "3", "3", "3"]} gap="4">
      <w3m-email-login-widget></w3m-email-login-widget>
    </wui-flex> `;
  }
  checkIfAuthEnabled(connectors) {
    const namespacesWithAuthConnector = connectors.filter((c) => c.type === ConstantsUtil.CONNECTOR_TYPE_AUTH).map((i2) => i2.chain);
    const authSupportedNamespaces = ConstantsUtil$1.AUTH_CONNECTOR_SUPPORTED_CHAINS;
    return authSupportedNamespaces.some((ns) => namespacesWithAuthConnector.includes(ns));
  }
};
__decorate([
  r()
], W3mEmailLoginView.prototype, "connectors", void 0);
W3mEmailLoginView = __decorate([
  customElement("w3m-email-login-view")
], W3mEmailLoginView);
export {
  W3mEmailLoginView,
  W3mEmailOtpWidget,
  W3mEmailVerifyDeviceView,
  W3mEmailVerifyOtpView,
  W3mUpdateEmailPrimaryOtpView,
  W3mUpdateEmailSecondaryOtpView,
  W3mUpdateEmailWalletView
};
