import type Vue, { VNode } from 'vue';

declare global {
  namespace JSX {
    /* eslint-disable  @typescript-eslint/no-empty-object-type */
    interface Element extends VNode {}
    /* eslint-disable  @typescript-eslint/no-empty-object-type */
    interface ElementClass extends Vue {}
    interface IntrinsicElements {
      [elem: string]: any;
    }
  }
}
