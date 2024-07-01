<template>
  <div class="explore-container">
    <div v-loading="parentLoading" class="container container--explore" :class="{ 'menu-collapsed': collapsed }">
      <div class="explore-container-dropdown s-flex">
        <responsive-tabs is-header :is-mobile="showDropdown" :tabs="tabs" :value="pageName" @input="handleTabChange" />
        <search-input
          autofocus
          class="explore-search"
          v-model="exploreQuery"
          :placeholder="t('searchText')"
          @clear="resetSearch"
        />
      </div>

      <div v-if="switcherAvailable" class="switcher">
        <s-switch v-model="isAccountItemsOnly" />
        <span>{{ t('explore.showOnly', { entities: t('explore.myPositions') }) }}</span>
      </div>

      <router-view
        v-bind="{
          exploreQuery,
          isAccountItemsOnly,
          parentLoading,
          ...$attrs,
        }"
        v-on="$listeners"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { mixins, components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { PageNames, Components } from '@/consts';
import { BreakpointClass } from '@/consts/layout';
import router, { lazyComponent } from '@/router';
import { getter, state } from '@/store/decorators';
import type { ResponsiveTab } from '@/types/tabs';
import storage from '@/utils/storage';

const storageKey = 'exploreAccountItems';

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    ResponsiveTabs: lazyComponent(Components.ResponsiveTabs),
    SearchInput: components.SearchInput,
  },
})
export default class ExploreContainer extends Mixins(mixins.LoadingMixin, TranslationMixin) {
  @getter.wallet.account.isLoggedIn private isLoggedIn!: boolean;
  @state.settings.screenBreakpointClass private screenBreakpointClass!: BreakpointClass;
  @state.settings.menuCollapsed collapsed!: boolean;

  exploreQuery = '';
  private isAccountItems = storage.get(storageKey) ? JSON.parse(storage.get(storageKey)) : false;

  get showDropdown(): boolean {
    return ![BreakpointClass.LargeDesktop, BreakpointClass.HugeDesktop].includes(this.screenBreakpointClass);
  }

  get isAccountItemsOnly(): boolean {
    return this.isAccountItems;
  }

  set isAccountItemsOnly(value: boolean) {
    storage.set(storageKey, value);
    this.isAccountItems = value;
  }

  get tabs(): Array<ResponsiveTab> {
    return [
      {
        name: PageNames.ExploreTokens,
        icon: 'finance-PSWAP-24',
      },
      {
        name: PageNames.ExploreFarming,
        icon: 'various-toy-horse-24',
      },
      {
        name: PageNames.ExplorePools,
        icon: 'basic-drop-24',
      },
      {
        name: PageNames.ExploreStaking,
        icon: 'basic-layers-24',
      },
      {
        name: PageNames.ExploreBooks,
        icon: 'music-CD-24',
      },
    ].map((el) => ({
      ...el,
      label: this.t(`pageTitle.${el.name}`),
    }));
  }

  get pageName(): string {
    return this.$route.name as string;
  }

  get pageTitle(): string {
    return this.t(`pageTitle.${this.pageName}`);
  }

  /** Shown only for logged in users and for any tab on page except Tokens */
  get switcherAvailable(): boolean {
    if (!this.isLoggedIn) return false;

    return [PageNames.ExploreFarming, PageNames.ExplorePools, PageNames.ExploreStaking].includes(
      this.pageName as PageNames
    );
  }

  handleTabChange(name: string): void {
    if (this.pageName === name) return;
    router.push({ name });
  }

  resetSearch(): void {
    this.exploreQuery = '';
  }
}
</script>

<style lang="scss" scoped>
$container-max: 100vw;
$shadow-width: 30px;
$container-shadow-paddings: 2 * $shadow-width;
$container-max-width: calc($container-max - $container-shadow-paddings - 2 * var(--sidebar-width));
$container-max-width--collapsed: calc($container-max - $container-shadow-paddings - 2 * $sidebar-collapsed-width);
$search-input-width: 290px;

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
    max-width: $search-input-width;
    margin-left: $inner-spacing-medium;

    .s-button--clear:focus {
      outline: none !important;
      i {
        @include focus-outline($inner: true, $borderRadius: 50%);
      }
    }
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
