<template>
  <div class="tos" v-loading="parentLoading">
    <p class="tos__pre-disclaimer">
      {{ t('card.termsAndConditionsPreDisclaimer') }}
    </p>
    <div class="tos__disclaimer">
      <h4 class="tos__disclaimer-header">{{ t('disclaimerTitle') }}</h4>
      <p class="tos__disclaimer-paragraph">
        {{ t('card.disclaimerCollectData') }}
      </p>
      <div class="tos__disclaimer-warning icon">
        <s-icon name="notifications-alert-triangle-24" size="28px" />
      </div>
    </div>
    <div class="tos__section">
      <div class="tos__section-block" @click="openDialog('t&c')">
        <span class="tos__section-point">{{ t(termsAndConditionsTitle) }}</span>
        <s-icon name="arrows-circle-chevron-right-24" size="18px" class="tos__section-icon" />
      </div>
      <div class="line" />
      <div class="tos__section-block" @click="openDialog('privacyPolicy')">
        <span class="tos__section-point">{{ t(privacyPolicyTitle) }}</span>
        <s-icon name="arrows-circle-chevron-right-24" size="18px" class="tos__section-icon" />
      </div>
      <div class="line" />
      <div class="tos__section-block" @click="openDialog('unsupported')">
        <span class="tos__section-point">{{ t(unsupportedCountriesTitle) }}</span>
        <s-icon name="arrows-circle-chevron-right-24" size="18px" class="tos__section-icon" />
      </div>
    </div>
    <p class="tos__continue-block">{{ t('card.termsAndConditionsWarning') }}</p>
    <s-button type="primary" class="sora-card__btn s-typography-button--large" @click="handleConfirmToS">
      <span class="text">{{ t('card.acceptAndContinue') }}</span>
    </s-button>
    <tos-dialog :visible.sync="showDialog" :srcLink="link" :title="t(dialogTitle)" :key="link" />
  </div>
</template>

<script lang="ts">
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components, TosExternalLinks } from '@/consts';
import { lazyComponent } from '@/router';
import { getter } from '@/store/decorators';
import { delay } from '@/utils';

import type Theme from '@soramitsu-ui/ui-vue2/lib/types/Theme';

type TermsAndConditionsType = 't&c' | 'privacyPolicy' | 'unsupported';

@Component({
  components: {
    TosDialog: lazyComponent(Components.ToSDialog),
  },
})
export default class TermsAndConditions extends Mixins(TranslationMixin, mixins.LoadingMixin) {
  readonly termsAndConditionsTitle = 'card.termsAndConditions';
  readonly privacyPolicyTitle = 'card.privacyPolicy';
  readonly unsupportedCountriesTitle = 'card.unsupportedCountries';

  @getter.libraryTheme private libraryTheme!: Theme;

  showDialog = false;
  dialogTitle = this.termsAndConditionsTitle;
  link = '';

  get termsLink(): string {
    return TosExternalLinks.getLinks(this.libraryTheme).Terms;
  }

  get privacyLink(): string {
    return TosExternalLinks.getLinks(this.libraryTheme).Privacy;
  }

  handleConfirmToS(): void {
    this.$emit('confirm');
  }

  async openDialog(policy: TermsAndConditionsType): Promise<void> {
    if (policy === 't&c') {
      this.link = this.termsLink;
      this.dialogTitle = this.termsAndConditionsTitle;
    } else if (policy === 'privacyPolicy') {
      this.link = this.privacyLink;
      this.dialogTitle = this.privacyPolicyTitle;
    } else if (policy === 'unsupported') {
      this.link = '';
      this.dialogTitle = this.unsupportedCountriesTitle;
    }
    await delay(); // small delay is required for dialog re-rendering
    this.showDialog = true;
  }
}
</script>

<style lang="scss" scoped>
.tos {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  &__pre-disclaimer {
    font-size: var(--s-font-size-small);
    margin-bottom: $basic-spacing;
    text-align: center;
    font-weight: 300;
    line-height: 150%;
    letter-spacing: -0.02em;
    width: 95%;
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

  &__continue-block {
    margin: 0 20px;
    text-align: center;
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
