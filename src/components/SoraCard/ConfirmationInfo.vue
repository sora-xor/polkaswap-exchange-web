<template>
  <div class="sora-card container" v-loading="loading">
    <div class="sora-card__card">
      <img src="@/assets/img/sora-card/sora_card_front.png?inline" class="sora-card__card-image" />
      <div class="sora-card__card-icon" :class="getComputedIconClass()">
        <s-icon v-if="status === VerificationStatus.Pending" name="time-time-24" class="sora-card__card-icon-element" />
        <s-icon
          v-if="status === VerificationStatus.Accepted"
          name="basic-check-marks-24"
          class="sora-card__card-icon-element"
        />
        <s-icon
          v-if="status === VerificationStatus.Rejected"
          name="basic-close-24"
          class="sora-card__card-icon-element"
        />
      </div>
    </div>

    <div class="sora-card__header">{{ getHeaderText() }}</div>
    <p class="sora-card__status-info">
      We will let you know if you’re eligible for the SORA card as soon as we get information from our partner,
      Paywings. We will notify you.
    </p>

    <s-button v-if="showTryAgainBtn" type="primary" class="sora-card__btn s-typography-button--large">
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

  VerificationStatus = VerificationStatus;

  status = VerificationStatus.Pending;

  get buttonText() {
    return 'Try to complete KYC again';
  }

  get showTryAgainBtn(): boolean {
    if (this.currentStatus === VerificationStatus.Rejected) return true;
    return false;
  }

  getHeaderText(): string | undefined {
    switch (this.currentStatus) {
      case VerificationStatus.Pending:
        return 'KYC completed. Waiting for the results';
      case VerificationStatus.Accepted:
        return 'You’re approved for SORA Card';
      case VerificationStatus.Rejected:
        return 'You’re not been approved for SORA Card';
    }
  }

  getComputedIconClass(): string | undefined {
    switch (this.currentStatus) {
      case VerificationStatus.Pending:
        return 'sora-card__card-icon--waiting';
      case VerificationStatus.Accepted:
        return 'sora-card__card-icon--success';
      case VerificationStatus.Rejected:
        return 'sora-card__card-icon--reject';
    }
  }

  mounted(): void {
    if (this.currentStatus) {
      this.status = this.currentStatus;
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
    margin-top: 24px;
    text-align: center;
    font-weight: 600;
    font-size: 28px;
    width: 80%;
  }
  &__status-info {
    margin-top: 16px;
    text-align: center;
    width: 85%;
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
