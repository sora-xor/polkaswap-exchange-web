import { Operation } from '@sora-substrate/sdk';
import { DAI, ETH as ETH_ASSET } from '@sora-substrate/sdk/build/assets/consts';
import { flushPromises } from '@vue/test-utils';
import { Interface } from 'ethers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, effectScope, reactive, ref, type EffectScope } from 'vue';

import type { GetTsBridgeProgress } from '@/features/misc/lib/getTsBridgeProgress';
import { GET_TS_CARD_DAI, GET_TS_HASHI_DAI_BRIDGE } from '@/features/misc/lib/getTsCardReadiness';
import type { GetTsConversionProgress } from '@/features/misc/lib/getTsConversionProgress';
import type { GetTsSwapProgress } from '@/features/misc/lib/getTsSwapProgress';

const TEMP = '0x1111111111111111111111111111111111111111';
const OWN = '0x2222222222222222222222222222222222222222';
const SORA = 'cnTQ1kbv7PBNNQrEb1tZpmK7hZnSqP2ZzVbT9u4FjM4hYWYmt';
const SORA_HEX = `0x${'ab'.repeat(32)}`;
const ETH = 10n ** 18n;
const GWEI = 1_000_000_000n;
const ETH_BRIDGE = new Interface(['function sendEthToSidechain(bytes32 to) payable']);

const mocks = vi.hoisted(() => ({
  wallet: null as any,
  web3: null as any,
  bridge: null as any,
  provider: null as any,
  balances: { eth: 0n, dai: 0n },
  quote: vi.fn(),
  execute: vi.fn(),
  prepare: vi.fn(),
  openWallet: vi.fn(),
  openSaved: vi.fn(),
  owner: undefined as string | undefined,
  policy: vi.fn(),
}));

vi.mock('@/stores/wallet', () => ({ useWalletStore: () => mocks.wallet }));
vi.mock('@/stores/web3', () => ({ useWeb3Store: () => mocks.web3 }));
vi.mock('@/stores/bridge', () => ({ useBridgeStore: () => mocks.bridge }));
vi.mock('@/utils/ethers-util', () => ({
  default: {
    getSigner: vi.fn(async () => ({})),
    getEthersInstance: () => mocks.provider,
    accountAddressToHex: () => SORA_HEX,
  },
}));
vi.mock('@/features/misc/composables/useTonswapBridgeFunding', () => ({
  useTonswapBridgeFunding: () => ({ prepareEthereumFunding: mocks.prepare }),
}));
vi.mock('@/features/misc/lib/tonswapConversion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/misc/lib/tonswapConversion')>()),
  requestTonswapConversionQuote: mocks.quote,
  executeTonswapConversionQuote: mocks.execute,
}));
vi.mock('@/utils/connection/evm/temporaryWalletSession', () => ({ setTemporaryWalletAutoApproval: mocks.policy }));
vi.mock('@/utils/connection/evm/temporaryWallet', () => {
  class TemporaryWalletVaultError extends Error {}
  return {
    TEMPORARY_WALLET_UUID: 'polkaswap-temporary-wallet',
    TEMPORARY_WALLET_MAX_TIP: 3_000_000_000n,
    TemporaryWalletAppProvider: { uuid: 'polkaswap-temporary-wallet' },
    TemporaryWalletVaultError,
    openTemporaryPurchaseWallet: mocks.openWallet,
    openSavedTemporaryPurchaseWallet: mocks.openSaved,
    getTemporaryWalletOwner: () => mocks.owner,
    readTemporaryWalletBalances: vi.fn(async () => ({ eth: mocks.balances.eth, tokens: [mocks.balances.dai] })),
  };
});

const { useBuyXorCardRun, BUY_XOR_CHECKOUT_BASELINE_KEY } =
  await import('@/features/misc/composables/useBuyXorCardRun');
const { useGetTsPlan } = await import('@/features/misc/composables/useGetTsPlan');

const conversion = ref<GetTsConversionProgress>({ state: 'idle' });
const bridgeProgress = ref<GetTsBridgeProgress>({ state: 'idle' });
const swap = ref<GetTsSwapProgress>({ state: 'idle' } as GetTsSwapProgress);
const preparing = vi.fn();
const enabled = ref(true);
let scope: EffectScope;

function start() {
  scope = effectScope();
  return scope.run(() =>
    useBuyXorCardRun({
      enabled,
      conversion: { progress: computed(() => conversion.value), refresh: vi.fn(async () => undefined) },
      bridge: { progress: computed(() => bridgeProgress.value), refresh: vi.fn(async () => undefined) },
      swap: { progress: computed(() => swap.value) },
      onPreparing: preparing,
      intervalMs: 3_600_000,
    })
  )!;
}

function quote(amount: string) {
  return {
    transaction: {
      type: 'evm',
      to: '0xgateway',
      data: '0x',
      value: (BigInt(Math.round(Number(amount) * 1e6)) * 10n ** 12n + 150_000_000_000_000n).toString(),
    },
    nativeFee: '150000000000000',
    request: { amount },
  };
}

beforeEach(() => {
  enabled.value = true;
  sessionStorage.removeItem(BUY_XOR_CHECKOUT_BASELINE_KEY);
  const plan = useGetTsPlan('xor');
  plan.clearPlan();
  plan.updatePlan({ paymentAsset: 'card', paymentAmount: '25' });
  conversion.value = { state: 'idle' };
  bridgeProgress.value = { state: 'idle' };
  swap.value = { state: 'idle' } as GetTsSwapProgress;
  mocks.balances = { eth: 0n, dai: 0n };
  mocks.owner = SORA;
  mocks.wallet = reactive({
    address: SORA,
    isLoggedIn: true,
    accountAssetsAddressTable: {},
    addAsset: vi.fn(async () => undefined),
  });
  mocks.web3 = reactive({
    evmAddress: '',
    evmProvider: null as null | { uuid: string },
    evmProviderNetwork: 1,
    selectEvmProvider: vi.fn(async (provider: { uuid: string }) => {
      mocks.web3.evmProvider = provider;
      mocks.web3.evmAddress = TEMP;
    }),
  });
  mocks.bridge = reactive({
    historyRecord: {} as Record<string, any>,
    generateHistoryItem: vi.fn(async (input: { payload: Record<string, string> }) => {
      const row = {
        id: 'row-1',
        type: Operation.EthBridgeIncoming,
        externalNetwork: 1,
        assetAddress: mocks.prepare.mock.calls.at(-1)?.[0] === 'ETH' ? ETH_ASSET.address : DAI.address,
        amount: mocks.prepare.mock.calls.at(-1)?.[1],
        from: SORA,
        to: mocks.web3.evmAddress,
        payload: input.payload,
        transactionState: 'INITIAL',
      };
      mocks.bridge.historyRecord[row.id] = row;
      return row;
    }),
    setHistoryId: vi.fn(),
    handleBridgeTransaction: vi.fn(() => new Promise(() => undefined)),
  });
  mocks.provider = {
    getBalance: vi.fn(async () => mocks.balances.eth),
    // sendEthToSidechain used about 26,100 gas in October 2026.
    estimateGas: vi.fn(async () => 26_100n),
    getBlock: vi.fn(async () => ({ baseFeePerGas: GWEI })),
  };
  mocks.quote.mockReset().mockImplementation(async ({ amount }: { amount: string }) => quote(amount));
  mocks.execute.mockReset().mockResolvedValue(`0x${'cd'.repeat(32)}`);
  mocks.prepare.mockReset().mockResolvedValue({ symbol: 'DAI' });
  mocks.openWallet.mockReset().mockResolvedValue({ backup: { address: TEMP }, persisted: true, restored: false });
  mocks.openSaved.mockReset().mockResolvedValue(null);
  mocks.policy.mockReset();
  preparing.mockReset();
});

afterEach(() => scope?.stop());

describe('Buy XOR card run with the temporary wallet', () => {
  it.each(['disabled', 'logout', 'sora-account', 'evm-account', 'network', 'provider', 'disposed'])(
    'rejects automatic signing immediately when the purchase context becomes %s',
    async (change) => {
      start();
      await flushPromises();
      const policy = mocks.policy.mock.calls.at(-1)![0];
      const request = {
        from: TEMP,
        to: GET_TS_CARD_DAI,
        value: '0',
        data: new Interface(['function approve(address spender,uint256 amount) returns (bool)']).encodeFunctionData(
          'approve',
          [GET_TS_HASHI_DAI_BRIDGE, 2n * ETH]
        ),
      };
      expect(policy(request)).toBe(true);
      if (change === 'disabled') enabled.value = false;
      if (change === 'logout') mocks.wallet.isLoggedIn = false;
      if (change === 'sora-account') mocks.wallet.address = 'another-sora-account';
      if (change === 'evm-account') mocks.web3.evmAddress = OWN;
      if (change === 'network') mocks.web3.evmProviderNetwork = 56;
      if (change === 'provider') mocks.web3.evmProvider = { uuid: 'MetaMask' };
      if (change === 'disposed') scope.stop();
      // Check the captured function before any queued Vue watcher can run.
      expect(policy(request)).toBe(false);
      expect(mocks.policy).toHaveBeenLastCalledWith(null);
    }
  );

  it('clears automatic signing when the purchase page closes', async () => {
    start();
    await flushPromises();
    expect(typeof mocks.policy.mock.calls.at(-1)![0]).toBe('function');
    scope.stop();
    expect(mocks.policy).toHaveBeenLastCalledWith(null);
  });

  it('does not connect or start a purchase after its account changes while the saved wallet opens', async () => {
    let resolveWallet!: (value: unknown) => void;
    mocks.openWallet.mockImplementationOnce(() => new Promise((resolve) => (resolveWallet = resolve)));
    mocks.balances.dai = 2n * ETH;
    start();
    mocks.wallet.address = 'another-sora-account';
    resolveWallet({ backup: { address: TEMP }, persisted: true, restored: true });
    await flushPromises();
    expect(mocks.web3.selectEvmProvider).not.toHaveBeenCalled();
    expect(mocks.prepare).not.toHaveBeenCalled();
    expect(mocks.policy.mock.calls.some(([policy]) => typeof policy === 'function')).toBe(false);
  });

  it.each(['disabled', 'sora-account', 'network'])(
    'does not submit a bridge after the purchase becomes %s while funding is prepared',
    async (change) => {
      let resolveFunding!: (value: unknown) => void;
      mocks.prepare.mockImplementationOnce(() => new Promise((resolve) => (resolveFunding = resolve)));
      mocks.balances.dai = 2n * ETH;
      start();
      await flushPromises();
      expect(mocks.prepare).toHaveBeenCalledOnce();
      if (change === 'disabled') enabled.value = false;
      if (change === 'sora-account') mocks.wallet.address = 'another-sora-account';
      if (change === 'network') mocks.web3.evmProviderNetwork = 56;
      resolveFunding({ symbol: 'DAI' });
      await flushPromises();
      expect(mocks.bridge.generateHistoryItem).not.toHaveBeenCalled();
      expect(mocks.bridge.handleBridgeTransaction).not.toHaveBeenCalled();
    }
  );

  it('opens and connects this account’s purchase wallet and limits automatic signing to this purchase', async () => {
    const run = start();
    await flushPromises();
    expect(mocks.openWallet).toHaveBeenCalledWith(SORA);
    expect(mocks.web3.selectEvmProvider).toHaveBeenCalledWith({ uuid: 'polkaswap-temporary-wallet' });
    expect(run.mode.value).toBe('temporary');
    const policy = mocks.policy.mock.calls.at(-1)![0];
    expect(typeof policy).toBe('function');
    expect(run.stage.value).toBe('pay');
    expect(mocks.quote).not.toHaveBeenCalled();
  });

  it('waits for MoonPay, then sends the whole balance minus the fee reserve to SORA in one transfer', async () => {
    const run = start();
    await flushPromises();
    useGetTsPlan('xor').rememberCardDraft({ deliveredEth: '0.0064', conversionEth: '0.00634' });
    await flushPromises();
    expect(run.stage.value).toBe('receive');
    expect(mocks.prepare).not.toHaveBeenCalled();

    mocks.balances.eth = 6_400_000_000_000_000n;
    await run.refresh();
    await flushPromises();
    // The transfer's gas is estimated for this wallet and the buyer's SORA account.
    expect(mocks.provider.estimateGas).toHaveBeenCalledWith({
      from: TEMP,
      to: GET_TS_HASHI_DAI_BRIDGE,
      data: ETH_BRIDGE.encodeFunctionData('sendEthToSidechain', [SORA_HEX]),
      value: 3_200_000_000_000_000n,
    });
    // 0.0064 ETH minus 1.25 × 26,100 gas at 2 × 1 gwei + 3 gwei, minus 5 % (see buyXorCardPurchase.spec.ts).
    expect(mocks.prepare).toHaveBeenCalledWith('ETH', '0.00622871875');
    expect(mocks.bridge.generateHistoryItem).toHaveBeenCalledWith({ payload: { buyXorFunding: 'ethereum-eth-v1' } });
    expect(mocks.wallet.addAsset).toHaveBeenCalledWith(ETH_ASSET.address);
    expect(mocks.bridge.handleBridgeTransaction).toHaveBeenCalledWith('row-1');
    const plan = useGetTsPlan('xor').plan.value;
    expect(plan.swapAsset).toBe('ETH');
    expect(plan.bridgeDraft).toMatchObject({ id: 'row-1', amount: '0.00622871875' });
    // Nothing is swapped on Ethereum.
    expect(mocks.quote).not.toHaveBeenCalled();
    expect(mocks.execute).not.toHaveBeenCalled();
    expect(preparing.mock.calls).toEqual([[true], [false]]);
    expect(run.stage.value).toBe('send');
  });

  it('sends all DAI to SORA once a conversion from the earlier DAI route is confirmed', async () => {
    const run = start();
    await flushPromises();
    useGetTsPlan('xor').trackTransaction('conversion', `0x${'cd'.repeat(32)}`);
    mocks.balances.dai = 11_600_000_000_000_000_000n;
    conversion.value = { state: 'received', reference: `0x${'cd'.repeat(32)}`, amount: '11.6' };
    await flushPromises();
    await run.refresh();
    await flushPromises();
    expect(mocks.prepare).toHaveBeenCalledWith('DAI', '11.6');
    expect(mocks.bridge.generateHistoryItem).toHaveBeenCalledWith({ payload: { buyXorFunding: 'ethereum-dai-v1' } });
    expect(mocks.wallet.addAsset).toHaveBeenCalledWith(DAI.address);
    expect(mocks.bridge.setHistoryId).toHaveBeenCalledWith('row-1');
    expect(mocks.bridge.handleBridgeTransaction).toHaveBeenCalledWith('row-1');
    expect(useGetTsPlan('xor').plan.value.bridgeDraft).toMatchObject({ id: 'row-1', amount: '11.6' });
    expect(useGetTsPlan('xor').plan.value.swapAsset).toBeUndefined();
    expect(run.stage.value).toBe('send');
  });

  it('stops on a rejected transfer with the reason, and "Try again" runs the same bridge row again', async () => {
    const run = start();
    await flushPromises();
    useGetTsPlan('xor').trackTransaction('conversion', `0x${'cd'.repeat(32)}`);
    mocks.balances.dai = 11_600_000_000_000_000_000n;
    conversion.value = { state: 'received', reference: `0x${'cd'.repeat(32)}`, amount: '11.6' };
    await run.refresh();
    await flushPromises();
    mocks.bridge.handleBridgeTransaction.mockClear();
    mocks.bridge.historyRecord['row-1'].transactionState = 'EVM_REJECTED';
    mocks.bridge.historyRecord['row-1'].errorMessage = 'GET_TS_BRIDGE_QUOTE_REQUIRED';
    await run.refresh();
    await flushPromises();
    expect(run.failure.value).toEqual({ step: 'send', reason: 'liquidity' });
    expect(run.steps.value.find((step) => step.id === 'send')?.status).toBe('failed');

    mocks.bridge.historyRecord['row-1'].transactionState = 'INITIAL';
    run.retry();
    await flushPromises();
    expect(run.failure.value).toBeNull();
    expect(mocks.bridge.handleBridgeTransaction).toHaveBeenCalledWith('row-1');
  });

  it('leaves the ETH left over from an earlier purchase alone until a delivery adds to it', async () => {
    // At 1 gwei, a transfer needs about 0.0007 ETH: 0.0005 ETH plus the reserve for 30,000 gas and 5 %.
    mocks.balances.eth = 150_000_000_000_000n;
    const run = start();
    await flushPromises();
    await run.refresh();
    expect(run.stage.value).toBe('pay');
    expect(mocks.prepare).not.toHaveBeenCalled();
    expect(mocks.provider.estimateGas).not.toHaveBeenCalled();
    // The same balance is not looked at again for a while.
    const feeReads = mocks.provider.getBlock.mock.calls.length;
    await run.refresh();
    expect(mocks.provider.getBlock).toHaveBeenCalledTimes(feeReads);

    useGetTsPlan('xor').rememberCardDraft({ deliveredEth: '0.0064', conversionEth: '0.00634' });
    await flushPromises();
    expect(run.stage.value).toBe('receive');
    mocks.balances.eth += 6_400_000_000_000_000n;
    await run.refresh();
    await flushPromises();
    // The leftover goes to SORA together with the delivery.
    expect(mocks.prepare).toHaveBeenCalledWith('ETH', '0.00637871875');
    expect(run.stage.value).toBe('send');
  });

  it('finishes DAI left by the earlier DAI route when no new ETH is waiting, and ETH first otherwise', async () => {
    mocks.balances.dai = 2n * ETH;
    let run = start();
    await flushPromises();
    expect(mocks.prepare).toHaveBeenCalledWith('DAI', '2');
    expect(mocks.bridge.generateHistoryItem).toHaveBeenCalledWith({ payload: { buyXorFunding: 'ethereum-dai-v1' } });
    expect(useGetTsPlan('xor').plan.value.swapAsset).toBeUndefined();
    expect(run.stage.value).toBe('send');

    scope.stop();
    useGetTsPlan('xor').clearPlan();
    useGetTsPlan('xor').updatePlan({ paymentAsset: 'card', paymentAmount: '25' });
    mocks.prepare.mockClear();
    mocks.balances.eth = 6_400_000_000_000_000n;
    run = start();
    await flushPromises();
    expect(mocks.prepare.mock.calls).toEqual([['ETH', '0.00622871875']]);
  });

  it('names ETH in the steps until a transfer records another asset', async () => {
    mocks.balances.dai = 2n * ETH;
    mocks.prepare.mockImplementationOnce(() => new Promise(() => undefined));
    const run = start();
    // Nothing sent yet: a new card purchase sends ETH.
    expect(run.swapAsset.value).toBe('ETH');
    await flushPromises();
    // DAI left by the earlier route is being sent instead; the plan records it once its bridge row exists.
    expect(mocks.prepare).toHaveBeenCalledWith('DAI', '2');
    scope.stop();
    useGetTsPlan('xor').trackTransaction('conversion', `0x${'cd'.repeat(32)}`);
    const resumed = start();
    expect(resumed.swapAsset.value).toBe('DAI');
  });

  it('keeps trying when Ethereum cannot be read, without reporting a failure', async () => {
    const run = start();
    await flushPromises();
    mocks.balances.eth = 6_400_000_000_000_000n;
    mocks.provider.estimateGas.mockRejectedValueOnce(new Error('rate limited'));
    await run.refresh();
    expect(run.failure.value).toBeNull();
    expect(mocks.prepare).not.toHaveBeenCalled();
    await run.refresh();
    await flushPromises();
    expect(mocks.prepare).toHaveBeenCalledWith('ETH', '0.00622871875');
  });

  it('reports a saved wallet it cannot open instead of making a new one', async () => {
    const { TemporaryWalletVaultError } = await import('@/utils/connection/evm/temporaryWallet');
    mocks.openWallet.mockRejectedValue(new TemporaryWalletVaultError());
    const run = start();
    await flushPromises();
    expect(run.failure.value).toEqual({ step: 'pay', reason: 'vault' });
    expect(mocks.web3.selectEvmProvider).not.toHaveBeenCalled();
  });
});

describe('Buy XOR card run with the buyer’s own wallet', () => {
  beforeEach(() => {
    mocks.web3.evmAddress = OWN;
    mocks.web3.evmProvider = { uuid: 'MetaMask' };
  });

  it('sends only the reviewed amount once the reviewed delivery has arrived, through the buyer’s wallet', async () => {
    const run = start();
    await flushPromises();
    expect(mocks.openWallet).not.toHaveBeenCalled();
    expect(run.mode.value).toBe('own');
    useGetTsPlan('xor').rememberCardDraft({ deliveredEth: '0.0064', conversionEth: '0.00634' });
    mocks.balances.eth = 8_000_000_000_000_000n;
    await run.refresh();
    expect(mocks.prepare).not.toHaveBeenCalled();
    mocks.balances.eth = 9n * ETH;
    await run.refresh();
    await flushPromises();
    expect(mocks.prepare.mock.calls).toEqual([['ETH', '0.00634']]);
    expect(mocks.quote).not.toHaveBeenCalled();
  });

  it('does not mistake ETH the wallet already held for MoonPay’s delivery, also after a reload', async () => {
    mocks.balances.eth = ETH;
    let run = start();
    await flushPromises();
    useGetTsPlan('xor').rememberCardDraft({ deliveredEth: '0.0064', conversionEth: '0.00634' });
    await flushPromises();
    await run.refresh();
    expect(run.stage.value).toBe('receive');
    expect(mocks.prepare).not.toHaveBeenCalled();
    expect(JSON.parse(sessionStorage.getItem(BUY_XOR_CHECKOUT_BASELINE_KEY)!)).toEqual({
      id: `${OWN}:0.0064:0.00634`,
      balance: ETH.toString(),
    });

    // A reload keeps the balance from when the checkout opened.
    scope.stop();
    run = start();
    await flushPromises();
    await run.refresh();
    expect(mocks.prepare).not.toHaveBeenCalled();

    // MoonPay delivered a little less than quoted; the reviewed amount has arrived.
    mocks.balances.eth = ETH + 6_380_000_000_000_000n;
    await run.refresh();
    await flushPromises();
    expect(mocks.prepare.mock.calls).toEqual([['ETH', '0.00634']]);
  });

  it('offers to finish with an earlier temporary wallet that still holds an unfinished purchase', async () => {
    mocks.openSaved.mockResolvedValue({ backup: { address: TEMP }, persisted: true, restored: true });
    mocks.balances.eth = 8_456_730_000_000_000n;
    const run = start();
    await flushPromises();
    expect(run.savedFunds.value).toEqual({ eth: 8_456_730_000_000_000n, dai: 0n });
    await run.useSavedWallet();
    expect(mocks.web3.selectEvmProvider).toHaveBeenCalledWith({ uuid: 'polkaswap-temporary-wallet' });
  });

  it('does not offer the ETH left over after a finished purchase, but does offer DAI that can still be sent', async () => {
    mocks.openSaved.mockResolvedValue({ backup: { address: TEMP }, persisted: true, restored: true });
    mocks.balances.eth = 150_000_000_000_000n;
    let run = start();
    await flushPromises();
    expect(run.savedFunds.value).toEqual({ eth: 0n, dai: 0n });

    scope.stop();
    mocks.balances.dai = 2n * ETH;
    run = start();
    await flushPromises();
    expect(run.savedFunds.value).toEqual({ eth: 150_000_000_000_000n, dai: 2n * ETH });

    // Off mainnet the wallet connection cannot price Ethereum fees, so only DAI counts.
    scope.stop();
    mocks.balances.dai = 0n;
    mocks.balances.eth = ETH;
    mocks.web3.evmProviderNetwork = 56;
    run = start();
    await flushPromises();
    expect(run.savedFunds.value).toEqual({ eth: 0n, dai: 0n });
  });
});
