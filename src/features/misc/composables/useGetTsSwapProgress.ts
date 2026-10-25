import { computed, onScopeDispose, ref, watch } from 'vue';
import { toValue, type MaybeRefOrGetter } from 'vue';
import type { GetTsPurpose } from '@/features/misc/lib/getTsFlow';
import { api } from '@/lib/soraneo-wallet/src/api';
import { useWalletStore } from '@/stores/wallet';
import { useSettingsStore } from '@/stores/settings';
import { SoraNetwork } from '@/consts';
import { SORA_FUNDING_MAINNET_GENESIS } from '@/features/misc/lib/tonswapLiquidity';
import {
  matchGetTsSwapHistory,
  readGetTsSwapProgress,
  type GetTsArchivedSwapEvidence,
  type GetTsSwapProgress,
  type GetTsSwapReadClient,
} from '@/features/misc/lib/getTsSwapProgress';
import { useGetTsPlan } from './useGetTsPlan';
import { readGetTsSwapArchive } from '@/features/misc/lib/getTsSwapArchive';
import { matchGetTsSwapDraft } from '@/features/misc/lib/getTsSwapDraft';
import { DAI, XOR } from '@sora-substrate/sdk/build/assets/consts';
import { Operation, type HistoryItem } from '@sora-substrate/sdk';

/** Observes the tracked swap without wallet actions; balances never prove this transaction completed. */
export function useGetTsSwapProgress(purpose: MaybeRefOrGetter<GetTsPurpose> = 'ts') {
  const wallet = useWalletStore();
  const settings = useSettingsStore();
  const { plan, trackSwapSubmission } = useGetTsPlan(purpose);
  const progress = ref<GetTsSwapProgress>({ state: 'idle' });
  const refreshing = ref(false);
  const sdkEvidence = ref<{ purpose: GetTsPurpose; reference: string; row: HistoryItem } | null>(null);
  let generation = 0;
  let terminal: { key: string; progress: GetTsSwapProgress } | undefined;
  const reference = computed(() => plan.value.references.swap ?? '');
  const histories = computed(() => [
    ...Object.values(wallet.history ?? {}),
    ...Object.values(wallet.externalHistory ?? {}),
    ...Object.values(wallet.externalHistoryUpdates ?? {}),
  ]);
  const draftRow = computed(() => histories.value.find((row) => row.id === plan.value.swapDraft?.id));
  const row = computed(() =>
    matchGetTsSwapHistory(
      [
        ...histories.value,
        ...(sdkEvidence.value?.purpose === toValue(purpose) && sdkEvidence.value.reference === reference.value
          ? [sdkEvidence.value.row]
          : []),
      ],
      reference.value,
      wallet.address
    )
  );
  const key = computed(() =>
    JSON.stringify([
      toValue(purpose),
      reference.value,
      plan.value.swapDraft,
      draftRow.value?.txId,
      wallet.address,
      settings.soraNetwork,
      settings.nodeIsConnected,
      row.value?.id,
      row.value?.blockId,
    ])
  );
  /** A saved block is only a hint; every refresh verifies canonical finality, hash, signer and exact swap events. */
  async function refresh(): Promise<void> {
    const request = ++generation;
    const captured = key.value;
    const draft = plan.value.swapDraft;
    refreshing.value = false;
    // An idle purchase must not touch metadata while the SDK is still connecting.
    if (!draft && !reference.value) {
      progress.value = { state: 'idle' };
      return;
    }
    const currentChain = api.connection?.api;
    const unavailableProgress: GetTsSwapProgress = reference.value
      ? { state: 'unavailable', reference: reference.value }
      : { state: 'unavailable', historyId: draft?.id };
    if (!settings.nodeIsConnected || settings.soraNetwork !== SoraNetwork.Prod || !currentChain?.isConnected) {
      progress.value = unavailableProgress;
      return;
    }
    progress.value = unavailableProgress;
    refreshing.value = true;
    try {
      // A connected transport can precede initialized ApiPromise metadata/getters.
      await currentChain.isReady;
    } catch {
      if (request === generation && key.value === captured) {
        progress.value = unavailableProgress;
        refreshing.value = false;
      }
      return;
    }
    if (
      request !== generation ||
      key.value !== captured ||
      api.connection?.api !== currentChain ||
      !settings.nodeIsConnected ||
      settings.soraNetwork !== SoraNetwork.Prod ||
      !currentChain.isConnected
    ) {
      if (request === generation) {
        progress.value = unavailableProgress;
        refreshing.value = false;
      }
      return;
    }
    refreshing.value = false;
    const genesis = currentChain.genesisHash.toString().toLowerCase();
    if (
      draft &&
      settings.nodeIsConnected &&
      settings.soraNetwork === SoraNetwork.Prod &&
      currentChain?.isConnected &&
      genesis === SORA_FUNDING_MAINNET_GENESIS
    ) {
      // The SDK writes this exact deterministic row before Pinia history can catch up.
      const submitted = api.getHistory?.(draft.id) ?? draftRow.value;
      if (submitted && trackSwapSubmission(submitted, wallet.address, genesis)) return;
    }
    if (reference.value) {
      const before = key.value;
      // SDK history is storage-backed, not reactive. Read it anew on each status
      // refresh so delayed txId/blockId writes do not require a Pinia notification.
      try {
        const sdkRow = matchGetTsSwapHistory(api.historyList ?? [], reference.value, wallet.address);
        if (sdkRow) sdkEvidence.value = { purpose: toValue(purpose), reference: reference.value, row: { ...sdkRow } };
      } catch {
        /* Unavailable storage cannot manufacture receipt evidence. */
      }
      if (key.value !== before) return; // The synchronous key watcher owns the updated read.
    }
    const chain = currentChain;
    if (!reference.value) {
      const sameDraft =
        draft &&
        matchGetTsSwapDraft(
          {
            id: draft.id,
            amount: draft.amount,
            from: wallet.address,
            type: Operation.Swap,
            assetAddress: DAI.address,
            asset2Address: XOR.address,
          },
          draft,
          wallet.address,
          genesis,
          toValue(purpose)
        );
      progress.value = draft
        ? {
            state: sameDraft && settings.nodeIsConnected && currentChain?.isConnected ? 'pending' : 'unavailable',
            historyId: draft.id,
          }
        : { state: 'idle' };
      return;
    }
    const current = () =>
      request === generation &&
      key.value === captured &&
      api.connection?.api === chain &&
      settings.nodeIsConnected &&
      settings.soraNetwork === SoraNetwork.Prod &&
      !!chain?.isConnected &&
      chain.genesisHash.toString().toLowerCase() === SORA_FUNDING_MAINNET_GENESIS;
    if (!current() || !row.value) {
      progress.value = { state: 'unavailable', reference: reference.value };
      return;
    }
    if (terminal?.key === captured) {
      progress.value = terminal.progress;
      return;
    }
    refreshing.value = true;
    const result = await readGetTsSwapProgress(
      chain as unknown as GetTsSwapReadClient,
      row.value,
      reference.value,
      wallet.address,
      current,
      async (hash, height) => {
        const registry = chain!.registry;
        const version = chain!.runtimeVersion;
        const runtime = {
          specName: version.specName.toString(),
          specVersion: version.specVersion.toNumber(),
          transactionVersion: version.transactionVersion.toNumber(),
          stateVersion: version.stateVersion.toNumber(),
        };
        return readGetTsSwapArchive(hash, height, runtime, {
          fetch: globalThis.fetch.bind(globalThis),
          isCurrent: () => current() && chain!.registry === registry && chain!.runtimeVersion === version,
          decodeBlock: (value) => registry.createType('SignedBlock', value).block,
          decodeEvents: (value) =>
            registry.createType('Vec<EventRecord>', value) as unknown as GetTsArchivedSwapEvidence['events'],
        });
      }
    );
    if (request === generation && key.value === captured) {
      progress.value = current() ? result : { state: 'unavailable', reference: reference.value };
      if (current() && ['received', 'failed'].includes(result.state)) terminal = { key: captured, progress: result };
    }
    if (request === generation) refreshing.value = false;
  }
  watch(
    key,
    () => {
      terminal = undefined;
      progress.value = { state: reference.value ? 'unavailable' : 'idle' };
      void refresh();
    },
    { immediate: true, flush: 'sync' }
  );
  const timer = setInterval(() => {
    if (!refreshing.value && (reference.value || plan.value.swapDraft)) void refresh();
  }, 10_000);
  onScopeDispose(() => {
    generation++;
    clearInterval(timer);
  });
  return { progress: computed(() => progress.value), refreshing: computed(() => refreshing.value), refresh };
}
