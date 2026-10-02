import { computed, onScopeDispose, ref, watch } from 'vue';
import { toValue, type MaybeRefOrGetter } from 'vue';
import type { GetTsPurpose } from '@/features/misc/lib/getTsFlow';
import { toAssetId } from '@sora-substrate/sdk/build/assets';
import type { EthHistory } from '@sora-substrate/sdk/build/bridgeProxy/eth/types';
import { api } from '@/lib/soraneo-wallet/src/api';
import { useBridgeStore } from '@/stores/bridge';
import { useWalletStore } from '@/stores/wallet';
import { useWeb3Store } from '@/stores/web3';
import { useSettingsStore } from '@/stores/settings';
import { SoraNetwork } from '@/consts';
import { SORA_FUNDING_MAINNET_GENESIS } from '@/features/misc/lib/tonswapLiquidity';
import {
  evaluateGetTsBridgeProgress,
  matchGetTsBridgeHistory,
  type GetTsBridgeProgress,
} from '@/features/misc/lib/getTsBridgeProgress';
import { isGetTsTransactionReference } from '@/features/misc/lib/getTsPlan';
import { useGetTsPlan } from './useGetTsPlan';
import { useGetTsBridgeDraftTracking } from './useGetTsBridgeDraftTracking';

/** Read-only progress for the explicitly tracked bridge; it never starts/retries a transfer or trusts saved success. */
export function useGetTsBridgeProgress(purpose: MaybeRefOrGetter<GetTsPurpose> = 'ts') {
  const bridge = useBridgeStore();
  const wallet = useWalletStore();
  const web3 = useWeb3Store();
  const settings = useSettingsStore();
  const { plan } = useGetTsPlan(purpose);
  useGetTsBridgeDraftTracking(purpose);
  const progress = ref<GetTsBridgeProgress>({ state: 'idle' });
  const refreshing = ref(false);
  let generation = 0;
  const context = computed(() => ({
    reference: plan.value.references.bridge ?? '',
    purpose: toValue(purpose),
    soraAddress: wallet.address,
    evmAddress: web3.evmAddress,
    mainnet:
      settings.nodeIsConnected &&
      settings.soraNetwork === SoraNetwork.Prod &&
      !!api.connection?.api?.isConnected &&
      api.connection.api.genesisHash.toString().toLowerCase() === SORA_FUNDING_MAINNET_GENESIS &&
      web3.ethBridgeEvmNetwork === 1,
  }));
  const matched = computed(() =>
    matchGetTsBridgeHistory(Object.values(bridge.historyRecord) as EthHistory[], context.value)
  );
  const key = computed(() =>
    JSON.stringify([
      toValue(purpose),
      context.value,
      matched.value?.id,
      matched.value?.amount,
      matched.value?.externalHash,
    ])
  );

  /** Revalidates the incoming transfer at one finalized block and discards results after any account/plan change. */
  async function refresh(): Promise<void> {
    const requestId = ++generation;
    const captured = key.value;
    const row = matched.value;
    const chain = api.connection?.api;
    refreshing.value = false;
    if (!context.value.reference) {
      progress.value = { state: 'idle' };
      return;
    }
    if (
      !row ||
      !chain?.isConnected ||
      chain.genesisHash.toString().toLowerCase() !== SORA_FUNDING_MAINNET_GENESIS ||
      !context.value.mainnet
    ) {
      progress.value = { state: 'unavailable', reference: context.value.reference };
      return;
    }
    refreshing.value = true;
    try {
      const finalizedBlock = (await chain.rpc.chain.getFinalizedHead()).toString();
      const at = await chain.at(finalizedBlock);
      // Hashi's SORA storage network is 0; the corresponding EVM chain is Ethereum mainnet (1).
      const requestHash = (await at.query.ethBridge.loadToIncomingRequestHash(0, row.externalHash!)).toString();
      let result: GetTsBridgeProgress;
      if (!isGetTsTransactionReference(requestHash)) {
        result = {
          state: 'pending',
          reference: row.externalHash,
          historyId: row.id,
          amount: row.amount,
          finalizedBlock,
        };
      } else {
        const [status, data] = await Promise.all([
          at.query.ethBridge.requestStatuses(0, requestHash),
          at.query.ethBridge.requests(0, requestHash),
        ]);
        const request = data.isSome ? data.unwrap() : null;
        const transfer =
          request?.isIncoming && request.asIncoming[0].isTransfer ? request.asIncoming[0].asTransfer : null;
        result = evaluateGetTsBridgeProgress(row, {
          finalizedBlock,
          status: status.toHuman() as string | null,
          ...(transfer
            ? {
                ethereumHash: transfer.txHash.toString(),
                from: transfer.from.toString(),
                to: transfer.to.toString(),
                assetAddress: toAssetId(transfer.assetId),
                amountCodec: transfer.amount.toString(),
              }
            : {}),
        });
      }
      if (requestId === generation && key.value === captured) {
        progress.value =
          api.connection?.api === chain &&
          chain.isConnected &&
          chain.genesisHash.toString().toLowerCase() === SORA_FUNDING_MAINNET_GENESIS
            ? result
            : { state: 'unavailable', reference: row.externalHash, historyId: row.id };
      }
    } catch {
      if (requestId === generation && key.value === captured)
        progress.value = { state: 'unavailable', reference: row.externalHash, historyId: row.id };
    } finally {
      if (requestId === generation) refreshing.value = false;
    }
  }
  watch(
    key,
    () => {
      progress.value = { state: context.value.reference ? 'unavailable' : 'idle' };
      void refresh();
    },
    { immediate: true, flush: 'sync' }
  );
  const timer = setInterval(() => {
    if (!refreshing.value && context.value.reference) void refresh();
  }, 15_000);
  onScopeDispose(() => {
    generation += 1;
    clearInterval(timer);
  });
  return { progress: computed(() => progress.value), refreshing: computed(() => refreshing.value), refresh };
}
