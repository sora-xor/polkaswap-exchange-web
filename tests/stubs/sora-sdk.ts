import { FPNumber } from '@sora-substrate/math';

export { FPNumber };
export class Storage {
  // minimal stub
  constructor(public name?: string) {}
}
export const isEthOperation = () => false;
export const isEvmOperation = () => false;
export const isSubstrateOperation = () => false;
export type IBridgeTransaction = any;
