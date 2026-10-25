import { computed, onScopeDispose, ref, watch } from 'vue';
import { toValue, type MaybeRefOrGetter } from 'vue';
import type { GetTsPurpose } from '@/features/misc/lib/getTsFlow';
import { useWeb3Store } from '@/stores/web3';
import ethersUtil from '@/utils/ethers-util';
import { readGetTsConversionProgress, type GetTsConversionProgress } from '@/features/misc/lib/getTsConversionProgress';
import { useGetTsPlan } from './useGetTsPlan';
import { captureGetTsConversionFingerprint } from '@/features/misc/lib/getTsConversionRecovery';

/** Tracks a submitted conversion across navigation/reload using receipt evidence, never wallet-balance changes. */
export function useGetTsConversionProgress(purpose: MaybeRefOrGetter<GetTsPurpose> = 'ts') {
  const web3 = useWeb3Store();
  const { plan } = useGetTsPlan(purpose);
  const progress = ref<GetTsConversionProgress>({ state: 'idle' });
  const refreshing = ref(false);
  const reference = computed(() => plan.value.references.conversion ?? '');
  const key = computed(() =>
    JSON.stringify([
      toValue(purpose),
      reference.value,
      web3.evmAddress,
      web3.evmProviderNetwork,
      web3.evmProvider?.uuid,
    ])
  );
  let generation = 0;
  let fingerprintKey = '';
  /** Reads only the selected provider; neither reconnects, replaces, nor retries a financial transaction. */
  async function refresh(): Promise<void> {
    const request = ++generation;
    const captured = key.value;
    refreshing.value = false;
    if (!reference.value) {
      progress.value = { state: 'idle' };
      return;
    }
    if (!web3.evmAddress || web3.evmProviderNetwork !== 1) {
      progress.value = { state: 'unavailable', reference: reference.value };
      return;
    }
    try {
      const provider = ethersUtil.getEthersInstance();
      const current = () =>
        request === generation && key.value === captured && ethersUtil.getEthersInstance() === provider;
      if (fingerprintKey !== captured) {
        // Receipt polling proceeds immediately; capture survives the signing panel's unmount.
        void captureGetTsConversionFingerprint(
          provider,
          reference.value,
          web3.evmAddress,
          toValue(purpose),
          current
        ).then((saved) => {
          if (saved && current()) fingerprintKey = captured;
        });
      }
      refreshing.value = true;
      const result = await readGetTsConversionProgress(provider, reference.value, web3.evmAddress, current);
      if (request === generation && key.value === captured)
        progress.value = current() ? result : { state: 'unavailable', reference: reference.value };
    } catch {
      if (request === generation && key.value === captured)
        progress.value = { state: 'unavailable', reference: reference.value };
    } finally {
      if (request === generation) refreshing.value = false;
    }
  }
  watch(
    key,
    () => {
      progress.value = { state: reference.value ? 'unavailable' : 'idle' };
      void refresh();
    },
    { immediate: true, flush: 'sync' }
  );
  const timer = setInterval(() => {
    if (reference.value && !refreshing.value) void refresh();
  }, 10_000);
  onScopeDispose(() => {
    generation++;
    clearInterval(timer);
  });
  return { progress: computed(() => progress.value), refreshing: computed(() => refreshing.value), refresh };
}
