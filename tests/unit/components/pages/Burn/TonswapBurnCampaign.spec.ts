import { flushPromises, mount } from '@vue/test-utils';
import { FPNumber, Operation } from '@sora-substrate/sdk';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';
import { nextTick, reactive, ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import tonswapMarkUrl from '@/assets/img/tonswap-mark.svg?url';
import { createTonswapXorBurnRemark, TONSWAP_START_BLOCK } from '@/features/misc/lib/tonswapBurn';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { TransactionStatus, type HistoryItem } from '@sora-substrate/sdk/build/types';
import { createTonswapIntent, writeTonswapIntent, clearTonswapIntent } from '@/features/misc/lib/tonswapOnboarding';

// TextEncoder returns Node-realm arrays; SS58 hashing must use the same constructor in jsdom.
vi.hoisted(() => {
  vi.stubGlobal('Uint8Array', new TextEncoder().encode('').constructor);
});
vi.unmock('@polkadot/util-crypto');

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  burn: vi.fn(),
  notify: vi.fn(),
  copy: vi.fn(),
  connect: vi.fn(),
  selectAmount: vi.fn(),
  saveAs: vi.fn(),
  publish: vi.fn(),
  genesis: '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5',
  chain: { isConnected: true, genesisHash: { toString: vi.fn() } },
  account: { pair: { address: 'alice' } },
  history: [] as HistoryItem[],
}));
vi.mock('file-saver', () => ({ saveAs: mocks.saveAs }));
vi.mock('@/features/misc/composables/useTonswapCampaignStatus', () => ({
  publishTonswapCampaignSummary: mocks.publish,
}));
vi.mock('@/features/misc/lib/tonswapTelemetry', () => ({ trackTonswapStep: vi.fn() }));
const settings = reactive({
  soraNetwork: 'Prod',
  networkFees: { [Operation.BurnWithRemark]: '1000000000000000' } as Record<string, string>,
  blockNumber: 0,
});
const wallet = reactive({
  history: {} as Record<string, HistoryItem>,
  externalHistory: {} as Record<string, HistoryItem>,
  externalHistoryUpdates: {} as Record<string, HistoryItem>,
});
const assets = reactive({ xor: { balance: { transferable: '200000000000000000000' } } });
const address = ref('alice');
const loggedIn = ref(true);
const excludedAddress = 'cnRus2m2Rn776v88H5RUtyiaXtr3daN6ePn6yenLKepx1SqYo';
const excludedAlternateAddress = encodeAddress(decodeAddress(excludedAddress), 42);
vi.mock('@/indexer/queries/tonswapBurn', () => ({
  fetchTonswapBurnSnapshot: mocks.fetch,
  TONSWAP_MAINNET_GENESIS: mocks.genesis,
}));
vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api: {
    assets: { burnWithRemark: mocks.burn },
    connection: { api: mocks.chain },
    account: mocks.account,
    get historyList() {
      return mocks.history;
    },
  },
}));
vi.mock('@/stores/wallet', () => ({ useWalletStore: () => wallet }));
vi.mock('@/stores/settings', () => ({ useSettingsStore: () => settings }));
vi.mock('@/stores/assets', () => ({ useAssetsStore: () => assets }));
vi.mock('@/composables/useInternalConnect', () => ({
  useInternalConnect: () => ({ soraAddress: address, isLoggedIn: loggedIn, connectSoraWallet: mocks.connect }),
}));
vi.mock('@/composables/useTransaction', () => ({ useTransaction: () => ({ withNotifications: mocks.notify }) }));
vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => (params?.xor ? `${key}: ${params.xor}` : key),
  }),
}));
vi.mock('@/composables/useCopyAddress', () => ({ useCopyAddress: () => ({ handleCopyAddress: mocks.copy }) }));
vi.mock('@/lib/soraneo-wallet/src/components/DialogBase.vue', () => ({
  default: {
    name: 'DialogBase',
    props: ['visible', 'blurOverlay'],
    emits: ['after-open'],
    template: '<section v-if="visible"><slot/><slot name="footer"/></section>',
  },
}));
vi.mock('@/lib/soraneo-wallet/src/components/InfoLine.vue', () => ({
  default: {
    props: ['label', 'value', 'assetSymbol'],
    template: '<div>{{ label }}: {{ value }} {{ assetSymbol }}</div>',
  },
}));
vi.mock('@/lib/soraneo-wallet/src/components/shared/ExternalLink.vue', () => ({
  default: { props: ['href', 'title'], template: '<a :href="href">{{ title }}</a>' },
}));
vi.mock('@/components/shared/GenericPageHeader.vue', () => ({
  default: { props: ['title'], template: '<h2>{{ title }}</h2>' },
}));
vi.mock('@/components/shared/Input/TokenInput.vue', () => ({
  default: {
    name: 'TokenInput',
    props: ['modelValue'],
    emits: ['update:modelValue'],
    methods: { focusAndSelect: mocks.selectAmount },
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
}));

let Component: typeof import('@/features/misc/components/burn/TonswapBurnCampaign.vue').default;
const wrappers: ReturnType<typeof mount>[] = [];
const snapshot = (burns: unknown[] = []) => ({ burns, indexedThroughBlock: TONSWAP_START_BLOCK + 10, fresh: true });
const burn = (amount: string) => ({
  address: 'bob',
  amount: new FPNumber(amount),
  blockHeight: TONSWAP_START_BLOCK,
  extrinsicIndex: 1,
  txHash: `0x${'1'.repeat(64)}`,
});
const pendingHash = `0x${'3'.repeat(64)}`;
const pendingHistory = (status = TransactionStatus.Ready): HistoryItem => ({
  id: pendingHash,
  txId: pendingHash,
  from: 'alice',
  type: Operation.Burn,
  assetAddress: XOR.address,
  comment: createTonswapXorBurnRemark(),
  amount: '2',
  status,
  startTime: Date.now(),
});
const indexedPendingBurn = () => ({ ...burn('2'), address: 'alice', txHash: pendingHash });
async function submitPendingBurn(wrapper: ReturnType<typeof mount>, status = TransactionStatus.Ready) {
  mocks.notify.mockImplementation(async (handler: () => Promise<void>) => {
    await handler();
    const transaction = pendingHistory(status);
    mocks.history = [transaction];
    return { submitted: true, transaction, submittedAt: transaction.startTime };
  });
  wrapper.vm.openDialog();
  wrapper.vm.setAmount('2');
  await wrapper.vm.confirmBurn();
  await flushPromises();
}
/** Models a wallet interaction occurring before the protected signing callback. */
function beforeSigning(action: () => void | Promise<void>) {
  mocks.notify.mockImplementation(async (handler: () => Promise<void>) => {
    await action();
    try {
      await handler();
      return { submitted: true };
    } catch (error) {
      return { submitted: false, error };
    }
  });
}
async function setup(props: { initialAmount?: string } = {}) {
  const wrapper = mount(Component, {
    props,
    global: {
      stubs: {
        TonswapOnboarding: true,
        's-form': { template: '<div><slot/></div>' },
        's-button': {
          props: ['disabled'],
          emits: ['click'],
          template: '<button :disabled="disabled" @click="$emit(\'click\', $event)"><slot/></button>',
        },
      },
    },
  });
  wrappers.push(wrapper);
  await flushPromises();
  return wrapper;
}

describe('purchase draft burn suggestion', () => {
  it('emits the hash for a newly submitted burn but not a recovered historical receipt', async () => {
    mocks.history = [pendingHistory()];
    const recovered = await setup();
    expect(recovered.emitted('submitted')).toBeUndefined();
    recovered.unmount();
    mocks.history = [];
    const wrapper = await setup();
    await submitPendingBurn(wrapper);
    expect(wrapper.emitted('submitted')).toEqual([[{ transactionHash: pendingHash }]]);
  });
  it('prefills an exact amount without opening review or submitting, and preserves later user edits', async () => {
    const wrapper = await setup({ initialAmount: '2.000000000000000001' });
    expect(wrapper.get('#tonswap-preview-amount').element.value).toBe('2.000000000000000001');
    expect(wrapper.vm.dialogVisible).toBe(false);
    expect(mocks.burn).not.toHaveBeenCalled();
    await wrapper.get('#tonswap-preview-amount').setValue('3');
    await wrapper.setProps({ initialAmount: '4' });
    expect(wrapper.get('#tonswap-preview-amount').element.value).toBe('3');
  });
  it('leaves the burn fee available and rejects unavailable fee evidence', async () => {
    const wrapper = await setup({ initialAmount: '500' });
    expect(wrapper.get('#tonswap-preview-amount').element.value).toBe('199.999');
    settings.networkFees[Operation.BurnWithRemark] = '0';
    await nextTick();
    expect(wrapper.get('#tonswap-preview-amount').element.value).toBe('');
  });
});

beforeEach(async () => {
  clearTonswapIntent();
  vi.clearAllMocks();
  mocks.burn.mockReset();
  settings.soraNetwork = 'Prod';
  settings.networkFees = { [Operation.BurnWithRemark]: '1000000000000000' };
  settings.blockNumber = 0;
  wallet.history = {};
  wallet.externalHistory = {};
  wallet.externalHistoryUpdates = {};
  mocks.history = [];
  assets.xor.balance.transferable = '200000000000000000000';
  address.value = 'alice';
  loggedIn.value = true;
  mocks.chain.isConnected = true;
  mocks.chain.genesisHash.toString.mockReturnValue(mocks.genesis);
  mocks.account.pair.address = 'alice';
  mocks.fetch.mockResolvedValue(snapshot());
  mocks.notify.mockImplementation(async (handler: () => Promise<void>) => {
    try {
      await handler();
      return { submitted: true };
    } catch (error) {
      return { submitted: false, error };
    }
  });
  Component = (await import('@/features/misc/components/burn/TonswapBurnCampaign.vue')).default;
});
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  vi.useRealTimers();
});

describe('Tonswap burn campaign', () => {
  it('does not request or await campaign data before signing with a valid displayed estimate', async () => {
    const wrapper = await setup();
    wrapper.vm.openDialog();
    wrapper.vm.setAmount('2');
    mocks.burn.mockImplementation(async () => expect(mocks.fetch).toHaveBeenCalledTimes(1));
    mocks.fetch.mockReturnValue(new Promise(() => {}));
    await wrapper.vm.confirmBurn();
    expect(mocks.burn).toHaveBeenCalledTimes(1);
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    expect(mocks.fetch.mock.calls.every((args) => args.length === 0)).toBe(true);
    expect(wrapper.vm.canBurn).toBe(true);
    expect(wrapper.vm.dialogVisible).toBe(false);
  });

  it('clears cached graph, totals and claim history after failed admission without blocking burning', async () => {
    mocks.fetch.mockResolvedValue(snapshot([{ ...burn('17533.57'), address: 'alice' }]));
    const wrapper = await setup();
    const curve = wrapper.findComponent({ name: 'TonswapRewardCurve' });
    const history = wrapper.get('.tonswap-burn__records').text();
    wrapper.vm.openDialog();
    wrapper.vm.setAmount('2');
    expect(wrapper.vm.canSubmit).toBe(true);
    expect(curve.props('burned').toString()).toBe('17533.57');
    mocks.fetch.mockRejectedValueOnce(new Error('Indexer unavailable'));
    await wrapper.vm.refreshSnapshot();
    await nextTick();
    expect(curve.props('burned')).toBeNull();
    expect(wrapper.vm.allocation).toBeNull();
    expect(wrapper.find('.tonswap-burn__records').exists()).toBe(false);
    expect(wrapper.vm.quote).toBeNull();
    expect(wrapper.get('.tonswap-burn__data').attributes('data-state')).toBe('reconnecting');
    expect(wrapper.vm.canBurn).toBe(true);
    expect(wrapper.vm.canSubmit).toBe(true);
    mocks.fetch.mockResolvedValue(snapshot([{ ...burn('17534.57'), address: 'alice' }]));
    await wrapper.vm.refreshSnapshot();
    await nextTick();
    expect(curve.props('burned').toString()).toBe('17534.57');
    expect(wrapper.get('.tonswap-burn__data').attributes('data-state')).toBe('ready');
    expect(wrapper.vm.canBurn).toBe(true);
    expect(wrapper.vm.canSubmit).toBe(true);
  });

  it('keeps the data panel, refresh control and message stable through background requests and automatic retries', async () => {
    vi.useFakeTimers();
    mocks.fetch.mockResolvedValue(snapshot([burn('6')]));
    const wrapper = await setup();
    const panel = wrapper.get('.tonswap-burn__data').element;
    const control = wrapper.get('.tonswap-burn__data-refresh').element;
    let reject!: (reason: Error) => void;
    mocks.fetch.mockReturnValueOnce(new Promise((_resolve, fail) => (reject = fail)));
    await vi.advanceTimersByTimeAsync(5_000);
    // The reading verified a few seconds ago stays while its replacement loads.
    expect(wrapper.get('.tonswap-burn__data-message').text()).toBe('burnPage.tonswap.dataReady');
    expect(wrapper.findComponent({ name: 'TonswapRewardCurve' }).props('burned').toString()).toBe('6');
    expect(wrapper.get('.tonswap-burn__data-refresh').element).toBe(control);
    reject(new Error('Finalized coverage unavailable'));
    await flushPromises();
    expect(wrapper.get('.tonswap-burn__data-message').text()).toBe('burnPage.tonswap.dataReconnecting');
    let resolve!: (value: ReturnType<typeof snapshot>) => void;
    mocks.fetch.mockReturnValueOnce(new Promise((done) => (resolve = done)));
    await vi.advanceTimersByTimeAsync(5_000);
    expect(wrapper.get('.tonswap-burn__data').element).toBe(panel);
    expect(wrapper.get('.tonswap-burn__data-message').text()).toBe('burnPage.tonswap.dataReconnecting');
    expect(wrapper.get('.tonswap-burn__data-refresh').element).toBe(control);
    expect(wrapper.findComponent({ name: 'TonswapRewardCurve' }).props('burned')).toBeNull();
    expect(wrapper.text()).not.toContain('burnPage.tonswap.retry');
    resolve(snapshot([burn('1006')]));
    await flushPromises();
    expect(wrapper.get('.tonswap-burn__data').element).toBe(panel);
    expect(wrapper.get('.tonswap-burn__data-refresh').element).toBe(control);
    expect(wrapper.get('.tonswap-burn__data-message').text()).toBe('burnPage.tonswap.dataReady');
    expect(wrapper.findComponent({ name: 'TonswapRewardCurve' }).props('burned').toString()).toBe('1006');
  });

  it('automatically recovers an initial failure without showing fabricated zero totals or a flashing retry button', async () => {
    vi.useFakeTimers();
    mocks.fetch.mockRejectedValue(new Error('Finalized coverage unavailable'));
    const wrapper = await setup();
    const control = wrapper.get('.tonswap-burn__data-refresh').element;
    expect(wrapper.get('.tonswap-burn__data').attributes('data-state')).toBe('reconnecting');
    expect(wrapper.get('.tonswap-burn__data-message').text()).toBe('burnPage.tonswap.dataReconnecting');
    expect(wrapper.findComponent({ name: 'TonswapRewardCurve' }).props('burned')).toBeNull();
    expect(wrapper.vm.allocation).toBeNull();
    expect(wrapper.find('.tonswap-burn__progress').exists()).toBe(false);
    expect(wrapper.findAll('.tonswap-stat__value').map((value) => value.text())).toEqual(['—', '—', '—', '—']);
    expect(wrapper.find('.tonswap-burn__live').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('burnPage.tonswap.yourReserved');
    wrapper.vm.openDialog();
    expect(wrapper.vm.dialogVisible).toBe(true);
    expect(wrapper.vm.canBurn).toBe(true);
    mocks.fetch.mockResolvedValue(snapshot([burn('6')]));
    await vi.advanceTimersByTimeAsync(5_000);
    expect(wrapper.get('.tonswap-burn__data').attributes('data-state')).toBe('ready');
    expect(wrapper.get('.tonswap-burn__data-refresh').element).toBe(control);
    expect(wrapper.vm.allocation.totalEligible.toString()).toBe('6');
    expect(wrapper.find('.tonswap-burn__progress').exists()).toBe(true);
    expect(wrapper.find('.tonswap-burn__live').exists()).toBe(true);
    expect(wrapper.vm.canBurn).toBe(true);
  });

  it('shows verified last-known data on a stale first load while keeping burns available', async () => {
    vi.useFakeTimers();
    mocks.fetch.mockResolvedValue({ ...snapshot([{ ...burn('6'), address: 'alice' }]), fresh: false });
    const wrapper = await setup();
    expect(wrapper.findComponent({ name: 'TonswapRewardCurve' }).props('burned').toString()).toBe('6');
    expect(wrapper.get('.tonswap-burn__records').text()).toContain('6 XOR');
    expect(wrapper.get('.tonswap-burn__data').attributes('data-state')).toBe('stale');
    expect(wrapper.get('.tonswap-burn__data-message').text()).toBe('burnPage.tonswap.dataStale');
    expect(wrapper.vm.canBurn).toBe(true);
    wrapper.vm.openDialog();
    expect(wrapper.vm.dialogVisible).toBe(true);
    mocks.fetch.mockResolvedValue(snapshot([{ ...burn('1006'), address: 'alice' }]));
    await vi.advanceTimersByTimeAsync(5_000);
    expect(wrapper.get('.tonswap-burn__data').attributes('data-state')).toBe('ready');
    expect(wrapper.vm.allocation.totalEligible.toString()).toBe('1006');
    expect(wrapper.vm.canBurn).toBe(true);
  });

  it('selects the amount after each completed opening without refocusing during typing or quote updates', async () => {
    const wrapper = await setup();
    const dialog = wrapper.findComponent({ name: 'DialogBase' });
    wrapper.vm.openDialog();
    await nextTick();
    expect(mocks.selectAmount).not.toHaveBeenCalled();
    dialog.vm.$emit('after-open');
    expect(mocks.selectAmount).toHaveBeenCalledTimes(1);
    await dialog.get('input').setValue('12');
    await wrapper.vm.refreshSnapshot();
    expect(wrapper.vm.amount).toBe('12');
    expect(mocks.selectAmount).toHaveBeenCalledTimes(1);
    wrapper.vm.dialogVisible = false;
    await nextTick();
    dialog.vm.$emit('after-open');
    expect(mocks.selectAmount).toHaveBeenCalledTimes(1);
    wrapper.vm.openDialog();
    await nextTick();
    dialog.vm.$emit('after-open');
    expect(mocks.selectAmount).toHaveBeenCalledTimes(2);
  });

  it('keeps the confirmation logo static and disables backdrop blur across edits and refreshes', async () => {
    const wrapper = await setup();
    wrapper.vm.openDialog();
    await nextTick();
    const dialog = wrapper.findComponent({ name: 'DialogBase' });
    const logo = dialog.findComponent({ name: 'BurnLogoFire' });
    const input = dialog.get('input').element;
    expect(dialog.props('blurOverlay')).toBe(false);
    expect(logo.props('animate')).toBe(false);
    expect(logo.attributes('data-renderer')).toBe('static');
    await dialog.get('input').setValue('123.45');
    await wrapper.vm.refreshSnapshot();
    await nextTick();
    expect(wrapper.vm.dialogVisible).toBe(true);
    expect(dialog.get('input').element).toBe(input);
    expect(logo.props('animate')).toBe(false);
    expect(logo.attributes('data-renderer')).toBe('static');
    expect(mocks.burn).not.toHaveBeenCalled();
  });

  it('shows the burn amount and hash through inclusion, finality, and exact indexed reservation updates', async () => {
    const wrapper = await setup();
    await submitPendingBurn(wrapper);
    expect(wrapper.vm.burnReceipt.phase).toBe('waiting');
    expect(wrapper.text()).toContain('burnPage.tonswap.waitingConfirmation');
    expect(wrapper.text()).toContain('burnPage.tonswap.pendingBurnAmount: 2');
    expect(wrapper.text()).toContain(pendingHash);
    expect(wrapper.vm.canBurn).toBe(true);

    wallet.history = { [pendingHash]: pendingHistory(TransactionStatus.InBlock) };
    await flushPromises();
    expect(wrapper.vm.burnReceipt.phase).toBe('included');
    expect(wrapper.text()).toContain('burnPage.tonswap.included');
    expect(wrapper.vm.allocation.totalReward.toString()).toBe('0');

    wallet.history = { [pendingHash]: pendingHistory(TransactionStatus.Finalized) };
    await flushPromises();
    expect(wrapper.vm.burnReceipt.phase).toBe('confirmed');
    expect(wrapper.text()).toContain('burnPage.tonswap.confirmed');
    expect(wrapper.vm.allocation.totalReward.toString()).toBe('0');
    expect(wrapper.vm.burnPending).toBe(true);

    mocks.fetch.mockResolvedValue(snapshot([indexedPendingBurn()]));
    wallet.externalHistoryUpdates = { [pendingHash]: pendingHistory(TransactionStatus.Finalized) };
    await flushPromises();
    expect(wrapper.vm.burnReceipt.phase).toBe('updated');
    expect(wrapper.vm.burnPending).toBe(false);
    expect(wrapper.vm.canBurn).toBe(true);
    expect(wrapper.vm.allocation.totalReward.toString()).toBe('99.999948669894379752');
    expect(wrapper.text()).toContain('burnPage.tonswap.rewardsUpdated');
    expect(wrapper.text()).not.toContain('burnPage.tonswap.submitted');
    // The claim notice stays in the page intro and is repeated once, in the status banner of this burn.
    expect(wrapper.findAll('strong').filter((node) => node.text() === 'burnPage.tonswap.claimNotice')).toHaveLength(1);
    expect(wrapper.get('.burn-status__claim').text()).toBe('burnPage.tonswap.claimNotice');
    expect(wrapper.text()).toContain(pendingHash);
  });

  it('refreshes a pending burn on a new chain block without waiting for the fallback', async () => {
    const wrapper = await setup();
    await submitPendingBurn(wrapper, TransactionStatus.Finalized);
    const before = mocks.fetch.mock.calls.length;
    mocks.fetch.mockResolvedValue(snapshot([indexedPendingBurn()]));
    settings.blockNumber += 1;
    await flushPromises();
    expect(mocks.fetch).toHaveBeenCalledTimes(before + 1);
    expect(wrapper.vm.burnReceipt.phase).toBe('updated');
  });

  it('updates the public rate and graph on new blocks even without a connected wallet or pending burn', async () => {
    loggedIn.value = false;
    address.value = '';
    mocks.fetch.mockResolvedValue(snapshot([burn('1006')]));
    const wrapper = await setup();
    const curve = wrapper.findComponent({ name: 'TonswapRewardCurve' });
    const previousX = Number(curve.get('.tonswap-curve__point').attributes('cx'));
    const before = mocks.fetch.mock.calls.length;
    mocks.fetch.mockResolvedValue(snapshot([burn('9420.4')]));
    settings.blockNumber += 1;
    await flushPromises();
    expect(mocks.fetch).toHaveBeenCalledTimes(before + 1);
    expect(curve.props('burned').toString()).toBe('9420.4');
    const rate = wrapper.get('.tonswap-stat--rate');
    expect(rate.get('.tonswap-stat__value').text()).toBe('49.7582');
    expect(rate.get('dd').attributes('title')).toBe('49.758224 TS / XOR');
    expect(Number(curve.get('.tonswap-curve__point').attributes('cx'))).toBeGreaterThan(previousX);
  });

  it('catches indexer changes within five seconds without requiring another block or wallet event', async () => {
    vi.useFakeTimers();
    const wrapper = await setup();
    mocks.fetch.mockResolvedValue(snapshot([burn('9420.4')]));
    await vi.advanceTimersByTimeAsync(5_000);
    expect(wrapper.vm.allocation.totalEligible.toString()).toBe('9420.4');
    expect(wrapper.get('.tonswap-stat--rate .tonswap-stat__value').text()).toBe('49.7582');
  });

  it('refreshes when returning to the tab and removes its listeners when unmounted', async () => {
    const wrapper = await setup();
    mocks.fetch.mockResolvedValue(snapshot([burn('9420.4')]));
    window.dispatchEvent(new Event('focus'));
    await flushPromises();
    expect(wrapper.vm.allocation.totalEligible.toString()).toBe('9420.4');
    mocks.fetch.mockResolvedValue(snapshot([burn('10000')]));
    document.dispatchEvent(new Event('visibilitychange'));
    await flushPromises();
    expect(wrapper.vm.allocation.totalEligible.toString()).toBe('10000');
    wrapper.unmount();
    const after = mocks.fetch.mock.calls.length;
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
    settings.blockNumber += 1;
    await flushPromises();
    expect(mocks.fetch).toHaveBeenCalledTimes(after);
  });

  it('coalesces block, focus and timer refreshes while a snapshot request is in flight', async () => {
    vi.useFakeTimers();
    const wrapper = await setup();
    let resolve!: (value: ReturnType<typeof snapshot>) => void;
    mocks.fetch.mockReturnValueOnce(new Promise((done) => (resolve = done)));
    settings.blockNumber += 1;
    await nextTick();
    const before = mocks.fetch.mock.calls.length;
    window.dispatchEvent(new Event('focus'));
    settings.blockNumber += 1;
    await vi.advanceTimersByTimeAsync(5_000);
    expect(mocks.fetch).toHaveBeenCalledTimes(before);
    resolve(snapshot([burn('9420.4')]));
    await flushPromises();
    expect(wrapper.vm.allocation.totalEligible.toString()).toBe('9420.4');
  });

  it('skips public background reads while hidden and catches up when visible again', async () => {
    vi.useFakeTimers();
    const wrapper = await setup();
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    try {
      const before = mocks.fetch.mock.calls.length;
      mocks.fetch.mockResolvedValue(snapshot([burn('9420.4')]));
      settings.blockNumber += 1;
      document.dispatchEvent(new Event('visibilitychange'));
      await vi.advanceTimersByTimeAsync(5_000);
      expect(mocks.fetch).toHaveBeenCalledTimes(before);
      visibility.mockReturnValue('visible');
      document.dispatchEvent(new Event('visibilitychange'));
      await flushPromises();
      expect(wrapper.vm.allocation.totalEligible.toString()).toBe('9420.4');
    } finally {
      visibility.mockRestore();
    }
  });

  it('polls every two seconds through indexer lag and never reconciles another same-amount transaction', async () => {
    vi.useFakeTimers();
    const wrapper = await setup();
    await submitPendingBurn(wrapper, TransactionStatus.Finalized);
    mocks.fetch.mockResolvedValue(snapshot([{ ...indexedPendingBurn(), txHash: `0x${'4'.repeat(64)}` }]));
    await vi.advanceTimersByTimeAsync(2_000);
    expect(wrapper.vm.burnReceipt.phase).toBe('confirmed');
    expect(wrapper.vm.burnPending).toBe(true);
    mocks.fetch.mockResolvedValue(snapshot([indexedPendingBurn()]));
    await vi.advanceTimersByTimeAsync(2_000);
    expect(wrapper.vm.burnReceipt.phase).toBe('updated');
    const after = mocks.fetch.mock.calls.length;
    await vi.advanceTimersByTimeAsync(2_000);
    // The two-second receipt loop stops; the public five-second refresh stays active.
    expect(mocks.fetch).toHaveBeenCalledTimes(after + 1);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(mocks.fetch).toHaveBeenCalledTimes(after + 1);
  });

  it('keeps a delayed receipt actionable while permitting another independent burn', async () => {
    vi.useFakeTimers();
    const wrapper = await setup();
    await submitPendingBurn(wrapper, TransactionStatus.Finalized);
    await vi.advanceTimersByTimeAsync(122_000);
    expect(wrapper.vm.reconciliationDelayed).toBe(true);
    expect(wrapper.vm.burnPending).toBe(true);
    expect(wrapper.vm.canBurn).toBe(true);
    expect(wrapper.text()).toContain('burnPage.tonswap.indexingDelayed');
    expect(wrapper.text()).toContain(pendingHash);
    expect(wrapper.text()).not.toContain('burnPage.tonswap.submitFailed');
    const before = mocks.fetch.mock.calls.length;
    await vi.advanceTimersByTimeAsync(2_000);
    expect(mocks.fetch).toHaveBeenCalledTimes(before);
    mocks.fetch.mockResolvedValue(snapshot([indexedPendingBurn()]));
    wrapper.vm.retryBurnStatus();
    await flushPromises();
    expect(wrapper.vm.burnReceipt.phase).toBe('updated');
    expect(wrapper.vm.reconciliationDelayed).toBe(false);
  });

  it('recovers an unresolved marked burn after reload without adding optimistic rewards', async () => {
    mocks.history = [pendingHistory(TransactionStatus.InBlock)];
    const wrapper = await setup();
    expect(wrapper.vm.burnReceipt.phase).toBe('included');
    expect(wrapper.vm.burnReceipt.txHash).toBe(pendingHash);
    expect(wrapper.vm.allocation.totalReward.toString()).toBe('0');
    expect(wrapper.vm.canBurn).toBe(true);
  });

  it('recovers late TS history after a notification-history timeout', async () => {
    const wrapper = await setup();
    mocks.notify.mockImplementation(async (handler: () => Promise<void>) => {
      await handler();
      return { submitted: true, historyTimedOut: true };
    });
    wrapper.vm.openDialog();
    wrapper.vm.setAmount('2');
    await wrapper.vm.confirmBurn();
    expect(wrapper.vm.burnReceipt.txHash).toBe('');
    wallet.history = { [pendingHash]: pendingHistory(TransactionStatus.Finalized) };
    mocks.fetch.mockResolvedValue(snapshot([indexedPendingBurn()]));
    await flushPromises();
    expect(wrapper.vm.burnReceipt.txHash).toBe(pendingHash);
    expect(wrapper.vm.burnReceipt.phase).toBe('updated');
  });

  it('ignores an unrelated concurrent notification transaction and finds the actual marked TS burn', async () => {
    const wrapper = await setup();
    mocks.notify.mockImplementation(async (handler: () => Promise<void>) => {
      await handler();
      const actual = pendingHistory(TransactionStatus.InBlock);
      mocks.history = [actual];
      return {
        submitted: true,
        transaction: {
          ...actual,
          id: `0x${'4'.repeat(64)}`,
          txId: `0x${'4'.repeat(64)}`,
          type: Operation.Swap,
          comment: '',
        },
      };
    });
    wrapper.vm.openDialog();
    wrapper.vm.setAmount('2');
    await wrapper.vm.confirmBurn();
    expect(wrapper.vm.burnReceipt.txHash).toBe(pendingHash);
    expect(wrapper.vm.burnReceipt.phase).toBe('included');
  });

  it('preserves the signed hash without blocking another burn after an ambiguous send-response failure', async () => {
    const wrapper = await setup();
    mocks.notify.mockImplementation(async (handler: () => Promise<void>) => {
      await handler();
      mocks.history = [{ ...pendingHistory(TransactionStatus.Error), txId: undefined }];
      return { submitted: false, error: new Error('RPC response lost') };
    });
    wrapper.vm.openDialog();
    wrapper.vm.setAmount('2');
    await wrapper.vm.confirmBurn();
    expect(wrapper.vm.burnReceipt.txHash).toBe(pendingHash);
    expect(wrapper.vm.burnReceipt.phase).toBe('waiting');
    expect(wrapper.vm.canBurn).toBe(true);
    expect(wrapper.text()).not.toContain('burnPage.tonswap.submitFailed');
    mocks.fetch.mockResolvedValue(snapshot([indexedPendingBurn()]));
    settings.blockNumber += 1;
    await flushPromises();
    expect(wrapper.vm.burnReceipt.phase).toBe('updated');
  });

  it('does not downgrade matching finalized history because an older record contains an ambiguous error', async () => {
    const wrapper = await setup();
    await submitPendingBurn(wrapper);
    mocks.history = [{ ...pendingHistory(TransactionStatus.Error), txId: undefined }];
    wallet.history = { [pendingHash]: pendingHistory(TransactionStatus.Finalized) };
    await flushPromises();
    expect(wrapper.vm.burnReceipt.phase).toBe('confirmed');
    expect(wrapper.vm.canBurn).toBe(true);
  });

  it('marks a recorded on-chain failure distinctly while keeping new burns available', async () => {
    const wrapper = await setup();
    await submitPendingBurn(wrapper);
    wallet.history = {
      [pendingHash]: { ...pendingHistory(TransactionStatus.Error), blockId: `0x${'9'.repeat(64)}` },
    };
    await flushPromises();
    expect(wrapper.vm.burnReceipt.phase).toBe('failed');
    expect(wrapper.vm.burnPending).toBe(false);
    expect(wrapper.vm.canBurn).toBe(true);
  });

  it('does not create a pending receipt when signing is cancelled before a marked history record exists', async () => {
    const wrapper = await setup();
    mocks.notify.mockResolvedValue({ submitted: false, error: new Error('User cancelled') });
    wrapper.vm.openDialog();
    wrapper.vm.setAmount('2');
    await wrapper.vm.confirmBurn();
    expect(wrapper.vm.burnReceipt).toBeNull();
    expect(wrapper.vm.dialogVisible).toBe(true);
    expect(wrapper.vm.submitError).toBe('User cancelled');
  });

  it('clears another wallet receipt and stops its fast retry loop when the account changes', async () => {
    vi.useFakeTimers();
    const wrapper = await setup();
    await submitPendingBurn(wrapper);
    address.value = 'charlie';
    await nextTick();
    const before = mocks.fetch.mock.calls.length;
    await vi.advanceTimersByTimeAsync(4_000);
    expect(wrapper.vm.burnReceipt).toBeNull();
    expect(mocks.fetch).toHaveBeenCalledTimes(before);
  });

  it('stops pending reconciliation on unmount', async () => {
    vi.useFakeTimers();
    const wrapper = await setup();
    await submitPendingBurn(wrapper);
    wrapper.unmount();
    const before = mocks.fetch.mock.calls.length;
    await vi.advanceTimersByTimeAsync(60_000);
    expect(mocks.fetch).toHaveBeenCalledTimes(before);
  });

  it('reveals the pending receipt immediately without waiting for the post-submit snapshot', async () => {
    const original = Element.prototype.scrollIntoView;
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    let resolve!: (value: ReturnType<typeof snapshot>) => void;
    try {
      const wrapper = await setup();
      mocks.notify.mockImplementation(async (handler: () => Promise<void>) => {
        await handler();
        return { submitted: true, transaction: pendingHistory() };
      });
      mocks.fetch.mockReturnValueOnce(
        new Promise((done) => {
          resolve = done;
        })
      );
      wrapper.vm.openDialog();
      wrapper.vm.setAmount('2');
      await wrapper.vm.confirmBurn();
      await flushPromises();
      expect(wrapper.vm.canBurn).toBe(true);
      expect(wrapper.vm.dialogVisible).toBe(false);
      expect(wrapper.get('.tonswap-burn__receipt').text()).toContain(pendingHash);
      expect(scroll).toHaveBeenCalledWith(expect.objectContaining({ block: 'nearest' }));
      // The page brings the status banner into view; the record with the hash stays in the history list.
      expect((scroll.mock.contexts[0] as Element).className).toBe('tonswap-burn__status-banner');
      resolve(snapshot());
      await flushPromises();
    } finally {
      Element.prototype.scrollIntoView = original;
    }
  });

  it.each([excludedAddress, excludedAlternateAddress])(
    'allows the Trust account %s to burn without fabricating a reward when campaign data is unavailable',
    async (excluded) => {
      address.value = excluded;
      mocks.account.pair.address = excluded;
      mocks.fetch.mockRejectedValue(new Error('offline'));
      const wrapper = await setup();
      wrapper.vm.openDialog();
      wrapper.vm.setAmount('10');
      expect(wrapper.vm.canBurn).toBe(true);
      expect(wrapper.vm.canSubmit).toBe(true);
      expect(wrapper.vm.quote).toBeNull();
      await wrapper.vm.confirmBurn();
      expect(mocks.burn).toHaveBeenCalledWith(XOR, '10', createTonswapXorBurnRemark());
    }
  );

  it('aborts when the active wallet changes to Trust after the user starts signing', async () => {
    const wrapper = await setup();
    wrapper.vm.openDialog();
    wrapper.vm.setAmount('10');
    beforeSigning(async () => {
      address.value = excludedAlternateAddress;
      await nextTick();
    });
    await wrapper.vm.confirmBurn();
    expect(wrapper.vm.canBurn).toBe(true);
    expect(wrapper.vm.dialogVisible).toBe(false);
    expect(wrapper.vm.submitError).toBe('burnPage.tonswap.accountChanged');
    expect(mocks.burn).not.toHaveBeenCalled();
  });

  it.each([excludedAddress, excludedAlternateAddress])(
    'rejects a mismatched actual SDK signer even when it is the Trust account %s',
    async (excluded) => {
      const wrapper = await setup();
      wrapper.vm.openDialog();
      wrapper.vm.setAmount('10');
      mocks.account.pair.address = excluded;
      await wrapper.vm.confirmBurn();
      expect(wrapper.vm.submitError).toBe('burnPage.tonswap.accountChanged');
      expect(mocks.burn).not.toHaveBeenCalled();
    }
  );

  it('previews an allocation without connecting and carries the amount into review without submitting', async () => {
    loggedIn.value = false;
    const wrapper = await setup();
    await wrapper.get('#tonswap-preview-amount').setValue('2');
    expect(wrapper.vm.previewQuote.reward.gt(new FPNumber('99'))).toBe(true);
    expect(wrapper.text()).toContain('burnPage.tonswap.journey.estimated');
    expect(mocks.burn).not.toHaveBeenCalled();
    loggedIn.value = true;
    await nextTick();
    wrapper.vm.openDialog();
    await nextTick();
    expect(wrapper.findComponent({ name: 'DialogBase' }).get('input').element.value).toBe('2');
    expect(mocks.burn).not.toHaveBeenCalled();
  });

  it('restores a valid saved amount after funding and still allows burning when estimates are unavailable', async () => {
    writeTonswapIntent(createTonswapIntent('sora', '3.25')!);
    mocks.fetch.mockRejectedValue(new Error('offline'));
    const wrapper = await setup();
    expect(wrapper.get('#tonswap-preview-amount').element.value).toBe('3.25');
    expect(wrapper.vm.previewQuote).toBeNull();
    expect(wrapper.vm.canBurn).toBe(true);
    wrapper.vm.openDialog();
    await nextTick();
    expect(wrapper.vm.canSubmit).toBe(true);
  });

  it('downloads only the finalized reservation evidence', async () => {
    mocks.fetch.mockResolvedValue(snapshot([indexedPendingBurn()]));
    const wrapper = await setup();
    await wrapper.get('.tonswap-burn__save-receipt').trigger('click');
    await flushPromises();
    expect(mocks.saveAs).toHaveBeenCalledWith(expect.any(Blob), `tonswap-${pendingHash}.json`);
    expect(mocks.burn).not.toHaveBeenCalled();
  });

  it('reports a failed receipt download without altering the burn record or blocking review', async () => {
    mocks.fetch.mockResolvedValue(snapshot([indexedPendingBurn()]));
    mocks.saveAs.mockImplementationOnce(() => {
      throw new Error('Download failed');
    });
    const wrapper = await setup();
    await wrapper.get('.tonswap-burn__save-receipt').trigger('click');
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toBe('burnPage.tonswap.journey.receiptError');
    expect(wrapper.find(`[data-tx-hash="${pendingHash}"]`).exists()).toBe(true);
    expect(wrapper.vm.canBurn).toBe(true);
    expect(mocks.burn).not.toHaveBeenCalled();
  });

  it('shows the exact XOR amount plus fee without rounding down tiny units', async () => {
    const wrapper = await setup();
    await wrapper.get('#tonswap-preview-amount').setValue('10.000000000000000001');
    expect(wrapper.text()).toContain('10.001000000000000001');
  });

  it('shows the official SVG, claim notice and an XOR-only input with no destination account', async () => {
    const wrapper = await setup();
    expect(wrapper.find('img[alt="Tonswap"]').attributes('src')).toBe(tonswapMarkUrl);
    expect(wrapper.find('a').attributes('href')).toBe('https://tonswap.org/ts');
    wrapper.vm.openDialog();
    await nextTick();
    expect(wrapper.findComponent({ name: 'DialogBase' }).findAll('input')).toHaveLength(1);
    expect(wrapper.text()).toContain('burnPage.tonswap.claimNotice');
    expect(wrapper.text()).not.toContain('nexusRecipient');
  });

  it('quotes the integrated curve and submits a tagged burn without a Nexus recipient', async () => {
    const wrapper = await setup();
    wrapper.vm.openDialog();
    wrapper.vm.setAmount('10');
    expect(wrapper.vm.quote.reward.lt(new FPNumber('500'))).toBe(true);
    expect(wrapper.vm.canSubmit).toBe(true);
    await wrapper.vm.confirmBurn();
    expect(mocks.burn).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: 'XOR' }),
      '10',
      createTonswapXorBurnRemark()
    );
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    expect(wrapper.vm.dialogVisible).toBe(false);
  });

  it.each(['0', '-1', '1e3', 'NaN', 'Infinity', '0.0000000000000000001'])(
    'rejects invalid amount %s',
    async (amount) => {
      const wrapper = await setup();
      wrapper.vm.openDialog();
      wrapper.vm.setAmount(amount);
      expect(wrapper.vm.canSubmit).toBe(false);
      await wrapper.vm.confirmBurn();
      expect(mocks.burn).not.toHaveBeenCalled();
    }
  );

  it('withholds unavailable global data instead of assuming an empty campaign', async () => {
    const wrapper = await setup();
    mocks.fetch.mockRejectedValue(new Error('offline'));
    await wrapper.vm.refreshSnapshot();
    expect(wrapper.vm.canBurn).toBe(true);
    expect(wrapper.text()).toContain('burnPage.tonswap.dataReconnecting');
  });

  it('allows signing when an advisory estimate changes during the wallet interaction', async () => {
    const wrapper = await setup();
    wrapper.vm.openDialog();
    wrapper.vm.setAmount('10');
    const previous = wrapper.vm.quote.reward.toString();
    beforeSigning(async () => {
      mocks.fetch.mockResolvedValue(snapshot([burn('100')]));
      await wrapper.vm.refreshSnapshot();
      expect(wrapper.vm.quote.reward.toString()).not.toBe(previous);
    });
    await wrapper.vm.confirmBurn();
    expect(mocks.burn).toHaveBeenCalledTimes(1);
    expect(wrapper.vm.submitError).toBe('');
  });

  it('allows cap-crossing and fully exhausted-cap burns with partial or zero advisory rewards', async () => {
    mocks.fetch.mockResolvedValue(snapshot([burn('1753356')]));
    const wrapper = await setup();
    wrapper.vm.openDialog();
    wrapper.vm.setAmount('2');
    await nextTick();
    expect(wrapper.vm.canSubmit).toBe(true);
    expect(wrapper.vm.quote.eligible.toString()).toBe('1');
    expect(wrapper.vm.quote.excess.toString()).toBe('1');
    expect(wrapper.findComponent({ name: 'TokenInput' }).attributes('max')).toBeUndefined();
    expect(wrapper.text()).toContain('burnPage.tonswap.excessRecord: 1');
    await wrapper.vm.confirmBurn();
    expect(mocks.burn).toHaveBeenCalledTimes(1);
    mocks.fetch.mockResolvedValue(snapshot([burn('1753357')]));
    await wrapper.vm.refreshSnapshot();
    wrapper.vm.openDialog();
    wrapper.vm.setAmount('2');
    expect(wrapper.vm.canBurn).toBe(true);
    expect(wrapper.vm.canSubmit).toBe(true);
    expect(wrapper.vm.quote.reward.toString()).toBe('0');
    await wrapper.vm.confirmBurn();
    expect(mocks.burn).toHaveBeenCalledTimes(2);
    expect(wrapper.get('.action-button').text()).toBe('burnPage.tonswap.burn');
  });

  it('includes the atomic burn fee in the balance check and rejects an unavailable fee', async () => {
    const wrapper = await setup();
    wrapper.vm.openDialog();
    wrapper.vm.setAmount('200');
    expect(wrapper.vm.canSubmit).toBe(false);
    wrapper.vm.setAmount('199');
    expect(wrapper.vm.canSubmit).toBe(true);
    settings.networkFees = {};
    expect(wrapper.vm.canSubmit).toBe(false);
  });

  it.each(['NaN', '-1', 'Infinity', '1e3', '', '0.1'])('fails closed for malformed fee codec %s', async (codec) => {
    const wrapper = await setup();
    wrapper.vm.openDialog();
    wrapper.vm.setAmount('1');
    settings.networkFees = { [Operation.BurnWithRemark]: codec };
    expect(wrapper.vm.canSubmit).toBe(false);
    await wrapper.vm.confirmBurn();
    expect(mocks.burn).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('burnPage.tonswap.feeUnavailable');
  });

  it.each(['NaN', '-1', 'Infinity', '1e3', '', '0.1'])(
    'fails closed for malformed transferable balance %s',
    async (codec) => {
      const wrapper = await setup();
      wrapper.vm.openDialog();
      wrapper.vm.setAmount('1');
      assets.xor.balance.transferable = codec;
      expect(wrapper.vm.canSubmit).toBe(false);
      await wrapper.vm.confirmBurn();
      expect(mocks.burn).not.toHaveBeenCalled();
    }
  );

  it('reports an unsynchronized XOR balance as loading, never as insufficient', async () => {
    const wrapper = await setup();
    wrapper.vm.openDialog();
    wrapper.vm.setAmount('100');
    assets.xor.balance.transferable = undefined as unknown as string;
    await flushPromises();
    expect(wrapper.vm.canSubmit).toBe(false);
    expect(wrapper.text()).toContain('getTs.balancesLoading');
    expect(wrapper.text()).not.toContain('insufficientBalanceText');
    await wrapper.vm.confirmBurn();
    expect(mocks.burn).not.toHaveBeenCalled();

    assets.xor.balance.transferable = '200000000000000000000';
    await flushPromises();
    expect(wrapper.vm.canSubmit).toBe(true);
    expect(wrapper.text()).not.toContain('getTs.balancesLoading');
  });

  it('reads the spendable balance like the wallet page and shows it beside the amount', async () => {
    const wrapper = await setup();
    wrapper.vm.openDialog();
    await flushPromises();
    // The wallet page tolerates grouped codec strings; the burn check must agree with what it displays.
    assets.xor.balance.transferable = '932,000,000,000,000,000,000';
    wrapper.vm.setAmount('100');
    await flushPromises();
    expect(wrapper.vm.canSubmit).toBe(true);
    expect(wrapper.findComponent({ name: 'TokenInput' }).attributes('balance')).toBe('932000000000000000000');
    wrapper.vm.setAmount('931.999');
    expect(wrapper.vm.canSubmit).toBe(true);
    wrapper.vm.setAmount('932');
    expect(wrapper.vm.canSubmit).toBe(false);
    expect(wrapper.vm.validationMessage).toBe('insufficientBalanceText');
  });

  it('fills MAX with the spendable balance minus the exact network fee', async () => {
    const wrapper = await setup();
    wrapper.vm.openDialog();
    await flushPromises();
    const input = wrapper.findComponent({ name: 'TokenInput' });
    expect(input.attributes('is-max-available')).toBe('true');
    input.vm.$emit('max');
    await flushPromises();
    expect(wrapper.vm.amount).toBe('199.999');
    expect(wrapper.vm.canSubmit).toBe(true);

    assets.xor.balance.transferable = '1000000000000000';
    await flushPromises();
    expect(input.attributes('is-max-available')).toBe('false');
  });

  it('rechecks balance and fee immediately before the SDK signs', async () => {
    const wrapper = await setup();
    wrapper.vm.openDialog();
    wrapper.vm.setAmount('10');
    beforeSigning(() => {
      assets.xor.balance.transferable = '0';
    });
    await wrapper.vm.confirmBurn();
    expect(mocks.burn).not.toHaveBeenCalled();
    expect(wrapper.vm.submitError).toBe('insufficientBalanceText');
    assets.xor.balance.transferable = '200000000000000000000';
    beforeSigning(() => {
      settings.networkFees = {};
    });
    await wrapper.vm.confirmBurn();
    expect(mocks.burn).not.toHaveBeenCalled();
    expect(wrapper.vm.submitError).toBe('burnPage.tonswap.feeUnavailable');
  });

  it('does not gate burning on an indexer checkpoint but still prevents signing on testnet', async () => {
    mocks.fetch.mockResolvedValue({ burns: [], indexedThroughBlock: TONSWAP_START_BLOCK - 1, fresh: true });
    const wrapper = await setup();
    expect(wrapper.vm.canBurn).toBe(true);
    settings.soraNetwork = 'Test';
    await nextTick();
    expect(wrapper.vm.canBurn).toBe(false);
  });

  it('aborts if the active wallet changes before the SDK signs', async () => {
    const wrapper = await setup();
    wrapper.vm.openDialog();
    wrapper.vm.setAmount('10');
    beforeSigning(async () => {
      address.value = 'charlie';
      await nextTick();
    });
    await wrapper.vm.confirmBurn();
    expect(mocks.burn).not.toHaveBeenCalled();
    expect(wrapper.vm.submitError).toBe('burnPage.tonswap.accountChanged');
  });

  it('checks the actual connected chain even when the selected network says production', async () => {
    const wrapper = await setup();
    wrapper.vm.openDialog();
    wrapper.vm.setAmount('10');
    mocks.chain.genesisHash.toString.mockReturnValue(`0x${'0'.repeat(64)}`);
    await wrapper.vm.confirmBurn();
    expect(mocks.burn).not.toHaveBeenCalled();
    expect(wrapper.vm.submitError).toBe('burnPage.tonswap.mainnetOnly');
  });

  it('rejects a disconnected chain or a different SDK signing account', async () => {
    const wrapper = await setup();
    wrapper.vm.openDialog();
    wrapper.vm.setAmount('10');
    mocks.chain.isConnected = false;
    await wrapper.vm.confirmBurn();
    expect(mocks.burn).not.toHaveBeenCalled();
    expect(wrapper.vm.submitError).toBe('burnPage.tonswap.connectionUnavailable');
    mocks.chain.isConnected = true;
    mocks.account.pair.address = 'charlie';
    await wrapper.vm.confirmBurn();
    expect(mocks.burn).not.toHaveBeenCalled();
    expect(wrapper.vm.submitError).toBe('burnPage.tonswap.accountChanged');
  });

  it('closes the dialog on logout even if the displayed address has not cleared yet', async () => {
    const wrapper = await setup();
    wrapper.vm.openDialog();
    wrapper.vm.setAmount('10');
    loggedIn.value = false;
    await nextTick();
    expect(wrapper.vm.dialogVisible).toBe(false);
    expect(wrapper.vm.canSubmit).toBe(false);
  });

  it('requires an open dialog and prevents duplicate submissions only during the actual signing operation', async () => {
    const wrapper = await setup();
    wrapper.vm.setAmount('10');
    expect(wrapper.vm.canSubmit).toBe(false);
    wrapper.vm.openDialog();
    wrapper.vm.setAmount('10');
    let resolve!: () => void;
    mocks.burn.mockReturnValueOnce(
      new Promise<void>((done) => {
        resolve = done;
      })
    );
    const pending = wrapper.vm.confirmBurn();
    expect(wrapper.vm.canBurn).toBe(false);
    await wrapper.vm.confirmBurn();
    wrapper.vm.openDialog();
    wrapper.vm.setAmount('20');
    expect(mocks.notify).toHaveBeenCalledTimes(1);
    resolve();
    await pending;
    expect(mocks.burn).toHaveBeenCalledTimes(1);
    expect(mocks.burn).toHaveBeenCalledWith(expect.anything(), '10', createTonswapXorBurnRemark());
    expect(wrapper.vm.canBurn).toBe(true);
  });

  it('allows a newly exhausted cap and leaves wallet-rejected submissions open for review', async () => {
    const wrapper = await setup();
    wrapper.vm.openDialog();
    wrapper.vm.setAmount('10');
    beforeSigning(async () => {
      mocks.fetch.mockResolvedValue(snapshot([burn('1753357')]));
      await wrapper.vm.refreshSnapshot();
    });
    mocks.burn.mockRejectedValueOnce(new Error('wallet rejected'));
    await wrapper.vm.confirmBurn();
    expect(mocks.burn).toHaveBeenCalledTimes(1);
    expect(wrapper.vm.dialogVisible).toBe(true);
    expect(wrapper.vm.canSubmit).toBe(true);
    expect(wrapper.vm.submitError).toBe('wallet rejected');
  });

  it('discards an in-flight snapshot after switching away from mainnet', async () => {
    const wrapper = await setup();
    let resolve!: (value: ReturnType<typeof snapshot>) => void;
    mocks.fetch.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      })
    );
    const pending = wrapper.vm.refreshSnapshot();
    settings.soraNetwork = 'Test';
    await nextTick();
    resolve(snapshot([burn('100')]));
    await pending;
    expect(wrapper.vm.allocation).toBeNull();
    expect(wrapper.vm.canBurn).toBe(false);
  });

  it('does not submit an outstanding wallet confirmation after unmount', async () => {
    const wrapper = await setup();
    wrapper.vm.openDialog();
    wrapper.vm.setAmount('10');
    let resolve!: () => void;
    beforeSigning(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        })
    );
    const pending = wrapper.vm.confirmBurn();
    wrapper.unmount();
    resolve();
    await pending;
    expect(mocks.burn).not.toHaveBeenCalled();
  });

  it('shows account rewards from the globally ordered allocation, not an account-only curve', async () => {
    mocks.fetch.mockResolvedValue(
      snapshot([burn('100'), { ...burn('10'), address: 'alice', extrinsicIndex: 2, txHash: `0x${'2'.repeat(64)}` }])
    );
    const wrapper = await setup();
    expect(wrapper.text()).toContain('burnPage.tonswap.claimDetails');
    const rows = wrapper.vm.allocation.allocations;
    expect(rows[1].burnedBefore.toString()).toBe('100');
    const copy = wrapper.find('button[aria-label="burnPage.copySoraNetworkTxHash"]');
    await copy.trigger('click');
    expect(mocks.copy).toHaveBeenCalledWith(`0x${'2'.repeat(64)}`, expect.anything());
  });

  it('renders every account burn newest first with its amount, reserved TS, block and copyable hash', async () => {
    const first = { ...burn('2'), address: 'alice' };
    const second = { ...burn('3'), address: 'alice', extrinsicIndex: 2, txHash: `0x${'2'.repeat(64)}` };
    const anotherAccount = { ...burn('7'), address: 'bob', extrinsicIndex: 3, txHash: `0x${'4'.repeat(64)}` };
    mocks.fetch.mockResolvedValue(snapshot([first, second, anotherAccount]));
    const wrapper = await setup();
    const rows = wrapper.findAll('.tonswap-burn__records > li[data-tx-hash]');
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.attributes('data-tx-hash'))).toEqual([second.txHash, first.txHash]);
    expect(rows[0].findAll('dd').map((amount) => amount.text())).toEqual(['3 XOR', '149.9997 TS']);
    expect(rows[1].findAll('dd').map((amount) => amount.text())).toEqual(['2 XOR', '99.9999 TS']);
    expect(rows[1].findAll('dd')[1].attributes('title')).toBe('99.999948669894379752 TS');
    expect(rows[1].findAll('dd')[1].attributes('aria-label')).toBe('99.999948669894379752 TS');
    for (const row of rows) {
      expect(row.text()).toContain('27,720,478');
      expect(row.get('code').text()).toBe(row.attributes('data-tx-hash'));
      await row.get('button[aria-label="burnPage.copySoraNetworkTxHash"]').trigger('click');
      expect(mocks.copy).toHaveBeenLastCalledWith(row.attributes('data-tx-hash'), expect.anything());
    }
  });

  it('keeps a pending burn in the history list and replaces it with one finalized row when indexed', async () => {
    const previous = { ...burn('1'), address: 'alice' };
    mocks.fetch.mockResolvedValue(snapshot([previous]));
    const wrapper = await setup();
    await submitPendingBurn(wrapper, TransactionStatus.InBlock);
    expect(wrapper.findAll('.tonswap-burn__records > li')).toHaveLength(2);
    expect(wrapper.get('.tonswap-burn__records > li:first-child').attributes('data-burn-phase')).toBe('included');
    expect(wrapper.get('.tonswap-burn__spinner').attributes('aria-hidden')).toBe('true');
    expect(wrapper.get('.tonswap-burn__receipt code').text()).toBe(pendingHash);
    mocks.fetch.mockResolvedValue(snapshot([previous, { ...indexedPendingBurn(), extrinsicIndex: 2 }]));
    settings.blockNumber += 1;
    await flushPromises();
    expect(wrapper.findAll('.tonswap-burn__records > li')).toHaveLength(2);
    expect(wrapper.find('.tonswap-burn__receipt').exists()).toBe(false);
    expect(wrapper.findAll('code').filter((code) => code.text() === pendingHash)).toHaveLength(1);
    expect(wrapper.text()).toContain('burnPage.tonswap.rewardsUpdated');
  });

  it.each(['failed', 'pending'])('signs with %s initial campaign data and no fabricated estimate', async (state) => {
    if (state === 'failed') mocks.fetch.mockRejectedValue(new Error('Indexer unavailable'));
    else mocks.fetch.mockReturnValue(new Promise(() => {}));
    const wrapper = await setup();
    wrapper.vm.openDialog();
    wrapper.vm.setAmount('2');
    await nextTick();
    expect(wrapper.vm.allocation).toBeNull();
    expect(wrapper.vm.quote).toBeNull();
    expect(wrapper.vm.canSubmit).toBe(true);
    expect(wrapper.get('.tonswap-dialog__estimate').text()).toContain('—');
    expect(wrapper.text()).toContain('burnPage.tonswap.estimateUnavailable');
    await wrapper.vm.confirmBurn();
    expect(mocks.burn).toHaveBeenCalledWith(XOR, '2', createTonswapXorBurnRemark());
    expect(wrapper.vm.canBurn).toBe(true);
  });

  it('enforces amount plus fee and missing balance even when no reward estimate is available', async () => {
    mocks.fetch.mockRejectedValue(new Error('Indexer unavailable'));
    const wrapper = await setup();
    wrapper.vm.openDialog();
    wrapper.vm.setAmount('200');
    expect(wrapper.vm.quote).toBeNull();
    expect(wrapper.vm.canSubmit).toBe(false);
    await wrapper.vm.confirmBurn();
    wrapper.vm.setAmount('199.999');
    expect(wrapper.vm.canSubmit).toBe(true);
    assets.xor.balance.transferable = '';
    expect(wrapper.vm.canSubmit).toBe(false);
    await wrapper.vm.confirmBurn();
    expect(mocks.burn).not.toHaveBeenCalled();
  });

  it('retains both pending receipts and reconciles each exact hash independently in reverse order', async () => {
    const wrapper = await setup();
    const secondHash = `0x${'4'.repeat(64)}`;
    let sequence = 0;
    mocks.notify.mockImplementation(async (handler: () => Promise<void>) => {
      await handler();
      const txHash = sequence++ ? secondHash : pendingHash;
      const transaction = { ...pendingHistory(), id: txHash, txId: txHash };
      mocks.history = [transaction, ...mocks.history];
      return { submitted: true, transaction };
    });
    for (let count = 0; count < 2; count += 1) {
      wrapper.vm.openDialog();
      wrapper.vm.setAmount('2');
      await wrapper.vm.confirmBurn();
      await flushPromises();
    }
    expect(mocks.burn).toHaveBeenCalledTimes(2);
    expect(wrapper.vm.priorBurnReceipts).toHaveLength(1);
    expect(wrapper.findAll('.tonswap-burn__receipt code').map((code) => code.text())).toEqual([
      secondHash,
      pendingHash,
    ]);
    expect(wrapper.vm.canBurn).toBe(true);
    mocks.fetch.mockResolvedValue(snapshot([{ ...indexedPendingBurn(), txHash: secondHash }]));
    await wrapper.vm.refreshSnapshot();
    await nextTick();
    expect(wrapper.vm.burnReceipt.phase).toBe('updated');
    expect(wrapper.vm.priorBurnReceipts[0].phase).toBe('waiting');
    expect(wrapper.vm.burnPending).toBe(true);
    expect(wrapper.get('.tonswap-burn__receipt code').text()).toBe(pendingHash);
    mocks.fetch.mockResolvedValue(
      snapshot([indexedPendingBurn(), { ...indexedPendingBurn(), txHash: secondHash, extrinsicIndex: 2 }])
    );
    await wrapper.vm.refreshSnapshot();
    await nextTick();
    expect(wrapper.vm.burnPending).toBe(false);
    expect(wrapper.findAll('.tonswap-burn__receipt')).toHaveLength(0);
    expect(wrapper.findAll('.tonswap-burn__records > li')).toHaveLength(2);
    expect(
      wrapper
        .findAll('code')
        .map((code) => code.text())
        .sort()
    ).toEqual([pendingHash, secondHash].sort());
  });

  it('recovers separate hashes for two timed-out same-amount receipts when late history arrives in reverse order', async () => {
    vi.useFakeTimers();
    const wrapper = await setup();
    const startedAt = Date.now();
    const secondHash = `0x${'4'.repeat(64)}`;
    mocks.notify.mockImplementation(async (handler: () => Promise<void>) => {
      await handler();
      return { submitted: true, historyTimedOut: true };
    });
    wrapper.vm.openDialog();
    wrapper.vm.setAmount('2');
    await wrapper.vm.confirmBurn();
    vi.setSystemTime(startedAt + 100);
    wrapper.vm.openDialog();
    wrapper.vm.setAmount('2');
    await wrapper.vm.confirmBurn();
    await flushPromises();
    expect(wrapper.vm.priorBurnReceipts[0].txHash).toBe('');
    const second = {
      ...pendingHistory(TransactionStatus.InBlock),
      id: secondHash,
      txId: secondHash,
      startTime: startedAt + 100,
    };
    const unrelated = { ...pendingHistory(), id: `0x${'5'.repeat(64)}`, txId: `0x${'5'.repeat(64)}`, from: 'charlie' };
    wallet.history = { [secondHash]: second, unrelated };
    await flushPromises();
    expect(wrapper.vm.burnReceipt.txHash).toBe(secondHash);
    expect(wrapper.vm.priorBurnReceipts).toHaveLength(1);
    expect(wrapper.vm.priorBurnReceipts[0].txHash).toBe('');
    wallet.history = {
      ...wallet.history,
      [pendingHash]: { ...pendingHistory(TransactionStatus.Finalized), startTime: startedAt },
    };
    await flushPromises();
    expect(wrapper.vm.priorBurnReceipts[0].txHash).toBe(pendingHash);
    expect(wrapper.vm.priorBurnReceipts[0].phase).toBe('confirmed');
    expect(wrapper.findAll('.tonswap-burn__receipt')).toHaveLength(2);
    expect(wrapper.text()).not.toContain(unrelated.txId);
  });

  it('recovers every unresolved burn after reload and clears all receipts when the account changes', async () => {
    const secondHash = `0x${'4'.repeat(64)}`;
    mocks.history = [
      pendingHistory(TransactionStatus.InBlock),
      { ...pendingHistory(), id: secondHash, txId: secondHash },
    ];
    const wrapper = await setup();
    expect(wrapper.findAll('.tonswap-burn__receipt')).toHaveLength(2);
    expect(wrapper.vm.priorBurnReceipts).toHaveLength(1);
    address.value = 'charlie';
    await nextTick();
    expect(wrapper.vm.burnReceipt).toBeNull();
    expect(wrapper.vm.priorBurnReceipts).toHaveLength(0);
    expect(wrapper.findAll('.tonswap-burn__receipt')).toHaveLength(0);
  });

  it('finishes a Trust receipt at wallet finality with zero TS and a retained copyable hash', async () => {
    address.value = excludedAddress;
    mocks.account.pair.address = excludedAlternateAddress;
    const wrapper = await setup();
    mocks.notify.mockImplementation(async (handler: () => Promise<void>) => {
      await handler();
      const transaction = { ...pendingHistory(), from: excludedAlternateAddress };
      mocks.history = [transaction];
      return { submitted: true, transaction };
    });
    wrapper.vm.openDialog();
    wrapper.vm.setAmount('2');
    await wrapper.vm.confirmBurn();
    await flushPromises();
    expect(wrapper.vm.burnPending).toBe(true);
    wallet.history = {
      [pendingHash]: { ...pendingHistory(TransactionStatus.Finalized), from: excludedAlternateAddress },
    };
    await flushPromises();
    expect(wrapper.vm.burnReceipt.phase).toBe('confirmed');
    expect(wrapper.vm.burnPending).toBe(false);
    const receipt = wrapper.get('.tonswap-burn__receipt');
    expect(receipt.text()).toContain('transaction.statuses.complete');
    expect(receipt.text()).toContain('0 TS');
    expect(receipt.text()).not.toContain('burnPage.tonswap.claimNotice');
    expect(receipt.find('.tonswap-burn__spinner').exists()).toBe(false);
    expect(receipt.find('.tonswap-burn__retry').exists()).toBe(false);
    expect(receipt.get('code').text()).toBe(pendingHash);
    expect(wrapper.vm.allocation.totalEligible.toString()).toBe('0');
    expect(wrapper.vm.allocation.totalReward.toString()).toBe('0');
    await receipt.get('button[aria-label="burnPage.copySoraNetworkTxHash"]').trigger('click');
    expect(mocks.copy).toHaveBeenCalledWith(pendingHash, expect.anything());
    expect(wrapper.vm.canBurn).toBe(true);
  });
});

describe('Tonswap campaign headline numbers and live state', () => {
  it('shows the headline numbers, the live pill and the cap meter from verified campaign data', async () => {
    mocks.fetch.mockResolvedValue(snapshot([burn('11592.4')]));
    const wrapper = await setup();

    expect(wrapper.get('.tonswap-burn__live').text()).toBe('burnPage.tonswap.live');
    expect(
      wrapper.findAll('.tonswap-stat').map((tile) => [tile.get('dt').text(), tile.get('.tonswap-stat__value').text()])
    ).toEqual([
      ['burnPage.tonswap.currentRate', '49.7024'],
      ['burnPage.tonswap.rewardedBurns', '11,592.4'],
      ['burnPage.tonswap.remaining', '1,741,764.6'],
      ['burnPage.tonswap.totalReserved', '577,895.5171'],
    ]);
    expect(wrapper.get('.tonswap-stat--rate dd').attributes('title')).toBe('49.70248 TS / XOR');
    const meter = wrapper.get('progress.tonswap-burn__progress');
    expect(meter.attributes('value')).toBe('11592.4');
    expect(meter.attributes('max')).toBe('1753357');
    expect(wrapper.get('.tonswap-burn__meter-labels').text()).toContain('burnPage.tonswap.cap: 1,753,357 XOR');
    expect(wrapper.find('.tonswap-burn__track').exists()).toBe(false);
    expect(wrapper.get('.tonswap-burn__stats').attributes('aria-busy')).toBe('false');
  });

  it('keeps the meter track and placeholder values while no campaign data has loaded', async () => {
    mocks.fetch.mockRejectedValue(new Error('Indexer unavailable'));
    const wrapper = await setup();

    expect(wrapper.find('progress').exists()).toBe(false);
    expect(wrapper.find('.tonswap-burn__track').exists()).toBe(true);
    expect(wrapper.get('.tonswap-burn__stats').attributes('aria-busy')).toBe('true');
    expect(wrapper.get('.tonswap-burn__meter-labels').text()).toContain('burnPage.tonswap.cap: 1,753,357 XOR');
  });

  it('does not call burning live on stale data, once the cap is reached, or away from mainnet', async () => {
    mocks.fetch.mockResolvedValue({ ...snapshot([burn('100')]), fresh: false });
    const stale = await setup();
    expect(stale.find('.tonswap-burn__live').exists()).toBe(false);
    expect(stale.get('.tonswap-burn__data').attributes('data-state')).toBe('stale');

    mocks.fetch.mockResolvedValue(snapshot([burn('1753357')]));
    const capped = await setup();
    expect(capped.vm.allocation.remaining.toString()).toBe('0');
    expect(capped.find('.tonswap-burn__live').exists()).toBe(false);
    expect(capped.get('.tonswap-stat:nth-child(3) .tonswap-stat__value').text()).toBe('0');

    settings.soraNetwork = 'Test';
    const testnet = await setup();
    expect(testnet.find('.tonswap-burn__live').exists()).toBe(false);
    expect(testnet.find('.tonswap-burn__stats').exists()).toBe(false);
    expect(testnet.find('.tonswap-burn__meter').exists()).toBe(false);
  });

  it('shares only fresh, verified readings with the sidebar', async () => {
    mocks.fetch.mockResolvedValue(snapshot([burn('11592.4')]));
    await setup();
    expect(mocks.publish).toHaveBeenCalledTimes(1);
    const summary = mocks.publish.mock.calls[0][0];
    expect(summary.live).toBe(true);
    expect(summary.burned.toString()).toBe('11592.4');
    expect(summary.indexedThroughBlock).toBe(TONSWAP_START_BLOCK + 10);

    mocks.publish.mockClear();
    mocks.fetch.mockResolvedValue({ ...snapshot([burn('11592.4')]), fresh: false });
    await setup();
    expect(mocks.publish).toHaveBeenCalledExactlyOnceWith(null);
  });

  it('leaves the numbers to the tiles and tells the chart not to repeat them', async () => {
    mocks.fetch.mockResolvedValue(snapshot([burn('6')]));
    const wrapper = await setup();
    const curve = wrapper.findComponent({ name: 'TonswapRewardCurve' });

    expect(curve.props('showSummary')).toBe(false);
    expect(curve.find('.tonswap-curve__current').exists()).toBe(false);
    expect(curve.find('.tonswap-curve__totals').exists()).toBe(false);
    expect(curve.find('.tonswap-curve__point').exists()).toBe(true);
  });

  it('shows account totals only for a signed-in account once campaign data exists', async () => {
    mocks.fetch.mockResolvedValue(snapshot([{ ...burn('17533.57'), address: 'alice' }]));
    const wrapper = await setup();
    expect(wrapper.get('.tonswap-burn__account').text()).toContain('burnPage.tonswap.yourBurns: 17,533.57 XOR');

    loggedIn.value = false;
    await nextTick();
    expect(wrapper.find('.tonswap-burn__account').exists()).toBe(false);
    loggedIn.value = true;
  });
});

describe('Tonswap burn form, status banner and folded reading', () => {
  const banner = (wrapper: ReturnType<typeof mount>) => wrapper.find('.burn-status');
  const steps = (wrapper: ReturnType<typeof mount>) =>
    wrapper
      .findAll('.burn-status__step')
      .map((step) => `${step.attributes('data-step')}:${step.attributes('data-state')}`);

  it('opens a status banner above the form when a burn is sent and follows it to the indexed reservation', async () => {
    const wrapper = await setup();
    expect(banner(wrapper).exists()).toBe(false);

    await submitPendingBurn(wrapper);
    expect(banner(wrapper).attributes('data-phase')).toBe('waiting');
    expect(wrapper.get('.burn-status__message').text()).toBe('burnPage.tonswap.waitingConfirmation');
    expect(wrapper.get('.burn-status__value').text()).toBe('2');
    expect(steps(wrapper)).toEqual(['sent:done', 'included:active', 'final:todo', 'reserved:todo']);
    // Before the indexer lists the burn, the banner repeats the advisory estimate and says it is one.
    expect(wrapper.get('.burn-status__note').text()).toBe('burnPage.tonswap.journey.estimated: ≈ 99.9999 TS');
    // The banner comes before the amount field, where the user just acted.
    const field = wrapper.get('#tonswap-preview-amount').element;
    expect(banner(wrapper).element.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(wrapper.classes()).toContain('tonswap-burn--burning');

    wallet.history = { [pendingHash]: pendingHistory(TransactionStatus.InBlock) };
    await flushPromises();
    expect(steps(wrapper)).toEqual(['sent:done', 'included:done', 'final:active', 'reserved:todo']);

    wallet.history = { [pendingHash]: pendingHistory(TransactionStatus.Finalized) };
    await flushPromises();
    expect(steps(wrapper)).toEqual(['sent:done', 'included:done', 'final:done', 'reserved:active']);
    expect(wrapper.get('.burn-status__value').text()).toBe('2');

    mocks.fetch.mockResolvedValue(snapshot([indexedPendingBurn()]));
    wallet.externalHistoryUpdates = { [pendingHash]: pendingHistory(TransactionStatus.Finalized) };
    await flushPromises();
    expect(banner(wrapper).attributes('data-phase')).toBe('updated');
    expect(steps(wrapper)).toEqual(['sent:done', 'included:done', 'final:done', 'reserved:done']);
    // The headline is now the indexed reservation of exactly this transaction.
    expect(wrapper.vm.statusReward.toString()).toBe('99.999948669894379752');
    expect(wrapper.get('.burn-status__value').text()).toBe('+99.9999');
    expect(wrapper.get('.burn-status__figure').attributes('title')).toBe('99.999948669894379752 TS');
    expect(wrapper.classes()).not.toContain('tonswap-burn--burning');
  });

  it('keeps the banner number while a read is in flight and withdraws it after a failed read', async () => {
    const wrapper = await setup();
    await submitPendingBurn(wrapper, TransactionStatus.Finalized);
    expect(wrapper.get('.burn-status__note').text()).toContain('≈ 99.9999 TS');

    let resolve!: (value: ReturnType<typeof snapshot>) => void;
    mocks.fetch.mockReturnValueOnce(new Promise((done) => (resolve = done)));
    const read = wrapper.vm.refreshSnapshot();
    await nextTick();
    expect(wrapper.get('.burn-status__note').text()).toContain('≈ 99.9999 TS');
    resolve(snapshot([indexedPendingBurn()]));
    await read;
    await nextTick();
    expect(wrapper.get('.burn-status__value').text()).toBe('+99.9999');

    let reject!: (reason: Error) => void;
    mocks.fetch.mockReturnValueOnce(new Promise((_done, fail) => (reject = fail)));
    const failing = wrapper.vm.refreshSnapshot();
    await nextTick();
    expect(wrapper.get('.burn-status__value').text()).toBe('+99.9999');
    reject(new Error('Indexer unavailable'));
    await failing;
    await nextTick();
    // After a failed admission no TS number is shown anywhere, the banner included.
    expect(wrapper.vm.allocation).toBeNull();
    expect(wrapper.vm.statusReward).toBeNull();
    expect(wrapper.get('.burn-status__value').text()).toBe('2');
    expect(wrapper.get('.burn-status__message').text()).toBe('burnPage.tonswap.confirmed');
    expect(wrapper.get('.burn-status').attributes('data-phase')).toBe('confirmed');
    expect(wrapper.get('[data-step="reserved"]').attributes('data-state')).toBe('active');
    expect(wrapper.get('.tonswap-burn__receipt code').text()).toBe(pendingHash);

    mocks.fetch.mockResolvedValue({ ...snapshot([indexedPendingBurn()]), fresh: false });
    await wrapper.vm.refreshSnapshot();
    await nextTick();
    // Certified older data lists the transaction again, so its own row supplies the number.
    expect(wrapper.get('.tonswap-burn__data').attributes('data-state')).toBe('stale');
    expect(wrapper.get('.burn-status__value').text()).toBe('+99.9999');
  });

  it('withdraws the banner reservation at expiry while preserving proved chain finality', async () => {
    vi.useFakeTimers();
    mocks.fetch.mockResolvedValue(snapshot([indexedPendingBurn()]));
    const wrapper = await setup();
    mocks.fetch.mockResolvedValue(snapshot());
    await wrapper.vm.refreshSnapshot();
    mocks.fetch.mockResolvedValue(snapshot([indexedPendingBurn()]));
    await submitPendingBurn(wrapper, TransactionStatus.Finalized);
    await flushPromises();
    expect(wrapper.get('.burn-status__value').text()).toBe('+99.9999');

    // The tab is hidden for longer than a reading may be kept, then a slow read starts.
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    try {
      await vi.advanceTimersByTimeAsync(61_000);
      visibility.mockReturnValue('visible');
      mocks.fetch.mockReturnValueOnce(new Promise(() => {}));
      document.dispatchEvent(new Event('visibilitychange'));
      await nextTick();
      expect(wrapper.vm.allocation).toBeNull();
      expect(wrapper.vm.statusReward).toBeNull();
      expect(wrapper.get('.burn-status__value').text()).toBe('2');
      expect(wrapper.get('.burn-status').attributes('data-phase')).toBe('confirmed');
      expect(wrapper.get('.burn-status__message').text()).toBe('burnPage.tonswap.confirmed');
    } finally {
      visibility.mockRestore();
    }
  });

  it('withdraws a reservation omitted by the next complete snapshot without losing the transaction', async () => {
    const wrapper = await setup();
    mocks.fetch.mockResolvedValue(snapshot([indexedPendingBurn()]));
    await submitPendingBurn(wrapper, TransactionStatus.Finalized);
    expect(wrapper.get('.burn-status__value').text()).toBe('+99.9999');

    mocks.fetch.mockResolvedValue(snapshot());
    await wrapper.vm.refreshSnapshot();
    await nextTick();
    expect(wrapper.vm.statusReward).toBeNull();
    expect(wrapper.get('.burn-status').attributes('data-phase')).toBe('confirmed');
    expect(wrapper.get('.burn-status__value').text()).toBe('2');
    expect(wrapper.get('.burn-status__message').text()).toBe('burnPage.tonswap.confirmed');
    expect(wrapper.get('.tonswap-burn__receipt code').text()).toBe(pendingHash);

    mocks.fetch.mockResolvedValue(snapshot([indexedPendingBurn()]));
    await wrapper.vm.refreshSnapshot();
    await nextTick();
    expect(wrapper.get('.burn-status').attributes('data-phase')).toBe('updated');
    expect(wrapper.get('.burn-status__value').text()).toBe('+99.9999');
  });

  it('withdraws a completed banner reservation when the endpoint changes before its replacement arrives', async () => {
    const store = wallet as typeof wallet & { indexers?: Record<string, { endpoint: string }> };
    store.indexers = { polkaswap: { endpoint: 'https://first.invalid/graphql' } };
    try {
      const wrapper = await setup();
      mocks.fetch.mockResolvedValue(snapshot([indexedPendingBurn()]));
      await submitPendingBurn(wrapper, TransactionStatus.Finalized);
      expect(wrapper.get('.burn-status__value').text()).toBe('+99.9999');

      mocks.fetch.mockReturnValueOnce(new Promise(() => {}));
      store.indexers.polkaswap.endpoint = 'https://second.invalid/graphql';
      await nextTick();
      expect(wrapper.vm.allocation).toBeNull();
      expect(wrapper.vm.statusReward).toBeNull();
      expect(wrapper.get('.burn-status').attributes('data-phase')).toBe('confirmed');
      expect(wrapper.get('.burn-status__value').text()).toBe('2');
      expect(wrapper.get('.tonswap-burn__receipt code').text()).toBe(pendingHash);
    } finally {
      delete store.indexers;
    }
  });

  it('does not retain an estimate whose reading expired while the wallet was signing', async () => {
    vi.useFakeTimers();
    const wrapper = await setup();
    let complete!: () => void;
    mocks.notify.mockImplementation(async (handler: () => Promise<void>) => {
      await handler();
      await new Promise<void>((resolve) => (complete = resolve));
      const transaction = pendingHistory();
      mocks.history = [transaction];
      return { submitted: true, transaction };
    });
    wrapper.vm.openDialog();
    wrapper.vm.setAmount('2');
    const submitting = wrapper.vm.confirmBurn();
    await flushPromises();
    await vi.advanceTimersByTimeAsync(60_000);
    complete();
    await submitting;
    await flushPromises();
    expect(wrapper.vm.allocation).not.toBeNull();
    expect(wrapper.vm.statusReward).toBeNull();
    expect(wrapper.find('.burn-status__note').exists()).toBe(false);
  });

  it('does not restore a withdrawn signing estimate when another endpoint later supplies data', async () => {
    const store = wallet as typeof wallet & { indexers?: Record<string, { endpoint: string }> };
    store.indexers = { polkaswap: { endpoint: 'https://first.invalid/graphql' } };
    try {
      const wrapper = await setup();
      await submitPendingBurn(wrapper);
      expect(wrapper.get('.burn-status__note').text()).toContain('≈ 99.9999 TS');
      store.indexers.polkaswap.endpoint = 'https://second.invalid/graphql';
      await flushPromises();
      expect(wrapper.vm.allocation).not.toBeNull();
      expect(wrapper.vm.statusReward).toBeNull();
      expect(wrapper.find('.burn-status__note').exists()).toBe(false);
      expect(wrapper.get('.burn-status').attributes('data-phase')).toBe('waiting');
    } finally {
      delete store.indexers;
    }
  });

  it('shows no estimate for a burn recovered after a reload, because none was reviewed in this visit', async () => {
    mocks.history = [pendingHistory(TransactionStatus.InBlock)];
    const wrapper = await setup();
    expect(banner(wrapper).attributes('data-phase')).toBe('included');
    expect(wrapper.vm.statusReward).toBeNull();
    expect(wrapper.find('.burn-status__note').exists()).toBe(false);

    mocks.fetch.mockResolvedValue(snapshot([indexedPendingBurn()]));
    await wrapper.vm.refreshSnapshot();
    await nextTick();
    expect(wrapper.get('.burn-status__value').text()).toBe('+99.9999');
  });

  it('keeps the banner until the user closes it, returns to the amount field and shows the next burn again', async () => {
    const focus = vi.spyOn(HTMLInputElement.prototype, 'focus');
    const wrapper = await setup();
    mocks.fetch.mockResolvedValue(snapshot([indexedPendingBurn()]));
    await submitPendingBurn(wrapper, TransactionStatus.Finalized);
    await flushPromises();
    expect(banner(wrapper).attributes('data-phase')).toBe('updated');
    expect(wrapper.find('.tonswap-burn__receipt').exists()).toBe(false);

    await wrapper.get('.burn-status__dismiss').trigger('click');
    await flushPromises();
    expect(banner(wrapper).exists()).toBe(false);
    expect(focus).toHaveBeenCalled();
    expect(focus.mock.contexts.at(-1)).toBe(wrapper.get('#tonswap-preview-amount').element);
    // Closing the banner never removes the record itself.
    expect(wrapper.findAll(`[data-tx-hash="${pendingHash}"]`)).toHaveLength(1);
    expect(wrapper.vm.burnReceipt.phase).toBe('updated');

    const secondHash = `0x${'4'.repeat(64)}`;
    mocks.notify.mockImplementation(async (handler: () => Promise<void>) => {
      await handler();
      const transaction = { ...pendingHistory(), id: secondHash, txId: secondHash };
      mocks.history = [transaction, ...mocks.history];
      return { submitted: true, transaction };
    });
    wrapper.vm.openDialog();
    wrapper.vm.setAmount('2');
    await wrapper.vm.confirmBurn();
    await flushPromises();
    expect(banner(wrapper).attributes('data-phase')).toBe('waiting');
    focus.mockRestore();
  });

  it('shows no TS number in the banner without campaign data, after a failure, or for a SORA Trust burn', async () => {
    mocks.fetch.mockRejectedValue(new Error('offline'));
    const offline = await setup();
    await submitPendingBurn(offline);
    expect(banner(offline).exists()).toBe(true);
    expect(offline.vm.statusReward).toBeNull();
    expect(offline.find('.burn-status__note').exists()).toBe(false);
    offline.unmount();

    mocks.fetch.mockResolvedValue(snapshot());
    mocks.history = [];
    const failed = await setup();
    await submitPendingBurn(failed);
    expect(failed.get('.burn-status__note').text()).toContain('≈ 99.9999 TS');
    wallet.history = {
      [pendingHash]: { ...pendingHistory(TransactionStatus.Error), blockId: `0x${'9'.repeat(64)}` },
    };
    await flushPromises();
    expect(banner(failed).attributes('data-phase')).toBe('failed');
    expect(failed.vm.statusReward).toBeNull();
    expect(failed.get('.burn-status__message').text()).toBe('transaction.statuses.failed');
    expect(failed.find('.burn-status__dismiss').exists()).toBe(true);
    failed.unmount();

    wallet.history = {};
    mocks.history = [];
    address.value = excludedAddress;
    mocks.account.pair.address = excludedAlternateAddress;
    const trust = await setup();
    mocks.notify.mockImplementation(async (handler: () => Promise<void>) => {
      await handler();
      const transaction = { ...pendingHistory(TransactionStatus.Finalized), from: excludedAlternateAddress };
      mocks.history = [transaction];
      return { submitted: true, transaction };
    });
    trust.vm.openDialog();
    trust.vm.setAmount('2');
    await trust.vm.confirmBurn();
    await flushPromises();
    expect(trust.vm.statusReward).toBeNull();
    expect(steps(trust)).toEqual(['sent:done', 'included:done', 'final:done']);
    expect(trust.get('.burn-status__note').text()).toBe('0 TS · burnPage.tonswap.excludedAccount');
    expect(trust.find('.burn-status__claim').exists()).toBe(false);
  });

  it('fills the amount from a quick choice without opening the review or signing', async () => {
    loggedIn.value = false;
    const wrapper = await setup();
    const chips = wrapper.findAll('.tonswap-burn__chip');
    expect(chips.map((chip) => chip.text())).toEqual(['10', '100', '1,000']);
    expect(chips.map((chip) => chip.attributes('aria-label'))).toEqual(['10 XOR', '100 XOR', '1,000 XOR']);
    expect(chips.every((chip) => chip.attributes('type') === 'button')).toBe(true);

    await chips[2].trigger('click');
    expect(wrapper.get('#tonswap-preview-amount').element.value).toBe('1000');
    expect(chips[2].attributes('aria-pressed')).toBe('true');
    expect(chips[0].attributes('aria-pressed')).toBe('false');
    expect(wrapper.emitted('amount-change')?.at(-1)).toEqual(['1000']);
    expect(wrapper.vm.dialogVisible).toBe(false);
    expect(mocks.burn).not.toHaveBeenCalled();
    // A later purchase draft does not overwrite a choice the user made.
    loggedIn.value = true;
    await wrapper.setProps({ initialAmount: '4' });
    expect(wrapper.get('#tonswap-preview-amount').element.value).toBe('1000');
  });

  it('shows zero, an estimate or a dash beside the amount, depending on what is known', async () => {
    const wrapper = await setup();
    const output = () => wrapper.get('.tonswap-burn__out');
    expect(output().get('strong').text()).toBe('0');
    expect(output().classes()).toContain('tonswap-burn__out--empty');
    expect(wrapper.find('.tonswap-burn__flow--lit').exists()).toBe(false);

    await wrapper.get('#tonswap-preview-amount').setValue('2');
    expect(output().get('strong').text()).toBe('≈ 99.9999');
    expect(output().attributes('title')).toBe('99.999948 TS');
    expect(output().classes()).not.toContain('tonswap-burn__out--empty');
    expect(wrapper.find('.tonswap-burn__flow--lit').exists()).toBe(true);
    expect(wrapper.text()).toContain('burnPage.tonswap.journey.estimateNotice');

    mocks.fetch.mockRejectedValueOnce(new Error('Indexer unavailable'));
    await wrapper.vm.refreshSnapshot();
    await nextTick();
    // Without verified campaign data there is an amount but no number to promise.
    expect(output().get('strong').text()).toBe('—');
    expect(wrapper.text()).toContain('burnPage.tonswap.estimateUnavailable');

    // While the next read is only in flight the dash shows without calling it an outage.
    mocks.fetch.mockReturnValueOnce(new Promise(() => {}));
    void wrapper.vm.refreshSnapshot();
    await nextTick();
    expect(wrapper.get('.tonswap-burn__data').attributes('data-state')).toBe('reconnecting');
    expect(output().get('strong').text()).toBe('—');

    await wrapper.get('#tonswap-preview-amount').setValue('abc');
    expect(output().get('strong').text()).toBe('0');
    expect(wrapper.text()).toContain('burnPage.tonswap.invalidAmount');
  });

  it('leads with one sentence and folds the how-to, the full terms and the funding guide away', async () => {
    const wrapper = await setup();
    expect(wrapper.get('.tonswap-burn__description').text()).toBe('burnPage.tonswap.curve.description');
    expect(wrapper.get('.tonswap-burn__hero').text()).not.toContain('burnPage.tonswap.description');

    const more = wrapper.get('details.tonswap-burn__more');
    expect(more.attributes('open')).toBeUndefined();
    expect(more.get('summary').text()).toBe('burnPage.tonswap.more');
    expect(more.findAll('.tonswap-burn__how li').map((step) => step.text())).toEqual([
      'burnPage.tonswap.how.enter',
      'burnPage.tonswap.how.burn',
      'burnPage.tonswap.how.claim',
    ]);
    expect(more.text()).toContain('burnPage.tonswap.description');
    expect(more.text()).toContain('burnPage.tonswap.startBlock: 27,720,478');
    expect(more.get('a').attributes('href')).toBe('https://tonswap.org/ts');

    const funding = wrapper.get('details.tonswap-burn__onboarding');
    expect(funding.attributes('open')).toBeUndefined();
    expect(funding.get('summary').text()).toBe('burnPage.tonswap.journey.getStarted');
    // The chart explains the schedule beside the numbers, so it does not repeat the sentence above.
    expect(wrapper.findComponent({ name: 'TonswapRewardCurve' }).props('compact')).toBe(true);
    expect(wrapper.findAll('.tonswap-curve__description')).toHaveLength(0);
  });

  it('shows the receipt note once for the whole history instead of under every burn', async () => {
    const first = { ...burn('2'), address: 'alice' };
    const second = { ...burn('3'), address: 'alice', extrinsicIndex: 2, txHash: `0x${'2'.repeat(64)}` };
    mocks.fetch.mockResolvedValue(snapshot([first, second]));
    const wrapper = await setup();
    expect(wrapper.findAll('.tonswap-burn__records > li')).toHaveLength(2);
    const notes = wrapper.findAll('.tonswap-burn__receipt-note');
    expect(notes).toHaveLength(1);
    expect(notes[0].text()).toBe('burnPage.tonswap.journey.receiptNotice');
    expect(wrapper.findAll('.tonswap-burn__save-receipt')).toHaveLength(2);

    address.value = 'carol';
    await flushPromises();
    expect(wrapper.find('.tonswap-burn__receipt-note').exists()).toBe(false);
  });
});

describe('Tonswap campaign reading during background reads', () => {
  const rate = (wrapper: ReturnType<typeof mount>) => wrapper.get('.tonswap-stat--rate .tonswap-stat__value').text();
  const tiles = (wrapper: ReturnType<typeof mount>) =>
    wrapper.findAll('.tonswap-stat__value').map((value) => value.text());

  it('keeps the verified numbers, the live mark and the history rows on screen while the next read loads', async () => {
    vi.useFakeTimers();
    mocks.fetch.mockResolvedValue(snapshot([{ ...burn('11592.4'), address: 'alice' }]));
    const wrapper = await setup();
    const shown = tiles(wrapper);
    expect(shown).toEqual(['49.7024', '11,592.4', '1,741,764.6', '577,895.5171']);
    mocks.publish.mockClear();

    let resolve!: (value: ReturnType<typeof snapshot>) => void;
    mocks.fetch.mockReturnValueOnce(new Promise((done) => (resolve = done)));
    await vi.advanceTimersByTimeAsync(5_000);

    // Nothing blinks while the request is out.
    expect(tiles(wrapper)).toEqual(shown);
    expect(wrapper.find('progress.tonswap-burn__progress').exists()).toBe(true);
    expect(wrapper.find('.tonswap-burn__live').exists()).toBe(true);
    expect(wrapper.get('.tonswap-burn__data').attributes('data-state')).toBe('ready');
    expect(wrapper.findAll('.tonswap-burn__records > li[data-tx-hash]')).toHaveLength(1);
    expect(wrapper.get('.tonswap-burn__account').text()).toContain('11,592.4 XOR');
    expect(wrapper.findComponent({ name: 'TonswapRewardCurve' }).props('burned').toString()).toBe('11592.4');
    // The sidebar keeps its reading too: nothing withdrew it.
    expect(mocks.publish).not.toHaveBeenCalled();

    resolve(snapshot([{ ...burn('12592.4'), address: 'alice' }]));
    await flushPromises();
    expect(rate(wrapper)).toBe('49.6768');
    expect(mocks.publish).toHaveBeenCalledTimes(1);
    expect(mocks.publish.mock.calls[0][0].burned.toString()).toBe('12592.4');
  });

  it('expires at the exact 60-second boundary while a replacement read is pending', async () => {
    vi.useFakeTimers();
    mocks.fetch.mockResolvedValue(snapshot([{ ...burn('11592.4'), address: 'alice' }]));
    const wrapper = await setup();
    mocks.publish.mockClear();
    let resolve!: (value: ReturnType<typeof snapshot>) => void;
    mocks.fetch.mockReturnValueOnce(new Promise((done) => (resolve = done)));
    await vi.advanceTimersByTimeAsync(5_000);
    await vi.advanceTimersByTimeAsync(54_999);
    expect(rate(wrapper)).toBe('49.7024');
    expect(mocks.publish).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(tiles(wrapper)).toEqual(['—', '—', '—', '—']);
    expect(wrapper.find('.tonswap-burn__live').exists()).toBe(false);
    expect(wrapper.find('.tonswap-burn__account').exists()).toBe(false);
    expect(wrapper.find('.tonswap-burn__records').exists()).toBe(false);
    expect(mocks.publish).toHaveBeenCalledExactlyOnceWith(null);
    expect(wrapper.vm.canBurn).toBe(true);

    resolve(snapshot([burn('6')]));
    await flushPromises();
    expect(wrapper.vm.allocation.totalEligible.toString()).toBe('6');
  });

  it('expires before returning from the visibility handler even when an older read is pending', async () => {
    vi.useFakeTimers();
    const wrapper = await setup();
    mocks.fetch.mockReturnValueOnce(new Promise(() => {}));
    await vi.advanceTimersByTimeAsync(5_000);
    // Model throttled background timers: wall time advanced but the expiry callback did not run.
    vi.setSystemTime(Date.now() + 55_000);
    document.dispatchEvent(new Event('visibilitychange'));
    await nextTick();
    expect(wrapper.vm.allocation).toBeNull();
    expect(mocks.publish).toHaveBeenLastCalledWith(null);
  });

  it('gives a replacement reading its own 60-second lifetime and removes its expiry timer on unmount', async () => {
    vi.useFakeTimers();
    const wrapper = await setup();
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    try {
      await vi.advanceTimersByTimeAsync(30_000);
      await wrapper.vm.refreshSnapshot();
      await vi.advanceTimersByTimeAsync(30_000);
      expect(wrapper.vm.allocation).not.toBeNull();
      mocks.publish.mockClear();
      wrapper.unmount();
      await vi.advanceTimersByTimeAsync(60_000);
      expect(mocks.publish).not.toHaveBeenCalled();
    } finally {
      visibility.mockRestore();
    }
  });

  it('withdraws every number at once when a read fails, and tells the sidebar', async () => {
    vi.useFakeTimers();
    mocks.fetch.mockResolvedValue(snapshot([{ ...burn('11592.4'), address: 'alice' }]));
    const wrapper = await setup();
    mocks.publish.mockClear();

    mocks.fetch.mockRejectedValueOnce(new Error('Indexer unavailable'));
    await vi.advanceTimersByTimeAsync(5_000);

    expect(tiles(wrapper)).toEqual(['—', '—', '—', '—']);
    expect(wrapper.find('progress').exists()).toBe(false);
    expect(wrapper.find('.tonswap-burn__live').exists()).toBe(false);
    expect(wrapper.find('.tonswap-burn__records').exists()).toBe(false);
    expect(wrapper.find('.tonswap-burn__account').exists()).toBe(false);
    expect(wrapper.get('.tonswap-burn__data').attributes('data-state')).toBe('reconnecting');
    expect(mocks.publish).toHaveBeenCalledExactlyOnceWith(null);
    expect(wrapper.vm.canBurn).toBe(true);
  });

  it('withdraws a reading after a minute even while the tab is hidden', async () => {
    vi.useFakeTimers();
    mocks.fetch.mockResolvedValue(snapshot([burn('11592.4')]));
    const wrapper = await setup();
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    try {
      // No reads happen while the tab is hidden, so the reading on screen ages.
      const before = mocks.fetch.mock.calls.length;
      await vi.advanceTimersByTimeAsync(61_000);
      expect(mocks.fetch).toHaveBeenCalledTimes(before);
      expect(rate(wrapper)).toBe('—');
      expect(mocks.publish).toHaveBeenLastCalledWith(null);
      mocks.publish.mockClear();

      visibility.mockReturnValue('visible');
      mocks.fetch.mockReturnValueOnce(new Promise(() => {}));
      document.dispatchEvent(new Event('visibilitychange'));
      await nextTick();
      expect(tiles(wrapper)).toEqual(['—', '—', '—', '—']);
      expect(wrapper.find('.tonswap-burn__live').exists()).toBe(false);
      expect(wrapper.get('.tonswap-burn__data').attributes('data-state')).toBe('loading');
      expect(mocks.publish).not.toHaveBeenCalled();
    } finally {
      visibility.mockRestore();
    }
  });

  it('keeps a reading that is still within the minute when the tab returns', async () => {
    vi.useFakeTimers();
    mocks.fetch.mockResolvedValue(snapshot([burn('11592.4')]));
    const wrapper = await setup();
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    try {
      await vi.advanceTimersByTimeAsync(55_000);
      visibility.mockReturnValue('visible');
      mocks.fetch.mockReturnValueOnce(new Promise(() => {}));
      document.dispatchEvent(new Event('visibilitychange'));
      await nextTick();
      expect(rate(wrapper)).toBe('49.7024');
      expect(wrapper.get('.tonswap-burn__data').attributes('data-state')).toBe('ready');
    } finally {
      visibility.mockRestore();
    }
  });

  it('starts from nothing when the indexer endpoint changes, even while the old read is recent', async () => {
    const store = wallet as typeof wallet & { indexers?: Record<string, { endpoint: string }> };
    store.indexers = { polkaswap: { endpoint: 'https://first.invalid/graphql' } };
    try {
      mocks.fetch.mockResolvedValue(snapshot([burn('11592.4')]));
      const wrapper = await setup();
      expect(rate(wrapper)).toBe('49.7024');
      mocks.publish.mockClear();

      let resolve!: (value: ReturnType<typeof snapshot>) => void;
      mocks.fetch.mockReturnValueOnce(new Promise((done) => (resolve = done)));
      store.indexers.polkaswap.endpoint = 'https://second.invalid/graphql';
      await nextTick();
      // The other endpoint has proved nothing yet.
      expect(tiles(wrapper)).toEqual(['—', '—', '—', '—']);
      expect(wrapper.find('.tonswap-burn__live').exists()).toBe(false);
      expect(mocks.publish).toHaveBeenCalledExactlyOnceWith(null);

      resolve(snapshot([burn('6')]));
      await flushPromises();
      expect(wrapper.vm.allocation.totalEligible.toString()).toBe('6');
    } finally {
      delete store.indexers;
    }
  });

  it('withdraws the reading when the network leaves mainnet', async () => {
    mocks.fetch.mockResolvedValue(snapshot([burn('11592.4')]));
    const wrapper = await setup();
    mocks.publish.mockClear();
    settings.soraNetwork = 'Test';
    await nextTick();
    expect(wrapper.vm.allocation).toBeNull();
    expect(wrapper.find('.tonswap-burn__stats').exists()).toBe(false);
    expect(mocks.publish).toHaveBeenCalledExactlyOnceWith(null);
  });

  it('replaces a fresh reading with certified older data and stops calling it live', async () => {
    vi.useFakeTimers();
    mocks.fetch.mockResolvedValue(snapshot([burn('11592.4')]));
    const wrapper = await setup();
    mocks.publish.mockClear();

    mocks.fetch.mockResolvedValue({ ...snapshot([burn('100')]), fresh: false });
    await vi.advanceTimersByTimeAsync(5_000);
    expect(wrapper.get('.tonswap-burn__data').attributes('data-state')).toBe('stale');
    expect(wrapper.find('.tonswap-burn__live').exists()).toBe(false);
    expect(wrapper.vm.allocation.totalEligible.toString()).toBe('100');
    expect(mocks.publish).toHaveBeenCalledExactlyOnceWith(null);
  });
});
