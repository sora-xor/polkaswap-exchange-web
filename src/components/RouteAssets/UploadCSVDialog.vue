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
import { Component, Mixins } from 'vue-property-decorator';
import { mixins, components } from '@soramitsu/soraneo-wallet-web';
@Component({
  components: {
    DialogBase: components.DialogBase,
  },
})
export default class RouteAssetsDialog extends Mixins(mixins.TransactionMixin, mixins.DialogMixin) {
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
  margin-top: 24px;
}
</style>
