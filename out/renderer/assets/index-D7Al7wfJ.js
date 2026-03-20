import { t as i, q as i$1, O as OptionsController, x, b as EventsController, u as getPreferredAccountType, a as ChainController, W as W3mFrameRpcConstants, R as RouterController, n as css } from "./walletconnect-BVoLvI4P.js";
import { c as customElement, r } from "./index-5878y4Sm.js";
import "./index-Bz3_ZVag.js";
import "./index-BH8iPnnC.js";
const styles$1 = i``;
var __decorate$1 = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mOnRampProvidersFooter = class W3mOnRampProvidersFooter2 extends i$1 {
  render() {
    const { termsConditionsUrl, privacyPolicyUrl } = OptionsController.state;
    if (!termsConditionsUrl && !privacyPolicyUrl) {
      return null;
    }
    return x`
      <wui-flex
        .padding=${["4", "3", "3", "3"]}
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        gap="3"
      >
        <wui-text color="secondary" variant="md-regular" align="center">
          We work with the best providers to give you the lowest fees and best support. More options
          coming soon!
        </wui-text>

        ${this.howDoesItWorkTemplate()}
      </wui-flex>
    `;
  }
  howDoesItWorkTemplate() {
    return x` <wui-link @click=${this.onWhatIsBuy.bind(this)}>
      <wui-icon size="xs" color="accent-primary" slot="iconLeft" name="helpCircle"></wui-icon>
      How does it work?
    </wui-link>`;
  }
  onWhatIsBuy() {
    EventsController.sendEvent({
      type: "track",
      event: "SELECT_WHAT_IS_A_BUY",
      properties: {
        isSmartAccount: getPreferredAccountType(ChainController.state.activeChain) === W3mFrameRpcConstants.ACCOUNT_TYPES.SMART_ACCOUNT
      }
    });
    RouterController.push("WhatIsABuy");
  }
};
W3mOnRampProvidersFooter.styles = [styles$1];
W3mOnRampProvidersFooter = __decorate$1([
  customElement("w3m-onramp-providers-footer")
], W3mOnRampProvidersFooter);
const styles = css`
  :host wui-ux-by-reown {
    padding-top: 0;
  }

  :host wui-ux-by-reown.branding-only {
    padding-top: ${({ spacing }) => spacing["3"]};
  }

  a {
    text-decoration: none;
    color: ${({ tokens }) => tokens.core.textAccentPrimary};
    font-weight: 500;
  }
`;
var __decorate = function(decorators, target, key, desc) {
  var c = arguments.length, r2 = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r2 = (c < 3 ? d(r2) : c > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let W3mLegalFooter = class W3mLegalFooter2 extends i$1 {
  constructor() {
    super();
    this.unsubscribe = [];
    this.remoteFeatures = OptionsController.state.remoteFeatures;
    this.unsubscribe.push(OptionsController.subscribeKey("remoteFeatures", (val) => this.remoteFeatures = val));
  }
  disconnectedCallback() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
  }
  render() {
    const { termsConditionsUrl, privacyPolicyUrl } = OptionsController.state;
    const legalCheckbox = OptionsController.state.features?.legalCheckbox;
    const showOnlyBranding = !termsConditionsUrl && !privacyPolicyUrl || legalCheckbox;
    if (showOnlyBranding) {
      return x`
        <wui-flex flexDirection="column"> ${this.reownBrandingTemplate(true)} </wui-flex>
      `;
    }
    return x`
      <wui-flex flexDirection="column">
        <wui-flex .padding=${["4", "3", "3", "3"]} justifyContent="center">
          <wui-text color="secondary" variant="md-regular" align="center">
            By connecting your wallet, you agree to our <br />
            ${this.termsTemplate()} ${this.andTemplate()} ${this.privacyTemplate()}
          </wui-text>
        </wui-flex>
        ${this.reownBrandingTemplate()}
      </wui-flex>
    `;
  }
  andTemplate() {
    const { termsConditionsUrl, privacyPolicyUrl } = OptionsController.state;
    return termsConditionsUrl && privacyPolicyUrl ? "and" : "";
  }
  termsTemplate() {
    const { termsConditionsUrl } = OptionsController.state;
    if (!termsConditionsUrl) {
      return null;
    }
    return x`<a href=${termsConditionsUrl} target="_blank" rel="noopener noreferrer"
      >Terms of Service</a
    >`;
  }
  privacyTemplate() {
    const { privacyPolicyUrl } = OptionsController.state;
    if (!privacyPolicyUrl) {
      return null;
    }
    return x`<a href=${privacyPolicyUrl} target="_blank" rel="noopener noreferrer"
      >Privacy Policy</a
    >`;
  }
  reownBrandingTemplate(showOnlyBranding = false) {
    if (!this.remoteFeatures?.reownBranding) {
      return null;
    }
    if (showOnlyBranding) {
      return x`<wui-ux-by-reown class="branding-only"></wui-ux-by-reown>`;
    }
    return x`<wui-ux-by-reown></wui-ux-by-reown>`;
  }
};
W3mLegalFooter.styles = [styles];
__decorate([
  r()
], W3mLegalFooter.prototype, "remoteFeatures", void 0);
W3mLegalFooter = __decorate([
  customElement("w3m-legal-footer")
], W3mLegalFooter);
