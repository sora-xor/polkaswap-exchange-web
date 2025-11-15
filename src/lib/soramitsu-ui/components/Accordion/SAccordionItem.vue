<script setup lang="ts">
import { onUnmounted, computed } from 'vue';
import { IconArrowsChevronDownRounded24 } from '@soramitsu-ui/ui/components/icons';
import { uniqueElementId } from '@soramitsu-ui/ui/util';
import { useAccordionApi } from './api';
import { SCollapseTransition } from '@soramitsu-ui/ui/components/Transitions';

const props = withDefaults(
  defineProps<{
    modelValue?: boolean;
    title?: string;
    subtitle?: string;
    name?: string;
  }>(),
  {
    modelValue: false,
    title: '',
    subtitle: '',
    name: '',
  }
);

const emit = defineEmits<(event: 'update:modelValue', value: boolean) => void>();

const model = ref(props.modelValue);
watch(
  () => props.modelValue,
  (origin) => {
    model.value = origin;
  }
);
watch(model, (dep) => {
  if (dep !== props.modelValue) {
    emit('update:modelValue', dep);
  }
});

const contentId = uniqueElementId();

function toggle(expand?: boolean) {
  model.value = expand ?? !model.value;
}

function handleTriggerClick() {
  toggle();
}

const groupApi = useAccordionApi();

if (groupApi) {
  const { register, unregister } = groupApi;

  const api = computed(() => ({
    name: props.name,
    isActive: model.value,
    toggle,
  }));

  register(api);

  onUnmounted(() => {
    unregister(api);
  });
}
</script>

<template>
  <div
    class="s-accordion-item"
    :class="{
      's-accordion-item_expanded': model,
    }"
    data-testid="accordion-item"
  >
    <button
      class="s-accordion-item__trigger"
      data-testid="trigger"
      :aria-expanded="model"
      :aria-controls="contentId"
      @click="handleTriggerClick"
    >
      <div class="s-accordion-item__head">
        <div class="sora-tpg-p2">
          <template v-if="title">
            {{ title }}
          </template>
          <slot v-else name="title" />
        </div>
        <div class="s-accordion-item__subtitle sora-tpg-p4">
          <template v-if="subtitle">
            {{ subtitle }}
          </template>
          <slot v-else name="subtitle" />
        </div>
      </div>
      <IconArrowsChevronDownRounded24 class="s-accordion-item__chevron" aria-hidden="true" />
    </button>

    <SCollapseTransition>
      <div v-show="model" :id="contentId" class="s-accordion-item__body-wrapper" data-testid="content">
        <div class="s-accordion-item__body">
          <slot />
        </div>
      </div>
    </SCollapseTransition>
  </div>
</template>
