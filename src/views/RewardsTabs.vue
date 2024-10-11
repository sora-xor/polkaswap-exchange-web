<template>
  <div class="container rewards-tabs">
    <s-tabs class="rewards-tabs__tabs" :key="windowWidth" :value="currentTab" type="card" @input="handleChangeTab">
      <s-tab
        v-for="rewardsTab in RewardsTabsItems"
        :key="rewardsTab"
        :label="t(`rewards.${rewardsTab}`)"
        :name="rewardsTab"
      />
    </s-tabs>

    <router-view
      v-bind="{
        parentLoading: parentLoading,
        ...$attrs,
      }"
      v-on="$listeners"
    />
  </div>
</template>

<script lang="ts">
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { RewardsTabsItems } from '@/consts';
import router from '@/router';
import { state } from '@/store/decorators';

@Component
export default class RewardsTabs extends Mixins(mixins.LoadingMixin, TranslationMixin) {
  readonly RewardsTabsItems = RewardsTabsItems;

  @state.settings.windowWidth windowWidth!: number;

  get currentTab(): string {
    return this.$route.name as string;
  }

  handleChangeTab(name: string): void {
    router.push({ name });
  }
}
</script>

<style lang="scss">
$rewards-tabs-height: 72px;

.rewards-tabs.container {
  .rewards-tabs__tabs {
    background-color: inherit;
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
            @include page-header-title(true);
            border-top-right-radius: 0;
            border-top-left-radius: inherit;
          }
          &:last-child {
            border-top-right-radius: inherit;
            border-top-left-radius: 0;
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
    #tab-Rewards {
      font-size: var(--s-icon-font-size-medium);
    }

    #tab-ReferralProgram {
      font-size: var(--s-icon-font-size-medium);
    }
  }
}
</style>
