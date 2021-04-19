<template>
  <div :class="['network-badge', { online }]">
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

  get statusText (): string {
    return this.online ? this.t('networkStatus.online') : this.t('networkStatus.offline')
  }
}
</script>

<style lang="scss" scoped>
.network-badge {
  padding: 0 0.75 * $inner-spacing-mini;
  background: var(--s-color-status-error-background);
  color: var(--s-color-status-error);
  border-radius: var(--s-border-radius-small);

  &.online {
    background: var(--s-color-status-success-background);
    color: var(--s-color-status-success);
  }
}
</style>
