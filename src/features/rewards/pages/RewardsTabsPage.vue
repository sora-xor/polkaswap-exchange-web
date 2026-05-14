<template>
  <div class="container rewards-tabs">
    <s-tabs
      class="rewards-tabs__tabs"
      :key="windowWidth"
      :value="currentTab"
      type="card"
      @update:model-value="handleChangeTab"
    >
      <s-tab
        v-for="(rewardsTab, index) in rewardsTabsItems"
        :key="rewardsTab"
        :label="t(`rewards.${rewardsTabsItems[index]}`)"
        :name="rewardsTab"
      ></s-tab>
    </s-tabs>

    <router-view
      v-bind="{
        parentLoading,
        ...$attrs,
      }"
    ></router-view>
  </div>
</template>

<script lang="ts" setup>
import { computed, toRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useTranslation } from '@/composables/useTranslation';
import { RewardsTabsItems as RewardsTabsItemsEnum } from '@/consts';
import { useSettingsStore } from '@/stores/settings';

defineOptions({
  name: 'RewardsTabsPage',
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
const router = useRouter();
const settingsStore = useSettingsStore();

const rewardsTabsItems = [
  RewardsTabsItemsEnum.PointSystem,
  RewardsTabsItemsEnum.Rewards,
  RewardsTabsItemsEnum.ReferralProgram,
];
const windowWidth = computed(() => settingsStore.windowWidth);
const currentTab = computed(() => route.name as string);

const handleChangeTab = async (name: string) => {
  await router.push({ name });
};
</script>

<style lang="scss">
$rewards-tabs-height: 64px;
$tab-margin: 22px;

.rewards-tabs.container {
  .rewards-tabs__tabs {
    background-color: rgba(255, 255, 255, 0.03);
    height: $rewards-tabs-height;
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
        display: flex;
        overflow: hidden;
        .el-tabs__item {
          align-items: center;
          box-sizing: border-box;
          display: flex;
          flex: 1 1 0;
          justify-content: center;
          min-width: 0;
          padding: 0 $inner-spacing-small;
          width: calc(100% / 3);
        }
      }
      &__nav-wrap {
        .el-tabs__item {
          color: var(--s-color-base-content-primary);
          font-size: 24px;
          font-weight: 500;
          opacity: 0.82;
          text-overflow: ellipsis;
          overflow-x: hidden;
          white-space: nowrap;
          &,
          &.is-active {
            border-radius: 0;
            letter-spacing: 0;
          }
          &.is-active {
            background-color: rgba(255, 255, 255, 0.04);
            color: var(--s-color-base-content-primary);
            opacity: 1;
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
    .rewards-tabs__tabs {
      height: 60px;

      .el-tabs__header .el-tabs {
        &__nav,
        &__nav-wrap,
        &__item {
          height: 60px;
          line-height: 60px;
        }
      }

      .el-tabs__header .el-tabs__nav-wrap .el-tabs__item {
        font-size: 18px !important;
        padding: 0 $inner-spacing-mini;
      }
    }
  }
}
</style>
