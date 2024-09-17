<template>
  <dialog-base class="attach-regulated-dialog" :title="t('assetOwner.addRegulatedAssets')" :visible.sync="isVisible">
    <div class="asset-managers-options">
      <div class="asset-managers-options-add-new" @click="openAssetCreate('new')">
        <s-button type="action" icon="plus-16" :disabled="loading" />
        <h4>{{ t('assetOwner.dialog.createAsset') }}</h4>
        <p>{{ t('assetOwner.dialog.createAssetDesc', { type: WALLET_CONSTS.TranslationConsts.SBT }) }}</p>
      </div>
      <div class="asset-managers-options-add-new" @click="openAssetCreate('existing')">
        <s-button type="action" icon="search-16" :disabled="loading" />
        <h4>{{ t('assetOwner.dialog.addExisting') }}</h4>
        <p>{{ t('assetOwner.dialog.addExistingDesc') }}</p>
      </div>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { mixins, components, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import { DashboardPageNames } from '@/modules/dashboard/consts';
import type { AssetCreationType } from '@/modules/dashboard/types';
import router from '@/router';

@Component({
  components: {
    DialogBase: components.DialogBase,
    AddressBookInput: components.AddressBookInput,
  },
})
export default class AttachRegulatedDialog extends Mixins(mixins.TransactionMixin, mixins.DialogMixin) {
  readonly WALLET_CONSTS = WALLET_CONSTS;

  openAssetCreate(type: AssetCreationType): void {
    router.push({ name: DashboardPageNames.AssetOwnerCreate, params: { type, sbtAddress: this.$route.params.asset } });
  }
}
</script>

<style lang="scss">
.attach-regulated-dialog {
  .el-dialog {
    max-width: 640px;
  }
}
</style>
