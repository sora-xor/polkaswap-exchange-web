import { LoginStep } from '../../../consts';
import { default as NotificationMixin } from '../../mixins/NotificationMixin';
import { CreateAccountArgs, RestoreAccountArgs } from '../../../store/account/types';
import { KeyringPair$Json } from '../../../types/common';

declare const ImportAccountStep_base: import('vue-class-component').VueConstructor<
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
    import('vue').ShallowUnwrapRef<{}> & {} & import('vue').ComponentCustomProperties & {} & import('vue-class-component').ClassComponentHooks
>;
export default class ImportAccountStep extends ImportAccountStep_base {
  readonly step: LoginStep;
  readonly jsonOnly: boolean;
  readonly loading: boolean;
  readonly createAccount: (data: CreateAccountArgs) => Promise<void>;
  readonly restoreAccount: (data: RestoreAccountArgs) => void;
  readonly uploader: HTMLFormElement;
  readonly LoginStep: typeof LoginStep;
  readonly PhraseLength = 12;
  readonly Tutorials: {
    logo: any;
    title: string;
    link: string;
  }[];
  mnemonicPhrase: string;
  accountName: string;
  accountPassword: string;
  accountPasswordConfirm: string;
  json: Nullable<KeyringPair$Json>;
  get disabledNextStep(): boolean;
  get disabledImportStep(): boolean;
  get computedClasses(): string;
  get importSteps(): string[];
  handleMnemonicInput(char: string): void;
  nextStep(): void;
  handleUploadJson(jsonFile: File): Promise<void>;
  importAccount(): Promise<void>;
  private resetForm;
}
export {};
