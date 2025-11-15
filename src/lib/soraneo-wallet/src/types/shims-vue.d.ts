declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  type Props = Record<string, unknown>;
  type Slots = Record<string, unknown>;
  const component: DefineComponent<Props, Slots, any>;
  export default component;
}
