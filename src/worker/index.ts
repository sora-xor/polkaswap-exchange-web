import PolkaswapWorker from './polkaswap.worker.ts';
import PolkaswapSharedWorker from './polkaswap.shared-worker.ts';

export function initWorker() {
  if (typeof SharedWorker !== 'undefined') {
    const worker = new PolkaswapSharedWorker();
    return worker.port;
  } else {
    return new PolkaswapWorker();
  }
}
