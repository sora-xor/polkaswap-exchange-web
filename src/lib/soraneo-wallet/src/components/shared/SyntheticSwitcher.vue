<template>
  <div class="switcher">
    <s-switch v-model="model"></s-switch>
    <span>
      {{ t('explore.showOnly') }}
      <external-link default-class="p3" :title="t('explore.synthetics')" :href="SYNTHS_LINK"></external-link>
    </span>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

import { useTranslation } from '@/composables/useTranslation';

import ExternalLink from './ExternalLink.vue';

const props = withDefaults(
  defineProps<{
    modelValue?: boolean;
  }>(),
  {
    modelValue: false,
  }
);

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void;
}>();

const { t } = useTranslation();

const model = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});

const SYNTHS_LINK =
  'https://medium.com/polkaswap/unveiling-synthetic-assets-a-game-changer-in-the-financial-landscape-1720e5858422';

defineExpose({ model });
</script>

<style lang="scss" scoped>
.switcher {
  display: flex;
  align-items: center;

  & > span {
    margin-left: $inner-spacing-small;
  }
}
</style>
