import { Vue, Component } from 'vue-property-decorator';
import { Action, Getter } from 'vuex-class';

@Component
export default class TokenSelectMixin extends Vue {
  @Getter('isSelectAssetLoading', { namespace: 'assets' }) isSelectAssetLoading!: boolean;
  @Action('setSelectAssetLoading', { namespace: 'assets' }) setSelectAssetLoading!: (value: boolean) => Promise<void>;
}
