import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DAI, XOR, XSTUSD } from '@sora-substrate/sdk/build/assets/consts';

import { PageNames } from '@/consts';
import { useSelectedTokensRoute } from '@/shared/navigation/useSelectedTokensRoute';

type RouteParams = Record<string, string | undefined>;
type RouteUpdateTarget = { name?: string; params: RouteParams };
type RouteUpdateHandler = (
  to: RouteUpdateTarget,
  from: unknown,
  next: (location?: { name: string; params?: undefined }) => void
) => Promise<void> | void;

const mocks = vi.hoisted(() => ({
  route: {
    name: 'Swap',
    params: {} as RouteParams,
  },
  router: {
    replace: vi.fn(),
  },
  walletStore: {
    whitelistIdsBySymbol: {} as Record<string, string>,
    assetsDataTable: {} as Record<string, { address: string; symbol?: string }>,
    assets: [] as Array<{ address: string; symbol?: string }>,
  },
  baseAssetAddress: '0xbase000000000000000000000000000000000000000000000000000000000000',
  quoteAssetAddress: '0xquote00000000000000000000000000000000000000000000000000000000000',
  xstUsdAddress: 'xstusd',
  routeUpdateHandler: undefined as RouteUpdateHandler | undefined,
}));

vi.mock('vue-router', () => ({
  useRoute: () => mocks.route,
  useRouter: () => mocks.router,
  onBeforeRouteUpdate: (handler: RouteUpdateHandler) => {
    mocks.routeUpdateHandler = handler;
  },
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => mocks.walletStore,
}));

vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api: {
    dex: {
      baseAssetsIds: [mocks.baseAssetAddress, mocks.xstUsdAddress],
      poolBaseAssetsIds: [mocks.baseAssetAddress, mocks.xstUsdAddress],
    },
  },
}));

describe('useSelectedTokensRoute runtime behavior', () => {
  beforeEach(() => {
    mocks.route.name = PageNames.Swap;
    mocks.route.params = {};
    mocks.router.replace.mockReset();
    mocks.walletStore.whitelistIdsBySymbol = {};
    mocks.walletStore.assetsDataTable = {};
    mocks.walletStore.assets = [];
    mocks.routeUpdateHandler = undefined;
  });

  it('clears route params when the current route resolves to an invalid duplicate pair', () => {
    mocks.route.params = { first: 'XOR', second: 'XOR' };

    const routeSync = useSelectedTokensRoute(vi.fn());

    expect(routeSync.isValidRoute.value).toBe(false);
    expect(routeSync.parseCurrentRoute()).toBe(false);
    expect(mocks.router.replace).toHaveBeenCalledWith({ name: PageNames.Swap, params: undefined });
  });

  it('updates route params from selected tokens using stable route symbols', () => {
    const routeSync = useSelectedTokensRoute(vi.fn());

    routeSync.updateRouteAfterSelectTokens(undefined, { address: DAI.address, symbol: DAI.symbol } as any);
    expect(mocks.router.replace).not.toHaveBeenCalled();

    routeSync.updateRouteAfterSelectTokens(
      { address: XOR.address, symbol: XOR.symbol } as any,
      { address: DAI.address, symbol: DAI.symbol } as any
    );

    expect(mocks.router.replace).toHaveBeenCalledWith({
      name: PageNames.Swap,
      params: { first: 'XOR', second: 'DAI' },
    });
  });

  it('does not rewrite the route when selected tokens already match route params', () => {
    mocks.route.params = { first: 'XOR', second: 'DAI' };

    const routeSync = useSelectedTokensRoute(vi.fn());

    routeSync.updateRouteAfterSelectTokens(
      { address: XOR.address, symbol: XOR.symbol } as any,
      { address: DAI.address, symbol: DAI.symbol } as any
    );

    expect(mocks.router.replace).not.toHaveBeenCalled();
  });

  it('skips token-change processing for internally redirected route updates', async () => {
    const onTokensChange = vi.fn();
    const next = vi.fn();
    const routeSync = useSelectedTokensRoute(onTokensChange);

    routeSync.updateRouteAfterSelectTokens(
      { address: XOR.address, symbol: XOR.symbol } as any,
      { address: DAI.address, symbol: DAI.symbol } as any
    );

    await mocks.routeUpdateHandler?.({ name: PageNames.Swap, params: { first: 'XOR', second: 'DAI' } }, {}, next);

    expect(onTokensChange).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });

  it('resolves route update tokens from wallet assets before calling the change handler', async () => {
    const firstAddress = '0xaaa0000000000000000000000000000000000000000000000000000000000000';
    const secondAddress = '0xbbb0000000000000000000000000000000000000000000000000000000000000';
    const onTokensChange = vi.fn();
    const next = vi.fn();

    mocks.walletStore.assets = [
      { address: firstAddress, symbol: 'AAA' },
      { address: secondAddress, symbol: 'BBB' },
    ];

    useSelectedTokensRoute(onTokensChange);

    await mocks.routeUpdateHandler?.({ name: PageNames.Swap, params: { first: 'AAA', second: 'BBB' } }, {}, next);

    expect(onTokensChange).toHaveBeenCalledWith({ firstAddress, secondAddress });
    expect(next).toHaveBeenCalledOnce();
  });

  it('accepts add-liquidity route updates when the first token resolves to a configured base asset', async () => {
    const onTokensChange = vi.fn();
    const next = vi.fn();

    mocks.route.name = PageNames.AddLiquidity;
    mocks.walletStore.assetsDataTable = {
      [mocks.baseAssetAddress]: { address: mocks.baseAssetAddress, symbol: 'BASE' },
      [mocks.quoteAssetAddress]: { address: mocks.quoteAssetAddress, symbol: 'QUOTE' },
    };

    useSelectedTokensRoute(onTokensChange);

    await mocks.routeUpdateHandler?.(
      { name: PageNames.AddLiquidity, params: { first: 'BASE', second: 'QUOTE' } },
      {},
      next
    );

    expect(onTokensChange).toHaveBeenCalledWith({
      firstAddress: mocks.baseAssetAddress,
      secondAddress: mocks.quoteAssetAddress,
    });
    expect(next).toHaveBeenCalledOnce();
  });

  it('accepts add-liquidity route updates when the second token resolves to a supported pool base asset', async () => {
    const onTokensChange = vi.fn();
    const next = vi.fn();

    mocks.route.name = PageNames.AddLiquidity;
    mocks.walletStore.assetsDataTable = {
      [mocks.baseAssetAddress]: { address: mocks.baseAssetAddress, symbol: 'BASE' },
      [mocks.quoteAssetAddress]: { address: mocks.quoteAssetAddress, symbol: 'QUOTE' },
    };

    useSelectedTokensRoute(onTokensChange);

    await mocks.routeUpdateHandler?.(
      { name: PageNames.AddLiquidity, params: { first: 'QUOTE', second: 'BASE' } },
      {},
      next
    );

    expect(onTokensChange).toHaveBeenCalledWith({
      firstAddress: mocks.quoteAssetAddress,
      secondAddress: mocks.baseAssetAddress,
    });
    expect(next).toHaveBeenCalledOnce();
  });

  it('rejects the unsupported XSTUSD to XOR add-liquidity route even when XSTUSD is a base asset', async () => {
    const onTokensChange = vi.fn();
    const next = vi.fn();

    expect(XSTUSD.address).toBe(mocks.xstUsdAddress);

    mocks.route.name = PageNames.AddLiquidity;
    mocks.walletStore.assetsDataTable = {
      [XSTUSD.address]: { address: XSTUSD.address, symbol: XSTUSD.symbol },
      [XOR.address]: { address: XOR.address, symbol: XOR.symbol },
    };

    useSelectedTokensRoute(onTokensChange);

    await mocks.routeUpdateHandler?.(
      { name: PageNames.AddLiquidity, params: { first: 'XSTUSD', second: 'XOR' } },
      {},
      next
    );

    expect(mocks.router.replace).not.toHaveBeenCalled();
    expect(onTokensChange).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith({ name: PageNames.AddLiquidity, params: undefined });
  });

  it('redirects invalid route updates without invoking the token-change handler', async () => {
    const onTokensChange = vi.fn();
    const next = vi.fn();

    useSelectedTokensRoute(onTokensChange);

    await mocks.routeUpdateHandler?.({ name: PageNames.Swap, params: { first: 'XOR', second: 'XOR' } }, {}, next);

    expect(mocks.router.replace).not.toHaveBeenCalled();
    expect(onTokensChange).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith({ name: PageNames.Swap, params: undefined });
  });
});
