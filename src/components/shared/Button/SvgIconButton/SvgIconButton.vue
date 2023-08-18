<template>
  <s-button :class="['svg-icon-button', { 's-pressed': active }]" type="action" v-bind="$attrs" v-on="$listeners">
    <component :is="icon" :class="{ active }" />
  </s-button>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

import { SvgIcons } from './icons';

const components = {
  [SvgIcons.LineIcon]: () => import('./Icons/Line.vue'),
  [SvgIcons.CandleIcon]: () => import('./Icons/Candle.vue'),
};

@Component({
  components,
})
export default class SvgIconButton extends Vue {
  @Prop({ default: false, type: Boolean }) readonly active!: boolean;
  @Prop({ default: '', type: String }) readonly icon!: SvgIcons;
}
</script>

<style lang="scss">
.svg-icon-button {
  svg {
    & > path {
      fill: var(--s-color-base-content-tertiary);
    }

    &.active {
      & > path {
        fill: var(--s-color-theme-accent);
      }
    }
  }
}
</style>
