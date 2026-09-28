import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { accountAddress } from '@sora/sora-pay/relay';
import { OrderStore, validateConfig } from '@sora/sora-pay/relay';

const polkaswapTemplate = JSON.parse(readFileSync(new URL('../config/merchant.polkaswap.json.example', import.meta.url), 'utf8'));

test('both disabled merchant examples publish only the community Telegram support contact', () => {
  for (const filename of ['merchant.polkaswap.json.example', 'merchant.disabled.json.example']) {
    const config = JSON.parse(readFileSync(new URL(`../config/${filename}`, import.meta.url), 'utf8'));
    assert.equal(config.enabled, false);
    assert.deepEqual(config.approvedShippingCountries, []);
    assert.equal(config.merchant.supportTelegram, 'sora_xor');
    assert.equal(Object.hasOwn(config.merchant, 'supportEmail'), false);
    assert.equal(config.product.priceXor, '1.759225');
  }
});

test('tea templates block India independently of approvals while preserving the frozen launch rates', () => {
  for (const filename of ['merchant.polkaswap.json.example', 'merchant.disabled.json.example']) {
    const template = JSON.parse(readFileSync(new URL(`../config/${filename}`, import.meta.url), 'utf8'));
    assert.deepEqual(template.blockedCountries, ['IN']);
  }
  const config = validateConfig({ ...structuredClone(polkaswapTemplate), enabled: true, approvedShippingCountries: ['IN'] });
  const originalRates = structuredClone(config.shipping);
  const rate = config.shipping.find((rate) => rate.countries.includes('IN') && rate.maxGrams >= config.product.packedGrams + config.product.packagingGrams);
  assert.ok(rate, 'The retained launch table still contains the original India rate');
  const store = new OrderStore(':memory:', config, Buffer.alloc(32, 7));
  try {
    assert.deepEqual(store.catalog().shipping, []);
    assert.throws(() => store.create({
      productId: config.product.id, quantity: 1, shippingRateId: rate.id,
      payer: accountAddress(`0x${'01'.repeat(32)}`), idempotencyKey: randomUUID(),
      address: { name: 'Synthetic', line1: 'Synthetic', city: 'Synthetic', country: 'IN' },
      contact: { type: 'telegram', value: '@synthetic' },
    }), { status: 400, message: 'Shipping inquiry required for this order' });
    assert.deepEqual(config.shipping, originalRates);
    assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM orders').get()!.n, 0);
  } finally { store.close(); }
});

test('Telegram-only Polkaswap catalog has no public email or personal handle and keeps fixed XOR prices', () => {
  const config = validateConfig({ ...structuredClone(polkaswapTemplate), enabled: true,
    approvedShippingCountries: [...new Set(polkaswapTemplate.shipping.flatMap((rate) => rate.countries))] });
  const store = new OrderStore(':memory:', config, Buffer.alloc(32, 7));
  try {
    const catalog = store.catalog();
    assert.equal(catalog.merchant.supportTelegram, 'sora_xor');
    assert.equal(Object.hasOwn(catalog.merchant, 'supportEmail'), false);
    assert.equal(catalog.product.priceXor, '1.759225');
    assert.deepEqual(catalog.shipping.map((rate) => rate.priceXor), polkaswapTemplate.shipping.map((rate) => rate.priceXor));
    for (const privateContact of ['takemiya@sora.org', 'mtakemiya']) assert.equal(JSON.stringify(catalog).includes(privateContact), false);
    assert.equal(Object.hasOwn(config, 'notification'), false);
  } finally { store.close(); }
});

