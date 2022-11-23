<template>
  <div class="tos" v-loading="parentLoading">
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
      <div class="tos__section-block" @click="openDialog('t&c')">
        <span class="tos__section-point">Terms & Conditions</span>
        <s-icon name="arrows-circle-chevron-right-24" size="18px" class="tos__section-icon" />
      </div>
      <div class="line" />
      <div class="tos__section-block" @click="openDialog('privacyPolicy')">
        <span class="tos__section-point">Privacy Policy</span>
        <s-icon name="arrows-circle-chevron-right-24" size="18px" class="tos__section-icon" />
      </div>
    </div>
    <s-button type="primary" class="sora-card__btn s-typography-button--large" @click="handleConfirmToS">
      <span class="text">ACCEPT & CONTINUE</span>
    </s-button>
    <terms-and-conditions-dialog :visible.sync="showTermsAndConditionsDialog" />
    <privacy-policy-dialog :visible.sync="showPrivacyPolicyDialog" />
  </div>
</template>

<script lang="ts">
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';
import TranslationMixin from '../../mixins/TranslationMixin';

@Component({
  components: {
    TermsAndConditionsDialog: lazyComponent(Components.TermsAndConditionsDialog),
    PrivacyPolicyDialog: lazyComponent(Components.PrivacyPolicyDialog),
  },
})
export default class TermsAndConditions extends Mixins(TranslationMixin, mixins.LoadingMixin) {
  showTermsAndConditionsDialog = false;
  showPrivacyPolicyDialog = false;

  handleConfirmToS(): void {
    this.$emit('confirm-tos');
  }

  openDialog(policy: string): void {
    if (policy === 't&c') this.showTermsAndConditionsDialog = true;
    if (policy === 'privacyPolicy') this.showPrivacyPolicyDialog = true;
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
      box-shadow: -4px -3px 30px rgba(255, 255, 255, 0.9), 20px 20px 60px rgba(0, 0, 0, 0.1), inset 1px 1px 10px #ffffff;
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
    background-color: var(--s-color-base-background);
    border-radius: var(--s-border-radius-small);
    box-shadow: -5px -5px 10px #ffffff, 1px 1px 10px rgba(0, 0, 0, 0.1), inset 1px 1px 2px rgba(255, 255, 255, 0.8);
    padding: 20px 16px;
    margin-bottom: 16px;
    position: relative;

    &-block {
      height: 26px;
      &:hover {
        cursor: pointer;
      }

      &:hover .tos__section-icon {
        color: var(--s-color-base-content-secondary);
      }
    }

    &-point {
      font-size: 17px;
      line-height: 26px;
      font-weight: 500;
    }

    &-icon {
      position: absolute;
      color: var(--s-color-base-content-tertiary);
      right: 20px;
      line-height: 26px;
      transition: 0.3s;
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

  .line {
    height: 1px;
    margin: 14px 0;
    background-color: var(--s-color-base-border-secondary);
  }
}

[design-system-theme='dark'] {
  .tos {
    &__disclaimer {
      box-shadow: -5px -5px 10px rgba(155, 111, 165, 0.25), 2px 2px 15px #492067,
        inset 1px 1px 2px rgba(155, 111, 165, 0.25);
    }
    &__section {
      box-shadow: -5px -5px 10px rgba(155, 111, 165, 0.25), 2px 2px 15px #492067,
        inset 1px 1px 2px rgba(155, 111, 165, 0.25);
    }
  }
}
</style>
