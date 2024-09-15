<template>
  <dialog-base class="attach-regulated-dialog" :title="'Issue SBT Access'" :visible.sync="isVisible">
    <div class="asset-managers-options">
      <div class="asset-managers-options-add-new" @click="openAssetCreate('new')">
        <s-button type="action" icon="plus-16" :disabled="loading" />
        <h4>Create a new asset</h4>
        <p>Set up a new permissioned asset for the SBT</p>
      </div>
      <div class="asset-managers-options-add-new" @click="openAssetCreate('existing')">
        <s-button type="action" icon="search-16" :disabled="loading" />
        <h4>Add an existing asset</h4>
        <p>Add an already created asset for the SBT</p>
      </div>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { mixins, components } from '@soramitsu/soraneo-wallet-web';
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
