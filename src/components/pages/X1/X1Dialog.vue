<template>
  <dialog-base :visible.sync="isVisible">
    <div id="cede-widget" />
  </dialog-base>
</template>

<script lang="ts">
import { renderSendWidget } from '@cedelabs/widgets-universal';
import { components, mixins, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import Theme from '@soramitsu-ui/ui-vue2/lib/types/Theme';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import { getter, state } from '@/store/decorators';

@Component({
  components: {
    DialogBase: components.DialogBase,
  },
})
export default class X1Dialog extends Mixins(mixins.DialogMixin, mixins.LoadingMixin, mixins.TranslationMixin) {
  @state.wallet.settings.soraNetwork soraNetwork!: Nullable<WALLET_CONSTS.SoraNetwork>;
  @state.wallet.account.address accountAddress!: string;

  @getter.libraryTheme libraryTheme!: Theme;

  renderSendWidget = renderSendWidget;
  rootSelector = '#cede-widget';

  @Watch('isVisible', { immediate: true })
  private loadCedeWidget(): void {
    if (this.isVisible) {
      try {
        setTimeout(() => {
          renderSendWidget(this.rootSelector, {
            config: {
              tokenSymbol: 'XOR',
              network: 'polkadot',
              address: this.accountAddress,
              amount: '123.37',
            },
            theme: {
              mode: this.libraryTheme === Theme.LIGHT ? 'light' : 'dark',
              logoTheme: this.libraryTheme === Theme.LIGHT ? 'light' : 'dark',
              width: '450px',
            },
            title: 'Lorem ipsum sit dolor amet',
            description: 'Lorem ipsum sit dolor amet',
          });
        }, 0);
      } catch (error) {
        console.error(error);
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.disclaimer {
  display: flex;
  width: 100%;
  height: auto;
  border-radius: 28px;
  background-color: var(--s-color-status-error-background);
  padding: $basic-spacing;
  margin-bottom: $inner-spacing-small;

  & &-warning-icon {
    margin-right: $basic-spacing;

    .s-icon-notifications-alert-triangle-24 {
      display: block;
      color: var(--s-color-status-error);
    }
  }

  ul {
    margin-top: $inner-spacing-mini;
  }
}
[design-system-theme='dark'] .disclaimer-warning-icon .s-icon-notifications-alert-triangle-24 {
  color: var(--s-color-base-content-primary);
}

.x1-error-info-banner {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;

  &__header {
    font-size: var(--s-heading3-font-size);
    font-weight: 500;
  }

  &__text {
    margin-top: var(--s-size-mini);
    line-height: var(--s-font-size-large);
    font-size: var(--s-font-size-medium);
    font-weight: 300;
    width: 67%;
  }

  &__icon {
    display: block;
    color: var(--s-color-status-error);
    width: var(--s-size-mini);
    margin: -20px 20px $basic-spacing 0;
  }

  &__btn {
    margin-top: var(--s-size-mini);
    width: 100%;
  }
}
</style>
