<template>
  <div
    class="drop-zone"
    :class="dropZoneClass"
    @drop="dropImage"
    @dragenter.prevent
    @dragover.prevent="dragOver"
    @dragleave="dragCancelled"
    @dragend="dragCancelled"
    @click="openFileUpload"
  >
    <slot></slot>
    <div v-if="clearBtnShown" @click="clear">
      <s-icon class="clear-file-input-btn" name="basic-clear-X-24" size="64px"></s-icon>
    </div>
    <input ref="fileInput" class="drop-zone__input" type="file" :accept="accept" @change="upload" />
  </div>
</template>

<script lang="ts">
import { mixins, Options, Ref, Prop } from 'vue-property-decorator';

import { IMAGE_MIME_TYPES } from '../util/image';

import LoadingMixin from './mixins/LoadingMixin';
import TranslationMixin from './mixins/TranslationMixin';

const FILE_TYPES_LIST_STRING = Object.values(IMAGE_MIME_TYPES).join(',');

const HUNDRED_MB = 100 * 1024 * 1024; // 100MB in bytes

@Options({})
export default class FileUploader extends mixins(LoadingMixin, TranslationMixin) {
  /**
   * Boolean check for the external link
   */
  @Prop({ default: false, type: Boolean }) readonly isLinkProvided!: boolean;
  /**
   * Accepted format of files. `image/*` is set by default
   */
  @Prop({ default: FILE_TYPES_LIST_STRING, type: String }) readonly accept!: string;
  /**
   * Limit (in bytes) of the file. 100 MB is set by default.
   */
  @Prop({ default: HUNDRED_MB, type: Number }) readonly limit!: number;

  @Ref('fileInput') readonly fileInput!: HTMLInputElement;

  private isFileDraggedOver = false;
  private isClearBtnShown = false;

  get dropZoneClass(): string {
    return this.isFileDraggedOver || this.isLinkProvided ? 'drop-zone--over' : '';
  }

  get clearBtnShown(): boolean {
    return this.isClearBtnShown || this.isLinkProvided;
  }

  dropImage(event: DragEvent): void {
    event.preventDefault();

    if (
      !(event.dataTransfer && event.dataTransfer.files[0] && this.accept.includes(event.dataTransfer.files[0].type))
    ) {
      this.resetFileInput();
      return;
    }

    this.fileInput.files = event.dataTransfer.files as FileList;
    this.upload();
  }

  dragOver(): void {
    this.isFileDraggedOver = true;
  }

  dragCancelled(): void {
    this.isFileDraggedOver = false;
  }

  openFileUpload(): void {
    if ((this.fileInput.files as FileList)[0] || this.isLinkProvided) {
      return;
    }
    this.fileInput.click();
  }

  upload(): void {
    if (!(this.fileInput && this.fileInput.files)) {
      this.resetFileInput();
      return;
    }

    this.$emit('hide-limit');
    const file = this.fileInput.files[0];

    if (!file) {
      this.resetFileInput();
      return;
    }

    if (file.size > this.limit) {
      this.$emit('show-limit');
      this.resetFileInput();
      return;
    }

    this.$emit('upload', file);
    this.isFileDraggedOver = true;
    this.isClearBtnShown = true;
  }

  clear(e: Event): void {
    e.stopPropagation();
    this.resetFileInput();
    this.$emit('clear');
  }

  resetFileInput(): void {
    this.fileInput.value = '';
    this.isClearBtnShown = false;
    this.isFileDraggedOver = false;
  }
}
</script>

<style lang="scss">
.drop-zone {
  cursor: pointer;
  display: flex;
  justify-content: center;
  flex-direction: column;
  border: 2px dashed var(--s-color-base-content-tertiary);
  border-radius: var(--s-border-radius-small);
  padding: $basic-spacing-small;
  position: relative;
  width: 100%;

  &--over {
    border-style: solid;
    cursor: initial;
  }
  &__input {
    display: none;
  }
}

.clear-file-input-btn {
  position: absolute;
  right: 10px;
  top: 10px;
  color: var(--s-color-base-content-tertiary) !important;
  font-size: var(--s-size-small) !important;
  margin-bottom: calc(var(--s-size-small) / 2);
  &:hover {
    cursor: pointer;
  }
}
</style>
