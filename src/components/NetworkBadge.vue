<template>
  <div>
    <div v-if="!connecting" :class="['network-badge', { online, offline }]">
      <div  class="network-badge-text p4">
        {{ statusText }}
      </div>
    </div>
    <s-icon v-else name="el-icon-loading" />
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

  get offline (): boolean {
    return !this.online && this.checked
  }

  get statusText (): string {
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

  &-text {
    text-align: center;
  }

  &.online {
    background: var(--s-color-status-success-background);
    color: var(--s-color-status-success);
  }

  &.offline {
    background: var(--s-color-status-error-background);
    color: var(--s-color-status-error);
  }
}
</style>
