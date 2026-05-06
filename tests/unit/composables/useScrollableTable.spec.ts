import { mount } from '@vue/test-utils';
import { defineComponent, nextTick, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import { useScrollableTable } from '@/composables/useScrollableTable';

const createHarness = () => {
  const items = ref([{ id: 'first' }]);
  let api!: ReturnType<typeof useScrollableTable>;

  const Harness = defineComponent({
    setup() {
      api = useScrollableTable({ tableItems: items });
      return () => null;
    },
  });

  const wrapper = mount(Harness);

  return { api, items, wrapper };
};

describe('useScrollableTable', () => {
  it('synchronizes table header scroll position from the body wrapper', async () => {
    const { api, wrapper } = createHarness();
    const bodyWrapper = document.createElement('div');
    const headerWrapper = document.createElement('div');
    const elTable = {
      $refs: {
        bodyWrapper,
        headerWrapper,
      },
      scrollPosition: '',
    };
    const addEventListenerSpy = vi.spyOn(bodyWrapper, 'addEventListener');

    api.tableRef.value = {
      $refs: {
        table: elTable,
      },
    };

    bodyWrapper.scrollLeft = 25;
    api.initScrollbarSync();

    expect(addEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true });
    expect(headerWrapper.scrollLeft).toBe(25);
    expect(elTable.scrollPosition).toBe('right');

    bodyWrapper.scrollLeft = 0;
    bodyWrapper.dispatchEvent(new Event('scroll'));

    expect(headerWrapper.scrollLeft).toBe(0);
    expect(elTable.scrollPosition).toBe('left');

    wrapper.unmount();
  });

  it('tears down the previous body listener before reinitializing', () => {
    const { api, wrapper } = createHarness();
    const firstBodyWrapper = document.createElement('div');
    const secondBodyWrapper = document.createElement('div');
    const removeEventListenerSpy = vi.spyOn(firstBodyWrapper, 'removeEventListener');

    api.tableRef.value = {
      $refs: {
        table: {
          $refs: {
            bodyWrapper: firstBodyWrapper,
            headerWrapper: document.createElement('div'),
          },
          scrollPosition: '',
        },
      },
    };
    api.initScrollbarSync();

    api.tableRef.value = {
      $refs: {
        table: {
          $refs: {
            bodyWrapper: secondBodyWrapper,
            headerWrapper: document.createElement('div'),
          },
          scrollPosition: '',
        },
      },
    };
    api.initScrollbarSync();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));

    wrapper.unmount();
  });

  it('waits for the next tick when table items change before reinitializing scroll sync', async () => {
    const { api, items, wrapper } = createHarness();
    const bodyWrapper = document.createElement('div');
    const addEventListenerSpy = vi.spyOn(bodyWrapper, 'addEventListener');

    api.tableRef.value = {
      $refs: {
        table: {
          $refs: {
            bodyWrapper,
            headerWrapper: document.createElement('div'),
          },
          scrollPosition: '',
        },
      },
    };

    items.value = [{ id: 'next' }];
    await nextTick();
    await nextTick();

    expect(addEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true });

    wrapper.unmount();
  });

  it('does nothing when table wrapper refs are unavailable', () => {
    const { api, wrapper } = createHarness();

    api.tableRef.value = { $refs: { table: { $refs: {}, scrollPosition: '' } } };

    expect(() => api.initScrollbarSync()).not.toThrow();

    wrapper.unmount();
  });
});
