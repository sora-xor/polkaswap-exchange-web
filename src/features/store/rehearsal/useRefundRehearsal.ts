import { onBeforeUnmount, ref, shallowRef } from 'vue';

import { useInternalConnect } from '@/composables/useInternalConnect';
import { useTransaction } from '@/composables/useTransaction';
import { useTranslation } from '@/composables/useTranslation';

import { createStoreWalletAdapter } from '../walletAdapter';
import { parseRefundHandoff, refundRequest, type RefundHandoff } from './client';

/** One reviewed private refund using the normal wallet; root owns the separate real operator lease. */
export function useRefundRehearsal() {
  const { t } = useTranslation();
  const { isLoggedIn, soraAddress, connectSoraWallet } = useInternalConnect();
  const { withNotifications } = useTransaction();
  const handoff = shallowRef<RefundHandoff | null>(null);
  const failed = ref(false);
  let disposed = false;
  let localAttempt: string | undefined;

  /** Recover the permanent local journal state; a claimed attempt is never silently made payable again. */
  async function refresh(): Promise<void> {
    try {
      const next = parseRefundHandoff(await refundRequest());
      if (!disposed) {
        handoff.value = next;
        failed.value = false;
      }
    } catch {
      if (!disposed) {
        handoff.value = null;
        failed.value = true;
      }
    }
  }

  /** Mount only an unclaimed reviewed request, with a durable local claim before the signer is invoked. */
  async function mountPayment(container: HTMLElement): Promise<() => void> {
    const saved = handoff.value;
    if (!saved || saved.state !== 'available' || disposed) throw new Error('refund_unavailable');
    const widget = await import('@sora/sora-pay/widget');
    if (disposed) throw new Error('refund_unavailable');
    const adapter = createStoreWalletAdapter({
      address: () => soraAddress.value,
      connected: () => !disposed && isLoggedIn.value,
      async connect() {
        if (disposed) throw new Error('refund_unavailable');
        await connectSoraWallet();
      },
      async withNotifications(handler) {
        if (disposed) throw new Error('refund_unavailable');
        return withNotifications(async () => {
          if (disposed) throw new Error('refund_unavailable');
          await handler();
        });
      },
      async beginAttempt() {
        if (disposed) throw new Error('refund_unavailable');
        const result = (await refundRequest('claim', {
          handoffSha256: saved.handoffSha256,
          orderId: saved.orderId,
        })) as { attemptToken?: unknown };
        if (typeof result.attemptToken !== 'string' || !/^[a-f0-9]{64}$/.test(result.attemptToken))
          throw new Error('refund_claim_failed');
        localAttempt = result.attemptToken;
        if (disposed) {
          // No signer has run; record cancellation without ever releasing the permanent local claim.
          await refundRequest('canceled', { attemptToken: localAttempt }).catch(() => undefined);
          throw new Error('refund_unavailable');
        }
        return localAttempt;
      },
      async cancelAttempt(attemptToken) {
        await refundRequest('canceled', { attemptToken });
        await refresh();
      },
      async reportTransaction(transactionHash, attemptToken) {
        await refundRequest('submitted', { attemptToken, transactionHash });
        await refresh();
      },
      onPending() {
        // The durable claim already locks the request, even if this extra status write is interrupted.
        if (localAttempt) void refundRequest('uncertain', { attemptToken: localAttempt }).catch(() => undefined);
      },
    });
    const messages = Object.fromEntries(
      Object.keys(widget.DEFAULT_MESSAGES).map((key) => [key, t(`communityStore.widget.${key}`)])
    );
    const element = widget.mountSoraPay(container, {
      request: saved.paymentRequest,
      adapter,
      messages: { ...messages, title: t('communityStore.refundTitle') },
      async reconcile() {
        await refresh();
        // Only the separately authenticated finalized-chain verifier can establish the refund outcome.
        return null;
      },
    });
    return () => {
      element.controller?.dispose();
      element.remove();
    };
  }

  onBeforeUnmount(() => {
    disposed = true;
  });
  return { handoff, failed, refresh, mountPayment };
}
