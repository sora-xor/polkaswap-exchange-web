import { Vue } from 'vue-property-decorator';
import type { WithConnectionApi } from '@sora-substrate/sdk';
export default class LoadingMixin extends Vue {
  readonly parentLoading: boolean;
  isWalletLoaded: boolean;
  loading: boolean;
  withLoading<T = void>(func: FnWithoutArgs<T> | AsyncFnWithoutArgs<T>): Promise<T>;
  /**
   * Function for any request to blockchain.
   * It is guaranteed that api has a connection
   * @param func
   */
  withApi<T = void>(func: FnWithoutArgs<T> | AsyncFnWithoutArgs<T>): Promise<T>;
  withChainApi<T = void>(chainApi: WithConnectionApi, func: FnWithoutArgs<T> | AsyncFnWithoutArgs<T>): Promise<T>;
  withParentLoading<T = void>(func: FnWithoutArgs<T> | AsyncFnWithoutArgs<T>): Promise<T>;
}
