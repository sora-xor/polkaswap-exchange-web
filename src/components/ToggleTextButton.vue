<template>
  <s-button class="toggle-text-button" v-bind="$attrs" v-on="$listeners">
    <span class="primary-text">{{ primaryText }}</span>
    <span class="secondary-text">{{ secondaryText }}</span>
  </s-button>
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
  padding: 0;
  color: inherit;
  font-size: inherit;
  line-height: inherit;

  .secondary-text {
    display: none;
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

  &[type="link"]:hover .secondary-text {
    text-decoration: underline;
  }
}
</style>
