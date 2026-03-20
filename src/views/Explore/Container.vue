<template>
  <div class="explore-container">
    <div v-loading="parentLoading" class="container container--explore" :class="{ 'menu-collapsed': collapsed }">
      <div class="explore-container-dropdown s-flex">
        <responsive-tabs
          is-header
          :is-mobile="showDropdown"
          :tabs="tabs"
          :model-value="pageName"
          @update:model-value="handleTabChange"
        ></responsive-tabs>
        <search-input
          autofocus
          class="explore-search"
          v-model="exploreQuery"
          :placeholder="t('searchText')"
          @clear="resetSearch"
        ></search-input>
      </div>

      <div v-if="switcherAvailable" class="switcher">
        <s-switch v-model="isAccountItemsOnly"></s-switch>
        <span>{{ t('explore.showOnly', { entities: t('explore.myPositions') }) }}</span>
      </div>

      <router-view
        v-bind="{
          exploreQuery,
          isAccountItemsOnly,
          parentLoading,
          ...$attrs,
        }"
      ></router-view>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { components } from '@wallet';
import { computed, ref, toRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useTranslation } from '@/composables/useTranslation';
import { PageNames, Components } from '@/consts';
import { BreakpointClass } from '@/consts/layout';
import store from '@/store';
import type { ResponsiveTab } from '@/types/tabs';
import storage from '@/utils/storage';
import { lazyComponent } from '@/router';

const props = withDefaults(
  defineProps<{
    parentLoading?: boolean;
  }>(),
  {
    parentLoading: false,
  }
);

defineOptions({
  name: 'ExploreContainer',
  inheritAttrs: false,
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    ResponsiveTabs: lazyComponent(Components.ResponsiveTabs),
    SearchInput: components.SearchInput,
  },
});

const parentLoading = toRef(props, 'parentLoading');
const storageKey = 'exploreAccountItems';
const routerInstance = useRouter();
const route = useRoute();
const { t } = useTranslation();

const collapsed = computed(() => Boolean(store.state?.settings?.menuCollapsed));
const screenBreakpointClass = computed(
  () => (store.state?.settings?.screenBreakpointClass as BreakpointClass | undefined) ?? BreakpointClass.Desktop
);
const isLoggedIn = computed(() => Boolean(store.getters?.wallet?.account?.isLoggedIn));

const exploreQuery = ref('');
const accountItems = ref<boolean>(
  (() => {
    const stored = storage.get(storageKey);
    return stored ? JSON.parse(stored) : false;
  })()
);

const showDropdown = computed(() => {
  return ![BreakpointClass.LargeDesktop, BreakpointClass.HugeDesktop].includes(screenBreakpointClass.value);
});

const isAccountItemsOnly = computed({
  get: () => accountItems.value,
  set: (value: boolean) => {
    storage.set(storageKey, value);
    accountItems.value = value;
  },
});

const pageName = computed(() => route.name as string);

const tabs = computed<ResponsiveTab[]>(() => {
  return [
    { name: PageNames.ExploreTokens, icon: 'finance-PSWAP-24' },
    { name: PageNames.ExploreFarming, icon: 'various-toy-horse-24' },
    { name: PageNames.ExplorePools, icon: 'basic-drop-24' },
    { name: PageNames.ExploreStaking, icon: 'basic-layers-24' },
    { name: PageNames.ExploreBooks, icon: 'music-CD-24' },
  ].map((tab) => ({
    ...tab,
    label: t(`pageTitle.${tab.name}`),
  }));
});

const switcherAvailable = computed(() => {
  if (!isLoggedIn.value) return false;

  return [PageNames.ExploreFarming, PageNames.ExplorePools, PageNames.ExploreStaking].includes(
    pageName.value as PageNames
  );
});

const handleTabChange = (name: string) => {
  if (pageName.value === name) return;
  routerInstance.push({ name });
};

const resetSearch = () => {
  exploreQuery.value = '';
};
</script>

<style lang="scss" scoped>
$container-max: 100vw;
$shadow-width: 30px;
$container-shadow-paddings: 2 * $shadow-width;
$container-max-width: calc($container-max - $container-shadow-paddings - 2 * var(--sidebar-width));
$container-max-width--collapsed: calc($container-max - $container-shadow-paddings - 2 * $sidebar-collapsed-width);

.container--explore {
  display: flex;
  flex-flow: column nowrap;
  gap: $inner-spacing-medium;
  margin: $inner-spacing-big $inner-spacing-big 0;

  @include tablet {
    width: 100%;
    max-width: $container-max-width;
    &.menu-collapsed {
      max-width: $container-max-width--collapsed;
    }
  }

  @include mobile(true) {
    width: 100%;
    max-width: 368px;
  }
}

.explore {
  &-container {
    display: flex;
    flex-flow: column nowrap;
    align-items: center;

    &-dropdown {
      justify-content: space-between;
      align-items: center;
    }
  }

  &-search {
    width: $explore-search-input-max-width;
    max-width: $explore-search-input-max-width;
    margin-left: $inner-spacing-medium;
    flex: 0 0 auto;

    .s-button--clear:focus {
      outline: none !important;
      i {
        @include focus-outline($inner: true, $borderRadius: 50%);
      }
    }
  }
}

:deep(.explore-search.s-input) {
  display: flex;
  width: auto;
  min-height: var(--s-size-big);
  padding: 8px 16px;
  border: 1px solid rgba(163, 164, 168, 0.6);
  background-color: var(--s-color-base-border-primary);
  box-shadow:
    1px 1px 5px rgb(255, 255, 255),
    -5px -5px 5px rgba(255, 255, 255, 0.5) inset,
    1px 1px 10px rgba(0, 0, 0, 0.1) inset;
  border-radius: 24px;
}

:deep(.explore-search.s-input .s-input__content) {
  width: 100%;
  min-height: 0;
  padding: 0;
  gap: 0;
}

:deep(.explore-search.s-input .s-input__input) {
  display: flex;
  align-items: center;
}

:deep(.explore-search.s-input .el-input__inner) {
  height: 21px;
  padding: 0 26px;
  line-height: 21px;
}

:deep(.container--explore .explore-table.s-table) {
  background: transparent;
  color: var(--s-color-base-content-primary);
  font-size: var(--s-font-size-medium);
  font-weight: 400;
}

:deep(.container--explore .explore-table.s-table .s-table__th) {
  height: 72px;
}

:deep(.container--explore .explore-table.s-table .s-table__header-cell) {
  text-transform: uppercase;
  font-size: var(--s-font-size-small);
  font-weight: 500;
  letter-spacing: var(--s-letter-spacing-mini);
}

:deep(.container--explore .explore-table.s-table .s-table__td) {
  height: 79px;
}

:deep(.container--explore .explore-table.s-table .s-table-cell-default) {
  height: 100%;
}

@include mobile(true) {
  :deep(.explore-search.s-input) {
    width: 170px;
    max-width: 170px;
  }
}

.switcher {
  display: flex;
  align-items: center;

  & > span {
    margin-left: $inner-spacing-small;
  }
}
</style>
