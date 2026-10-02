import { validatePaymentRequest, type PaymentRequest } from '@sora/sora-pay/core';

import { canonicalStoreAddress, STORE_MAINNET_GENESIS, StoreClientError } from '../client';

const PREFIX = '/__store-refund-rehearsal/v1';
const GROUP = 'cnWUWKLZmNjQXGzYAF7YuRSiW1pKTRTzu4fmcYmWQX6UMGQUZ';
export interface RefundHandoff {
  version: 1;
  orderId: string;
  handoffSha256: string;
  paymentRequest: PaymentRequest;
  state: 'available' | 'claimed' | 'uncertain' | 'canceled' | 'submitted';
  transactionHash?: string;
}

/** Validate the projected reviewed request again before any wallet control is mounted. */
export function parseRefundHandoff(value: unknown): RefundHandoff {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new StoreClientError('invalid_refund');
  const handoff = value as RefundHandoff;
  const request = handoff.paymentRequest;
  try {
    if (
      Object.keys(handoff).some(
        (key) => !['version', 'orderId', 'handoffSha256', 'paymentRequest', 'state', 'transactionHash'].includes(key)
      )
    )
      throw new Error();
    if (
      Object.keys(request).some(
        (key) =>
          ![
            'version',
            'merchant',
            'chainGenesisHash',
            'assetId',
            'payer',
            'recipient',
            'amountCodec',
            'decimals',
            'denomination',
            'reference',
            'expiresAt',
          ].includes(key)
      )
    )
      throw new Error();
    validatePaymentRequest(request);
    if (
      handoff.version !== 1 ||
      !/^[a-f0-9]{64}$/.test(handoff.handoffSha256) ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(handoff.orderId) ||
      !['available', 'claimed', 'uncertain', 'canceled', 'submitted'].includes(handoff.state) ||
      request.payer !== GROUP ||
      canonicalStoreAddress(request.recipient) !== request.recipient ||
      request.recipient === GROUP ||
      request.merchant.id !== 'polkaswap-community-store' ||
      request.merchant.name !== 'Polkaswap Community Store' ||
      request.chainGenesisHash !== STORE_MAINNET_GENESIS ||
      request.assetId !== '0x0200000000000000000000000000000000000000000000000000000000000000' ||
      request.decimals !== 18 ||
      request.denomination !== '100000000000000000000000000000000000000' ||
      !/^sp_[a-f0-9]{32}$/.test(request.reference) ||
      (handoff.transactionHash !== undefined && !/^0x[a-f0-9]{64}$/.test(handoff.transactionHash))
    )
      throw new Error();
  } catch {
    throw new StoreClientError('invalid_refund');
  }
  return structuredClone(handoff);
}

/** Same-origin, no-store transport never contains an operator or order recovery credential. */
export async function refundRequest(action = '', body?: Record<string, string>): Promise<unknown> {
  if (
    location.origin !== 'http://127.0.0.1:41829' ||
    !['', 'claim', 'submitted', 'uncertain', 'canceled'].includes(action)
  )
    throw new StoreClientError('refund_unavailable');
  const response = await fetch(PREFIX + (action ? '/' + action : ''), {
    method: body ? 'POST' : 'GET',
    credentials: 'omit',
    cache: 'no-store',
    redirect: 'error',
    headers: { 'X-Sora-Pay-Rehearsal': '1', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new StoreClientError('refund_unavailable');
  return response.json();
}
