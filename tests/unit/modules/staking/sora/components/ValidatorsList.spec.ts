import { flushPromises, mount } from '@vue/test-utils';
import { computed, defineComponent, h, ref } from 'vue';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { ValidatorsListMode } from '@/modules/staking/sora/consts';
import type { ValidatorInfoFull } from '@sora-substrate/sdk/build/staking/types';

type Validator = {
  address: string;
  commission: string;
  apy: string;
  stake?: {
    total: string;
    own: string;
  };
  blocked?: boolean;
  isOversubscribed?: boolean;
  identity?: {
    info: {
      display?: string;
      image?: string;
    };
  };
};

const createValidator = (address: string, extra: Partial<Validator> = {}): Validator => ({
  address,
  commission: '100000000',
  apy: '12',
  ...extra,
});

const tMock = vi.fn((key: string) => key);

const validatorsRef = ref<Validator[]>([]);
const stakingAssetRef = ref({ symbol: 'XOR', decimals: 18 });
const validatorsFilterRef = ref({
  hasIdentity: false,
  notSlashed: false,
  notOversubscribed: false,
  twoValidatorsPerIdentity: false,
});
const maxNominationsRef = ref<number | null>(null);
const stakingInfoRef = ref<{ myValidators: string[] } | null>({ myValidators: [] });
const setShowFiltersMock = vi.fn();
const setValidatorsFilterMock = vi.fn();

vi.mock('@tests/stubs/walletRuntime', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    components: {
      FormattedAddress: defineComponent({
        name: 'FormattedAddressStub',
        props: {
          value: { type: String, required: true },
        },
        setup(props) {
          return () => h('span', { class: 'formatted-address-stub' }, props.value);
        },
      }),
    },
  });
});

vi.mock('@/modules/staking/sora/components/ValidatorAvatar.vue', () => ({
  __esModule: true,
  default: defineComponent({
    name: 'ValidatorAvatarStub',
    props: {
      validator: { type: Object, required: true },
    },
    setup(props, { slots }) {
      return () =>
        h(
          'div',
          { class: 'validator-avatar-stub', 'data-address': (props.validator as Validator).address },
          slots.icon?.()
        );
    },
  }),
}));

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n');

  return {
    __esModule: true,
    ...actual,
    useI18n: () => ({
      t: tMock,
    }),
  };
});

vi.mock('@/modules/staking/sora/composables/useSoraStaking', () => ({
  __esModule: true,
  useSoraStaking: () => ({
    validators: computed(() => validatorsRef.value),
    validatorsFilter: computed(() => validatorsFilterRef.value),
    setShowValidatorsFilterDialog: setShowFiltersMock,
    setValidatorsFilter: setValidatorsFilterMock,
    maxNominations: computed(() => maxNominationsRef.value),
    stakingInfo: computed(() => stakingInfoRef.value),
    stakingAsset: computed(() => stakingAssetRef.value),
  }),
}));

vi.mock('@/modules/staking/sora/composables/useValidatorsFormatting', () => ({
  __esModule: true,
  useValidatorsFormatting: () => ({
    formatName: (validator: Validator) => validator.identity?.info?.display ?? validator.address,
    decodeName: (validator: Validator) => validator.identity?.info?.display ?? validator.address,
    formatCommission: (value: string) => value,
    formatReturn: (value: string) => value,
    formatStake: (value: string | null | undefined, _decimals = 18, symbol = 'XOR') => {
      const values: Record<string, string> = {
        '1000000000000000000': `1 ${symbol}`,
        '2500000000000000000': `2.5 ${symbol}`,
        '9000000000000000000': `9 ${symbol}`,
      };

      return values[value ?? ''] ?? `0 ${symbol}`;
    },
  }),
}));

import ValidatorsList from '@/modules/staking/sora/components/ValidatorsList.vue';

const globalMountOptions = {
  stubs: {
    's-scrollbar': {
      template: '<div class="scrollbar-stub"><slot /></div>',
    },
    's-button': defineComponent({
      name: 'SButtonStub',
      inheritAttrs: false,
      emits: ['click'],
      setup(_, { attrs, emit, slots }) {
        return () =>
          h(
            'button',
            {
              ...attrs,
              class: ['s-button-stub', attrs.class],
              onClick: (event: Event) => emit('click', event),
            },
            slots.default?.()
          );
      },
    }),
    SButton: defineComponent({
      name: 'SButtonStubPascal',
      inheritAttrs: false,
      emits: ['click'],
      setup(_, { attrs, emit, slots }) {
        return () =>
          h(
            'button',
            {
              ...attrs,
              class: ['s-button-stub', attrs.class],
              onClick: (event: Event) => emit('click', event),
            },
            slots.default?.()
          );
      },
    }),
    's-tooltip': {
      template: '<span class="tooltip-stub"><slot /></span>',
    },
    's-icon': {
      template: '<span class="icon-stub" />',
    },
    's-input': defineComponent({
      name: 'SInputStub',
      inheritAttrs: false,
      props: {
        modelValue: { type: String, default: '' },
      },
      emits: ['update:modelValue'],
      setup(props, { attrs, emit, slots }) {
        return () => {
          const { class: className, ...restAttrs } = attrs;

          return h('div', { ...restAttrs, class: ['input-stub', className] }, [
            h('input', {
              value: props.modelValue,
              onInput: (event: Event) => emit('update:modelValue', (event.target as HTMLInputElement).value),
            }),
            slots.suffix?.(),
            slots.right?.(),
          ]);
        };
      },
    }),
    SInput: defineComponent({
      name: 'SInputStubPascal',
      inheritAttrs: false,
      props: {
        modelValue: { type: String, default: '' },
      },
      emits: ['update:modelValue'],
      setup(props, { attrs, emit, slots }) {
        return () => {
          const { class: className, ...restAttrs } = attrs;

          return h('div', { ...restAttrs, class: ['input-stub', className] }, [
            h('input', {
              value: props.modelValue,
              onInput: (event: Event) => emit('update:modelValue', (event.target as HTMLInputElement).value),
            }),
            slots.suffix?.(),
            slots.right?.(),
          ]);
        };
      },
    }),
  },
  directives: {
    button: vi.fn(),
  },
  config: {
    compilerOptions: {
      isCustomElement: (tag: string) => ['s-icon', 's-tooltip'].includes(tag),
    },
  },
};

const mountComponent = (
  props: Partial<{ mode: ValidatorsListMode; selectedValidators: Validator[]; showSelectionControls: boolean }> = {}
) =>
  mount(ValidatorsList, {
    props: {
      mode: ValidatorsListMode.RECOMMENDED,
      selectedValidators: [],
      ...props,
    },
    global: globalMountOptions,
  });

const mountParentForMode = (mode: ValidatorsListMode = ValidatorsListMode.SELECT, showSelectionControls = false) => {
  const Parent = defineComponent({
    components: { ValidatorsList },
    setup() {
      const selected = ref<Validator[]>([]);
      const handleUpdate = (value: Validator[]) => {
        selected.value = value;
      };
      return { selected, handleUpdate };
    },
    render() {
      return h(ValidatorsList, {
        mode,
        selectedValidators: this.selected,
        showSelectionControls,
        'onUpdate:selected': this.handleUpdate,
      });
    },
  });

  return mount(Parent, { global: globalMountOptions });
};

const mountParentForSelect = () => mountParentForMode(ValidatorsListMode.SELECT);

describe('ValidatorsList.vue', () => {
  beforeAll(() => {
    Object.defineProperty(Element.prototype, 'prefix', {
      configurable: true,
      get() {
        return undefined;
      },
      set() {},
    });
  });

  beforeEach(() => {
    validatorsRef.value = [createValidator('addr-1'), createValidator('addr-2'), createValidator('addr-3')];
    stakingAssetRef.value = { symbol: 'XOR', decimals: 18 };
    validatorsFilterRef.value = {
      hasIdentity: false,
      notSlashed: false,
      notOversubscribed: false,
      twoValidatorsPerIdentity: false,
    };
    maxNominationsRef.value = 2;
    stakingInfoRef.value = { myValidators: ['addr-1'] };
    setShowFiltersMock.mockClear();
    setValidatorsFilterMock.mockClear();
    tMock.mockImplementation((key: string) => key);
  });

  it('auto-selects recommended validators and limits by max nominations', async () => {
    const wrapper = mountComponent({ mode: ValidatorsListMode.RECOMMENDED });
    await flushPromises();

    const emitted = wrapper.emitted('update:selected');
    expect(emitted).toBeTruthy();
    expect(emitted?.[0]?.[0]).toHaveLength(2);
    expect(setValidatorsFilterMock).toHaveBeenCalledWith(expect.objectContaining({ hasIdentity: false }));
  });

  it('auto-selects nothing when the chain reports zero max nominations', async () => {
    maxNominationsRef.value = 0;

    const wrapper = mountComponent({ mode: ValidatorsListMode.RECOMMENDED });
    await flushPromises();

    const emitted = wrapper.emitted('update:selected');
    expect(emitted?.[0]?.[0]).toEqual([]);
  });

  it('auto-selects nothing when the chain reports an invalid negative max nominations value', async () => {
    maxNominationsRef.value = -1;

    const wrapper = mountComponent({ mode: ValidatorsListMode.RECOMMENDED });
    await flushPromises();

    const emitted = wrapper.emitted('update:selected');
    expect(emitted?.[0]?.[0]).toEqual([]);
  });

  it('auto-selects nothing when the chain reports a non-finite max nominations value', async () => {
    maxNominationsRef.value = Number.NaN;

    const wrapper = mountComponent({ mode: ValidatorsListMode.RECOMMENDED });
    await flushPromises();

    const emitted = wrapper.emitted('update:selected');
    expect(emitted?.[0]?.[0]).toEqual([]);
  });

  it('floors fractional max nominations before recommended auto-selection', async () => {
    maxNominationsRef.value = 1.9;

    const wrapper = mountComponent({ mode: ValidatorsListMode.RECOMMENDED });
    await flushPromises();

    const emitted = wrapper.emitted('update:selected');
    expect((emitted?.[0]?.[0] as Validator[]).map((validator) => validator.address)).toEqual(['addr-1']);
  });

  it('excludes blocked and oversubscribed validators from recommended auto-selection', async () => {
    maxNominationsRef.value = null;
    validatorsRef.value = [
      createValidator('addr-blocked', { blocked: true }),
      createValidator('addr-oversubscribed', { isOversubscribed: true }),
      createValidator('addr-safe'),
    ];

    const wrapper = mountComponent({ mode: ValidatorsListMode.RECOMMENDED });
    await flushPromises();

    const emitted = wrapper.emitted('update:selected');
    expect((emitted?.[0]?.[0] as Validator[]).map((validator) => validator.address)).toEqual(['addr-safe']);
  });

  it('deduplicates validator rows by address before selecting recommended validators', async () => {
    maxNominationsRef.value = null;
    validatorsRef.value = [
      createValidator('addr-duplicate', {
        apy: '20',
        identity: { info: { display: 'First Duplicate Payload' } },
      }),
      createValidator('addr-unique', {
        apy: '10',
        identity: { info: { display: 'Unique Payload' } },
      }),
      createValidator('addr-duplicate', {
        apy: '100',
        identity: { info: { display: 'Second Duplicate Payload' } },
      }),
    ];

    const wrapper = mountComponent({ mode: ValidatorsListMode.RECOMMENDED });
    await flushPromises();

    expect(wrapper.findAll('.validator-avatar-stub').map((item) => item.attributes('data-address'))).toEqual([
      'addr-duplicate',
      'addr-unique',
    ]);
    expect(wrapper.findAll('.validator .name').map((item) => item.text())).toEqual([
      'First Duplicate Payload',
      'Unique Payload',
    ]);

    const emitted = wrapper.emitted('update:selected');
    expect((emitted?.[0]?.[0] as Validator[]).map((validator) => validator.address)).toEqual([
      'addr-duplicate',
      'addr-unique',
    ]);
  });

  it('ignores malformed validator payloads from upstream lists', async () => {
    validatorsRef.value = [
      null,
      { address: '' },
      { address: 42 },
      createValidator('addr-valid', { identity: { info: { display: 'Valid Validator' } } }),
    ] as unknown as Validator[];

    const wrapper = mountComponent({ mode: ValidatorsListMode.SELECT });
    await flushPromises();

    expect(wrapper.findAll('.validator-avatar-stub').map((item) => item.attributes('data-address'))).toEqual([
      'addr-valid',
    ]);
    expect(wrapper.findAll('.validator .name').map((item) => item.text())).toEqual(['Valid Validator']);
  });

  it('treats a non-array upstream validator payload as an empty list', async () => {
    validatorsRef.value = 'addr-1,addr-2' as unknown as Validator[];

    const wrapper = mountComponent({ mode: ValidatorsListMode.SELECT });
    await flushPromises();

    expect(wrapper.findAll('.validator')).toHaveLength(0);
    expect(wrapper.text()).toContain('soraStaking.validatorsList.noValidators');
  });

  it('emits selection in select mode', async () => {
    const wrapper = mountParentForSelect();
    await flushPromises();

    const list = wrapper.getComponent(ValidatorsList);

    await list.vm.toggleSelectValidator(validatorsRef.value[0] as ValidatorInfoFull);
    await flushPromises();

    const emitted = list.emitted('update:selected') ?? [];
    expect(emitted).toHaveLength(1);
    expect((emitted[0][0] as Validator[]).length).toBe(1);
  });

  it('keeps bulk selection controls hidden unless a parent opts in', async () => {
    const wrapper = mountComponent({ mode: ValidatorsListMode.SELECT });
    await flushPromises();

    expect(wrapper.find('.selection-controls').exists()).toBe(false);

    await wrapper.setProps({ showSelectionControls: true });
    await flushPromises();

    expect(wrapper.find('.selection-controls').exists()).toBe(true);
    expect(wrapper.text()).toContain('soraStaking.validatorsList.selectAll');
    expect(wrapper.text()).toContain('soraStaking.validatorsList.deselectAll');
  });

  it('selects the currently visible filtered validators from the bulk action', async () => {
    const wrapper = mountParentForMode(ValidatorsListMode.SELECT, true);
    await flushPromises();

    const list = wrapper.getComponent(ValidatorsList);
    await list.get('.validators-search input').setValue('addr-2');
    await flushPromises();

    const selectAll = list.findAll('.selection-controls .s-button-stub').at(0);
    await selectAll?.trigger('click');
    await flushPromises();

    expect((wrapper.vm as unknown as { selected: Validator[] }).selected.map((validator) => validator.address)).toEqual(
      ['addr-2']
    );
    expect(list.findAll('.selection-controls .s-button-stub').at(0)?.attributes('disabled')).toBeDefined();
  });

  it('clears the selected validators from the bulk deselect action', async () => {
    const wrapper = mountParentForMode(ValidatorsListMode.SELECT, true);
    await flushPromises();

    const list = wrapper.getComponent(ValidatorsList);
    await list.findAll('.selection-controls .s-button-stub').at(0)?.trigger('click');
    await flushPromises();

    expect((wrapper.vm as unknown as { selected: Validator[] }).selected).toHaveLength(3);

    await list.findAll('.selection-controls .s-button-stub').at(1)?.trigger('click');
    await flushPromises();

    expect((wrapper.vm as unknown as { selected: Validator[] }).selected).toEqual([]);
    expect(list.findAll('.selection-controls .s-button-stub').at(1)?.attributes('disabled')).toBeDefined();
  });

  it('removes duplicate selected entries for the same validator address when deselecting', async () => {
    const duplicateSelectedValidator = { ...validatorsRef.value[0] };
    const wrapper = mountComponent({
      mode: ValidatorsListMode.SELECT,
      selectedValidators: [validatorsRef.value[0], duplicateSelectedValidator, validatorsRef.value[1]],
    });
    await flushPromises();

    wrapper.vm.toggleSelectValidator(validatorsRef.value[0] as ValidatorInfoFull);
    await flushPromises();

    const emitted = wrapper.emitted('update:selected') ?? [];
    expect((emitted[0][0] as Validator[]).map((validator) => validator.address)).toEqual(['addr-2']);
  });

  it('treats a non-array selected validators prop as empty before toggling', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    try {
      const wrapper = mountComponent({
        mode: ValidatorsListMode.SELECT,
        selectedValidators: 'addr-1' as unknown as Validator[],
      });
      await flushPromises();

      wrapper.vm.toggleSelectValidator(validatorsRef.value[0] as ValidatorInfoFull);
      await flushPromises();

      const emitted = wrapper.emitted('update:selected') ?? [];
      expect((emitted[0][0] as Validator[]).map((validator) => validator.address)).toEqual(['addr-1']);
      expect(warnSpy).toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('drops malformed selected validator prop entries before emitting a toggle update', async () => {
    const wrapper = mountComponent({
      mode: ValidatorsListMode.SELECT,
      selectedValidators: [null, { address: '' }, { address: 42 }, validatorsRef.value[0]] as unknown as Validator[],
    });
    await flushPromises();

    wrapper.vm.toggleSelectValidator(validatorsRef.value[1] as ValidatorInfoFull);
    await flushPromises();

    const emitted = wrapper.emitted('update:selected') ?? [];
    expect((emitted[0][0] as Validator[]).map((validator) => validator.address)).toEqual(['addr-1', 'addr-2']);
  });

  for (const mode of [ValidatorsListMode.ALL, ValidatorsListMode.USER]) {
    it(`does not emit selection updates in ${mode} mode`, async () => {
      const wrapper = mountComponent({ mode });
      await flushPromises();

      wrapper.vm.toggleSelectValidator(validatorsRef.value[0] as ValidatorInfoFull);
      await flushPromises();

      expect(wrapper.emitted('update:selected')).toBeUndefined();
      expect(wrapper.findAll('button.select-area')).toHaveLength(0);
    });
  }

  it('lets recommended validators be deselected without being reselected by sorting', async () => {
    const wrapper = mountParentForMode(ValidatorsListMode.RECOMMENDED);
    await flushPromises();

    const list = wrapper.getComponent(ValidatorsList);
    expect((wrapper.vm as unknown as { selected: Validator[] }).selected.map((validator) => validator.address)).toEqual(
      ['addr-1', 'addr-2']
    );

    const firstSelectButton = list.findAll('button.select-area').at(0);
    expect(firstSelectButton?.attributes('aria-labelledby')).toBe('validator-name-addr-1');
    expect(firstSelectButton?.attributes('aria-pressed')).toBe('true');

    await firstSelectButton?.trigger('click');
    await flushPromises();

    expect((wrapper.vm as unknown as { selected: Validator[] }).selected.map((validator) => validator.address)).toEqual(
      ['addr-2']
    );

    list.vm.setCommissionSort();
    await flushPromises();

    expect((wrapper.vm as unknown as { selected: Validator[] }).selected.map((validator) => validator.address)).toEqual(
      ['addr-2']
    );
  });

  it('does not reselect a manually removed recommended validator after validator data refreshes', async () => {
    const wrapper = mountParentForMode(ValidatorsListMode.RECOMMENDED);
    await flushPromises();

    const list = wrapper.getComponent(ValidatorsList);
    await list.findAll('button.select-area').at(0)?.trigger('click');
    await flushPromises();

    validatorsRef.value = [
      createValidator('addr-1', { apy: '100' }),
      createValidator('addr-2', { apy: '90' }),
      createValidator('addr-4', { apy: '80' }),
    ];
    await flushPromises();

    expect((wrapper.vm as unknown as { selected: Validator[] }).selected.map((validator) => validator.address)).toEqual(
      ['addr-2']
    );
  });

  it('opens filter dialog via exposed handler', async () => {
    const wrapper = mountComponent({ mode: ValidatorsListMode.SELECT });
    await flushPromises();

    wrapper.vm.openFilters();
    expect(setShowFiltersMock).toHaveBeenCalledWith(true);
  });

  it('renders validator search on the shared design-system input surface', async () => {
    const wrapper = mountComponent({ mode: ValidatorsListMode.SELECT });
    await flushPromises();

    const searchInput = wrapper.get('.validators-search');
    expect(searchInput.classes()).toEqual(
      expect.arrayContaining(['input-stub', 'search-input', 'search-input--with-right', 'validators-search'])
    );
    expect(searchInput.attributes('placeholder')).toBe('soraStaking.validatorsList.search');

    await searchInput.get('.filters-button').trigger('click');

    expect(setShowFiltersMock).toHaveBeenCalledWith(true);
  });

  it('does not expose manual search or filters in recommended mode', async () => {
    const wrapper = mountComponent({ mode: ValidatorsListMode.RECOMMENDED });
    await flushPromises();

    expect(wrapper.find('.validators-search').exists()).toBe(false);
    expect(wrapper.find('.filters-button').exists()).toBe(false);
  });

  it('recovers from an adversarial no-match search through the clear control', async () => {
    const wrapper = mountComponent({ mode: ValidatorsListMode.SELECT });
    await flushPromises();

    await wrapper.get('.validators-search input').setValue('no-match <script>alert(1)</script>');
    await flushPromises();

    expect(wrapper.findAll('.validator')).toHaveLength(0);
    expect(wrapper.text()).toContain('soraStaking.validatorsList.noValidators');

    await wrapper.get('.validators-search .s-button--clear').trigger('click');
    await flushPromises();

    expect(wrapper.findAll('.validator')).toHaveLength(3);
    expect(wrapper.text()).not.toContain('<script>');
  });

  it('normalizes adversarial search whitespace and case before filtering', async () => {
    validatorsRef.value = [
      createValidator('addr-alpha', { identity: { info: { display: 'Reliable Validator' } } }),
      createValidator('addr-beta', { identity: { info: { display: 'Other Node' } } }),
    ];

    const wrapper = mountComponent({ mode: ValidatorsListMode.SELECT });
    await flushPromises();

    await wrapper.get('.validators-search input').setValue('  reliable VALIDATOR  ');
    await flushPromises();

    expect(wrapper.findAll('.validator .name').map((item) => item.text())).toEqual(['Reliable Validator']);
  });

  it('treats whitespace-only search as empty instead of hiding all validators', async () => {
    const wrapper = mountComponent({ mode: ValidatorsListMode.SELECT });
    await flushPromises();

    await wrapper.get('.validators-search input').setValue(' \n\t ');
    await flushPromises();

    expect(wrapper.findAll('.validator')).toHaveLength(3);
    expect(wrapper.text()).not.toContain('soraStaking.validatorsList.noValidators');
  });

  it('handles non-string validator names during search filtering', async () => {
    validatorsRef.value = [
      createValidator('addr-number-name', {
        identity: { info: { display: 12345 as unknown as string } },
      }),
      createValidator('addr-string-name', {
        identity: { info: { display: 'Normal Name' } },
      }),
    ];

    const wrapper = mountComponent({ mode: ValidatorsListMode.SELECT });
    await flushPromises();

    await wrapper.get('.validators-search input').setValue('123');
    await flushPromises();

    expect(wrapper.findAll('.validator .name').map((item) => item.text())).toEqual(['12345']);
  });

  it('applies slashed and oversubscribed filters before returning searched validators', async () => {
    validatorsFilterRef.value = {
      ...validatorsFilterRef.value,
      notSlashed: true,
      notOversubscribed: true,
    };
    validatorsRef.value = [
      createValidator('addr-clean', { identity: { info: { display: 'Alpha Clean' } } }),
      createValidator('addr-blocked', { blocked: true, identity: { info: { display: 'Alpha Blocked' } } }),
      createValidator('addr-oversubscribed', {
        isOversubscribed: true,
        identity: { info: { display: 'Alpha Oversubscribed' } },
      }),
    ];

    const wrapper = mountComponent({ mode: ValidatorsListMode.SELECT });
    await flushPromises();

    await wrapper.get('.validators-search input').setValue('alpha');
    await flushPromises();

    expect(wrapper.findAll('.validator .name').map((item) => item.text())).toEqual(['Alpha Clean']);
  });

  it('does not crash user mode when staking info is missing myValidators', async () => {
    stakingInfoRef.value = {} as { myValidators: string[] };

    const wrapper = mountComponent({ mode: ValidatorsListMode.USER });
    await flushPromises();

    expect(wrapper.findAll('.validator')).toHaveLength(0);
    expect(wrapper.text()).toContain('soraStaking.validatorsList.noNominatedValidators');
  });

  it('ignores non-array nominated validator payloads in user mode', async () => {
    stakingInfoRef.value = { myValidators: 'addr-1' } as unknown as { myValidators: string[] };

    const wrapper = mountComponent({ mode: ValidatorsListMode.USER });
    await flushPromises();

    expect(wrapper.findAll('.validator')).toHaveLength(0);
    expect(wrapper.text()).toContain('soraStaking.validatorsList.noNominatedValidators');
  });

  it('requires exact string nominations in user mode', async () => {
    stakingInfoRef.value = {
      myValidators: ['addr-1<script>', 2, { address: 'addr-2' }, 'addr-3'] as unknown as string[],
    };

    const wrapper = mountComponent({ mode: ValidatorsListMode.USER });
    await flushPromises();

    expect(wrapper.findAll('.validator-avatar-stub').map((item) => item.attributes('data-address'))).toEqual([
      'addr-3',
    ]);
    expect(wrapper.text()).not.toContain('<script>');
  });

  it('ignores malformed identity payloads when the identity filter is enabled', async () => {
    validatorsFilterRef.value = {
      ...validatorsFilterRef.value,
      hasIdentity: true,
    };
    validatorsRef.value = [
      createValidator('addr-malformed', { identity: {} as Validator['identity'] }),
      createValidator('addr-empty', { identity: { info: {} } }),
      createValidator('addr-valid', { identity: { info: { display: 'Validator With Identity' } } }),
      createValidator('addr-missing', { identity: undefined }),
    ];

    const wrapper = mountComponent({ mode: ValidatorsListMode.SELECT });
    await flushPromises();

    expect(wrapper.findAll('.validator .name').map((item) => item.text())).toEqual(['Validator With Identity']);
  });

  it('enforces the two validators per identity filter against oversubscribed duplicate identities', async () => {
    validatorsFilterRef.value = {
      ...validatorsFilterRef.value,
      twoValidatorsPerIdentity: true,
    };
    validatorsRef.value = [
      createValidator('addr-duplicate-1', {
        identity: { info: { display: 'Shared Identity' } },
        isOversubscribed: true,
      }),
      createValidator('addr-duplicate-2', {
        identity: { info: { display: 'Shared Identity' } },
        isOversubscribed: true,
      }),
      createValidator('addr-duplicate-3', {
        identity: { info: { display: 'Shared Identity' } },
        isOversubscribed: true,
      }),
      createValidator('addr-safe-same-identity', {
        identity: { info: { display: 'Shared Identity' } },
        isOversubscribed: false,
      }),
      createValidator('addr-safe-unique-identity', {
        identity: { info: { display: 'Unique Identity' } },
        isOversubscribed: true,
      }),
    ];

    const wrapper = mountComponent({ mode: ValidatorsListMode.SELECT });
    await flushPromises();

    expect(wrapper.findAll('.validator-avatar-stub').map((item) => item.attributes('data-address'))).toEqual([
      'addr-safe-same-identity',
      'addr-safe-unique-identity',
    ]);
  });

  it('shows total XOR staked for each validator', async () => {
    validatorsRef.value = [
      createValidator('addr-1', { stake: { total: '2500000000000000000', own: '0' } }),
      createValidator('addr-2', { stake: { total: '1000000000000000000', own: '0' } }),
    ];

    const wrapper = mountComponent({ mode: ValidatorsListMode.SELECT });
    await flushPromises();

    expect(wrapper.text()).toContain('soraStaking.validatorsList.staked');
    expect(wrapper.text()).toContain('2.5 XOR');
    expect(wrapper.text()).toContain('1 XOR');

    const firstRow = wrapper.get('.validator');
    expect(firstRow.findAll('.validator-cell')).toHaveLength(5);
    expect(firstRow.get('.validator-commission').text()).toBe('100000000%');
    expect(firstRow.get('.validator-return').text()).toBe('12%');
    expect(firstRow.get('.validator-staked').text()).toBe('2.5 XOR');
  });

  it('sorts validators by total stake using codec totals', async () => {
    validatorsRef.value = [
      createValidator('addr-low', { apy: '0', stake: { total: '1000000000000000000', own: '0' } }),
      createValidator('addr-high', { apy: '0', stake: { total: '9000000000000000000', own: '0' } }),
      createValidator('addr-mid', { apy: '0', stake: { total: '2500000000000000000', own: '0' } }),
    ];

    const wrapper = mountComponent({ mode: ValidatorsListMode.SELECT });
    await flushPromises();

    wrapper.vm.setStakedSort();
    await flushPromises();

    expect(wrapper.findAll('.validator .name').map((item) => item.text())).toEqual([
      'addr-high',
      'addr-mid',
      'addr-low',
    ]);

    wrapper.vm.setStakedSort();
    await flushPromises();

    expect(wrapper.findAll('.validator .name').map((item) => item.text())).toEqual([
      'addr-low',
      'addr-mid',
      'addr-high',
    ]);
  });

  it('treats malformed commission and return values as zero during sorting', async () => {
    validatorsRef.value = [
      createValidator('addr-invalid', { commission: 'bad-commission', apy: 'Infinity' }),
      createValidator('addr-low', { commission: '100000000', apy: '1' }),
      createValidator('addr-high', { commission: '200000000', apy: '10' }),
    ];

    const wrapper = mountComponent({ mode: ValidatorsListMode.SELECT });
    await flushPromises();

    expect(wrapper.findAll('.validator .name').map((item) => item.text())).toEqual([
      'addr-high',
      'addr-low',
      'addr-invalid',
    ]);

    wrapper.vm.setReturnSort();
    await flushPromises();

    expect(wrapper.findAll('.validator .name').map((item) => item.text())).toEqual([
      'addr-invalid',
      'addr-low',
      'addr-high',
    ]);

    wrapper.vm.setCommissionSort();
    await flushPromises();

    expect(wrapper.findAll('.validator .name').map((item) => item.text())).toEqual([
      'addr-invalid',
      'addr-low',
      'addr-high',
    ]);

    wrapper.vm.setCommissionSort();
    await flushPromises();

    expect(wrapper.findAll('.validator .name').map((item) => item.text())).toEqual([
      'addr-high',
      'addr-low',
      'addr-invalid',
    ]);
  });

  it('treats missing or malformed staked totals as zero during stake sorting', async () => {
    validatorsRef.value = [
      createValidator('addr-invalid', { apy: '0', stake: { total: 'not-a-codec-value', own: '0' } }),
      createValidator('addr-missing', { apy: '0', stake: undefined }),
      createValidator('addr-high', { apy: '0', stake: { total: '9000000000000000000', own: '0' } }),
    ];

    const wrapper = mountComponent({ mode: ValidatorsListMode.SELECT });
    await flushPromises();

    wrapper.vm.setStakedSort();
    await flushPromises();

    expect(wrapper.findAll('.validator .name').map((item) => item.text())).toEqual([
      'addr-high',
      'addr-invalid',
      'addr-missing',
    ]);

    wrapper.vm.setStakedSort();
    await flushPromises();

    expect(wrapper.findAll('.validator .name').map((item) => item.text())).toEqual([
      'addr-invalid',
      'addr-missing',
      'addr-high',
    ]);
  });

  it('normalizes separated codec stake totals before sorting', async () => {
    validatorsRef.value = [
      createValidator('addr-separated', { apy: '0', stake: { total: '9,000,000,000,000,000,000', own: '0' } }),
      createValidator('addr-plain', { apy: '0', stake: { total: '2500000000000000000', own: '0' } }),
      createValidator('addr-zero', { apy: '0', stake: { total: '0', own: '0' } }),
    ];

    const wrapper = mountComponent({ mode: ValidatorsListMode.SELECT });
    await flushPromises();

    wrapper.vm.setStakedSort();
    await flushPromises();

    expect(wrapper.findAll('.validator .name').map((item) => item.text())).toEqual([
      'addr-separated',
      'addr-plain',
      'addr-zero',
    ]);
  });

  it('sorts extremely large codec stake totals without losing precision', async () => {
    validatorsRef.value = [
      createValidator('addr-small', { apy: '0', stake: { total: '9000000000000000000', own: '0' } }),
      createValidator('addr-huge', {
        apy: '0',
        stake: { total: '123456789012345678901234567890000000000', own: '0' },
      }),
      createValidator('addr-mid', { apy: '0', stake: { total: '2500000000000000000', own: '0' } }),
    ];

    const wrapper = mountComponent({ mode: ValidatorsListMode.SELECT });
    await flushPromises();

    wrapper.vm.setStakedSort();
    await flushPromises();

    expect(wrapper.findAll('.validator .name').map((item) => item.text())).toEqual([
      'addr-huge',
      'addr-small',
      'addr-mid',
    ]);
  });

  it('treats signed and exponent codec stake totals as zero during stake sorting', async () => {
    validatorsRef.value = [
      createValidator('addr-negative', { apy: '0', stake: { total: '-9000000000000000000', own: '0' } }),
      createValidator('addr-exponent', { apy: '0', stake: { total: '1e21', own: '0' } }),
      createValidator('addr-zero', { apy: '0', stake: { total: '0', own: '0' } }),
      createValidator('addr-high', { apy: '0', stake: { total: '9000000000000000000', own: '0' } }),
    ];

    const wrapper = mountComponent({ mode: ValidatorsListMode.SELECT });
    await flushPromises();

    wrapper.vm.setStakedSort();
    await flushPromises();

    expect(wrapper.findAll('.validator .name').map((item) => item.text())).toEqual([
      'addr-high',
      'addr-negative',
      'addr-exponent',
      'addr-zero',
    ]);
  });
});
