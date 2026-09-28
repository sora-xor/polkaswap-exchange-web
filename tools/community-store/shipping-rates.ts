import { createHash } from 'node:crypto';
import type { EmsZone, PostalRoute, PostalService } from '@sora/sora-pay/providers';
import { xorPriceFromJpy, type MerchantConfig } from '@sora/sora-pay/relay';

export interface ReviewedPostalDestination {
  country: string; carrier: PostalRoute; zone: EmsZone; maxGrams: number;
}
export interface PublishedPostalBand { service: PostalService; zone: EmsZone; maxGrams: number; priceJpy: string; }
export interface FrozenShippingPolicy { packedGrams: number; packagingGrams: number; jpyPerUsd: string; usdPerXor: string; reviewedAt: string; }

/** Freeze published tariff bands with country limits, keeping the price of the band that actually covers the parcel. */
export function buildFixedPostalRates(bands: readonly PublishedPostalBand[], destinations: readonly ReviewedPostalDestination[], policy: FrozenShippingPolicy): MerchantConfig['shipping'] {
  if (!Number.isSafeInteger(policy.packedGrams) || policy.packedGrams < 1 || !Number.isSafeInteger(policy.packagingGrams) || policy.packagingGrams < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(policy.reviewedAt)) throw new Error('Invalid shipping policy');
  const groups = new Map<string, MerchantConfig['shipping'][number]>();
  const seen = new Set<string>();
  const labels: Record<string, string> = { ems: 'EMS', 'parcel-air': 'Air Parcel', 'parcel-surface': 'Surface Parcel', 'small-packet-air': 'Air Small Packet (untracked)', 'small-packet-surface': 'Surface Small Packet (untracked)' };
  for (const destination of destinations) {
    if (!/^[A-Z]{2}$/.test(destination.country) || seen.has(destination.country) || !Number.isSafeInteger(destination.maxGrams) || destination.maxGrams < 1 || destination.maxGrams > 30000) throw new Error('Invalid postal destination');
    seen.add(destination.country);
    const selected = bands.filter((band) => band.service === destination.carrier.service && band.zone === destination.zone).sort((a, b) => a.maxGrams - b.maxGrams);
    if (!selected.length || !labels[destination.carrier.service]) throw new Error('Missing published postal rates');
    let previous = 0;
    for (const band of selected) {
      if (!Number.isSafeInteger(band.maxGrams) || band.maxGrams < 1 || band.maxGrams > 30000 || !/^[1-9]\d*$/.test(band.priceJpy)) throw new Error('Invalid published postal band');
      const maxGrams = Math.min(band.maxGrams, destination.maxGrams);
      if (maxGrams <= previous) break;
      previous = maxGrams;
      if (maxGrams < policy.packedGrams + policy.packagingGrams) continue;
      const priceXor = xorPriceFromJpy(band.priceJpy, policy.jpyPerUsd, policy.usdPerXor);
      const key = JSON.stringify([destination.carrier, destination.zone, band.maxGrams, maxGrams, priceXor]);
      const existing = groups.get(key);
      if (existing) { existing.countries.push(destination.country); continue; }
      const digest = createHash('sha256').update(key).digest('hex').slice(0, 12);
      groups.set(key, { id: `jp-${destination.carrier.service}-${destination.zone}-${band.maxGrams}-${digest}`, carrier: { ...destination.carrier }, countries: [destination.country], maxGrams, priceXor,
        label: `Japan Post ${labels[destination.carrier.service]} · up to ${maxGrams} g`, reviewedAt: policy.reviewedAt });
    }
  }
  return [...groups.values()].map((rate) => ({ ...rate, countries: rate.countries.sort() }));
}

/** Price domestic tea in separate designated envelopes, two bags per envelope, with no stock cap. */
export function buildLetterPackRates(policy: FrozenShippingPolicy): MerchantConfig['shipping'] {
  const rates: MerchantConfig['shipping'] = [];
  const maxItems = Math.floor((30000 - policy.packagingGrams) / policy.packedGrams);
  // maxGrams is the checkout's aggregate-weight boundary. Each physical envelope
  // contains at most two bags; its separate gross weight stays below the 4kg service limit.
  if (!Number.isSafeInteger(maxItems) || maxItems < 1 || maxItems > 1000 || policy.packedGrams * 2 + policy.packagingGrams > 4000) throw new Error('Invalid Letter Pack packing model');
  for (let envelopes = 1; envelopes <= Math.ceil(maxItems / 2); envelopes++) {
    const items = Math.min(envelopes * 2, maxItems);
    rates.push({ id: `jp-letter-pack-plus-${envelopes}`, carrier: { service: 'letter-pack-plus' }, countries: ['JP'], maxGrams: items * policy.packedGrams + policy.packagingGrams,
      priceXor: xorPriceFromJpy((600n * BigInt(envelopes)).toString(), policy.jpyPerUsd, policy.usdPerXor),
      label: `Japan Post Letter Pack Plus · ${envelopes} ${envelopes === 1 ? 'envelope' : 'envelopes'}`, reviewedAt: policy.reviewedAt });
  }
  return rates;
}
