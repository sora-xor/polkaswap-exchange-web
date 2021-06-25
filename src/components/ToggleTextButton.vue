<template>
  <div class="toggle-text-button" v-bind="$attrs" v-on="$listeners">
    <span class="primary-text">{{ primaryText }}</span>
    <span class="secondary-text">{{ secondaryText }}</span>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'

@Component
export default class ToggleTextButton extends Vue {
  @Prop({ default: '', type: String }) primaryText!: string
  @Prop({ default: '', type: String }) secondaryText!: string
}
</script>

<style lang="scss" scoped>
.toggle-text-button {
  text-transform: unset;
  color: inherit;
  font-size: inherit;
  line-height: inherit;
  cursor: pointer;

  span {
    font-size: var(--s-font-size-mini);
    font-weight: 400 !important;
    line-height: var(--s-line-height-medium);
  }

  .secondary-text {
    display: none;
    text-decoration: underline;
  }

  &:hover {
    color: inherit;

    .primary-text {
      display: none;
    }

    .secondary-text {
      display: inline-block;
    }
  }
}
</style>
