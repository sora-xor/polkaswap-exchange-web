import type SubsquidExplorer from '../index';

export class BaseModule {
  protected readonly root!: SubsquidExplorer;

  constructor(root: SubsquidExplorer) {
    this.root = root;
  }
}
