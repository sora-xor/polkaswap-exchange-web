<template>
  <div :class="['network-badge', { online, offline: !online && checked, connecting }]">
    <div class="network-badge-text p4">
      {{ statusText }}
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'

import TranslationMixin from '@/components/mixins/TranslationMixin'

@Component
export default class NetworkBadge extends Mixins(TranslationMixin) {
  @Prop({ default: false, type: Boolean }) online!: boolean
  @Prop({ default: false, type: Boolean }) checked!: boolean
  @Prop({ default: false, type: Boolean }) connecting!: boolean

  get statusText (): string {
    if (this.connecting) return this.t('networkStatus.connecting')
    if (!this.checked) return this.t('networkStatus.checking')

    return this.online ? this.t('networkStatus.online') : this.t('networkStatus.offline')
  }
}
</script>

<style lang="scss" scoped>
.network-badge {
  padding: 0 0.75 * $inner-spacing-mini;
  border-radius: var(--s-border-radius-small);
  background: var(--s-color-status-warning-background);
  color: var(--s-color-status-warning);

  &.online:not(.connecting) {
    background: var(--s-color-status-success-background);
    color: var(--s-color-status-success);
  }

  &.offline:not(.connecting) {
    background: var(--s-color-status-error-background);
    color: var(--s-color-status-error);
  }
}
</style>
