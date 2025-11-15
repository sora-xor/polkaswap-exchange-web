import { Vue } from 'vue-property-decorator';
export default class AccountSettingsOption extends Vue {
  readonly hint: string;
  readonly title: string;
  readonly disabled: boolean;
  readonly withHint: boolean;
  readonly model: boolean;
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
