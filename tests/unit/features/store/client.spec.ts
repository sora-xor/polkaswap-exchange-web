// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';

vi.hoisted(() => vi.resetModules());

import {
  canonicalStoreAddress,
  parseStoreCatalog,
  parseStoreConfig,
  parseStoreOrder,
  quoteStoreOrder,
  STORE_MAINNET_GENESIS,
  storeRequest,
} from '@/features/store/client';
import type { CommunityStoreCatalog } from '@/features/store/types';

vi.mock('@polkadot/util-crypto', async (importOriginal) => await importOriginal());

const recipient = 'cnWUWKLZmNjQXGzYAF7YuRSiW1pKTRTzu4fmcYmWQX6UMGQUZ';
const payer = encodeAddress(new Uint8Array(32).fill(2), 69);
const config = {
  version: 1 as const,
  relayUrl: 'https://store.example',
  merchantId: 'polkaswap-community',
  recipient,
};

/** A frozen quote fixture deliberately has no token-market feed. */
function catalog(): CommunityStoreCatalog {
  return {
    version: 'tea-v1',
    enabled: true,
    merchant: {
      id: 'polkaswap-community',
      name: 'Community Store',
      operatorName: 'Volunteers',
      supportTelegram: 'sora_xor',
      dispatchPolicy: 'Buy on demand',
      customsPolicy: 'Reviewed before dispatch',
      privacyPolicy: 'Private',
      cancellationPolicy: 'Full XOR refund',
    },
    pricing: {
      kind: 'exact-xor',
      version: 'launch',
    },
    product: {
      id: 'sencha',
      name: 'Sencha',
      grams: 100,
      priceXor: '1.759225',
      stockAvailable: null,
      packedGrams: 120,
      packagingGrams: 80,
      fulfillmentMode: 'on-demand',
    },
    shipping: [
      { id: '500g', countries: ['TW'], maxGrams: 500, priceXor: '1.800125', label: 'EMS 500g' },
      { id: '600g', countries: ['TW'], maxGrams: 600, priceXor: '2', label: 'EMS 600g' },
    ],
    chain: {
      genesisHash: STORE_MAINNET_GENESIS,
      assetId: '0x0200000000000000000000000000000000000000000000000000000000000000',
      decimals: 18,
      denomination: '1000000',
      recipient,
    },
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('community store trust and quote boundary', () => {
  it('accepts Telegram-only merchant support while rejecting missing or malformed contacts', () => {
    const sample = catalog();
    expect(parseStoreCatalog(sample, config).merchant).toMatchObject({ supportTelegram: 'sora_xor' });
    expect(parseStoreCatalog(sample, config).merchant.supportEmail).toBeUndefined();
    for (const supportTelegram of [undefined, '', 'https://t.me/sora_xor', '@sora_xor', 'a'.repeat(33)]) {
      sample.merchant.supportTelegram = supportTelegram;
      expect(() => parseStoreCatalog(sample, config)).toThrow();
    }
    delete sample.merchant.supportTelegram;
    sample.merchant.supportEmail = 'test@example.test';
    expect(parseStoreCatalog(sample, config).merchant.supportEmail).toBe('test@example.test');
    sample.merchant.supportEmail = 'invalid-email';
    expect(() => parseStoreCatalog(sample, config)).toThrow();
  });

  it('keeps launch config disabled until a relay is set and rejects credential-bearing or non-TLS receivers', () => {
    expect(
      parseStoreConfig({ version: 1, relayUrl: null, recipient, merchantId: 'polkaswap-community' }).relayUrl
    ).toBeNull();
    for (const relayUrl of [
      'http://store.example',
      'https://user:secret@store.example',
      'https://store.example/?key=x',
      'javascript:alert(1)',
    ]) {
      expect(() => parseStoreConfig({ ...config, relayUrl })).toThrow();
    }
    expect(parseStoreConfig({ ...config, relayUrl: 'http://127.0.0.1:4000' }, true).relayUrl).toBe(
      'http://127.0.0.1:4000'
    );
  });

  it('validates SS58 checksums and normalizes equivalent account prefixes', () => {
    expect(() => decodeAddress(recipient)).not.toThrow();
    expect(canonicalStoreAddress(encodeAddress(new Uint8Array(32).fill(2), 42))).toBe(payer);
    expect(() => canonicalStoreAddress(recipient.slice(0, -1) + 'a')).toThrow();
  });

  it('rejects a relay that substitutes its recipient, network, asset or merchant price policy', () => {
    expect(parseStoreCatalog(catalog(), config).chain.recipient).toBe(recipient);
    const wrongRecipient = catalog();
    wrongRecipient.chain.recipient = payer;
    const wrongChain = catalog();
    wrongChain.chain.genesisHash = `0x${'1'.repeat(64)}`;
    const wrongAsset = catalog();
    wrongAsset.chain.assetId = `0x${'0'.repeat(64)}`;
    const wrongPolicy = { ...catalog(), pricing: { kind: 'jpy-fixed-usd', version: 'daily' } };
    const wrongPrice = catalog();
    wrongPrice.product.priceXor = '2';
    for (const value of [wrongRecipient, wrongChain, wrongAsset, wrongPolicy, wrongPrice])
      expect(() => parseStoreCatalog(value, config)).toThrow();
  });

  it('uses exact quoted unit amounts and computes parcel packaging once', () => {
    expect(quoteStoreOrder(catalog(), 3, 'TW')).toMatchObject({ shippingRateId: '500g', totalXor: '7.0778' });
    expect(quoteStoreOrder(catalog(), 4, 'TW')).toMatchObject({ shippingRateId: '600g', totalXor: '9.0369' });
    expect(quoteStoreOrder(catalog(), 5, 'TW')).toBeNull();
    expect(quoteStoreOrder(catalog(), 1, 'US')).toBeNull();
    expect(quoteStoreOrder(catalog(), 1.1, 'TW')).toBeNull();
    expect(quoteStoreOrder(catalog(), 0, 'TW')).toBeNull();
  });

  it('compares fixed-price decimals by exact codec value, including harmless trailing zeros', () => {
    const sample = catalog();
    sample.product.priceXor = '1.759225000000000000';
    expect(parseStoreCatalog(sample, config).product.priceXor).toBe('1.759225000000000000');
    for (const amount of ['1.759226', '1.7592250000000000001', '1.759225e0']) {
      sample.product.priceXor = amount;
      expect(() => parseStoreCatalog(sample, config)).toThrow();
    }
  });

  it('keeps the fixed XOR amount independent of irrelevant exchange-rate input and strips it from public state', () => {
    const sample = catalog();
    const value = { ...sample, pricing: { ...sample.pricing, jpyPerUsd: '999', usdPerXor: '1' } };
    const parsed = parseStoreCatalog(value, config);
    expect(parsed.product.priceXor).toBe('1.759225');
    expect(parsed.pricing).toEqual({ kind: 'exact-xor', version: 'launch' });
  });

  it('keeps on-demand ordering independent of inventory, but honors stocked merchants and service shutdown', () => {
    const sample = catalog();
    sample.product.stockAvailable = 0;
    expect(quoteStoreOrder(sample, 1, 'TW')).toBeNull();
    sample.product.stockAvailable = null;
    expect(quoteStoreOrder(sample, 1, 'TW')).not.toBeNull();
    sample.enabled = false;
    expect(quoteStoreOrder(sample, 1, 'TW')).toBeNull();
  });

  it('recovers a pending payment without re-enabling checkout or using the public reference as a token', () => {
    const request = {
      version: 1,
      merchant: { id: config.merchantId, name: 'Store' },
      chainGenesisHash: STORE_MAINNET_GENESIS,
      assetId: catalog().chain.assetId,
      recipient,
      payer,
      amountCodec: '1000000000000000000',
      decimals: 18,
      denomination: '1000000',
      reference: `sp_${'a'.repeat(32)}`,
      expiresAt: '2026-09-25T09:00:00.000Z',
    };
    const payload = {
      orderId: 'order_123456789',
      status: 'awaiting_payment',
      notificationStatus: 'pending',
      paymentPending: true,
      paymentRequest: request,
    };
    expect(parseStoreOrder(payload, config, 'x'.repeat(43)).status).toBe('payment_pending');
    expect(() => parseStoreOrder(payload, config, request.reference.slice(3, 12))).toThrow();
    expect(() =>
      parseStoreOrder({ ...payload, paymentRequest: { ...request, recipient: payer } }, config, 'x'.repeat(43))
    ).toThrow();
  });

  it('transports recovery and private address only through headers/body, with redirect and credential restrictions', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    await storeRequest(
      'https://store.example/v1/orders/order_123',
      { address: { name: 'Private Name' } },
      'private-token'
    );
    const [url, options] = fetch.mock.calls[0];
    expect(url).not.toContain('Private');
    expect(url).not.toContain('private-token');
    expect(options).toMatchObject({
      credentials: 'omit',
      redirect: 'error',
      referrerPolicy: 'no-referrer',
      cache: 'no-store',
      headers: { Authorization: 'Bearer private-token' },
    });
    expect(options.body).toContain('Private Name');
  });

  it('derives a completed refund hash only from exact finalized outgoing evidence', () => {
    const request = {
      version: 1 as const,
      merchant: { id: config.merchantId, name: 'Store' },
      chainGenesisHash: STORE_MAINNET_GENESIS,
      assetId: catalog().chain.assetId,
      recipient,
      payer,
      amountCodec: '1000000000000000000',
      decimals: 18,
      denomination: '1000000',
      reference: `sp_${'a'.repeat(32)}`,
      expiresAt: '2026-09-25T09:00:00.000Z',
    };
    const refundReference = `sp_${'b'.repeat(32)}`;
    const evidence = {
      chainGenesisHash: STORE_MAINNET_GENESIS,
      assetId: request.assetId,
      payer: recipient,
      recipient: payer,
      amountCodec: request.amountCodec,
      reference: refundReference,
      transactionHash: `0x${'c'.repeat(64)}`,
      blockHash: `0x${'d'.repeat(64)}`,
      blockNumber: '1234',
      eventIndex: 2,
      successful: true,
      finalized: true,
      finalizedAt: '2026-09-26T00:00:00.000Z',
    };
    const payload = {
      orderId: 'order_123456789',
      status: 'refunded',
      notificationStatus: 'delivered',
      paymentRequest: request,
      refund: {
        amountCodec: request.amountCodec,
        reference: refundReference,
        transactionHash: `0x${'e'.repeat(64)}`,
        receipt: { evidence },
      },
    };
    expect(parseStoreOrder(payload, config, 'x'.repeat(43)).refund).toEqual({
      amountCodec: request.amountCodec,
      transactionHash: evidence.transactionHash,
    });
    for (const change of [
      { payer },
      { recipient },
      { amountCodec: '1' },
      { reference: request.reference },
      { chainGenesisHash: `0x${'f'.repeat(64)}` },
      { assetId: `0x${'f'.repeat(64)}` },
      { finalized: false },
      { successful: false },
    ]) {
      expect(() =>
        parseStoreOrder(
          { ...payload, refund: { ...payload.refund, receipt: { evidence: { ...evidence, ...change } } } },
          config,
          'x'.repeat(43)
        )
      ).toThrow();
    }
    const pending = { ...payload, status: 'refund_pending', refund: { ...payload.refund, receipt: undefined } };
    expect(parseStoreOrder(pending, config, 'x'.repeat(43)).refund?.transactionHash).toBeUndefined();
  });
});
