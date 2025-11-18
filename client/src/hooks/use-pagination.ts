import { useState, useMemo } from 'react';

export interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
}

export function usePagination<T>(data: T[], initialPageSize: number = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const paginatedData = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return data.slice(startIndex, endIndex);
  }, [data, page, pageSize]);

  const totalPages = useMemo(() => {
    return Math.ceil(data.length / pageSize);
  }, [data.length, pageSize]);

  const goToPage = (newPage: number) => {
    setPage(Math.max(1, Math.min(newPage, totalPages)));
  };

  const nextPage = () => {
    goToPage(page + 1);
  };

  const prevPage = () => {
    goToPage(page - 1);
  };

  const changePageSize = (newSize: number) => {
    setPageSize(newSize);
    setPage(1); // Reset to first page when changing page size
  };

  return {
    paginatedData,
    page,
    pageSize,
    totalPages,
    total: data.length,
    goToPage,
    nextPage,
    prevPage,
    changePageSize,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}
