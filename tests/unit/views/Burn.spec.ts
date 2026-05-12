import { mount, flushPromises } from '@vue/test-utils';
import { ref } from 'vue';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import BurnPage from '@/features/misc/pages/BurnPage.vue';
import { Language } from '@/consts/language';
import { setI18nLocale } from '@/lang';
import { FPNumber, Operation } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { createSoraNexusXorBurnRemark } from '@/utils/soraNexusAccount';

const validSoraNexusAccount = 'sorauﾛ1NﾗhBUd2BﾂｦﾄiﾔﾆﾂﾇKSﾃaﾘﾒﾓQﾗrﾒoﾘﾅnｳﾘbQｳQJﾆLJ5HSE';

const connectWalletMock = vi.fn();
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
  useInternalConnect: () => ({
    soraAddress: ref('alice'),
    isLoggedIn: ref(true),
    connectSoraWallet: connectWalletMock,
  }),
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
    BurnDialog: { template: '<div />' },
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
    await setI18nLocale(Language.EN);
    settingsStoreMock.blockNumber = 25_900_000;
    settingsStoreMock.soraNetwork = 'Prod';
    loadingRef.value = false;
    fetchBurnDataMock.mockResolvedValue([]);
    waitForNetworkMock.mockResolvedValue('prod');
    walletApiMock.historyList.length = 0;
    walletApiMock.connection.api.rpc.chain.getHeader.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders only SOLSWAP campaign and opens its burn dialog', async () => {
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
    const burnLogo = wrapper.find('img.campaign-logo[alt="SOLSWAP logo"]');

    expect(vm.campaigns).toHaveLength(1);
    expect(vm.campaigns[0].id).toBe('solswap');
    expect(vm.campaigns[0].link).toBe('https://t.me/solswap_io');
    expect(burnLogo.exists()).toBe(true);
    expect(wrapper.findAll('img.campaign-logo')).toHaveLength(1);

    vm.handleBurnClick('solswap');

    expect(vm.burnDialogVisible).toBe(true);
    expect(vm.selectedReceivedAsset.symbol).toBe('SS');
    expect(vm.selectedRate).toBe('0.02');
    expect(vm.selectedMax).toBe(100_000_000);
    expect(vm.selectedMin).toBe(1);
    expect(vm.selectedRequiresNexusRecipient).toBe(true);
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

  it('keeps account-specific burn totals separate when the global burn fetch is not ready yet', async () => {
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

    expect(vm.totalXorBurned.solswap.toString()).toBe('0');
    expect(vm.accountXorBurned.solswap.toString()).toBe('10');
    expect(vm.totalReserved.solswap.toString()).toBe('0');
    expect(vm.accountReserved.solswap.toString()).toBe('500');
    expect(vm.totalNexusReserved.solswap.toString()).toBe('0');
    expect(vm.accountNexusReserved.solswap.toString()).toBe('10');
    expect(vm.accountClaimRows.solswap).toEqual([
      expect.objectContaining({
        blockHeight: 25_868_450,
        burned: '10',
        ssReserved: '500',
        nexusReserved: '10',
        txHash: exampleHash,
      }),
    ]);
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
});
