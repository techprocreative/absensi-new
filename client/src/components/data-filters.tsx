import { Search, X, Filter, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface DataFiltersProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  statusValue?: string;
  onStatusChange?: (value: string) => void;
  dateFrom?: Date;
  dateTo?: Date;
  onDateFromChange?: (date: Date | undefined) => void;
  onDateToChange?: (date: Date | undefined) => void;
  onReset?: () => void;
  hasActiveFilters?: boolean;
  showDateFilter?: boolean;
  showStatusFilter?: boolean;
  statusOptions?: { value: string; label: string }[];
}

export function DataFilters({
  searchValue = '',
  onSearchChange,
  statusValue = 'all',
  onStatusChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onReset,
  hasActiveFilters = false,
  showDateFilter = true,
  showStatusFilter = true,
  statusOptions = [
    { value: 'all', label: 'Semua Status' },
    { value: 'present', label: 'Hadir' },
    { value: 'late', label: 'Terlambat' },
    { value: 'absent', label: 'Tidak Hadir' },
  ],
}: DataFiltersProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama atau ID karyawan..."
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status Filter */}
        {showStatusFilter && (
          <Select value={statusValue} onValueChange={onStatusChange}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Date Range */}
        {showDateFilter && (
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <Calendar className="w-4 h-4 mr-2" />
                  {dateFrom ? format(dateFrom, 'dd MMM yyyy', { locale: id }) : 'Dari'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={dateFrom}
                  onSelect={onDateFromChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <Calendar className="w-4 h-4 mr-2" />
                  {dateTo ? format(dateTo, 'dd MMM yyyy', { locale: id }) : 'Sampai'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={dateTo}
                  onSelect={onDateToChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Reset Button */}
        {hasActiveFilters && (
          <Button variant="ghost" onClick={onReset} size="icon">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {searchValue && (
            <Badge variant="secondary">
              Pencarian: {searchValue}
              <X
                className="w-3 h-3 ml-1 cursor-pointer"
                onClick={() => onSearchChange?.('')}
              />
            </Badge>
          )}
          {statusValue && statusValue !== 'all' && (
            <Badge variant="secondary">
              Status: {statusOptions.find(opt => opt.value === statusValue)?.label}
              <X
                className="w-3 h-3 ml-1 cursor-pointer"
                onClick={() => onStatusChange?.('all')}
              />
            </Badge>
          )}
          {dateFrom && (
            <Badge variant="secondary">
              Dari: {format(dateFrom, 'dd MMM yyyy', { locale: id })}
              <X
                className="w-3 h-3 ml-1 cursor-pointer"
                onClick={() => onDateFromChange?.(undefined)}
              />
            </Badge>
          )}
          {dateTo && (
            <Badge variant="secondary">
              Sampai: {format(dateTo, 'dd MMM yyyy', { locale: id })}
              <X
                className="w-3 h-3 ml-1 cursor-pointer"
                onClick={() => onDateToChange?.(undefined)}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
