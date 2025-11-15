import { defineComponent, h } from 'vue';

const SCard = defineComponent({
  name: 'SCard',
  setup(_, { slots, attrs }) {
    return () => h('div', { class: 's-card-stub', ...attrs }, slots.default?.());
  },
});

export default SCard;
