import '@/compat/runtime-helpers';

import { shallowMount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import STable from '@/lib/soramitsu-ui/components/Table/STable.vue';

describe('STable', () => {
  it('does not throw when comparing current row', () => {
    const wrapper = shallowMount(STable);

    const setupState = (wrapper.vm as unknown as { $: { setupState: Record<string, unknown> } }).$.setupState;
    const isCurrentRow = setupState.isCurrentRow as ((row: unknown) => boolean) | undefined;

    expect(typeof isCurrentRow).toBe('function');
    expect(() => isCurrentRow?.({ id: 1 })).not.toThrow();
    expect(isCurrentRow?.({ id: 1 })).toBe(false);
  });

  it('emits both modern and legacy row click events', () => {
    const wrapper = shallowMount(STable);
    const setupState = (wrapper.vm as unknown as { $: { setupState: Record<string, unknown> } }).$.setupState;
    const handleCellMouseEvent = setupState.handleCellMouseEvent as
      | ((ctx: { row: Record<string, unknown>; column: { type: string }; event: MouseEvent }) => void)
      | undefined;

    const row = { id: 1 };
    const event = new MouseEvent('click');
    Object.defineProperty(event, 'target', { value: document.createElement('td') });
    handleCellMouseEvent?.({ row, column: { type: 'default' }, event });

    expect(wrapper.emitted('click:row')).toBeTruthy();
    expect(wrapper.emitted('row-click')).toBeTruthy();
    expect(wrapper.emitted('click:cell')).toBeTruthy();
    expect(wrapper.emitted('cell-click')).toBeTruthy();
  });

  it('emits legacy selection-change alongside modern change:selection', () => {
    const wrapper = shallowMount(STable, {
      props: {
        data: [{ id: 1 }],
      },
    });
    const setupState = (wrapper.vm as unknown as { $: { setupState: Record<string, unknown> } }).$.setupState;
    const handleRowSelect = setupState.handleRowSelect as ((row: Record<string, unknown>) => void) | undefined;

    handleRowSelect?.({ id: 1 });

    expect(wrapper.emitted('change:selection')).toBeTruthy();
    expect(wrapper.emitted('selection-change')).toBeTruthy();
  });
});
