export const THEME_CATALOG_PAGE_SIZE = 24;

export function getThemePagination(total: number, requestedPage: number) {
  const safeTotal = Math.max(0, Math.floor(total));
  const totalPages = safeTotal === 0 ? 0 : Math.ceil(safeTotal / THEME_CATALOG_PAGE_SIZE);
  const page = totalPages === 0
    ? 1
    : Math.min(Math.max(1, Math.floor(requestedPage) || 1), totalPages);

  return {
    page,
    pageSize: THEME_CATALOG_PAGE_SIZE,
    total: safeTotal,
    totalPages,
    hasPrevious: page > 1,
    hasNext: page < totalPages,
    offset: (page - 1) * THEME_CATALOG_PAGE_SIZE,
  };
}
