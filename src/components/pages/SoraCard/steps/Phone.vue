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
          <span v-if="selectedCountry" class="country-container__selection s-flex">
            <span class="country-container__flag">{{ selectedCountry.flag }}</span>
            <span>{{ selectedCountry.translatedName }}</span>
          </span>
          <span v-else class="country-container__selection s-flex">
            <span class="country-container__flag country-container__flag--empty"></span>
            <span>{{ t('card.selectCountryText') }}</span>
          </span>
        </span>
        <s-icon class="country-container__icon" name="arrows-circle-chevron-bottom-24" size="18"></s-icon>
      </span>
    </s-button>
    <div class="sora-card__number-input">
      <div class="phone-container s-flex">
        <s-input
          class="phone-code"
          disabled
          :placeholder="t('card.code')"
          :value="selectedCountry?.dialCode || ''"
        ></s-input>
        <s-input
          class="phone-number"
          :placeholder="t('card.phonePlaceholder')"
          v-maska="'############'"
          v-model="phoneNumber"
          :disabled="phoneInputDisabled"
        ></s-input>
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
      <s-icon v-if="smsSent" class="sora-card__icon" name="basic-check-mark-24" size="14px"></s-icon>
    </div>
    <s-input
      ref="inputOtp"
      :placeholder="t('card.otpPlaceholder')"
      v-maska="'######'"
      v-model="verificationCode"
      :disabled="otpInputDisabled"
    ></s-input>
    <s-button
      :disabled="buttonDisabled"
      type="primary"
      class="sora-card__btn s-typography-button--large"
      @click="verifyCode"
      :loading="sendOtpBtnLoading"
    >
      <span class="text">{{ buttonText }}</span>
    </s-button>
    <SelectCountryDialog v-model:visible="showSelectCountryDialog" @select="handleSelectCountry"></SelectCountryDialog>
  </div>
</template>

<script setup lang="ts">
import { nextTick, computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { useNotification } from '@/composables/useNotification';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import store from '@/store';
import type { Nullable } from '@/types/common';
import { AttemptCounter, CardUIViews, CountryInfo, UserInfo, VerificationStatus } from '@/types/card';

const MIN_PHONE_LENGTH_WITH_CODE = 8;
const OTP_CODE_LENGTH = 6;
const RESEND_INTERVAL = 59;

const SelectCountryDialog = lazyComponent(Components.SelectCountryDialog);

const emit = defineEmits<{
  (event: 'confirm', view: CardUIViews): void;
}>();

const { t } = useTranslation();
const { showAppNotification } = useNotification();

const authLogin = computed<any>(() => store.state.soraCard.authLogin);
const userInfo = computed<UserInfo>(() => store.state.soraCard.userInfo as UserInfo);
const attemptCounter = computed<AttemptCounter>(() => store.state.soraCard.attemptCounter as AttemptCounter);
const wantsToPassKycAgain = computed<boolean>(() => store.state.soraCard.wantsToPassKycAgain as boolean);
const currentStatus = computed<Nullable<VerificationStatus>>(
  () => (store.getters.soraCard?.currentStatus as VerificationStatus) ?? null
);
const isEuroBalanceEnough = computed<boolean>(() => Boolean(store.getters.soraCard?.isEuroBalanceEnough));

const setWillToPassKycAgain = (value: boolean) => store.commit.soraCard.setWillToPassKycAgain(value);
const setReferenceNumber = (value: Nullable<string>) => store.commit.soraCard.setReferenceNumber(value);

const getUserStatus = () => store.dispatch.soraCard.getUserStatus();
const getUserIban = () => store.dispatch.soraCard.getUserIban();
const initPayWingsAuthSdk = () => store.dispatch.soraCard.initPayWingsAuthSdk();
const getUserKycAttempt = () => store.dispatch.soraCard.getUserKycAttempt();

const verificationCode = ref('');
const smsSent = ref(false);
const sendOtpBtnLoading = ref(false);
const showSelectCountryDialog = ref(false);
const selectedCountry = ref<Nullable<CountryInfo>>(null);
const phoneNumber = ref('');
const smsResendCount = ref(RESEND_INTERVAL);
const smsTimerId = ref<ReturnType<typeof setInterval> | null>(null);
const inputOtp = ref<HTMLInputElement | null>(null);
const listenersAttachedFor = ref<any>(null);

const hasFreeAttempts = computed(() => Boolean(attemptCounter.value?.hasFreeAttempts));

const smsCountDown = computed(() => {
  const value = smsResendCount.value;
  const digit = value.toString().length > 1 ? '' : '0';
  return `0:${digit}${value}`;
});

const isPhoneNumberValid = computed(() => {
  const code = selectedCountry.value?.dialCode ?? '';
  if (!code) return false;
  let number = phoneNumber.value ?? '';
  if (number.startsWith('0')) {
    number = number.slice(1);
  }
  const totalLength = `${code}${number}`.replace(/\D/g, '').length;
  return totalLength >= MIN_PHONE_LENGTH_WITH_CODE;
});

const sendSmsButtonText = computed(() =>
  smsSent.value ? t('card.resendInBtn', { value: smsCountDown.value }) : t('card.sendCodeBtn')
);

const buttonDisabled = computed(() => verificationCode.value.length !== OTP_CODE_LENGTH);
const otpInputDisabled = computed(() => !smsSent.value || !isPhoneNumberValid.value);
const sendSmsDisabled = computed(() => !isPhoneNumberValid.value || smsSent.value);
const phoneInputDisabled = computed(() => smsSent.value);
const phoneInputDescription = computed(() =>
  smsSent.value ? t('card.phoneInputAfterSendDesc') : t('card.noSpamText')
);

const buttonText = computed(() => {
  if (verificationCode.value.length !== OTP_CODE_LENGTH) {
    return t('card.enterCodeBtn');
  }
  return t('card.confirmCodeBtn');
});

const openSelectCountryDialog = () => {
  showSelectCountryDialog.value = true;
};

const handleSelectCountry = (country: CountryInfo) => {
  selectedCountry.value = country;
};

const startSmsCountDown = () => {
  if (smsTimerId.value) clearInterval(smsTimerId.value);
  smsResendCount.value = RESEND_INTERVAL;

  smsTimerId.value = setInterval(() => {
    smsResendCount.value -= 1;

    if (smsResendCount.value < 0) {
      smsSent.value = false;
      verificationCode.value = '';
      smsResendCount.value = RESEND_INTERVAL;
      if (smsTimerId.value) {
        clearInterval(smsTimerId.value);
        smsTimerId.value = null;
      }
    }
  }, 1000);
};

const sendSms = () => {
  const login = authLogin.value;
  if (!login) return;

  let number = phoneNumber.value ?? '';
  if (number.startsWith('0')) {
    number = number.slice(1);
  }
  phoneNumber.value = number;

  login
    .PayWingsSendOtp(`${selectedCountry.value?.dialCode ?? ''}${number}`, 'Your verification code is: @Otp')
    .catch((error: unknown) => {
      console.error('[SoraCard]: Auth', error);
    });

  startSmsCountDown();
};

const verifyCode = () => {
  const login = authLogin.value;
  if (!login) return;

  login.PayWingsOtpCredentialVerification(verificationCode.value).catch((error: unknown) => {
    sendOtpBtnLoading.value = false;
    verificationCode.value = '';
    showAppNotification(t('card.infoMessageWrongOtp'), 'error');
    console.error('[SoraCard]: Auth', error);
  });

  sendOtpBtnLoading.value = true;
};

const registerAuthListeners = (login: any) => {
  if (!login?.on || listenersAttachedFor.value === login) return;
  listenersAttachedFor.value = login;

  login
    .on('SendOtp-Success', () => {
      smsSent.value = true;
      nextTick(() => {
        inputOtp.value?.focus();
      });
    })
    .on('MinimalRegistrationReq', () => {
      setReferenceNumber(null);
      sendOtpBtnLoading.value = false;
      emit('confirm', CardUIViews.Email);
    })
    .on('Otp-Verification-Success', async () => {
      sendOtpBtnLoading.value = false;
      await getUserStatus();

      if (currentStatus.value === VerificationStatus.Rejected) {
        await getUserKycAttempt();

        if (wantsToPassKycAgain.value && hasFreeAttempts.value) {
          emit('confirm', CardUIViews.Kyc);
          setWillToPassKycAgain(false);
          return;
        }

        emit('confirm', CardUIViews.KycResult);
        return;
      }

      if (currentStatus.value === VerificationStatus.Accepted) {
        await getUserIban();

        if (userInfo.value?.iban) {
          emit('confirm', CardUIViews.Dashboard);
        } else {
          emit('confirm', CardUIViews.KycResult);
        }
        return;
      }

      if (currentStatus.value === VerificationStatus.Pending) {
        emit('confirm', CardUIViews.KycResult);
        return;
      }

      if (!currentStatus.value) {
        if (isEuroBalanceEnough.value) {
          emit('confirm', CardUIViews.Kyc);
        } else {
          emit('confirm', CardUIViews.Payment);
        }
      }
    })
    .on('Verification-Email-Sent-Success', () => {
      sendOtpBtnLoading.value = false;
      emit('confirm', CardUIViews.Email);
    });
};

watch(
  authLogin,
  (login) => {
    if (login) {
      registerAuthListeners(login);
    }
  },
  { immediate: true }
);

onMounted(async () => {
  await nextTick();
  localStorage.removeItem('PW-Email');
  await initPayWingsAuthSdk();

  if (authLogin.value) {
    registerAuthListeners(authLogin.value);
  }
});

onBeforeUnmount(() => {
  if (smsTimerId.value) {
    clearInterval(smsTimerId.value);
    smsTimerId.value = null;
  }
});
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
