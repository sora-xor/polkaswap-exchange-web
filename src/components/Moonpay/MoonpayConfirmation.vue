<template>
  <confirm-bridge-transaction-dialog
    :confirm-button-text="t('moonpay.buttons.transfer')"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <template #title>
      <moonpay-logo :theme="libraryTheme" />
    </template>
    <template #content-title>
      <div class="moonpay-confirmation__title">
        {{ t('moonpay.confirmations.txReady') }}
      </div>
    </template>
  </confirm-bridge-transaction-dialog>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { Getter } from 'vuex-class'
import Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import MoonpayLogo from '@/components/logo/Moonpay.vue'

import { lazyComponent } from '@/router'
import { Components } from '@/consts'

@Component({
  components: {
    MoonpayLogo,
    ConfirmBridgeTransactionDialog: lazyComponent(Components.ConfirmBridgeTransactionDialog)
  }
})
export default class MoonpayConfirmation extends Mixins(TranslationMixin) {
  @Getter libraryTheme!: Theme
}
</script>

<style lang="scss" scoped>
.moonpay-confirmation {
  &__title {
    font-size: var(--s-font-size-large);
    font-weight: 300;
    letter-spacing: var(--s-letter-spacing-mini);
    line-height: var(--s-line-height-small);
    margin-bottom: $inner-spacing-big;
  }
}
</style>
