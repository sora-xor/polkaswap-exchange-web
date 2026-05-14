<template>
  <div v-if="address" class="account-panel">
    <div class="account-panel-divider"></div>

    <div class="account-group">
      <slot name="icon">
        <img v-if="icon" :src="icon" alt="provider icon" class="account-group-logo" />
        <wallet-avatar v-else :address="address" :size="18" class="account-gravatar"></wallet-avatar>
      </slot>
      <span v-if="name" class="account-group-name">
        {{ name }}
      </span>
      <formatted-address :value="address" :symbols="12" :tooltip-text="tooltip"></formatted-address>
    </div>

    <div class="account-group">
      <span v-button class="account-group-btn" @click="handleConnect">
        {{ t('changeAccountText') }}
      </span>
      <span v-button class="account-group-btn disconnect" @click="handleDisconnect">
        {{ t('disconnectWalletText') }}
      </span>
    </div>
  </div>

  <s-button
    v-else
    class="account-panel-button s-typography-button--large"
    data-test-name="connectPolkadot"
    type="primary"
    @click="handleConnect"
  >
    {{ t('connectWalletText') }}
  </s-button>
</template>

<script lang="ts" setup>
import { useTranslation } from '@/composables/useTranslation';
import WalletComponentWalletAvatar from '@/lib/soraneo-wallet/src/components/Account/WalletAvatar.vue';
import WalletComponentFormattedAddress from '@/lib/soraneo-wallet/src/components/shared/FormattedAddress.vue';

defineOptions({
  components: {
    WalletAvatar: WalletComponentWalletAvatar,
    FormattedAddress: WalletComponentFormattedAddress,
  },
});

const props = withDefaults(
  defineProps<{
    address?: string;
    name?: string;
    tooltip?: string;
    icon?: string;
  }>(),
  {
    address: '',
    name: '',
    tooltip: '',
    icon: '',
  }
);

const emit = defineEmits<{
  (e: 'connect'): void;
  (e: 'disconnect'): void;
}>();

const { t } = useTranslation();

function handleConnect(): void {
  emit('connect');
}

function handleDisconnect(): void {
  emit('disconnect');
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
@include full-width-button('account-panel-button', $inner-spacing-mini);

.account-panel-button.el-button.neumorphic {
  border-color: var(--s-color-base-border-secondary);
  box-shadow:
    1px 1px 5px 0px var(--s-shadow-color-light),
    -1px -1px 5px 0px var(--s-shadow-color-light);

  :deep(.s-button__text) {
    overflow: visible;
    text-overflow: clip;
    font-size: 22px !important;
    line-height: 22px !important;
    letter-spacing: -0.6px;
    font-variation-settings: 'wght' 700;
  }
}

.account-panel {
  display: flex;
  flex: 1;
  justify-content: space-between;
  flex-wrap: wrap;
  font-size: var(--s-font-size-mini);
  line-height: var(--s-line-height-medium);
  color: var(--s-color-base-content-primary);
}

.account-panel-divider {
  width: 100%;
  height: 1px;
  margin: $inner-spacing-mini 0;
  background-color: var(--s-color-base-border-secondary);
}

.account-group {
  display: flex;
  align-items: center;
  gap: $inner-spacing-mini;
  min-width: 0;

  &-logo {
    width: 18px;
    height: 18px;
    border-radius: 50%;
  }

  &-name {
    max-width: 64px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &-btn {
    @include copy-address;
    white-space: nowrap;

    &.disconnect {
      color: var(--s-color-status-error);
    }
  }
}

@media (max-width: 640px) {
  .account-panel {
    flex-direction: column;
    align-items: stretch;
    gap: $inner-spacing-mini;
  }

  .account-panel-divider {
    margin-bottom: 0;
  }

  .account-group {
    flex-wrap: wrap;
    row-gap: $basic-spacing-extra-mini;

    &-name {
      max-width: min(160px, 42vw);
    }
  }
}
</style>
