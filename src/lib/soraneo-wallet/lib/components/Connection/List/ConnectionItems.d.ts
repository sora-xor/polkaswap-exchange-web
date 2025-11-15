import { Vue } from 'vue-property-decorator';

export default class ConnectionItems extends Vue {
  readonly size: number;
  readonly visible: number;
  readonly itemOffset: number;
  readonly itemHeight: number;
  get style(): Partial<CSSStyleDeclaration>;
}
