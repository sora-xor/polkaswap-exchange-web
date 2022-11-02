<template>
  <div class="explore-container">
    <s-tabs class="explore-tabs" type="rounded" :value="activeRouteName" @click="handleTabClick">
      <s-tab v-for="tab in tabs" :key="tab.name" :name="tab.name" :label="tab.label"> </s-tab>
    </s-tabs>

    <router-view v-bind="$attrs" v-on="$listeners" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import router from '@/router';
import { PageNames } from '@/consts';

@Component
export default class ExploreContainer extends Mixins(TranslationMixin) {
  get tabs() {
    return [PageNames.ExploreStaking, PageNames.ExploreFarming, PageNames.ExplorePools, PageNames.ExploreTokens].map(
      (name) => ({
        name,
        label: this.t(`pageTitle.${name}`),
      })
    );
  }

  get activeRouteName(): string {
    return this.$route.name as string;
  }

  handleTabClick({ name }): void {
    router.push({ name });
  }
}
</script>

<style lang="scss">
.explore-tabs {
  margin-top: $inner-spacing-big;

  .el-tabs__header {
    margin: 0 auto;
  }
}
</style>

<style lang="scss" scoped>
.explore-container {
  display: flex;
  flex-flow: column nowrap;
  align-content: center;
}
</style>
