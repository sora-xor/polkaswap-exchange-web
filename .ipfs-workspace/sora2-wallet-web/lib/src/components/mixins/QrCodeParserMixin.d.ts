import NotificationMixin from './NotificationMixin';
import type { Route } from '../../store/router/types';
import type { AssetsTable } from '../../types/common';
import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';
declare const QrCodeParserMixin_base: import('vue-class-component').VueConstructor<
  NotificationMixin & {
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
    $root: import('vue').ComponentPublicInstance | null;
    $parent: import('vue').ComponentPublicInstance | null;
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
        | ((err: unknown, instance: import('vue').ComponentPublicInstance | null, info: string) => boolean | void)
        | ((err: unknown, instance: import('vue').ComponentPublicInstance | null, info: string) => boolean | void)[];
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
    import('vue').ShallowUnwrapRef<{}> & {} & import('@vue/runtime-core').ComponentCustomProperties & {} & import('vue-class-component').ClassComponentHooks
>;
export default class QrCodeParserMixin extends QrCodeParserMixin_base {
  assetsDataTable: AssetsTable;
  navigate: (options: Route) => Promise<void>;
  private checkAddress;
  private checkAsset;
  private checkPublicKey;
  private checkAmount;
  parseQrCodeValue(value: Nullable<string>): Promise<void>;
  receiveByQrCode(asset: Nullable<AccountAsset>): void;
}
export {};
