interface HistoryPagination {
  title: string;
  currentPage: number;
  pageAmount: number;
  total: number;
  loading?: boolean;
  lastPage: number;
}
export declare const MOCK_HISTORY_PAGINATION: Array<HistoryPagination>;
export {};
