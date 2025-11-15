import { default as FormattedAmountMixin } from './mixins/FormattedAmountMixin';
import { default as LoadingMixin } from './mixins/LoadingMixin';
import { default as TranslationMixin } from './mixins/TranslationMixin';
import { WalletPermissions } from '../consts';
import { AccountAsset } from '@sora-substrate/sdk/build/assets/types';

type DraggableMoveEvent<T> = {
  draggedContext: {
    element: T;
  };
  relatedContext: {
    element: T;
  };
};
declare const WalletAssets_base: import('vue-class-component').VueConstructor<
  TranslationMixin &
    LoadingMixin &
    FormattedAmountMixin & {
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
    import('vue').ShallowUnwrapRef<{}> & {} & import('vue').ComponentCustomProperties & {} & import('vue-class-component').ClassComponentHooks
>;
export default class WalletAssets extends WalletAssets_base {
  private accountAssets;
  private shouldBalanceBeHidden;
  permissions: WalletPermissions;
  private filters;
  private whitelist;
  isAssetPinned: (asset: AccountAsset) => boolean;
  private navigate;
  private setAccountAssets;
  private setPinnedAsset;
  private removePinnedAsset;
  private setMultiplePinnedAssets;
  get assetList(): Array<AccountAsset>;
  set assetList(accountAssets: Array<AccountAsset>);
  get visibleAssetList(): AccountAsset[];
  get assetsAreHidden(): boolean;
  get computedClasses(): string;
  get formattedAccountAssets(): Array<AccountAsset>;
  get assetsFiatAmount(): Nullable<string>;
  onMove(event: DraggableMoveEvent<AccountAsset>): boolean;
  getBalance(asset: AccountAsset): string;
  isZeroBalance(asset: AccountAsset): boolean;
  hasLockedBalance(asset: AccountAsset): boolean;
  formatFrozenBalance(asset: AccountAsset): string;
  handleAssetSwap(asset: AccountAsset): void;
  handleAssetSend(asset: AccountAsset): void;
  handleOpenAssetDetails(asset: AccountAsset): void;
  handleOpenAddAsset(): void;
  handlePin(asset: AccountAsset): void;
  private showAsset;
}
export {};
