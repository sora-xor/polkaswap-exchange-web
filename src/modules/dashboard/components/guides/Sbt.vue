<template>
  <div>
    <h4 class="sbt-title">How to create an SBT:</h4>
    <div class="sbt-instructions">
      <div class="sbt-instructions__text-info">
        <div class="sbt-instructions__section">
          <span class="sbt-instructions__number">1</span>
          <div class="text">
            <h4 class="sbt-instructions__point">{{ 'Select or Create Regulated Assets' }}</h4>
            <span class="sbt-instructions__point-desc">{{
              'Choose or create assets that you have personally created and regulate. These are assets under your control and management.'
            }}</span>
            <div class="line" />
          </div>
        </div>
        <div class="sbt-instructions__section">
          <span class="sbt-instructions__number">2</span>
          <div class="text">
            <h4 class="sbt-instructions__point">{{ 'Enter SBT Details' }}</h4>
            <span class="sbt-instructions__point-desc">{{
              "Provide essential information such as the SBT's name and ticker symbol, as well as the icon"
            }}</span>
            <div class="line" />
          </div>
        </div>
        <div class="sbt-instructions__section">
          <span class="sbt-instructions__number">3</span>
          <div class="text">
            <h4 class="sbt-instructions__point">{{ 'Review and sign the transaction' }}</h4>
            <span class="sbt-instructions__point-desc">{{
              'Review and sign the final creation transaction to complete the SBT setup.'
            }}</span>
            <div class="line" />
          </div>
        </div>
      </div>
    </div>
    <div class="sbt__disclaimer">
      <h4 class="sbt__disclaimer-header">{{ t('card.attentionText') }}</h4>
      <p class="sbt__disclaimer-paragraph">
        {{
          'Keep this page open during the entire process. Closing or navigating away will require you to restart from the beginning. Complete steps quickly to avoid timeout.'
        }}
      </p>
      <div class="sbt__disclaimer-warning icon">
        <s-icon name="notifications-alert-triangle-24" size="28px" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Mixins } from 'vue-property-decorator';

export default class SbtGuide extends Mixins(mixins.TranslationMixin) {}
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
</style>
