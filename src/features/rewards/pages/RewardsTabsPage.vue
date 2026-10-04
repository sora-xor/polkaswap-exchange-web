<template>
  <div :class="['container', 'rewards-tabs', { 'container--rewards': isRewardsTab }]">
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
import { PageNames, RewardsTabsItems as RewardsTabsItemsEnum } from '@/consts';
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
/** The Rewards tab is a wide dashboard; Points and Referrals keep the narrow card. */
const isRewardsTab = computed(() => route.name === PageNames.Rewards);

const handleChangeTab = async (name: string) => {
  await router.push({ name });
};
</script>

<style lang="scss">
$rewards-tabs-height: 56px;
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
          font-size: 16px;
          font-weight: 700;
          line-height: 1.2;
          opacity: 0.72;
          text-overflow: ellipsis;
          overflow-x: hidden;
          text-transform: none;
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

  // Dashboard mode (Rewards tab): the page is as wide as the content area allows, the card chrome goes away and the
  // tabs become a floating pill. `container--` in the class name also lifts the app-wide 464px cap on `.container`.
  &.container--rewards {
    max-width: 1120px;
    min-height: 0;

    // From tablet up the sidebar sits on top of the page, so keep the dashboard clear of it on both sides.
    @include tablet {
      max-width: min(1120px, calc(100vw - 2 * var(--sidebar-width) - 48px));
    }

    padding: 0;
    border-radius: 0;
    background-color: transparent;
    box-shadow: none;
    transition: max-width 0.35s ease;

    .rewards-tabs__tabs {
      width: min(100%, 464px);
      height: 52px;
      margin: 0 auto;
      border: 1px solid var(--s-color-base-border-secondary);
      border-radius: 999px !important;
      background-color: var(--s-color-utility-surface);
      box-shadow: 0 10px 28px -14px rgba(42, 23, 31, 0.28);
      overflow: hidden;

      .el-tabs__header .el-tabs {
        &__nav,
        &__nav-wrap,
        &__item {
          height: 52px;
          line-height: 52px;
        }

        &__nav-wrap .el-tabs__item {
          position: relative;
          border-radius: 999px;
          transition:
            background-color 0.25s ease,
            color 0.25s ease;

          &:first-child,
          &:first-child.is-active,
          &:last-child {
            border-radius: 999px;
          }

          &:hover {
            opacity: 1;
          }

          &.is-active {
            background-color: color-mix(in srgb, var(--s-color-theme-accent) 12%, transparent);
            color: var(--s-color-base-content-primary);
          }
        }
      }
    }

    .rewards-tabs__tabs + * {
      padding-top: 20px;
    }
  }

  @include mobile(true) {
    .rewards-tabs__tabs {
      height: 52px;

      .el-tabs__header .el-tabs {
        &__nav,
        &__nav-wrap,
        &__item {
          height: 52px;
          line-height: 1.2;
        }
      }

      .el-tabs__header .el-tabs__nav-wrap .el-tabs__item {
        font-size: 14px !important;
        padding: 0 $inner-spacing-mini;
      }
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .rewards-tabs.container.container--rewards {
    transition: none;
  }
}
</style>
