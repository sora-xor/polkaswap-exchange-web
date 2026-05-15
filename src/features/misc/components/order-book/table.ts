export type OrderTableComponentRef = {
  $refs?: {
    bodyWrapper?: HTMLElement;
    headerWrapper?: HTMLElement;
  };
  scrollPosition?: 'left' | 'right';
  toggleRowSelection?: (row: unknown, selected?: boolean) => void;
};

export type OrderTableScrollElements = {
  bodyWrapper: HTMLElement;
  headerWrapper: HTMLElement;
};

/**
 * Resolves the table body/header wrappers used to mirror horizontal scroll state.
 */
export const resolveOrderTableScrollElements = (
  table: OrderTableComponentRef | null | undefined
): OrderTableScrollElements | null => {
  const bodyWrapper = table?.$refs?.bodyWrapper;
  const headerWrapper = table?.$refs?.headerWrapper;

  if (!(bodyWrapper instanceof HTMLElement) || !(headerWrapper instanceof HTMLElement)) {
    return null;
  }

  return {
    bodyWrapper,
    headerWrapper,
  };
};
