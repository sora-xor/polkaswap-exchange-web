import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({
  validateAddress: vi.fn(),
  formatAddress: vi.fn(),
  getAccountOnChainIdentity: vi.fn(),
  connected: true,
}));

const connectionMock = vi.hoisted(() => ({
  endpoint: 'wss://sora.example',
}));

vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api: apiMock,
  connection: connectionMock,
}));

vi.mock('@/plugins/pinia', () => ({
  resolveGlobalPinia: vi.fn(),
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: vi.fn(),
}));

import {
  AppError,
  checkCameraPermission,
  checkDevicesAvailability,
  copyToClipboard,
  formatAccountAddress,
  formatAddress,
  getAccountIdentity,
  getAssetsSubset,
  getCssVariableValue,
  getCurrency,
  getExplorerLinks,
  getScrollbarWidth,
  getSorametricsAccountLink,
  getSorametricsBlockLink,
  getSorametricsTransactionLink,
  getStatusClass,
  getStatusIcon,
  getTextWidth,
  shortenValue,
  waitForDocumentReady,
} from '@/lib/soraneo-wallet/src/util';
import { CeresAddresses, ExplorerType, SoraNetwork } from '@/lib/soraneo-wallet/src/consts';
import { FilterOptions } from '@/lib/soraneo-wallet/src/types/common';
import { KUSD, NativeAssets, XSTUSD } from '@sora-substrate/sdk/build/assets/consts';

describe('wallet util helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    apiMock.validateAddress.mockReturnValue(true);
    apiMock.formatAddress.mockImplementation((address: string, withPrefix = true) => `${address}:${withPrefix}`);
    apiMock.connected = true;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('serializes AppError metadata into the message payload', () => {
    const error = new AppError({ key: 'wallet.error', payload: { code: 1 } });

    expect(error.name).toBe('AppHandledError');
    expect(error.message).toBe(JSON.stringify({ key: 'wallet.error', payload: { code: 1 } }));
  });

  it('builds Sorametrics account, block, and transaction links', () => {
    expect(getSorametricsAccountLink('addr/with space')).toBe(
      'https://sorametrics.org/sorav2?tab=balance&address=addr%2Fwith%20space'
    );
    expect(getSorametricsBlockLink(123)).toBe('https://sorametrics.org/sorav2?tab=extrinsics&block=123');
    expect(getSorametricsTransactionLink('0xabc')).toBe('https://sorametrics.org/sorav2?tab=extrinsics&q=0xabc');
    expect(getSorametricsTransactionLink('42-1')).toBe('https://sorametrics.org/sorav2?tab=extrinsics&q=42-1');
  });

  it('resolves document readiness immediately when the page is already complete', async () => {
    Object.defineProperty(document, 'readyState', {
      configurable: true,
      get: () => 'complete',
    });

    await expect(waitForDocumentReady()).resolves.toBeUndefined();
  });

  it('waits for the window load event when the document is still loading', async () => {
    let state = 'loading';
    Object.defineProperty(document, 'readyState', {
      configurable: true,
      get: () => state,
    });

    let resolved = false;
    const pending = waitForDocumentReady().then(() => {
      resolved = true;
    });

    await Promise.resolve();
    expect(resolved).toBe(false);

    state = 'complete';
    window.dispatchEvent(new Event('load'));

    await pending;
    expect(resolved).toBe(true);
  });

  it('formats validated addresses and safely handles invalid or throwing formatters', () => {
    expect(formatAccountAddress('addr', false)).toBe('addr:false');

    apiMock.validateAddress.mockReturnValueOnce(false);
    expect(formatAccountAddress('bad-address')).toBe('');

    apiMock.validateAddress.mockReturnValueOnce(true);
    apiMock.formatAddress.mockImplementationOnce(() => {
      throw new Error('format failed');
    });
    expect(formatAccountAddress('addr')).toBe('');
  });

  it('returns mapped on-chain identity data when available', async () => {
    apiMock.getAccountOnChainIdentity.mockResolvedValue({
      displayName: 'Alice',
      legalName: 'Alice Corp',
      approved: true,
    });

    await expect(getAccountIdentity('addr')).resolves.toEqual({
      name: 'Alice',
      legalName: 'Alice Corp',
      approved: true,
    });
  });

  it('returns null when account identity cannot be resolved', async () => {
    apiMock.validateAddress.mockReturnValueOnce(false);
    await expect(getAccountIdentity('bad')).resolves.toBeNull();

    apiMock.validateAddress.mockReturnValueOnce(true);
    apiMock.getAccountOnChainIdentity.mockResolvedValueOnce(null);
    await expect(getAccountIdentity('addr')).resolves.toBeNull();

    apiMock.validateAddress.mockReturnValueOnce(true);
    apiMock.getAccountOnChainIdentity.mockRejectedValueOnce(new Error('identity pallet unavailable'));
    await expect(getAccountIdentity('addr')).resolves.toBeNull();

    apiMock.validateAddress.mockReturnValueOnce(true);
    apiMock.getAccountOnChainIdentity.mockClear();
    apiMock.connected = false;
    await expect(getAccountIdentity('addr')).resolves.toBeNull();
    expect(apiMock.getAccountOnChainIdentity).not.toHaveBeenCalled();
  });

  it('includes Sorametrics only for production explorer links', () => {
    expect(getExplorerLinks()).toEqual([
      {
        type: ExplorerType.Polkadot,
        value: 'https://polkadot.js.org/apps/?rpc=wss://sora.example#/explorer/query',
      },
    ]);

    expect(getExplorerLinks(SoraNetwork.Prod)).toEqual([
      {
        type: ExplorerType.Sorametrics,
        value: 'https://sorametrics.org/sorav2',
      },
      {
        type: ExplorerType.Polkadot,
        value: 'https://polkadot.js.org/apps/?rpc=wss://sora.example#/explorer/query',
      },
    ]);
  });

  it('detects camera-device availability and falls back to false on errors', async () => {
    const enumerateDevices = vi.fn().mockResolvedValue([{ kind: 'audioinput' }, { kind: 'videoinput' }]);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { enumerateDevices },
    });

    await expect(checkDevicesAvailability()).resolves.toBe(true);

    const error = new Error('permission denied');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        enumerateDevices: vi.fn().mockRejectedValue(error),
      },
    });

    await expect(checkDevicesAvailability()).resolves.toBe(false);
    expect(errorSpy).toHaveBeenCalledWith(error);
  });

  it('reads camera permission state and returns an empty string on errors', async () => {
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: {
        query: vi.fn().mockResolvedValue({ state: 'granted' }),
      },
    });

    await expect(checkCameraPermission()).resolves.toBe('granted');

    const error = new Error('permissions unavailable');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: {
        query: vi.fn().mockRejectedValue(error),
      },
    });

    await expect(checkCameraPermission()).resolves.toBe('');
    expect(errorSpy).toHaveBeenCalledWith(error);
  });

  it('copies text to the clipboard and logs synchronous failures', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    await expect(copyToClipboard('xor')).resolves.toBeUndefined();
    expect(writeText).toHaveBeenCalledWith('xor');

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn(() => {
          throw new Error('clipboard blocked');
        }),
      },
    });

    await expect(copyToClipboard('xor')).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith('Could not copy text: ', expect.any(Error));
  });

  it('returns currencies, shortens long addresses, and maps status helpers', () => {
    expect(getCurrency('usd' as never, [{ key: 'usd', symbol: '$' }] as never)).toEqual({ key: 'usd', symbol: '$' });
    expect(formatAddress('1234567890', 6)).toBe('123...890');
    expect(formatAddress('short', 10)).toBe('short');

    expect(getStatusIcon('IN_PROGRESS')).toBe('refresh-16');
    expect(getStatusIcon('ERROR')).toBe('basic-clear-X-xs-24');
    expect(getStatusIcon('SUCCESS')).toBe('status-success-ic-16');
    expect(getStatusIcon('UNKNOWN')).toBe('');

    expect(getStatusClass('IN_PROGRESS')).toBe('info-status info-status--loading');
    expect(getStatusClass('ERROR')).toBe('info-status info-status--error');
    expect(getStatusClass('SUCCESS')).toBe('info-status info-status--success');
    expect(getStatusClass('UNKNOWN')).toBe('info-status');
  });

  it('shortens long values but leaves empty and short strings untouched', () => {
    expect(shortenValue('')).toBe('');
    expect(shortenValue('short text')).toBe('short text');
    expect(shortenValue('abcdefghijklmnopqrstuvwxyz1234567890', 10)).toBe('abcde...67890');
  });

  it('reads CSS variables from the document root', () => {
    const getPropertyValue = vi.fn().mockReturnValue('  #112233  ');
    vi.stubGlobal(
      'getComputedStyle',
      vi.fn(() => ({
        getPropertyValue,
      }))
    );

    expect(getCssVariableValue('--theme-accent')).toBe('#112233');
    expect(getPropertyValue).toHaveBeenCalledWith('--theme-accent');
  });

  it('measures text width with a canvas context and returns zero when unavailable', () => {
    const measureText = vi.fn().mockReturnValue({ width: 12.34 });
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return {
          getContext: vi.fn(() => ({
            font: '',
            measureText,
          })),
        } as never;
      }

      return document.createElementNS('http://www.w3.org/1999/xhtml', tagName);
    });

    expect(getTextWidth('hello', '400 10px Test')).toBe(12.3);
    expect(measureText).toHaveBeenCalledWith('hello');

    createElementSpy.mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return {
          getContext: vi.fn(() => null),
        } as never;
      }

      return document.createElementNS('http://www.w3.org/1999/xhtml', tagName);
    });

    expect(getTextWidth('hello')).toBe(0);
  });

  it('calculates scrollbar width from the temporary measurement elements', () => {
    const originalCreateElement = document.createElement.bind(document);
    let divCount = 0;

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName);

      if (tagName === 'div') {
        divCount += 1;

        if (divCount === 1) {
          Object.defineProperty(element, 'offsetWidth', {
            configurable: true,
            get: () => 120,
          });
        } else {
          Object.defineProperty(element, 'offsetWidth', {
            configurable: true,
            get: () => 102,
          });
        }
      }

      return element;
    });

    expect(getScrollbarWidth()).toBe(18);
  });

  it('filters assets by native, synthetic, kensetsu, ceres, and default modes', () => {
    const nativeAsset = { address: NativeAssets[0]?.address ?? 'native-address' };
    const syntheticAsset = { address: XSTUSD.address };
    const kensetsuAsset = { address: KUSD.address };
    const ceresAsset = { address: CeresAddresses[0] };
    const otherAsset = { address: '0x0099999999999999999999999999999999999999999999999999999999999999' };
    const list = [nativeAsset, syntheticAsset, kensetsuAsset, ceresAsset, otherAsset];
    const nativeAddresses = NativeAssets.map((asset) => asset.address);

    expect(getAssetsSubset(list as never, FilterOptions.Native)).toEqual(
      list.filter((asset) => nativeAddresses.includes(asset.address))
    );
    expect(getAssetsSubset(list as never, FilterOptions.Synthetics)).toEqual([syntheticAsset]);
    expect(getAssetsSubset(list as never, FilterOptions.Kensetsu)).toEqual([kensetsuAsset]);
    expect(getAssetsSubset(list as never, FilterOptions.Ceres)).toEqual([ceresAsset]);
    expect(getAssetsSubset(list as never, FilterOptions.All)).toEqual(list);
  });
});
