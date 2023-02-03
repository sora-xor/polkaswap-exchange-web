<template>
  <div v-if="!parsingError" class="container route-assets-upload-template">
    <div class="route-assets__page-header-title">Upload Routing Template for processing</div>
    <div class="route-assets__page-header-description">
      {{ `Upload your Process Routing Template as a .CSV file` }}
    </div>
    <div
      @dragover="dragover"
      @dragleave="dragleave"
      @drop="drop"
      class="dropping-area"
      :class="{ 'drag-over': dragOver }"
    >
      <div>
        <s-icon class="icon-divider" name="arrows-arrow-top-24" />
      </div>
      <p class="dropping-area__description">Drop your completed process routing template or click to upload</p>
      <p>Supported file types: CSV</p>
      <div>
        <s-button
          type="primary"
          class="s-typography-button--big route-assets-upload-template__button"
          @click.stop="onBrowseButtonClick"
        >
          {{ 'Upload' }}
        </s-button>
      </div>
    </div>
    <p class="route-assets-upload-template__label">
      Don’t have a template? <a href="/adar/template.csv" download class="route-assets__ref">Download</a>
    </p>
    <input type="file" @change="uploadFile" ref="file" hidden accept=".csv" />
  </div>
  <div v-else class="container route-assets-upload-template">
    <div class="route-assets__page-header-title">The .csv file couldn’t be parsed.</div>
    <div class="route-assets__page-header-description">
      {{ `Please, upload new file or re-start the process.` }}
    </div>
    <s-button type="primary" class="s-typography-button--big restart-button" @click.stop="onRestartClick">
      {{ 'RE-START PROCESS' }}
    </s-button>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { action } from '@/store/decorators';
@Component({
  components: {},
})
export default class UploadTemplate extends Mixins(TranslationMixin) {
  @action.routeAssets.updateRecipients private updateRecipients!: (file?: File) => Promise<void>;
  @action.routeAssets.processingNextStage nextStage!: () => void;
  @action.routeAssets.cancelProcessing private cancelProcessing!: () => void;
  dragOver = false;
  file: Nullable<File> = null;

  parsingError = false;

  dragover(event) {
    event.preventDefault();
    this.dragOver = true;
  }

  dragleave(event) {
    event.preventDefault();
    this.dragOver = false;
  }

  drop(event) {
    event.preventDefault();
    this.dragOver = false;
    (this as any).$refs.file.files = event.dataTransfer.files;
    this.uploadFile();
  }

  onRestartClick() {
    this.cancelProcessing();
    this.parsingError = false;
  }

  async uploadFile() {
    this.updateRecipients(this.fileElement.files[0])
      .then(() => {
        this.nextStage();
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.log(error);
        this.parsingError = true;
      });
  }

  onBrowseButtonClick() {
    this.fileElement.click();
  }

  get fileElement() {
    return (this as any).$refs.file;
  }
}
</script>

<style lang="scss">
.route-assets-upload-template {
  width: 464px;
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
    padding: inherit 30px;
  }

  &__label {
    font-weight: 300;
    font-size: 13px;
    line-height: 140%;
    color: var(--s-color-brand-day);
  }
}
</style>

<style scoped lang="scss">
.container {
  min-height: auto;
}

.dropping-area {
  border: 1px dashed var(--s-color-base-content-tertiary);
  border-radius: var(--s-border-radius-small);
  height: 255px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  padding: 28px 22px;

  &__description {
    font-weight: 400;
    font-size: 16px;
    line-height: 150%;
  }

  &.drag-over {
    filter: blur(2.2px) brightness(0.5);
    cursor: grab;
  }
}

.restart-button {
  width: 100%;
  margin-bottom: 16px;
  margin-left: 0;
  margin-right: 0;
}
</style>
