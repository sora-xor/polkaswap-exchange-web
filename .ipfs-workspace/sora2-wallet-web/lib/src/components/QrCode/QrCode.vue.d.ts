import { Vue } from 'vue-property-decorator';
export default class QrCode extends Vue {
  readonly value: string;
  readonly size: number;
  readonly container: HTMLDivElement;
  private rerender;
  element: Nullable<SVGSVGElement>;
  mounted(): void;
  clearContainer(): void;
  renderCode(): void;
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
