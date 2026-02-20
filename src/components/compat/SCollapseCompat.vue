<script setup lang="ts">
import { computed, provide, ref, watch } from 'vue';

import { collapseContextKey, type CollapseName } from './collapseContext';

defineOptions({
  name: 'SCollapse',
  inheritAttrs: false,
});

const props = withDefaults(
  defineProps<{
    modelValue?: CollapseName | CollapseName[] | null;
    value?: CollapseName | CollapseName[] | null;
    accordion?: boolean;
    borders?: boolean;
  }>(),
  {
    modelValue: undefined,
    value: undefined,
    accordion: false,
    borders: false,
  }
);

const emit = defineEmits<{
  (event: 'update:modelValue', value: CollapseName | CollapseName[]): void;
  (event: 'input', value: CollapseName | CollapseName[]): void;
  (event: 'change', value: CollapseName[]): void;
}>();

const activeNames = ref<CollapseName[]>([]);

const normalizedExternal = computed<CollapseName[] | undefined>(() => {
  const source = props.modelValue ?? props.value;
  if (source === null || source === undefined) return undefined;
  return Array.isArray(source) ? [...source] : [source];
});

watch(
  normalizedExternal,
  (next) => {
    if (!next) return;
    activeNames.value = next;
  },
  { immediate: true }
);

const classes = computed(() => [
  'el-collapse',
  'neumorphic',
  {
    'el-collapse--borders': props.borders,
    'el-collapse--borderless': !props.borders,
  },
]);

const toPayload = (names: CollapseName[]): CollapseName | CollapseName[] => {
  if (props.accordion) {
    return names[0] ?? '';
  }
  return names;
};

const emitUpdates = (names: CollapseName[]): void => {
  emit('change', names);
  const payload = toPayload(names);
  emit('update:modelValue', payload);
  emit('input', payload);
};

const toggleItem = (name: CollapseName): void => {
  const current = activeNames.value;
  const hasItem = current.includes(name);

  const next = props.accordion
    ? hasItem
      ? []
      : [name]
    : hasItem
      ? current.filter((item) => item !== name)
      : [...current, name];

  activeNames.value = next;
  emitUpdates(next);
};

provide(collapseContextKey, {
  activeNames,
  accordion: computed(() => Boolean(props.accordion)),
  toggleItem,
});
</script>

<template>
  <div :class="classes" v-bind="$attrs">
    <slot />
  </div>
</template>

<style lang="scss">
.el-collapse {
  width: 100%;
}
</style>
