import type PolkaswapExplorer from '../index';

export class PolkaswapBaseModule {
  protected readonly root!: PolkaswapExplorer;

  constructor(root: PolkaswapExplorer) {
    this.root = root;
  }
}
