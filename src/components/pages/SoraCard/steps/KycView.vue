<template>
  <div class="sora-card sora-card-kyc-wrapper">
    <div v-if="!hasCameraAccess" class="camera-permission">
      <s-icon name="camera-16" size="48" class="camera-permission-icon" />
      <h4 class="camera-permission-title">{{ t('browserPermission.title') }}</h4>
      <p class="camera-permission-desc">
        {{ t('browserPermission.desc') }}
      </p>
      <div class="camera-permission-disclaimer">
        <div class="tos__disclaimer">
          <p class="tos__disclaimer-paragraph">
            {{ t('browserPermission.disclaimer') }}
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
import { mutation, state } from '@/store/decorators';
import { CardUIViews } from '@/types/card';
import { waitForSoraNetworkFromEnv } from '@/utils';
import { soraCard, getUpdatedJwtPair } from '@/utils/card';

@Component
export default class KycView extends Mixins(TranslationMixin, mixins.NotificationMixin, mixins.CameraPermissionMixin) {
  @state.wallet.settings.soraNetwork private soraNetwork!: Nullable<WALLET_CONSTS.SoraNetwork>;
  @state.wallet.account.source private source!: WALLET_CONSTS.AppWallet;
  @state.soraCard.referenceNumber private referenceNumber!: Nullable<string>;

  @mutation.soraCard.setReferenceNumber setReferenceNumber!: (refNumber: Nullable<string>) => void;

  @Prop({ default: '', type: String }) readonly accessToken!: string;

  loadingKycView = true;
  btnLoading = false;
  cameraPermission: Nullable<PermissionState> = null;

  async getReferenceNumber(URL: string): Promise<string | undefined> {
    const soraNetwork = this.soraNetwork ?? (await waitForSoraNetworkFromEnv());
    const { kycService } = soraCard(soraNetwork);
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
      console.error('[SoraCard]: Error while getting reference number', data);

      this.showAppNotification(this.t('card.infoMessageTryAgain'));
      this.$emit('confirm', CardUIViews.Start);

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

      if (!mediaDevicesAllowance) return;

      this.cameraPermission = 'granted';
    } catch (error) {
      console.error('[SoraCard]: Camera error.', error);
    } finally {
      this.btnLoading = false;
    }

    this.initKyc();
  }

  get hasCameraAccess(): boolean {
    return this.cameraPermission === 'granted';
  }

  get ISOLanguageName(): string {
    // return ISO 639-1 code format
    if (this.language === 'zh-CN') return 'zh';

    return this.language;
  }

  get forbiddenByBrowser(): boolean {
    return this.cameraPermission === 'denied';
  }

  get btnCameraText(): string {
    if (this.forbiddenByBrowser) return this.t('browserPermission.btnGoToSettings');
    if (this.hasCameraAccess) return this.t('continueText');
    return this.t('browserPermission.btnAllow');
  }

  async initKyc(): Promise<void> {
    const soraNetwork = this.soraNetwork ?? (await waitForSoraNetworkFromEnv());
    this.updateJwtPairByInterval();
    const { kycService, soraProxy } = soraCard(soraNetwork);

    const referenceNumber = this.referenceNumber
      ? this.referenceNumber
      : await this.getReferenceNumber(soraProxy.referenceNumberEndpoint);

    if (referenceNumber) this.setReferenceNumber(referenceNumber);

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
            Language: this.ISOLanguageName || 'en', // supported languages 'en'
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
            this.$emit('confirm', CardUIViews.Start);

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
            this.$emit('confirm', CardUIViews.KycResult);
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
      return;
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
  width: 400px;

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

button#CancelKyc {
  display: none !important;
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
    margin-bottom: $inner-spacing-mini;
  }

  &-desc {
    font-size: 15px;
    font-weight: 300;
    text-align: center;
    margin-bottom: $inner-spacing-mini;
  }

  &-icon {
    color: var(--s-color-status-error);
  }

  &-btn {
    margin-top: $basic-spacing;
    width: 100%;
  }
}
</style>
