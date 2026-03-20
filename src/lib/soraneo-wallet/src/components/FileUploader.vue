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
import { defineComponent } from 'vue';

import { IMAGE_MIME_TYPES } from '../util/image';

import LoadingMixin from './mixins/LoadingMixin';
import TranslationMixin from './mixins/TranslationMixin';

const FILE_TYPES_LIST_STRING = Object.values(IMAGE_MIME_TYPES).join(',');

const HUNDRED_MB = 100 * 1024 * 1024; // 100MB in bytes

export default defineComponent({
  mixins: [LoadingMixin, TranslationMixin],
  props: {
    /**
     * Boolean check for the external link
     */
    isLinkProvided: {
      default: false,
      type: Boolean,
    },
    /**
     * Accepted format of files. `image/*` is set by default
     */
    accept: {
      default: FILE_TYPES_LIST_STRING,
      type: String,
    },
    /**
     * Limit (in bytes) of the file. 100 MB is set by default.
     */
    limit: {
      default: HUNDRED_MB,
      type: Number,
    },
  },
  emits: ['hide-limit', 'show-limit', 'upload', 'clear'],
  data() {
    return {
      isFileDraggedOver: false,
      isClearBtnShown: false,
    };
  },
  computed: {
    dropZoneClass(this: any): string {
      return this.isFileDraggedOver || this.isLinkProvided ? 'drop-zone--over' : '';
    },
    clearBtnShown(this: any): boolean {
      return this.isClearBtnShown || this.isLinkProvided;
    },
  },
  methods: {
    dropImage(this: any, event: DragEvent): void {
      event.preventDefault();

      if (
        !(event.dataTransfer && event.dataTransfer.files[0] && this.accept.includes(event.dataTransfer.files[0].type))
      ) {
        this.resetFileInput();
        return;
      }

      const fileInput = (this.$refs as Record<string, any>).fileInput as HTMLInputElement | undefined;

      if (!fileInput) {
        this.resetFileInput();
        return;
      }

      fileInput.files = event.dataTransfer.files as FileList;
      this.upload();
    },
    dragOver(this: any): void {
      this.isFileDraggedOver = true;
    },
    dragCancelled(this: any): void {
      this.isFileDraggedOver = false;
    },
    openFileUpload(this: any): void {
      const fileInput = (this.$refs as Record<string, any>).fileInput as HTMLInputElement | undefined;

      if (!fileInput || fileInput.files?.[0] || this.isLinkProvided) {
        return;
      }

      fileInput.click();
    },
    upload(this: any): void {
      const fileInput = (this.$refs as Record<string, any>).fileInput as HTMLInputElement | undefined;

      if (!(fileInput && fileInput.files)) {
        this.resetFileInput();
        return;
      }

      this.$emit('hide-limit');
      const file = fileInput.files[0];

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
    },
    clear(this: any, event: Event): void {
      event.stopPropagation();
      this.resetFileInput();
      this.$emit('clear');
    },
    resetFileInput(this: any): void {
      const fileInput = (this.$refs as Record<string, any>).fileInput as HTMLInputElement | undefined;

      if (fileInput) {
        fileInput.value = '';
      }

      this.isClearBtnShown = false;
      this.isFileDraggedOver = false;
    },
  },
});
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
