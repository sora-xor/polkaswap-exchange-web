import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { describe, expect, it } from 'vitest';

import SProgressBar from '@/lib/soramitsu-ui/components/ProgressBar/SProgressBar.vue';

describe('SProgressBar', () => {
  it('binds percent, height, and border radius as CSS variables', async () => {
    const wrapper = mount(SProgressBar, {
      props: {
        percent: 42,
        lineHeight: 8,
      },
    });
    await nextTick();
    const vm = wrapper.vm as unknown as {
      activeBarWidth: string;
      borderRadius: string;
      progressBarHeight: string;
    };

    expect(wrapper.classes()).toContain('s-progress-bar');
    expect(wrapper.find('.s-progress-bar__active-bar').exists()).toBe(true);
    expect(wrapper.props()).toMatchObject({
      percent: 42,
      lineHeight: 8,
    });
    expect(vm.activeBarWidth).toBe('42%');
    expect(vm.progressBarHeight).toBe('8px');
    expect(vm.borderRadius).toBe('4px');
  });

  it('clamps percent CSS variables to the supported range', async () => {
    const belowZero = mount(SProgressBar, {
      props: {
        percent: -5,
      },
    });
    const aboveMax = mount(SProgressBar, {
      props: {
        percent: 125,
      },
    });
    await nextTick();
    const belowZeroVm = belowZero.vm as unknown as { activeBarWidth: string };
    const aboveMaxVm = aboveMax.vm as unknown as { activeBarWidth: string };

    expect(belowZero.find('.s-progress-bar__active-bar').exists()).toBe(true);
    expect(aboveMax.find('.s-progress-bar__active-bar').exists()).toBe(true);
    expect(belowZero.props('percent')).toBe(-5);
    expect(aboveMax.props('percent')).toBe(125);
    expect(belowZeroVm.activeBarWidth).toBe(0);
    expect(aboveMaxVm.activeBarWidth).toBe('100%');
  });
});
