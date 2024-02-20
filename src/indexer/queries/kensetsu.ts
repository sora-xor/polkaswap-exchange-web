const KensetsuQuery = `
query ($start: Int = 0, $end: Int = 0, $after: Cursor = "", $first: Int = 100) {
  bridgeTransactions: historyElements(
    first: $first,
    after: $after,
    filter: {
      and: [
        {timestamp: {greaterThanOrEqualTo: $start}},
        {timestamp: {lessThanOrEqualTo: $end}},
        {module: {equalTo: "assets"}},
        {method: {equalTo: "burn"}}
      ]
    }
  ) {
    pageInfo {
      ...PageInfoFragment
    }
    nodes {
      data,
      timestamp
    }
  }
}

fragment PageInfoFragment on PageInfo {
  hasNextPage
  hasPreviousPage
  startCursor
  endCursor
}`;
