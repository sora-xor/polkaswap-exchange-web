<template>
  <div class="account-panel">
    <slot name="icon">
      <wallet-avatar :address="address" :size="18" class="account-gravatar" />
    </slot>
    <span v-if="name" class="account-panel-name">
      {{ name }}
    </span>
    <formatted-address :value="address" :symbols="12" :tooltip-text="tooltip" />
  </div>
</template>

<script lang="ts">
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';

@Component({
  components: {
    WalletAvatar: components.WalletAvatar,
    FormattedAddress: components.FormattedAddress,
  },
})
export default class BridgeAccountPanel extends Mixins(mixins.CopyAddressMixin, TranslationMixin) {
  @Prop({ default: '', type: String }) readonly address!: string;
  @Prop({ default: '', type: String }) readonly name!: string;
  @Prop({ default: '', type: String }) readonly tooltip!: string;
}
</script>

<style lang="scss">
.account-panel {
  .account-gravatar {
    border: none;
    border-radius: 50%;

    & > circle:first-child {
      fill: var(--s-color-utility-surface);
    }
  }
}
</style>

<style lang="scss" scoped>
.account-panel {
  display: flex;
  align-items: center;
  gap: $inner-spacing-mini;

  &-name {
    max-width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
