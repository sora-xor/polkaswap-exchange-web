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
