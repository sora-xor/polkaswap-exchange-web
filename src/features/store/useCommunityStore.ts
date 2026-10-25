import { toCodec } from '@sora/sora-pay/core';
import { computed, onBeforeUnmount, ref, shallowRef } from 'vue';

import { useInternalConnect } from '@/composables/useInternalConnect';
import { useTransaction } from '@/composables/useTransaction';
import { useTranslation } from '@/composables/useTranslation';

import {
  canonicalStoreAddress,
  parseStoreCatalog,
  parseStoreConfig,
  parseStoreOrder,
  quoteStoreOrder,
  StoreClientError,
  storeRequest,
} from './client';
import { createStoreWalletAdapter } from './walletAdapter';
import type { CommunityStoreCatalog, CommunityStoreConfig, CommunityStoreInput, CommunityStoreOrder } from './types';

const RECOVERY_STORAGE = 'polkaswap:community-store:recovery:v1';

/** Private order transport and wallet integration; the rest of Polkaswap stays fully static. */
export function useCommunityStore() {
  const { t } = useTranslation();
  const { isLoggedIn, soraAddress, connectSoraWallet } = useInternalConnect();
  const { withNotifications } = useTransaction();
  const catalog = shallowRef<CommunityStoreCatalog | null>(null);
  const order = shallowRef<CommunityStoreOrder | null>(null);
  const config = shallowRef<CommunityStoreConfig | null>(null);
  const loading = ref(false);
  const busy = ref(false);
  const error = ref('');
  const isConnected = isLoggedIn;
  const walletAddress = soraAddress;
  const isAvailable = computed(
    () => !!config.value?.relayUrl && !!config.value?.recipient && catalog.value?.enabled === true
  );
  const status = computed(() => order.value?.status ?? '');
  let disposed = false;
  let pollTimer: ReturnType<typeof setTimeout> | undefined;
  let creationKey: string | null = null;

  /** Persist only private recovery capabilities, never names, addresses, or contact details. */
  function saveRecovery(): void {
    if (!config.value?.relayUrl) return;
    sessionStorage.setItem(
      RECOVERY_STORAGE,
      JSON.stringify({
        relayUrl: config.value.relayUrl,
        merchantId: config.value.merchantId,
        creationKey,
        ...(order.value ? { orderId: order.value.orderId, recoveryToken: order.value.recoveryToken } : {}),
      })
    );
  }

  /** Poll with a single timer; order data remains retrievable after navigation or wallet disconnect. */
  function schedulePoll(): void {
    clearTimeout(pollTimer);
    if (disposed || !order.value || ['shipped', 'refunded'].includes(order.value.status)) return;
    pollTimer = setTimeout(() => {
      void refreshOrder(false);
    }, 8000);
  }

  /** Resolve endpoints solely from the release-pinned relay URL. */
  function endpoint(path: string): string {
    if (!config.value?.relayUrl) throw new StoreClientError('unavailable');
    return `${config.value.relayUrl}/v1/${path}`;
  }

  /** Accept and save an order before mounting any signing control. */
  function acceptOrder(next: CommunityStoreOrder): void {
    order.value = next;
    saveRecovery();
    schedulePoll();
  }

  /** Restore this tab's previous private capability, including a lost create-order response. */
  async function restoreSession(): Promise<void> {
    const raw = sessionStorage.getItem(RECOVERY_STORAGE);
    if (!raw || !config.value) return;
    let saved: {
      relayUrl?: string;
      merchantId?: string;
      creationKey?: string;
      orderId?: string;
      recoveryToken?: string;
    };
    try {
      saved = JSON.parse(raw);
    } catch {
      return;
    }
    if (saved.relayUrl !== config.value.relayUrl || saved.merchantId !== config.value.merchantId) return;
    if (saved.orderId && saved.recoveryToken) {
      await recoverOrder(saved.orderId, saved.recoveryToken);
      return;
    }
    if (saved.creationKey && /^[a-f0-9-]{36}$/.test(saved.creationKey)) {
      creationKey = saved.creationKey;
      try {
        const response = await storeRequest(endpoint('orders/recover-create'), { idempotencyKey: creationKey });
        if (!disposed) acceptOrder(parseStoreOrder(response, config.value));
      } catch (cause) {
        if (!(cause instanceof StoreClientError && cause.code === 'http_404')) throw cause;
      }
    }
  }

  /** Load IPFS-relative public settings and a validated catalog; absent launch settings are normal. */
  async function refreshCatalog(): Promise<void> {
    if (loading.value || disposed) return;
    loading.value = true;
    error.value = '';
    try {
      const source = new URL(`${import.meta.env.BASE_URL}community-store.json`, document.baseURI).href;
      const next = parseStoreConfig(await storeRequest(source), import.meta.env.DEV);
      if (disposed) return;
      config.value = next;
      if (!next.relayUrl || !next.recipient) {
        catalog.value = null;
        return;
      }
      const response = await storeRequest(endpoint('catalog'));
      if (disposed) return;
      if (
        response &&
        typeof response === 'object' &&
        (response as { enabled?: boolean }).enabled === false &&
        !(response as { merchant?: unknown }).merchant
      )
        catalog.value = null;
      else catalog.value = parseStoreCatalog(response, next);
      if (!order.value) await restoreSession();
    } catch {
      if (!disposed) {
        catalog.value = null;
        error.value = t('communityStore.serviceUnavailable');
      }
    } finally {
      loading.value = false;
    }
  }

  /** Quote without touching market-price stores; the relay independently repeats this calculation. */
  function getQuote(quantity: number, country: string) {
    return quoteStoreOrder(catalog.value, quantity, country);
  }

  /** Create a recoverable private order with an idempotency capability before enabling payment. */
  async function createOrder(input: CommunityStoreInput): Promise<void> {
    if (busy.value || disposed || order.value) return;
    error.value = '';
    const quote = getQuote(input.quantity, input.shipping.country);
    if (!isAvailable.value || !catalog.value || !config.value || !quote) {
      error.value = t('communityStore.noQuote');
      return;
    }
    if (!isConnected.value) {
      await connectSoraWallet();
      return;
    }
    busy.value = true;
    try {
      const payer = canonicalStoreAddress(walletAddress.value);
      creationKey ??= crypto.randomUUID();
      // If storage is disabled, fail before posting private data or asking for payment.
      saveRecovery();
      const response = await storeRequest(endpoint('orders'), {
        idempotencyKey: creationKey,
        productId: catalog.value.product.id,
        quantity: input.quantity,
        shippingRateId: quote.shippingRateId,
        payer,
        address: {
          name: input.shipping.name,
          country: input.shipping.country,
          line1: input.shipping.address1,
          line2: input.shipping.address2?.trim() || undefined,
          city: input.shipping.city,
          region: input.shipping.region?.trim() || undefined,
          postalCode: input.shipping.postalCode,
        },
        contact: {
          type: input.contact.kind,
          value:
            input.contact.kind === 'telegram'
              ? `@${input.contact.value.trim().replace(/^@/, '')}`
              : input.contact.value.trim(),
        },
      });
      const next = parseStoreOrder(response, config.value);
      if (
        next.paymentRequest.payer !== payer ||
        next.paymentRequest.amountCodec !== toCodec(quote.totalXor, 18) ||
        next.paymentRequest.denomination !== catalog.value.chain.denomination
      )
        throw new StoreClientError('quote_changed');
      if (!disposed) acceptOrder(next);
    } catch {
      if (!disposed) error.value = t('communityStore.saveFailed');
    } finally {
      busy.value = false;
    }
  }

  /** Read status without trusting a wallet callback as settlement evidence. */
  async function refreshOrder(showBusy = true): Promise<void> {
    const current = order.value;
    if (!current || !config.value || disposed) return;
    if (showBusy) busy.value = true;
    try {
      const response = await storeRequest(
        endpoint(`orders/${encodeURIComponent(current.orderId)}`),
        undefined,
        current.recoveryToken
      );
      if (disposed || order.value?.orderId !== current.orderId || order.value.recoveryToken !== current.recoveryToken)
        return;
      const next = parseStoreOrder(response, config.value, current.recoveryToken);
      if (JSON.stringify(next.paymentRequest) !== JSON.stringify(current.paymentRequest))
        throw new StoreClientError('order_changed');
      order.value = next;
      error.value = '';
    } catch {
      if (!disposed) error.value = t('communityStore.statusUnavailable');
    } finally {
      if (showBusy) busy.value = false;
      schedulePoll();
    }
  }

  /** Recovery tokens travel in Authorization; neither the URL nor public payment reference authorizes access. */
  async function recoverOrder(orderId: string, recoveryToken: string): Promise<void> {
    if (disposed || !config.value?.relayUrl) {
      error.value = t('communityStore.serviceUnavailable');
      return;
    }
    if (!/^[A-Za-z0-9_-]{8,100}$/.test(orderId) || !/^[A-Za-z0-9_-]{32,128}$/.test(recoveryToken)) {
      error.value = t('communityStore.recoverRequired');
      return;
    }
    busy.value = true;
    error.value = '';
    try {
      const response = await storeRequest(endpoint(`orders/${encodeURIComponent(orderId)}`), undefined, recoveryToken);
      if (!disposed) acceptOrder(parseStoreOrder(response, config.value, recoveryToken));
    } catch {
      if (!disposed) error.value = t('communityStore.recoverFailed');
    } finally {
      busy.value = false;
    }
  }

  /** Only expired, unsubmitted orders can be abandoned locally; uncertain payments remain recoverable. */
  function resetOrder(): void {
    if (
      order.value &&
      (!['expired', 'refunded', 'shipped'].includes(order.value.status) ||
        (order.value.status === 'expired' && order.value.paymentPending))
    )
      return;
    clearTimeout(pollTimer);
    order.value = null;
    creationKey = null;
    sessionStorage.removeItem(RECOVERY_STORAGE);
  }

  /** Mount the independently packaged widget after durable order creation. */
  async function createPayment(container: HTMLElement): Promise<() => void> {
    const saved = order.value;
    if (!saved || saved.status !== 'awaiting_payment' || disposed) throw new StoreClientError('payment_unavailable');
    const widget = await import('@sora/sora-pay/widget');
    if (disposed || order.value?.orderId !== saved.orderId) throw new StoreClientError('order_changed');
    const base = `orders/${encodeURIComponent(saved.orderId)}`;
    const adapter = createStoreWalletAdapter({
      address: () => walletAddress.value,
      connected: () => isConnected.value,
      connect: connectSoraWallet,
      withNotifications,
      async beginAttempt() {
        const response = (await storeRequest(endpoint(`${base}/payment-attempt`), {}, saved.recoveryToken)) as {
          attemptToken?: unknown;
        };
        if (typeof response.attemptToken !== 'string') throw new StoreClientError('invalid_attempt');
        return response.attemptToken;
      },
      async cancelAttempt(attemptToken) {
        await storeRequest(endpoint(`${base}/payment-attempt/cancel`), { attemptToken }, saved.recoveryToken);
      },
      async reportTransaction(transactionHash, attemptToken) {
        await storeRequest(endpoint(`${base}/transaction`), { transactionHash, attemptToken }, saved.recoveryToken);
      },
      onPending() {
        if (order.value?.orderId === saved.orderId) {
          order.value = { ...order.value, status: 'payment_pending' };
          schedulePoll();
        }
      },
    });
    const messages = Object.fromEntries(
      Object.keys(widget.DEFAULT_MESSAGES).map((key) => [key, t(`communityStore.widget.${key}`)])
    );
    const element = widget.mountSoraPay(container, {
      request: saved.paymentRequest,
      adapter,
      messages,
      async reconcile() {
        await refreshOrder(false);
        return order.value?.orderId === saved.orderId ? (order.value.receipt?.evidence ?? null) : null;
      },
    });
    return () => {
      element.controller?.dispose();
      element.remove();
    };
  }

  onBeforeUnmount(() => {
    disposed = true;
    clearTimeout(pollTimer);
  });
  return {
    catalog,
    loading,
    busy,
    error,
    isAvailable,
    isConnected,
    walletAddress,
    order,
    status,
    getQuote,
    refreshCatalog,
    createOrder,
    refreshOrder,
    recoverOrder,
    resetOrder,
    createPayment,
    connectWallet: connectSoraWallet,
  };
}
