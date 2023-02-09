<template>
  <div class="tos" v-loading="parentLoading">
    <div class="tos__disclaimer">
      <h4 class="tos__disclaimer-header">Discaimer</h4>
      <p class="tos__disclaimer-paragraph">
        To get an IBAN account needed for the SORA Card, users are required to undergo a KYC process with the card
        issuer. This is required compliance. The SORA community does not and will not collect any of your personal data.
      </p>
      <div class="tos__disclaimer-warning icon">
        <s-icon name="notifications-alert-triangle-24" size="28px" />
      </div>
    </div>
    <div class="tos__section">
      <div class="tos__section-block" @click="openDialog('t&c')">
        <span class="tos__section-point">{{ termsAndConditionsTitle }}</span>
        <s-icon name="arrows-circle-chevron-right-24" size="18px" class="tos__section-icon" />
      </div>
      <div class="line" />
      <div class="tos__section-block" @click="openDialog('privacyPolicy')">
        <span class="tos__section-point">{{ privacyPolicyTitle }}</span>
        <s-icon name="arrows-circle-chevron-right-24" size="18px" class="tos__section-icon" />
      </div>
      <div class="line" />
      <div class="tos__section-block" @click="openDialog('unsupported')">
        <span class="tos__section-point">{{ unsupportedCountriesTitle }}</span>
        <s-icon name="arrows-circle-chevron-right-24" size="18px" class="tos__section-icon" />
      </div>
    </div>
    <s-button type="primary" class="sora-card__btn s-typography-button--large" @click="handleConfirmToS">
      <span class="text">ACCEPT & CONTINUE</span>
    </s-button>
    <tos-dialog :visible.sync="showDialog" :srcLink="link" :title="dialogTitle" :key="link" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Components, TosExternalLinks } from '@/consts';
import { lazyComponent } from '@/router';
import TranslationMixin from '../../mixins/TranslationMixin';
import { getter } from '@/store/decorators';
import { Theme } from '@soramitsu/soramitsu-js-ui';

@Component({
  components: {
    TosDialog: lazyComponent(Components.ToSDialog),
  },
})
export default class TermsAndConditions extends Mixins(TranslationMixin, mixins.LoadingMixin) {
  showDialog = false;
  nonSupportedCountriesDialog = false;
  dialogTitle = '';
  link = '';

  termsAndConditionsTitle = 'Terms & Conditions';
  privacyPolicyTitle = 'Privacy Policy';
  unsupportedCountriesTitle = 'Unsupported Сountries';

  @getter.libraryTheme libraryTheme!: Theme;

  get termsLink(): string {
    return TosExternalLinks.getLinks(this.libraryTheme).Terms;
  }

  get privacyLink(): string {
    return TosExternalLinks.getLinks(this.libraryTheme).Privacy;
  }

  handleConfirmToS(): void {
    this.$emit('confirm');
  }

  openDialog(policy: string): void {
    if (policy === 't&c') {
      this.link = this.termsLink;
      this.dialogTitle = this.termsAndConditionsTitle;
    }
    if (policy === 'privacyPolicy') {
      this.link = this.privacyLink;
      this.dialogTitle = this.privacyPolicyTitle;
    }
    if (policy === 'unsupported') {
      this.link = '';
      this.dialogTitle = this.unsupportedCountriesTitle;
    }
    this.showDialog = true;
  }
}
</script>

<style lang="scss">
.tos {
  &__disclaimer {
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

  &__section {
    width: 100%;
    background-color: var(--s-color-base-background);
    border-radius: var(--s-border-radius-small);
    box-shadow: var(--s-shadow-dialog);
    padding: 20px $basic-spacing;
    margin-bottom: $basic-spacing;
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
      padding-right: var(--s-size-mini);
    }

    &-paragraph {
      color: var(--s-color-base-content-secondary);
      margin-bottom: var(--s-size-mini);
      padding-right: var(--s-size-mini);
    }
  }

  .sora-card__btn {
    width: 100%;
  }

  .line {
    height: 1px;
    margin: 14px 0;
    background-color: var(--s-color-base-border-secondary);
  }
}
</style>
