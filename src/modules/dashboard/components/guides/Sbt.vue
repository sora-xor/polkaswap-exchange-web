<template>
  <div>
    <h4 class="sbt-title">{{ t('assetOwner.guide.title', { type: WALLET_CONSTS.TranslationConsts.SBT }) }}</h4>
    <div class="sbt-instructions">
      <div class="sbt-instructions__text-info">
        <div class="sbt-instructions__section">
          <span class="sbt-instructions__number">1</span>
          <div class="text">
            <h4 class="sbt-instructions__point">{{ t('assetOwner.guide.stepOneTitle') }}</h4>
            <span class="sbt-instructions__point-desc">{{ t('assetOwner.guide.stepOneDesc') }}</span>
            <div class="line" />
          </div>
        </div>
        <div class="sbt-instructions__section">
          <span class="sbt-instructions__number">2</span>
          <div class="text">
            <h4 class="sbt-instructions__point">{{ t('assetOwner.guide.stepTwoTitle') }}</h4>
            <span class="sbt-instructions__point-desc">{{ t('assetOwner.guide.stepTwoDesc') }}</span>
            <div class="line" />
          </div>
        </div>
        <div class="sbt-instructions__section">
          <span class="sbt-instructions__number">3</span>
          <div class="text">
            <h4 class="sbt-instructions__point">{{ t('assetOwner.guide.stepThreeTitle') }}</h4>
            <span class="sbt-instructions__point-desc">{{ t('assetOwner.guide.stepThreeDesc') }}</span>
            <div class="line" />
          </div>
        </div>
      </div>
    </div>
    <div class="sbt__disclaimer">
      <h4 class="sbt__disclaimer-header">{{ t('card.attentionText') }}</h4>
      <p class="sbt__disclaimer-paragraph">
        {{ t('assetOwner.guide.disclaimerSbt') }}
      </p>
      <div class="sbt__disclaimer-warning icon">
        <s-icon name="notifications-alert-triangle-24" size="28px" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { mixins, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { Mixins } from 'vue-property-decorator';

export default class SbtGuide extends Mixins(mixins.TranslationMixin) {
  readonly WALLET_CONSTS = WALLET_CONSTS;
}
</script>

<style lang="scss">
.sbt__disclaimer {
  width: 100%;
  background-color: var(--s-color-base-background);
  border-radius: var(--s-border-radius-small);
  box-shadow: var(--s-shadow-dialog);
  padding: 20px $basic-spacing;
  margin-bottom: $basic-spacing;
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
    border: 2px solid #f7f3f4;
    box-shadow: var(--s-shadow-element-pressed);
    color: var(--s-color-base-on-accent);
    top: 20px;
    right: 20px;
    border-radius: 50%;
    width: 46px;
    height: 46px;
    .s-icon-notifications-alert-triangle-24 {
      color: var(--s-color-base-on-accent);
      display: block;
      margin-top: 5px;
      margin-left: 7px;
    }
  }
  * {
    width: 85%;
  }
}
</style>
