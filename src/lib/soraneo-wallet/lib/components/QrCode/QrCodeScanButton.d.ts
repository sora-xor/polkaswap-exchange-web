import { default as CameraPermissionMixin } from '../mixins/CameraPermissionMixin';
import { default as TranslationMixin } from '../mixins/TranslationMixin';
import { IScannerControls } from '@zxing/browser';
import { ComponentPublicInstance } from 'vue';

declare enum SCAN_TYPES {
  FILE = 'file',
  STREAM = 'stream',
}
declare const QrCodeScanButton_base: import('vue-class-component').VueConstructor<
  TranslationMixin &
    CameraPermissionMixin & {
      $: import('vue').ComponentInternalInstance;
      $data: {};
      $props: Partial<{}> &
        Omit<
          {} & import('vue').VNodeProps & import('vue').AllowedComponentProps & import('vue').ComponentCustomProps,
          never
        >;
      $attrs: {
        [x: string]: unknown;
      };
      $refs: {
        [x: string]: unknown;
      };
      $slots: Readonly<{
        [name: string]: import('vue').Slot<any> | undefined;
      }>;
      $root: ComponentPublicInstance | null;
      $parent: ComponentPublicInstance | null;
      $host: Element | null;
      $emit: (event: string, ...args: any[]) => void;
      $el: any;
      $options: import('vue').ComponentOptionsBase<
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        {},
        {},
        string,
        {},
        {},
        {},
        string,
        import('vue').ComponentProvideOptions
      > & {
        beforeCreate?: (() => void) | (() => void)[];
        created?: (() => void) | (() => void)[];
        beforeMount?: (() => void) | (() => void)[];
        mounted?: (() => void) | (() => void)[];
        beforeUpdate?: (() => void) | (() => void)[];
        updated?: (() => void) | (() => void)[];
        activated?: (() => void) | (() => void)[];
        deactivated?: (() => void) | (() => void)[];
        beforeDestroy?: (() => void) | (() => void)[];
        beforeUnmount?: (() => void) | (() => void)[];
        destroyed?: (() => void) | (() => void)[];
        unmounted?: (() => void) | (() => void)[];
        renderTracked?: ((e: import('vue').DebuggerEvent) => void) | ((e: import('vue').DebuggerEvent) => void)[];
        renderTriggered?: ((e: import('vue').DebuggerEvent) => void) | ((e: import('vue').DebuggerEvent) => void)[];
        errorCaptured?:
          | ((err: unknown, instance: ComponentPublicInstance | null, info: string) => boolean | void)
          | ((err: unknown, instance: ComponentPublicInstance | null, info: string) => boolean | void)[];
      };
      $forceUpdate: () => void;
      $nextTick: typeof import('vue').nextTick;
      $watch<T extends string | ((...args: any) => any)>(
        source: T,
        cb: T extends (...args: any) => infer R
          ? (...args: [R, R, import('@vue/reactivity').OnCleanup]) => any
          : (...args: [any, any, import('@vue/reactivity').OnCleanup]) => any,
        options?: import('vue').WatchOptions
      ): import('vue').WatchStopHandle;
    } & Readonly<{}> &
    Omit<unknown, never> &
    import('vue').ShallowUnwrapRef<{}> & {} & import('vue').ComponentCustomProperties & {} & import('vue-class-component').ClassComponentHooks
>;
export default class QrCodeScanButton extends QrCodeScanButton_base {
  readonly input: HTMLInputElement;
  readonly preview: HTMLVideoElement;
  readonly dropdown: ComponentPublicInstance;
  readonly scanTypes: typeof SCAN_TYPES;
  mediaDevices: MediaDeviceInfo[];
  selectedDeviceId: Nullable<string>;
  scanProcess: Nullable<IScannerControls>;
  scanDialogVisibility: boolean;
  get scanerDialog(): boolean;
  set scanerDialog(flag: boolean);
  get multipleMediaDevices(): boolean;
  handleButtonClick(): void;
  handleSelect(value: SCAN_TYPES): void;
  handleChangeDevice(deviceId: string): Promise<void>;
  openScanDialog(): Promise<void>;
  private startScanProcess;
  private stopScanProcess;
  openFileInput(): void;
  private resetFileInput;
  handleFileInput(event: Event): Promise<void>;
}
export {};
