import { describe, expect, it } from 'vitest';
import { nextTick, ref } from 'vue';

import { useTableHeights } from '@/lib/soramitsu-ui/components/Table/use-table-heights';

describe('useTableHeights', () => {
  it('normalizes numeric height props into px table styles and body height', async () => {
    const propHeight = ref<number | string>('240px');
    const propMaxHeight = ref<number | string>(360);
    const headerHeight = ref(40);
    const tableHeight = ref(240);

    const { tableHeightStyles, bodyHeightStyles } = useTableHeights({
      propHeight,
      propMaxHeight,
      headerHeight,
      tableHeight,
    });

    expect(tableHeightStyles.value).toEqual({
      height: '240px',
      'max-height': '360px',
    });
    expect(bodyHeightStyles.value).toEqual({ height: '200px' });

    tableHeight.value = 40;
    await nextTick();

    expect(bodyHeightStyles.value).toEqual({ height: '' });
  });

  it('uses max-height body styles when only a bounded maximum height is configured', async () => {
    const propHeight = ref<number | string>('');
    const propMaxHeight = ref<number | string>('160px');
    const headerHeight = ref(48);
    const tableHeight = ref(0);

    const { tableHeightStyles, bodyHeightStyles } = useTableHeights({
      propHeight,
      propMaxHeight,
      headerHeight,
      tableHeight,
    });

    expect(tableHeightStyles.value).toEqual({
      height: '',
      'max-height': '160px',
    });
    expect(bodyHeightStyles.value).toEqual({ 'max-height': '112px' });

    headerHeight.value = 200;
    await nextTick();

    expect(bodyHeightStyles.value).toEqual({ 'max-height': '0px' });
  });

  it('preserves non-pixel CSS values and clears body styles without fixed constraints', () => {
    const { tableHeightStyles, bodyHeightStyles } = useTableHeights({
      propHeight: ref<number | string>('auto'),
      propMaxHeight: ref<number | string>('calc(100vh - 20px)'),
      headerHeight: ref(32),
      tableHeight: ref(400),
    });

    expect(tableHeightStyles.value).toEqual({
      height: 'auto',
      'max-height': 'calc(100vh - 20px)',
    });
    expect(bodyHeightStyles.value).toEqual({ height: '368px' });

    const empty = useTableHeights({
      propHeight: ref<number | string>(''),
      propMaxHeight: ref<number | string>(''),
      headerHeight: ref(32),
      tableHeight: ref(400),
    });

    expect(empty.bodyHeightStyles.value).toEqual({});
  });
});
