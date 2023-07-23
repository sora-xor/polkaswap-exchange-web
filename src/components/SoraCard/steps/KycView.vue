<template>
  <div class="sora-card sora-card-kyc-wrapper">
    <div v-if="!hasCameraAccess" class="camera-permission">
      <s-icon name="camera-16" size="48" class="camera-permission-icon" />
      <h4 class="camera-permission-title">Allow camera access in browser settings</h4>
      <p class="camera-permission-desc">
        To ensure the authenticity of documents and validate user identity for KYC verification, access to your device's
        camera is required.
      </p>
      <div class="camera-permission-disclaimer">
        <div class="tos__disclaimer">
          <p class="tos__disclaimer-paragraph">
            Camera access is required for real-time document capture to prevent fraud.
          </p>
          <div class="tos__disclaimer-warning icon">
            <s-icon name="notifications-alert-triangle-24" size="28px" />
          </div>
        </div>
      </div>
      <s-button
        class="camera-permission-btn"
        type="primary"
        :disabled="forbiddenByBrowser"
        :loading="btnLoading"
        @click="requestCameraAccess"
      >
        {{ btnCameraText }}
      </s-button>
    </div>
    <div v-else>
      <div class="sora-card-kyc-view" v-loading="loadingKycView">
        <s-scrollbar>
          <div id="kyc"></div>
          <div id="finish" style="display: none">
            <div class="alert alert-success">Kyc was successfull, sample integrator response displayed here</div>
          </div>
        </s-scrollbar>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { WALLET_CONSTS, mixins, ScriptLoader } from '@soramitsu/soraneo-wallet-web';
import { v4 as uuidv4 } from 'uuid';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { state } from '@/store/decorators';
import { soraCard, getUpdatedJwtPair } from '@/utils/card';

type WindowInjectedWeb3 = typeof window & {
  injectedWeb3?: {
    'fearless-wallet'?: {
      enable: (origin: string) => Promise<void>;
      saveSoraCardToken?: (token: string) => Promise<void>;
      version: string;
    };
  };
};

@Component
export default class KycView extends Mixins(TranslationMixin, mixins.NotificationMixin, mixins.CameraPermissionMixin) {
  @state.wallet.settings.soraNetwork private soraNetwork!: WALLET_CONSTS.SoraNetwork;
  @state.wallet.account.source private source!: WALLET_CONSTS.AppWallet;

  @Prop({ default: '', type: String }) readonly accessToken!: string;

  loadingKycView = true;
  btnLoading = false;
  cameraPermission: Nullable<PermissionState> = null;

  async getReferenceNumber(URL: string): Promise<string | undefined> {
    const { kycService } = soraCard(this.soraNetwork);
    const token = localStorage.getItem('PW-token');

    try {
      const result = await fetch(URL, {
        method: 'POST',
        body: JSON.stringify({
          ReferenceID: uuidv4(),
          MobileNumber: '',
          Email: '',
          AddressChanged: false,
          DocumentChanged: false,
          IbanTypeID: null,
          CardTypeID: null,
          AdditionalData: '',
        }),
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await result.json();

      return data.ReferenceNumber;
    } catch (data) {
      console.error('[SoraCard]: Error while initiating KYC', data);

      this.showAppNotification(this.t('card.infoMessageTryAgain'));
      this.$emit('confirm-kyc', false);

      ScriptLoader.unload(kycService.sdkURL, false);
    }
  }

  async updateJwtPairByInterval(): Promise<void> {
    const setNewJwtPair = async () => {
      const refreshToken = localStorage.getItem('PW-refresh-token');
      if (refreshToken) await getUpdatedJwtPair(refreshToken);
    };

    setNewJwtPair();
    setInterval(setNewJwtPair, 60_000 * 19.85); // 10 seconds less before token expiration
  }

  async requestCameraAccess(): Promise<void> {
    this.btnLoading = true;

    try {
      const mediaDevicesAllowance = await this.checkMediaDevicesAllowance('SoraCard');

      this.btnLoading = false;

      if (!mediaDevicesAllowance) return;

      this.cameraPermission = 'granted';
    } catch (error) {
      console.error('[SoraCard]: Camera error.', error);
    }

    this.initKyc();
  }

  get hasCameraAccess(): boolean {
    return this.cameraPermission === 'granted';
  }

  get forbiddenByBrowser(): boolean {
    return this.cameraPermission === 'denied';
  }

  get btnCameraText(): string {
    if (this.forbiddenByBrowser) return 'go to browser settings';
    if (this.hasCameraAccess) return 'Continue';
    return 'Allow access';
  }

  async initKyc(): Promise<void> {
    this.updateJwtPairByInterval();

    const { kycService, soraProxy } = soraCard(this.soraNetwork);

    const referenceNumber = await this.getReferenceNumber(soraProxy.referenceNumberEndpoint);

    await ScriptLoader.unload(kycService.sdkURL, false).catch(() => {});

    ScriptLoader.load(kycService.sdkURL)
      .then(() => {
        // @ts-expect-error no-undef
        Paywings.WebKyc.create({
          KycCredentials: {
            Username: kycService.username, // api username
            Password: kycService.pass, // api password
            Domain: 'soracard.com',
            env: kycService.env, // use Test for test environment and Prod for production
            UnifiedLoginApiKey: kycService.unifiedApiKey,
          },
          KycSettings: {
            AppReferenceID: uuidv4(),
            Language: 'en', // supported languages 'en'
            ReferenceNumber: referenceNumber,
            ElementId: '#kyc', // id of element in which web kyc will be injected
            Logo: '',
            WelcomeHidden: false, // false show welcome screen, true skip welcome screen
            WelcomeTitle: '',
            DocumentCheckWindowHeight: '50vh',
            DocumentCheckWindowWidth: '100%',
            HideLoader: true,
          },
          KycUserData: {
            // Sample data without prefilled values
            FirstName: '',
            MiddleName: '',
            LastName: '',
            Email: '', // must be valid email address
            MobileNumber: '', // if value is prefilled must be in valid international format eg. "+386 40 040 040" (without spaces)
            Address1: '',
            Address2: '',
            Address3: '',
            ZipCode: '',
            City: '',
            State: '',
            CountryCode: '', // ISO 3 country code
          },
          UserCredentials: {
            AccessToken: localStorage.getItem('PW-token'),
            RefreshToken: localStorage.getItem('PW-refresh-token'),
          },
        })
          .on('Error', (data) => {
            console.error('[SoraCard]: Error while initiating KYC', data);

            this.showAppNotification(this.t('card.infoMessageTryAgain'));
            this.$emit('confirm-kyc', false);

            ScriptLoader.unload(kycService.sdkURL);

            // Integrator will be notified if user cancels KYC or something went wrong
            // alert('Something went wrong ' + data.StatusDescription);
          })
          .on('Success', async (data) => {
            // Integrator handles UI from this point on on successful kyc
            // alert('Kyc was successfull, integrator takes control of flow from now on')

            const refreshToken = localStorage.getItem('PW-refresh-token');
            if (this.source === WALLET_CONSTS.AppWallet.FearlessWallet && refreshToken) {
              await (window as WindowInjectedWeb3).injectedWeb3?.['fearless-wallet']?.saveSoraCardToken?.(refreshToken);
            }
            this.$emit('confirm-kyc', true);
            ScriptLoader.unload(kycService.sdkURL);

            // document.getElementById('kyc')!.style.display = 'none';
            // document.getElementById('finish')!.style.display = 'block';
          });
      })
      .catch((error) => {
        // Failed to fetch script
        console.error('[SoraCard]: Error while fetching script', error);
      });
    setTimeout(() => {
      this.loadingKycView = false;
    }, 5_000);
  }

  async mounted(): Promise<void> {
    try {
      const { state } = await navigator.permissions.query({ name: 'camera' } as any);
      this.cameraPermission = state;

      if (!this.hasCameraAccess) return;
    } catch (error) {
      console.error('[SoraCard]: Camera error.', error);
    }

    this.initKyc();
  }
}
</script>

<style lang="scss">
.sora-card-kyc-wrapper {
  @import 'https://kyc-test.soracard.com/web/v2/webkyc.css';

  .container {
    padding: 0;
  }
}

.sora-card-kyc-view {
  height: 800px;

  .el-scrollbar {
    height: 800px;
  }

  .container {
    margin: 0;
  }

  .el-scrollbar__wrap {
    border-radius: var(--s-border-radius-medium) !important;
  }
}

#VideoKycFrame {
  iframe {
    background-color: #fff;
  }
}

section.content {
  min-height: 800px;
}

.camera-permission {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  &-title {
    font-weight: 600;
    font-size: 28px;
    text-align: center;
    margin-bottom: 8px;
  }

  &-desc {
    font-size: 15px;
    font-weight: 300;
    text-align: center;
    margin-bottom: 8px;
  }

  &-icon {
    color: #f754a3;
  }

  &-btn {
    margin-top: 16px;
    width: 100%;
  }
}

.tos {
  &__disclaimer {
    width: 100%;
    background-color: var(--s-color-base-background);
    border-radius: var(--s-border-radius-small);
    box-shadow: var(--s-shadow-dialog);
    padding: 20px $basic-spacing;
    margin-bottom: $basic-spacing;
    position: relative;

    &-paragraph {
      margin-bottom: calc(var(--s-basic-spacing) / 2);
      margin-right: 5%;
      font-weight: 600;
      font-size: 17px;
    }

    &-warning.icon {
      position: absolute;
      background-color: #479aef;
      border: 2.25257px solid #f7f3f4;
      box-shadow: var(--s-shadow-element-pressed);
      top: 20px;
      right: 12px;
      border-radius: 50%;
      color: #fff;
      width: 46px;
      height: 46px;

      .s-icon-notifications-alert-triangle-24 {
        display: block;
        color: #fff;
        margin-top: 5px;
        margin-left: 7px;
      }
    }
  }
}
</style>
