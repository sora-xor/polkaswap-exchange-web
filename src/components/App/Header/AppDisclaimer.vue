<template>
  <div class="disclaimer">
    <div class="disclaimer__header">
      <div class="disclaimer__header-title">{{ t('disclaimerTitle') }}</div>
      <s-icon
        v-if="userDisclaimerApprove"
        class="disclaimer__header-close-btn"
        size="28px"
        name="basic-clear-X-xs-24"
        @click.native="handleClose"
      />
    </div>
    <div class="disclaimer__text">
      <p
        v-html="
          t('disclaimer', {
            disclaimerPrefix,
            polkaswapFaqLink,
            memorandumLink,
            privacyLink,
          })
        "
      />
      <p class="disclaimer__text-fiat">{{ t('fiatDisclaimer') }}</p>
    </div>
    <s-button
      v-if="!userDisclaimerApprove"
      :loading="loadingAcceptBtn"
      type="primary"
      @click="handleAccept"
      class="disclaimer__accept-btn"
    >
      {{ t('acceptText') }}
    </s-button>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Links } from '@/consts';
import { mutation, state } from '@/store/decorators';
import { delay } from '@/utils';

@Component
export default class AppDisclaimer extends Mixins(TranslationMixin) {
  @state.settings.userDisclaimerApprove userDisclaimerApprove!: boolean;
  @mutation.settings.setUserDisclaimerApprove private setUserDisclaimerApprove!: FnWithoutArgs;
  @mutation.settings.toggleDisclaimerDialogVisibility private toggleVisibility!: FnWithoutArgs;

  loadingAcceptBtn = false;

  async handleAccept(): Promise<void> {
    this.loadingAcceptBtn = true;
    await delay(1_200);
    this.setUserDisclaimerApprove();
    this.toggleVisibility();
  }

  handleClose(): void {
    this.toggleVisibility();
  }

  get disclaimerPrefix(): string {
    return `<span class="disclaimer__prefix">${this.t('disclaimerTitle')}:</span>`;
  }

  get memorandumLink(): string {
    return this.generateDisclaimerLink(Links.terms, this.t('memorandum'));
  }

  get privacyLink(): string {
    return this.generateDisclaimerLink(Links.privacy, this.t('helpDialog.privacyPolicy'));
  }

  get polkaswapFaqLink(): string {
    return this.generateDisclaimerLink(Links.faq, this.t('FAQ'));
  }

  generateDisclaimerLink(href: string, content: string): string {
    return `<a href="${href}" target="_blank" rel="nofollow noopener" class="link" title="${content}">${content}</a>`;
  }
}
</script>

<style lang="scss">
.disclaimer {
  &__prefix {
    color: var(--s-color-theme-accent);
  }
  .link {
    @include focus-outline;
  }
}
</style>

<style lang="scss" scoped>
.disclaimer {
  background-color: var(--s-color-utility-surface);
  border-radius: var(--s-border-radius-medium);
  box-shadow: var(--s-shadow-dialog);
  width: 24%;
  min-width: 335px;
  max-width: 550px;
  padding: calc(var(--s-size-small) / 2);
  position: absolute;
  top: var(--s-size-mini);
  right: var(--s-size-mini);
  z-index: $app-above-loader-layer;

  &__header {
    display: flex;
    justify-content: space-between;
    &-title {
      font-weight: 600;
      font-size: var(--s-font-size-small);
      display: flex;
      align-items: center;
    }

    &-close-btn {
      color: var(--s-color-base-content-tertiary);
      transition: var(--s-transition-default);
      &:hover {
        color: var(--s-color-base-content-secondary);
        cursor: pointer;
      }
    }
  }

  &__text {
    box-shadow: var(--s-shadow-dialog);
    border-radius: var(--s-border-radius-medium);
    background-color: var(--s-color-base-background);
    margin-top: 6px;
    padding: $basic-spacing;
    font-size: var(--s-font-size-extra-mini);
    font-weight: 300;
    line-height: var(--s-line-height-extra-small);
    letter-spacing: var(--s-letter-spacing-small);
    color: var(--s-color-base-content-secondary);

    &-fiat {
      margin-top: $basic-spacing;
    }
  }

  &__accept-btn {
    margin-top: $basic-spacing;
    width: 100%;
  }
}
</style>
