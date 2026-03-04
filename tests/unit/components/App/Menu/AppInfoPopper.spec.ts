import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, nextTick, useAttrs } from 'vue';

import AppInfoPopper from '@/components/App/Menu/AppInfoPopper.vue';
import ElPopoverCompat from '@/components/compat/ElPopoverCompat';

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      if (key === 'mobilePopup.info') return 'Info description';
      if (key === 'mobilePopup.sideMenu') return 'Get Sora Wallet';
      return key;
    },
  }),
}));

const AttrForwardingTrigger = defineComponent({
  name: 'AttrForwardingTrigger',
  setup() {
    const attrs = useAttrs();
    return { attrs };
  },
  template: '<div class="attr-trigger" v-bind="attrs">Info</div>',
});

const mountComponent = (slotContent = '<button class="info-trigger">Info</button>') =>
  mount(AppInfoPopper, {
    attachTo: document.body,
    global: {
      components: {
        ElPopover: ElPopoverCompat,
        'el-popover': ElPopoverCompat,
        AttrForwardingTrigger,
      },
      stubs: {
        's-button': {
          emits: ['click'],
          template: '<button class="s-button-stub" @click="$emit(\'click\')"><slot /></button>',
        },
      },
    },
    slots: {
      default: slotContent,
    },
  });

describe('AppInfoPopper', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('opens on trigger click and emits open-product action from the popover button', async () => {
    const wrapper = mountComponent();

    await wrapper.get('.info-trigger').trigger('click');
    await nextTick();
    await nextTick();

    expect(document.body.querySelector('.app-info-popper__content')).not.toBeNull();

    const actionButton = document.body.querySelector('.s-button-stub') as HTMLButtonElement;
    actionButton.click();
    await nextTick();
    await nextTick();

    expect(wrapper.emitted('open-product-dialog')).toHaveLength(1);
    expect(wrapper.emitted('open-product-dialog')?.[0]).toEqual(['soraMobile']);
  });

  it('opens when reference slot is a component that forwards attrs', async () => {
    const wrapper = mountComponent('<attr-forwarding-trigger />');

    await wrapper.get('.attr-trigger').trigger('click');
    await nextTick();
    await nextTick();

    expect(document.body.querySelector('.app-info-popper__content')).not.toBeNull();
  });
});
