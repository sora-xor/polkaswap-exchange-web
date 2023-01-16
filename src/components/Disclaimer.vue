<template>
  <div class="disclaimer">
    <div class="disclaimer__header">
      <div class="disclaimer__header-title">{{ disclaimerTitle }}</div>
      <s-icon class="disclaimer__header-close-btn" size="28px" name="basic-clear-X-xs-24" @click.native="handleClose" />
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
import { delay } from '@/utils';
import { mutation, state } from '@/store/decorators';
import { Links } from '@/consts';

@Component
export default class Disclaimer extends Mixins(TranslationMixin) {
  @state.settings.userDisclaimerApprove userDisclaimerApprove!: boolean;
  @mutation.settings.setUserDisclaimerApprove private setUserDisclaimerApprove!: () => void;
  @mutation.settings.setDisclaimerDialogVisibility private setDisclaimerDialogVisibility!: () => void;

  loadingAcceptBtn = false;

  async handleAccept(): Promise<void> {
    this.loadingAcceptBtn = true;
    await delay(1400);
    this.setUserDisclaimerApprove();
  }

  handleClose(): void {
    this.setDisclaimerDialogVisibility();
  }

  get disclaimerTitle(): string {
    return this.t('disclaimerTitle').slice(0, -1);
  }

  get disclaimerPrefix(): string {
    return `<span class="app-disclaimer__title">${this.t('disclaimerTitle')}</span>`;
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

<style lang="scss" scoped>
.disclaimer {
  background-color: var(--s-color-utility-surface);
  border-radius: var(--s-border-radius-medium);
  box-shadow: -5px -5px 10px #ffffff, 1px 1px 10px rgba(0, 0, 0, 0.1), inset 1px 1px 2px rgba(255, 255, 255, 0.8);
  width: 24%;
  padding: calc(var(--s-size-small) / 2);
  position: absolute;
  top: var(--s-size-mini);
  right: var(--s-size-mini);
  z-index: 5;

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
    box-shadow: 1px 1px 5px #ffffff, inset -5px -5px 5px rgba(255, 255, 255, 0.5), inset 1px 1px 10px rgba(0, 0, 0, 0.1);
    border-radius: var(--s-border-radius-medium);
    background-color: #f4f0f1;
    margin-top: 6px;
    padding: $basic-spacing;
    font-size: var(--s-font-size-extra-mini);
    font-weight: 300;
    line-height: var(--s-line-height-extra-small);
    letter-spacing: var(--s-letter-spacing-small);
    color: var(--s-color-base-content-secondary);
  }

  &__accept-btn {
    margin-top: $basic-spacing;
    width: 100%;
  }
}

[design-system-theme='dark'] {
  .disclaimer {
    box-shadow: -5px -5px 10px rgba(155, 111, 165, 0.25), 2px 2px 15px #492067,
      inset 1px 1px 2px rgba(155, 111, 165, 0.25);
  }
}
</style>
