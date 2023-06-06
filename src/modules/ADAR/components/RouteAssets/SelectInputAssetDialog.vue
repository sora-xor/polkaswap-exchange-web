<template>
  <div class="select-input-asset-dialog">
    <dialog-base :visible.sync="isVisible" :title="'Select an input asset'" custom-class="dialog__select-input-asset">
      <div>{{ 'Select an asset you want to work with' }}</div>
      <div>
        <AssetListItem v-for="(asset, idx) in assetList" :key="idx" :asset="asset" @click="onSelected(asset)">
          <template>
            <s-button
              class="wallet-assets__button el-button--details"
              type="action"
              size="small"
              alternative
              :tooltip="'Select'"
            >
              <s-icon name="arrows-chevron-right-rounded-24" size="28" />
            </s-button>
          </template>
        </AssetListItem>
      </div>
    </dialog-base>
  </div>
</template>

<script lang="ts">
import { AccountAsset } from '@sora-substrate/util/build/assets/types';
import { mixins, components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import { state } from '@/store/decorators';
@Component({
  components: {
    DialogBase: components.DialogBase,
    TokenAddress: components.TokenAddress,
    TokenLogo: components.TokenLogo,
    AssetListItem: components.AssetListItem,
  },
})
export default class SelectInputAssetDialog extends Mixins(mixins.TransactionMixin, mixins.DialogMixin) {
  @state.wallet.account.accountAssets private accountAssets!: Array<AccountAsset>;
  get fileElement() {
    return (this as any).$refs.file;
  }

  get assetList(): Array<AccountAsset> {
    return this.accountAssets.filter((item) => ['pswap', 'val', 'xor'].includes(item.symbol.toLowerCase()));
  }

  onSelected(asset) {
    this.$emit('onInputAssetSelected', asset);
  }
}
</script>

<style lang="scss">
.dialog__select-input-asset {
  .el-dialog {
    max-width: 468px;
    &__body {
      > div > div {
        margin-bottom: $inner-spacing-medium;
      }
    }
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
