<script setup lang="ts">
import type { AccordionItemApi, AccordionApi } from './api';
import { ACCORDION_API_KEY } from './api';
import type { Ref } from 'vue';
import { provide, watch } from 'vue';
import { usePassiveModel } from '@soramitsu-ui/ui/composables/passive-model';

const props = withDefaults(
  defineProps<{
    modelValue?: string[];
    multiple?: boolean;
  }>(),
  {
    modelValue: () => [],
    multiple: false,
  }
);

const rawModel = defineModel<string[]>('modelValue', { default: () => [] });
const model = usePassiveModel(rawModel);

const items: Ref<AccordionItemApi>[] = [];
const itemsToOpen = computed(() => {
  return props.multiple || !model.value.length ? model.value : [model.value[0]];
});

watch(
  itemsToOpen,
  () => {
    items.forEach((item) => {
      updateItemState(item.value);
    });
  },
  { immediate: true }
);

function updateItemState(item: AccordionItemApi) {
  if (!item.name) return;

  const isItemActive = itemsToOpen.value.includes(item.name);
  item.toggle(isItemActive);
}

function handleSelection(item: AccordionItemApi) {
  if (!props.multiple && item.isActive) {
    items.forEach((x) => {
      if (x.value !== item) x.value.toggle(false);
    });
  }
}

const api: AccordionApi = {
  register(item: Ref<AccordionItemApi>) {
    items.push(item);
    updateItemState(item.value);
    watch(item, handleSelection);
  },
  unregister(item: Ref<AccordionItemApi>) {
    const itemIndex = items.indexOf(item);

    if (itemIndex === -1) return;

    items.splice(itemIndex, 1);
  },
};

provide(ACCORDION_API_KEY, api);
</script>

<template>
  <div class="s-accordion">
    <slot />
  </div>
</template>
