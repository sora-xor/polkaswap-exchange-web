import { describe, expect, it } from 'vitest';

describe('wallet app shims', () => {
  it('re-exports the wallet entry modules through app-owned shims', async () => {
    const apiShim = await import('@/shims/wallet-api');
    const apiModule = await import('@/lib/soraneo-wallet/src/api');
    const componentsShim = await import('@/shims/wallet-components');
    const componentsModule = await import('@/lib/soraneo-wallet/src/components/registry');
    const bootstrapShim = await import('@/shims/wallet-bootstrap');
    const bootstrapModule = await import('@/lib/soraneo-wallet/src/bootstrap');
    const alertsShim = await import('@/shims/wallet-alerts');
    const alertsModule = await import('@/lib/soraneo-wallet/src/services/alerts');
    const constsShim = await import('@/shims/wallet-consts');
    const constsModule = await import('@/lib/soraneo-wallet/src/consts');
    const utilShim = await import('@/shims/wallet-util');
    const utilModule = await import('@/lib/soraneo-wallet/src/util');
    const accountShim = await import('@/shims/wallet-account');
    const accountModule = await import('@/lib/soraneo-wallet/src/util/account');
    const storageShim = await import('@/shims/wallet-storage');
    const storageModule = await import('@/lib/soraneo-wallet/src/util/storage');
    const indexerShim = await import('@/shims/wallet-indexer');
    const indexerModule = await import('@/lib/soraneo-wallet/src/services/indexer');
    const translationShim = await import('@/shims/wallet-translation');
    const translationModule = await import('@/lib/soraneo-wallet/src/composables/useTranslation');
    const servicesShim = await import('@/shims/wallet-services');
    const currencyServiceModule = await import('@/lib/soraneo-wallet/src/services/currency');
    const walletShim = await import('@/shims/wallet');
    const walletModule = await import('@/lib/soraneo-wallet/src/index.ts');

    expect(apiShim.api).toBe(apiModule.api);
    expect(apiShim.connection).toBe(apiModule.connection);
    expect(componentsShim.components).toBe(componentsModule.components);
    expect(bootstrapShim.initWallet).toBe(bootstrapModule.initWallet);
    expect(bootstrapShim.waitForCore).toBe(bootstrapModule.waitForCore);
    expect(alertsShim.default).toBe(alertsModule.default);
    expect(alertsShim.AlertsApiService).toBe(alertsModule.AlertsApiService);
    expect(constsShim.IndexerType).toBe(constsModule.IndexerType);
    expect(utilShim.beforeTransactionSign).toBe(utilModule.beforeTransactionSign);
    expect(accountShim.loginApi).toBe(accountModule.loginApi);
    expect(storageShim.storage).toBe(storageModule.storage);
    expect(indexerShim.getCurrentIndexer).toBe(indexerModule.getCurrentIndexer);
    expect(translationShim.useTranslation).toBe(translationModule.useTranslation);
    expect(servicesShim.CurrencyExchangeRateService).toBe(currencyServiceModule.CurrencyExchangeRateService);
    expect(walletShim.en).toBeDefined();
    expect(walletShim.default).toEqual(expect.objectContaining({ install: expect.any(Function) }));
    expect(walletModule.default).toEqual(expect.objectContaining({ install: expect.any(Function) }));
  });
});
