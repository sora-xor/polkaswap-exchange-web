<template>
  <div>
    <p class="sora-card__number-input-desc">{{ t('card.verificationCodeText') }}</p>
    <s-button
      class="country-container"
      autofocus
      type="tertiary"
      size="big"
      :disabled="phoneInputDisabled"
      @click="openSelectCountryDialog"
    >
      <span class="country-container__label s-flex">
        <span class="country-container__text s-flex">
          <template v-if="selectedCountry">
            <span class="country-container__flag">{{ selectedCountry.flag }}</span>
            <span>{{ selectedCountry.translatedName }}</span>
          </template>
          <template v-else>
            <div class="country-container__flag country-container__flag--empty" />
            <span>{{ t('card.selectCountryText') }}</span>
          </template>
        </span>
        <s-icon class="country-container__icon" name="arrows-circle-chevron-bottom-24" size="18" />
      </span>
    </s-button>
    <div class="sora-card__number-input">
      <div class="phone-container s-flex">
        <s-input class="phone-code" disabled :placeholder="t('card.code')" :value="selectedCountry?.dialCode || ''" />
        <s-input
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
    <select-country-dialog :visible.sync="showSelectCountryDialog" @select="handleSelectCountry" />
  </div>
</template>

<script lang="ts">
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch, Ref } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { action, getter, mutation, state } from '@/store/decorators';
import { UserInfo, VerificationStatus, CardUIViews, AttemptCounter, CountryInfo } from '@/types/card';

const MIN_PHONE_LENGTH_WITH_CODE = 8;
const OTP_CODE_LENGTH = 6;
const RESEND_INTERVAL = 59;

@Component({
  components: {
    SelectCountryDialog: lazyComponent(Components.SelectCountryDialog),
  },
})
export default class Phone extends Mixins(TranslationMixin, mixins.LoadingMixin, mixins.NotificationMixin) {
  @state.soraCard.authLogin private authLogin!: any;
  @state.soraCard.userInfo userInfo!: UserInfo;
  @state.soraCard.attemptCounter private attemptCounter!: AttemptCounter;
  @state.soraCard.wantsToPassKycAgain private wantsToPassKycAgain!: boolean;

  @getter.soraCard.currentStatus private currentStatus!: VerificationStatus;
  @getter.soraCard.isEuroBalanceEnough private isEuroBalanceEnough!: boolean;

  @mutation.soraCard.setWillToPassKycAgain private setWillToPassKycAgain!: (boolean) => void;
  @mutation.soraCard.setReferenceNumber setReferenceNumber!: (refNumber: Nullable<string>) => void;

  @action.soraCard.getUserStatus private getUserStatus!: AsyncFnWithoutArgs;
  @action.soraCard.getUserIban private getUserIban!: AsyncFnWithoutArgs;
  @action.soraCard.initPayWingsAuthSdk private initPayWingsAuthSdk!: AsyncFnWithoutArgs;
  @action.soraCard.getUserKycAttempt private getUserKycAttempt!: AsyncFnWithoutArgs;

  @Ref('otp') private readonly inputOtp!: HTMLInputElement;

  private smsCountDown = '';
  private smsResendCount = RESEND_INTERVAL;

  verificationCode = '';
  smsSent = false;
  sendOtpBtnLoading = false;
  notFoundPhoneWhenApplied = false;
  showSelectCountryDialog = false;
  selectedCountry: Nullable<CountryInfo> = null;
  phoneNumber = '';

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
    if (this.phoneNumber[0] === '0') {
      this.phoneNumber = this.phoneNumber.slice(1); // remove 1st zero
    }
    this.authLogin
      .PayWingsSendOtp(`${this.selectedCountry?.dialCode}${this.phoneNumber}`, 'Your verification code is: @Otp')
      .catch((error) => {
        console.error('[SoraCard]: Auth', error);
      });

    this.startSmsCountDown();
  }

  openSelectCountryDialog(): void {
    this.showSelectCountryDialog = true;
  }

  handleSelectCountry(country: CountryInfo): void {
    this.selectedCountry = country;
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
    const code = this.selectedCountry?.dialCode;
    return !!(code && this.phoneNumber && `${code}${this.phoneNumber}`.length >= MIN_PHONE_LENGTH_WITH_CODE);
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
    return this.t('card.noSpamText');
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

        this.setReferenceNumber(null);
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

.country-container {
  $max-text-width: 370px - $inner-spacing-mini;

  width: 100%;
  margin-bottom: $inner-spacing-medium;

  &:not(:disabled):hover {
    .country-container__flag--empty {
      background-color: var(--s-color-base-content-secondary);
    }
    .country-container__icon {
      color: var(--s-color-base-content-secondary);
    }
  }

  &:disabled .country-container__icon:hover {
    color: var(--s-color-base-content-tertiary);
    cursor: not-allowed;
  }

  &__label {
    width: 100%;
    align-items: center;
    justify-content: space-between;
  }

  &__flag {
    margin-right: $inner-spacing-mini;
    font-size: 20px;
    &--empty {
      background-color: var(--s-color-base-content-tertiary);
      height: $inner-spacing-small;
      width: $inner-spacing-small;
      border-radius: 50%;
    }
  }

  &__text {
    align-items: center;
    max-width: $max-text-width;
    > :last-child {
      @include text-ellipsis;
    }
  }

  &__icon {
    margin-left: $inner-spacing-mini;
  }
}
</style>
