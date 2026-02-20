<template>
  <component :is="tag" :class="classes" :tabindex="tabindex" v-bind="attrs">
    <div class="icon-container">
      <s-icon :name="icon" :tooltip-text="title" size="28"></s-icon>
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
</script>

<style lang="scss" scoped>
$icon-size: 42px;

.sidebar-item-content {
  display: flex;
  align-items: center;

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
  // Polkaswap uses a subtle neumorphic ring on every sidebar icon so the
  // circular buttons remain visible even when the menu background matches
  // `--s-color-utility-body`.
  box-shadow:
    1px 1px 5px 0px var(--s-shadow-color-light),
    -5px -5px 5px 0px inset rgba(255, 255, 255, 0.5),
    1px 1px 10px 0px inset var(--s-shadow-color-dark);
  transition: var(--s-transition-default);
  > i {
    margin: auto;
    @include icon-styles(true);
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
  .menu-item--small & {
    margin-right: 0;
    background-color: transparent;
    box-shadow: none;
  }
}
</style>
