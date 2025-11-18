import { useState, useMemo } from 'react';
import { startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns';

export interface FilterConfig {
  search?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  position?: string;
  [key: string]: any;
}

export function useFilters<T>(data: T[], filterFn: (item: T, filters: FilterConfig) => boolean) {
  const [filters, setFilters] = useState<FilterConfig>({});

  const filteredData = useMemo(() => {
    if (!data) return [];
    return data.filter(item => filterFn(item, filters));
  }, [data, filters, filterFn]);

  const updateFilter = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some(value => 
      value !== undefined && value !== '' && value !== null
    );
  }, [filters]);

  return {
    filters,
    filteredData,
    updateFilter,
    resetFilters,
    hasActiveFilters,
    setFilters,
  };
}

// Predefined filter functions for common use cases
export const filterAttendance = (attendance: any, filters: FilterConfig): boolean => {
  // Search filter (name or employee ID)
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    const name = attendance.employee?.name?.toLowerCase() || '';
    const employeeId = attendance.employee?.employeeId?.toLowerCase() || '';
    
    if (!name.includes(searchLower) && !employeeId.includes(searchLower)) {
      return false;
    }
  }

  // Status filter
  if (filters.status && filters.status !== 'all') {
    if (attendance.status !== filters.status) {
      return false;
    }
  }

  // Date range filter
  if (filters.dateFrom || filters.dateTo) {
    const attendanceDate = attendance.date ? new Date(attendance.date) : null;
    if (!attendanceDate) return false;

    const from = filters.dateFrom ? startOfDay(filters.dateFrom) : null;
    const to = filters.dateTo ? endOfDay(filters.dateTo) : null;

    if (from && to) {
      if (!isWithinInterval(attendanceDate, { start: from, end: to })) {
        return false;
      }
    } else if (from) {
      if (attendanceDate < from) return false;
    } else if (to) {
      if (attendanceDate > to) return false;
    }
  }

  // Position filter
  if (filters.position && filters.position !== 'all') {
    if (attendance.employee?.position !== filters.position) {
      return false;
    }
  }

  return true;
};

export const filterEmployee = (employee: any, filters: FilterConfig): boolean => {
  // Search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    const name = employee.name?.toLowerCase() || '';
    const employeeId = employee.employeeId?.toLowerCase() || '';
    const position = employee.position?.toLowerCase() || '';
    
    if (!name.includes(searchLower) && 
        !employeeId.includes(searchLower) && 
        !position.includes(searchLower)) {
      return false;
    }
  }

  // Position filter
  if (filters.position && filters.position !== 'all') {
    if (employee.position !== filters.position) {
      return false;
    }
  }

  // Active status filter
  if (filters.isActive !== undefined) {
    if (employee.isActive !== filters.isActive) {
      return false;
    }
  }

  return true;
};

export const filterSchedule = (schedule: any, filters: FilterConfig): boolean => {
  // Search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    const name = schedule.employee?.name?.toLowerCase() || '';
    const employeeId = schedule.employee?.employeeId?.toLowerCase() || '';
    
    if (!name.includes(searchLower) && !employeeId.includes(searchLower)) {
      return false;
    }
  }

  // Shift filter
  if (filters.shift && filters.shift !== 'all') {
    if (schedule.shift !== filters.shift) {
      return false;
    }
  }

  // Day of week filter
  if (filters.dayOfWeek !== undefined && filters.dayOfWeek !== -1) {
    if (schedule.dayOfWeek !== filters.dayOfWeek) {
      return false;
    }
  }

  // Active status filter
  if (filters.isActive !== undefined) {
    if (schedule.isActive !== filters.isActive) {
      return false;
    }
  }

  return true;
};
