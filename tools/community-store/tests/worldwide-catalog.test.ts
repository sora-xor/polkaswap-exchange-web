import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { accountAddress } from '@sora/sora-pay/relay';
import { validateConfig, OrderStore, type MerchantConfig } from '@sora/sora-pay/relay';
import { xorToCodec } from '@sora/sora-pay/relay';
import { assembleWorldwideMerchant } from '../build-catalog.mjs';

const template = JSON.parse(readFileSync(new URL('../config/merchant.polkaswap-worldwide.json.example', import.meta.url), 'utf8')) as MerchantConfig;
const payer = accountAddress(`0x${'01'.repeat(32)}`);
const config = () => validateConfig({ ...structuredClone(template), enabled: true });

test('offline catalog rebuild preserves the complete frozen merchant and leaves the input untouched', () => {
  const before = structuredClone(template);
  const rebuilt = assembleWorldwideMerchant(template);
  assert.deepEqual(rebuilt, before);
  assert.deepEqual(template, before);
  assert.equal(rebuilt.enabled, false);
});

test('every published worldwide destination creates an exact private quote with no personal-use field', () => {
  assert.equal(template.enabled, false);
  const c = config(), store = new OrderStore(':memory:', c, Buffer.alloc(32, 7));
  const countries = [...new Set(c.shipping.flatMap((rate) => rate.countries))];
  assert.equal(countries.length, 203); assert.equal(c.approvedShippingCountries, undefined);
  assert.equal(c.product.priceXor, '1.759225'); assert.equal(c.providers?.fx, undefined);
  try {
    for (const country of countries) {
      const rate = c.shipping.find((row) => row.countries.includes(country) && row.maxGrams >= 200)!;
      const order = store.create({ productId: c.product.id, quantity: 1, shippingRateId: rate.id, payer, idempotencyKey: randomUUID(), address: { name: 'Synthetic', line1: 'Synthetic', city: 'Synthetic', country }, contact: { type: 'telegram', value: '@synthetic' } });
      const total = BigInt(xorToCodec('1.759225', 18, c.chain.denomination)) + BigInt(xorToCodec(rate.priceXor!, 18, c.chain.denomination));
      assert.equal(order.paymentRequest.amountCodec, total.toString(), country);
      assert.equal(order.paymentRequest.recipient, c.chain.recipient);
      assert.equal(order.status, 'awaiting_payment');
    }
    const publicCatalog = JSON.stringify(store.catalog());
    for (const privateField of ['restrictedReviewVersion', 'shippingEligibility', 'jpyPerUsd', 'usdPerXor', 'fxSource', 'personalUse']) assert(!publicCatalog.includes(privateField));
  } finally { store.close(); }
});

test('product-specific service exclusions, carrier-only routes, frozen Taiwan prices and destination limits are enforced', () => {
  const c = config();
  const rates = (country: string) => c.shipping.filter((rate) => rate.countries.includes(country));
  for (const country of ['FR', 'AD', 'MC', 'GP', 'GF', 'MQ', 'RE', 'IN']) {
    assert(rates(country).length > 0, country); assert(rates(country).every((rate) => rate.carrier?.service !== 'ems'), country);
  }
  assert(rates('FJ').every((rate) => rate.carrier?.service === 'parcel-surface'));
  assert(rates('XK').length > 0); assert(rates('JP').length > 1);
  for (const country of ['CO', 'MA', 'TR', 'RU']) assert.equal(rates(country).length, 0, country);
  assert.equal(rates('TW').find((rate) => rate.maxGrams === 500)?.priceXor, '1.700584');
  assert.equal(Math.max(...rates('TW').map((rate) => rate.maxGrams)), 6000);
  for (const [country, maxBags] of [['AR', 3], ['TH', 10], ['SG', 8], ['LV', 2], ['LT', 2]] as const) {
    const last = rates(country).at(-1)!; assert(last, country);
    assert.equal(Math.floor((last.maxGrams - 80) / 120), maxBags, country);
    const store = new OrderStore(':memory:', c, Buffer.alloc(32, 7));
    try { assert.throws(() => store.create({ productId: c.product.id, quantity: maxBags + 1, shippingRateId: last.id, payer, idempotencyKey: randomUUID(), address: { name: 'Synthetic', line1: 'Synthetic', city: 'Synthetic', country }, contact: { type: 'telegram', value: '@synthetic' } }), /Shipping inquiry/); } finally { store.close(); }
  }
});
