import { Vue } from 'vue-property-decorator';
export default class Scrollbar extends Vue {
  readonly move: number;
  readonly scrollHeight: number;
  readonly size: number;
  readonly scrollbar: HTMLDivElement;
  readonly thumb: HTMLDivElement;
  cursorDown: boolean;
  get style(): {
    transform: string;
    height: string;
  };
  clickThumbHandler(e: MouseEvent): void;
  clickTrackHandler(e: MouseEvent): void;
  startDrag(e: Event): void;
  mouseMoveDocumentHandler(e: MouseEvent): void;
  mouseUpDocumentHandler(): void;
  unmounted(): void;
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
