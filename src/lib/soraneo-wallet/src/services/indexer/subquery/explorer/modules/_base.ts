import type SubqueryExplorer from '../index';

export class SubqueryBaseModule {
  protected readonly root!: SubqueryExplorer;

  constructor(root: SubqueryExplorer) {
    this.root = root;
  }
}
