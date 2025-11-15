<script setup lang="ts">
import { usePropTypeFilter } from '@/composables/prop-type-filter'
import { IconBasicExternalLink24 } from '../icons'
import { LINK_ICON_POSITION_VALUES, LINK_UNDERLINE_TYPE_VALUES } from './consts'
import type { LinkIconPosition, LinkUnderlineType } from './types'

const props = withDefaults(
  defineProps<{
    underline?: LinkUnderlineType
    iconPosition?: LinkIconPosition
    icon?: boolean
    tag?: string | object
  }>(),
  {
    underline: 'solid',
    iconPosition: 'right',
    icon: true,
    tag: 'a',
  },
)

const propFilter = usePropTypeFilter(props)

const definitelyUnderlineType = propFilter('underline', LINK_UNDERLINE_TYPE_VALUES, 'solid')
const definitelyIconPosition = propFilter('iconPosition', LINK_ICON_POSITION_VALUES, 'right')
</script>

<template>
  <component
    :is="tag"
    :class="[
      's-link',
      `s-link_type_${definitelyUnderlineType}`,
      `s-link_icon-position_${definitelyIconPosition}`,
      'sora-tpg-p3',
    ]"
  >
    <span>
      <slot />
    </span>
    <template v-if="icon">
      <slot name="icon" :class="'s-link__icon'">
        <IconBasicExternalLink24 class="s-link__icon" data-testid="icon" />
      </slot>
    </template>
  </component>
</template>

<style lang="scss">
@use '@/theme';

.s-link {
  @apply cursor-pointer inline-flex items-center text-status-info;
  color: theme.token-as-var('sys.color.status.info');
  $component: &;

  &:hover {
    text-decoration: none;
  }

  &_type {
    &_solid {
      text-decoration: underline;
    }

    &_dotted {
      text-decoration: underline dotted;
    }
  }

  &_icon-position_left {
    @apply flex-row-reverse;

    #{$component}__icon {
      @apply mr-5px;
    }
  }

  &_icon-position_right {
    @apply flex-row;

    #{$component}__icon {
      @apply ml-5px;
    }
  }

  &__icon {
    fill: currentColor;
    height: calc(1em + 2px);
    width: calc(1em + 2px);
  }
}
</style>
