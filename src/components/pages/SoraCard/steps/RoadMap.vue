<template>
  <div v-loading="parentLoading">
    <div class="tos__disclaimer">
      <h4 class="tos__disclaimer-header">{{ 'Attention' }}</h4>
      <p class="tos__disclaimer-paragraph">
        {{
          'You have only 2 attempts to pass the KYC process without extra wating time. To maximize your chances of success please follow these simple guidelines:'
        }}
      </p>
      <div class="tos__disclaimer-warning icon">
        <s-icon name="notifications-alert-triangle-24" size="28px" />
      </div>
    </div>
    <div class="kyc-instructions">
      <div class="kyc-instructions__text-info">
        <div class="kyc-instructions__section">
          <span class="kyc-instructions__number">1</span>
          <div class="text">
            <h4 class="kyc-instructions__point">{{ 'Submit a photo of your ID document' }}</h4>
            <span class="kyc-instructions__point-desc">{{
              'Passport, Driver License, ID card or Residence Permit'
            }}</span>
            <div class="line" />
          </div>
        </div>
        <div class="kyc-instructions__section">
          <span class="kyc-instructions__number">2</span>
          <div class="text">
            <h4 class="kyc-instructions__point">{{ 'Take a selfie' }}</h4>
            <span class="kyc-instructions__point-desc">{{ 'The guidance will be provided during the process' }}</span>
            <div class="line" />
          </div>
        </div>
        <div class="kyc-instructions__section">
          <span class="kyc-instructions__number">3</span>
          <div class="text">
            <h4 class="kyc-instructions__point">{{ 'Submit a photo of proof of address' }}</h4>
            <span class="kyc-instructions__point-desc">{{
              'An official document (utility bill, bank statement, government statement or correspondence) that contains your full name and address, and that is no older then 3 months'
            }}</span>
            <div class="line" />
          </div>
        </div>
        <div class="kyc-instructions__section">
          <span class="kyc-instructions__number">4</span>
          <div class="text">
            <h4 class="kyc-instructions__point">{{ 'Submit your personal info' }}</h4>
            <span class="kyc-instructions__point-desc">{{ 'Fill in the form with your name and address' }}</span>
            <div class="line line--last" />
          </div>
        </div>
      </div>
    </div>
    <s-button type="primary" class="sora-card__btn s-typography-button--large" @click="handleConfirm">
      <span class="text">{{ 'Ok, I’m ready' }}</span>
    </s-button>
  </div>
</template>

<script lang="ts">
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';

@Component({
  components: {},
})
export default class RoadMap extends Mixins(TranslationMixin, mixins.LoadingMixin) {
  async handleConfirm(): Promise<void> {
    this.$emit('confirm');
  }
}
</script>

<style lang="scss" scoped>
.kyc-instructions {
  display: flex;
  width: 100%;

  &__section {
    display: flex;
    align-items: center;
    width: 100%;

    .text {
      padding-top: $basic-spacing;
      width: 400px;
    }

    &:last-child .text {
      margin-bottom: $basic-spacing;
    }

    .line {
      height: 1px;
      margin-top: $basic-spacing;
      background-color: var(--s-color-base-border-secondary);

      &--last {
        visibility: hidden;
        margin: 0;
      }
    }
  }

  &__number {
    display: block;
    width: 24px;
    height: 24px;
    font-weight: 600;
    font-size: 24px;
    color: #a19a9d;
    margin-right: 16px;
    margin-top: 4px;
  }

  &__point {
    font-weight: 600;
    font-size: var(--s-font-size-big);
  }

  &__text-info {
    width: 120%;
  }

  &__point-desc {
    color: var(--s-color-base-content-secondary);
    margin-top: 3px;
    display: block;
  }

  .s-icon-basic-check-mark-24 {
    color: #fff;
    position: relative;
    margin-left: 3px;
  }
}

.sora-card__btn {
  width: 100%;
}
</style>
