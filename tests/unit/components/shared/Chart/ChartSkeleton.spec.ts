import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => `i18n:${key}`,
  }),
}));

const SkeletonStub = {
  name: 'SSkeletonStub',
  props: ['loading', 'throttle'],
  template: '<div class="s-skeleton-stub"><slot name="template" /><slot /></div>',
};

const SkeletonItemStub = {
  name: 'SSkeletonItemStub',
  props: ['element'],
  template: '<div class="s-skeleton-item-stub" :data-element="element"></div>',
};

const ButtonStub = {
  name: 'SButtonStub',
  emits: ['click'],
  template: '<button class="s-button-stub" @click="$emit(\'click\')"><slot /></button>',
};

const IconStub = {
  name: 'SIconStub',
  template: '<i class="s-icon-stub"></i>',
};

// Needs to be imported after mocks.
import ChartSkeleton from '@/components/shared/Chart/ChartSkeleton.vue';

const mountComponent = (props?: Record<string, unknown>) =>
  mount(ChartSkeleton, {
    props,
    global: {
      stubs: {
        's-skeleton': SkeletonStub,
        's-skeleton-item': SkeletonItemStub,
        's-button': ButtonStub,
        's-icon': IconStub,
      },
      directives: {
        loading: {
          mounted: () => undefined,
        },
      },
    },
  });

describe('ChartSkeleton', () => {
  it('shows error message and retry button when error occurs and loading stopped', async () => {
    const wrapper = mountComponent({
      loading: false,
      isError: true,
    });

    await flushPromises();

    const message = wrapper.find('.charts-skeleton-error-message');
    expect(message.exists()).toBe(true);
    expect(message.text()).toContain('i18n:swap.errorFetching');

    const button = wrapper.find('.s-button-stub');
    button.element.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));
    await flushPromises();
    expect(wrapper.emitted('retry')).toBeTruthy();
  });

  it('shows empty state message when data is missing', () => {
    const wrapper = mountComponent({
      loading: false,
      isEmpty: true,
    });

    const message = wrapper.find('.charts-skeleton-error-message');
    expect(message.text()).toContain('i18n:noDataText');
    expect(wrapper.find('.s-button-stub').exists()).toBe(false);
  });

  it('does not render issue overlay while loading', () => {
    const wrapper = mountComponent({
      loading: true,
      isError: true,
    });

    expect(wrapper.find('.charts-skeleton-error').exists()).toBe(false);
    expect(wrapper.find('.app-loading-overlay').exists()).toBe(true);
    expect(wrapper.find('.app-loading-overlay__spinner').exists()).toBe(true);
  });
});
