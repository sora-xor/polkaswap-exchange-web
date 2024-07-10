<template>
  <div class="account-panel">
    <s-divider type="tertiary" />

    <div class="account-group">
      <slot name="icon">
        <wallet-avatar :address="address" :size="18" class="account-gravatar" />
      </slot>
      <span v-if="name" class="account-group-name">
        {{ name }}
      </span>
      <formatted-address :value="address" :symbols="12" :tooltip-text="tooltip" />
    </div>

    <div class="account-group">
      <span class="account-group-btn" @click="handleConnect">
        {{ t('changeAccountText') }}
      </span>
      <span class="account-group-btn disconnect" @click="handleDisconnect">
        {{ t('disconnectWalletText') }}
      </span>
    </div>
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

  handleConnect(): void {
    this.$emit('connect');
  }

  handleDisconnect(): void {
    this.$emit('disconnect');
  }
}
</script>

<style lang="scss">
.account-group {
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
  flex: 1;
  justify-content: space-between;
  flex-wrap: wrap;
  font-size: var(--s-font-size-mini);
  line-height: var(--s-line-height-medium);
  color: var(--s-color-base-content-primary);

  @include vertical-divider('s-divider-tertiary');
}

.account-group {
  display: flex;
  align-items: center;
  gap: $inner-spacing-mini;

  &-name {
    max-width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &-btn {
    @include copy-address;

    &.disconnect {
      color: var(--s-color-status-error);
    }
  }
}
</style>
