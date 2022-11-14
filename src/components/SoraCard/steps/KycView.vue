<template>
  <div>
    <div>
      <div id="kyc"></div>
      <div id="finish" style="display: none">
        <div class="alert alert-success">Kyc was successfull, sample integrator response displayed here</div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { loadScript } from 'vue-plugin-load-script';
import { uuid } from 'uuidv4';
import { Component, Mixins, Prop } from 'vue-property-decorator';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { mixins } from '@soramitsu/soraneo-wallet-web';

@Component
export default class KycView extends Mixins(TranslationMixin, mixins.LoadingMixin) {
  @Prop({ default: '', type: String }) readonly accessToken!: string;

  verifyCode(): void {
    this.$emit('confirm-sms');
  }

  async getReferenceNumber(): Promise<string> {
    const result = await fetch('https://kyc-test.soracard.com/Whitelabel/GetReferenceNumber', {
      method: 'POST',
      headers: {
        Authorization:
          'Basic NEVGMURBNEMtRjAxMS00NkMyLUI5ODAtMDZFOEY5RDc5MUE5OjUxMEEzRjVELTU5OEItNDY5MC05MTJGLTk1MzMyNDE4NTBBOQ==',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ReferenceID: 'faf',
      }),
    });

    console.log('result', result);

    const data = await result.json();
    console.log('data', data);
    return data.ReferenceNumber;
  }

  async mounted(): Promise<void> {
    console.log('embed called');
    const referenceNumber = await this.getReferenceNumber();
    // const accessToken = this.accessToken;
    // console.log('this.accessToken', this.accessToken);
    console.log('referenceNumber', referenceNumber);

    const accessToken = sessionStorage.getItem('access-token');
    const refreshToken = sessionStorage.getItem('refresh-token');

    console.log('accessToken', accessToken);
    console.log('refreshToken', refreshToken);

    loadScript('https://kyc-test.soracard.com/web/v2/webkyc.js')
      .then(() => {
        // @ts-expect-error no-undef
        Paywings.WebKyc.create({
          KycCredentials: {
            Username: 'E7A6CB83-630E-4D24-88C5-18AAF96032A4', // api username
            Password: '75A55B7E-A18F-4498-9092-58C7D6BDB333', // api password
            Domain: 'soracard.com',
            env: 'Test', // use Test for test environment and Prod for production
            UnifiedLoginApiKey: '6974528a-ee11-4509-b549-a8d02c1aec0d',
          },
          KycSettings: {
            AppReferenceID: uuid(), // uuid-4
            Language: 'en', // supported languages 'en'
            ReferenceNumber: referenceNumber,
            ElementId: '#kyc', // id of element in which web kyc will be injected
            Logo: '',
            WelcomeHidden: false, // false show welcome screen, true skip welcome screen
            WelcomeTitle: '',
            DocumentCheckWindowHeight: '50vh',
            DocumentCheckWindowWidth: '100%',
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
          .on('Error', function (data) {
            console.log('error', data);
            // Integrator will be notified if user cancels KYC or something went wrong
            alert('Something went wrong ' + data.StatusDescription);
          })
          .on('Success', function (data) {
            // Integrator handles UI from this point on on successful kyc
            // alert('Kyc was successfull, integrator takes control of flow from now on')
            document.getElementById('webkyc')!.style.display = 'none';
            document.getElementById('finish')!.style.display = 'block';
            console.log('success', data);
          });
      })
      .catch(() => {
        // Failed to fetch script
      });
  }
}
</script>

<style lang="scss" scoped>
@import 'https://kyc-test.soracard.com/web/v2/webkyc.css';
</style>

<style lang="scss">
.test {
  position: relative;

  .el-button {
    transform: scale(0.75);
  }
}
.sora-card__send-sms-btn {
  position: absolute;
  right: -10px;
  top: 8px;
  font-size: 16px;
}
</style>
