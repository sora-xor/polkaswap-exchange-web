import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock();
});
vi.mock('@wallet/core', () => createWalletMock());

const mockAppKit = vi.hoisted(() => ({
  setRequestedCaipNetworks: vi.fn(),
  getCaipNetwork: vi.fn(() => ({ id: 1 })),
}));

const createAppKitMock = vi.hoisted(() => vi.fn(async () => mockAppKit));
const getWalletConnectProjectIdMock = vi.hoisted(() => vi.fn(async () => 'project-1'));

let ensureAppKit: (typeof import('@/utils/connection/evm/appkit'))['ensureAppKit'];
let resetAppKitCache: (typeof import('@/utils/connection/evm/appkit'))['resetAppKitCache'];

vi.mock('@/store', () => ({
  default: {
    state: {
      wallet: {
        settings: {
          slippageTolerance: '0',
          isWalletLoaded: true,
        },
      },
    },
    getters: {
      settings: {
        debugEnabled: false,
        liquiditySource: null,
      },
    },
  },
}));

vi.mock('@reown/appkit/vue', () => ({
  createAppKit: createAppKitMock,
}));

vi.mock('@/utils/connection/evm/walletconnectProject', () => ({
  getWalletConnectProjectId: getWalletConnectProjectIdMock,
}));

describe('AppKit integration', () => {
  beforeEach(async () => {
    const module = await import('@/utils/connection/evm/appkit');
    ensureAppKit = module.ensureAppKit;
    resetAppKitCache = module.resetAppKitCache;

    resetAppKitCache();
    vi.clearAllMocks();
    mockAppKit.getCaipNetwork.mockImplementation(() => ({ id: 1 }));
    (globalThis as any).window = {
      location: {
        origin: 'https://app.example',
        href: 'https://app.example/ipfs/QmCid/index.html#/swap',
      },
    };
  });

  afterEach(() => {
    delete (globalThis as any).window;
  });

  it('creates AppKit once per project id and initialises requested networks', async () => {
    await ensureAppKit({ chains: [1], optionalChains: [137] } as any);

    expect(createAppKitMock).toHaveBeenCalledTimes(1);

    const metadata = createAppKitMock.mock.calls[0][0].metadata;

    expect(metadata).toMatchObject({
      url: 'https://app.example/ipfs/QmCid/index.html#/swap',
      icons: ['https://app.example/ipfs/QmCid/favicon.ico'],
    });
    expect(mockAppKit.setRequestedCaipNetworks).toHaveBeenCalledWith(expect.any(Array), 'eip155');
    expect(mockAppKit.getCaipNetwork).toHaveBeenCalled();
  });

  it('recreates AppKit when the project id changes', async () => {
    await ensureAppKit({ chains: [1] } as any);

    getWalletConnectProjectIdMock.mockResolvedValueOnce('project-2');

    await ensureAppKit({ chains: [1] } as any);

    expect(createAppKitMock).toHaveBeenCalledTimes(2);
  });
});
