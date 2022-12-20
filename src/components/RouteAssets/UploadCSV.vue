<template>
  <div class="container route-assets-upload-csv">
    <div class="route-assets-upload-csv__title">{{ t('adar.routeAssets.uploadCSV.title') }}</div>
    <div class="route-assets-upload-csv__description">{{ t('adar.routeAssets.uploadCSV.description') }}</div>
    <s-divider />
    <s-button
      type="primary"
      class="s-typography-button--big route-assets-upload-csv__button"
      @click.stop="
        () => {
          uploadCSVDialog = true;
        }
      "
    >
      {{ t('adar.routeAssets.uploadCSV.nextButton') }}
    </s-button>
    <s-button type="secondary" class="s-typography-button--big route-assets-upload-csv__button" @click.stop="() => {}">
      {{ t('adar.routeAssets.uploadCSV.downloadButton') }}
    </s-button>
    <upload-csv-dialog :visible.sync="uploadCSVDialog" @onFileUploaded="onFileUploaded"></upload-csv-dialog>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { Components } from '@/consts';
import { AdarComponents } from '@/consts/adar';
import { lazyComponent } from '@/router';
import TranslationMixin from '@/components/mixins/TranslationMixin';
@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    UploadCsvDialog: lazyComponent(AdarComponents.UploadCSVDialog),
  },
})
export default class UploadCSV extends Mixins(TranslationMixin) {
  uploadCSVDialog = false;

  onFileUploaded(file: any) {
    this.$emit('onUploadCSV', file);
  }
}
</script>

<style lang="scss">
.route-assets-upload-csv {
  width: 628px;
  text-align: center;
  font-weight: 300;
  font-feature-settings: 'case' on;

  &__title {
    font-size: 24px;
  }

  &__description {
    font-size: 16px;
  }

  > *:not(:last-child) {
    margin-bottom: $inner-spacing-big;
  }

  &__button {
    width: 100%;
  }
}
</style>

<style scoped lang="scss">
.container {
  min-height: auto;
}
</style>
