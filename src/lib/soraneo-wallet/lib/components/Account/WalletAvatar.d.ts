import { Vue } from 'vue-property-decorator';

export default class WalletAvatar extends Vue {
  readonly size: number;
  readonly theme: string;
  readonly address: string;
}
