<template>
  <div
    class="route-assets-warning-message"
    :class="!isError ? 'route-assets-warning-message_valid' : 'route-assets-warning-message_invalid'"
  >
    <div>{{ text }}</div>
    <div>
      <s-icon class="icon-status" :name="!isError ? 'basic-check-marks-24' : 'basic-clear-X-xs-24'" />
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
@Component({})
export default class WarningMessage extends Vue {
  @Prop() text!: string;
  @Prop({ default: true }) isError!: boolean;
}
</script>

<style lang="scss">
.route-assets-warning-message {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  text-align: left;
  font-weight: 600;
  font-size: 8px;
  text-transform: uppercase;

  &_invalid {
    color: var(--s-color-status-error);
    fill: var(--s-color-status-error);
  }

  &_valid {
    color: var(--s-color-status-success);
    fill: var(--s-color-status-success);
  }

  i {
    font-size: 16px !important;
    color: inherit;
  }
}
</style>
