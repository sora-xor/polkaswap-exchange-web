import { t as i, q as i$1, x, O as OptionsController, R as RouterController, a as ChainController, S as SnackController, K as SafeLocalStorage, L as SafeLocalStorageKeys } from "./walletconnect-BVoLvI4P.js";
import { n, c as customElement, r, U as UiHelperUtil } from "./index-5878y4Sm.js";
import { W as W3mEmailOtpWidget } from "./index-KkFMdxFL.js";
import { ReownAuthentication } from "./features-CpdawzlM.js";
import "./index-73GArslZ.js";
import "./index-Bz3_ZVag.js";
import "./index-DAKl5XGv.js";
const styles$2 = i`
  .email-sufixes {
    display: flex;
    flex-direction: row;
    gap: var(--wui-spacing-3xs);
    overflow-x: auto;
    max-width: 100%;
    margin-top: var(--wui-spacing-s);
    margin-bottom: calc(-1 * var(--wui-spacing-m));
    padding-bottom: var(--wui-spacing-m);
    margin-left: calc(-1 * var(--wui-spacing-m));
    margin-right: calc(-1 * var(--wui-spacing-m));
    padding-left: var(--wui-spacing-m);
    padding-right: var(--wui-spacing-m);

    &::-webkit-scrollbar {
      display: none;
    }
  }
`;
var __decorate$3 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
const options = [
  "@gmail.com",
  "@outlook.com",
  "@yahoo.com",
  "@hotmail.com",
  "@aol.com",
  "@icloud.com",
  "@zoho.com"
];
let W3mEmailSuffixesWidget = class W3mEmailSuffixesWidget2 extends i$1 {
  constructor() {
    super(...arguments);
    this.email = "";
  }
  render() {
    const items = options.filter(this.filter.bind(this)).map(this.item.bind(this));
    if (items.length === 0) {
      return null;
    }
    return x`<div class="email-sufixes">${items}</div>`;
  }
  filter(option) {
    if (!this.email) {
      return false;
    }
    const pieces = this.email.split("@");
    if (pieces.length < 2) {
      return true;
    }
    const host = pieces.pop();
    return option.includes(host) && option !== `@${host}`;
  }
  item(option) {
    const handleClick = () => {
      const pieces = this.email.split("@");
      if (pieces.length > 1) {
        pieces.pop();
      }
      const newEmail = pieces[0] + option;
      this.dispatchEvent(new CustomEvent("change", {
        detail: newEmail,
        bubbles: true,
        composed: true
      }));
    };
    return x`<wui-button variant="neutral" size="sm" @click=${handleClick}
      >${option}</wui-button
    >`;
  }
};
W3mEmailSuffixesWidget.styles = [styles$2];
__decorate$3([
  n()
], W3mEmailSuffixesWidget.prototype, "email", void 0);
W3mEmailSuffixesWidget = __decorate$3([
  customElement("w3m-email-suffixes-widget")
], W3mEmailSuffixesWidget);
const styles$1 = i`
  .recent-emails {
    display: flex;
    flex-direction: column;
    padding: var(--wui-spacing-s) 0;
    border-top: 1px solid var(--wui-color-gray-glass-005);
    border-bottom: 1px solid var(--wui-color-gray-glass-005);
  }

  .recent-emails-heading {
    margin-bottom: var(--wui-spacing-s);
  }

  .recent-emails-list-item {
    --wui-color-gray-glass-002: transparent;
  }
`;
var __decorate$2 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mRecentEmailsWidget = class W3mRecentEmailsWidget2 extends i$1 {
  constructor() {
    super(...arguments);
    this.emails = [];
  }
  render() {
    if (this.emails.length === 0) {
      return null;
    }
    return x`<div class="recent-emails">
      <wui-text variant="micro-600" color="fg-200" class="recent-emails-heading"
        >Recently used emails</wui-text
      >
      ${this.emails.map(this.item.bind(this))}
    </div>`;
  }
  item(email) {
    const handleClick = () => {
      this.dispatchEvent(new CustomEvent("select", {
        detail: email,
        bubbles: true,
        composed: true
      }));
    };
    return x`<wui-list-item
      @click=${handleClick}
      ?chevron=${true}
      icon="mail"
      iconVariant="overlay"
      class="recent-emails-list-item"
    >
      <wui-text variant="paragraph-500" color="fg-100">${email}</wui-text>
    </wui-list-item>`;
  }
};
W3mRecentEmailsWidget.styles = [styles$1];
__decorate$2([
  n()
], W3mRecentEmailsWidget.prototype, "emails", void 0);
W3mRecentEmailsWidget = __decorate$2([
  customElement("w3m-recent-emails-widget")
], W3mRecentEmailsWidget);
var __decorate$1 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mDataCaptureOtpConfirmView = class W3mDataCaptureOtpConfirmView2 extends W3mEmailOtpWidget {
  constructor() {
    super(...arguments);
    this.siwx = OptionsController.state.siwx;
    this.onOtpSubmit = async (otp) => {
      await this.siwx.confirmEmailOtp({ code: otp });
      RouterController.replace("SIWXSignMessage");
    };
    this.onOtpResend = async (email) => {
      const accountData = ChainController.getAccountData();
      if (!accountData?.caipAddress) {
        throw new Error("No account data found");
      }
      await this.siwx.requestEmailOtp({
        email,
        account: accountData.caipAddress
      });
    };
  }
  connectedCallback() {
    if (!this.siwx || !(this.siwx instanceof ReownAuthentication)) {
      SnackController.showError("ReownAuthentication is not initialized.");
    }
    super.connectedCallback();
  }
  shouldSubmitOnOtpChange() {
    return this.otp.length === W3mEmailOtpWidget.OTP_LENGTH;
  }
};
__decorate$1([
  r()
], W3mDataCaptureOtpConfirmView.prototype, "siwx", void 0);
W3mDataCaptureOtpConfirmView = __decorate$1([
  customElement("w3m-data-capture-otp-confirm-view")
], W3mDataCaptureOtpConfirmView);
const styles = i`
  .hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--wui-spacing-3xs);

    transition-property: margin, height;
    transition-duration: var(--wui-duration-md);
    transition-timing-function: var(--wui-ease-out-power-1);
    margin-top: -100px;

    &[data-state='loading'] {
      margin-top: 0px;
    }

    position: relative;
    &:after {
      content: '';
      position: absolute;
      bottom: 0;
      height: 252px;
      width: 360px;
      background: radial-gradient(
        96.11% 53.95% at 50% 51.28%,
        transparent 0%,
        color-mix(in srgb, var(--wui-color-bg-100) 5%, transparent) 49%,
        color-mix(in srgb, var(--wui-color-bg-100) 65%, transparent) 99.43%
      );
    }
  }

  .hero-main-icon {
    width: 176px;
    transition-property: background-color;
    transition-duration: var(--wui-duration-lg);
    transition-timing-function: var(--wui-ease-out-power-1);

    &[data-state='loading'] {
      width: 56px;
    }
  }

  .hero-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: var(--wui-spacing-3xs);
    flex-wrap: nowrap;
    min-width: fit-content;

    &:nth-child(1) {
      transform: translateX(-30px);
    }

    &:nth-child(2) {
      transform: translateX(30px);
    }

    &:nth-child(4) {
      transform: translateX(40px);
    }

    transition-property: height;
    transition-duration: var(--wui-duration-md);
    transition-timing-function: var(--wui-ease-out-power-1);
    height: 68px;

    &[data-state='loading'] {
      height: 0px;
    }
  }

  .hero-row-icon {
    opacity: 0.1;
    transition-property: opacity;
    transition-duration: var(--wui-duration-md);
    transition-timing-function: var(--wui-ease-out-power-1);

    &[data-state='loading'] {
      opacity: 0;
    }
  }
`;
var __decorate = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mDataCaptureView = class W3mDataCaptureView2 extends i$1 {
  constructor() {
    super(...arguments);
    this.email = RouterController.state.data?.email ?? ChainController.getAccountData()?.user?.email ?? "";
    this.address = ChainController.getAccountData()?.address ?? "";
    this.loading = false;
    this.appName = OptionsController.state.metadata?.name ?? "AppKit";
    this.siwx = OptionsController.state.siwx;
    this.isRequired = Array.isArray(OptionsController.state.remoteFeatures?.emailCapture) && OptionsController.state.remoteFeatures?.emailCapture.includes("required");
    this.recentEmails = this.getRecentEmails();
  }
  connectedCallback() {
    if (!this.siwx || !(this.siwx instanceof ReownAuthentication)) {
      SnackController.showError("ReownAuthentication is not initialized. Please contact support.");
    }
    super.connectedCallback();
  }
  firstUpdated() {
    this.loading = false;
    this.recentEmails = this.getRecentEmails();
    if (this.email) {
      this.onSubmit();
    }
  }
  render() {
    return x`
      <wui-flex flexDirection="column" .padding=${["3xs", "m", "m", "m"]} gap="l">
        ${this.hero()} ${this.paragraph()} ${this.emailInput()} ${this.recentEmailsWidget()}
        ${this.footerActions()}
      </wui-flex>
    `;
  }
  hero() {
    return x`
      <div class="hero" data-state=${this.loading ? "loading" : "default"}>
        ${this.heroRow(["id", "mail", "wallet", "x", "solana", "qrCode"])}
        ${this.heroRow(["mail", "farcaster", "wallet", "discord", "mobile", "qrCode"])}
        <div class="hero-row">
          ${this.heroIcon("github")} ${this.heroIcon("bank")}
          <wui-icon-box
            size="xl"
            iconSize="xxl"
            iconColor=${this.loading ? "fg-100" : "accent-100"}
            backgroundColor=${this.loading ? "fg-100" : "accent-100"}
            icon=${this.loading ? "id" : "user"}
            isOpaque
            class="hero-main-icon"
            data-state=${this.loading ? "loading" : "default"}
          >
          </wui-icon-box>
          ${this.heroIcon("id")} ${this.heroIcon("card")}
        </div>
        ${this.heroRow(["google", "id", "github", "verify", "apple", "mobile"])}
      </div>
    `;
  }
  heroRow(icons) {
    return x`
      <div class="hero-row" data-state=${this.loading ? "loading" : "default"}>
        ${icons.map(this.heroIcon.bind(this))}
      </div>
    `;
  }
  heroIcon(icon) {
    return x`
      <wui-icon-box
        size="xl"
        iconSize="xxl"
        iconColor="fg-100"
        backgroundColor="fg-100"
        icon=${icon}
        data-state=${this.loading ? "loading" : "default"}
        isOpaque
        class="hero-row-icon"
      >
      </wui-icon-box>
    `;
  }
  paragraph() {
    if (this.loading) {
      return x`
        <wui-text variant="paragraph-400" color="fg-200" align="center"
          >We are verifying your account with email
          <wui-text variant="paragraph-600" color="accent-100">${this.email}</wui-text> and address
          <wui-text variant="paragraph-600" color="fg-100">
            ${UiHelperUtil.getTruncateString({
        string: this.address,
        charsEnd: 4,
        charsStart: 4,
        truncate: "middle"
      })} </wui-text
          >, please wait a moment.</wui-text
        >
      `;
    }
    if (this.isRequired) {
      return x`
        <wui-text variant="paragraph-600" color="fg-100" align="center">
          ${this.appName} requires your email for authentication.
        </wui-text>
      `;
    }
    return x`
      <wui-flex flexDirection="column" gap="xs" alignItems="center">
        <wui-text variant="paragraph-600" color="fg-100" align="center" size>
          ${this.appName} would like to collect your email.
        </wui-text>

        <wui-text variant="small-400" color="fg-200" align="center">
          Don't worry, it's optional&mdash;you can skip this step.
        </wui-text>
      </wui-flex>
    `;
  }
  emailInput() {
    if (this.loading) {
      return null;
    }
    const keydownHandler = (event) => {
      if (event.key === "Enter") {
        this.onSubmit();
      }
    };
    const changeHandler = (event) => {
      this.email = event.detail;
    };
    return x`
      <wui-flex flexDirection="column">
        <wui-email-input
          .value=${this.email}
          .disabled=${this.loading}
          @inputChange=${changeHandler}
          @keydown=${keydownHandler}
        ></wui-email-input>

        <w3m-email-suffixes-widget
          .email=${this.email}
          @change=${changeHandler}
        ></w3m-email-suffixes-widget>
      </wui-flex>
    `;
  }
  recentEmailsWidget() {
    if (this.recentEmails.length === 0 || this.loading) {
      return null;
    }
    const recentEmailSelectHandler = (event) => {
      this.email = event.detail;
      this.onSubmit();
    };
    return x`
      <w3m-recent-emails-widget
        .emails=${this.recentEmails}
        @select=${recentEmailSelectHandler}
      ></w3m-recent-emails-widget>
    `;
  }
  footerActions() {
    return x`
      <wui-flex flexDirection="row" fullWidth gap="s">
        ${this.isRequired ? null : x`<wui-button
              size="lg"
              variant="neutral"
              fullWidth
              .disabled=${this.loading}
              @click=${this.onSkip.bind(this)}
              >Skip this step</wui-button
            >`}

        <wui-button
          size="lg"
          variant="main"
          type="submit"
          fullWidth
          .disabled=${!this.email || !this.isValidEmail(this.email)}
          .loading=${this.loading}
          @click=${this.onSubmit.bind(this)}
        >
          Continue
        </wui-button>
      </wui-flex>
    `;
  }
  async onSubmit() {
    if (!(this.siwx instanceof ReownAuthentication)) {
      SnackController.showError("ReownAuthentication is not initialized. Please contact support.");
      return;
    }
    const account = ChainController.getActiveCaipAddress();
    if (!account) {
      throw new Error("Account is not connected.");
    }
    if (!this.isValidEmail(this.email)) {
      SnackController.showError("Please provide a valid email.");
      return;
    }
    try {
      this.loading = true;
      const otp = await this.siwx.requestEmailOtp({
        email: this.email,
        account
      });
      this.pushRecentEmail(this.email);
      if (otp.uuid === null) {
        RouterController.replace("SIWXSignMessage");
      } else {
        RouterController.replace("DataCaptureOtpConfirm", { email: this.email });
      }
    } catch (error) {
      SnackController.showError("Failed to send email OTP");
      this.loading = false;
    }
  }
  onSkip() {
    RouterController.replace("SIWXSignMessage");
  }
  getRecentEmails() {
    const recentEmails = SafeLocalStorage.getItem(SafeLocalStorageKeys.RECENT_EMAILS);
    const parsedEmails = recentEmails ? recentEmails.split(",") : [];
    return parsedEmails.filter(this.isValidEmail.bind(this)).slice(0, 3);
  }
  pushRecentEmail(email) {
    const recentEmails = this.getRecentEmails();
    const newEmails = Array.from(/* @__PURE__ */ new Set([email, ...recentEmails])).slice(0, 3);
    SafeLocalStorage.setItem(SafeLocalStorageKeys.RECENT_EMAILS, newEmails.join(","));
  }
  isValidEmail(email) {
    return /^\S+@\S+\.\S+$/u.test(email);
  }
};
W3mDataCaptureView.styles = [styles];
__decorate([
  r()
], W3mDataCaptureView.prototype, "email", void 0);
__decorate([
  r()
], W3mDataCaptureView.prototype, "address", void 0);
__decorate([
  r()
], W3mDataCaptureView.prototype, "loading", void 0);
__decorate([
  r()
], W3mDataCaptureView.prototype, "appName", void 0);
__decorate([
  r()
], W3mDataCaptureView.prototype, "siwx", void 0);
__decorate([
  r()
], W3mDataCaptureView.prototype, "isRequired", void 0);
__decorate([
  r()
], W3mDataCaptureView.prototype, "recentEmails", void 0);
W3mDataCaptureView = __decorate([
  customElement("w3m-data-capture-view")
], W3mDataCaptureView);
export {
  W3mDataCaptureOtpConfirmView,
  W3mDataCaptureView,
  W3mEmailSuffixesWidget,
  W3mRecentEmailsWidget
};
