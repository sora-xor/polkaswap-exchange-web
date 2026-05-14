<template>
  <div class="s-input-container">
    <s-input :placeholder="t(translation)" :value="formattedAddress" readonly tabindex="-1"></s-input>
    <s-button
      class="s-button--copy"
      :class="{ 'with-dropdown': hasExplorerLinks }"
      icon="basic-copy-24"
      :tooltip="copyTooltip(t(translation))"
      :aria-label="copyTooltip(t(translation))"
      type="action"
      alternative
      @click="handleCopyAddress(formattedValue, $event)"
    ></s-button>
    <s-dropdown
      v-if="hasExplorerLinks"
      class="s-dropdown-menu"
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

const displayValue = computed(() => props.hash || formattedValue.value);

const explorerLinks = computed<ExplorerLink[]>(() => {
  if (isEthHash.value) return [];

  const baseLinks = getExplorerLinks(soraNetwork.value);
  if (!baseLinks.length) return [];

  switch (props.type) {
    case HashType.Account:
      return baseLinks
        .filter(({ type }) => type !== ExplorerType.Polkadot)
        .map(({ type, value }) => ({
          type,
          value:
            type === ExplorerType.Sorametrics
              ? getSorametricsAccountLink(formattedValue.value)
              : `${value}/${props.type}/${formattedValue.value}`,
        }));
    case HashType.Block:
      return baseLinks.map(({ type, value }) => {
        const link: ExplorerLink = { type, value: '' };

        if (type === ExplorerType.Polkadot) {
          link.value = `${value}/${formattedValue.value}`;
        } else if (type === ExplorerType.Sorametrics) {
          link.value = getSorametricsBlockLink(formattedValue.value);
        } else {
          link.value = `${value}/${props.type}/${formattedValue.value}`;
        }

        return link;
      });
    case HashType.ID:
      return baseLinks
        .map(({ type, value }) => {
          const link: ExplorerLink = { type, value: '' };

          if (type === ExplorerType.Sorametrics) {
            link.value = getSorametricsTransactionLink(props.value);
          } else if (type === ExplorerType.Sorascan) {
            link.value = `${value}/transaction/${props.value}`;
          } else if (type === ExplorerType.Subscan) {
            if (props.value.startsWith('0x')) {
              link.value = `${value}/extrinsic/${props.value}`;
            }
          } else if (props.block) {
            link.value = `${value}/${props.block}`;
          }

          return link;
        })
        .filter((entry) => Boolean(entry.value));
    default:
      return [];
  }
});

const hasExplorerLinks = computed(() => isEthHash.value || explorerLinks.value.length > 0);

const formattedAddress = computed(() => formatAddress(displayValue.value, 24));

const etherscanLink = computed(() => {
  const path = props.type === HashType.EthAccount ? 'address' : 'tx';
  const base = soraNetwork.value !== SoraNetwork.Prod ? 'sepolia.' : '';

  return `https://${base}etherscan.io/${path}/${props.value}`;
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
$dropdown-right: 15px;
$dropdown-width: var(--s-size-mini);

.s-input-container {
  position: relative;
  + .s-input-container {
    margin-top: var(--s-basic-spacing);
  }
  .s-dropdown-menu {
    position: absolute;
    z-index: 1;
    top: 0;
    right: $dropdown-right;
    bottom: 0;
    margin-top: auto;
    margin-bottom: auto;
    width: $dropdown-width;
    height: var(--s-size-mini);
    line-height: 1;
  }
  .s-button--copy {
    position: absolute;
    top: 0;
    bottom: 0;
    margin-top: auto;
    margin-bottom: auto;
    right: $dropdown-right;
    z-index: 1;
    &,
    &:hover,
    &:focus,
    &:active {
      background-color: transparent;
      border-color: transparent;
    }
    &.with-dropdown {
      right: calc(#{$dropdown-right} + #{$dropdown-width} + #{$basic-spacing-mini});
    }
  }
}

.transaction-link {
  color: inherit;
  text-decoration: none;
}
</style>
