import { defineComponent, h, mergeProps } from 'vue';

/** Converts numeric dimensions into CSS pixel values for inline skeleton sizing. */
const toSize = (value: string | number | null | undefined): string | undefined => {
  if (value == null || value === '') return undefined;
  return typeof value === 'number' ? `${value}px` : value;
};

const skeletonElements = new Set(['p', 'text', 'h1', 'h2', 'h3', 'h5', 'caption', 'button', 'image', 'circle', 'rect']);

/**
 * Resolves Soramitsu UI's `element` prop to the Element skeleton class suffix.
 * Unknown values fall back to text so callers cannot create arbitrary class names.
 */
const resolveElement = (element: string | undefined, variant: string | undefined): string => {
  const candidate = element || variant || 'text';
  return skeletonElements.has(candidate) ? candidate : 'text';
};

export const SSkeleton = defineComponent({
  name: 'SSkeleton',
  inheritAttrs: false,
  props: {
    animated: { type: Boolean, default: false },
    loading: { type: Boolean, default: true },
    throttle: { type: [Number, String], default: 0 },
  },
  setup(props, { attrs, slots }) {
    return () => {
      const shouldRenderTemplate = props.loading && !!slots.template;
      const children = shouldRenderTemplate ? slots.template?.() : slots.default?.();

      return h(
        'div',
        mergeProps(attrs, {
          class: ['s-skeleton', 'ps-skeleton', { 'ps-skeleton--animated': props.animated }],
        }),
        shouldRenderTemplate
          ? h('div', { class: ['el-skeleton', { 'is-animated': props.animated }] }, children)
          : children
      );
    };
  },
});

export const SSkeletonItem = defineComponent({
  name: 'SSkeletonItem',
  inheritAttrs: false,
  props: {
    element: { type: String, default: undefined },
    variant: { type: String, default: 'text' },
    width: { type: [String, Number], default: undefined },
    height: { type: [String, Number], default: undefined },
    circle: { type: Boolean, default: false },
  },
  setup(props, { attrs }) {
    return () => {
      const element = resolveElement(props.element, props.variant);

      return h(
        'div',
        mergeProps(attrs, {
          class: [
            'el-skeleton__item',
            `el-skeleton__${element}`,
            'ps-skeleton__item',
            `ps-skeleton__item--${element}`,
            { 'ps-skeleton__item--circle': props.circle || element === 'circle' },
          ],
          style: {
            width: toSize(props.width as string | number | undefined),
            height: toSize(props.height as string | number | undefined),
          },
        })
      );
    };
  },
});
