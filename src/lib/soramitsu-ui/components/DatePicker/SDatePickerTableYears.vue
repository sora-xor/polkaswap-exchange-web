<script setup lang="ts">
import { IconArrowsChevronRight24, IconArrowsChevronLeft24 } from '@soramitsu-ui/ui/components/icons';

const emit = defineEmits(['pick']);

interface Props {
  value: number;
}

const props = withDefaults(defineProps<Props>(), {});

const deltaDecade = ref(0);

const changeDecade = (delta: number) => {
  deltaDecade.value += delta;
};

const startYear = computed(() => {
  return (Math.floor(props.value / 10) + deltaDecade.value) * 10;
});

const getCellStyle = (year: number) => {
  const style = {
    current: false,
    today: false,
  };
  const today = new Date();
  style.current = year === props.value;
  style.today = today.getFullYear() === year;
  return style;
};
const handleYearTableClick = (event: any) => {
  const target = event.target;
  if (target.tagName === 'A') {
    const year = target.textContent || target.innerText;
    emit('pick', Number(year));
  }
};
</script>

<template>
  <div class="s-date-picker-year-table">
    <div class="sora-tpg-p2 s-date-picker-year-table__range-panel">
      <button type="button" @click="changeDecade(-1)">
        <IconArrowsChevronLeft24 />
      </button>
      <p>{{ `${startYear} - ${startYear + 9}` }}</p>
      <button type="button" @click="changeDecade(1)">
        <IconArrowsChevronRight24 />
      </button>
    </div>

    <div
      class="s-date-picker-year-table__year-table sora-tpg-p3"
      @click="handleYearTableClick"
      @keydown="handleYearTableClick"
    >
      <div v-for="year in 10" :key="year" class="available" :class="getCellStyle(startYear + year)">
        <a class="cell">{{ startYear + year }}</a>
      </div>
    </div>
  </div>
</template>
