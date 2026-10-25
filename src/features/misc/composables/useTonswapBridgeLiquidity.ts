import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import type { GetTsPurpose } from '@/features/misc/lib/getTsFlow';
import { DAI } from '@sora-substrate/sdk/build/assets/consts';
import { isTonswapFundingAmount, type TonswapLiquidityCheck } from '@/features/misc/lib/tonswapLiquidity';

export interface TonswapBridgeLiquidityContext {
  guided: boolean;
  purpose?: GetTsPurpose;
  amount: string;
  assetAddress: string;
  incoming: boolean;
  ethereum: boolean;
  network: unknown;
  networkValid: boolean;
  connected: boolean;
  mainnet: boolean;
  soraAddress: string;
  evmAddress: string;
}

/** Binds a guided check to this exact form and keeps its policy active until the form is left. */
export function useTonswapBridgeLiquidity(readContext: () => TonswapBridgeLiquidityContext) {
  const guided = ref(false);
  const purpose = ref<GetTsPurpose>('ts');
  const accepted = shallowRef<{ context: string; check: TonswapLiquidityCheck } | null>(null);
  const now = ref(Date.now());
  const clock = setInterval(() => {
    now.value = Date.now();
  }, 1_000);
  onScopeDispose(() => clearInterval(clock));
  watch(
    () => [readContext().guided, readContext().purpose] as const,
    ([value, requestedPurpose]) => {
      if (value) {
        guided.value = true;
        purpose.value = requestedPurpose === 'xor' ? 'xor' : 'ts';
      }
    },
    { immediate: true, flush: 'sync' }
  );
  const contextKey = computed(() => JSON.stringify({ ...readContext(), guided: guided.value, purpose: purpose.value }));
  const selectionValid = computed(() => {
    const context = readContext();
    return (
      context.incoming &&
      context.ethereum &&
      context.network === 1 &&
      context.networkValid &&
      context.connected &&
      context.mainnet &&
      !!context.soraAddress &&
      !!context.evmAddress &&
      context.assetAddress === DAI.address &&
      isTonswapFundingAmount(context.amount)
    );
  });
  watch(
    contextKey,
    () => {
      accepted.value = null;
    },
    { flush: 'sync' }
  );

  /** Accepts only an allowed result for the exact entered amount and current connected form. */
  function accept(check: TonswapLiquidityCheck): void {
    accepted.value =
      selectionValid.value &&
      check.amount === readContext().amount &&
      check.allowed &&
      Number.isFinite(check.expiresAt) &&
      check.expiresAt > Date.now()
        ? { context: contextKey.value, check }
        : null;
  }

  /** Rechecks wall time at the click boundary, independently of the display timer. */
  function isAllowed(at = Date.now()): boolean {
    if (!guided.value) return true;
    const saved = accepted.value;
    return (
      selectionValid.value &&
      !!saved &&
      saved.context === contextKey.value &&
      saved.check.allowed &&
      saved.check.amount === readContext().amount &&
      saved.check.expiresAt > at
    );
  }

  return {
    guided,
    purpose,
    contextKey,
    selectionValid,
    accept,
    isAllowed,
    blocked: computed(() => !isAllowed(now.value)),
  };
}
