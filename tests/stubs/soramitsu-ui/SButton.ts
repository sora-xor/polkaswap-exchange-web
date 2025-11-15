import { defineComponent, h } from 'vue';

const SButton = defineComponent({
  name: 'SButton',
  setup(_, { slots, attrs }) {
    return () => h('button', { class: 's-button-stub', type: 'button', ...attrs }, slots.default?.());
  },
});

export default SButton;
