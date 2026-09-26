import type { PaymentRequest, PaymentReceipt } from '@sora/sora-pay/core';

/** Saved order terms remain authoritative after the merchant changes its refund policy. */
export type CommunityRefundPolicy = { version: 1; mode: 'full' } | { version: 2; mode: 'net-network-fee' };

/** Public, release-pinned identity. Empty values deliberately disable checkout. */
export interface CommunityStoreConfig {
  version: 1;
  relayUrl: string | null;
  merchantId: string;
  recipient: string | null;
}

/** Public merchandise and shipping configuration; contains no delivery credentials. */
export interface CommunityStoreCatalog {
  version: string;
  enabled: boolean;
  refundPolicy?: CommunityRefundPolicy;
  merchant: {
    id: string;
    name: string;
    operatorName: string;
    supportEmail?: string;
    supportTelegram?: string;
    dispatchPolicy: string;
    customsPolicy: string;
    privacyPolicy: string;
    cancellationPolicy: string;
  };
  pricing: {
    kind: 'exact-xor';
    version: string;
  };
  product: {
    id: string;
    name: string;
    grams: number;
    priceXor: string;
    stockAvailable: number | null;
    packedGrams: number;
    packagingGrams?: number;
    fulfillmentMode?: 'on-demand' | 'stocked';
  };
  shipping: Array<{ id: string; countries: string[]; maxGrams: number; priceXor: string; label: string }>;
  chain: { genesisHash: string; assetId: string; decimals: number; denomination: string; recipient: string };
}

/** Private form values are sent only in the relay POST body. */
export interface CommunityStoreInput {
  quantity: number;
  shipping: {
    name: string;
    country: string;
    address1: string;
    address2?: string;
    city: string;
    region?: string;
    postalCode: string;
  };
  contact: { kind: 'email' | 'telegram'; value: string };
}

export interface CommunityStoreQuote {
  unitXor: string;
  shippingXor: string;
  totalXor: string;
  shippingLabel: string;
  shippingRateId: string;
}

export type CommunityOrderStatus =
  | 'awaiting_payment'
  | 'payment_pending'
  | 'paid'
  | 'shipping_review'
  | 'shipped'
  | 'refund_pending'
  | 'refunded'
  | 'expired'
  | 'review';

/** The recovery capability is private and is never a route or on-chain reference. */
export interface CommunityStoreOrder {
  orderId: string;
  recoveryToken: string;
  paymentRequest: PaymentRequest;
  status: CommunityOrderStatus;
  notificationStatus: string;
  paymentPending?: boolean;
  refundPolicy?: CommunityRefundPolicy;
  refundFeeCorrectionCodec?: string;
  receipt?: PaymentReceipt;
  tracking?: string;
  refund?: {
    grossAmountCodec: string;
    amountCodec?: string;
    feeExempt: boolean;
    feeQuote?: { amountCodec: string; feeCodec: string; blockHash: string; blockNumber: string; expiresAt: string };
    actualFeeCodec?: string;
    deductedFeeCodec?: string;
    feeCorrectionCodec?: string;
    transactionHash?: string;
  };
}
