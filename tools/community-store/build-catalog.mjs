/** Rebuild only the reviewed Polkaswap catalog; no fetch, deployment, notification or signing side effects. */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildFixedPostalRates, buildLetterPackRates } from './shipping-rates.ts';
import { validateConfig } from '@sora/sora-pay/relay';

const data = (name) => JSON.parse(readFileSync(new URL(`./shipping/${name}.json`, import.meta.url), 'utf8'));

/** Preserve merchant/payment/FX/refund settings and replace only the reviewed worldwide shipping configuration. */
export function assembleWorldwideMerchant(base, decisions = data('tea-destinations'), published = data('japan-post-rates'), availability = data('japan-post-availability')) {
  const next = structuredClone(base);
  if (next.merchant.id !== 'polkaswap-community-store' || next.product.id !== 'shizuoka-organic-sencha-100g' || next.product.priceXor !== '1.759225' || next.pricing.kind !== 'exact-xor') throw new Error('Unexpected merchant pricing or product');
  const policy = { packedGrams: next.product.packedGrams, packagingGrams: next.product.packagingGrams, jpyPerUsd: next.pricing.jpyPerUsd, usdPerXor: next.pricing.usdPerXor, reviewedAt: decisions.reviewedAt };
  const routes = decisions.decisions.filter((row) => row.checkout).map((row) => ({ country: row.code, zone: row.zone, maxGrams: row.maxGrams, carrier: { service: row.service,
    ...(row.carrierAlias ? { availabilityCountry: row.carrierAlias } : {}), ...(row.carrierRestrictionsReviewed ? { restrictedReviewVersion: availability.version } : {}) } }));
  next.shipping = [...buildFixedPostalRates(published.bands, routes, policy), ...buildLetterPackRates(policy)];
  for (const rate of next.shipping) if (rate.countries.includes('TW')) {
    const previous = base.shipping.find((row) => row.countries.includes('TW') && row.maxGrams === rate.maxGrams);
    if (previous) { if (previous.priceXor !== rate.priceXor) throw new Error('Frozen Taiwan price changed'); rate.id = previous.id; }
  }
  next.version = 'polkaswap-store-worldwide-2026-09-27';
  delete next.approvedShippingCountries;
  next.providers = { ...next.providers, shipping: 'japan-post' };
  next.merchant.customsPolicy = 'We ship from Japan wherever Japan Post accepts this tea. Volunteers confirm postal coverage and complete the required customs and food-import paperwork before dispatch. Some destinations are served by surface mail. Import duties and taxes may be payable by the recipient. If we cannot ship your order, we refund it under the refund terms.';
  next.sourceMetadata = { ...next.sourceMetadata,
    shipping: { version: availability.version, fetchedAt: availability.fetchedAt, availabilityUpdatedLabel: availability.availabilityUpdatedLabel, sources: availability.sources },
    shippingEligibility: { version: 'sencha-worldwide-2026-09-27', reviewedAt: policy.reviewedAt, rulesSha256: decisions.rulesSha256, countries: routes.map((row) => row.country).concat('JP').sort(), notes: 'Sealed plain sencha sold to individuals. Dispatch remains subject to the documented import and postal conditions. No customer personal-use confirmation.' } };
  validateConfig({ ...structuredClone(next), enabled: true });
  if (next.shipping.length > 3000) throw new Error('Frontend catalog limit exceeded');
  return next;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length !== 4 || args[0] !== '--base' || args[2] !== '--output') throw new Error('Usage: --base merchant.json --output new-merchant.json');
  const merchant = assembleWorldwideMerchant(JSON.parse(readFileSync(args[1], 'utf8')));
  writeFileSync(args[3], JSON.stringify(merchant, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ enabled: merchant.enabled, destinations: merchant.sourceMetadata.shippingEligibility.countries.length, shippingBands: merchant.shipping.length }));
}
