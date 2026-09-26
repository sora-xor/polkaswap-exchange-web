import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';
import {
  codecAmount,
  fromCodec,
  NATIVE_XOR_ASSET_ID,
  toCodec,
  validatePaymentRequest,
  verifyFinalizedPayment,
} from '@sora/sora-pay/core';

import type { CommunityStoreCatalog, CommunityStoreConfig, CommunityStoreOrder, CommunityStoreQuote } from './types';

export const STORE_MAINNET_GENESIS = '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5';
/** Public Store support remains pinned even when an older relay returns other contacts. */
export const STORE_SUPPORT_TELEGRAM = 'sora_xor';
/** Fixed merchandise price; changing it requires an explicit merchant repricing release. */
export const STORE_TEA_UNIT_XOR = '1.759225';
const ORDER_STATUSES = new Set([
  'awaiting_payment',
  'payment_pending',
  'paid',
  'shipping_review',
  'shipped',
  'refund_pending',
  'refunded',
  'expired',
  'review',
]);

/** Errors contain stable codes only, never private form data or provider responses. */
export class StoreClientError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = 'StoreClientError';
  }
}

/** Normalize an actual checksum-validated SORA account, not a display abbreviation. */
export function canonicalStoreAddress(value: string): string {
  try {
    const decoded = decodeAddress(value);
    if (decoded.length !== 32) throw new Error('account');
    return encodeAddress(decoded, 69);
  } catch {
    throw new StoreClientError('invalid_address');
  }
}

/** Reject arrays and primitive server responses before inspecting their fields. */
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new StoreClientError('invalid_response');
  return value as Record<string, unknown>;
}

/** Read bounded text; returned data is rendered as text, never HTML. */
function text(value: unknown, maximum = 4000): string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.length > maximum ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
  )
    throw new StoreClientError('invalid_response');
  return value;
}

/** Only configured HTTPS relays (or loopback in local development) may receive orders. */
export function parseStoreConfig(value: unknown, allowLoopback = false): CommunityStoreConfig {
  const row = record(value);
  if (row.version !== 1 || !/^[a-z0-9][a-z0-9._-]{0,79}$/.test(String(row.merchantId)))
    throw new StoreClientError('invalid_config');
  const config: CommunityStoreConfig = {
    version: 1,
    relayUrl: null,
    merchantId: String(row.merchantId),
    recipient: null,
  };
  if (row.recipient) config.recipient = canonicalStoreAddress(text(row.recipient, 64));
  if (row.relayUrl) {
    const url = new URL(text(row.relayUrl, 512));
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (url.protocol !== 'https:' &&
        !(allowLoopback && url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))
    )
      throw new StoreClientError('invalid_config');
    config.relayUrl = url.href.replace(/\/$/, '');
  }
  return config;
}

/** Verify server identity and price policy against this immutable storefront release. */
export function parseStoreCatalog(value: unknown, config: CommunityStoreConfig): CommunityStoreCatalog {
  const row = record(value);
  const merchant = record(row.merchant);
  const pricing = record(row.pricing);
  const product = record(row.product);
  const chain = record(row.chain);
  const supportEmail = merchant.supportEmail === undefined ? undefined : text(merchant.supportEmail, 254);
  const supportTelegram = merchant.supportTelegram === undefined ? undefined : text(merchant.supportTelegram, 32);
  if (
    (!supportEmail && !supportTelegram) ||
    (supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) ||
    (supportTelegram && !/^[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(supportTelegram))
  )
    throw new StoreClientError('invalid_response');
  if (
    !config.recipient ||
    merchant.id !== config.merchantId ||
    canonicalStoreAddress(text(chain.recipient, 64)) !== config.recipient ||
    chain.genesisHash !== STORE_MAINNET_GENESIS ||
    chain.assetId !== NATIVE_XOR_ASSET_ID ||
    chain.decimals !== 18 ||
    pricing.kind !== 'exact-xor'
  )
    throw new StoreClientError('merchant_mismatch');
  codecAmount(text(chain.denomination, 39), false);
  const unitXor = text(product.priceXor, 60);
  if (toCodec(unitXor, 18) !== toCodec(STORE_TEA_UNIT_XOR, 18)) throw new StoreClientError('price_mismatch');
  if (
    !Number.isSafeInteger(product.grams) ||
    product.grams !== 100 ||
    !Number.isSafeInteger(product.packedGrams) ||
    Number(product.packedGrams) < 100 ||
    Number(product.packedGrams) > 30000 ||
    (product.stockAvailable !== null &&
      (!Number.isSafeInteger(product.stockAvailable) || Number(product.stockAvailable) < 0))
  )
    throw new StoreClientError('invalid_product');
  if (
    product.packagingGrams !== undefined &&
    (!Number.isSafeInteger(product.packagingGrams) ||
      Number(product.packagingGrams) < 0 ||
      Number(product.packagingGrams) > 30000)
  )
    throw new StoreClientError('invalid_product');
  if (!Array.isArray(row.shipping) || row.shipping.length > 3000) throw new StoreClientError('invalid_shipping');
  const shipping = row.shipping.map((input) => {
    const rate = record(input);
    if (
      !Array.isArray(rate.countries) ||
      !rate.countries.length ||
      !rate.countries.every((country) => typeof country === 'string' && /^[A-Z]{2}$/.test(country)) ||
      !Number.isSafeInteger(rate.maxGrams) ||
      Number(rate.maxGrams) < 1 ||
      Number(rate.maxGrams) > 30000
    )
      throw new StoreClientError('invalid_shipping');
    const priceXor = text(rate.priceXor, 60);
    toCodec(priceXor, 18);
    return {
      id: text(rate.id, 120),
      label: text(rate.label, 120),
      countries: rate.countries as string[],
      maxGrams: Number(rate.maxGrams),
      priceXor,
    };
  });
  return {
    version: text(row.version, 120),
    enabled: row.enabled === true,
    merchant: {
      id: config.merchantId,
      name: text(merchant.name, 120),
      operatorName: text(merchant.operatorName, 200),
      supportEmail,
      supportTelegram,
      dispatchPolicy: text(merchant.dispatchPolicy),
      customsPolicy: text(merchant.customsPolicy),
      privacyPolicy: text(merchant.privacyPolicy),
      cancellationPolicy: text(merchant.cancellationPolicy),
    },
    pricing: {
      kind: 'exact-xor',
      version: text(pricing.version, 120),
    },
    product: {
      id: text(product.id, 120),
      name: text(product.name, 200),
      grams: 100,
      priceXor: unitXor,
      stockAvailable: product.stockAvailable as number | null,
      packedGrams: Number(product.packedGrams),
      packagingGrams: Number(product.packagingGrams ?? 0),
      fulfillmentMode: product.fulfillmentMode === 'on-demand' ? 'on-demand' : 'stocked',
    },
    shipping,
    chain: {
      genesisHash: STORE_MAINNET_GENESIS,
      assetId: NATIVE_XOR_ASSET_ID,
      decimals: 18,
      denomination: String(chain.denomination),
      recipient: config.recipient,
    },
  };
}

/** Select the cheapest eligible published rate, preserving exact native XOR amounts. */
export function quoteStoreOrder(
  catalog: CommunityStoreCatalog | null,
  quantity: number,
  country: string
): CommunityStoreQuote | null {
  if (
    !catalog?.enabled ||
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    quantity > 300 ||
    (catalog.product.stockAvailable !== null && quantity > catalog.product.stockAvailable)
  )
    return null;
  const weight = quantity * catalog.product.packedGrams + (catalog.product.packagingGrams ?? 0);
  const rates = catalog.shipping
    .filter((rate) => rate.countries.includes(country) && rate.maxGrams >= weight)
    .sort((left, right) => {
      const a = BigInt(toCodec(left.priceXor, 18));
      const b = BigInt(toCodec(right.priceXor, 18));
      return a < b ? -1 : a > b ? 1 : left.maxGrams - right.maxGrams;
    });
  const rate = rates[0];
  if (!rate) return null;
  const total = BigInt(toCodec(catalog.product.priceXor, 18)) * BigInt(quantity) + BigInt(toCodec(rate.priceXor, 18));
  return {
    unitXor: catalog.product.priceXor,
    shippingXor: rate.priceXor,
    totalXor: fromCodec(total.toString(), 18),
    shippingLabel: rate.label,
    shippingRateId: rate.id,
  };
}

/** Validate private order status and preserve the separate recovery capability. */
export function parseStoreOrder(
  value: unknown,
  config: CommunityStoreConfig,
  recoveryToken?: string
): CommunityStoreOrder {
  const row = record(value);
  const request = row.paymentRequest as CommunityStoreOrder['paymentRequest'];
  validatePaymentRequest(request);
  if (
    !config.recipient ||
    canonicalStoreAddress(request.recipient) !== config.recipient ||
    request.merchant.id !== config.merchantId ||
    request.chainGenesisHash !== STORE_MAINNET_GENESIS ||
    request.decimals !== 18
  )
    throw new StoreClientError('merchant_mismatch');
  if (!ORDER_STATUSES.has(String(row.status))) throw new StoreClientError('invalid_status');
  const orderId = text(row.orderId, 100);
  const token = recoveryToken ?? text(row.recoveryToken, 128);
  if (!/^[A-Za-z0-9_-]{8,100}$/.test(orderId) || !/^[A-Za-z0-9_-]{32,128}$/.test(token))
    throw new StoreClientError('invalid_recovery');
  const order: CommunityStoreOrder = {
    orderId,
    recoveryToken: token,
    paymentRequest: structuredClone(request),
    status:
      row.paymentPending === true && row.status === 'awaiting_payment'
        ? 'payment_pending'
        : (row.status as CommunityStoreOrder['status']),
    paymentPending: row.paymentPending === true,
    notificationStatus: text(row.notificationStatus, 32),
  };
  if (row.receipt) {
    const receipt = record(row.receipt);
    order.receipt = verifyFinalizedPayment(
      request,
      receipt.evidence as NonNullable<CommunityStoreOrder['receipt']>['evidence']
    );
  }
  if (typeof row.tracking === 'string') order.tracking = row.tracking.slice(0, 300);
  if (row.refund) {
    const refund = record(row.refund);
    codecAmount(text(refund.amountCodec, 39));
    order.refund = { amountCodec: String(refund.amountCodec) };
    if (refund.receipt) {
      const receipt = record(refund.receipt);
      const verified = verifyFinalizedPayment(
        {
          ...request,
          payer: request.recipient,
          recipient: request.payer,
          amountCodec: String(refund.amountCodec),
          reference: text(refund.reference, 80),
        },
        receipt.evidence as NonNullable<CommunityStoreOrder['receipt']>['evidence']
      );
      order.refund.transactionHash = verified.evidence.transactionHash;
    }
  }
  return order;
}

/** Bounded, credential-free transport. Private tokens belong in headers, never query strings. */
export async function storeRequest(url: string, body?: unknown, token?: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      method: body === undefined ? 'GET' : 'POST',
      credentials: 'omit',
      redirect: 'error',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) throw new StoreClientError(`http_${response.status}`);
    const raw = await response.text();
    if (raw.length > 2_000_000) throw new StoreClientError('invalid_response');
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      throw new StoreClientError('invalid_response');
    }
  } catch (error) {
    if (error instanceof StoreClientError) throw error;
    throw new StoreClientError('unavailable');
  } finally {
    clearTimeout(timer);
  }
}
