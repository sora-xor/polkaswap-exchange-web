import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const tableMocks = vi.hoisted(() => ({
  register: vi.fn(),
  nextId: 0,
  typeValues: ['default', 'selection', 'expand', 'details'] as const,
  alignValues: ['left', 'center', 'right'] as const,
}));

vi.mock('@soramitsu-ui/ui/components', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const { computed } = await import('vue');
  const usePropTypeFilter =
    <T extends Record<string, unknown>>(props: T) =>
    <K extends keyof T>(key: K, values: readonly unknown[], fallback: T[K]) =>
      computed(() => (values.includes(props[key]) ? props[key] : fallback));

  return {
    ...actual,
    TABLE_COLUMN_TYPE_VALUES: tableMocks.typeValues,
    TABLE_COLUMN_ALIGN_VALUES: tableMocks.alignValues,
    uniqueElementId: () => `table-column-${++tableMocks.nextId}`,
    usePropTypeFilter,
    useTableApi: () => ({
      register: tableMocks.register,
    }),
  };
});

vi.mock('@soramitsu-ui/ui/components/Table/consts', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const { computed } = await import('vue');
  const usePropTypeFilter =
    <T extends Record<string, unknown>>(props: T) =>
    <K extends keyof T>(key: K, values: readonly unknown[], fallback: T[K]) =>
      computed(() => (values.includes(props[key]) ? props[key] : fallback));

  return {
    ...actual,
    TABLE_COLUMN_TYPE_VALUES: tableMocks.typeValues,
    TABLE_COLUMN_ALIGN_VALUES: tableMocks.alignValues,
    uniqueElementId: () => `table-column-${++tableMocks.nextId}`,
    usePropTypeFilter,
    useTableApi: () => ({
      register: tableMocks.register,
    }),
  };
});

vi.mock('@soramitsu-ui/ui/composables/prop-type-filter', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const { computed } = await import('vue');
  const usePropTypeFilter =
    <T extends Record<string, unknown>>(props: T) =>
    <K extends keyof T>(key: K, values: readonly unknown[], fallback: T[K]) =>
      computed(() => (values.includes(props[key]) ? props[key] : fallback));

  return {
    ...actual,
    TABLE_COLUMN_TYPE_VALUES: tableMocks.typeValues,
    TABLE_COLUMN_ALIGN_VALUES: tableMocks.alignValues,
    uniqueElementId: () => `table-column-${++tableMocks.nextId}`,
    usePropTypeFilter,
    useTableApi: () => ({
      register: tableMocks.register,
    }),
  };
});

vi.mock('@soramitsu-ui/ui/util', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const { computed } = await import('vue');
  const usePropTypeFilter =
    <T extends Record<string, unknown>>(props: T) =>
    <K extends keyof T>(key: K, values: readonly unknown[], fallback: T[K]) =>
      computed(() => (values.includes(props[key]) ? props[key] : fallback));

  return {
    ...actual,
    TABLE_COLUMN_TYPE_VALUES: tableMocks.typeValues,
    TABLE_COLUMN_ALIGN_VALUES: tableMocks.alignValues,
    uniqueElementId: () => `table-column-${++tableMocks.nextId}`,
    usePropTypeFilter,
    useTableApi: () => ({
      register: tableMocks.register,
    }),
  };
});

import STableColumn from '@/lib/soramitsu-ui/components/Table/STableColumn';

const registeredColumn = () => tableMocks.register.mock.calls.at(-1)?.[0] as Record<string, unknown>;

describe('STableColumn', () => {
  beforeEach(() => {
    tableMocks.register.mockClear();
    tableMocks.nextId = 0;
  });

  it('registers a default column with width, sorting, classes, and slots', async () => {
    const formatter = vi.fn();
    const sortMethod = vi.fn();
    const selectable = vi.fn();

    mount(STableColumn, {
      props: {
        type: 'default',
        label: 'Amount',
        prop: 'amount.value',
        width: '120px',
        minWidth: '96',
        sortable: 'custom',
        sortMethod,
        sortBy: ['amount.value'],
        sortOrders: ['descending', 'ascending', null],
        formatter,
        showOverflowTooltip: true,
        align: 'right',
        headerAlign: 'center',
        className: 'amount-cell',
        labelClassName: 'amount-header',
        selectable,
        reserveSelection: true,
      },
      slots: {
        default: '<span class="cell-slot" />',
        header: '<span class="header-slot" />',
      },
    });
    await nextTick();

    expect(tableMocks.register).toHaveBeenCalledTimes(1);
    expect(registeredColumn()).toMatchObject({
      id: 'table-column-1',
      type: 'default',
      label: 'Amount',
      prop: 'amount.value',
      width: 120,
      minWidth: 96,
      sortable: 'custom',
      sortMethod,
      sortBy: ['amount.value'],
      sortOrders: ['descending', 'ascending', null],
      formatter,
      showOverflowTooltip: true,
      align: 'right',
      headerAlign: 'center',
      className: 'amount-cell',
      labelClassName: 'amount-header',
      selectable,
      reserveSelection: true,
    });
    expect(typeof registeredColumn().cellSlot).toBe('function');
    expect(typeof registeredColumn().headerSlot).toBe('function');
  });

  it('updates the registered api object when props change', async () => {
    const wrapper = mount(STableColumn, {
      props: {
        label: 'Initial',
        prop: 'initial',
        width: '80',
        sortable: false,
      },
    });
    const api = registeredColumn();

    await wrapper.setProps({
      label: 'Updated',
      prop: 'updated',
      width: '140',
      sortable: true,
      align: 'center',
    });

    expect(api).toMatchObject({
      label: 'Updated',
      prop: 'updated',
      width: 140,
      sortable: true,
      align: 'center',
      headerAlign: 'center',
    });
  });

  it('uses fixed width presets for action columns and falls back invalid prop values', async () => {
    mount(STableColumn, {
      props: {
        type: 'selection',
        width: '300',
        minWidth: '300',
      },
    });
    await nextTick();
    expect(registeredColumn()).toMatchObject({ type: 'selection', width: 52, minWidth: 52 });

    mount(STableColumn, {
      props: {
        type: 'details',
        align: 'not-valid',
        headerAlign: 'also-invalid',
        width: 'not-a-number',
        minWidth: 'not-a-number',
      },
    });
    await nextTick();
    expect(registeredColumn()).toMatchObject({
      type: 'details',
      width: 40,
      minWidth: 40,
      align: 'left',
      headerAlign: 'left',
    });
  });

  it('falls back default column widths when numeric props are omitted or invalid', async () => {
    mount(STableColumn, {
      props: {
        type: 'not-valid',
        width: '',
        minWidth: '',
      },
    });
    await nextTick();

    expect(registeredColumn()).toMatchObject({
      type: 'default',
      width: null,
      minWidth: 80,
    });
  });
});
