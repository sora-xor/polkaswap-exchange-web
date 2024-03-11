<template>
  <s-button
    type="action"
    size="mini"
    alternative
    :tooltip="t('selectNodeText')"
    @click="handleClick"
    class="status-button"
  >
    <s-icon :class="`status--${status}`" :name="icon" size="16" />
  </s-button>
</template>

<script lang="ts">
import { Status } from '@soramitsu-ui/ui-vue2/lib/types';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import type { NodesConnection } from '@/utils/connection';

@Component
export default class BridgeNodeIcon extends Mixins(TranslationMixin) {
  @Prop({ default: () => null, type: Object }) readonly connection!: NodesConnection | null;

  get icon(): string {
    return this.loading ? 'el-icon-loading' : 'globe-16';
  }

  get loading(): boolean {
    return !!this.connection?.nodeAddressConnecting;
  }

  get connected(): boolean {
    return !!this.connection?.nodeIsConnected;
  }

  get status() {
    if (this.connected) return Status.SUCCESS;
    if (this.loading) return Status.INFO;
    return Status.ERROR;
  }

  handleClick(): void {
    this.$emit('click');
  }
}
</script>

<style lang="scss" scoped>
$status-classes: 'error', 'success';
$size: calc(var(--s-size-small) / 2);

.status {
  &-button.el-button.neumorphic.s-action.s-mini {
    width: $size;
    height: $size;
    font-size: $size;
  }

  @each $status in $status-classes {
    &--#{$status} {
      &,
      &:hover {
        color: var(--s-color-status-#{$status});
      }

      &:hover,
      &:focus {
        opacity: 0.5;
      }
    }
  }
}
</style>
