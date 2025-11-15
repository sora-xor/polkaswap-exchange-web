import { Vue } from 'vue-property-decorator';

export default class DialogMixin extends Vue {
  readonly visible: boolean;
  isVisible: boolean;
  handleVisibleChange(value: boolean): void;
  handleIsVisibleChange(value: boolean): void;
  closeDialog(): void;
}
