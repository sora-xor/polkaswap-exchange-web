import { defineComponent } from 'vue';

import { useRouterStore } from '@/stores/router';
import { useWalletStore } from '@/stores/wallet';

import { api } from '../../api';
import { RouteNames } from '../../consts';
import { formatAccountAddress } from '../../util';

import NotificationMixin from './NotificationMixin';

import type { Route } from '@/stores/router/types';
import type { AssetsTable } from '../../types/common';
import type { Asset, AccountAsset } from '@sora-substrate/sdk/build/assets/types';

const reject = (message: string) => {
  throw new Error(`[QR Code]: ${message}`);
};

export default defineComponent({
  mixins: [NotificationMixin],
  computed: {
    assetsDataTable(this: any) {
      return useWalletStore(this.$pinia).assetsDataTable;
    },
  },
  methods: {
    navigate(this: any, options: Route): Promise<void> {
      useRouterStore((this as any).$pinia).navigate(options);
      return Promise.resolve();
    },
    checkAddress(address: string): string {
      if (!address) reject(`Account address not provided: ${address}`);

      const formatted = formatAccountAddress(address, true, api);

      if (!formatted) reject(`Invalid address: ${address}`);

      return formatted;
    },
    checkAsset(this: any, assetId: string): Asset {
      if (!assetId) reject(`Asset ID not provided: ${assetId}`);

      const asset = (this.assetsDataTable as AssetsTable)[assetId];

      if (!asset) reject(`Unsupported asset: ${assetId}`);

      return asset;
    },
    checkPublicKey(publicKey: string, address: string): void {
      if (!publicKey) reject(`Account public key not provided: ${publicKey}`);

      const publicKeyHex = `0x${api.getPublicKeyByAddress(address)}`;

      if (publicKeyHex !== publicKey) {
        reject(`Invalid public key: ${publicKey}`);
      }
    },
    checkAmount(amount?: string): void {
      if (amount && !Number.isFinite(parseInt(amount))) {
        reject(`Invalid amount: ${amount}`);
      }
    },
    async parseQrCodeValue(this: any, value: Nullable<string>): Promise<void> {
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
    },
    receiveByQrCode(this: any, asset: Nullable<AccountAsset>): void {
      const name = asset ? RouteNames.ReceiveToken : RouteNames.SelectAsset;

      this.navigate({
        name,
        params: {
          asset,
        },
      });
    },
  },
});
