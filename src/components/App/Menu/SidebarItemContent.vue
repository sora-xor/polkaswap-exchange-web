<template>
  <component :is="tag" :class="classes" :tabindex="tabindex" v-bind="attrs">
    <div class="icon-container">
      <span v-if="iconSrc" class="sidebar-item-content__logo" :style="logoStyle" :title="tooltip" aria-hidden="true" />
      <s-icon v-else :name="icon" :tooltip-text="tooltip" size="28"></s-icon>
      <span v-if="badge" class="sidebar-item-content__live-dot" aria-hidden="true" />
    </div>
    <span class="sidebar-item-content__label">
      <span class="sidebar-item-content__title">
        {{ title }}
        <strong v-if="badge" class="sidebar-item-content__badge">{{ badge }}</strong>
      </span>
      <small v-if="caption" class="sidebar-item-content__caption">{{ caption }}</small>
    </span>
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
  /** Short status pill shown next to the title, for example "Live". Empty hides the pill and the icon dot. */
  badge: {
    type: String,
    default: '',
  },
  /** One line of detail under the title. It never changes the height of the row. */
  caption: {
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
  const list = props.tag === 'a' ? [base, `${base}--link`] : [base];
  return props.badge ? [...list, `${base}--live`] : list;
});

/** The tooltip keeps the status readable when the label is hidden and only the icon shows. */
const tooltip = computed(() => [props.title, props.badge, props.caption].filter(Boolean).join(' · '));

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
  position: relative;
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
    min-width: 0;

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

.sidebar-item-content__title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  column-gap: 8px;
}

.sidebar-item-content__badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  padding: 1px 7px 1px 6px;
  white-space: nowrap;
  text-overflow: ellipsis;
  border-radius: 999px;
  background: var(--s-color-action-text);
  color: var(--s-color-base-on-accent);
  font-size: 10px;
  font-weight: 700;
  line-height: 14px;
  letter-spacing: 0.06em;
  text-transform: uppercase;

  &::before {
    content: '';
    flex: 0 0 6px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
    animation: sidebar-live-blink 1.8s ease-in-out infinite;
  }
}

.sidebar-item-content__caption {
  display: block;
  overflow: hidden;
  color: var(--s-color-base-content-secondary);
  font-size: 11px;
  font-weight: 500;
  line-height: 14px;
  font-variant-numeric: tabular-nums;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* The dot stands in for the pill wherever the label is hidden: the narrow rail and the collapsed sidebar. */
.sidebar-item-content__live-dot {
  display: none;
  position: absolute;
  top: 3px;
  inset-inline-end: 3px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--s-color-action-text);
  box-shadow: 0 0 0 2px var(--s-color-utility-body);

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: var(--s-color-action-text);
    animation: sidebar-live-ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
  }

  @include large-mobile {
    display: block;
  }

  @include tablet {
    display: none;
  }
}

@keyframes sidebar-live-blink {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.45;
    transform: scale(0.7);
  }
}

@keyframes sidebar-live-ping {
  0% {
    opacity: 0.7;
    transform: scale(1);
  }
  75%,
  100% {
    opacity: 0;
    transform: scale(2.6);
  }
}

@media (prefers-reduced-motion: reduce) {
  .sidebar-item-content__badge::before,
  .sidebar-item-content__live-dot::after {
    animation: none;
  }
}
</style>
