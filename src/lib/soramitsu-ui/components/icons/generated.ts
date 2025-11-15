import { defineComponent, h, markRaw } from 'vue';

type SvgAttrs = Record<string, unknown>;

function createIcon(name: string, nodes: () => ReturnType<typeof h>[], baseAttrs: SvgAttrs = {}) {
  return markRaw(
    defineComponent({
      name,
      inheritAttrs: false,
      setup(_props, { attrs }) {
        return () =>
          h(
            'svg',
            {
              viewBox: '0 0 24 24',
              width: '1.2em',
              height: '1.2em',
              ...baseAttrs,
              ...attrs,
            },
            nodes()
          );
      },
    })
  );
}

export const IconCheck = createIcon('uil-check', () => [
  h('path', {
    fill: 'currentColor',
    d: 'M18.71 7.21a1 1 0 0 0-1.42 0l-7.45 7.46l-3.13-3.14A1 1 0 1 0 5.29 13l3.84 3.84a1 1 0 0 0 1.42 0l8.16-8.16a1 1 0 0 0 0-1.47',
  }),
]);

export const IconMinus = createIcon('uil-minus', () => [
  h('path', {
    fill: 'currentColor',
    d: 'M19 11H5a1 1 0 0 0 0 2h14a1 1 0 0 0 0-2',
  }),
]);

export const IconStatusWarning16 = createIcon('ri-alert-fill', () => [
  h('path', {
    fill: 'currentColor',
    d: 'm12.866 3l9.526 16.5a1 1 0 0 1-.866 1.5H2.474a1 1 0 0 1-.866-1.5L11.134 3a1 1 0 0 1 1.732 0M11 16v2h2v-2zm0-7v5h2V9z',
  }),
]);

export const IconEye = createIcon('majesticons-eye-line', () => [
  h(
    'g',
    {
      fill: 'none',
      stroke: 'currentColor',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'stroke-width': '2',
    },
    [
      h('path', {
        d: 'M12 5c-6.307 0-9.367 5.683-9.91 6.808a.44.44 0 0 0 0 .384C2.632 13.317 5.692 19 12 19s9.367-5.683 9.91-6.808a.44.44 0 0 0 0-.384C21.368 10.683 18.308 5 12 5',
      }),
      h('circle', {
        cx: '12',
        cy: '12',
        r: '3',
      }),
    ]
  ),
]);

export const IconEyeOff = createIcon('majesticons-eye-off-line', () => [
  h('path', {
    fill: 'none',
    stroke: 'currentColor',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'stroke-width': '2',
    d: 'M7 6.362A9.7 9.7 0 0 1 12 5c6.307 0 9.367 5.683 9.91 6.808c.06.123.06.261 0 .385c-.352.728-1.756 3.362-4.41 5.131M14 18.8a10 10 0 0 1-2 .2c-6.307 0-9.367-5.683-9.91-6.808a.44.44 0 0 1 0-.386c.219-.452.84-1.632 1.91-2.885m6 .843A3 3 0 0 1 14.236 14M3 3l18 18',
  }),
]);

export const IconCheckMark = createIcon('mdi-check', () => [
  h('path', {
    fill: 'currentColor',
    d: 'M21 7L9 19l-5.5-5.5l1.41-1.41L9 16.17L19.59 5.59z',
  }),
]);
