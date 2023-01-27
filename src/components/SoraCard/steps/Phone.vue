<template>
  <div>
    <div class="sora-card__number-input">
      <s-input placeholder="Phone number" v-model="phoneNumber" :disabled="phoneInputDisabled" class="what"></s-input>
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

  @Watch('smsResendCount', { immediate: true })
  private handleSmsCountChange(value: number): void {
    const digit = value.toString().length > 1 ? '' : '0';
    const countDown = `${digit}${value}`;
    this.smsResendText = `RESEND IN 0:${countDown}`;
  }

  verifyCode(): void {}

  sendSms(): void {
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
        MobileNumber: '+79999999992',
        Email: 'norig53938@ilusale.com',
      }),
    });

    const data = await result.json();
    return data.ReferenceNumber;
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
