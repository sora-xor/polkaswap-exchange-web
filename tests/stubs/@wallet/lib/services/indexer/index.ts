export class SubqueryIndexer {
  async fetchEntities() {
    return { edges: [], nodes: [] };
  }

  async fetchEntitiesConnection() {
    return { edges: [], nodes: [] };
  }
}

export class SubsquidIndexer extends SubqueryIndexer {}

export default {
  SubqueryIndexer,
  SubsquidIndexer,
};
