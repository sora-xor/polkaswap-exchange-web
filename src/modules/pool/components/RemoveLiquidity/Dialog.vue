<template>
  <dialog-base
    :visible.sync="isVisible"
    :title="t('removeLiquidity.title')"
    :tooltip="t('removeLiquidity.description')"
  >
    <remove-liquidity-form @back="closeDialog" />
  </dialog-base>
</template>

<script lang="ts">
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { PoolComponents } from '@/modules/pool/consts';
import { poolLazyComponent } from '@/modules/pool/router';
import { action } from '@/store/decorators';

@Component({
  components: {
    RemoveLiquidityForm: poolLazyComponent(PoolComponents.RemoveLiquidityForm),
    DialogBase: components.DialogBase,
  },
})
export default class AddLiquidityDialog extends Mixins(mixins.DialogMixin, TranslationMixin) {
  @action.removeLiquidity.resetData private resetData!: AsyncFnWithoutArgs;

  @Watch('visible')
  private async handleDialogVisibility(value: boolean): Promise<void> {
    if (!value) {
      this.resetData();
    }
  }
}
</script>
