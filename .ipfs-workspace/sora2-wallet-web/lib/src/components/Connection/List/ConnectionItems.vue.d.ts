import { Vue } from 'vue-property-decorator';
export default class ConnectionItems extends Vue {
  readonly size: number;
  readonly visible: number;
  readonly itemOffset: number;
  readonly itemHeight: number;
  get style(): Partial<CSSStyleDeclaration>;
}
declare const __VLS_export: import('vue').DefineComponent<
  {},
  {},
  {},
  {},
  {},
  import('vue').ComponentOptionsMixin,
  import('vue').ComponentOptionsMixin,
  {},
  string,
  import('vue').PublicProps,
  Readonly<{}> & Readonly<{}>,
  {},
  {},
  {},
  {},
  string,
  import('vue').ComponentProvideOptions,
  true,
  {},
  any
>;
declare const _default: typeof __VLS_export;
export default _default;
