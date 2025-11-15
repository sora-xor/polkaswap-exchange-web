import type { CodecString, NumberLike } from '@sora-substrate/math';

import type { History } from '../types';
import type { KnownSymbols } from './consts';

export type NativeSymbol =
  | KnownSymbols.XOR
  | KnownSymbols.VAL
  | KnownSymbols.PSWAP
  | KnownSymbols.KUSD
  | KnownSymbols.TBCD
  | KnownSymbols.XSTUSD
  | KnownSymbols.XST;
export type KnownSymbol = keyof typeof KnownSymbols;

export interface WhitelistItem {
  symbol: string;
  name: string;
  decimals: number;
  icon: string;
}

export interface WhitelistArrayItem extends WhitelistItem {
  address: string;
}

export type Whitelist = {
  [key: string]: WhitelistItem;
};

export type WhitelistIdsBySymbol = { [key: string]: string };

export type Blacklist = Array<string>;

/**
 * Account Balance structure. Each value === value * 10 ^ decimals
 */
export interface AccountBalance {
  /** [Substrate] "free" balance */
  free: CodecString;
  /** [Substrate] "reserved" balance */
  reserved: CodecString;
  /** [Substrate] "frozen" balance */
  frozen: CodecString;
  /** [SORA] "bonded" balance in referral system */
  bonded: CodecString;
  /** [SORA] "locked" balance ("reserved" + "frozen" + "bonded") */
  locked: CodecString;
  /** [SORA] total balance ("free" + "locked") */
  total: CodecString;
  /** [SORA] usable balance ("free" - "frozen") */
  transferable: CodecString;
}

export type Asset = {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  isMintable: boolean;
  content?: string;
  description?: string;
  type?: AssetType;
};

export type AccountAsset = Asset & {
  balance: AccountBalance;
};

export type RegisteredAsset = Asset & {
  externalAddress: string;
  externalDecimals: number;
};

export type RegisteredAccountAsset = RegisteredAsset &
  AccountAsset & {
    externalBalance: CodecString;
  };

export type TransferOptions = {
  feeType: 'xor' | 'asset' | 'partial';
  xorFee?: NumberLike;
  assetFee?: NumberLike;
  comment?: string;
};

export interface HistoryElementTransfer extends History {
  xorFee?: string;
  assetFee?: string;
  comment?: string;
}

export interface VestedTransferHistory extends History {
  /* Period in blocks */
  period: number;
  /* vesting percent (0 - 100) */
  percent: number;
  /* vesting start block */
  start: number;
}

export enum AssetTypes {
  Regular = 'Regular',
  NFT = 'NFT',
  Soulbound = 'Soulbound',
  Regulated = 'Regulated',
}

export type AssetType = keyof typeof AssetTypes;

export type UnlockPeriodDays = 1 | 7 | 30 | 60 | 90;
