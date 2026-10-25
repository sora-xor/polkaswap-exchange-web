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

<script setup lang="ts">
import { computed, ref } from 'vue';

import { IMAGE_MIME_TYPES } from '../util/image';

const props = withDefaults(
  defineProps<{
    isLinkProvided?: boolean;
    accept?: string;
    limit?: number;
  }>(),
  {
    isLinkProvided: false,
    accept: Object.values(IMAGE_MIME_TYPES).join(','),
    limit: 100 * 1024 * 1024,
  }
);

const emit = defineEmits<{
  'hide-limit': [];
  'show-limit': [];
  upload: [file: File];
  clear: [];
}>();

const fileInput = ref<HTMLInputElement>();
const isFileDraggedOver = ref(false);
const isClearBtnShown = ref(false);

const dropZoneClass = computed(() => (isFileDraggedOver.value || props.isLinkProvided ? 'drop-zone--over' : ''));
const clearBtnShown = computed(() => isClearBtnShown.value || props.isLinkProvided);

function resetFileInput(): void {
  if (fileInput.value) {
    fileInput.value.value = '';
  }

  isClearBtnShown.value = false;
  isFileDraggedOver.value = false;
}

function upload(): void {
  if (!(fileInput.value && fileInput.value.files)) {
    resetFileInput();
    return;
  }

  emit('hide-limit');
  const file = fileInput.value.files[0];

  if (!file) {
    resetFileInput();
    return;
  }

  if (file.size > props.limit) {
    emit('show-limit');
    resetFileInput();
    return;
  }

  emit('upload', file);
  isFileDraggedOver.value = true;
  isClearBtnShown.value = true;
}

function dropImage(event: DragEvent): void {
  event.preventDefault();

  if (!(event.dataTransfer && event.dataTransfer.files[0] && props.accept.includes(event.dataTransfer.files[0].type))) {
    resetFileInput();
    return;
  }

  if (!fileInput.value) {
    resetFileInput();
    return;
  }

  fileInput.value.files = event.dataTransfer.files as FileList;
  upload();
}

function dragOver(): void {
  isFileDraggedOver.value = true;
}

function dragCancelled(): void {
  isFileDraggedOver.value = false;
}

function openFileUpload(): void {
  if (!fileInput.value || fileInput.value.files?.[0] || props.isLinkProvided) {
    return;
  }

  fileInput.value.click();
}

function clear(event: Event): void {
  event.stopPropagation();
  resetFileInput();
  emit('clear');
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
