<template>
  <div class="sora-card">
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
import { v4 as uuidv4 } from 'uuid';
import { Component, Mixins, Prop } from 'vue-property-decorator';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { mixins, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { clearTokensFromSessionStorage } from '@/utils';

@Component
export default class KycView extends Mixins(TranslationMixin, mixins.LoadingMixin) {
  @Prop({ default: '', type: String }) readonly accessToken!: string;

  loadingKycView = true;

  async getReferenceNumber(): Promise<string> {
    const token = sessionStorage.getItem('access-token');

    const result = await fetch('https://sora-card.sc1.dev.sora2.soramitsu.co.jp/get-reference-number', {
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
  }

  async mounted(): Promise<void> {
    const referenceNumber = await this.getReferenceNumber();

    const accessToken = sessionStorage.getItem('access-token');
    const refreshToken = sessionStorage.getItem('refresh-token');

    loadScript('https://kyc-test.soracard.com/web/v2/webkyc.js')
      .then(() => {
        // @ts-expect-error no-undef
        Paywings.WebKyc.create({
          KycCredentials: {
            Username: 'E7A6CB83-630E-4D24-88C5-18AAF96032A4', // api username
            Password: '75A55B7E-A18F-4498-9092-58C7D6BDB333', // api password
            Domain: 'soracard.com',
            env: WALLET_CONSTS.SoraNetwork.Test, // use Test for test environment and Prod for production
            UnifiedLoginApiKey: '6974528a-ee11-4509-b549-a8d02c1aec0d',
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
            AccessToken: accessToken,
            RefreshToken: refreshToken,
          },
        })
          .on('Error', (data) => {
            console.log('error', data);

            // clearTokensFromSessionStorage();

            this.$notify({
              message: 'Your access token has expired',
              title: '',
            });
            this.$emit('confirm-kyc', false);
            unloadScript('https://kyc-test.soracard.com/web/v2/webkyc.js');

            // Integrator will be notified if user cancels KYC or something went wrong
            // alert('Something went wrong ' + data.StatusDescription);
          })
          .on('Success', (data) => {
            // Integrator handles UI from this point on on successful kyc
            // alert('Kyc was successfull, integrator takes control of flow from now on')
            // console.log('success', data);
            this.$emit('confirm-kyc', true);
            unloadScript('https://kyc-test.soracard.com/web/v2/webkyc.js');

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

<style lang="scss" scoped>
@import 'https://kyc-test.soracard.com/web/v2/webkyc.css';
</style>

<style lang="scss">
#kyc {
  // height: 300px;
}
.sora-card-kyc-view {
  .container {
    // height: 400px;
    margin: 0;
    // padding: 0;
    background-color: transparent;
    width: 100%;
  }

  .PW-form {
    // height: auto;

    .col-12 {
      padding-left: 0px !important;
      padding-right: 0px !important;

      #VideoKycFrame {
        padding-left: 15px !important;
        padding-right: 15px !important;
      }
    }
  }

  .el-scrollbar__wrap {
    border-radius: var(--s-border-radius-medium) !important;
  }
}

.sumsub-logo {
  fill: none;
  color: white !important;
}
</style>
