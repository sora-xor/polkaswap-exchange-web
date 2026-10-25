import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

const LoadingDirective = {
  mounted: () => undefined,
};

import IFrameWidget from '@/components/shared/Widget/IFrame.vue';

describe('IFrameWidget', () => {
  it('shows loading initially when src provided and hides after load', async () => {
    const wrapper = mount(IFrameWidget, {
      props: { src: 'https://example.com/frame', allowedOrigins: ['https://example.com'] },
      global: {
        directives: {
          loading: LoadingDirective,
        },
      },
    });

    const vm = wrapper.vm as unknown as {
      $: { exposed?: { widgetLoading?: { value: boolean } }; setupState: { widgetLoading?: { value: boolean } } };
    };
    const widgetLoading = vm.$.exposed?.widgetLoading ?? vm.$.setupState.widgetLoading;
    expect(widgetLoading?.value).toBe(true);

    const onLoadWidget = (wrapper.vm as unknown as { $: { setupState: { onLoadWidget?: () => void } } }).$.setupState
      .onLoadWidget;
    onLoadWidget?.();
    expect(widgetLoading?.value).toBe(false);
  });

  it('blocks unapproved iframe origins by default', () => {
    const wrapper = mount(IFrameWidget, {
      props: { src: 'https://evil.example/frame' },
      global: {
        directives: {
          loading: LoadingDirective,
        },
      },
    });

    expect(wrapper.find('iframe').exists()).toBe(false);
  });

  it('applies bordered styling when requested', () => {
    const wrapper = mount(IFrameWidget, {
      props: { withBorder: true },
      global: {
        directives: {
          loading: LoadingDirective,
        },
      },
    });

    expect(wrapper.find('.widget-container').classes()).toContain('widget-container--bordered');
  });
});
