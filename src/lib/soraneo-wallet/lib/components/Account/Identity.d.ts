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
