<template>
  <div class="sora-card">
    <s-input
      maxlength="320"
      :placeholder="t('card.emailPlaceholder')"
      v-model="email"
      :disabled="loading"
      type="email"
    ></s-input>
    <p :class="computedClassEmail">{{ emailInputDescription }}</p>
    <template v-if="emailSent">
      <s-icon name="basic-check-mark-24" size="16px"></s-icon>
      <p v-if="emailSent" class="sora-card__email-input-description">{{ t('card.emailSpamReminder') }}</p>
    </template>
    <div v-if="showNameInputs">
      <s-input
        class="sora-card__input-name"
        maxlength="50"
        :placeholder="t('card.firstNamePlaceholder')"
        v-model="firstName"
        :disabled="loading"
      ></s-input>
      <s-input
        maxlength="50"
        :placeholder="t('card.lastNamePlaceholder')"
        v-model="lastName"
        :disabled="loading"
      ></s-input>
      <p class="sora-card__name-input-description">{{ t('card.personalNameInputDesc') }}</p>
    </div>
    <s-button
      type="primary"
      :disabled="sendBtnDisabled"
      class="sora-card__btn s-typography-button--large"
      @click="handleSendEmail"
    >
      <span class="text">
        {{ buttonText }}
      </span>
    </s-button>
  </div>
</template>

<script setup lang="ts">
import EmailValidator from 'email-validator';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { useLoading } from '@/composables/useLoading';
import store from '@/store';
import { CardUIViews } from '@/types/card';

const RESEND_INTERVAL = 59;

const { t } = useTranslation();
const { loading } = useLoading();

const emit = defineEmits<{
  (event: 'confirm', view: CardUIViews): void;
}>();

const authLogin = computed<any>(() => store.state.soraCard.authLogin);
const isEuroBalanceEnough = computed<boolean>(() => store.getters.soraCard?.isEuroBalanceEnough ?? false);

const prefilledEmail = ref<string>('undefined');
const unconfirmedEmail = ref<string>('');
const emailSentFirstTime = ref(false);
const emailResendCount = ref(RESEND_INTERVAL);

const firstName = ref('');
const lastName = ref('');
const email = ref('');
const emailSent = ref(false);

const timerId = ref<ReturnType<typeof setInterval> | null>(null);
const listenersAttached = ref(false);

const emailCountDown = computed(() => {
  const value = emailResendCount.value;
  const padding = value > 9 ? '' : '0';
  return `00:${padding}${value}`;
});

const emailInputDescription = computed(() =>
  emailSent.value ? t('card.emailInputAfterSendDesc') : t('card.emailInputBeforeSendDesc')
);

const computedClassEmail = computed(() => {
  const base = ['sora-card__email-input-description'];
  if (emailSent.value) base.push('sora-card__email-input-description--sent');
  return base.join(' ');
});

const buttonText = computed(() => {
  if (emailSent.value && emailCountDown.value) {
    return t('card.resendInBtn', { value: emailCountDown.value });
  }
  return t('card.sendEmailLinkBtn');
});

const isPrefilledEmailValid = computed(() => {
  if (prefilledEmail.value !== 'undefined' || !!prefilledEmail.value) {
    return EmailValidator.validate(prefilledEmail.value);
  }
  return false;
});

const isEmailMismatch = computed(() => {
  if (!unconfirmedEmail.value) return false;
  return unconfirmedEmail.value !== email.value;
});

const sendBtnDisabled = computed(() => {
  if (emailSent.value) return true;

  if (isPrefilledEmailValid.value) {
    return !EmailValidator.validate(email.value);
  }

  if (firstName.value && lastName.value) {
    return !EmailValidator.validate(email.value);
  }

  return true;
});

const showNameInputs = computed(() => prefilledEmail.value === 'undefined' || !prefilledEmail.value);

const startEmailCountDown = () => {
  if (timerId.value) clearInterval(timerId.value);

  timerId.value = setInterval(() => {
    emailResendCount.value -= 1;

    if (emailResendCount.value < 0) {
      emailSent.value = false;
      emailResendCount.value = RESEND_INTERVAL;
      if (timerId.value) {
        clearInterval(timerId.value);
        timerId.value = null;
      }
    }
  }, 1000);
};

const setLanguageStep = (view: CardUIViews) => emit('confirm', view);

const registerAuthListeners = (login: any) => {
  if (!login?.on || listenersAttached.value) return;

  login
    .on('Verification-Email-Sent-Success', () => {
      emailSent.value = true;
    })
    .on('Verification-Email-ReSent-Success', () => {
      emailSent.value = true;
    })
    .on('Email-verified', () => {
      unconfirmedEmail.value = '';
      if (isEuroBalanceEnough.value) {
        setLanguageStep(CardUIViews.Kyc);
      } else {
        setLanguageStep(CardUIViews.Payment);
      }
    });

  listenersAttached.value = true;
};

const handleSendEmail = () => {
  const login = authLogin.value;
  if (!login) return;

  startEmailCountDown();

  if (isPrefilledEmailValid.value || isEmailMismatch.value) {
    if (prefilledEmail.value !== email.value) {
      login.ChangeUnconfirmedEmail({ Email: email.value }).catch((error: unknown) => {
        console.error('[SoraCard]: Error while changing email', error);
      });

      unconfirmedEmail.value = email.value;
      emailSent.value = true;
      return;
    }
  }

  if (!emailSentFirstTime.value && !isPrefilledEmailValid.value) {
    login
      .UserMinimalRegistration({ Email: email.value, FirstName: firstName.value, LastName: lastName.value })
      .catch((error: unknown) => {
        console.error('[SoraCard]: Error while email setup', error);
      });

    unconfirmedEmail.value = email.value;
    emailSentFirstTime.value = true;
    return;
  }

  login.SendVerificationEmail().catch((error: unknown) => {
    console.error('[SoraCard]: Error while resending email', error);
  });

  emailSent.value = true;
};

const handleClearSearch = () => {
  // Exposed for template consistency (SearchInput emits clear)
  query.value = '';
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

onMounted(() => {
  prefilledEmail.value = localStorage.getItem('PW-Email') || 'undefined';

  if (prefilledEmail.value !== 'undefined') {
    email.value = prefilledEmail.value;
  }

  if (authLogin.value) {
    registerAuthListeners(authLogin.value);
  }
});

onBeforeUnmount(() => {
  if (timerId.value) {
    clearInterval(timerId.value);
    timerId.value = null;
  }
});
</script>

<style lang="scss" scoped>
.sora-card {
  .s-typography-button--large.sora-card__btn {
    margin-top: 0;
  }
  .s-icon-basic-check-mark-24 {
    color: var(--s-color-status-success);
  }

  &__input-name {
    margin-bottom: $basic-spacing;
  }

  &__name-input-description {
    color: var(--s-color-base-content-primary);
    font-size: var(--s-font-size-extra-small);
    font-weight: 300;
    line-height: var(--s-line-height-base);
    padding: var(--s-basic-spacing) var(--s-basic-spacing) calc(var(--s-basic-spacing) * 2)
      calc(var(--s-basic-spacing) * 1.5);
  }

  &__email-input-description {
    display: inline-block;
    color: var(--s-color-base-content-primary);
    font-size: var(--s-font-size-extra-small);
    font-weight: 300;
    line-height: var(--s-line-height-base);
    padding: var(--s-basic-spacing) var(--s-basic-spacing) calc(var(--s-basic-spacing) * 2)
      calc(var(--s-basic-spacing) * 1.5);

    &--sent {
      padding-bottom: 0;
    }
  }

  &__btn {
    width: 100%;
  }
}
</style>
