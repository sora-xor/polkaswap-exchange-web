<template>
  <div class="vault-status" :class="statusClass">
    <span class="vault-status__label">{{ statusLabel }}</span>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { VaultStatuses } from '@/modules/vault/consts';
import type { VaultStatus } from '@/modules/vault/types';

const props = withDefaults(defineProps<{ status?: VaultStatus }>(), {
  status: VaultStatuses.Opened,
});

const { t } = useTranslation();

const statusClass = computed(() => props.status.toLowerCase());
const statusLabel = computed(() => t(`kensetsu.status.${props.status}`));
</script>

<style lang="scss" scoped>
.vault-status {
  padding: 2px $inner-spacing-mini;
  border-radius: var(--s-border-radius-medium);
  background-color: var(--s-color-base-border-primary);
  &__label {
    font-size: var(--s-font-size-extra-small);
    font-weight: 600;
    letter-spacing: var(--s-letter-spacing-small);
    text-transform: uppercase;
  }
  &.opened {
    color: var(--s-color-status-info);
  }
  &.closed {
    color: var(--s-color-base-content-secondary);
  }
  &.liquidated {
    color: var(--s-color-status-error);
  }
}
</style>
