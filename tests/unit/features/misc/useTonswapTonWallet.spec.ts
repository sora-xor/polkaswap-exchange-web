import { describe, expect, it, vi } from 'vitest';
import { getTonswapTonWallet, useTonswapTonWallet } from '@/features/misc/composables/useTonswapTonWallet';
const mock = vi.hoisted(() => ({
  status: undefined as undefined | ((wallet: unknown) => void),
  open: vi.fn(),
  disconnect: vi.fn(),
  create: vi.fn(),
}));
vi.mock('@tonconnect/ui', () => ({
  TonConnectUI: class {
    constructor(options: unknown) {
      mock.create(options);
    }
    onStatusChange(callback: (wallet: unknown) => void) {
      mock.status = callback;
    }
    openModal = mock.open;
    disconnect = mock.disconnect;
  },
  toUserFriendlyAddress: (address: string, testnet: boolean) => `${testnet ? 'test' : 'main'}:${address}`,
}));
describe('lazy TON wallet connection', () => {
  it('opens only on demand, shares the client, and exposes account/network changes', async () => {
    const wallet = useTonswapTonWallet();
    expect(mock.create).not.toHaveBeenCalled();
    await wallet.connect();
    await getTonswapTonWallet();
    expect(mock.create).toHaveBeenCalledTimes(1);
    expect(mock.create).toHaveBeenCalledWith({ manifestUrl: 'https://polkaswap.io/tonconnect-manifest.json' });
    mock.status?.({ account: { address: 'raw', chain: '-239' } });
    expect(wallet.address.value).toBe('main:raw');
    expect(wallet.chain.value).toBe('-239');
    mock.status?.(null);
    expect(wallet.address.value).toBe('');
    await wallet.disconnect();
    expect(mock.disconnect).toHaveBeenCalledOnce();
  });
});
