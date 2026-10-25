<script setup lang="ts">
import { computed } from 'vue';
import { usePropTypeFilter } from '@soramitsu-ui/ui/composables/prop-type-filter';
import { resolveDynamicComponentTag } from '@/lib/soramitsu-ui/util';
import { IconBasicExternalLink24 } from '../icons';
import { LINK_ICON_POSITION_VALUES, LINK_UNDERLINE_TYPE_VALUES } from './consts';
import type { LinkIconPosition, LinkUnderlineType } from './types';

const props = withDefaults(
  defineProps<{
    underline?: LinkUnderlineType;
    iconPosition?: LinkIconPosition;
    icon?: boolean;
    tag?: string | object;
  }>(),
  {
    underline: 'solid',
    iconPosition: 'right',
    icon: true,
    tag: 'a',
  }
);

const propFilter = usePropTypeFilter(props);

const definitelyUnderlineType = propFilter('underline', LINK_UNDERLINE_TYPE_VALUES, 'solid');
const definitelyIconPosition = propFilter('iconPosition', LINK_ICON_POSITION_VALUES, 'right');
const resolvedTag = computed(() => resolveDynamicComponentTag(props.tag, 'a'));
</script>

<template>
  <component
    :is="resolvedTag"
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
