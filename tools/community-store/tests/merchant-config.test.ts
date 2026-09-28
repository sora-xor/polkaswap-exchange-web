import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateConfig, type MerchantConfig } from '@sora/sora-pay/relay';

test('Polkaswap binds its approved archive without replacing primary RPC or enabling checkout', () => {
 const config = JSON.parse(readFileSync(new URL('../config/merchant.polkaswap-worldwide.json.example', import.meta.url), 'utf8')) as MerchantConfig;
 assert.equal(config.enabled, false);
 assert.equal(config.chain.rpcUrl, 'wss://ws.mof.sora.org');
 assert.equal(config.chain.archiveRpcUrl, 'wss://mof2.sora.org');
 assert.equal(config.chain.genesisHash, '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5');
 assert.equal(config.chain.recipient, 'cnWUWKLZmNjQXGzYAF7YuRSiW1pKTRTzu4fmcYmWQX6UMGQUZ');
 assert.equal(config.product.priceXor, '1.759225');
 assert.equal(config.storageMinimumFreeBytes, '5368709120');
 assert.equal(config.storageResumeFreeBytes, '10737418240');
 const enabledCopy = { ...structuredClone(config), enabled: true };
 assert.doesNotThrow(() => validateConfig(enabledCopy));
 enabledCopy.chain.archiveRpcUrl = 'http://unapproved.example.test';
 assert.throws(() => validateConfig(enabledCopy), /TLS archive RPC/);
 const unconfigured = JSON.parse(readFileSync(new URL('../config/merchant.disabled.json.example', import.meta.url), 'utf8')) as MerchantConfig;
 assert.equal(unconfigured.enabled, false);
 assert.equal(unconfigured.chain.archiveRpcUrl, undefined);
});

