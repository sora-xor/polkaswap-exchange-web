import { LoginStep } from '../../../consts';
import { default as NotificationMixin } from '../../mixins/NotificationMixin';
import { CreateAccountArgs } from '../../../store/account/types';
import { WithKeyring } from '@sora-substrate/sdk';

declare const CreateAccountStep_base: import('vue-class-component').VueConstructor<
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
export default class CreateAccountStep extends CreateAccountStep_base {
  readonly ColumnsCount = 3;
  readonly LoginStep: typeof LoginStep;
  readonly PhraseLength = 12;
  readonly chainApi: WithKeyring;
  readonly step: LoginStep;
  readonly selectedWalletTitle: string;
  readonly loading: boolean;
  readonly createAccount: (data: CreateAccountArgs) => Promise<void>;
  private resetSeedPhraseToCompareIdx;
  accountName: string;
  accountPassword: string;
  accountPasswordConfirm: string;
  seedPhraseToCompareIdx: Array<number>;
  showErrorMessage: boolean;
  toExport: boolean;
  incorrect: boolean;
  get stepNumber(): number;
  get btnTextConfirmStep(): string;
  get btnTypeConfirmStep(): string;
  get btnConfirmDisabled(): boolean;
  get isInputsNotFilled(): boolean;
  get arePasswordsEqual(): boolean;
  get seedPhrase(): string;
  get seedPhraseWords(): Array<string>;
  get randomizedSeedPhraseMap(): Record<number, string>;
  get seedPhraseToCompare(): Array<string>;
  isHiddenWord(wordIndex: number): boolean;
  chooseWord(index: number): void;
  discardWord(index: number): void;
  handleCopy(): Promise<void>;
  renderWord(column: number, index: number): boolean;
  nextStep(): void;
  handleMnemonicCheck(): void;
  runErrorMessage(): void;
  runReturnAnimation(): void;
  handleAccountCreate(): Promise<void>;
}
export {};
