import { default as TranslationMixin } from '../mixins/TranslationMixin';
import { Book, PolkadotJsAccount } from '../../types/common';

declare const AddressBookInput_base: import('vue-class-component').VueConstructor<
  TranslationMixin & {
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
export default class AddressBookInput extends AddressBookInput_base {
  readonly excludeConnected: boolean;
  readonly value: string;
  readonly propPlaceholder: string;
  readonly isValid: boolean;
  readonly disabled: boolean;
  readonly onRemove: () => void;
  readonly canRemove: boolean;
  private updateContactName;
  get address(): string;
  set address(value: string);
  name: string;
  prefilledAddress: string;
  private connected;
  private source;
  addressBook: Book;
  setAddressToBook: (record: PolkadotJsAccount) => void;
  removeAddressFromBook: (address: string) => void;
  showAddressBookDialog: boolean;
  showSetContactDialog: boolean;
  isEditMode: boolean;
  accountsSubscription: Nullable<any>;
  accountsRecords: PolkadotJsAccount[];
  get accountBook(): Book;
  get books(): Book;
  get bookRecords(): PolkadotJsAccount[];
  get isNewAddress(): boolean;
  get excludedAddress(): string;
  get record(): Nullable<PolkadotJsAccount>;
  openAddressBook(): void;
  chooseRecord({ name, address }: PolkadotJsAccount): void;
  openContact(address: Nullable<string>, isEditMode?: boolean): void;
  resetAddress(): void;
  updateName(): void;
  mounted(): Promise<void>;
  beforeUnmount(): void;
  removeInput(): void;
}
export {};
