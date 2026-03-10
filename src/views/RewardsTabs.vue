<template>
  <div class="container rewards-tabs">
    <s-tabs class="rewards-tabs__tabs" :key="windowWidth" :value="currentTab" type="card" @input="handleChangeTab">
      <s-tab
        v-for="(rewardsTab, index) in rewardsTabsItems"
        :key="rewardsTab"
        :label="t(`rewards.${rewardsTabsItems[index]}`)"
        :name="rewardsTab"
      ></s-tab>
    </s-tabs>

    <router-view
      v-bind="{
        parentLoading: parentLoading,
        ...$attrs,
      }"
    ></router-view>
  </div>
</template>

<script lang="ts" setup>
import { computed, toRef } from 'vue';
import { useRoute } from 'vue-router';

import { useTranslation } from '@/composables/useTranslation';
import { RewardsTabsItems as RewardsTabsItemsEnum } from '@/consts';
import router from '@/router';
import store from '@/store';

defineOptions({
  name: 'RewardsTabs',
});

const props = withDefaults(
  defineProps<{
    parentLoading?: boolean;
  }>(),
  {
    parentLoading: false,
  }
);

const parentLoading = toRef(props, 'parentLoading');
const { t } = useTranslation();
const route = useRoute();

const rewardsTabsItems = Object.values(RewardsTabsItemsEnum);
const windowWidth = computed(() => store.state.settings.windowWidth as number);
const currentTab = computed(() => route.name as string);

const handleChangeTab = (name: string) => {
  router.push({ name });
};
</script>

<style lang="scss">
$rewards-tabs-height: 72px;
$tab-margin: 22px;

.rewards-tabs.container {
  .rewards-tabs__tabs {
    background-color: inherit;
    margin-left: -$tab-margin;
    margin-top: -$tab-margin;
    width: calc(100% + $tab-margin * 2);
    border-bottom-left-radius: 0 !important;
    border-bottom-right-radius: 0 !important;
    &,
    .el-tabs__header,
    .el-tabs__nav-wrap,
    .el-tabs__active-bar {
      border-top-right-radius: inherit;
      border-top-left-radius: inherit;
    }
    .el-tabs__header,
    .el-tabs__nav {
      width: 100%;
    }
    .el-tabs__header {
      margin: 0;
      position: relative;
      inset: 0;
    }
    .el-tabs__header .el-tabs {
      &__nav,
      &__nav-wrap,
      &__item {
        height: $rewards-tabs-height;
        line-height: $rewards-tabs-height;
      }
      &__nav {
        .el-tabs__item {
          width: 33.3%;
        }
      }
      &__nav-wrap {
        .el-tabs__item {
          text-overflow: ellipsis;
          overflow-x: hidden;
          &,
          &.is-active {
            border-radius: 0;
            @include page-header-title(true);
          }
          &:first-child,
          &:first-child.is-active {
            border-top-left-radius: var(--s-border-radius-big);
          }
          &:last-child {
            border-top-right-radius: var(--s-border-radius-big);
          }
        }
      }
    }
    & + * {
      padding-top: $inner-spacing-big;
      padding-bottom: 0;
    }
  }

  @include mobile(true) {
    #tab-Rewards,
    #tab-ReferralProgram,
    .el-tabs__nav > .el-tabs__item:nth-child(3),
    .el-tabs__nav > .el-tabs__item:nth-child(4) {
      font-size: var(--s-icon-font-size-medium) !important;
    }
  }
}
</style>
