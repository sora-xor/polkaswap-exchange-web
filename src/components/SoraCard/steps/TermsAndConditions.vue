<template>
  <div class="tos">
    <div class="tos__disclaimer">
      <h4 class="tos__disclaimer-header">Discaimer</h4>
      <p class="tos__disclaimer-paragraph">
        SORA community does not collect any of your personal data, but to get the SORA Card and IBAN account you need to
        go through KYC process with a card issuer.
      </p>
      <div class="tos__disclaimer-warning-icon">
        <s-icon name="notifications-alert-triangle-24" size="28px" />
      </div>
    </div>
    <div class="tos__section">
      <s-scrollbar class="tos__section-scrollbar">
        <h4 class="tos__section-header">Cras pulvinar mattis nunc sed blandit libero</h4>
        <p class="tos__section-paragraph">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore
          magna aliqua. Mi sit amet mauris commodo quis imperdiet massa. Dui nunc mattis enim ut tellus elementum.
          Ultrices gravida dictum fusce ut placerat. Odio euismod lacinia at quis risus sed vulputate odio.
        </p>
        <h4 class="tos__section-header">Cras pulvinar mattis nunc sed blandit libero</h4>
        <p class="tos__section-paragraph">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore
          magna aliqua. Mi sit amet mauris commodo quis imperdiet massa. Dui nunc mattis enim ut tellus elementum.
          Ultrices gravida dictum fusce ut placerat. Odio euismod lacinia at quis risus sed vulputate odio.
        </p>
        <h4 class="tos__section-header">Cras pulvinar mattis nunc sed blandit libero</h4>
        <p class="tos__section-paragraph">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore
          magna aliqua. Mi sit amet mauris commodo quis imperdiet massa. Dui nunc mattis enim ut tellus elementum.
          Ultrices gravida dictum fusce ut placerat. Odio euismod lacinia at quis risus sed vulputate odio.
        </p>
      </s-scrollbar>
    </div>
    <s-button type="primary" class="sora-card__btn s-typography-button--large" @click="handleConfirmToS">
      ACCEPT & CONTINUE
    </s-button>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import TranslationMixin from '../../mixins/TranslationMixin';

@Component
export default class TermsAndConditions extends Mixins(TranslationMixin) {
  handleConfirmToS(): void {
    this.$emit('confirm-tos');
  }
}
</script>

<style lang="scss">
.tos {
  &__disclaimer {
    width: 100%;
    background-color: var(--s-color-base-background);
    border-radius: var(--s-border-radius-small);
    box-shadow: -5px -5px 10px #ffffff, 1px 1px 10px rgba(0, 0, 0, 0.1), inset 1px 1px 2px rgba(255, 255, 255, 0.8);
    padding: 20px 16px;
    margin-bottom: 16px;
    position: relative;

    &-header {
      font-weight: 500;
      margin-bottom: 10px;
    }

    &-paragraph {
      color: var(--s-color-base-content-secondary);
      margin-bottom: 8px;
    }

    &-warning-icon {
      position: absolute;
      background-color: #479aef;
      border: 2.25257px solid #f7f3f4 !important;
      box-shadow: -10px -10px 30px rgba(255, 255, 255, 0.9), 20px 20px 60px rgba(0, 0, 0, 0.1),
        inset 1px 1px 10px #ffffff;
      top: 20px;
      right: 20px;
      border-radius: 50%;
      color: #fff;
      width: 46px !important;
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

  &__section {
    width: 100%;
    height: 320px;
    background-color: var(--s-color-base-background);
    box-shadow: var(--s-shadow-element);
    border-radius: var(--s-border-radius-small);
    padding: 8px 8px 8px 16px;
    overflow: hidden;

    &-scrollbar {
      height: 320px;
      @include scrollbar;
    }

    &-header {
      font-weight: 500;
      margin-bottom: 10px;
      padding-right: 24px;
    }

    &-paragraph {
      color: var(--s-color-base-content-secondary);
      margin-bottom: 24px;
      padding-right: 24px;
    }
  }
}
</style>
