<template>
  <div>
    <div class="sora-card__number-input">
      <s-input
        ref="number"
        placeholder="Phone number"
        type="number"
        v-model="phoneNumber"
        :disabled="phoneInputDisabled"
      />
      <!-- <input v-mask="['+# (###) ### ## ##']" /> TODO: format number depending on country code-->
      <s-button
        type="secondary"
        :disabled="sendSmsDisabled"
        class="sora-card__send-sms-btn s-typography-button--large"
        @click="sendSms"
      >
        {{ sendSmsButtonText }}
      </s-button>
    </div>
    <div>
      <p class="sora-card__number-input-desc">{{ phoneInputDescription }}</p>
      <s-icon v-if="smsSent" class="sora-card__icon" name="basic-check-mark-24" size="14px" />
    </div>
    <s-input
      ref="codes"
      placeholder="Verification code"
      v-model="verificationCode"
      :disabled="otpInputDisabled"
      maxlength="6"
      type="number"
    />
    <s-button
      :disabled="buttonDisabled"
      type="primary"
      class="sora-card__btn s-typography-button--large"
      @click="verifyCode"
      :loading="sendOtpBtnLoading"
    >
      <span class="text"> {{ buttonText }}</span>
    </s-button>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop, Watch } from 'vue-property-decorator';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { mixins, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { action, getter, state } from '@/store/decorators';
import { VerificationStatus } from '@/types/card';
import { XOR } from '@sora-substrate/util/build/assets/consts';

@Component
export default class Phone extends Mixins(TranslationMixin, mixins.LoadingMixin) {
  @state.soraCard.authLogin authLogin!: any;
  @state.wallet.settings.soraNetwork soraNetwork!: WALLET_CONSTS.SoraNetwork;

  @getter.soraCard.currentStatus private currentStatus!: VerificationStatus;
  @getter.soraCard.isEuroBalanceEnough isEuroBalanceEnough!: boolean;

  @action.soraCard.getUserStatus private getUserStatus!: AsyncFnWithoutArgs;
  @action.soraCard.initPayWingsAuthSdk initPayWingsAuthSdk!: () => Promise<void>;

  @Prop({ default: false, type: Boolean }) readonly userApplied!: boolean;

  phoneNumber = '';
  verificationCode = '';
  smsSent = false;
  smsResendTimer = null;
  smsResendCount = 59;
  smsResendText = '';
  sendOtpBtnLoading = false;
  notPassedKycAndNotHasXorEnough = false;

  loginApi: any = null;

  @Watch('smsResendCount', { immediate: true })
  private handleSmsCountChange(value: number): void {
    const digit = value.toString().length > 1 ? '' : '0';
    const countDown = `${digit}${value}`;
    this.smsResendText = `RESEND IN 0:${countDown}`;
  }

  verifyCode(): void {
    // TODO: check for length before sending

    this.authLogin.PayWingsOtpCredentialVerification(this.verificationCode).catch((error) => {
      this.sendOtpBtnLoading = false;
      this.verificationCode = '';
      this.$notify({
        message: 'Code is incorrect',
        type: 'error',
        title: '',
      });
      console.error(error);
    });

    this.sendOtpBtnLoading = true;
  }

  sendSms(): void {
    this.authLogin.PayWingsSendOtp('+' + this.phoneNumber, 'Your verification code is: @Otp').catch((error) => {
      console.error(error);
    });

    this.startSmsCountDown();
  }

  get buttonDisabled() {
    return !this.verificationCode || this.notPassedKycAndNotHasXorEnough;
  }

  get otpInputDisabled(): boolean {
    return !this.smsSent || !this.phoneNumber;
  }

  get buttonText(): string {
    if (!this.verificationCode) {
      return 'ENTER THE VERIFICATION CODE';
    }

    if (this.notPassedKycAndNotHasXorEnough) {
      return this.t('insufficientBalanceText', { tokenSymbol: XOR.symbol });
    }

    return 'CONFIRM SMS CODE';
  }

  set buttonText(value) {
    this.buttonText = value;
  }

  get sendSmsButtonText(): string {
    if (this.smsSent) return this.smsResendText;
    return 'SEND SMS CODE';
  }

  get isMainnet(): boolean {
    return this.soraNetwork === WALLET_CONSTS.SoraNetwork.Prod;
  }

  get sendSmsDisabled(): boolean {
    return !this.phoneNumber || this.smsSent;
  }

  get phoneInputDisabled(): boolean {
    return this.smsSent;
  }

  get phoneInputDescription(): string {
    if (this.smsSent) {
      return this.isMainnet
        ? 'We’ve sent you an SMS code. Check your messages!'
        : 'Your code for testing purposes: 123456';
    }
    return 'We’ll send you an SMS code.';
  }

  startSmsCountDown(): void {
    const interval = setInterval(() => {
      this.smsResendCount--;

      if (this.smsResendCount < 0) {
        this.smsSent = false;
        this.smsResendCount = 30;
        clearInterval(interval);
      }
    }, 1000);
  }

  async mounted(): Promise<void> {
    (this.$refs.number as HTMLInputElement).focus();

    await this.initPayWingsAuthSdk();

    if (!this.authLogin) return;

    this.authLogin
      .on('SendOtp-Success', () => {
        this.smsSent = true;

        // (this.$refs.codes as HTMLInputElement).focus();
      })
      .on('MinimalRegistrationReq', () => {
        this.sendOtpBtnLoading = false;

        if (this.userApplied) {
          this.$notify({
            title: '',
            message: 'KYC process has not been finished.',
            type: 'info',
          });
        }

        if (!this.isEuroBalanceEnough) {
          this.notPassedKycAndNotHasXorEnough = true;

          return;
        }

        const state = {
          goToEmail: true,
          startKyc: false,
          showBanner: false,
        };

        this.$emit('confirm', state);
        this.sendOtpBtnLoading = false;
      })
      .on('Otp-Verification-Success', async () => {
        await this.getUserStatus();

        if (!this.currentStatus) {
          if (this.userApplied) {
            this.$notify({
              title: '',
              message: 'KYC process has not been finished.',
              type: 'info',
            });
          }

          if (!this.isEuroBalanceEnough) {
            this.notPassedKycAndNotHasXorEnough = true;
            this.sendOtpBtnLoading = false;

            return;
          }

          const state = {
            goToEmail: false,
            startKyc: true,
            showBanner: false,
          };

          this.$emit('confirm', state);
        } else {
          const state = {
            goToEmail: false,
            startKyc: false,
            showBanner: true,
          };

          this.$emit('confirm', state);
        }
      });
  }
}
</script>

<style lang="scss">
.sora-card {
  &__number-input {
    position: relative;

    .el-button {
      transform: scale(0.75);
    }

    &-desc {
      display: inline-block;
      color: var(--s-color-base-content-primary);
      font-size: var(--s-font-size-extra-small);
      font-weight: 300;
      line-height: var(--s-line-height-base);
      padding: var(--s-basic-spacing) var(--s-basic-spacing) calc(var(--s-basic-spacing) * 2)
        calc(var(--s-basic-spacing) * 1.5);
    }
  }

  &__icon {
    color: var(--s-color-status-success);
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

input[type='number'] {
  -moz-appearance: textfield;
}

input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
}
</style>
