import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { buildFixedPostalRates, buildLetterPackRates } from '../shipping-rates.ts';

const policy = { packedGrams: 120, packagingGrams: 80, jpyPerUsd: '158.78', usdPerXor: '5.37', reviewedAt: '2026-09-27' };
const bands = [ { service: 'ems' as const, zone: 1 as const, maxGrams: 500, priceJpy: '1450' }, { service: 'ems' as const, zone: 1 as const, maxGrams: 600, priceJpy: '1600' } ];
test('a clipped legal limit still charges the actual containing postal band, using fixed exact XOR amounts', () => {
  const result = buildFixedPostalRates(bands, [{ country: 'TW', carrier: { service: 'ems' }, zone: 1, maxGrams: 550 }], policy);
  assert.equal(result.length, 2); assert.equal(result[0]!.priceXor, '1.700584');
  assert.equal(result[1]!.maxGrams, 550); assert.equal(result[1]!.priceXor, '1.876506');
  assert.equal(result[1]!.label, 'Japan Post EMS · up to 550 g');
});
test('countries share identical tariff bands only when routing and legal limits also agree', () => {
  const result = buildFixedPostalRates(bands, ['TW', 'KR'].map((country) => ({ country, carrier: { service: 'ems' as const }, zone: 1 as const, maxGrams: 500 })), policy);
  assert.equal(result.length, 1); assert.deepEqual(result[0]!.countries, ['KR', 'TW']);
  assert.throws(() => buildFixedPostalRates(bands, [{ country: 'TW', carrier: { service: 'parcel-air' }, zone: 1, maxGrams: 500 }], policy), /Missing published postal rates/);
});
test('domestic multiple envelopes preserve per-envelope charges and quote the next pair without an inventory limit', () => {
  const result = buildLetterPackRates(policy);
  assert.equal(result[0]!.maxGrams, 320); assert.equal(result[0]!.priceXor, '0.703690');
  assert.equal(result[1]!.maxGrams, 560); assert.equal(result[1]!.priceXor, '1.407380');
  assert.equal(result.at(-1)!.maxGrams, 29960); assert.equal(result.length, 125);
  assert.throws(() => buildLetterPackRates({ ...policy, packedGrams: 3000 }), /Invalid Letter Pack packing model/);
});
