<template>
  <div>
    <div class="sora-card__number-input">
      <s-input
        placeholder="Phone number"
        type="number"
        v-model="phoneNumber"
        :disabled="phoneInputDisabled"
        class="what"
      ></s-input>
      <s-button
        type="secondary"
        :disabled="sendSmsDisabled"
        class="sora-card__send-sms-btn s-typography-button--large"
        @click="sendSms"
      >
        {{ sendSmsButtonText }}
      </s-button>
    </div>
    <s-input
      tabindex="0"
      placeholder="Verification code"
      v-model="verificationCode"
      :disabled="loading"
      ref="code"
    ></s-input>
    <s-button
      :disabled="buttonDisabled"
      type="primary"
      class="sora-card__btn s-typography-button--large"
      @click="verifyCode"
    >
      <span class="text"> {{ buttonText }}</span>
    </s-button>
  </div>
</template>

<script lang="ts">
import { loadScript } from 'vue-plugin-load-script';
import { Component, Mixins, Prop, Watch } from 'vue-property-decorator';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { mixins } from '@soramitsu/soraneo-wallet-web';

@Component
export default class Phone extends Mixins(TranslationMixin, mixins.LoadingMixin) {
  @Prop({ default: '', type: String }) readonly accessToken!: string;

  phoneNumber = '';
  verificationCode = '';
  smsSent = false;
  smsResendTimer = null;
  smsResendCount = 35;
  smsResendText = '';

  loginApi: any = null;

  @Watch('smsResendCount', { immediate: true })
  private handleSmsCountChange(value: number): void {
    const digit = value.toString().length > 1 ? '' : '0';
    const countDown = `${digit}${value}`;
    this.smsResendText = `RESEND IN 0:${countDown}`;
  }

  verifyCode(): void {
    // TODO: check for length before sending
    const otp = 123456;
    this.loginApi.PayWingsOtpCredentialVerification(otp).catch((error) => {
      console.error(error);
    });
  }

  sendSms(): void {
    const number = '79198591623';
    this.loginApi.PaywingsSendOtp(number, 'Your verification code is: @Otp').catch((error) => {
      console.error(error);
    });

    this.smsSent = true;
    this.startSmsCountDown();

    // TODO: focus code input
    // console.log((this.$refs.code as Vue).$el);
    ((this.$refs.code as Vue).$el as HTMLElement).focus();
  }

  get buttonDisabled() {
    return !this.verificationCode;
  }

  get buttonText(): string {
    if (!this.verificationCode) {
      return 'ENTER THE VERIFICATION CODE';
    }

    return 'CONFIRM SMS CODE';
  }

  get sendSmsButtonText(): string {
    if (this.smsSent) return this.smsResendText;
    return 'SEND SMS CODE';
  }

  get sendSmsDisabled(): boolean {
    return !this.phoneNumber || this.smsSent;
  }

  get phoneInputDisabled(): boolean {
    return this.smsSent;
  }

  startSmsCountDown(): void {
    const interval = setInterval(() => {
      this.smsResendCount--;

      if (this.smsResendCount < -1) {
        this.smsSent = false;
        this.smsResendCount = 30;
        clearInterval(interval);
      }
    }, 1000);
  }

  mounted(): void {
    loadScript('https://auth-test.soracard.com/WebSDK/WebSDK.js')
      .then(() => {
        // @ts-expect-error no undefined
        console.log('Paywings', Paywings);
        // @ts-expect-error no undefined
        this.loginApi = Paywings.UnifiedLogin.create({
          Domain: 'soracard.com',
          UnifiedLoginApiKey: '6974528a-ee11-4509-b549-a8d02c1aec0d',
          env: 'Test',
          AccessTokenTypeID: 1,
          UserTypeID: 2,
          ClientDescription: 'Auth',
        })
          .on('SendOtp-Success', function (data) {
            console.log('it was sent');
          })
          .on('Otp-Verification-Success', function (data) {
            console.log('User is logged in');
            // Tokens are stored in local storage localStorage.getItem('PW-token'); localStorage.getItem('PW-refresh-token');
            /* Minimal registration is required */
          });

        console.log('this.loginApi', this.loginApi);
      })
      .catch(() => {
        // Failed to fetch script
      });

    console.log('this.loginApi', this.loginApi);
  }
}
</script>

<style lang="scss">
.sora-card {
  &__number-input {
    position: relative;
    margin-bottom: 16px;

    .el-button {
      transform: scale(0.75);
    }
  }

  &__btn {
    width: 100%;
  }

  &__send-sms-btn {
    position: absolute;
    right: -10px;
    top: 8px;
    font-size: 16px;
  }
}
</style>
