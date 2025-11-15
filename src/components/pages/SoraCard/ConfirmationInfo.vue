<template>
  <div class="sora-card container" v-loading="loading">
    <div class="sora-card__card">
      <s-image
        src="card/sora-card-front.png"
        lazy
        fit="cover"
        draggable="false"
        class="unselectable sora-card__card-image"
      ></s-image>
      <div class="sora-card__card-icon" :class="computedIconClass">
        <s-icon class="sora-card__card-icon-element" :name="icon"></s-icon>
      </div>
    </div>

    <div class="sora-card__header">{{ t(titleKey) }}</div>
    <div class="sora-card__status-info" v-html="safeText"></div>

    <div v-if="isRejected" class="sora-card__rejection">
      <div v-if="freeAttemptsLeft" class="tos__disclaimer">
        <h4 class="tos__disclaimer-header">
          {{ tc('card.rejectCount', freeAttemptsLeft, { count: freeAttemptsLeft }) }}
        </h4>
        <p class="tos__disclaimer-paragraph">
          {{ t('card.rejectionPriceAttemptDisclaimer', { 0: retryFee }) }}
        </p>
        <div class="tos__disclaimer-warning icon">
          <s-icon name="notifications-alert-triangle-24" size="28px"></s-icon>
        </div>
      </div>
      <s-button
        v-if="hasFreeAttempts"
        type="primary"
        class="sora-card__btn s-typography-button--large"
        @click="handleKycRetry"
      >
        <span class="text">{{ t('card.retryKycBtn') }}</span>
      </s-button>
      <div v-else class="sora-card__no-more-free-kyc">
        <h4>{{ t('card.noFreeKycTitle') }}</h4>
        <p class="sora-card__no-more-free-kyc-text">
          {{ t('card.noFreeAttemptsDesc') }}
        </p>
      </div>
    </div>
    <div v-if="isRejectedOrPending" class="sora-card__support">
      <s-button class="sora-card__btn sora-card__btn-support s-typography-button--large" @click="openSupportChannel">
        <span class="text">{{ t('card.telegramSupport') }}</span>
      </s-button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { components } from '@wallet';
import { computed, onMounted } from 'vue';

import { useLoading } from '@/composables/useLoading';
import { useTranslation } from '@/composables/useTranslation';
import { Links } from '@/consts';
import store from '@/store';
import { AttemptCounter, Fees, VerificationStatus } from '@/types/card';
import { clearPayWingsKeysFromLocalStorage } from '@/utils/card';
import { escapeHtml, sanitizeHtml } from '@/utils/sanitize';

const pendingTitle = 'card.statusPendingTitle';
const pendingText = 'card.statusPendingText';
const pendingIcon = 'time-time-24';

defineOptions({
  components: {
    SImage: components.SImage,
  },
});

const emit = defineEmits<{
  (event: 'confirm-apply', openGetReadyPage: boolean): void;
}>();

const { t, tc } = useTranslation();
const { loading, withApi } = useLoading();

const fees = computed(() => store.state.soraCard.fees as Fees);
const attemptCounter = computed(() => store.state.soraCard.attemptCounter as AttemptCounter);
const rejectReasons = computed(() => store.state.soraCard.rejectReasons as string[]);
const currentStatus = computed(() => store.getters.soraCard.currentStatus as VerificationStatus | undefined);

const sanitizedRejectReasons = computed(() =>
  rejectReasons.value.map((reason) => escapeHtml(reason)).filter((reason) => Boolean(reason))
);

const isMultipleReasons = computed(() => sanitizedRejectReasons.value.length > 1);

const rejectedText = computed(() => {
  if (currentStatus.value === VerificationStatus.Rejected && sanitizedRejectReasons.value.length) {
    if (isMultipleReasons.value) {
      const rejectionList = sanitizedRejectReasons.value.map((reason) => `<li>${reason}</li>`).join('');

      return `${t('card.statusRejectReasonMultiple')} <ul class="sora-card__reject-reasons">${rejectionList}</ul>`;
    }

    return `${t('card.statusRejectReason')}: ${sanitizedRejectReasons.value[0]}`;
  }

  return t('card.statusRejectText');
});

const retryFee = computed(() => fees.value?.retry ?? null);
const freeAttemptsLeft = computed(() => Number(attemptCounter.value?.freeAttemptsLeft ?? 0));
const hasFreeAttempts = computed(() => Boolean(attemptCounter.value?.hasFreeAttempts));

const isRejected = computed(() => currentStatus.value === VerificationStatus.Rejected);
const isRejectedOrPending = computed(() =>
  [VerificationStatus.Pending, VerificationStatus.Rejected].includes(currentStatus.value as VerificationStatus)
);

const titleKey = computed(() => {
  if (!currentStatus.value) return pendingTitle;

  switch (currentStatus.value) {
    case VerificationStatus.Pending:
      return pendingTitle;
    case VerificationStatus.Accepted:
      return 'card.statusAcceptTitle';
    case VerificationStatus.Rejected:
      return 'card.statusRejectTitle';
    default:
      return pendingTitle;
  }
});

const text = computed(() => {
  if (!currentStatus.value) return t(pendingText);

  switch (currentStatus.value) {
    case VerificationStatus.Pending:
      return t(pendingText);
    case VerificationStatus.Accepted:
      return t('card.statusAcceptText');
    case VerificationStatus.Rejected:
      return rejectedText.value;
    default:
      return t(pendingText);
  }
});

const safeText = computed(() =>
  sanitizeHtml(text.value, {
    allowedTags: ['ul', 'li', 'span', 'strong', 'em', 'p', 'br'],
    allowedAttributes: {
      '*': ['class'],
    },
  })
);

const icon = computed(() => {
  if (currentStatus.value === VerificationStatus.Rejected && !hasFreeAttempts.value) return 'time-time-24';

  switch (currentStatus.value) {
    case VerificationStatus.Pending:
      return pendingIcon;
    case VerificationStatus.Accepted:
      return 'basic-check-marks-24';
    case VerificationStatus.Rejected:
      return 'basic-close-24';
    default:
      return pendingIcon;
  }
});

const computedIconClass = computed(() => {
  const base = 'sora-card__card-icon';

  if (currentStatus.value === VerificationStatus.Rejected && !hasFreeAttempts.value) return `${base}--waiting`;

  switch (currentStatus.value) {
    case VerificationStatus.Pending:
      return `${base}--waiting`;
    case VerificationStatus.Accepted:
      return `${base}--success`;
    case VerificationStatus.Rejected:
      return `${base}--reject`;
    default:
      return `${base}--waiting`;
  }
});

const openSupportChannel = () => {
  window.open(Links.soraCardSupportChannel, '_blank');
};

const handleKycRetry = () => {
  store.commit.soraCard.setWillToPassKycAgain(true);
  emit('confirm-apply', true);
};

onMounted(async () => {
  await withApi(async () => {
    await store.dispatch.soraCard.getUserStatus();

    if (currentStatus.value === VerificationStatus.Rejected) {
      await store.dispatch.soraCard.getUserKycAttempt();
    }

    clearPayWingsKeysFromLocalStorage();
  });
});

defineExpose({
  loading,
  titleKey,
  safeText,
  icon,
  computedIconClass,
  freeAttemptsLeft,
  hasFreeAttempts,
  retryFee,
  isRejected,
  isRejectedOrPending,
  openSupportChannel,
  handleKycRetry,
});
</script>

<style lang="scss" scoped>
.sora-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  &__header {
    margin-top: var(--s-size-mini);
    text-align: center;
    font-weight: 600;
    font-size: 28px;
    width: 80%;
  }
  &__status-info {
    margin-top: $basic-spacing;
    text-align: center;
    width: 90%;
    font-weight: 300;
    line-height: 150%;
  }
  &__rejection {
    width: 100%;

    .tos__disclaimer {
      width: 100%;
      margin-top: $basic-spacing;
      margin-bottom: 0;
      background-color: var(--s-color-base-background);
      border-radius: var(--s-border-radius-small);
      box-shadow: var(--s-shadow-dialog);
      padding: 20px $basic-spacing;
      position: relative;
      &-header {
        font-weight: 500;
        margin-bottom: 10px;
      }
      &-paragraph {
        color: var(--s-color-base-content-secondary);
        margin-bottom: calc(var(--s-basic-spacing) / 2);
      }
      &-warning.icon {
        position: absolute;
        background-color: #479aef;
        border: 2.25257px solid #f7f3f4;
        box-shadow: var(--s-shadow-element-pressed);
        top: 20px;
        right: 20px;
        border-radius: 50%;
        color: #fff;
        width: 46px;
        height: 46px;
        .s-icon-notifications-alert-triangle-24 {
          display: block;
          color: #fff;
          margin-top: 5px;
          margin-left: 7px;
        }
      }
      * {
        width: 85%;
      }
    }
  }
  &__support {
    width: 100%;
  }
  &__status-info-test {
    white-space: pre-line;
    margin-top: $basic-spacing;
    text-align: center;
    width: 85%;
    font-weight: 300;
    line-height: 150%;
  }
  &__status-info-test {
    white-space: pre-line;
    margin-top: $basic-spacing;
    text-align: center;
    width: 85%;
    font-weight: 300;
    line-height: 150%;
  }
  &__btn {
    width: 100%;

    &-support {
      margin-top: $inner-spacing-mini;
      span.text {
        font-variation-settings: 'wght' 700 !important;
        font-size: var(--s-font-size-big);
      }
    }
  }
  &__no-more-free-kyc {
    margin-top: var(--s-size-mini);
    text-align: center;

    &-text {
      font-weight: 300;
      line-height: 150%;
    }
  }
  &__card {
    position: relative;

    &-image {
      width: 360px;
    }
    &-icon {
      height: 40px;
      width: 40px;
      right: -14px;
      bottom: -4px;
      position: absolute;
      border-radius: 50%;
      opacity: 0.95;

      &-element {
        display: block;
        color: #fff;
        margin: 20%;
      }

      &--waiting {
        background-color: var(--s-color-base-content-secondary);
      }
      &--success {
        background-color: var(--s-color-theme-secondary);
      }
      &--reject {
        background-color: var(--s-color-status-error);
      }
    }
  }

  .s-icon-basic-check-mark-24 {
    color: var(--s-color-status-success);
  }
}
</style>
