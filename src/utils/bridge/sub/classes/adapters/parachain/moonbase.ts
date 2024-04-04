import ethersUtil from '@/utils/ethers-util';

import { SubAdapter } from '../substrate';

export class MoonbaseParachainAdapter extends SubAdapter {
  // overrides SubAdapter method
  public formatAddress = (address?: string): string => {
    if (!address) return '';

    return ethersUtil.accountAddressToEvm(address);
  };
}
