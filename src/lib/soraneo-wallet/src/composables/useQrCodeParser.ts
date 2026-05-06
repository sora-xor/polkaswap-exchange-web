import { computed } from 'vue';

import { useWalletStore } from '@/stores/wallet';

import { api } from '../api';
import { RouteNames } from '../consts';
import { formatAccountAddress } from '../util';

import { useNotification } from './useNotification';

import type { WalletNavigationTarget } from '@/platform/wallet/navigation';
import type { AssetsTable } from '../types/common';
import type { Asset, AccountAsset } from '@sora-substrate/sdk/build/assets/types';

const reject = (message: string) => {
  throw new Error(`[QR Code]: ${message}`);
};

export function useQrCodeParser() {
  const walletStore = useWalletStore();
  const { showAppNotification, t } = useNotification();

  const assetsDataTable = computed(() => walletStore.assetsDataTable);

  const navigate = (options: WalletNavigationTarget): Promise<void> => {
    walletStore.navigate(options);
    return Promise.resolve();
  };

  const checkAddress = (address: string): string => {
    if (!address) reject(`Account address not provided: ${address}`);

    const formatted = formatAccountAddress(address, true, api);

    if (!formatted) reject(`Invalid address: ${address}`);

    return formatted;
  };

  const checkAsset = (assetId: string): Asset => {
    if (!assetId) reject(`Asset ID not provided: ${assetId}`);

    const asset = (assetsDataTable.value as AssetsTable)[assetId];

    if (!asset) reject(`Unsupported asset: ${assetId}`);

    return asset;
  };

  const checkPublicKey = (publicKey: string, address: string): void => {
    if (!publicKey) reject(`Account public key not provided: ${publicKey}`);

    const publicKeyHex = `0x${api.getPublicKeyByAddress(address)}`;

    if (publicKeyHex !== publicKey) {
      reject(`Invalid public key: ${publicKey}`);
    }
  };

  const checkAmount = (amount?: string): void => {
    if (amount && !Number.isFinite(parseInt(amount))) {
      reject(`Invalid amount: ${amount}`);
    }
  };

  const parseQrCodeValue = async (value: Nullable<string>): Promise<void> => {
    try {
      if (!value) reject('QR Code not provided');

      const args = value.split(':');

      if (args.length === 1) {
        const address = checkAddress(args[0]);

        await navigate({
          name: RouteNames.SelectAsset,
          params: {
            address,
          },
        });

        return;
      }

      const [chain, accountAddress, publicKey, _accountName, assetId, amount] = args;

      if (chain !== 'substrate') reject(`Unsupported chain: ${chain}`);

      const address = checkAddress(accountAddress);
      const asset = checkAsset(assetId);

      checkPublicKey(publicKey, address);
      checkAmount(amount);

      await navigate({
        name: RouteNames.WalletSend,
        params: {
          asset,
          address,
          amount,
        },
      });
    } catch (error) {
      console.error(error);
      showAppNotification(t('code.invalid'), 'error');
    }
  };

  const receiveByQrCode = (asset: Nullable<AccountAsset>): void => {
    const name = asset ? RouteNames.ReceiveToken : RouteNames.SelectAsset;

    void navigate({
      name,
      params: {
        asset,
      },
    });
  };

  return {
    assetsDataTable,
    navigate,
    checkAddress,
    checkAsset,
    checkPublicKey,
    checkAmount,
    parseQrCodeValue,
    receiveByQrCode,
  };
}
