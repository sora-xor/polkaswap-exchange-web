import { Options, mixins } from 'vue-property-decorator';

import { useRouterStore } from '@/stores/router';

import { api } from '../../api';
import { RouteNames } from '../../consts';
import { getter } from '../../store/decorators';
import { formatAccountAddress } from '../../util';

import NotificationMixin from './NotificationMixin';

import type { Route } from '../../store/router/types';
import type { AssetsTable } from '../../types/common';
import type { Asset, AccountAsset } from '@sora-substrate/sdk/build/assets/types';

const reject = (message: string) => {
  throw new Error(`[QR Code]: ${message}`);
};

@Options({})
export default class QrCodeParserMixin extends mixins(NotificationMixin) {
  @getter.account.assetsDataTable assetsDataTable!: AssetsTable;

  private get routerStore() {
    return useRouterStore((this as any).$pinia);
  }

  private navigate(options: Route): Promise<void> {
    this.routerStore.navigate(options);
    return Promise.resolve();
  }

  private checkAddress(address: string): string {
    if (!address) reject(`Account address not provided: ${address}`);

    const formatted = formatAccountAddress(address, true, api);

    if (!formatted) reject(`Invalid address: ${address}`);

    return formatted;
  }

  private checkAsset(assetId: string): Asset {
    if (!assetId) reject(`Asset ID not provided: ${assetId}`);

    const asset = this.assetsDataTable[assetId];

    if (!asset) reject(`Unsupported asset: ${assetId}`);

    return asset;
  }

  private checkPublicKey(publicKey: string, address: string): void {
    if (!publicKey) reject(`Account public key not provided: ${publicKey}`);

    const publicKeyHex = `0x${api.getPublicKeyByAddress(address)}`;

    if (publicKeyHex !== publicKey) {
      reject(`Invalid public key: ${publicKey}`);
    }
  }

  private checkAmount(amount?: string): void {
    if (amount && !Number.isFinite(parseInt(amount))) {
      reject(`Invalid amount: ${amount}`);
    }
  }

  async parseQrCodeValue(value: Nullable<string>): Promise<void> {
    try {
      if (!value) reject('QR Code not provided');

      const args = (value as string).split(':');

      // fearless extension qr support (account address only)
      if (args.length === 1) {
        const address = this.checkAddress(args[0]);

        this.navigate({
          name: RouteNames.SelectAsset,
          params: {
            address,
          },
        });

        return;
      }

      const [chain, accountAddress, publicKey, _accountName, assetId, amount] = args;

      if (chain !== 'substrate') reject(`Unsupported chain: ${chain}`);

      const address = this.checkAddress(accountAddress);
      const asset = this.checkAsset(assetId);

      this.checkPublicKey(publicKey, address);
      this.checkAmount(amount);

      this.navigate({
        name: RouteNames.WalletSend,
        params: {
          asset,
          address,
          amount,
        },
      });
    } catch (error) {
      console.error(error);
      this.showAppNotification(this.t('code.invalid'), 'error');
    }
  }

  receiveByQrCode(asset: Nullable<AccountAsset>): void {
    const name = asset ? RouteNames.ReceiveToken : RouteNames.SelectAsset;

    this.navigate({
      name,
      params: {
        asset,
      },
    });
  }
}
