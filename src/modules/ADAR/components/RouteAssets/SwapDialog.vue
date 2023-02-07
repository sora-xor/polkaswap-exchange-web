<template>
  <div class="swap-dialog">
    <dialog-base :visible.sync="isVisible" :title="'Swap'" custom-class="dialog__swap">
      <Swap ref="swap" />
    </dialog-base>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop, Watch } from 'vue-property-decorator';
import { mixins, components } from '@soramitsu/soraneo-wallet-web';
import Swap from '@/views/Swap.vue';
import type { PresetSwapData } from '@/store/routeAssets/types';
import { FPNumber, NetworkFeesObject, Operation } from '@sora-substrate/util/build';
import { state } from '@/store/decorators';
import { XOR } from '@sora-substrate/util/build/assets/consts';
@Component({
  components: {
    DialogBase: components.DialogBase,
    Swap,
  },
})
export default class SwapDialog extends Mixins(mixins.TransactionMixin, mixins.DialogMixin) {
  @state.wallet.settings.networkFees private networkFees!: NetworkFeesObject;

  @Prop({ default: 0 }) presetSwapData!: PresetSwapData;

  get presetDataValueTo() {
    return this.presetSwapData.valueTo;
  }

  roundNumber(num) {
    return Math.ceil((num + Number.EPSILON) * 100) / 100;
  }

  get networkSwapFee(): number {
    return FPNumber.fromCodecValue(this.networkFees[Operation.Swap]).toNumber();
  }

  @Watch('visible')
  onVisibleChanged(newVal) {
    if (newVal) {
      this.$nextTick(async () => {
        const swapComponent = this.$refs.swap as any;
        if (swapComponent) {
          const { assetFrom, assetTo, valueTo } = this.presetSwapData;
          const isAssetToXor = assetTo.symbol === XOR.symbol;
          const fieldToValue = isAssetToXor ? valueTo + this.networkSwapFee : valueTo;
          swapComponent.handleInputFieldTo(`${this.roundNumber(fieldToValue)}`);
          await swapComponent.setTokenFromAddress(assetFrom.address);
          await swapComponent.setTokenToAddress(assetTo.address);
          swapComponent.handleFocusField(true);
        }
      });
    }
  }

  @Watch('presetDataValueTo')
  onValueToChanged(newVal) {
    if (newVal <= 0) {
      this.$emit('update:visible', false);
    }
  }
}
</script>

<style lang="scss">
.dialog__swap {
  z-index: 3000 !important;
  .el-dialog {
    max-width: 500px;
    padding: 20px;
    &__body {
      padding: 0 !important;
    }
  }
  .container {
    box-shadow: none;
  }

  .page-header {
    display: none;
  }
}
</style>

<style lang="scss" scoped>
.browse-button {
  width: 100%;
  margin-bottom: 16px;
  margin-top: 24px;
}
</style>
