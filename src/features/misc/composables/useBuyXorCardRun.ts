import { FPNumber } from '@sora-substrate/sdk';
import { Interface } from 'ethers';
import { computed, onScopeDispose, ref, toValue, watch, type ComputedRef, type MaybeRefOrGetter } from 'vue';

import {
  buyXorRunSteps,
  createBuyXorPurchasePolicy,
  isBuyXorBridgeableBalance,
  planBuyXorBridgeAmount,
  BUY_XOR_MIN_BRIDGE_WEI,
  type BuyXorRunStep,
} from '@/features/misc/lib/buyXorCardPurchase';
import type { GetTsBridgeProgress } from '@/features/misc/lib/getTsBridgeProgress';
import { GET_TS_CARD_DAI, GET_TS_HASHI_DAI_BRIDGE } from '@/features/misc/lib/getTsCardReadiness';
import type { GetTsConversionProgress } from '@/features/misc/lib/getTsConversionProgress';
import { getTsSwapAsset, type GetTsCardDraft, type GetTsSwapAsset } from '@/features/misc/lib/getTsPlan';
import type { GetTsSwapProgress } from '@/features/misc/lib/getTsSwapProgress';
import { getTonswapBridgeFundingPayload } from '@/features/misc/lib/tonswapBridgeLiquidity';
import { tonswapConversionAmountToCodec } from '@/features/misc/lib/tonswapConversion';
import { useBridgeStore } from '@/stores/bridge';
import { useWalletStore } from '@/stores/wallet';
import { useWeb3Store } from '@/stores/web3';
import { ETH_BRIDGE_STATES } from '@/utils/bridge/eth/constants';
import {
  getTemporaryWalletOwner,
  openSavedTemporaryPurchaseWallet,
  openTemporaryPurchaseWallet,
  readTemporaryWalletBalances,
  TEMPORARY_WALLET_UUID,
  TemporaryWalletAppProvider,
  TemporaryWalletVaultError,
} from '@/utils/connection/evm/temporaryWallet';
import { setTemporaryWalletAutoApproval } from '@/utils/connection/evm/temporaryWalletSession';
import ethersUtil from '@/utils/ethers-util';

import { useGetTsPlan } from './useGetTsPlan';
import { useTonswapBridgeFunding } from './useTonswapBridgeFunding';

import type { EthHistory } from '@sora-substrate/sdk/build/bridgeProxy/eth/types';

/** Why the current step stopped; each has a plain message and "Try again". */
export type BuyXorRunFailure = 'wallet' | 'vault' | 'liquidity' | 'bridge';

export interface BuyXorCardRunOptions {
  /** Runs only while the buyer is on the card purchase with a connected SORA account on mainnet. */
  enabled: MaybeRefOrGetter<boolean>;
  /** Only for a purchase started on the earlier DAI route, whose ETH → DAI conversion is still recorded. */
  conversion: { progress: ComputedRef<GetTsConversionProgress>; refresh: () => Promise<void> };
  bridge: { progress: ComputedRef<GetTsBridgeProgress>; refresh: () => Promise<void> };
  swap: { progress: ComputedRef<GetTsSwapProgress> };
  /** Tells the page that a signature is being prepared, so it keeps plan edits locked. */
  onPreparing?: (preparing: boolean) => void;
  /** Polling interval; tests shorten it. */
  intervalMs?: number;
}

/** DAI below this is not worth a bridge transfer's network fees. */
const MIN_BRIDGE_DAI = 10n ** 18n;
/** A temporary wallet balance found too small to send is checked again after this, or as soon as it changes. */
const DUST_RECHECK_MS = 5 * 60_000;
const ETH_BRIDGE = new Interface(['function sendEthToSidechain(bytes32 to) payable']);
/** Own wallet: its ETH balance when the card checkout opened, kept for this tab so a reload keeps it. */
export const BUY_XOR_CHECKOUT_BASELINE_KEY = 'polkaswap:buy-xor:checkout-baseline:v1';

const natural = (wei: bigint, decimals = 18) => FPNumber.fromCodecValue(wei.toString(), decimals).toString();

/**
 * Runs the card purchase after payment, step by step, and resumes after a reload: the ETH MoonPay delivers is sent to
 * the buyer's SORA account over the bridge, in one transaction. DAI left in a temporary wallet by the earlier DAI route
 * is sent instead when no new ETH is waiting. With the temporary wallet the page signs the transfer (the auto-approval
 * policy is limited to this purchase's transactions); with the buyer's own wallet, their wallet asks. It never signs on
 * SORA: the final swap to XOR stays with the buyer.
 */
export function useBuyXorCardRun(options: BuyXorCardRunOptions) {
  const wallet = useWalletStore();
  const web3 = useWeb3Store();
  const bridge = useBridgeStore();
  const funding = useTonswapBridgeFunding();
  const { plan, updatePlan, trackTransaction, rememberBridgeDraft } = useGetTsPlan('xor');

  const failure = ref<{ step: BuyXorRunStep; reason: BuyXorRunFailure } | null>(null);
  const busy = ref<'' | 'wallet' | 'send'>('');
  const ethArrived = ref(false);
  const persisted = ref(true);
  /** Funds found in an earlier temporary wallet while the buyer's own wallet is connected. */
  const savedFunds = ref<{ eth: bigint; dai: bigint } | null>(null);
  let running = false;
  let disposed = false;
  /** The last temporary wallet balance found too small to send (fee left from earlier purchases), and when. */
  let dust: { balance: bigint; at: number } | null = null;
  let baseline: { id: string; balance: bigint } | null = null;
  const bridgeRuns = new Set<string>();

  const temporary = computed(() => !!web3.evmAddress && web3.evmProvider?.uuid === TEMPORARY_WALLET_UUID);
  const mode = computed<'temporary' | 'own' | null>(() =>
    !web3.evmAddress ? null : temporary.value ? 'temporary' : 'own'
  );
  const bridgeRow = computed(() => {
    const id = plan.value.bridgeDraft?.id;
    return id ? ((bridge.historyRecord as Record<string, EthHistory>)[id] ?? null) : null;
  });

  /** The furthest step reached, from the purchase record and chain evidence, never from balances alone. */
  const stage = computed<BuyXorRunStep | 'done'>(() => {
    const p = plan.value;
    if (p.references.swap && options.swap.progress.value.state === 'received') return 'done';
    if (p.references.bridge && options.bridge.progress.value.state === 'received') return 'swap';
    if (p.references.bridge) return 'arrive';
    if (p.bridgeDraft || busy.value === 'send' || ethArrived.value) return 'send';
    if (p.references.conversion) return options.conversion.progress.value.state === 'received' ? 'send' : 'receive';
    return p.cardDraft ? 'receive' : 'pay';
  });
  const steps = computed(() => buyXorRunSteps(failure.value?.step ?? stage.value, !!failure.value));

  function fail(step: BuyXorRunStep, reason: BuyXorRunFailure): void {
    failure.value = { step, reason };
  }

  /** Rechecks the purchase context after awaits and immediately before allowing a signature. */
  function isPurchaseActive(owner: string, account?: string): boolean {
    return (
      !disposed &&
      toValue(options.enabled) &&
      wallet.isLoggedIn &&
      wallet.address === owner &&
      (!account || (web3.evmAddress === account && web3.evmProviderNetwork === 1))
    );
  }

  /** Automatic signing ends with this purchase and remains bound to the accounts that opened it. */
  function allowPurchaseSigning(address: string, owner: string): void {
    const policy = createBuyXorPurchasePolicy({
      wallet: address,
      soraRecipientHex: ethersUtil.accountAddressToHex(owner),
    });
    setTemporaryWalletAutoApproval((request) => isPurchaseActive(owner, address) && temporary.value && policy(request));
  }

  /** Uses the buyer's own Ethereum wallet if one is connected, otherwise this account's saved purchase wallet. */
  async function ensureWallet(): Promise<boolean> {
    const owner = wallet.address;
    if (!owner) return false;
    if (web3.evmAddress && !temporary.value) {
      if (savedFunds.value === null) void findSavedFunds(owner);
      return true;
    }
    // A temporary wallet made by hand (saved by its phrase) stays as it is.
    if (temporary.value && !getTemporaryWalletOwner()) {
      allowPurchaseSigning(web3.evmAddress, owner);
      return true;
    }
    busy.value = 'wallet';
    try {
      const opened = await openTemporaryPurchaseWallet(owner);
      if (!isPurchaseActive(owner)) return false;
      persisted.value = opened.persisted;
      if (web3.evmAddress?.toLowerCase() !== opened.backup.address.toLowerCase())
        await web3.selectEvmProvider(TemporaryWalletAppProvider);
      if (!isPurchaseActive(owner)) return false;
      if (web3.evmAddress?.toLowerCase() !== opened.backup.address.toLowerCase()) throw new Error('Not connected');
      allowPurchaseSigning(web3.evmAddress, owner);
      return true;
    } catch (error) {
      fail(
        stage.value === 'done' ? 'swap' : stage.value,
        error instanceof TemporaryWalletVaultError ? 'vault' : 'wallet'
      );
      return false;
    } finally {
      busy.value = '';
    }
  }

  /**
   * Looks for an unfinished purchase in an earlier temporary wallet (ETH or DAI worth sending), so the buyer can finish
   * with it. The small amount of ETH left over after a finished purchase does not count.
   */
  async function findSavedFunds(owner: string): Promise<void> {
    savedFunds.value = { eth: 0n, dai: 0n };
    try {
      const saved = await openSavedTemporaryPurchaseWallet(owner);
      if (!saved) return;
      const { eth, tokens } = await readTemporaryWalletBalances([GET_TS_CARD_DAI]);
      // Fees come from the buyer's wallet connection, which only describes Ethereum when it is on mainnet.
      const baseFee = web3.evmProviderNetwork === 1 ? await readBaseFee() : null;
      const bridgeable = baseFee !== null && isBuyXorBridgeableBalance(eth, baseFee);
      if (bridgeable || tokens[0] >= MIN_BRIDGE_DAI) savedFunds.value = { eth, dai: tokens[0] };
    } catch {
      // Without a readable saved wallet there is nothing to offer.
    }
  }

  /** Switches to the saved temporary wallet to finish an earlier purchase. */
  async function useSavedWallet(): Promise<void> {
    savedFunds.value = null;
    await web3.selectEvmProvider(TemporaryWalletAppProvider);
    void tick();
  }

  function natural18(value: string): bigint {
    return BigInt(tonswapConversionAmountToCodec(value, 18));
  }

  /** Base fee of the latest Ethereum block, which the temporary wallet's fee plan starts from. */
  async function readBaseFee(): Promise<bigint> {
    const block = await ethersUtil.getEthersInstance().getBlock('latest');
    const baseFee = block?.baseFeePerGas;
    if (typeof baseFee !== 'bigint' || baseFee < 0n) throw new Error('No base fee');
    return baseFee;
  }

  /**
   * ETH in the temporary wallet to send to SORA, sized with an estimate of the transfer's gas so the wallet keeps just
   * its fee. Returns `null` for dust: ETH left over after an earlier purchase waits for the next delivery, and is not
   * estimated again until the balance changes or `DUST_RECHECK_MS` passes.
   */
  async function planEthBridge(owner: string, account: string, balance: bigint): Promise<bigint | null> {
    if (balance < BUY_XOR_MIN_BRIDGE_WEI) return null;
    if (dust?.balance === balance && Date.now() - dust.at < DUST_RECHECK_MS) return null;
    const baseFee = await readBaseFee();
    if (!isBuyXorBridgeableBalance(balance, baseFee)) {
      dust = { balance, at: Date.now() };
      return null;
    }
    const gas = await ethersUtil.getEthersInstance().estimateGas({
      from: account,
      to: GET_TS_HASHI_DAI_BRIDGE,
      data: ETH_BRIDGE.encodeFunctionData('sendEthToSidechain', [ethersUtil.accountAddressToHex(owner)]),
      value: balance / 2n,
    });
    const amount = planBuyXorBridgeAmount({ balance, gas, baseFee });
    if (amount === null) dust = { balance, at: Date.now() };
    return amount;
  }

  /**
   * The buyer's own wallet balance when this card checkout opened, so MoonPay's ETH is told apart from ETH the wallet
   * already held. The first reading for an account and checkout is kept, also in this tab's session storage so a
   * reload keeps it; without storage it lasts until the page closes.
   */
  function checkoutBaseline(account: string, draft: GetTsCardDraft, balance: bigint): bigint {
    const id = `${account.toLowerCase()}:${draft.deliveredEth}:${draft.conversionEth}`;
    if (baseline?.id === id) return baseline.balance;
    try {
      const saved = JSON.parse(sessionStorage.getItem(BUY_XOR_CHECKOUT_BASELINE_KEY) ?? 'null');
      if (saved?.id === id && typeof saved.balance === 'string' && /^\d{1,78}$/.test(saved.balance)) {
        baseline = { id, balance: BigInt(saved.balance) };
        return baseline.balance;
      }
    } catch {
      // Unreadable storage: start from this reading.
    }
    baseline = { id, balance };
    try {
      sessionStorage.setItem(BUY_XOR_CHECKOUT_BASELINE_KEY, JSON.stringify({ id, balance: balance.toString() }));
    } catch {
      // Kept in memory only.
    }
    return balance;
  }

  /** Creates the guided bridge row exactly as the bridge page does, then lets the bridge code run it. */
  async function startBridge(owner: string, account: string, asset: GetTsSwapAsset, amount: string): Promise<void> {
    if (!isPurchaseActive(owner, account)) return;
    busy.value = 'send';
    options.onPreparing?.(true);
    try {
      const prepared = await funding.prepareEthereumFunding(asset, amount);
      if (!isPurchaseActive(owner, account)) return;
      if (!prepared) return fail('send', 'bridge');
      const row = (await bridge.generateHistoryItem({
        payload: getTonswapBridgeFundingPayload('xor', asset),
      })) as EthHistory;
      if (!isPurchaseActive(owner, account)) return;
      if (row.assetAddress && !wallet.accountAssetsAddressTable?.[row.assetAddress])
        await wallet.addAsset(row.assetAddress);
      if (!isPurchaseActive(owner, account)) return;
      bridge.setHistoryId(row.id);
      updatePlan({ daiAmount: amount, swapAsset: asset });
      if (!rememberBridgeDraft(row)) return fail('send', 'bridge');
      runBridge(row.id!);
    } catch {
      fail('send', 'bridge');
    } finally {
      busy.value = '';
      options.onPreparing?.(false);
    }
  }

  /** Starts or resumes the bridge row; the bridge store runs each row once and keeps its own history. */
  function runBridge(id: string): void {
    if (bridgeRuns.has(id)) return;
    bridgeRuns.add(id);
    bridge.setHistoryId(id);
    void Promise.resolve(bridge.handleBridgeTransaction(id))
      .catch(() => undefined)
      .finally(() => {
        bridgeRuns.delete(id);
        void tick();
      });
  }

  /** One pass: look at where the purchase is and do the next thing, if any. */
  async function tick(): Promise<void> {
    if (running || disposed || !toValue(options.enabled) || failure.value || !wallet.isLoggedIn) return;
    running = true;
    try {
      const owner = wallet.address;
      if (!(await ensureWallet())) return;
      const account = web3.evmAddress;
      if (!account || !isPurchaseActive(owner, account)) return;
      const p = plan.value;
      if (p.references.bridge) {
        await options.bridge.refresh();
        if (options.bridge.progress.value.state === 'failed') fail('arrive', 'bridge');
        return;
      }
      if (p.bridgeDraft) {
        const row = bridgeRow.value;
        if (!row) return fail('send', 'bridge');
        if (row.transactionState === ETH_BRIDGE_STATES.EVM_REJECTED) {
          return fail('send', /QUOTE_REQUIRED/.test(String(row.errorMessage ?? '')) ? 'liquidity' : 'bridge');
        }
        if (row.transactionState !== ETH_BRIDGE_STATES.SORA_COMMITED) runBridge(row.id!);
        return;
      }
      const progress = options.conversion.progress.value;
      if (p.references.conversion && progress.state !== 'failed') {
        // A purchase started on the earlier DAI route: move the DAI its conversion delivered. The temporary wallet
        // holds only purchase funds, so all its DAI moves on; the buyer's own wallet moves exactly that amount. A failed
        // conversion left the ETH where it was, so it goes on below.
        if (progress.state !== 'received' || !progress.amount) return;
        const dai = temporary.value
          ? (await readTemporaryWalletBalances([GET_TS_CARD_DAI])).tokens[0]
          : natural18(progress.amount);
        if (dai >= MIN_BRIDGE_DAI) await startBridge(owner, account, 'DAI', natural(dai));
        return;
      }
      if (temporary.value) {
        const { eth, tokens } = await readTemporaryWalletBalances([GET_TS_CARD_DAI]);
        const amount = await planEthBridge(owner, account, eth);
        ethArrived.value = amount !== null;
        if (amount !== null) await startBridge(owner, account, 'ETH', natural(amount));
        // DAI from an earlier, interrupted DAI-route purchase goes on to SORA when no new ETH is waiting.
        else if (tokens[0] >= MIN_BRIDGE_DAI) await startBridge(owner, account, 'DAI', natural(tokens[0]));
        return;
      }
      // The buyer's own wallet may already hold ETH, so only ETH that arrived after the checkout opened counts. Once at
      // least the reviewed amount has arrived, send exactly that amount; the fee comes from the rest.
      const draft = p.cardDraft;
      if (!draft) return;
      const balance = await ethersUtil.getEthersInstance().getBalance(account);
      ethArrived.value = balance - checkoutBaseline(account, draft, balance) >= natural18(draft.conversionEth);
      if (ethArrived.value) await startBridge(owner, account, 'ETH', draft.conversionEth);
    } catch {
      // Network reads failed; the next pass tries again.
    } finally {
      running = false;
    }
  }

  /** "Try again": clears the stop and re-runs the current step. */
  function retry(): void {
    const stopped = failure.value;
    failure.value = null;
    if (stopped?.step === 'send' && plan.value.bridgeDraft) bridgeRuns.delete(plan.value.bridgeDraft.id);
    void tick();
  }

  const timer = setInterval(() => void tick(), options.intervalMs ?? 12_000);
  watch(
    () => [
      toValue(options.enabled),
      wallet.address,
      web3.evmAddress,
      plan.value.cardDraft,
      plan.value.references.conversion,
      options.conversion.progress.value.state,
      plan.value.bridgeDraft?.id,
      bridgeRow.value?.transactionState,
      plan.value.references.bridge,
      options.bridge.progress.value.state,
    ],
    () => void tick(),
    { immediate: true }
  );
  watch(
    () => wallet.address,
    () => {
      failure.value = null;
      savedFunds.value = null;
      ethArrived.value = false;
    }
  );
  watch(
    () => [
      toValue(options.enabled),
      wallet.address,
      wallet.isLoggedIn,
      web3.evmAddress,
      web3.evmProvider?.uuid,
      web3.evmProviderNetwork,
    ],
    () => setTemporaryWalletAutoApproval(null),
    { flush: 'sync' }
  );
  onScopeDispose(() => {
    disposed = true;
    setTemporaryWalletAutoApproval(null);
    clearInterval(timer);
  });

  return {
    steps,
    stage,
    failure: computed(() => failure.value),
    busy: computed(() => busy.value),
    mode,
    persisted: computed(() => persisted.value),
    savedFunds: computed(() => savedFunds.value),
    /**
     * Asset this purchase sends to SORA and swaps: the recorded one once a transfer exists (DAI left from the earlier
     * DAI route, or a conversion from that route), otherwise ETH, which every new card purchase sends.
     */
    swapAsset: computed(() => {
      const p = plan.value;
      const recorded =
        p.references.conversion || p.bridgeDraft || p.references.bridge || p.swapDraft || p.references.swap;
      return recorded ? getTsSwapAsset(p) : 'ETH';
    }),
    bridgeState: computed(() => bridgeRow.value?.transactionState ?? ''),
    retry,
    useSavedWallet,
    refresh: tick,
  };
}
