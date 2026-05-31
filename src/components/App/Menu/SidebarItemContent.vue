<template>
  <component :is="tag" :class="classes" :tabindex="tabindex" v-bind="attrs">
    <div class="icon-container">
      <span
        v-if="iconSrc"
        class="sidebar-item-content__logo"
        :style="logoStyle"
        :title="title"
        aria-hidden="true"
      />
      <s-icon v-else :name="icon" :tooltip-text="title" size="28"></s-icon>
    </div>
    <span>{{ title }}</span>
  </component>
</template>

<script lang="ts" setup>
import { computed, useAttrs } from 'vue';

const props = defineProps({
  icon: {
    type: String,
    default: '',
  },
  iconSrc: {
    type: String,
    default: '',
  },
  title: {
    type: String,
    default: '',
  },
  tag: {
    type: String,
    default: 'div',
  },
  tabindex: {
    type: [String, Number],
    default: undefined,
  },
});

const attrs = useAttrs();

const classes = computed(() => {
  const base = 'sidebar-item-content';
  return props.tag === 'a' ? [base, `${base}--link`] : [base];
});

const logoStyle = computed(() => ({
  '--sidebar-item-logo': `url(${props.iconSrc})`,
}));
</script>

<style lang="scss" scoped>
$icon-size: 42px;

.sidebar-item-content {
  display: flex;
  align-items: center;
  border-color: currentColor;

  span {
    border-color: currentColor;
  }

  &--link {
    &,
    &:hover,
    &:focus,
    &:visited {
      text-decoration: none;
      color: inherit;
    }
  }
}

.icon-container {
  display: flex;
  flex-shrink: 0;
  padding-left: 1px; // because of inset shadow
  width: $icon-size;
  height: $icon-size;
  border-radius: 50%;
  background-color: var(--s-color-utility-body);
  border-color: currentColor;
  transition: var(--s-transition-default);
  :deep(i) {
    margin: auto;
    @include icon-styles(true);
    font-size: 28px !important;
    line-height: 28px !important;
    width: 28px !important;
    height: 28px !important;
    border-color: currentColor;
  }
  .sidebar-item-content__logo {
    display: block;
    width: 28px;
    height: 28px;
    margin: auto;
    background-color: var(--s-color-base-content-tertiary);
    mask: var(--sidebar-item-logo) center / contain no-repeat;
    -webkit-mask: var(--sidebar-item-logo) center / contain no-repeat;
    transition: background-color var(--s-transition-default);
  }
  & + span {
    margin-left: $inner-spacing-small;

    @include large-mobile {
      display: none;
    }

    @include tablet {
      display: block;
    }
  }
  .el-menu-item.is-active & {
    box-shadow:
      -1px -1px 1px var(--s-shadow-color-dark-light),
      1px 1px 3px var(--s-shadow-color-dark),
      inset 1px 1px 2px var(--s-shadow-color-light-dark);

    .sidebar-item-content__logo {
      background-color: var(--s-color-theme-accent);
    }
  }
  .el-menu-item:not(.is-active):not(.is-disabled):hover &,
  .el-menu-item:not(.is-active):not(.is-disabled):focus & {
    .sidebar-item-content__logo {
      background-color: var(--s-color-base-content-secondary);
    }
  }
  .menu-item--small & {
    margin-right: 0;
    background-color: transparent;
    box-shadow: none;
  }
}
</style>
