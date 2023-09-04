<template>
  <div v-loading="parentLoading">
    <div class="tos__disclaimer">
      <h4 class="tos__disclaimer-header">{{ t('card.attentionText') }}</h4>
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
            <h4 class="kyc-instructions__point">{{ t('card.guideline.photoTitle') }}</h4>
            <span class="kyc-instructions__point-desc">{{ t('card.guideline.photoDesc') }}</span>
            <div class="line" />
          </div>
        </div>
        <div class="kyc-instructions__section">
          <span class="kyc-instructions__number">2</span>
          <div class="text">
            <h4 class="kyc-instructions__point">{{ t('card.guideline.selfieTitle') }}</h4>
            <span class="kyc-instructions__point-desc">{{ t('card.guideline.selfieDesc') }}</span>
            <div class="line" />
          </div>
        </div>
        <div class="kyc-instructions__section">
          <span class="kyc-instructions__number">3</span>
          <div class="text">
            <h4 class="kyc-instructions__point">{{ t('card.guideline.proofAddressTitle') }}</h4>
            <span class="kyc-instructions__point-desc">{{ t('card.guideline.proofAddressDesc') }}</span>
            <p class="kyc-instructions__point-note">{{ t('card.guideline.proofAddressNote') }}</p>
            <div class="line" />
          </div>
        </div>
        <div class="kyc-instructions__section">
          <span class="kyc-instructions__number">4</span>
          <div class="text">
            <h4 class="kyc-instructions__point">{{ t('card.guideline.personalTitle') }}</h4>
            <span class="kyc-instructions__point-desc">{{ t('card.guideline.personalDesc') }}</span>
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
export default class Guidance extends Mixins(TranslationMixin, mixins.LoadingMixin) {
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
    margin-right: 20px;
  }

  &__point-note {
    margin-top: 8px;
    color: #efac47;
    font-size: var(--s-font-size-small);
    font-weight: 550;
    margin-right: 8px;
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
