<template>
  <div class="qr-code-container">
    <s-button
      v-bind="{
        type: 'action',
        size: 'small',
        ...$attrs,
      }"
      :tooltip="t('code.upload')"
      rounded
      class="qr-code-button"
      @click="handleButtonClick"
    >
      <s-dropdown
        ref="dropdown"
        type="ellipsis"
        border-radius="mini"
        icon="basic-scan-24"
        trigger="manual"
        class="qr-code-dropdown"
        tabindex="-1"
        @select="handleSelect"
      >
        <template #menu>
          <!-- TODO: Tabindex Check this place -->
          <s-dropdown-item
            icon="basic-dashboard-24"
            :value="scanTypes.FILE"
            class="qr-code-dropdown__item"
            tabindex="0"
          >
            {{ t('code.import') }}
          </s-dropdown-item>
          <s-dropdown-item icon="camera-16" :value="scanTypes.STREAM" class="qr-code-dropdown__item" tabindex="0">
            {{ t('code.scan') }}
          </s-dropdown-item>
        </template>
      </s-dropdown>
    </s-button>

    <input ref="input" type="file" class="qr-code-file" @change="handleFileInput" />

    <dialog-base v-model:visible="scanerDialog" :title="t('code.upload')">
      <div class="qr-code-stream">
        <video ref="preview" class="qr-code-stream-video"></video>
        <div class="mask">
          <div class="mask-box">
            <div class="mask-box-angle top-left"></div>
            <div class="mask-box-angle top-right"></div>
            <div class="mask-box-angle bottom-left"></div>
            <div class="mask-box-angle bottom-right"></div>
            <div class="mask-box-line"></div>
          </div>
          <div class="mask-bg"></div>
        </div>
      </div>
      <template #footer>
        <s-select
          v-if="multipleMediaDevices"
          :value="selectedDeviceId"
          :placeholder="t('code.camera')"
          border-radius="mini"
          popper-class="device-select-popper"
          @update:model-value="handleChangeDevice"
        >
          <s-option v-for="(device, index) in mediaDevices" :key="index" :label="device.label" :value="device.deviceId">
            {{ device.label }}
          </s-option>
        </s-select>
      </template>
    </dialog-base>

    <notification-enabling-page v-if="permissionDialogVisibility">{{
      t('code.allowanceRequest')
    }}</notification-enabling-page>
  </div>
</template>

<script setup lang="ts">
import { BrowserQRCodeReader } from '@zxing/browser';
import { computed, nextTick, ref } from 'vue';

import { useCameraPermission } from '../../composables/useCameraPermission';
import { useWalletTranslation } from '../../composables/useWalletTranslation';
import DialogBase from '../DialogBase.vue';
import NotificationEnablingPage from '../NotificationEnablingPage.vue';

import type { IScannerControls } from '@zxing/browser';

enum SCAN_TYPES {
  FILE = 'file',
  STREAM = 'stream',
}

const reader = new BrowserQRCodeReader();

const emit = defineEmits<{
  change: [value: Nullable<string>];
}>();

const { t } = useWalletTranslation();
const { permissionDialogVisibility, checkMediaDevicesAllowance } = useCameraPermission();

const dropdown = ref<{ $refs?: { dropdown?: { handleClick?: () => void } } }>();
const input = ref<HTMLInputElement>();
const preview = ref<HTMLVideoElement>();
const scanTypes = SCAN_TYPES;
const mediaDevices = ref<MediaDeviceInfo[]>([]);
const selectedDeviceId = ref<Nullable<string>>(null);
const scanProcess = ref<Nullable<IScannerControls>>(null);
const scanDialogVisibility = ref(false);

const scanerDialog = computed({
  get: (): boolean => scanDialogVisibility.value,
  set: (flag: boolean): void => {
    scanDialogVisibility.value = flag;

    if (!flag) {
      stopScanProcess();
    }
  },
});

const multipleMediaDevices = computed(() => mediaDevices.value.length > 1);

function handleButtonClick(): void {
  dropdown.value?.$refs?.dropdown?.handleClick?.();
}

function handleSelect(value: SCAN_TYPES): void {
  if (value === SCAN_TYPES.FILE) {
    openFileInput();
  } else {
    void openScanDialog();
  }
}

async function handleChangeDevice(deviceId: string): Promise<void> {
  selectedDeviceId.value = deviceId;
  await startScanProcess();
}

async function openScanDialog(): Promise<void> {
  try {
    const mediaDevicesAllowance = await checkMediaDevicesAllowance('QRcode');

    if (!mediaDevicesAllowance) return;

    mediaDevices.value = await BrowserQRCodeReader.listVideoInputDevices();
    if (!mediaDevices.value.length) return;

    scanerDialog.value = true;
    await nextTick();

    await handleChangeDevice(mediaDevices.value[0].deviceId);
  } catch (error) {
    console.error('[QR Code]: Scan error.', error);
    scanerDialog.value = false;
  }
}

async function startScanProcess(): Promise<void> {
  if (!selectedDeviceId.value || !preview.value) return;

  stopScanProcess();

  console.info(`[QR Code]: Started decode from camera with id ${selectedDeviceId.value}`);

  scanProcess.value = await reader.decodeFromVideoDevice(selectedDeviceId.value, preview.value, (result) => {
    if (result) {
      emit('change', result.getText());
      scanerDialog.value = false;
    }
  });
}

function stopScanProcess(): void {
  if (scanProcess.value) {
    scanProcess.value.stop();
    scanProcess.value = null;
  }
}

function openFileInput(): void {
  input.value?.click();
}

function resetFileInput(): void {
  if (input.value) {
    input.value.value = '';
  }
}

async function handleFileInput(event: Event): Promise<void> {
  const value = await new Promise<Nullable<string>>((resolve) => {
    const inputElement = event.target as HTMLInputElement;

    if (!inputElement) return resolve(null);

    const files = inputElement.files;

    if (!(files instanceof FileList)) return resolve(null);

    const file = files[0] as File;

    if (!file) return resolve(null);

    const fileReader = new FileReader();

    fileReader.addEventListener('load', async () => {
      try {
        const base64 = fileReader.result as string;
        const result = await reader.decodeFromImageUrl(base64);
        resolve(result.getText());
      } catch (error) {
        console.error(error);
        resolve(null);
      }
    });

    fileReader.readAsDataURL(file);
  });

  emit('change', value);
  resetFileInput();
}
</script>

<style lang="scss">
.qr-code {
  &-dropdown {
    &.el-dropdown {
      color: inherit;

      i.el-tooltip.el-dropdown-selfdefine {
        color: inherit;
      }
    }

    &__item.el-dropdown-menu__item {
      & > i {
        color: var(--s-color-base-content-tertiary);
      }
    }
  }
}
</style>

<style lang="scss" scoped>
@use 'sass:list';
$mask-box-border: 2px solid var(--s-color-theme-accent);
$mask-background-color: rgba(13, 13, 13, 0.5);
$mask-box-angles: (
  'top-left': (
    'top',
    'left',
  ),
  'top-right': (
    'top',
    'right',
  ),
  'bottom-left': (
    'bottom',
    'left',
  ),
  'bottom-right': (
    'bottom',
    'right',
  ),
);

.qr-code {
  &-container {
    display: inline-block;
  }

  &-file {
    display: none;
  }

  &-stream {
    position: relative;
    overflow: hidden;
    border-radius: var(--s-border-radius-small);
    width: 100%;
    padding-top: 100%;

    &-video {
      position: absolute;
      left: 50%;
      top: 0;
      height: 100%;
      transform: translateX(-50%);
    }
  }
}

.device-select {
  display: flex;
  flex-direction: column;
}

.mask {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  padding-top: 100%;

  &-bg {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    clip-path: polygon(0% 0%, 0% 100%, 25% 100%, 25% 25%, 75% 25%, 75% 75%, 25% 75%, 25% 100%, 100% 100%, 100% 0%);
    background-color: $mask-background-color;
  }

  &-box {
    position: absolute;
    top: 25%;
    left: 25%;
    width: 50%;
    height: 50%;

    &-line {
      width: 100%;
      height: 100%;
      border-bottom: $mask-box-border;
      animation: radar 4s infinite;
      animation-timing-function: cubic-bezier(0.5, 0, 0.5, 1);
    }

    &-angle {
      position: absolute;
      width: 15%;
      height: 15%;

      @each $class, $angle in $mask-box-angles {
        &.#{$class} {
          #{list.nth($angle, 1)}: 0;
          #{list.nth($angle, 2)}: 0;
          border-#{list.nth($angle, 2)}: $mask-box-border;
          border-#{list.nth($angle, 1)}: $mask-box-border;
          border-#{list.nth($angle, 1)}-#{list.nth($angle, 2)}-radius: 4px;
        }
      }
    }
  }
}

@keyframes radar {
  0% {
    transform: translateY(-75%);
  }

  50% {
    transform: translateY(-25%);
  }

  100% {
    transform: translateY(-75%);
  }
}
</style>
