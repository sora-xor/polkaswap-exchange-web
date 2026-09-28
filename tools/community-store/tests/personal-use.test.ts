import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { accountAddress } from '@sora/sora-pay/relay';
import { OrderStore, validateConfig, createRelayServer, createCatalogRefresher, type MerchantConfig, type CreateOrder } from '@sora/sora-pay/relay';

const template = JSON.parse(readFileSync(new URL('../config/merchant.polkaswap.json.example', import.meta.url), 'utf8')) as MerchantConfig;
const key = Buffer.alloc(32, 19);
const time = Date.parse('2026-09-27T00:00:00.000Z');
function config(): MerchantConfig {
  const c = structuredClone(template); c.enabled = true; c.approvedShippingCountries = ['TW'];
  c.shipping = c.shipping.flatMap((rate) => {
    const countries = rate.countries.filter((country) => country !== 'TW' || rate.maxGrams <= 6000);
    return countries.length ? [{ ...rate, countries }] : [];
  });
  return validateConfig(c);
}
function input(quantity = 1, rate = 'ems-zone-1-500'): CreateOrder {
  return { productId: template.product.id, quantity, shippingRateId: rate, payer: accountAddress(`0x${'01'.repeat(32)}`), address: { name: 'Synthetic Person', line1: 'Synthetic Street', city: 'Synthetic City', country: 'TW' }, contact: { type: 'telegram', value: '@synthetic' }, idempotencyKey: randomUUID() };
}

test('saved ordinary orders retry, recover, pay and refund unchanged after destination policy changes', () => {
  const c = config(); c.refundPolicy = { version: 1, mode: 'full' };
  const store = new OrderStore(':memory:', c, key, () => time);
  try {
    const request = input();
    const saved = store.create(request);
    c.approvedShippingCountries = [];
    assert.deepEqual(store.create(request), saved);
    assert.deepEqual(store.recoverCreate(request.idempotencyKey), saved);
    assert.deepEqual(store.get(saved.orderId, saved.recoveryToken).paymentRequest, saved.paymentRequest);
    store.paymentAttempt(saved.orderId, saved.recoveryToken);
    const r = saved.paymentRequest;
    const evidence = { chainGenesisHash: r.chainGenesisHash, assetId: r.assetId, payer: r.payer, recipient: r.recipient, amountCodec: r.amountCodec, reference: r.reference, transactionHash: `0x${'1'.repeat(64)}`, blockHash: `0x${'2'.repeat(64)}`, blockNumber: '100', eventIndex: 0, successful: true, finalized: true, finalizedAt: new Date(time + 1000).toISOString() };
    assert.equal(store.accept(evidence), true); store.claim(saved.orderId, 'volunteer');
    const refund = store.refund(saved.orderId, 'volunteer');
    assert.equal(refund.amountCodec, r.amountCodec);
    assert.equal(store.accept({ ...evidence, payer: r.recipient, recipient: r.payer, reference: refund.reference, eventIndex: 1, transactionHash: `0x${'3'.repeat(64)}` }), true);
    assert.equal(store.get(saved.orderId, saved.recoveryToken).status, 'refunded');
  } finally { store.close(); }
});

test('Taiwan frozen 6 kg table allows 49 bags, rejects 50 even through a retained non-Taiwan 30 kg band, and refresh never expands it', async () => {
  const c = config(); const before = structuredClone(c.shipping); const store = new OrderStore(':memory:', c, key, () => time);
  try {
    assert.equal(store.create(input()).paymentRequest.amountCodec, '3459809000000000000');
    assert.equal(49 * c.product.packedGrams + c.product.packagingGrams!, 5960);
    assert.equal(50 * c.product.packedGrams + c.product.packagingGrams!, 6080);
    assert.equal(store.create(input(49, 'ems-zone-1-6000')).status, 'awaiting_payment');
    for (const band of ['ems-zone-1-6000', 'ems-zone-1-7000', 'ems-zone-1-30000']) assert.throws(() => store.create(input(50, band)), /Shipping inquiry required/);
    assert.ok(c.shipping.some((rate) => rate.maxGrams === 30000 && rate.countries.includes('CN')));
    assert.ok(store.catalog().shipping.every((rate) => rate.maxGrams <= 6000 && rate.countries.length === 1 && rate.countries[0] === 'TW'));
    const refresh = createCatalogRefresher(c, { clock: () => new Date(time), shipping: async () => ({
      version: 'synthetic-ems', carrier: 'Japan Post', service: 'EMS', currency: 'JPY', fetchedAt: new Date(time).toISOString(), availabilityUpdatedLabel: 'Synthetic', availabilityPreviousAnnouncement: '', tentativeSurchargesIncluded: true,
      sources: {} as never, bands: before.filter((r) => r.id.startsWith('ems-zone-1-')).map((rate) => ({ zone: 1, maxGrams: rate.maxGrams, priceJpy: '1' })),
      countries: ['TW', 'CN', 'KR'].map((code) => ({ code, name: code, zone: 1, service: 'accepted', coverage: '', ead: '', requiresReview: false, reasons: [], detailsUrl: null })),
    }) });
    await refresh.refresh();
    for (const rate of c.shipping) { const old = before.find((r) => r.id === rate.id)!; assert.deepEqual(rate.countries, old.countries); assert.equal(rate.priceXor, old.priceXor); assert.equal(rate.maxGrams, old.maxGrams); }
    assert.ok(store.catalog().shipping.every((rate) => rate.maxGrams <= 6000));
    assert.throws(() => store.create(input(50, 'ems-zone-1-30000')), /Shipping inquiry required/);
  } finally { store.close(); }
});

test('HTTP creates personal-use orders with ordinary inputs and no customer attestation', async () => {
  const store = new OrderStore(':memory:', config(), key, () => time);
  const server = createRelayServer(store, { operatorToken: 'o'.repeat(64), ready: () => true });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  const post = (value: unknown) => fetch(base + '/v1/orders', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://polkaswap.io' }, body: JSON.stringify(value) });
  try {
    const catalog = await (await fetch(base + '/v1/catalog')).json(); assert.equal('personalUseOnly' in catalog, false);
    const request = input(); const response = await post(request); assert.equal(response.status, 201);
    const saved = await response.json(); assert.equal(saved.status, 'awaiting_payment'); assert.equal(JSON.stringify(saved).includes('personalUse'), false);
    const retry = await post(request); assert.equal(retry.status, 201); assert.deepEqual(await retry.json(), saved);
    assert.equal('personalUseAttestation' in store.operatorOrder(saved.orderId), false);
    assert.equal((await post(input(50, 'ems-zone-1-30000'))).status, 400);
    assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM orders').get()!.n, 1);
  } finally { await new Promise<void>((resolve) => server.close(() => resolve())); store.close(); }
});
