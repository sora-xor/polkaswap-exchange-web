import { gql } from '@urql/core';

import type { PageInfo } from '../types';

export const PageInfoFragment = gql<PageInfo>`
  fragment PageInfoFragment on PageInfo {
    hasNextPage
    hasPreviousPage
    startCursor
    endCursor
  }
`;
