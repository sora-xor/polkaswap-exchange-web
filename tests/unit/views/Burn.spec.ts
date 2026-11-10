import { mount, flushPromises } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import BurnPage from '@/features/misc/pages/BurnPage.vue';
import { Language } from '@/consts/language';
import { setI18nLocale } from '@/lang';
import { FPNumber, Operation } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { createSoraNexusXorBurnRemark } from '@/utils/soraNexusAccount';
import type { BurnForStats } from '@/features/misc/lib/burnCampaigns';

const validSoraNexusAccount = 'sorauﾛ1NﾗhBUd2BﾂｦﾄiﾔﾆﾂﾇKSﾃaﾘﾒﾓQﾗrﾒoﾘﾅnｳﾘbQｳQJﾆLJ5HSE';

const connectWalletMock = vi.fn();
const loggedInRef = ref(true);
const accountDialogVisibleRef = ref(false);
const soraAddressRefs: Array<{ value: string }> = [];
const waitForNetworkMock = vi.fn().mockResolvedValue('prod');
const fetchBurnDataMock = vi.fn().mockResolvedValue([]);
const walletApiMock = vi.hoisted(() => ({
  historyList: [] as Array<{
    id?: string;
    txId?: string;
    type?: Operation;
    amount?: string;
    assetAddress?: string;
    from?: string;
    blockId?: string;
    comment?: string;
    blockHeight?: number;
  }>,
  connection: {
    api: {
      rpc: {
        chain: {
          getHeader: vi.fn(),
        },
      },
    },
  },
}));

vi.mock('@tests/stubs/walletRuntime', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    vuex: {
      WalletModules: [],
    },
  });
});

const loadingRef = ref(false);

vi.mock('@/composables/useLoading', () => ({
  useLoading: () => {
    const run = async <T>(handler: () => T | Promise<T>) => await handler();
    return {
      loading: loadingRef,
      withLoading: run,
      withApi: run,
      withChainApi: run,
      withParentLoading: run,
    };
  },
}));

vi.mock('@/composables/useInternalConnect', () => ({
  useInternalConnect: () => {
    const soraAddress = ref('alice');
    soraAddressRefs.push(soraAddress);

    return {
      soraAddress,
      isLoggedIn: loggedInRef,
      isSoraAccountDialogVisible: accountDialogVisibleRef,
      connectSoraWallet: connectWalletMock,
    };
  },
}));

vi.mock('@/composables/useFormattedAmount', () => ({
  useFormattedAmount: () => ({
    getFPNumber: (value: string | number) => new FPNumber(value),
    getFiatAmountByString: vi.fn(),
  }),
}));

vi.mock('@/indexer/queries/burnXor', () => ({
  fetchData: (...args: unknown[]) => fetchBurnDataMock(...(args as Parameters<typeof fetchBurnDataMock>)),
  isExcludedXorBurnAddress: (address: string) => address === 'cnRus2m2Rn776v88H5RUtyiaXtr3daN6ePn6yenLKepx1SqYo',
}));

vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api: walletApiMock,
}));

vi.mock('@/utils', () => ({
  waitForSoraNetworkFromEnv: () => waitForNetworkMock(),
}));

const settingsStoreMock = vi.hoisted(() => ({
  blockNumber: 25_900_000,
  soraNetwork: 'Prod',
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => settingsStoreMock,
}));

describe('Burn.vue', () => {
  const intervalSpy = vi.spyOn(global, 'setInterval').mockImplementation((handler: TimerHandler) => {
    if (typeof handler === 'function') handler();
    return 1 as unknown as number;
  });
  const clearIntervalSpy = vi.spyOn(global, 'clearInterval').mockImplementation(() => {});
  const baseStubs = {
    BurnDialog: {
      props: ['initialNexusRecipient'],
      template: '<div class="burn-dialog-stub" :data-recipient="initialNexusRecipient" />',
    },
    TonswapBurnCampaign: { template: '<div class="tonswap-campaign-stub" />' },
    PublicBurnActivity: { template: '<div data-testid="public-burn-activity" />' },
    SoraNexusAccountGenerator: { name: 'SoraNexusAccountGenerator', template: '<div class="nexus-generator-stub" />' },
    BurnLogoFire: { props: ['variant'], template: '<div class="fire-stub" :data-variant="variant" />' },
    GenericPageHeader: { template: '<div><slot /></div>' },
    ExternalLink: { template: '<a><slot /></a>' },
    InfoLine: {
      props: ['label', 'value', 'assetSymbol'],
      template:
        '<div class="info-line-stub"><span class="label">{{ label }}</span><span class="value">{{ value }}</span><span class="asset">{{ assetSymbol }}</span></div>',
    },
    's-button': {
      props: ['icon', 'tooltip'],
      template: '<button :data-icon="icon" :title="tooltip"><slot /></button>',
    },
    's-form': { template: '<form><slot /></form>' },
    's-row': { template: '<div><slot /></div>' },
    's-col': { template: '<div><slot /></div>' },
    's-card': { template: '<div><slot /></div>' },
  };

  beforeEach(async () => {
    capabilityFixture.allowed = true;
    await setI18nLocale(Language.EN);
    loggedInRef.value = true;
    accountDialogVisibleRef.value = false;
    connectWalletMock.mockReset();
    settingsStoreMock.blockNumber = 25_900_000;
    settingsStoreMock.soraNetwork = 'Prod';
    loadingRef.value = false;
    fetchBurnDataMock.mockResolvedValue([]);
    waitForNetworkMock.mockResolvedValue('prod');
    soraAddressRefs.length = 0;
    walletApiMock.historyList.length = 0;
    walletApiMock.connection.api.rpc.chain.getHeader.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders SOLSWAP beside the independent TONSWAP campaign and opens its burn dialog', async () => {
    const wrapper = mount(BurnPage, {
      global: {
        stubs: {
          ...baseStubs,
          's-input': { template: '<input />' },
          's-icon': { template: '<i />' },
          's-button-group': { template: '<div><slot /></div>' },
        },
      },
    });

    await flushPromises();

    const vm = wrapper.vm as unknown as Record<string, any>;
    const burnLogo = wrapper.find('.campaign-fire[data-variant="sora"]');

    expect(vm.campaigns).toHaveLength(1);
    expect(vm.campaigns[0].id).toBe('solswap');
    expect(vm.campaigns[0].link).toBe('https://t.me/solswap_io');
    expect(burnLogo.exists()).toBe(true);
    expect(wrapper.findAll('.campaign-fire')).toHaveLength(1);
    expect(wrapper.find('.tonswap-campaign-stub').exists()).toBe(true);
    const campaignColumns = wrapper.findAll('.burn-column');
    expect(campaignColumns[0]!.find('.nexus-generator-stub').exists()).toBe(false);
    expect(campaignColumns[1]!.find('.nexus-generator-stub').exists()).toBe(true);

    vm.handleBurnClick('solswap');

    expect(vm.burnDialogVisible).toBe(true);
    expect(vm.selectedReceivedAsset.symbol).toBe('SS');
    expect(vm.selectedRate).toBe('0.02');
    expect(vm.selectedMax).toBe(100_000_000);
    expect(vm.selectedMin).toBe(1);
    expect(vm.selectedRequiresNexusRecipient).toBe(true);
  });

  it('leads with the TONSWAP campaign in a wide layout and keeps SOLSWAP as a second full card', async () => {
    const wrapper = mount(BurnPage, { global: { stubs: baseStubs } });
    await flushPromises();

    const columns = wrapper.findAll('.burn-column');
    expect(columns).toHaveLength(2);
    expect(columns[0]!.classes()).toContain('burn-column--featured');
    expect(columns[0]!.get('.tonswap-campaign-stub').classes()).toContain('container--featured');
    expect(columns[1]!.classes()).not.toContain('burn-column--featured');
    expect(columns[1]!.get('form').classes()).toEqual(expect.arrayContaining(['container--campaign', 'campaign']));
    expect(wrapper.find('.burn-info').exists()).toBe(true);
  });

  it('orders the page as burn form, public totals, second campaign and a short disclaimer', async () => {
    const wrapper = mount(BurnPage, { global: { stubs: baseStubs } });
    await flushPromises();

    const grid = wrapper.get('.burn-grid');
    expect([...grid.element.children].map((child) => child.className.split(' ')[0])).toEqual([
      'burn-column',
      'burn-activity',
      'burn-column',
    ]);
    // The recent interval and the campaign history stay two separate tables.
    const activity = wrapper.get('.burn-activity').findAll('[data-testid="public-burn-activity"]');
    expect(activity).toHaveLength(2);
    const disclaimer = wrapper.get('.burn-info');
    expect(disclaimer.element.tagName).toBe('P');
    expect(disclaimer.text()).toContain('community-proposed initiative');
    expect(grid.element.compareDocumentPosition(disclaimer.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    settingsStoreMock.soraNetwork = 'Test';
    const testnet = mount(BurnPage, { global: { stubs: baseStubs } });
    await flushPromises();
    expect(testnet.find('.burn-activity').exists()).toBe(false);
  });

  it('keeps the second campaign readable while its totals load instead of covering it', async () => {
    loadingRef.value = true;
    const wrapper = mount(BurnPage, { global: { stubs: baseStubs } });
    await flushPromises();

    const card = wrapper.get('form.campaign');
    expect(card.classes()).toContain('campaign--loading');
    expect(card.attributes('aria-busy')).toBe('true');
    // The campaign terms stay on screen under the loading line.
    expect(card.text()).toContain('Burn XOR to reserve SS');
    expect(card.find('.reward-tiers').exists()).toBe(true);

    loadingRef.value = false;
    await nextTick();
    expect(card.classes()).not.toContain('campaign--loading');
    expect(card.attributes('aria-busy')).toBe('false');
  });

  it('says so in the card when reward totals are unavailable, and shows them when they are verified', async () => {
    capabilityFixture.allowed = false;
    const unavailable = mount(BurnPage, { global: { stubs: baseStubs } });
    await flushPromises();
    const note = unavailable.get('form.campaign [data-testid="burn-statistics-unavailable"]');
    expect(note.attributes('role')).toBe('status');
    expect(note.text()).toBe('Reward allocations and estimates are unavailable until campaign history is verified.');
    expect(unavailable.find('.campaign__account').exists()).toBe(false);
    unavailable.unmount();

    capabilityFixture.allowed = true;
    const available = mount(BurnPage, { global: { stubs: baseStubs } });
    await flushPromises();
    expect(available.find('[data-testid="burn-statistics-unavailable"]').exists()).toBe(false);
    expect(available.find('.campaign__account').exists()).toBe(true);
  });

  it('folds the SORA Nexus address tool away while the campaign runs and shows it plainly once ended', async () => {
    const running = mount(BurnPage, { global: { stubs: baseStubs } });
    await flushPromises();
    const tool = running.get('details.campaign__nexus');
    expect(tool.attributes('open')).toBeUndefined();
    expect(tool.get('summary').text()).toBe('Create a SORA Nexus address for SOLSWAP');
    // A bare boolean attribute reaches the stub as an empty string, which means true.
    expect(tool.get('.nexus-generator-stub').attributes('burn-available')).toBe('');
    running.unmount();

    settingsStoreMock.blockNumber = 61_000_000;
    const ended = mount(BurnPage, { global: { stubs: baseStubs } });
    await flushPromises();
    expect(ended.find('details.campaign__nexus').exists()).toBe(false);
    expect(ended.findAll('.nexus-generator-stub')).toHaveLength(1);
    expect(ended.get('.nexus-generator-stub').attributes('burn-available')).toBe('false');
  });

  it('tells the user a burn was sent only after signing, and forgets it when the account changes', async () => {
    const wrapper = mount(BurnPage, { global: { stubs: baseStubs } });
    await flushPromises();
    const vm = wrapper.vm as unknown as Record<string, any>;
    expect(wrapper.find('[data-testid="burn-sent"]').exists()).toBe(false);

    vm.handleBurnClick('solswap');
    // The dialog first reports that signing started; nothing was sent yet.
    vm.handleBurnConfirm();
    await nextTick();
    expect(wrapper.find('[data-testid="burn-sent"]').exists()).toBe(false);

    vm.handleBurnConfirm(true);
    await nextTick();
    const sent = wrapper.get('[data-testid="burn-sent"]');
    expect(sent.attributes('role')).toBe('status');
    expect(sent.text()).toBe('Burn sent. Your totals update when the block is final.');
    expect(vm.burnSent.solswap).toBe(true);

    soraAddressRefs.at(-1)!.value = 'bob';
    await flushPromises();
    expect(wrapper.find('[data-testid="burn-sent"]').exists()).toBe(false);
  });

  it('marks an ended campaign card as disabled', async () => {
    settingsStoreMock.blockNumber = 61_000_000;
    const wrapper = mount(BurnPage, { global: { stubs: baseStubs } });
    await flushPromises();

    expect(wrapper.get('form.campaign').classes()).toContain('disabled');
  });

  it('uses a verified generator address only for the selected SOLSWAP burn', async () => {
    const wrapper = mount(BurnPage, { global: { stubs: baseStubs } });
    await flushPromises();

    wrapper.findComponent({ name: 'SoraNexusAccountGenerator' }).vm.$emit('useAddress', validSoraNexusAccount);
    await nextTick();

    const vm = wrapper.vm as unknown as Record<string, any>;
    expect(vm.burnDialogVisible).toBe(true);
    expect(wrapper.find('.burn-dialog-stub').attributes('data-recipient')).toBe(validSoraNexusAccount);

    vm.handleBurnClick('solswap');
    await nextTick();
    expect(wrapper.find('.burn-dialog-stub').attributes('data-recipient')).toBe('');
  });

  it('resumes a generated SOLSWAP burn after wallet connection completes', async () => {
    loggedInRef.value = false;
    connectWalletMock.mockImplementation(() => {
      accountDialogVisibleRef.value = true;
      return Promise.resolve();
    });

    const wrapper = mount(BurnPage, { global: { stubs: baseStubs } });
    await flushPromises();
    const vm = wrapper.vm as unknown as Record<string, any>;

    wrapper.findComponent({ name: 'SoraNexusAccountGenerator' }).vm.$emit('useAddress', validSoraNexusAccount);
    await nextTick();
    expect(connectWalletMock).toHaveBeenCalledTimes(1);
    expect(vm.burnDialogVisible).toBe(false);

    loggedInRef.value = true;
    await nextTick();
    expect(vm.burnDialogVisible).toBe(false);

    accountDialogVisibleRef.value = false;
    await nextTick();
    expect(vm.burnDialogVisible).toBe(true);
    expect(wrapper.find('.burn-dialog-stub').attributes('data-recipient')).toBe(validSoraNexusAccount);
  });

  it('forgets a pending generated recipient when wallet connection is cancelled', async () => {
    loggedInRef.value = false;
    connectWalletMock.mockImplementation(() => {
      accountDialogVisibleRef.value = true;
      return Promise.resolve();
    });

    const wrapper = mount(BurnPage, { global: { stubs: baseStubs } });
    await flushPromises();
    const vm = wrapper.vm as unknown as Record<string, any>;

    wrapper.findComponent({ name: 'SoraNexusAccountGenerator' }).vm.$emit('useAddress', validSoraNexusAccount);
    await nextTick();
    accountDialogVisibleRef.value = false;
    await nextTick();

    expect(vm.burnDialogVisible).toBe(false);
    loggedInRef.value = true;
    await nextTick();
    expect(vm.burnDialogVisible).toBe(false);
    expect(wrapper.find('.burn-dialog-stub').attributes('data-recipient')).toBe('');
  });

  it('forgets a pending generated recipient when wallet connection fails before opening', async () => {
    loggedInRef.value = false;
    connectWalletMock.mockRejectedValueOnce(new Error('Wallet connection unavailable'));

    const wrapper = mount(BurnPage, { global: { stubs: baseStubs } });
    await flushPromises();

    wrapper.findComponent({ name: 'SoraNexusAccountGenerator' }).vm.$emit('useAddress', validSoraNexusAccount);
    await flushPromises();

    loggedInRef.value = true;
    await nextTick();
    expect((wrapper.vm as unknown as Record<string, any>).burnDialogVisible).toBe(false);
    expect(wrapper.find('.burn-dialog-stub').attributes('data-recipient')).toBe('');
  });

  it('ignores an invalid generated recipient before opening the burn or wallet connection', async () => {
    loggedInRef.value = false;
    const wrapper = mount(BurnPage, { global: { stubs: baseStubs } });
    await flushPromises();

    wrapper.findComponent({ name: 'SoraNexusAccountGenerator' }).vm.$emit('useAddress', 'not-a-nexus-address');
    await nextTick();

    expect(connectWalletMock).not.toHaveBeenCalled();
    expect((wrapper.vm as unknown as Record<string, any>).burnDialogVisible).toBe(false);
    expect(wrapper.find('.burn-dialog-stub').attributes('data-recipient')).toBe('');
  });

  it('marks campaigns as ended when block height exceeds range', async () => {
    settingsStoreMock.blockNumber = 61_000_000;

    const wrapper = mount(BurnPage, {
      global: {
        stubs: {
          ...baseStubs,
          's-input': { template: '<input />' },
          's-icon': { template: '<i />' },
        },
      },
    });

    await flushPromises();

    const vm = wrapper.vm as unknown as Record<string, any>;

    expect(vm.ended.solswap).toBe(true);
    expect(vm.timeLeftFormatted.solswap).toBe('0D 0H 0M');

    wrapper.findComponent({ name: 'SoraNexusAccountGenerator' }).vm.$emit('useAddress', validSoraNexusAccount);
    await nextTick();
    expect(vm.burnDialogVisible).toBe(false);

    wrapper.unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('sets loading after burn confirmation', async () => {
    const wrapper = mount(BurnPage, {
      global: {
        stubs: {
          ...baseStubs,
        },
      },
    });

    await flushPromises();

    const vm = wrapper.vm as unknown as Record<string, any>;

    expect(loadingRef.value).toBe(false);
    vm.handleBurnConfirm(true);
    expect(loadingRef.value).toBe(true);

    wrapper.unmount();
  });

  it('aggregates burned amounts for qualifying accounts', async () => {
    const amount = new FPNumber(2);

    fetchBurnDataMock.mockResolvedValue([
      { blockHeight: 25_100_000, amount, address: 'alice', txHash: '0xlegacyalice' },
      {
        blockHeight: 25_900_000,
        amount,
        address: 'alice',
        nexusRecipient: validSoraNexusAccount,
        txHash: '0xnexusalice',
      },
      { blockHeight: 25_900_000, amount, address: 'bob', txHash: '0xnexusbob' },
    ]);

    const wrapper = mount(BurnPage, {
      global: {
        stubs: {
          ...baseStubs,
        },
      },
    });

    await flushPromises();

    const vm = wrapper.vm as unknown as Record<string, any>;

    expect(vm.totalXorBurned.solswap.toString()).toBe('6');
    expect(vm.accountXorBurned.solswap.toString()).toBe('4');
    expect(vm.totalReserved.solswap.toString()).toBe('400');
    expect(vm.accountReserved.solswap.toString()).toBe('300');
    expect(vm.totalNexusReserved.solswap.toString()).toBe('2');
    expect(vm.accountNexusReserved.solswap.toString()).toBe('2');
    expect(vm.accountClaimRows.solswap).toEqual([
      expect.objectContaining({
        blockHeight: 25_900_000,
        burned: '2',
        ssReserved: '100',
        nexusReserved: '2',
        txHash: '0xnexusalice',
      }),
      expect.objectContaining({
        blockHeight: 25_100_000,
        burned: '2',
        ssReserved: '200',
        nexusReserved: '0',
        txHash: '0xlegacyalice',
      }),
    ]);
  });

  it('queries the full indexed campaign range when the chain block is not ready', async () => {
    settingsStoreMock.blockNumber = 0;
    fetchBurnDataMock.mockResolvedValue([
      {
        blockHeight: 25_900_000,
        amount: new FPNumber(10),
        address: 'alice',
        nexusRecipient: validSoraNexusAccount,
        txHash: '0xindexedburn',
      },
    ]);

    const wrapper = mount(BurnPage, {
      global: {
        stubs: {
          ...baseStubs,
        },
      },
    });

    await flushPromises();

    const vm = wrapper.vm as unknown as Record<string, any>;

    expect(fetchBurnDataMock).toHaveBeenCalledWith(25_043_003, 60_000_000, undefined, {});
    expect(fetchBurnDataMock).toHaveBeenCalledWith(25_043_003, 60_000_000, 'alice', {});
    expect(vm.totalXorBurned.solswap.toString()).toBe('10');
    expect(vm.accountXorBurned.solswap.toString()).toBe('10');
    expect(vm.totalReserved.solswap.toString()).toBe('500');
    expect(vm.totalNexusReserved.solswap.toString()).toBe('10');
  });

  it('keeps the burn form loading while statistics are being fetched', async () => {
    loadingRef.value = true;

    const wrapper = mount(BurnPage, {
      global: {
        stubs: {
          ...baseStubs,
        },
      },
    });

    const vm = wrapper.vm as unknown as Record<string, any>;

    expect(vm.isBurnFormLoading).toBe(true);

    loadingRef.value = false;
    await nextTick();

    expect(vm.isBurnFormLoading).toBe(false);
  });

  it('withholds all claim estimates when either required burn snapshot fails', async () => {
    const exampleHash = '0x5ac60114e1cd80551915531094bb38ebb40a90885122c32baf5c0614ebb02957';

    fetchBurnDataMock.mockImplementation((_start: number, _end: number, account?: string) => {
      if (account) {
        return Promise.resolve([
          {
            blockHeight: 25_868_450,
            amount: new FPNumber(10),
            address: 'alice',
            nexusRecipient: validSoraNexusAccount,
            txHash: exampleHash,
          },
        ]);
      }

      return Promise.reject(new Error('WebSocket is not connected'));
    });

    const wrapper = mount(BurnPage, {
      global: {
        stubs: {
          ...baseStubs,
        },
      },
    });

    await flushPromises();

    const vm = wrapper.vm as unknown as Record<string, any>;

    expect(vm.accountClaimRows.solswap).toEqual([]);
    expect(wrapper.find('[data-testid="burn-statistics-unavailable"]').exists()).toBe(true);
    expect(wrapper.find('.campaign__account').exists()).toBe(false);
    expect(wrapper.find('.info-card-container').exists()).toBe(false);
  });

  it('renders Minamoto claim rows with SORA tx hashes and copy icons', async () => {
    const exampleHash = '0x5ac60114e1cd80551915531094bb38ebb40a90885122c32baf5c0614ebb02957';

    fetchBurnDataMock.mockResolvedValue([
      {
        blockHeight: 25_900_000,
        amount: new FPNumber(10),
        address: 'alice',
        nexusRecipient: validSoraNexusAccount,
        txHash: exampleHash,
      },
    ]);

    const wrapper = mount(BurnPage, {
      global: {
        stubs: {
          ...baseStubs,
        },
      },
    });

    await flushPromises();

    const text = wrapper.text();
    const copyButton = wrapper.find('.claim-row__copy');

    expect(text).toContain('Your Minamoto claim details');
    expect(text).toContain('Use the SORA Network tx hash for your claim on SORA Minamoto');
    expect(text).toContain('10 XOR burned');
    expect(text).toContain('500');
    expect(text).toContain('SS tokens');
    expect(text).toContain('SORA Nexus XOR');
    expect(text).toContain(exampleHash);
    expect(copyButton.exists()).toBe(true);
    expect(copyButton.attributes('data-icon')).toBe('basic-copy-24');
  });

  it('shows a freshly submitted local burn before the indexer returns it', async () => {
    const exampleHash = '0x5ac60114e1cd80551915531094bb38ebb40a90885122c32baf5c0614ebb02957';

    fetchBurnDataMock.mockResolvedValue([]);
    walletApiMock.historyList.push({
      id: exampleHash,
      txId: exampleHash,
      type: Operation.Burn,
      amount: '10',
      assetAddress: XOR.address,
      comment: createSoraNexusXorBurnRemark(validSoraNexusAccount),
      from: 'alice',
    });

    const wrapper = mount(BurnPage, {
      global: {
        stubs: {
          ...baseStubs,
        },
      },
    });

    await flushPromises();

    const vm = wrapper.vm as unknown as Record<string, any>;
    const text = wrapper.text();

    expect(vm.totalXorBurned.solswap.toString()).toBe('0');
    expect(vm.accountXorBurned.solswap.toString()).toBe('10');
    expect(vm.totalReserved.solswap.toString()).toBe('0');
    expect(vm.accountReserved.solswap.toString()).toBe('500');
    expect(vm.totalNexusReserved.solswap.toString()).toBe('0');
    expect(vm.accountNexusReserved.solswap.toString()).toBe('10');
    expect(vm.accountClaimRows.solswap).toEqual([
      expect.objectContaining({
        blockHeight: null,
        burned: '10',
        ssReserved: '500',
        nexusReserved: '10',
        txHash: exampleHash,
      }),
    ]);
    expect(text).toContain('Transaction was submitted');
    expect(text).toContain(exampleHash);
  });

  it('does not reserve SORA Nexus XOR for plain burns without a Nexus recipient remark', async () => {
    fetchBurnDataMock.mockResolvedValue([
      {
        blockHeight: 25_900_000,
        amount: new FPNumber(10),
        address: 'alice',
        txHash: '0xplainburn',
      },
    ]);

    const wrapper = mount(BurnPage, {
      global: {
        stubs: {
          ...baseStubs,
        },
      },
    });

    await flushPromises();

    const vm = wrapper.vm as unknown as Record<string, any>;

    expect(vm.totalXorBurned.solswap.toString()).toBe('10');
    expect(vm.totalReserved.solswap.toString()).toBe('500');
    expect(vm.totalNexusReserved.solswap.toString()).toBe('0');
    expect(vm.accountNexusReserved.solswap.toString()).toBe('0');
    expect(vm.accountClaimRows.solswap).toEqual([
      expect.objectContaining({
        burned: '10',
        ssReserved: '500',
        nexusReserved: '0',
        txHash: '0xplainburn',
      }),
    ]);
  });

  it('renders burn amounts without trailing decimal zeros', async () => {
    const wrapper = mount(BurnPage, {
      global: {
        stubs: {
          ...baseStubs,
          InfoLine: {
            props: ['label', 'value', 'assetSymbol'],
            template:
              '<div class="info-line-stub"><span class="label">{{ label }}</span><span class="value">{{ value }}</span><span class="asset">{{ assetSymbol }}</span></div>',
          },
        },
      },
    });

    await flushPromises();

    const text = wrapper.text();

    expect(text).toContain('0.02');
    expect(text).toContain('From block 25,867,650');
    expect(text).toContain('1 SORA Nexus XOR and 50 SS tokens per 1 XOR burned');
    expect(text).toContain('Blocks 25,043,003-25,867,649');
    expect(text).toContain('0 SORA Nexus XOR and 100 SS tokens per 1 XOR burned');
    expect(text).toContain('TOTAL SORA NEXUS XOR RESERVED');
    expect(text).toContain('SORA Nexus XOR');
    expect(text).not.toContain('Time left');
    expect(text).not.toContain('Reserve KARMA');
    expect(text).not.toContain('Reserve KEN');
    expect(text).not.toContain('0.0 XOR');
  });

  it('keeps the latest account statistics when the previous account resolves last', async () => {
    let resolvePreviousBurns!: (burns: BurnForStats[]) => void;
    let resolveCurrentBurns!: (burns: BurnForStats[]) => void;
    const previousBurns = new Promise<BurnForStats[]>((resolve) => {
      resolvePreviousBurns = resolve;
    });
    const currentBurns = new Promise<BurnForStats[]>((resolve) => {
      resolveCurrentBurns = resolve;
    });

    intervalSpy.mockImplementationOnce(() => 1 as unknown as number);
    fetchBurnDataMock.mockImplementation((_start: number, _end: number, account?: string) => {
      const requestAddress = account || soraAddressRefs.at(-1)?.value;

      return requestAddress === 'bob' ? currentBurns : previousBurns;
    });

    const wrapper = mount(BurnPage, {
      global: {
        stubs: {
          ...baseStubs,
        },
      },
    });

    await vi.waitFor(() => expect(fetchBurnDataMock).toHaveBeenCalledTimes(2));

    const soraAddress = soraAddressRefs.at(-1);
    expect(soraAddress).toBeDefined();
    if (!soraAddress) throw new Error('Burn page account ref was not created');

    soraAddress.value = 'bob';
    await nextTick();
    await vi.waitFor(() => expect(fetchBurnDataMock).toHaveBeenCalledTimes(4));

    resolveCurrentBurns([
      {
        blockHeight: 25_900_000,
        amount: new FPNumber(20),
        address: 'bob',
        txHash: '0xbob',
      },
    ]);
    await flushPromises();

    const vm = wrapper.vm as unknown as Record<string, any>;
    expect(vm.totalXorBurned.solswap.toString()).toBe('20');
    expect(vm.accountXorBurned.solswap.toString()).toBe('20');

    resolvePreviousBurns([
      {
        blockHeight: 25_900_000,
        amount: new FPNumber(10),
        address: 'alice',
        txHash: '0xalice',
      },
    ]);
    await flushPromises();

    expect(vm.totalXorBurned.solswap.toString()).toBe('20');
    expect(vm.accountXorBurned.solswap.toString()).toBe('20');

    wrapper.unmount();
  });

  it('does not commit an in-flight statistics request or install its interval after unmount', async () => {
    let resolveBurns!: (burns: BurnForStats[]) => void;
    const burns = new Promise<BurnForStats[]>((resolve) => {
      resolveBurns = resolve;
    });
    fetchBurnDataMock.mockReturnValue(burns);
    intervalSpy.mockClear();

    const wrapper = mount(BurnPage, {
      global: {
        stubs: {
          ...baseStubs,
        },
      },
    });

    await vi.waitFor(() => expect(fetchBurnDataMock).toHaveBeenCalledTimes(2));

    const vm = wrapper.vm as unknown as Record<string, any>;
    const totalXorBurned = vm.totalXorBurned;
    const accountXorBurned = vm.accountXorBurned;
    wrapper.unmount();

    resolveBurns([
      {
        blockHeight: 25_900_000,
        amount: new FPNumber(10),
        address: 'alice',
        txHash: '0xlate',
      },
    ]);
    await flushPromises();

    expect(totalXorBurned.solswap.toString()).toBe('0');
    expect(accountXorBurned.solswap.toString()).toBe('0');
    expect(intervalSpy).not.toHaveBeenCalled();
  });
  it('denies capability before raw header RPC, local history, indexer reads and claims', async () => {
    capabilityFixture.allowed = false;
    settingsStoreMock.blockNumber = 0;
    walletApiMock.historyList.push({
      type: Operation.Burn,
      amount: '1000000',
      from: 'alice',
      assetAddress: XOR.address,
      blockHeight: 25_900_000,
    });
    const wrapper = mount(BurnPage, { global: { stubs: baseStubs } });
    await flushPromises();
    expect(walletApiMock.connection.api.rpc.chain.getHeader).not.toHaveBeenCalled();
    expect(fetchBurnDataMock).not.toHaveBeenCalled();
    expect((wrapper.vm as any).accountClaimRows.solswap).toEqual([]);
    expect(wrapper.find('.campaign__account').exists()).toBe(false);
    expect(wrapper.find('[data-testid="burn-statistics-unavailable"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it('clears prior claims and global totals when a later capability is denied', async () => {
    fetchBurnDataMock.mockResolvedValue([
      {
        blockHeight: 25_900_000,
        amount: new FPNumber(10),
        address: 'alice',
        nexusRecipient: validSoraNexusAccount,
        txHash: '0xprior',
      },
    ]);
    const wrapper = mount(BurnPage, { global: { stubs: baseStubs } });
    await flushPromises();
    expect((wrapper.vm as any).accountClaimRows.solswap).not.toEqual([]);
    capabilityFixture.allowed = false;
    fetchBurnDataMock.mockClear();
    (wrapper.vm as any).handleBurnConfirm(true);
    await flushPromises();
    expect(fetchBurnDataMock).not.toHaveBeenCalled();
    expect((wrapper.vm as any).accountClaimRows.solswap).toEqual([]);
    expect((wrapper.vm as any).totalReserved.solswap.toString()).toBe('0');
    expect(wrapper.find('.info-card-container').exists()).toBe(false);
    wrapper.unmount();
  });

  it('rejects capability revoked while the two burn queries are in flight', async () => {
    fetchBurnDataMock.mockImplementation(async () => {
      capabilityFixture.allowed = false;
      return [{ blockHeight: 25_900_000, amount: new FPNumber(10), address: 'alice', txHash: '0xlate' }];
    });
    const wrapper = mount(BurnPage, { global: { stubs: baseStubs } });
    await flushPromises();
    expect((wrapper.vm as any).accountClaimRows.solswap).toEqual([]);
    expect(wrapper.find('.campaign__account').exists()).toBe(false);
    expect(wrapper.find('[data-testid="burn-statistics-unavailable"]').exists()).toBe(true);
    wrapper.unmount();
  });
});

const capabilityFixture = vi.hoisted(() => ({ allowed: true, calls: vi.fn() }));
vi.mock('@/indexer/queries/capabilities', async () => {
  const { allowedLegacyCapabilities } = await import('@tests/fixtures/entitlementCapabilities');
  return {
    requireEntitlements: async (indexer = {}) => {
      capabilityFixture.calls();
      if (!capabilityFixture.allowed) throw Error('uncertified');
      return { indexer, capabilities: allowedLegacyCapabilities };
    },
  };
});
