import { AppWallet } from '../../consts';
import { addWalletLocally, checkWallet } from '../../services/wallet';

import { SoraWallet } from './wallet';

import type { WithKeyring } from '@sora-substrate/sdk';

export const addSoraWalletLocally = (api: WithKeyring, dAppName: string): string => {
  try {
    checkWallet(AppWallet.Sora);
  } catch {
    const wallet = new SoraWallet(api);

    addWalletLocally(wallet, AppWallet.Sora, dAppName);
  }

  return AppWallet.Sora;
};
