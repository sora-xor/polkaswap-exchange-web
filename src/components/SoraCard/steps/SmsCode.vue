<template>
  <div>
    <button @click="embed">Embed layout</button>
    <div>
      <div id="kyc"></div>
      <div id="finish" style="display: none">
        <div class="alert alert-success">Kyc was successfull, sample integrator response displayed here</div>
      </div>
    </div>
  </div>
  <!-- <div>
    <div class="sora-card__no-spam">No spam! Only to secure your account</div>
    <div class="test">
      <s-input
        placeholder="Phone number"
        v-model="phoneNumber"
        :disabled="loading"
        class="what"
        v-cleave="{ date: true, datePattern: ['m'] }"
      ></s-input>
      <s-button
        type="secondary"
        :disabled="sendSmsDisabled"
        class="sora-card__send-sms-btn s-typography-button--large"
        @click="sendSms"
      >
        SEND SMS CODE
      </s-button>
    </div>
    <input
      v-model="phoneNumber"
      class="input-element"
      v-cleave="{ phoneNumber: true, delimiter: ' ', blocks: [2, 3, 3, 4] }"
    />

    <p class="sora-card__input-description">PayWings will send you a verification code</p>
    <s-input placeholder="Verification code" v-model="verificationCode" :disabled="loading"></s-input>
    <s-button type="primary" class="sora-card__btn s-typography-button--large" @click="verifyCode">
      {{ buttonText }}
    </s-button>
  </div> -->
</template>

<script lang="ts">
import { loadScript } from 'vue-plugin-load-script';
import { Component, Mixins, Prop } from 'vue-property-decorator';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { isNumber } from 'lodash';

@Component
export default class SmsCode extends Mixins(TranslationMixin, mixins.LoadingMixin) {
  @Prop({ default: '', type: String }) readonly accessToken!: string;
  phoneNumberString = '';
  verificationCode = '';
  ccMonth = '';
  ccNumber = '';

  verifyCode(): void {
    this.$emit('confirm-sms');
  }

  get phoneNumber(): string {
    if (this.ccNumber.charAt(0) === '+') {
      return this.ccNumber;
    }
    return '+' + this.ccNumber;
  }

  set phoneNumber(value) {
    this.phoneNumber = value;
  }

  sendSms(): void {}

  get buttonText() {
    return 'ENTER THE VERIFICATION CODE';
  }

  get sendSmsDisabled(): boolean {
    return false;
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
        ReferenceID: Math.floor(Math.random() * 10000).toString(),
        MobileNumber: '+79998887755',
        Email: 'haxiyir650@ilusale.com',
      }),
    });

    const data = await result.json();
    return data.ReferenceNumber;
  }

  async embed(): Promise<void> {
    console.log('embed called');
    const referenceNumber = await this.getReferenceNumber();
    console.log('this.accessToken', this.accessToken);
    console.log('referenceNumber', referenceNumber);
    loadScript('https://kyc-test.soracard.com/web/v2/webkyc.js')
      .then(() => {
        // @ts-expect-error no-undef
        Paywings.WebKyc.create({
          KycCredentials: {
            Username: 'E7A6CB83-630E-4D24-88C5-18AAF96032A4', // api username
            Password: '75A55B7E-A18F-4498-9092-58C7D6BDB333', // api password
            EndpointUrl: 'https://kyc-test.soracard.com/mobile',
            env: 'Test', // use Test for test environment and Prod for production
            UnifiedLoginApiKey: '6974528a-ee11-4509-b549-a8d02c1aec0d',
          },
          KycSettings: {
            AppReferenceID: Math.floor(Math.random() * 10000).toString(),
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
            FirstName: 'first',
            MiddleName: 'middle',
            LastName: 'last',
            Email: '', // must be valid email address
            MobileNumber: '', // if value is prefilled must be in valid international format eg. "+386 40 040 040" (without spaces)
            Address1: '',
            Address2: '',
            Address3: '',
            ZipCode: '',
            City: '',
            State: '',
            CountryCode: '', // ISO 3 country code
            AccessToken: this.accessToken,
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
