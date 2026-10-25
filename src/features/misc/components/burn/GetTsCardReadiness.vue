<template>
  <section class="card-readiness" :aria-labelledby="titleId" :aria-busy="busy">
    <h3 :id="titleId">{{ t('getTs.cardReview.title') }}</h3>
    <p>{{ t('getTs.cardReview.description') }}</p>
    <div role="status" aria-live="polite">
      <p v-if="busy">{{ t('getTs.cardReview.checking') }}</p>
      <template v-else-if="result?.allowed">
        <dl class="card-readiness__summary">
          <div>
            <dt>{{ t('getTs.cardReview.charge') }}</dt>
            <dd>{{ display(result.amount, 2) }} USD</dd>
          </div>
          <div class="card-readiness__outcome">
            <dt>{{ t(`getTs.cardReview.${purpose === 'xor' ? 'netXor' : 'netBurnable'}`) }}</dt>
            <dd class="card-readiness__total">
              ≈ {{ display(purpose === 'xor' ? result.spendableXor : result.burnableXor) }} <span>XOR</span>
            </dd>
          </div>
        </dl>
        <div class="card-readiness__costs">
          <p class="card-readiness__label">{{ t('getTs.preview.remainingCosts') }}</p>
          <p>{{ t('getTs.cardReview.costsReserved') }}</p>
        </div>
        <details>
          <summary>{{ t('getTs.cardReview.details') }}</summary>
          <dl>
            <div v-if="purpose === 'ts' && result.estimatedTs !== undefined">
              <dt>{{ t('getTs.cardReview.futureTs') }}</dt>
              <dd>≈ {{ display(result.estimatedTs, 2) }} TS</dd>
            </div>
            <div>
              <dt>{{ t('getTs.cardReview.delivery') }}</dt>
              <dd>{{ display(result.deliveredEth) }} ETH</dd>
            </div>
            <div>
              <dt>{{ t('getTs.cardReview.reserved') }}</dt>
              <dd>{{ display(result.ethereumGasReserve) }} ETH</dd>
            </div>
            <div>
              <dt>{{ t('getTs.cardReview.convert') }}</dt>
              <dd>{{ display(result.conversionEth) }} ETH</dd>
            </div>
            <div>
              <dt>{{ t('getTs.cardReview.bridge') }}</dt>
              <dd>{{ display(result.daiAmount) }} DAI</dd>
            </div>
            <div>
              <dt>{{ t('getTs.cardReview.provider') }}</dt>
              <dd>{{ display(result.providerFeeUsd, 2) }} USD</dd>
            </div>
            <div>
              <dt>{{ t('getTs.cardReview.conversionGas') }}</dt>
              <dd>{{ display(result.conversionGasReserve) }} ETH</dd>
            </div>
            <div>
              <dt>{{ t('getTs.cardReview.bridgeGas') }}</dt>
              <dd>{{ display(result.bridgeGasReserve) }} ETH</dd>
            </div>
            <div>
              <dt>{{ t('getTs.cardReview.conversionFee') }}</dt>
              <dd>{{ display(result.conversionProviderFee) }} ETH</dd>
            </div>
            <div>
              <dt>{{ t('getTs.cardReview.bridgeFee') }}</dt>
              <dd>{{ display(result.bridgeDaiFee) }} DAI</dd>
            </div>
            <div>
              <dt>{{ t(`getTs.cardReview.${purpose === 'xor' ? 'nativeSwapFee' : 'nativeTsFees'}`) }}</dt>
              <dd>{{ display(result.nativeFeeReserve) }} XOR</dd>
            </div>
            <div>
              <dt>{{ t('getTs.cardReview.existing') }}</dt>
              <dd>{{ display(result.existingEth) }} ETH</dd>
            </div>
          </dl>
          <p>{{ t('getTs.cardReview.reserveExplanation') }}</p>
          <p>{{ t('getTs.cardReview.bridgeExplanation') }}</p>
          <p>{{ t('getTs.cardReview.limits') }}</p>
        </details>
      </template>
      <p v-else-if="result?.reason" class="card-readiness__blocked">
        {{ t(`getTs.cardReview.errors.${result.reason}`) }}
      </p>
    </div>
    <button v-if="!busy" class="card-readiness__refresh" type="button" :disabled="paused" @click="check">
      {{ t('getTs.cardReview.refresh') }}
    </button>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue';
import { FPNumber, Operation } from '@sora-substrate/sdk';
import { DAI } from '@sora-substrate/sdk/build/assets/consts';
import { api } from '@/lib/soraneo-wallet/src/api';
import { useSettingsStore } from '@/stores/settings';
import { useWalletStore } from '@/stores/wallet';
import { useWeb3Store } from '@/stores/web3';
import { useTranslation } from '@/composables/useTranslation';
import ethersUtil from '@/utils/ethers-util';
import type { GetTsPurpose } from '@/features/misc/lib/getTsFlow';
import { SORA_FUNDING_MAINNET_GENESIS } from '@/features/misc/lib/tonswapLiquidity';
import {
  GET_TS_CARD_DAI,
  GET_TS_HASHI_DAI_BRIDGE,
  requestGetTsCardReadiness,
  type GetTsCardReadiness,
} from '@/features/misc/lib/getTsCardReadiness';

/** Wallet-bound read-only pre-payment review. Its ephemeral permission expires; it never opens a provider order. */
const props = withDefaults(defineProps<{ amount: string; purpose?: GetTsPurpose; paused?: boolean }>(), {
  purpose: 'ts',
});
const emit = defineEmits<{ checked: [result: GetTsCardReadiness] }>();
const { t } = useTranslation();
const settings = useSettingsStore();
const wallet = useWalletStore();
const web3 = useWeb3Store();
const titleId = `card-readiness-${useId()}`;
const result = ref<GetTsCardReadiness | null>(null);
const busy = ref(false);
const fees = computed(() => ({
  swapFeeCodec: settings.networkFees?.[Operation.Swap],
  burnFeeCodec: props.purpose === 'ts' ? settings.networkFees?.[Operation.BurnWithRemark] : undefined,
  slippageTolerance: settings.slippageTolerance,
}));
const context = computed(() =>
  JSON.stringify([
    props.amount,
    props.purpose,
    wallet.address,
    wallet.isLoggedIn,
    web3.evmAddress,
    web3.evmProviderNetwork,
    web3.evmProvider?.uuid,
    web3.ethBridgeEvmNetwork,
    web3.ethBridgeContractAddress?.OTHER,
    settings.nodeIsConnected,
    settings.soraNetwork,
    settings.moonpayApiKey,
    fees.value,
  ])
);
let generation = 0;
let controller: AbortController | undefined;
let expiryTimer: ReturnType<typeof setTimeout> | undefined;
let autoTimer: ReturnType<typeof setTimeout> | undefined;
let disposed = false;
let checkedContext: (() => boolean) | undefined;

/** Rounds only presentation. Small nonzero costs remain visible rather than appearing free. */
function display(value = '0', decimals = 6): string {
  const exact = new FPNumber(value);
  const rounded = exact.dp(decimals, 3);
  return exact.gt(FPNumber.ZERO) && rounded.isZero()
    ? `<${new FPNumber('1').div(new FPNumber('10').pow(decimals)).toString()}`
    : rounded.toString();
}
/** Every budget, account, provider, network or native-fee change revokes permission synchronously. */
function invalidate(): void {
  generation++;
  controller?.abort();
  clearTimeout(expiryTimer);
  clearTimeout(autoTimer);
  result.value = null;
  busy.value = false;
  checkedContext = undefined;
  emit('checked', { allowed: false, amount: props.amount, expiresAt: 0 });
}
/** Reads only current chain metadata and quotes. No connection, network switch or signing is initiated. */
async function check(): Promise<void> {
  if (disposed || props.paused) return;
  invalidate();
  const request = generation;
  const captured = context.value;
  controller = new AbortController();
  const signal = controller.signal;
  busy.value = true;
  try {
    const provider = ethersUtil.getEthersInstance();
    const chain = api.connection?.api;
    const current = () =>
      !disposed &&
      !props.paused &&
      request === generation &&
      context.value === captured &&
      ethersUtil.getEthersInstance() === provider &&
      api.connection?.api === chain &&
      !!chain?.isConnected &&
      chain.genesisHash.toString().toLowerCase() === SORA_FUNDING_MAINNET_GENESIS;
    const bridgeReady = async () => {
      if (
        !current() ||
        !wallet.isLoggedIn ||
        !wallet.address ||
        web3.evmProviderNetwork !== 1 ||
        web3.ethBridgeEvmNetwork !== 1 ||
        web3.ethBridgeContractAddress?.OTHER?.toLowerCase() !== GET_TS_HASHI_DAI_BRIDGE
      )
        return false;
      const [registered, status, contract, code] = await Promise.all([
        api.bridgeProxy.eth.getRegisteredAssets(),
        chain!.query.ethBridge.bridgeStatuses(0),
        chain!.query.ethBridge.bridgeContractAddress(0),
        provider.getCode(GET_TS_HASHI_DAI_BRIDGE),
      ]);
      const dai = registered[DAI.address];
      return (
        current() &&
        dai?.address?.toLowerCase() === GET_TS_CARD_DAI &&
        dai.decimals === 18 &&
        dai.assetKind === 'Sidechain' &&
        status.toString() === 'Initialized' &&
        contract.toString().toLowerCase() === GET_TS_HASHI_DAI_BRIDGE &&
        /^0x[0-9a-f]{20,}$/i.test(code)
      );
    };
    const checked = await requestGetTsCardReadiness(
      {
        amount: props.amount,
        purpose: props.purpose,
        account: web3.evmAddress,
        soraAccount: wallet.address,
        publicKey: settings.moonpayApiKey,
      },
      {
        provider,
        isCurrent: current,
        bridgeReady,
        signal,
        plan: { fees: { ...fees.value }, checkMainnet: current },
      }
    );
    if (request !== generation || disposed) return;
    result.value = checked;
    checkedContext = current;
    emit('checked', checked);
    if (checked.allowed)
      expiryTimer = setTimeout(
        () => {
          invalidate();
          result.value = { allowed: false, amount: props.amount, expiresAt: 0, reason: 'expired' };
          if (!props.paused) autoTimer = setTimeout(() => void check(), 0);
        },
        Math.max(0, checked.expiresAt - Date.now())
      );
  } catch {
    if (request === generation) {
      result.value = { allowed: false, amount: props.amount, expiresAt: 0, reason: 'wallet' };
      emit('checked', result.value);
    }
  } finally {
    if (request === generation) busy.value = false;
  }
}
watch(
  context,
  () => {
    invalidate();
    if (!props.paused) autoTimer = setTimeout(() => void check(), 500);
  },
  { immediate: true, flush: 'sync' }
);
watch(
  () => props.paused,
  (paused) => {
    if (paused) {
      clearTimeout(autoTimer);
      if (busy.value) invalidate();
    } else if (!result.value?.allowed || result.value.expiresAt <= Date.now()) void check();
  },
  { flush: 'sync' }
);
onBeforeUnmount(() => {
  disposed = true;
  invalidate();
});
/** The provider object and captured SORA API are rechecked synchronously at the parent's payment click. */
function canContinue(): boolean {
  try {
    return (
      !disposed &&
      !busy.value &&
      result.value?.allowed === true &&
      result.value.expiresAt > Date.now() &&
      checkedContext?.() === true
    );
  } catch {
    return false;
  }
}
defineExpose({ refresh: check, canContinue });
</script>

<style scoped lang="scss">
.card-readiness {
  min-width: 0;
  line-height: 1.5;
  h3 {
    margin: 0 0 8px;
    font-size: 16px;
  }
  p {
    margin: 8px 0;
    color: var(--s-color-base-content-secondary);
  }
  dl {
    margin: 12px 0;
    padding: 16px;
    border-radius: var(--s-border-radius-small);
    background: var(--s-color-utility-body);
    box-shadow: var(--s-shadow-element);
  }
  dl > div {
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 4px 20px;
    padding: 6px 0;
  }
  dt {
    color: var(--s-color-base-content-secondary);
  }
  dd {
    margin: 0;
    overflow-wrap: anywhere;
    font-variant-numeric: tabular-nums;
  }
  &__summary {
    dd {
      color: var(--s-color-base-content-primary);
    }
    .card-readiness__outcome {
      display: block;
      margin-top: 12px;
    }
    .card-readiness__total {
      margin-top: 8px;
      font-size: clamp(28px, 6vw, 36px);
      font-weight: 600;
      line-height: 1.2;
      span {
        font-size: 0.55em;
        font-weight: 400;
      }
    }
  }
  &__costs {
    margin: 16px 0 4px;
    p {
      margin: 4px 0;
      color: var(--s-color-base-content-primary);
      font-size: 14px;
    }
    .card-readiness__label {
      color: var(--s-color-base-content-secondary);
      font-size: 13px;
    }
  }
  summary,
  &__refresh {
    min-height: 44px;
    cursor: pointer;
  }
  summary {
    padding: 12px 0;
    color: var(--s-color-base-content-secondary);
  }
  &__refresh {
    margin-top: 12px;
    padding: 12px 20px;
    border: 0;
    border-radius: var(--s-border-radius-small);
    background: var(--s-color-utility-body);
    color: var(--s-color-base-content-primary);
    box-shadow: var(--s-shadow-element-pressed);
    font: inherit;
    &:active {
      box-shadow: var(--s-shadow-element);
    }
    &:disabled {
      opacity: 0.5;
      cursor: default;
    }
  }
  summary:focus-visible,
  &__refresh:focus-visible {
    outline: 2px solid var(--s-color-theme-accent);
    outline-offset: 4px;
  }
  p.card-readiness__blocked {
    color: var(--s-color-status-error-text);
  }
}
@media (max-width: 480px) {
  .card-readiness dl {
    padding: 12px;
  }
}
</style>
