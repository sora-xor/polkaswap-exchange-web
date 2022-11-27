<template>
  <div class="sora-card" v-loading="loading">
    <div class="sora-card__card">
      <sora-card-front class="sora-card__card-image" />
      <div class="sora-card__card-icon" :class="getComputedIconClass()">
        <s-icon
          v-if="cardIssueState === CardIssueStatus.Wait"
          name="time-time-24"
          class="sora-card__card-icon-element"
        ></s-icon>
        <s-icon
          v-if="cardIssueState === CardIssueStatus.Success"
          name="basic-check-marks-24"
          class="sora-card__card-icon-element"
        ></s-icon>
        <s-icon
          v-if="cardIssueState === CardIssueStatus.Reject"
          name="basic-close-24"
          class="sora-card__card-icon-element"
        ></s-icon>
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
import SoraCardFront from '@/assets/img/sora-card/sora-card-front.svg?inline';

enum CardIssueStatus {
  Wait,
  Success,
  Reject,
}

@Component({
  components: {
    SoraCardFront,
  },
})
export default class ConfirmationInfo extends Mixins(mixins.LoadingMixin, TranslationMixin) {
  cardIssueState = CardIssueStatus.Wait;

  CardIssueStatus = CardIssueStatus;

  get buttonText() {
    return 'Try to complete KYC again';
  }

  get showTryAgainBtn(): boolean {
    if (this.cardIssueState === CardIssueStatus.Reject) return true;
    return false;
  }

  getHeaderText(): string | undefined {
    if (this.cardIssueState === CardIssueStatus.Wait) {
      return 'KYC completed. Waiting for the results';
    }
    if (this.cardIssueState === CardIssueStatus.Success) {
      return 'You’re approved for SORA Card';
    }
    if (this.cardIssueState === CardIssueStatus.Reject) {
      return 'You’re not been approved for SORA Card';
    }
  }

  getComputedIconClass(): string | undefined {
    if (this.cardIssueState === CardIssueStatus.Wait) {
      return 'sora-card__card-icon--waiting';
    }
    if (this.cardIssueState === CardIssueStatus.Success) {
      return 'sora-card__card-icon--success';
    }
    if (this.cardIssueState === CardIssueStatus.Reject) {
      return 'sora-card__card-icon--reject';
    }
  }
}
</script>

<style lang="scss" scoped>
.sora-card {
  margin-top: -40px;
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
