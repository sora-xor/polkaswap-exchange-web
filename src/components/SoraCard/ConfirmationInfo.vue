<template>
  <div class="sora-card container" v-loading="loading">
    <div class="sora-card__card">
      <img src="@/assets/img/sora-card/sora_card_front.png?inline" class="sora-card__card-image" />
      <div class="sora-card__card-icon" :class="getComputedIconClass()">
        <s-icon
          v-if="cardIssueState === CardIssueStatus.Pending"
          name="time-time-24"
          class="sora-card__card-icon-element"
        />
        <s-icon
          v-if="cardIssueState === CardIssueStatus.Success"
          name="basic-check-marks-24"
          class="sora-card__card-icon-element"
        />
        <s-icon
          v-if="cardIssueState === CardIssueStatus.Reject"
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
import { CardIssueStatus } from '@/types/card';
import { state } from '@/store/decorators';

@Component
export default class ConfirmationInfo extends Mixins(mixins.LoadingMixin, TranslationMixin) {
  @state.soraCard.userKycStatus private userKycStatus!: CardIssueStatus;

  cardIssueState = CardIssueStatus.Pending;

  CardIssueStatus = CardIssueStatus;

  get buttonText() {
    return 'Try to complete KYC again';
  }

  get showTryAgainBtn(): boolean {
    if (this.cardIssueState === CardIssueStatus.Reject) return true;
    return false;
  }

  getHeaderText(): string | undefined {
    switch (this.cardIssueState) {
      case CardIssueStatus.Pending:
        return 'KYC completed. Waiting for the results';
      case CardIssueStatus.Success:
        return 'You’re approved for SORA Card';
      case CardIssueStatus.Reject:
        return 'You’re not been approved for SORA Card';
    }
  }

  getComputedIconClass(): string | undefined {
    switch (this.cardIssueState) {
      case CardIssueStatus.Pending:
        return 'sora-card__card-icon--waiting';
      case CardIssueStatus.Success:
        return 'sora-card__card-icon--success';
      case CardIssueStatus.Reject:
        return 'sora-card__card-icon--reject';
    }
  }

  mounted(): void {
    if (this.userKycStatus) {
      this.cardIssueState = this.userKycStatus;
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
