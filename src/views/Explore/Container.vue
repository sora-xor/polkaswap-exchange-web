<template>
  <div class="explore-container">
    <div class="explore-tabs-container">
      <s-tabs class="explore-tabs" type="rounded" :value="pageName" @input="handleTabChange">
        <s-tab v-for="tab in tabs" :key="tab.name" :name="tab.name" :label="tab.label"> </s-tab>
      </s-tabs>
    </div>

    <div class="container container--explore" v-loading="parentLoading">
      <generic-page-header :title="pageTitle" class="page-header-title--explore">
        <search-input
          autofocus
          class="explore-search"
          v-model="exploreQuery"
          :placeholder="t('searchText')"
          @clear="resetSearch"
        />
      </generic-page-header>

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
import router, { lazyComponent } from '@/router';
import { getter } from '@/store/decorators';
import storage from '@/utils/storage';

const storageKey = 'exploreAccountItems';

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    SearchInput: components.SearchInput,
  },
})
export default class ExploreContainer extends Mixins(mixins.LoadingMixin, TranslationMixin) {
  @getter.wallet.account.isLoggedIn private isLoggedIn!: boolean;

  exploreQuery = '';
  private isAccountItems = storage.get(storageKey) ? JSON.parse(storage.get(storageKey)) : false;

  get isAccountItemsOnly(): boolean {
    return this.isAccountItems;
  }

  set isAccountItemsOnly(value: boolean) {
    storage.set(storageKey, value);
    this.isAccountItems = value;
  }

  get tabs(): Array<{ name: string; label: string }> {
    return [
      PageNames.ExploreFarming,
      PageNames.ExplorePools,
      PageNames.ExploreStaking,
      PageNames.ExploreTokens,
      PageNames.ExploreBooks,
    ].map((name) => ({
      name,
      label: this.t(`pageTitle.${name}`),
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
    router.push({ name });
  }

  resetSearch(): void {
    this.exploreQuery = '';
  }
}
</script>

<style lang="scss">
.explore-tabs {
  .el-tabs__header {
    margin: 0 auto;
  }
}
</style>

<style lang="scss" scoped>
$container-max-width: 75vw;
$search-input-width: 290px;

.container--explore {
  display: flex;
  flex-flow: column nowrap;
  gap: $inner-spacing-medium;
  margin: $inner-spacing-big $inner-spacing-big 0;

  @include tablet {
    max-width: $container-max-width;
  }
}

.explore {
  &-container {
    display: flex;
    flex-flow: column nowrap;
    align-items: center;
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

.page-header-title--explore {
  justify-content: space-between;
  align-items: center;
}

.switcher {
  display: flex;
  align-items: center;

  & > span {
    margin-left: $inner-spacing-small;
  }
}
</style>
