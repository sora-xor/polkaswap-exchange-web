import { describe, expect, test } from 'vitest';
import SDatePickerPanelDate from './SDatePickerPanelDate.vue';
import type { ShowState, StateStore } from './types';
import { mountWithProviders } from '@soramitsu-ui/ui/test-utils';

const showState: ShowState = { month: 7, year: 2024 };
const stateStore: StateStore = {
  dayState: null,
  pickState: [],
  rangeState: { selecting: false, startDate: null, endDate: null, selectedField: null },
};

describe('SDatePickerPanelDate', () => {
  test('re-emits child events', async () => {
    const wrapper = mountWithProviders(SDatePickerPanelDate, {
      props: {
        showState,
        stateStore,
        hoveredDate: new Date('2024-01-01'),
      },
      global: {
        stubs: {
          MonthPanel: {
            name: 'MonthPanel',
            template: '<div class="month" />',
          },
          DateTable: {
            name: 'DateTable',
            template: '<div class="table" />',
          },
        },
      },
    });

    const month = wrapper.findComponent({ name: 'MonthPanel' });
    const table = wrapper.findComponent({ name: 'DateTable' });

    month.vm.$emit('update:showed-state', 1);
    month.vm.$emit('change-view', 'months');
    table.vm.$emit('pick', { date: new Date() });
    table.vm.$emit('update:hovered-date', new Date('2024-06-01'));

    expect(wrapper.emitted()['update:showed-state']).toEqual([[1]]);
    expect(wrapper.emitted()['change-view']).toEqual([['months']]);
    expect(wrapper.emitted().pick).toHaveLength(1);
    expect(wrapper.emitted()['update:hovered-date']).toHaveLength(1);
  });
});
