export const PaginationButton = {
  Prev: 'prev',
  Next: 'next',
  First: 'first',
  Last: 'last',
} as const;

export type PaginationButtonKey = keyof typeof PaginationButton;
export type PaginationButtonValue = (typeof PaginationButton)[PaginationButtonKey];
