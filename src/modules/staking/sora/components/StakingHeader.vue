<template>
  <div class="header">
    <BackButton
      v-if="props.hasBackButton"
      class="back-button"
      :page="props.previousPage"
      @back="emit('back')"
    ></BackButton>
    <h3 class="title"><slot></slot></h3>
  </div>
</template>

<script setup lang="ts">
import { StakingPageNames } from '../../consts';
import { soraStakingLazyComponent } from '../../router';
import { SoraStakingComponents } from '../consts';

const props = withDefaults(
  defineProps<{
    previousPage?: StakingPageNames;
    hasBackButton?: boolean;
  }>(),
  {
    hasBackButton: true,
  }
);

const emit = defineEmits<{
  (event: 'back'): void;
}>();

const BackButton = soraStakingLazyComponent(SoraStakingComponents.BackButton);
</script>

<style lang="scss" scoped>
.header {
  position: relative;
  pointer-events: none;
  display: flex;
  width: 100%;
  height: 42px;
  justify-content: center;
  align-items: center;
}

.back-button {
  position: absolute;
  pointer-events: all;
  left: 0;
}

.title {
  font-weight: 300;
}
</style>
