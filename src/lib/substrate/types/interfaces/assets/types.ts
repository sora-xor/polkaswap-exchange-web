// Auto-generated via `yarn polkadot-types-from-defs`, do not edit

import type { Null, Struct, Text, bool, u8 } from '@polkadot/types-codec';
import type { AssetId, Balance } from '@sora-substrate/types/interfaces/runtime';

/** @name AssetInfo */
export interface AssetInfo extends Struct {
  readonly assetId: AssetId;
  readonly symbol: AssetSymbolStr;
  readonly name: AssetNameStr;
  readonly precision: u8;
  readonly isMintable: bool;
}

/** @name AssetNameStr */
export interface AssetNameStr extends Text {}

/** @name AssetRecord */
export interface AssetRecord extends Null {}

/** @name AssetSymbolStr */
export interface AssetSymbolStr extends Text {}

/** @name BalanceInfo */
export interface BalanceInfo extends Struct {
  readonly balance: Balance;
}

export type PHANTOM_ASSETS = 'assets';
