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
        <s-icon
          v-if="!currentStatus || currentStatus === VerificationStatus.Pending"
          name="time-time-24"
          class="sora-card__card-icon-element"
        />
        <s-icon
          v-if="currentStatus === VerificationStatus.Accepted"
          name="basic-check-marks-24"
          class="sora-card__card-icon-element"
        />
        <s-icon
          v-if="currentStatus === VerificationStatus.Rejected"
          name="basic-close-24"
          class="sora-card__card-icon-element"
        />
      </div>
    </div>

    <div class="sora-card__header">{{ headerText }}</div>
    <p v-if="currentStatus === VerificationStatus.Pending" class="sora-card__status-info">
      You have successfully completed your KYC application. The review is pending and you can expect a decision shortly.
    </p>
    <p v-if="currentStatus === VerificationStatus.Accepted" class="sora-card__status-info">
      Your KYC verification is successful and we are already preparing to send you the SORA card!
    </p>
    <p v-if="currentStatus === VerificationStatus.Rejected" class="sora-card__status-info">
      Your application has failed.
    </p>

    <s-button
      v-if="currentStatus === VerificationStatus.Rejected"
      type="primary"
      class="sora-card__btn s-typography-button--large"
    >
      <span class="text">{{ buttonText }}</span>
    </s-button>
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

  readonly VerificationStatus = VerificationStatus;

  get buttonText(): string {
    return 'Try to complete KYC again';
  }

  get headerText(): Nullable<string> {
    if (!this.currentStatus) return 'KYC completed. Waiting for the results';

    switch (this.currentStatus) {
      case VerificationStatus.Pending:
        return 'KYC completed. Waiting for the results';
      case VerificationStatus.Accepted:
        return 'You’re approved for SORA Card';
      case VerificationStatus.Rejected:
        return 'You’re not been approved for SORA Card';
      default:
        return null;
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
