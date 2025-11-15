import type { Prefix } from '@polkadot/util-crypto/address/types';
interface Account {
  address: string;
  publicKey: string;
}
interface Data {
  address: string;
  iconSize: number;
  isAlternativeIcon: boolean;
  publicKey: string;
  type: 'beachball' | 'empty' | 'jdenticon' | 'polkadot' | 'substrate';
}
export declare function encodeAccount(value: string | Uint8Array, prefix?: Prefix): Account;
/**
 * @name Identicon
 * @description The main Identicon component, taking a number of properties
 * @example
 * ```html
 * <Identicon :size="128" :theme="polkadot" :value="..." />
 * ```
 */
export declare const Identicon: import('vue').DefineComponent<
  string[],
  {},
  Data,
  {},
  {
    createData: () => void;
    recodeAddress: () => void;
  },
  import('vue').ComponentOptionsMixin,
  import('vue').ComponentOptionsMixin,
  {},
  string,
  Readonly<import('vue').ExtractPropTypes<string[]>>,
  {
    [x: number]: string;
  }
>;
export {};
