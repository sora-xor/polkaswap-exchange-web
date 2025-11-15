import { Vue } from 'vue-property-decorator';

export default class AccountSettingsOption extends Vue {
  readonly hint: string;
  readonly title: string;
  readonly disabled: boolean;
  readonly withHint: boolean;
  readonly model: boolean;
}
