<template>
  <dialog-base :visible.sync="isVisible" class="x1-dialog">
    <div class="error-info-banner">
      <s-icon class="error-info-banner__icon" name="basic-clear-X-24" size="64px" />
      <h4 class="error-info-banner__header">The payment widget is currently unavailable</h4>
      <p class="error-info-banner__text">
        {{ t('fiatPayment.errorMessage') }}
      </p>
      <s-button
        class="error-info-banner__btn s-typography-button--large"
        type="primary"
        :disabled="loading"
        @click="closeDialog"
      >
        {{ t('browserNotificationDialog.agree') }}
      </s-button>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

@Component({
  components: {
    DialogBase: components.DialogBase,
  },
})
export default class PaymentError extends Mixins(mixins.DialogMixin, mixins.LoadingMixin, mixins.TranslationMixin) {}
</script>

<style lang="scss">
.error-info-banner {
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
