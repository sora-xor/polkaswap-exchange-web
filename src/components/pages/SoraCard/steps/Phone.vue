<template>
  <div>
    <div class="sora-card__number-input">
      <div class="phone-container s-flex">
        <s-input
          ref="code"
          class="phone-code"
          :placeholder="countryCodePlaceholder"
          v-maska="'+###'"
          v-model="countryCode"
          :disabled="phoneInputDisabled"
        />
        <s-input
          ref="phone"
          class="phone-number"
          :placeholder="t('card.phonePlaceholder')"
          v-maska="'############'"
          v-model="phoneNumber"
          :disabled="phoneInputDisabled"
        />
      </div>
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
      ref="otp"
      :placeholder="t('card.otpPlaceholder')"
      v-maska="'######'"
      v-model="verificationCode"
      :disabled="otpInputDisabled"
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
import { mixins, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch, Ref } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { action, getter, mutation, state } from '@/store/decorators';
import { UserInfo, VerificationStatus, CardUIViews, AttemptCounter } from '@/types/card';

const MIN_PHONE_LENGTH_WITH_CODE = 8;
const OTP_CODE_LENGTH = 6;
const RESEND_INTERVAL = 59;

@Component
export default class Phone extends Mixins(TranslationMixin, mixins.LoadingMixin, mixins.NotificationMixin) {
  @state.soraCard.authLogin private authLogin!: any;
  @state.soraCard.userInfo userInfo!: UserInfo;
  @state.soraCard.attemptCounter private attemptCounter!: AttemptCounter;
  @state.soraCard.wantsToPassKycAgain private wantsToPassKycAgain!: boolean;
  @state.wallet.settings.soraNetwork private soraNetwork!: WALLET_CONSTS.SoraNetwork;

  @getter.soraCard.currentStatus private currentStatus!: VerificationStatus;
  @getter.soraCard.isEuroBalanceEnough private isEuroBalanceEnough!: boolean;

  @mutation.soraCard.setWillToPassKycAgain private setWillToPassKycAgain!: (boolean) => void;

  @action.soraCard.getUserStatus private getUserStatus!: AsyncFnWithoutArgs;
  @action.soraCard.getUserIban private getUserIban!: AsyncFnWithoutArgs;
  @action.soraCard.initPayWingsAuthSdk private initPayWingsAuthSdk!: AsyncFnWithoutArgs;
  @action.soraCard.getUserKycAttempt private getUserKycAttempt!: AsyncFnWithoutArgs;

  @Ref('code') private readonly inputCode!: HTMLInputElement;
  @Ref('phone') private readonly inputPhone!: HTMLInputElement;
  @Ref('otp') private readonly inputOtp!: HTMLInputElement;

  private countryCodeInternal = '';
  private phoneNumberInternal = '';
  private smsCountDown = '';
  private smsResendCount = RESEND_INTERVAL;

  verificationCode = '';
  smsSent = false;
  sendOtpBtnLoading = false;
  notFoundPhoneWhenApplied = false;

  @Watch('smsResendCount', { immediate: true })
  private handleSmsCountChange(value: number): void {
    const digit = value.toString().length > 1 ? '' : '0';
    this.smsCountDown = `0:${digit}${value}`;
  }

  get hasFreeAttempts() {
    return this.attemptCounter.hasFreeAttempts;
  }

  verifyCode(): void {
    this.authLogin.PayWingsOtpCredentialVerification(this.verificationCode).catch((error) => {
      this.sendOtpBtnLoading = false;
      this.verificationCode = '';

      this.showAppNotification(this.t('card.infoMessageWrongOtp'), 'error');
      console.error('[SoraCard]: Auth', error);
    });

    this.sendOtpBtnLoading = true;
  }

  sendSms(): void {
    this.authLogin
      .PayWingsSendOtp(`${this.countryCode}${this.phoneNumber}`, 'Your verification code is: @Otp')
      .catch((error) => {
        console.error('[SoraCard]: Auth', error);
      });

    this.startSmsCountDown();
  }

  get countryCode(): string {
    return this.countryCodeInternal;
  }

  set countryCode(value: string) {
    if (value.length > 3) {
      this.inputPhone.focus();
    }
    this.countryCodeInternal = value;
  }

  get phoneNumber(): string {
    return this.phoneNumberInternal;
  }

  set phoneNumber(value: string) {
    if (!value.length) {
      this.inputCode.focus();
    }
    this.phoneNumberInternal = value;
  }

  /** Real example when `countryCode` is empty */
  get countryCodePlaceholder(): string {
    return this.countryCode ? this.t('card.code') : '+44';
  }

  get buttonDisabled() {
    return this.verificationCode.length !== OTP_CODE_LENGTH;
  }

  get otpInputDisabled(): boolean {
    return !this.smsSent || !this.isPhoneNumberValid;
  }

  get buttonText(): string {
    if (this.verificationCode.length !== OTP_CODE_LENGTH) {
      return this.t('card.enterCodeBtn');
    }

    return this.t('card.confirmCodeBtn');
  }

  set buttonText(value) {
    this.buttonText = value;
  }

  get sendSmsButtonText(): string {
    if (this.smsSent) return this.t('card.resendInBtn', { value: this.smsCountDown });
    return this.t('card.sendCodeBtn');
  }

  get isPhoneNumberValid(): boolean {
    const code = this.countryCode.replace('+', '');
    return !!(+code && this.phoneNumber && `${code}${this.phoneNumber}`.length >= MIN_PHONE_LENGTH_WITH_CODE);
  }

  get sendSmsDisabled(): boolean {
    return !this.isPhoneNumberValid || this.smsSent;
  }

  get phoneInputDisabled(): boolean {
    return this.smsSent;
  }

  get phoneInputDescription(): string {
    if (this.smsSent) {
      return this.t('card.phoneInputAfterSendDesc');
    }
    return this.t('card.phoneInputBeforeSendDesc');
  }

  startSmsCountDown(): void {
    const interval = setInterval(() => {
      this.smsResendCount--;

      if (this.smsResendCount < 0) {
        this.smsSent = false;
        this.verificationCode = '';
        this.smsResendCount = RESEND_INTERVAL;
        clearInterval(interval);
      }
    }, 1000);
  }

  async mounted(): Promise<void> {
    await this.$nextTick();
    this.inputCode.focus();

    localStorage.removeItem('PW-Email');

    await this.initPayWingsAuthSdk();

    if (!this.authLogin) return;

    this.authLogin
      .on('SendOtp-Success', () => {
        this.smsSent = true;
        this.$nextTick(() => {
          this.inputOtp.focus();
        });
      })
      .on('MinimalRegistrationReq', () => {
        // 1. User does not have email attached.
        // 2. User does not have KYC passed bound to the entered phone number.

        this.sendOtpBtnLoading = false;
        this.$emit('confirm', CardUIViews.Email);
        this.sendOtpBtnLoading = false;
      })
      .on('Otp-Verification-Success', async () => {
        // 1. User has email and phone attached.
        // 2. KYC result is unknown, needs to be checked.

        await this.getUserStatus();

        if (this.currentStatus === VerificationStatus.Rejected) {
          await this.getUserKycAttempt();

          if (this.wantsToPassKycAgain && this.hasFreeAttempts) {
            this.$emit('confirm', CardUIViews.Kyc);
            this.setWillToPassKycAgain(false);
            return;
          }

          this.$emit('confirm', CardUIViews.KycResult);
          return;
        }

        if (this.currentStatus === VerificationStatus.Accepted) {
          await this.getUserIban();

          if (this.userInfo.iban) {
            this.$emit('confirm', CardUIViews.Dashboard);
          } else {
            this.$emit('confirm', CardUIViews.KycResult);
          }
        }

        if (this.currentStatus === VerificationStatus.Pending) {
          this.$emit('confirm', CardUIViews.KycResult);
          return;
        }

        if (!this.currentStatus) {
          if (this.isEuroBalanceEnough) {
            this.$emit('confirm', CardUIViews.Kyc);
          } else {
            this.$emit('confirm', CardUIViews.Payment);
          }
        }
      })
      .on('Verification-Email-Sent-Success', () => {
        this.sendOtpBtnLoading = false;
        this.$emit('confirm', CardUIViews.Email);
        this.sendOtpBtnLoading = false;
      });
  }
}
</script>

<style lang="scss" scoped>
.sora-card {
  &__number-input {
    position: relative;

    .phone {
      &-code {
        flex: 1;
        border-top-right-radius: 0;
        border-bottom-right-radius: 0;
      }
      &-number {
        flex: 5;
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
        margin-left: 2px;
      }
    }

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
  appearance: textfield;
  -moz-appearance: textfield;
}

input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
}
</style>
