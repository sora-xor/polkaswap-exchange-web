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

<script lang="ts">
import { BrowserQRCodeReader } from '@zxing/browser';
import { defineComponent } from 'vue';

import DialogBase from '../DialogBase.vue';
import CameraPermissionMixin from '../mixins/CameraPermissionMixin';
import TranslationMixin from '../mixins/TranslationMixin';
import NotificationEnablingPage from '../NotificationEnablingPage.vue';

import type { IScannerControls } from '@zxing/browser';

enum SCAN_TYPES {
  FILE = 'file',
  STREAM = 'stream',
}

const reader = new BrowserQRCodeReader();

export default defineComponent({
  components: {
    DialogBase,
    NotificationEnablingPage,
  },
  mixins: [TranslationMixin, CameraPermissionMixin],
  emits: ['change'],
  data() {
    return {
      scanTypes: SCAN_TYPES,
      mediaDevices: [] as MediaDeviceInfo[],
      selectedDeviceId: null as Nullable<string>,
      scanProcess: null as Nullable<IScannerControls>,
      scanDialogVisibility: false,
    };
  },
  computed: {
    scanerDialog: {
      get(this: any): boolean {
        return this.scanDialogVisibility;
      },
      set(this: any, flag: boolean) {
        this.scanDialogVisibility = flag;

        if (!flag) {
          this.stopScanProcess();
        }
      },
    },
    multipleMediaDevices(this: any): boolean {
      return this.mediaDevices.length > 1;
    },
  },
  methods: {
    handleButtonClick(this: any): void {
      // `dropdown` can be unavailable during fast route changes.
      const dropdown = (this.$refs as Record<string, any>).dropdown as
        | { $refs?: { dropdown?: { handleClick?: () => void } } }
        | undefined;
      dropdown?.$refs?.dropdown?.handleClick?.();
    },
    handleSelect(this: any, value: SCAN_TYPES): void {
      if (value === SCAN_TYPES.FILE) {
        this.openFileInput();
      } else {
        this.openScanDialog();
      }
    },
    async handleChangeDevice(this: any, deviceId: string): Promise<void> {
      this.selectedDeviceId = deviceId;
      await this.startScanProcess();
    },
    async openScanDialog(this: any): Promise<void> {
      try {
        const mediaDevicesAllowance = await this.checkMediaDevicesAllowance('QRcode');

        if (!mediaDevicesAllowance) return;

        // find video devices
        this.mediaDevices = await BrowserQRCodeReader.listVideoInputDevices();
        // if no video devices, return
        if (!this.mediaDevices.length) return;
        // open dialog
        this.scanerDialog = true;
        await this.$nextTick();

        await this.handleChangeDevice(this.mediaDevices[0].deviceId);
      } catch (error) {
        console.error('[QR Code]: Scan error.', error);
        this.scanerDialog = false;
      }
    },
    async startScanProcess(this: any): Promise<void> {
      if (!this.selectedDeviceId) return;

      // stop current scan
      this.stopScanProcess();

      console.info(`[QR Code]: Started decode from camera with id ${this.selectedDeviceId}`);

      const preview = (this.$refs as Record<string, any>).preview as HTMLVideoElement;

      // start scan process
      this.scanProcess = await reader.decodeFromVideoDevice(this.selectedDeviceId, preview, (result) => {
        if (result) {
          this.$emit('change', result.getText());
          this.scanerDialog = false;
        }
      });
    },
    stopScanProcess(this: any): void {
      if (this.scanProcess) {
        this.scanProcess.stop();
        this.scanProcess = null;
      }
    },
    openFileInput(this: any): void {
      const input = (this.$refs as Record<string, any>).input as HTMLInputElement | undefined;
      input?.click();
    },
    resetFileInput(this: any): void {
      const input = (this.$refs as Record<string, any>).input as HTMLInputElement | undefined;
      if (input) {
        input.value = '';
      }
    },
    async handleFileInput(this: any, event: Event): Promise<void> {
      const value = await new Promise((resolve) => {
        const input = event.target as HTMLInputElement;

        if (!input) return resolve(null);

        const files = input.files;

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

      this.$emit('change', value);
      this.resetFileInput();
    },
  },
});
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
