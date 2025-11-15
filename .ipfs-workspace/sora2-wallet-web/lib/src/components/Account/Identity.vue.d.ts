import { Vue } from 'vue-property-decorator';
import { AccountIdentity } from '../../types/common';
export default class Identity extends Vue {
  readonly identity: AccountIdentity;
  readonly localName: string;
  get isApproved(): boolean;
  get identityName(): string;
  get identityLegalName(): string;
  get identityIcon(): string;
  get identityData(): {
    key: string;
    value: string;
  }[];
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
