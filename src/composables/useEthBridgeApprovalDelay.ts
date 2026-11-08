import { computed, ref, watch, type ComputedRef } from 'vue';

import {
  type EthBridgeApprovalDelayProgress,
  getEthBridgeApprovalDelayProgress,
} from '@/features/bridge/pages/bridgeTransactionPage.utils';
import { Operation } from '@/lib/substrate/sdk/types';
import { useSettingsStore } from '@/stores/settings';
import { ethBridgeApi } from '@/utils/bridge/eth/api';
import { ETH_BRIDGE_STATES } from '@/utils/bridge/eth/constants';

import type { IBridgeTransaction } from '@sora-substrate/sdk';
import type { Nullable } from '@/types/common';

/**
 * Follows the bridge peers' signing delay for an outgoing Hashi transfer that is waiting for
 * approvals, so the transaction page can show progress instead of a silent spinner.
 *
 * The delay comes from the runtime constant `ethBridge.outgoingApprovalDelayMs`; on a runtime
 * without it `progress` stays `null`. Progress counts SORA blocks from the request's
 * registration height to the live block number.
 */
export function useEthBridgeApprovalDelay(tx: ComputedRef<Nullable<IBridgeTransaction>>) {
  const settingsStore = useSettingsStore();
  const delayMs = ref(0);
  const submissionHeight = ref<number | null>(null);
  let lookupId = 0;

  /** Request hash of an outgoing Hashi transfer while it waits for the peers' approvals. */
  const pendingRequestHash = computed(() => {
    const item = tx.value;
    const isWaitingForApprovals =
      item?.type === Operation.EthBridgeOutgoing && item.transactionState === ETH_BRIDGE_STATES.SORA_PENDING;

    return isWaitingForApprovals ? (item.hash ?? '') : '';
  });

  watch(
    pendingRequestHash,
    async (hash) => {
      const id = ++lookupId;
      submissionHeight.value = null;
      if (!hash) return;

      try {
        delayMs.value = ethBridgeApi.getOutgoingApprovalDelayMs();
        if (!delayMs.value) return;

        const height = await ethBridgeApi.getRequestSubmissionHeight(hash);
        if (id === lookupId) {
          submissionHeight.value = height > 0 ? height : null;
        }
      } catch (error) {
        console.warn('[Bridge] Failed to read the outgoing approval delay', error);
      }
    },
    { immediate: true }
  );

  const progress = computed<EthBridgeApprovalDelayProgress | null>(() => {
    if (!pendingRequestHash.value || submissionHeight.value === null) return null;

    return getEthBridgeApprovalDelayProgress({
      delayMs: delayMs.value,
      submissionHeight: submissionHeight.value,
      currentBlockNumber: settingsStore.blockNumber,
    });
  });

  return { delayMs, progress };
}
