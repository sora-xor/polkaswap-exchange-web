<script setup lang="ts">
import type { ComputedRef } from 'vue';
import { IconArrowsChevronRight24, IconArrowsChevronLeft24 } from '@soramitsu-ui/ui/components/icons';
import { months } from './consts';

import type { ShowState } from './types';

interface Props {
  showState: ShowState;
}

interface MonthCellStyle {
  current: boolean;
  today: boolean;
}

interface MonthCell {
  type: 'normal';
  title: string;
  text: number;
}

const currentMonth = computed(() => {
  return props.showState.month;
});

const currentYear = computed(() => {
  return props.showState.year;
});

const changeYear = (delta: number) => {
  deltaYear.value += delta;
};

const deltaYear = ref(0);

const props = withDefaults(defineProps<Props>(), {});

const emit = defineEmits(['update:showed-year', 'pick']);

const getCellStyle = (cell: MonthCell) => {
  const style: MonthCellStyle = {
    current: false,
    today: false,
  };
  const today = new Date();
  const month = cell.text;

  style.current = currentMonth.value === month && deltaYear.value === 0;
  style.today = today.getMonth() === month && today.getFullYear() === currentYear.value + deltaYear.value;
  return style;
};
const handleMonthTableClick = (event: any) => {
  let target = event.target;
  const month = Number(target.getAttribute('month'));
  emit('pick', month);
  emit('update:showed-year', currentYear.value + deltaYear.value);
};

const gridCells: ComputedRef<MonthCell[]> = computed(() => {
  return months.map((monthName, idx) => {
    const cell: MonthCell = { type: 'normal', title: monthName, text: idx };
    return cell;
  });
});
</script>

<template>
  <div class="s-date-picker-month-table">
    <div class="flex justify-between items-center sora-tpg-p2 s-date-picker-month-table__year-range-panel">
      <button type="button" @click="changeYear(-1)">
        <IconArrowsChevronLeft24 />
      </button>
      <p>{{ currentYear + deltaYear }}</p>
      <button type="button" @click="changeYear(1)">
        <IconArrowsChevronRight24 />
      </button>
    </div>
    <div
      class="s-date-picker-month-table__month-table sora-tpg-p4"
      @click="handleMonthTableClick"
      @keydown="handleMonthTableClick"
    >
      <div v-for="(cell, idx) in gridCells" :key="idx" :class="getCellStyle(cell)">
        <div>
          <a class="cell" :month="cell.text">{{ `${months[cell.text]}` }}</a>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@soramitsu-ui/theme';

.s-date-picker-month-table {
  &__year-range-panel {
    height: 57px;
  }

  &__month-table {
    margin: -1px;
    border-collapse: collapse;
    width: 320px;
    height: 100%;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: repeat(3, 80px);

    & > div {
      text-align: center;
      padding: 8px 0;
      cursor: pointer;

      & div {
        height: 48px;
        padding: 6px 0;
        box-sizing: border-box;
      }

      &.today {
        & .end-date .cell,
        &.start-date .cell {
          color: theme.token-as-var('sys.color.util.surface');
        }
      }

      &.current:not(.disabled) .cell {
        color: theme.token-as-var('sys.color.primary');
      }

      &.today .cell {
        color: theme.token-as-var('sys.color.primary');
        font-weight: 700;
      }

      & .cell {
        display: block;
        line-height: 36px;
        color: theme.token-as-var('sys.color.content-primary');
        margin: 0 auto;
        border-radius: 18px;

        &:hover {
          color: theme.token-as-var('sys.color.primary');
        }
      }
    }
  }
}
</style>
