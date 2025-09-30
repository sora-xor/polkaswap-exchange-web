/* eslint-disable vue/one-component-per-file */
import { Status as UiStatus } from '@soramitsu-ui/ui';
import { defineComponent, h } from 'vue';

export const Status = UiStatus;

export const SortDirection = {
  ASC: 'ascending',
  DESC: 'descending',
} as const;

export type SortDirection = (typeof SortDirection)[keyof typeof SortDirection];

function toSize(value: string | number | null | undefined): string | undefined {
  if (value == null || value === '') return undefined;
  return typeof value === 'number' ? `${value}px` : value;
}

export const SSkeleton = defineComponent({
  name: 'SSkeleton',
  props: {
    animated: { type: Boolean, default: true },
  },
  setup(props, { slots }) {
    return () =>
      h(
        'div',
        {
          class: ['ps-skeleton', { 'ps-skeleton--animated': props.animated }],
        },
        slots.default?.()
      );
  },
});

export const SSkeletonItem = defineComponent({
  name: 'SSkeletonItem',
  props: {
    variant: { type: String, default: 'text' },
    width: { type: [String, Number], default: undefined },
    height: { type: [String, Number], default: undefined },
    circle: { type: Boolean, default: false },
  },
  setup(props) {
    return () =>
      h('div', {
        class: [
          'ps-skeleton__item',
          `ps-skeleton__item--${props.variant}`,
          { 'ps-skeleton__item--circle': props.circle },
        ],
        style: {
          width: toSize(props.width as string | number | undefined),
          height: toSize(props.height as string | number | undefined),
        },
      });
  },
});
