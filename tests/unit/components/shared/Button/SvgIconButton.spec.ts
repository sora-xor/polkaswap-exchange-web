import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import SvgIconButton from '@/components/shared/Button/SvgIconButton/SvgIconButton.vue';
import { SvgIcons } from '@/components/shared/Button/SvgIconButton/icons';

vi.mock('@/components/shared/Button/SvgIconButton/Icons/Line.vue', () => ({
  __esModule: true,
  __isTeleport: false,
  default: {
    name: 'LineIconStub',
    template: '<svg class="line-icon-stub"></svg>',
  },
}));

vi.mock('@/components/shared/Button/SvgIconButton/Icons/Candle.vue', () => ({
  __esModule: true,
  __isTeleport: false,
  default: {
    name: 'CandleIconStub',
    template: '<svg class="candle-icon-stub"></svg>',
  },
}));

const mountComponent = (props?: Record<string, unknown>) =>
  mount(SvgIconButton, {
    props,
    global: {
      stubs: {
        SButton: {
          name: 'SButton',
          template:
            '<button class="s-button-stub" v-bind="$attrs"><span class="icon-slot"><slot name="icon"></slot></span><span class="default-slot"><slot></slot></span></button>',
        },
        's-button': {
          name: 's-button',
          template:
            '<button class="s-button-stub" v-bind="$attrs"><span class="icon-slot"><slot name="icon"></slot></span><span class="default-slot"><slot></slot></span></button>',
        },
      },
    },
  });

const settleAsyncComponents = async () => {
  if (typeof vi.dynamicImportSettled === 'function') {
    await vi.dynamicImportSettled();
  }
  await flushPromises();
};

describe('SvgIconButton', () => {
  it('renders specified icon and forwards attributes', async () => {
    const wrapper = mountComponent({
      icon: SvgIcons.LineIcon,
      'aria-label': 'toggle-line',
    });

    await settleAsyncComponents();
    await settleAsyncComponents();

    expect(wrapper.html()).toContain('line-icon-stub');
    expect(wrapper.find('.icon-slot .line-icon-stub').exists()).toBe(true);
    expect(wrapper.attributes('aria-label')).toBe('toggle-line');
  });

  it('applies pressed class when active', async () => {
    const wrapper = mountComponent({
      icon: SvgIcons.CandleIcon,
      active: true,
    });

    await settleAsyncComponents();
    await settleAsyncComponents();

    const exposed = wrapper.vm as unknown as { classes: Array<string | Record<string, boolean>> };
    expect(JSON.stringify(exposed.classes)).toContain('s-pressed');
    expect(wrapper.html()).toContain('candle-icon-stub');
    expect(wrapper.find('.icon-slot .candle-icon-stub').exists()).toBe(true);
  });
});
