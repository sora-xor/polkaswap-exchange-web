import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { describe, expect, it } from 'vitest';

import AppLogoButton from '@/components/App/Header/AppLogoButton.vue';
import { Theme } from '@/consts/theme';

const buttonStub = defineComponent({
  name: 'SButton',
  emits: ['click'],
  template: '<button class="s-button" @click="$emit(\'click\', $event)"><slot /></button>',
});

const logoStub = defineComponent({
  name: 'PolkaswapLogo',
  props: {
    theme: {
      type: String,
      default: Theme.LIGHT,
    },
  },
  template: '<div class="polkaswap-logo" :data-theme="theme" />',
});

const globalComponents = {
  's-button': buttonStub,
  'polkaswap-logo': logoStub,
};

describe('AppLogoButton', () => {
  it('uses the light theme by default', () => {
    const wrapper = mount(AppLogoButton, {
      global: {
        components: globalComponents,
      },
    });

    const exposedTheme = (wrapper.vm as { theme?: Theme | { value: Theme } }).theme;
    const themeValue =
      typeof exposedTheme === 'object' && exposedTheme !== null && 'value' in exposedTheme
        ? exposedTheme.value
        : exposedTheme;

    expect(themeValue).toBe(Theme.LIGHT);
  });

  it('applies the responsive modifier', () => {
    const wrapper = mount(AppLogoButton, {
      props: {
        responsive: true,
      },
      global: {
        components: globalComponents,
      },
    });

    expect(wrapper.classes()).toContain('responsive');
  });

  it('re-emits click events from the SButton wrapper', async () => {
    const wrapper = mount(AppLogoButton, {
      global: {
        components: globalComponents,
      },
    });

    const button = wrapper.findComponent(buttonStub);
    const event = { type: 'click' } as MouseEvent;
    button.vm.$emit('click', event);
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted().click).toHaveLength(1);
    expect(wrapper.emitted().click?.[0][0]).toBe(event);
  });
});
