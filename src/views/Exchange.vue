<template>
  <div class="exchange-container">
    <s-tabs type="rounded" :value="router.currentRoute.name" @click="handleTabClick">
      <s-tab
        v-for="tab in ExchangeTabs"
        :key="tab"
        :label="t(`exchange.${tab}`)"
        :name="tab"
      />
    </s-tabs>
    <router-view />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import router, { lazyComponent } from '@/router'
import { ExchangeTabs, PageNames } from '@/consts'

@Component
export default class Exchange extends Mixins(TranslationMixin) {
  readonly ExchangeTabs = ExchangeTabs
  readonly router = router

  handleTabClick ({ name }): void {
    if (router.currentRoute.name === name) {
      return
    }
    router.push({ name })
  }
}
</script>

<style lang="scss">
@import '../styles/layout';
@import '../styles/soramitsu-variables';

$tabs-class: ".el-tabs";
$tabs-container-height: $basic-spacing * 4;
$tabs-container-padding: 2px;
$tabs-item-height: $tabs-container-height - $tabs-container-padding * 2;

.exchange-container {
  .s-tabs {
    &#{$tabs-class} {
      #{$tabs-class}__header {
        width: 100%;
      }
    }
    #{$tabs-class} {
      &__header {
        #{$tabs-class}__nav-wrap #{$tabs-class}__item {
          padding-right: $inner-spacing-medium;
          padding-left: $inner-spacing-medium;
          &.is-active {
            margin: 0;
            box-shadow: $s-shadow-tab;
            &:hover {
              box-shadow: none;
            }
          }
          &:focus,
          &.is-focus {
            box-shadow: none;
            background-color: $s-color-base-background-hover;
          }
          &,
          &.is-active,
          &.is-focus {
            border-radius: $border-radius-small;
          }
        }
        #{$tabs-class}__item {
          height: $tabs-item-height;
          line-height: $tabs-item-height;
          &:hover {
            background-color: $s-color-base-background-hover;
          }
        }
      }
      &__nav-wrap {
        height: $tabs-container-height;
        padding: $tabs-container-padding;
        background-color: $s-color-base-background;
        border-radius: $border-radius-small;
      }
    }
  }
  #{$tabs-class} {
    &__header {
      margin-bottom: $inner-spacing-mini;
    }
    &__nav {
      width: 100%;
    }
    &__item {
      width: 50%;
      text-align: center;
    }
  }
}
</style>

<style lang="scss" scoped>
@import '../styles/layout';
@import '../styles/soramitsu-variables';

.exchange-container {
  margin: $inner-spacing-big auto;
  padding: $inner-spacing-medium $inner-spacing-medium $inner-spacing-big;
  min-height: $inner-window-height;
  width: $inner-window-width;
  background-color: $s-color-utility-surface;
  border-radius: $border-radius-medium;
  box-shadow: $s-shadow-surface;
  color: $s-color-base-content-primary;
  .s-tabs {
    width: 100%;
  }
}
</style>
