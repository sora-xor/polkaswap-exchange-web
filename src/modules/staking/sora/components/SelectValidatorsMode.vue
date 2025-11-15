<template>
  <div v-loading="Boolean(parentLoading)">
    <div class="content">
      <div class="card">
        <h4>{{ t('soraStaking.selectValidatorsMode.title') }}</h4>
        <p>{{ t('soraStaking.selectValidatorsMode.description') }}</p>
        <ul class="criteria">
          <li v-for="item in criteria" :key="item">
            <s-icon name="basic-check-mark-24" size="16px"></s-icon>
            <span>{{ item }}</span>
          </li>
        </ul>
        <s-button type="primary" @click="stakeWithSuggested">
          {{ t('soraStaking.selectValidatorsMode.confirm.suggested') }}
        </s-button>
      </div>
      <div v-button class="manual-select" @click="stakeWithSelected">
        {{ t('soraStaking.selectValidatorsMode.confirm.manual') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  parentLoading?: boolean;
}>();

const emit = defineEmits<{
  (event: 'recommended'): void;
  (event: 'selected'): void;
}>();

const { t } = useI18n();

const criteria = computed(() => {
  const value = t('soraStaking.selectValidatorsMode.criteria');
  return Array.isArray(value) ? value : [];
});

const stakeWithSuggested = (): void => {
  emit('recommended');
};

const stakeWithSelected = (): void => {
  emit('selected');
};

defineExpose({
  stakeWithSuggested,
  stakeWithSelected,
});
</script>

<style lang="scss" scoped>
.content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: $basic-spacing;
}

h4 {
  font-weight: 600;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 18px;
  border-radius: 24px;
  background: var(--s-color-base-border-primary);
  box-shadow: var(--s-shadow-dialog);
}

.criteria {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
  padding: 0;

  li {
    display: flex;
    align-items: center;
    gap: $inner-spacing-mini;
    width: 100%;
  }

  i {
    color: var(--s-color-status-success);
  }
}

.manual-select {
  color: var(--s-color-theme-accent);
  text-align: center;
  font-size: 14px;
  font-style: normal;
  font-weight: 500;
  text-transform: uppercase;
  cursor: pointer;
  margin-top: 8px;
}
</style>
