<script lang="ts">
import { defineComponent, h } from 'vue';

import CalculatorIcon from './CalculatorIcon.vue';

export default defineComponent({
  name: 'CalculatorButton',
  compatConfig: {
    MODE: 3,
    COMPONENT_ASYNC: false,
  },
  emits: ['click'],
  methods: {
    handleClick(event: MouseEvent): void {
      this.$emit('click', event);
    },
  },
  render() {
    const slotContent = this.$slots.default?.();

    return h(
      'button',
      {
        type: 'button',
        class: 'calculator-button',
        onClick: this.handleClick,
      },
      [slotContent ?? null, h(CalculatorIcon, { class: 'calculator-button-icon' })]
    );
  },
});
</script>

<style lang="scss" scoped>
.calculator-button {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  color: var(--s-color-theme-accent);
  background: var(--s-color-utility-body);
  border: none;
  border-radius: calc(var(--s-border-radius-mini) / 2);
  font-size: var(--s-font-size-mini);
  font-weight: 400;
  line-height: var(--s-line-height-medium);
  padding: $inner-spacing-tiny $inner-spacing-mini;
  text-transform: uppercase;

  &-icon {
    fill: var(--s-color-theme-accent);
  }

  & > span + &-icon {
    margin-left: $inner-spacing-tiny;
  }

  @include focus-outline;
}
</style>
