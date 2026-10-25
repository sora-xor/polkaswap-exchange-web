import { mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const translations = {
  title: 'Title',
  description: 'Description',
  criteria: ['Item 1', 'Item 2', 'Item 3'],
  suggested: 'Use suggested',
  manual: 'Select manually',
};

const tMock = vi.fn((key: string) => {
  switch (key) {
    case 'soraStaking.selectValidatorsMode.title':
      return translations.title;
    case 'soraStaking.selectValidatorsMode.description':
      return translations.description;
    case 'soraStaking.selectValidatorsMode.criteria':
      return translations.criteria;
    case 'soraStaking.selectValidatorsMode.confirm.suggested':
      return translations.suggested;
    case 'soraStaking.selectValidatorsMode.confirm.manual':
      return translations.manual;
    default:
      return key;
  }
});

vi.mock('vue-i18n', () => ({
  __esModule: true,
  useI18n: () => ({
    t: tMock,
  }),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: tMock,
  }),
}));

import SelectValidatorsMode from '@/modules/staking/sora/components/SelectValidatorsMode.vue';

const SButtonStub = defineComponent({
  name: 'SButtonStub',
  inheritAttrs: false,
  emits: ['click'],
  setup(_, { emit, slots, attrs }) {
    return () =>
      h(
        'button',
        {
          class: ['s-button-stub', attrs.class],
          onClick: (event: Event) => emit('click', event),
        },
        slots.default?.()
      );
  },
});

const mountComponent = (parentLoading = false) =>
  mount(SelectValidatorsMode, {
    props: {
      parentLoading,
    },
    global: {
      directives: {
        loading: vi.fn(),
        button: vi.fn(),
      },
      stubs: {
        's-button': SButtonStub,
        SButton: SButtonStub,
        's-icon': {
          template: '<i class="s-icon-stub"></i>',
        },
      },
      components: {
        SButton: SButtonStub,
        's-button': SButtonStub,
      },
    },
  });

describe('SelectValidatorsMode.vue', () => {
  beforeEach(() => {
    tMock.mockClear();
  });

  it('renders criteria items and button labels', () => {
    const wrapper = mountComponent();
    const items = wrapper.findAll('.criteria li');

    expect(items).toHaveLength(translations.criteria.length);
    translations.criteria.forEach((text, index) => {
      expect(items.at(index)?.text()).toContain(text);
    });
    expect(wrapper.text()).toContain(translations.suggested);
    expect(wrapper.text()).toContain(translations.manual);
  });

  it('emits recommended when suggested button clicked', async () => {
    const wrapper = mountComponent();
    const button = wrapper.findComponent(SButtonStub);
    await button.vm.$emit('click', new Event('click') as unknown as Event);

    expect(wrapper.emitted('recommended')).toBeTruthy();
  });

  it('emits selected when manual option clicked', async () => {
    const wrapper = mountComponent();
    (wrapper.vm as any).stakeWithSelected();

    expect(wrapper.emitted('selected')).toBeTruthy();
  });
});
