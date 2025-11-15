import { FPNumber } from '@sora-substrate/math';

import { MaxRustNumber } from '../assets/consts';

export class Consts {
  /** Zero string */
  static readonly ZERO_STR = '0';
  /** Max `Rust` number value */
  static readonly MAX = new FPNumber(MaxRustNumber);
}
