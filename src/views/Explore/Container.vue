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

      <router-view
        v-bind="{
          exploreQuery,
          parentLoading,
          ...$attrs,
        }"
        v-on="$listeners"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { mixins, components } from '@soramitsu/soraneo-wallet-web';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import router, { lazyComponent } from '@/router';
import { PageNames, Components } from '@/consts';

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    SearchInput: components.SearchInput,
  },
})
export default class ExploreContainer extends Mixins(mixins.LoadingMixin, TranslationMixin) {
  exploreQuery = '';

  get tabs(): Array<{ name: string; label: string }> {
    return [PageNames.ExploreFarming, PageNames.ExplorePools, PageNames.ExploreStaking, PageNames.ExploreTokens].map(
      (name) => ({
        name,
        label: this.t(`pageTitle.${name}`),
      })
    );
  }

  get pageName(): string {
    return this.$route.name as string;
  }

  get pageTitle(): string {
    return this.t(`pageTitle.${this.pageName}`);
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
  &-container {
    margin-top: $inner-spacing-big;
    min-height: var(--s-size-small);
  }

  .el-tabs__header {
    margin: 0 auto;
  }
}
</style>

<style lang="scss" scoped>
$container-max-width: 75vw;
$container-min-width: $breakpoint_mobile;
$search-input-width: 290px;

.container--explore {
  max-width: $container-max-width;
  min-width: $container-min-width;
  margin: $inner-spacing-big $inner-spacing-big 0;
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
</style>
