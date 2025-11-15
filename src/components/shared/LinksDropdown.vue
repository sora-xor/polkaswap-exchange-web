<template>
  <s-dropdown
    class="s-dropdown--hash-menu"
    border-radius="mini"
    type="ellipsis"
    icon="basic-more-vertical-24"
    placement="bottom-end"
  >
    <template #menu>
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

<script lang="ts" setup>
import { computed } from 'vue';
import { WALLET_CONSTS } from '@wallet';

import { useTranslation } from '@/composables/useTranslation';

const props = withDefaults(
  defineProps<{
    links?: Array<WALLET_CONSTS.ExplorerLink>;
  }>(),
  {
    links: () => [],
  }
);

const { t } = useTranslation();

const links = computed(() => props.links);

defineExpose({
  links,
});
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
