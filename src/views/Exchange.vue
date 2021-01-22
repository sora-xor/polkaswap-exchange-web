<template>
  <div class="container" v-loading="parentLoading">
    <s-tabs class="s-tabs--exchange" type="rounded" :value="router.currentRoute.name" @click="handleTabClick">
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
import { Component, Mixins, Prop } from 'vue-property-decorator'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import router from '@/router'
import { ExchangeTabs } from '@/consts'

@Component
export default class Exchange extends Mixins(TranslationMixin) {
  readonly ExchangeTabs = ExchangeTabs
  readonly router = router

  @Prop({ type: Boolean, default: false }) readonly parentLoading!: boolean

  handleTabClick ({ name }): void {
    if (router.currentRoute.name === name) {
      return
    }
    router.push({ name })
  }
}
</script>

<style lang="scss">
$tabs-class: ".el-tabs";
$tabs-container-height: $basic-spacing * 4;
$tabs-container-padding: 2px;
$tabs-item-height: $tabs-container-height - $tabs-container-padding * 2;

.container {
  .s-tabs.s-tabs--exchange {
    &#{$tabs-class} {
      #{$tabs-class}__header {
        margin-bottom: $inner-spacing-mini;
        width: 100%;
      }
    }
    #{$tabs-class} {
      &__header {
        #{$tabs-class}__nav-wrap #{$tabs-class}__item {
          padding-right: $inner-spacing-medium;
          padding-left: $inner-spacing-medium;
          &.is-active {
            box-shadow: var(--s-shadow-tab);
          }
          &:hover {
            box-shadow: none;
            border-radius: var(--s-border-radius-small);
          }
        }
        #{$tabs-class}__item {
          height: $tabs-item-height;
          width: 50%;
          line-height: $tabs-item-height;
          font-feature-settings: $s-font-feature-settings-title;
          @include font-weight(700, true);
          text-align: center;
          &:hover {
            background-color: var(--s-color-base-background-hover);
          }
        }
      }
      &__nav {
        width: 100%;
        &-wrap {
          height: $tabs-container-height;
          background-color: var(--s-color-base-background);
        }
      }
    }
  }
}
</style>

<style lang="scss" scoped>
.container {
  .s-tabs {
    width: 100%;
  }
}
</style>
