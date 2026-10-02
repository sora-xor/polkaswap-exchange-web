import { computed, watch, toValue, type MaybeRefOrGetter } from 'vue';
import type { EthHistory } from '@sora-substrate/sdk/build/bridgeProxy/eth/types';
import { api } from '@/lib/soraneo-wallet/src/api';
import { useBridgeStore } from '@/stores/bridge';
import { useWalletStore } from '@/stores/wallet';
import { useWeb3Store } from '@/stores/web3';
import { useSettingsStore } from '@/stores/settings';
import { SoraNetwork } from '@/consts';
import type { GetTsPurpose } from '@/features/misc/lib/getTsFlow';
import { SORA_FUNDING_MAINNET_GENESIS } from '@/features/misc/lib/tonswapLiquidity';
import { useGetTsPlan } from './useGetTsPlan';

/** Recovers only an explicitly reviewed bridge row across reloads or navigation, without inferring completion. */
export function useGetTsBridgeDraftTracking(purpose: MaybeRefOrGetter<GetTsPurpose> = 'ts'): void {
  const bridge = useBridgeStore();
  const wallet = useWalletStore();
  const web3 = useWeb3Store();
  const settings = useSettingsStore();
  const { plan, trackBridgeSubmission } = useGetTsPlan(purpose);
  const context = computed(() => ({
    soraAddress: wallet.address,
    evmAddress: web3.evmAddress,
    mainnet:
      settings.nodeIsConnected &&
      settings.soraNetwork === SoraNetwork.Prod &&
      web3.ethBridgeEvmNetwork === 1 &&
      !!api.connection?.api?.isConnected &&
      api.connection.api.genesisHash?.toString().toLowerCase() === SORA_FUNDING_MAINNET_GENESIS,
  }));
  const reviewedRow = computed(() => {
    const draft = plan.value.bridgeDraft;
    if (!draft) return null;
    const matches = (Object.values(bridge.historyRecord ?? {}) as EthHistory[]).filter((row) => row.id === draft.id);
    return matches.length === 1 ? matches[0] : null;
  });
  watch(
    () =>
      JSON.stringify([
        toValue(purpose),
        plan.value.bridgeDraft,
        context.value,
        reviewedRow.value && [
          reviewedRow.value.id,
          reviewedRow.value.type,
          reviewedRow.value.externalNetwork,
          reviewedRow.value.assetAddress,
          reviewedRow.value.from,
          reviewedRow.value.to,
          reviewedRow.value.amount,
          reviewedRow.value.payload,
          reviewedRow.value.externalHash,
        ],
      ]),
    () => {
      if (reviewedRow.value) trackBridgeSubmission(reviewedRow.value, context.value);
    },
    { immediate: true, flush: 'sync' }
  );
}
