<template>
  <div class="sora-card sora-card-kyc-wrapper">
    <div>
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
import { loadScript, unloadScript } from 'vue-plugin-load-script';
import { Component, Mixins, Prop } from 'vue-property-decorator';
import { v4 as uuidv4 } from 'uuid';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { state } from '@/store/decorators';
import { soraCard } from '@/utils/card';

@Component
export default class KycView extends Mixins(TranslationMixin) {
  @state.wallet.settings.soraNetwork soraNetwork!: WALLET_CONSTS.SoraNetwork;

  @Prop({ default: '', type: String }) readonly accessToken!: string;

  loadingKycView = true;

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

      this.$notify({
        message: 'Something went wrong. Please, start again',
        title: '',
      });
      this.$emit('confirm-kyc', false);
      unloadScript(kycService.sdkURL);
    }
  }

  async mounted(): Promise<void> {
    const { kycService, soraProxy } = soraCard(this.soraNetwork);

    const referenceNumber = await this.getReferenceNumber(soraProxy.referenceNumberEndpoint);

    loadScript(kycService.sdkURL)
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

            this.$notify({
              message: 'Something went wrong. Please, start again',
              title: '',
            });
            this.$emit('confirm-kyc', false);
            unloadScript(kycService.sdkURL);

            // Integrator will be notified if user cancels KYC or something went wrong
            // alert('Something went wrong ' + data.StatusDescription);
          })
          .on('Success', (data) => {
            // Integrator handles UI from this point on on successful kyc
            // alert('Kyc was successfull, integrator takes control of flow from now on')

            this.$emit('confirm-kyc', true);
            unloadScript(kycService.sdkURL);

            // document.getElementById('kyc')!.style.display = 'none';
            // document.getElementById('finish')!.style.display = 'block';
          });
      })
      .catch(() => {
        // Failed to fetch script
      });
    setTimeout(() => {
      this.loadingKycView = false;
    }, 5000);
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
</style>
