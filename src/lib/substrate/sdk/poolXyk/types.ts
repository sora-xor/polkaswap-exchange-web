import type { CodecString } from '@sora-substrate/math';

export interface AccountLiquidity {
  address: string;
  balance: CodecString; // value * 10 ^ decimals
  symbol?: string;
  name?: string;
  decimals?: number;
  decimals2?: number;
  firstAddress: string;
  secondAddress: string;
  firstBalance: CodecString; // value * 10 ^ decimals
  secondBalance: CodecString; // value * 10 ^ decimals
  poolShare: string;
  reserveA: CodecString;
  reserveB: CodecString;
  totalSupply: CodecString;
}
