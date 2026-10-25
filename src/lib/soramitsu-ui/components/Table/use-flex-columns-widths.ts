import type { TableActionColumnApi, TableColumnApi } from './api';
import { computed, type Ref } from 'vue';

const MIN_READABLE_FIT_COLUMN_WIDTH = 72;

export function useFlexColumns(
  columns: (TableColumnApi | TableActionColumnApi)[],
  tableWidth: Ref<number>,
  fit: Ref<boolean>
) {
  const columnsWidths = computed(() => {
    const baseColumnsWidths = columns.map((col) => col.width ?? col.minWidth);

    if (fit.value) {
      const baseColumnsWidthsSum = baseColumnsWidths.reduce((sum, width) => sum + width, 0);
      const freeSpace = tableWidth.value - baseColumnsWidthsSum;
      const columnsMinWidthsSum = columns.reduce((sum, col) => sum + (col.width ? 0 : col.minWidth), 0);

      if (freeSpace !== 0 && columnsMinWidthsSum > 0) {
        const fittedWidths = columns.map((col) => {
          if (col.width) return col.width;

          return col.minWidth + (col.minWidth * freeSpace) / columnsMinWidthsSum;
        });

        if (
          freeSpace > 0 ||
          fittedWidths.every((width, index) => {
            const column = columns[index];

            return Boolean(column.width) || width >= Math.min(column.minWidth, MIN_READABLE_FIT_COLUMN_WIDTH);
          })
        ) {
          return fittedWidths;
        }
      }
    }

    return baseColumnsWidths;
  });

  const columnsWidthsSum = computed(() => columnsWidths.value.reduce((sum, width) => sum + width, 0));

  return {
    columnsWidths,
    columnsWidthsSum,
  };
}
