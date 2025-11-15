import { FPNumber } from '@sora-substrate/sdk';
import type { CodecString } from '@sora-substrate/sdk';
export declare function useNumberFormatter(): {
  Zero: FPNumber;
  Hundred: FPNumber;
  MaxInputNumber: string;
  getFPNumber: (value: string | number, decimals?: number) => FPNumber;
  getFPNumberFromCodec: (value: CodecString, decimals?: number) => FPNumber;
  formatCodecNumber: (value: CodecString, decimals?: number) => string;
  formatStringValue: (value: string, decimals?: number) => string;
  getStringFromCodec: (value: CodecString, decimals?: number) => string;
  isCodecZero: (value: CodecString, decimals?: number) => boolean;
  getCorrectSupply: (tokenSupply: string, decimals: number) => string;
};
