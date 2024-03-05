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
export default class LinksDropdown extends Mixins(TranslationMixin) {
  @Prop({ default: () => [], type: Array }) readonly links!: Array<WALLET_CONSTS.ExplorerLink>;
}
</script>

<style lang="scss">
.s-dropdown--hash-menu {
  margin-top: auto;
  margin-bottom: auto;
  padding: 0;
  width: var(--s-size-mini);
  height: var(--s-size-mini);
  line-height: 1;

  display: block;
  text-align: center;
  font-size: var(--s-size-mini);

  &,
  .el-tooltip {
    &:focus {
      @include focus-outline($inner: true, $borderRadius: 50%);
    }
  }
}
</style>

<style lang="scss" scoped>
.transaction-link {
  color: inherit;
  text-decoration: none;
}
</style>
