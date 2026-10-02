import { readonly, ref } from 'vue';
import type { TonConnectUI } from '@tonconnect/ui';

const address = ref('');
const chain = ref('');
let instance: Promise<TonConnectUI> | undefined;

/** Loads TON Connect only when the user explicitly opens the TON connection step. */
export async function getTonswapTonWallet(): Promise<TonConnectUI> {
  if (!instance) {
    instance = import('@tonconnect/ui')
      .then(({ TonConnectUI, toUserFriendlyAddress }) => {
        const client = new TonConnectUI({ manifestUrl: 'https://polkaswap.io/tonconnect-manifest.json' });
        client.onStatusChange((wallet) => {
          address.value = wallet ? toUserFriendlyAddress(wallet.account.address, wallet.account.chain !== '-239') : '';
          chain.value = wallet?.account.chain ?? '';
        });
        return client;
      })
      .catch((error: unknown) => {
        instance = undefined;
        throw error;
      });
  }
  return instance;
}

/** Shares one wallet session; the transaction adapter must still verify account and mainnet before signing. */
export function useTonswapTonWallet() {
  return {
    address: readonly(address),
    chain: readonly(chain),
    connect: async (): Promise<void> => {
      await (await getTonswapTonWallet()).openModal();
    },
    disconnect: async (): Promise<void> => {
      await (await getTonswapTonWallet()).disconnect();
    },
  };
}
