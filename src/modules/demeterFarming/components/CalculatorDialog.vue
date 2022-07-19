<template>
  <dialog-base :visible.sync="isVisible" title="APR Calculator">
    <div class="calculator-dialog">
      <s-row v-if="poolAsset" flex align="middle">
        <pair-token-logo v-if="baseAsset" :first-token="baseAsset" :second-token="poolAsset" class="title-logo" />
        <token-logo v-else :token="poolAsset" class="title-logo" />
        <span class="calculator-dialog-title">
          <template v-if="baseAsset">{{ baseAsset.symbol }}-</template>{{ poolAsset.symbol }}
        </span>
      </s-row>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { components, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';

import PoolMixin from '../mixins/PoolMixin';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import DialogMixin from '@/components/mixins/DialogMixin';
import DialogBase from '@/components/DialogBase.vue';

import { lazyComponent } from '@/router';
import { Components } from '@/consts';

@Component({
  components: {
    DialogBase,
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    InfoLine: components.InfoLine,
    TokenLogo: components.TokenLogo,
    FormattedAmount: components.FormattedAmount,
  },
})
export default class CalculatorDialog extends Mixins(PoolMixin, TranslationMixin, DialogMixin) {
  readonly FontSizeRate = WALLET_CONSTS.FontSizeRate;
}
</script>

<style lang="scss" scoped>
.calculator-dialog {
  & > *:not(:last-child) {
    margin-top: $inner-spacing-medium;
  }

  &-title {
    font-size: var(--s-heading2-font-size);
    font-weight: 800;
  }

  .title-logo {
    margin-right: $inner-spacing-mini;
  }
}
</style>
