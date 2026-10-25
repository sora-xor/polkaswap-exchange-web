import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import SScrollbar from '@/lib/soramitsu-ui/components/Scrollbar/SScrollbar.vue';

function setScrollMetrics(
  el: HTMLElement,
  {
    clientHeight,
    scrollHeight,
    scrollTop = 0,
    clientWidth = 100,
    scrollWidth = 100,
    scrollLeft = 0,
  }: {
    clientHeight: number;
    scrollHeight: number;
    scrollTop?: number;
    clientWidth?: number;
    scrollWidth?: number;
    scrollLeft?: number;
  }
): void {
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: clientHeight });
  Object.defineProperty(el, 'scrollHeight', { configurable: true, value: scrollHeight });
  Object.defineProperty(el, 'scrollTop', {
    configurable: true,
    get: () => scrollTop,
    set: (value: number) => {
      scrollTop = value;
    },
  });
  Object.defineProperty(el, 'clientWidth', { configurable: true, value: clientWidth });
  Object.defineProperty(el, 'scrollWidth', { configurable: true, value: scrollWidth });
  Object.defineProperty(el, 'scrollLeft', {
    configurable: true,
    get: () => scrollLeft,
    set: (value: number) => {
      scrollLeft = value;
    },
  });
}

describe('SScrollbar', () => {
  it('updates vertical thumb style based on scroll metrics', async () => {
    const wrapper = mount(SScrollbar, {
      slots: {
        default: '<div style="height: 600px">Scrollable content</div>',
      },
    });

    const wrap = wrapper.get('.el-scrollbar__wrap').element as HTMLElement;
    setScrollMetrics(wrap, { clientHeight: 200, scrollHeight: 600, scrollTop: 60 });

    (wrapper.vm as { updateThumbState: () => void }).updateThumbState();
    await wrapper.vm.$nextTick();

    const thumb = wrapper.get('.el-scrollbar__bar.is-vertical .el-scrollbar__thumb').element as HTMLElement;
    const move = thumb.style.transform.match(/translateY\(([-\d.]+)%\)/)?.[1];

    expect(parseFloat(thumb.style.height)).toBeCloseTo(33.3333, 2);
    expect(move ? parseFloat(move) : NaN).toBeCloseTo(30, 2);
  });
});
