<template>
  <div :class="['transaction-hash-view', { 'transaction-hash-view--with-menu': hasExplorerLinks }]">
    <s-input
      class="transaction-hash-view__input"
      :placeholder="t(translation)"
      :value="formattedAddress"
      readonly
      tabindex="-1"
    ></s-input>
    <s-button
      class="transaction-hash-view__copy"
      :class="{ 'with-dropdown': hasExplorerLinks }"
      icon="basic-copy-24"
      size="small"
      :tooltip="copyTooltip(t(translation))"
      :aria-label="copyTooltip(t(translation))"
      type="action"
      alternative
      @click="handleCopyAddress(formattedValue, $event)"
    ></s-button>
    <s-dropdown
      v-if="hasExplorerLinks"
      class="transaction-hash-view__menu"
      border-radius="mini"
      type="ellipsis"
      icon="basic-more-vertical-24"
      placement="bottom-end"
      @select="isEthHash ? handleOpenEtherscan() : undefined"
    >
      <template #menu>
        <a v-if="isEthHash" class="transaction-link" :href="etherscanLink" target="_blank" rel="nofollow noopener">
          <s-dropdown-item class="s-dropdown-menu__item">
            {{ t('transaction.viewIn', { explorer: TranslationConsts.Etherscan }) }}
          </s-dropdown-item>
        </a>
        <template v-else>
          <a
            v-for="link in explorerLinks"
            :key="link.type"
            class="transaction-link"
            :href="link.value"
            target="_blank"
            rel="nofollow noopener"
          >
            <s-dropdown-item class="s-dropdown-menu__item">
              {{ t('transaction.viewIn', { explorer: getExplorerTranslation(link.type) }) }}
            </s-dropdown-item>
          </a>
        </template>
      </template>
    </s-dropdown>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

import { useCopyAddress } from '@/composables/useCopyAddress';
import { useTranslation } from '@/composables/useTranslation';
import { HashType, ExplorerType, SoraNetwork, type ExplorerLink } from '@/consts';
import { useSettingsStore } from '@/stores/settings';
import {
  formatAddress,
  formatAccountAddress,
  getExplorerLinks,
  getSorametricsAccountLink,
  getSorametricsBlockLink,
  getSorametricsTransactionLink,
} from '@/util';

const props = withDefaults(
  defineProps<{
    value: string;
    type: HashType;
    translation: string;
    hash?: string;
    block?: string;
  }>(),
  {
    hash: '',
    block: '',
  }
);

const { t, TranslationConsts } = useTranslation();
const settingsStore = useSettingsStore();
const { copyTooltip, handleCopyAddress } = useCopyAddress();

const soraNetwork = computed<SoraNetwork>(() => settingsStore.soraNetwork ?? SoraNetwork.Dev);

const isEthHash = computed(() => [HashType.EthAccount, HashType.EthTransaction].includes(props.type));

const formattedValue = computed(() => {
  if (props.type === HashType.Account) {
    return formatAccountAddress(props.value);
  }

  return props.value;
});

const explorerValue = computed(() => formattedValue.value.trim());
const displayValue = computed(() => props.hash || formattedValue.value);

const encodeExplorerPath = (value: string): string => encodeURIComponent(value);

const explorerLinks = computed<ExplorerLink[]>(() => {
  if (isEthHash.value || !explorerValue.value) return [];

  const baseLinks = getExplorerLinks(soraNetwork.value);
  if (!baseLinks.length) return [];

  const value = explorerValue.value;

  switch (props.type) {
    case HashType.Account:
      return baseLinks
        .filter(({ type }) => type !== ExplorerType.Polkadot)
        .map(({ type, value: explorerUrl }) => ({
          type,
          value:
            type === ExplorerType.Sorametrics
              ? getSorametricsAccountLink(value)
              : `${explorerUrl}/${props.type}/${encodeExplorerPath(value)}`,
        }));
    case HashType.Block:
      return baseLinks.map(({ type, value: explorerUrl }) => {
        const link: ExplorerLink = { type, value: '' };

        if (type === ExplorerType.Polkadot) {
          link.value = `${explorerUrl}/${encodeExplorerPath(value)}`;
        } else if (type === ExplorerType.Sorametrics) {
          link.value = getSorametricsBlockLink(value);
        } else {
          link.value = `${explorerUrl}/${props.type}/${encodeExplorerPath(value)}`;
        }

        return link;
      });
    case HashType.ID:
      return baseLinks
        .map(({ type, value: explorerUrl }) => {
          const link: ExplorerLink = { type, value: '' };
          const block = props.block.trim();

          if (type === ExplorerType.Sorametrics) {
            link.value = getSorametricsTransactionLink(value);
          } else if (type === ExplorerType.Sorascan) {
            link.value = `${explorerUrl}/transaction/${encodeExplorerPath(value)}`;
          } else if (type === ExplorerType.Subscan) {
            if (value.startsWith('0x')) {
              link.value = `${explorerUrl}/extrinsic/${encodeExplorerPath(value)}`;
            }
          } else if (block) {
            link.value = `${explorerUrl}/${encodeExplorerPath(block)}`;
          }

          return link;
        })
        .filter((entry) => Boolean(entry.value));
    default:
      return [];
  }
});

const hasEthExplorerLink = computed(() => isEthHash.value && Boolean(props.value.trim()));
const hasExplorerLinks = computed(() => hasEthExplorerLink.value || explorerLinks.value.length > 0);

const formattedAddress = computed(() => formatAddress(displayValue.value, 24));

const etherscanLink = computed(() => {
  const path = props.type === HashType.EthAccount ? 'address' : 'tx';
  const base = soraNetwork.value !== SoraNetwork.Prod ? 'sepolia.' : '';

  return `https://${base}etherscan.io/${path}/${encodeExplorerPath(props.value.trim())}`;
});

const getExplorerTranslation = (type: ExplorerType) => {
  switch (type) {
    case ExplorerType.Polkadot:
      return TranslationConsts.Polkadot;
    case ExplorerType.Sorascan:
      return TranslationConsts.SORAScan;
    case ExplorerType.Sorametrics:
      return TranslationConsts.SoraMetrics;
    case ExplorerType.Subscan:
      return TranslationConsts.Subscan;
    default:
      return '';
  }
};

const handleOpenEtherscan = () => {
  if (!hasEthExplorerLink.value) return;

  const win = window.open(etherscanLink.value, '_blank', 'noopener,noreferrer');
  if (win) {
    win.opener = null;
    win.focus();
  }
};

defineExpose({
  handleCopyAddress,
  copyTooltip,
  getExplorerTranslation,
  handleOpenEtherscan,
});
</script>

<style scoped lang="scss">
$action-gap: #{$basic-spacing-mini};
$action-inset: #{$basic-spacing-medium};
$action-size: var(--s-size-small);

.transaction-hash-view {
  position: relative;

  + .transaction-hash-view {
    margin-top: var(--s-basic-spacing);
  }

  &__input.s-input {
    background-color: var(--s-color-utility-body);
    border-radius: var(--s-border-radius-small);
    box-shadow: var(--s-shadow-element-pressed);
    color: var(--s-color-base-content-primary);

    :deep(.s-input__content) {
      min-height: var(--s-size-medium);
      padding: 0 calc(#{$action-inset} + #{$action-size} + #{$action-gap}) 0 #{$basic-spacing-medium};
    }

    :deep(.el-input__inner) {
      font-size: var(--s-font-size-medium);
      font-weight: 600;
      line-height: var(--s-line-height-small);
      text-overflow: ellipsis;
    }
  }

  &--with-menu &__input.s-input {
    :deep(.s-input__content) {
      padding-right: calc(#{$action-inset} + #{$action-size} + #{$action-size} + #{$action-gap});
    }
  }

  :deep(.transaction-hash-view__copy),
  :deep(.transaction-hash-view__menu) {
    position: absolute;
    z-index: 1;
    top: 0;
    bottom: 0;
    margin-top: auto;
    margin-bottom: auto;
    width: $action-size;
    height: $action-size;
    line-height: 1;
    color: var(--s-color-base-content-tertiary);
  }

  :deep(.transaction-hash-view__copy) {
    right: $action-inset;
    padding: 0;

    .s-button__icon {
      margin-right: 0;
    }

    &.with-dropdown {
      right: calc(#{$action-inset} + #{$action-size} + #{$action-gap});
    }
  }

  :deep(.transaction-hash-view__menu) {
    right: $action-inset;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
    padding: 0;
    border-radius: var(--s-border-radius-small);
  }
}

:global(:root[data-theme='dark'] .transaction-hash-view__input.s-input),
:global(.sora-theme-provider[data-theme='dark'] .transaction-hash-view__input.s-input),
:global([design-system-theme='dark'] .transaction-hash-view__input.s-input) {
  background-color: var(--s-color-base-on-accent);
}

.transaction-link {
  color: inherit;
  text-decoration: none;
}
</style>
