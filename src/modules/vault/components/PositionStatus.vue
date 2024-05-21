<template>
  <div class="vault-status" :class="statusClass">
    <span class="vault-status__label">{{ statusLabel }}</span>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { VaultStatuses } from '@/modules/vault/consts';
import type { VaultStatus } from '@/modules/vault/types';

@Component
export default class PositionStatus extends Mixins(TranslationMixin) {
  @Prop({ default: VaultStatuses.Opened, type: String, required: true }) readonly status!: VaultStatus;

  get statusClass(): string {
    return this.status.toLowerCase();
  }

  get statusLabel(): string {
    return this.t(`kensetsu.status.${this.status}`);
  }
}
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
