<template>
  <div class="upload-csv-dialog">
    <dialog-base
      :visible.sync="isVisible"
      :title="t('adar.routeAssets.uploadCSV.uploadDialog.title')"
      custom-class="dialog__upload-csv"
    >
      <div>{{ t('adar.routeAssets.uploadCSV.uploadDialog.body') }}</div>
      <s-button type="primary" class="s-typography-button--big browse-button" @click.stop="onBrowseButtonClick">
        {{ t('adar.routeAssets.uploadCSV.uploadDialog.browseButton') }}
      </s-button>
      <input type="file" @change="uploadFile" ref="file" hidden />
    </dialog-base>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop, Watch } from 'vue-property-decorator';
import { mixins, components } from '@soramitsu/soraneo-wallet-web';
// import DialogMixin from '@/components/mixins/DialogMixin';
// import DialogBase from '@/components/DialogBase.vue';
import { lazyComponent } from '@/router';
import { Components } from '@/consts';
import { getter } from '@/store/decorators';
@Component({
  components: {
    DialogBase: components.DialogBase,
    TokenSelectButton: lazyComponent(Components.TokenSelectButton),
    FromList: lazyComponent('Templates/AddRecipient/FromList'),
    AddNewRecipient: lazyComponent('Templates/AddRecipient/AddNewRecipient'),
    BalanceCheck: lazyComponent('Templates/RouteAssets/BalanceCheck'),
    SelectRecievers: lazyComponent('Templates/RouteAssets/SelectRecievers'),
  },
})
export default class RouteAssetsDialog extends Mixins(mixins.TransactionMixin, mixins.DialogMixin) {
  //   @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;
  //   @Prop() readonly template!: Template;

  file = null;

  get fileElement() {
    return (this as any).$refs.file;
  }

  uploadFile() {
    this.$emit('onFileUploaded', this.fileElement.files[0]);
  }

  onBrowseButtonClick() {
    this.fileElement.click();
  }
}
</script>

<style lang="scss">
.dialog__upload-csv {
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
}
</style>
