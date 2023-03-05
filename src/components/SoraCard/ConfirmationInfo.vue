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

    <div class="sora-card__header">{{ title }}</div>
    <p class="sora-card__status-info">{{ text }}</p>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { VerificationStatus } from '@/types/card';
import { getter } from '@/store/decorators';

@Component
export default class ConfirmationInfo extends Mixins(mixins.LoadingMixin, TranslationMixin) {
  @getter.soraCard.currentStatus currentStatus!: VerificationStatus;

  readonly pendingTitle = this.t('card.statusPendingTitle');
  readonly pendingText = this.t('card.statusPendingText');
  readonly acceptedTitle = this.t('card.statusAcceptTitle');
  readonly acceptedText = this.t('card.statusAcceptText');
  readonly rejectedTitle = this.t('card.statusRejectTitle');
  readonly rejectedText = this.t('card.statusRejectText');

  get title(): string {
    if (!this.currentStatus) return this.pendingTitle;

    switch (this.currentStatus) {
      case VerificationStatus.Pending:
        return this.pendingTitle;
      case VerificationStatus.Accepted:
        return this.acceptedTitle;
      case VerificationStatus.Rejected:
        return this.rejectedTitle;
      default:
        return this.pendingTitle;
    }
  }

  get text(): string {
    if (!this.currentStatus) return this.pendingText;

    switch (this.currentStatus) {
      case VerificationStatus.Pending:
        return this.pendingText;
      case VerificationStatus.Accepted:
        return this.acceptedText;
      case VerificationStatus.Rejected:
        return this.rejectedText;
      default:
        return this.pendingText;
    }
  }

  get icon(): string {
    if (!this.currentStatus) return 'time-time-24';

    switch (this.currentStatus) {
      case VerificationStatus.Pending:
        return 'time-time-24';
      case VerificationStatus.Accepted:
        return 'basic-check-marks-24';
      case VerificationStatus.Rejected:
        return 'basic-close-24';
      default:
        return 'time-time-24';
    }
  }

  get computedIconClass(): string {
    const base = 'sora-card__card-icon';

    if (!this.currentStatus) return `${base}--waiting`;

    switch (this.currentStatus) {
      case VerificationStatus.Pending:
        return `${base}--waiting`;
      case VerificationStatus.Accepted:
        return `${base}--success`;
      case VerificationStatus.Rejected:
        return `${base}--reject`;
      default:
        return '';
    }
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
  }
  &__card {
    position: relative;

    &-image {
      width: 360px;
    }
    &-icon {
      height: 40px;
      width: 40px;
      right: -10px;
      bottom: 0px;
      position: absolute;
      border-radius: 50%;

      &-element {
        display: block;
        color: #fff;
        margin: 20%;
      }

      &--waiting {
        background-color: var(--s-color-base-content-secondary);
        opacity: 0.95;
      }
      &--success {
        background-color: var(--s-color-theme-secondary);
        opacity: 0.95;
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
