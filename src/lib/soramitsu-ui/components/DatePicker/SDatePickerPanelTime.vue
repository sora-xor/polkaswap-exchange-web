<script setup lang="ts">
import type { DatePickerApi } from '@soramitsu-ui/ui/components/DatePicker/api';
import { useDatePickerApi } from '@soramitsu-ui/ui/components/DatePicker/api';

interface Props {
  value?: string;
  options: string[];
}

const state: DatePickerApi = useDatePickerApi();

const props = withDefaults(defineProps<Props>(), {
  value: '00:00',
});

const emit = defineEmits(['update:time']);

const updateTime = (e: any) => {
  emit('update:time', e.target.textContent);
};
</script>

<template>
  <div class="s-date-picker-time-panel sora-tpg-p4">
    <p
      v-for="(time, idx) in options"
      :key="idx"
      class="cursor-pointer"
      :class="time === value ? 'active' : ''"
      @click="updateTime"
      @keydown="updateTime"
    >
      {{ time }}
    </p>
  </div>
</template>
