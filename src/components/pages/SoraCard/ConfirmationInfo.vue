<template>
  <div class="sora-card container" v-loading="loading">
    <div class="sora-card__card">
      <s-image
        src="card/sora-card-front.png"
        lazy
        fit="cover"
        draggable="false"
        class="unselectable sora-card__card-image"
      />
      <div class="sora-card__card-icon" :class="computedIconClass">
        <s-icon class="sora-card__card-icon-element" :name="icon" />
      </div>
    </div>

    <div class="sora-card__header">{{ t(titleKey) }}</div>
    <p class="sora-card__status-info" v-html="text" />

    <div v-if="isRejected" class="sora-card__rejection">
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
        <span class="text">{{ 'Telegram support' }}</span>
      </s-button>
    </div>
  </div>
</template>

<script lang="ts">
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Links } from '@/consts';
import { action, getter, mutation, state } from '@/store/decorators';
import { VerificationStatus } from '@/types/card';
import { clearPayWingsKeysFromLocalStorage } from '@/utils/card';

const pendingTitle = 'card.statusPendingTitle';
const pendingText = 'card.statusPendingText';
const pendingIcon = 'time-time-24';

@Component
export default class ConfirmationInfo extends Mixins(mixins.LoadingMixin, TranslationMixin) {
  @state.soraCard.hasFreeAttempts hasFreeAttempts!: boolean;
  @state.soraCard.rejectReason rejectReason!: string;
  @getter.soraCard.currentStatus currentStatus!: VerificationStatus;
  @mutation.soraCard.setWillToPassKycAgain setWillToPassKycAgain!: (boolean) => void;
  @action.soraCard.getUserKycAttempt getUserKycAttempt!: AsyncFnWithoutArgs;

  VerificationStatus = VerificationStatus;

  private get rejectedText(): string {
    if (this.currentStatus === VerificationStatus.Rejected && this.rejectReason) {
      return `${this.t('card.statusRejectReason')}: ${this.rejectReason}`;
    }
    return this.t('card.statusRejectText');
  }

  get isRejected(): boolean {
    return this.currentStatus === VerificationStatus.Rejected;
  }

  get isRejectedOrPending(): boolean {
    return [VerificationStatus.Pending, VerificationStatus.Rejected].includes(this.currentStatus);
  }

  get titleKey(): string {
    if (!this.currentStatus) return pendingTitle;

    switch (this.currentStatus) {
      case VerificationStatus.Pending:
        return pendingTitle;
      case VerificationStatus.Accepted:
        return 'card.statusAcceptTitle';
      case VerificationStatus.Rejected:
        return 'card.statusRejectTitle';
      default:
        return pendingTitle;
    }
  }

  get text(): string {
    if (!this.currentStatus) return this.t(pendingText);

    switch (this.currentStatus) {
      case VerificationStatus.Pending:
        return this.t(pendingText);
      case VerificationStatus.Accepted:
        return this.t('card.statusAcceptText');
      case VerificationStatus.Rejected:
        return this.rejectedText;
      default:
        return this.t(pendingText);
    }
  }

  get icon(): string {
    if (this.currentStatus === VerificationStatus.Rejected && !this.hasFreeAttempts) return 'time-time-24';

    switch (this.currentStatus) {
      case VerificationStatus.Pending:
        return pendingIcon;
      case VerificationStatus.Accepted:
        return 'basic-check-marks-24';
      case VerificationStatus.Rejected:
        return 'basic-close-24';
      default:
        return pendingIcon;
    }
  }

  get computedIconClass(): string {
    const base = 'sora-card__card-icon';

    if (this.currentStatus === VerificationStatus.Rejected && !this.hasFreeAttempts) return `${base}--waiting`;

    switch (this.currentStatus) {
      case VerificationStatus.Pending:
        return `${base}--waiting`;
      case VerificationStatus.Accepted:
        return `${base}--success`;
      case VerificationStatus.Rejected:
        return `${base}--reject`;
      default:
        return `${base}--waiting`;
    }
  }

  openSupportChannel(): void {
    window.open(Links.soraCardSupportChannel, '_blank');
  }

  handleKycRetry(): void {
    this.setWillToPassKycAgain(true);
    const openGetReadyPage = true;
    this.$emit('confirm-apply', openGetReadyPage);
  }

  async mounted(): Promise<void> {
    await this.getUserKycAttempt();
    clearPayWingsKeysFromLocalStorage();
  }
}
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
      margin-top: 8px;
      span.text {
        font-variation-settings: 'wght' 700 !important;
        font-size: 18px;
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
