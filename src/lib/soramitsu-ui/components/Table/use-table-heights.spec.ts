import { describe, expect, test } from 'vitest';
import { useTableHeights } from './use-table-heights';
import { nextTick, ref } from 'vue';

describe('useTableHeights', () => {
  test('computes table and body heights from numeric props', async () => {
    const propHeight = ref<number | string>(300);
    const propMaxHeight = ref<number | string>('');
    const headerHeight = ref(40);
    const tableHeight = ref(300);

    const { tableHeightStyles, bodyHeightStyles } = useTableHeights({
      propHeight,
      propMaxHeight,
      headerHeight,
      tableHeight,
    });

    expect(tableHeightStyles.value).toEqual({ height: '300px', 'max-height': '' });
    await nextTick();
    expect(bodyHeightStyles.value).toEqual({ height: '260px' });
  });

  test('parses pixel strings and percentages', () => {
    const { tableHeightStyles } = useTableHeights({
      propHeight: ref('200px'),
      propMaxHeight: ref('50%'),
      headerHeight: ref(0),
      tableHeight: ref(0),
    });

    expect(tableHeightStyles.value).toEqual({ height: '200px', 'max-height': '50%' });
  });

  test('computes body max-height from numeric prop', async () => {
    const { bodyHeightStyles } = useTableHeights({
      propHeight: ref<number | string>(''),
      propMaxHeight: ref<number | string>(400),
      headerHeight: ref(50),
      tableHeight: ref(0),
    });

    await nextTick();
    expect(bodyHeightStyles.value).toEqual({ 'max-height': '350px' });
  });
});
