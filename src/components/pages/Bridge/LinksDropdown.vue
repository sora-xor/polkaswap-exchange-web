<template>
  <s-dropdown
    class="s-dropdown--hash-menu"
    borderRadius="mini"
    type="ellipsis"
    icon="basic-more-vertical-24"
    placement="bottom-end"
  >
    <template slot="menu">
      <a
        v-for="link in links"
        :key="link.type"
        :href="link.value"
        class="transaction-link"
        target="_blank"
        rel="nofollow noopener"
      >
        <s-dropdown-item class="s-dropdown-menu__item">
          {{ t('transaction.viewIn', { explorer: link.type }) }}
        </s-dropdown-item>
      </a>
    </template>
  </s-dropdown>
</template>

<script lang="ts">
import { WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';

@Component
export default class BridgeLinksDropdown extends Mixins(TranslationMixin) {
  @Prop({ default: () => [], type: Array }) readonly links!: Array<WALLET_CONSTS.ExplorerLink>;
}
</script>

<style lang="scss">
.s-dropdown--hash-menu {
  position: absolute;
  z-index: $app-content-layer;
  top: 0;
  bottom: 0;
  margin-top: auto;
  margin-bottom: auto;
  padding: 0;
  width: var(--s-size-mini);
  height: var(--s-size-mini);
  line-height: 1;

  display: block;
  text-align: center;
  font-size: var(--s-size-mini);

  right: $inner-spacing-medium;
  &,
  .el-tooltip {
    &:focus {
      outline: auto;
    }
  }

  // TODO: fix UI library
  .s-dropdown-menu__item {
    border-radius: calc(var(--s-border-radius-mini) / 2);
  }

  .transaction-link {
    color: inherit;
    text-decoration: none;
  }
}
</style>
