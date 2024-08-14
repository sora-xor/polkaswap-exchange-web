import { u8aToHex } from '@polkadot/util';
import { addressToEvm } from '@polkadot/util-crypto';

import { SubAdapter } from '../substrate';

export class MoonbaseParachainAdapter extends SubAdapter {
  // overrides SubAdapter method
  public formatAddress = (address?: string): string => {
    if (!address) return '';
    // [TODO] research how to get evm address as on moonbase
    return u8aToHex(addressToEvm(address));
  };
}
