<template>
  <div v-if="name" class="account-panel">
    <wallet-avatar :address="address" :size="18" class="account-gravatar" />
    <s-tooltip :content="copyTooltip(tooltip)" tabindex="-1">
      <span class="account-panel-name" @click="handleCopyAddress(address, $event)">
        {{ name }}
      </span>
    </s-tooltip>
  </div>
  <formatted-address v-else :value="address" :symbols="14" :tooltip-text="tooltip" />
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
    @include copy-address;
  }
}
</style>
