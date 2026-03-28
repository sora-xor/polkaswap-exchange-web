import { beforeEach, describe, expect, it, vi } from 'vitest';

const walletModuleMocks = vi.hoisted(() => ({
  loadAsyncImportWithRetryMock: vi.fn(),
}));

vi.mock('@/router/lazy', () => ({
  loadAsyncImportWithRetry: walletModuleMocks.loadAsyncImportWithRetryMock,
}));

describe('utils/walletModule', () => {
  beforeEach(() => {
    vi.resetModules();
    walletModuleMocks.loadAsyncImportWithRetryMock.mockReset();
  });

  it('caches a successful wallet module load', async () => {
    const moduleValue = { default: { install: vi.fn() }, components: {} };
    walletModuleMocks.loadAsyncImportWithRetryMock.mockResolvedValue(moduleValue);

    const { loadWalletModule } = await import('@/utils/walletModule');

    await expect(loadWalletModule()).resolves.toBe(moduleValue);
    await expect(loadWalletModule()).resolves.toBe(moduleValue);

    expect(walletModuleMocks.loadAsyncImportWithRetryMock).toHaveBeenCalledTimes(1);
  });

  it('clears the cached promise after a transient failure so the next call can retry', async () => {
    const moduleValue = { default: { install: vi.fn() }, components: {} };
    walletModuleMocks.loadAsyncImportWithRetryMock
      .mockRejectedValueOnce(new TypeError('Importing a module script failed'))
      .mockResolvedValueOnce(moduleValue);

    const { loadWalletModule } = await import('@/utils/walletModule');

    await expect(loadWalletModule()).rejects.toThrow('Importing a module script failed');
    await expect(loadWalletModule()).resolves.toBe(moduleValue);

    expect(walletModuleMocks.loadAsyncImportWithRetryMock).toHaveBeenCalledTimes(2);
  });
});
