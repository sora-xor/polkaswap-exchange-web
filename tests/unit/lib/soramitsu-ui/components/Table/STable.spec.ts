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
});
