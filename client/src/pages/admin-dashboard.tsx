import { useQuery } from "@tanstack/react-query";
import { Users, CheckCircle, Clock, XCircle, RefreshCw, Download, FileSpreadsheet } from "lucide-react";
import { StatsCard } from "@/components/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "wouter";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { reportsApi, attendanceApi } from "@/lib/api";
import { ErrorBoundary } from "@/components/error-boundary";
import { DataFilters } from "@/components/data-filters";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import { useFilters, filterAttendance } from "@/hooks/use-filters";
import { usePagination } from "@/hooks/use-pagination";
import { exportAttendanceData, exportStatisticsReport } from "@/lib/export-utils";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

function AdminDashboardContent() {
  const { toast } = useToast();
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["statistics"],
    queryFn: () => reportsApi.getStatistics(),
  });

  const { data: attendances = [], isLoading: attendancesLoading, refetch: refetchAttendances } = useQuery({
    queryKey: ["attendance"],
    queryFn: () => attendanceApi.getAll(),
  });

  // Filters
  const {
    filters,
    filteredData: filteredAttendances,
    updateFilter,
    resetFilters,
    hasActiveFilters,
  } = useFilters(attendances, filterAttendance);

  // Pagination
  const {
    paginatedData,
    page,
    totalPages,
    total,
    nextPage,
    prevPage,
    goToPage,
    hasNextPage,
    hasPrevPage,
  } = usePagination(filteredAttendances, 10);

  // Auto-refresh
  const { isRefreshing, lastRefresh } = useAutoRefresh({
    interval: 30000, // 30 seconds
    enabled: autoRefreshEnabled,
    onRefresh: async () => {
      await Promise.all([refetchStats(), refetchAttendances()]);
    },
  });

  const handleManualRefresh = async () => {
    try {
      await Promise.all([refetchStats(), refetchAttendances()]);
      toast({
        title: "Data diperbarui",
        description: "Data berhasil dimuat ulang",
      });
    } catch (error) {
      toast({
        title: "Gagal memperbarui",
        description: "Terjadi kesalahan saat memuat data",
        variant: "destructive",
      });
    }
  };

  const handleExport = (type: 'csv' | 'excel') => {
    try {
      exportAttendanceData(filteredAttendances, type);
      toast({
        title: "Export berhasil",
        description: `Data berhasil diekspor ke ${type.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: "Export gagal",
        description: "Terjadi kesalahan saat mengekspor data",
        variant: "destructive",
      });
    }
  };

  const handleExportStats = (type: 'csv' | 'excel') => {
    try {
      exportStatisticsReport(stats, filteredAttendances, type);
      toast({
        title: "Export berhasil",
        description: "Laporan statistik berhasil diekspor",
      });
    } catch (error) {
      toast({
        title: "Export gagal",
        description: "Terjadi kesalahan saat mengekspor laporan",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "present":
        return <Badge className="bg-green-500 hover:bg-green-600">Hadir</Badge>;
      case "late":
        return <Badge className="bg-amber-500 hover:bg-amber-600">Terlambat</Badge>;
      case "absent":
        return <Badge variant="destructive">Tidak Hadir</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard Administrator</h1>
          <p className="text-muted-foreground">Ringkasan absensi dan manajemen karyawan</p>
          {lastRefresh && (
            <p className="text-xs text-muted-foreground mt-1">
              Update terakhir: {format(lastRefresh, 'HH:mm:ss')}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExportStats('csv')}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export Statistik (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportStats('excel')}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export Statistik (Excel)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <Download className="w-4 h-4 mr-2" />
                Export Absensi (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('excel')}>
                <Download className="w-4 h-4 mr-2" />
                Export Absensi (Excel)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant={autoRefreshEnabled ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
          >
            Auto-refresh: {autoRefreshEnabled ? 'ON' : 'OFF'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <StatsCard
              title="Total Karyawan"
              value={stats?.totalEmployees || 0}
              icon={Users}
            />
            <StatsCard
              title="Hadir Hari Ini"
              value={stats?.presentToday || 0}
              icon={CheckCircle}
            />
            <StatsCard
              title="Terlambat"
              value={stats?.lateToday || 0}
              icon={Clock}
            />
            <StatsCard
              title="Tidak Hadir"
              value={stats?.absentToday || 0}
              icon={XCircle}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Aksi Cepat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" asChild data-testid="button-add-employee">
              <Link href="/admin/employees">
                <Users className="w-4 h-4 mr-2" />
                Kelola Karyawan
              </Link>
            </Button>
            <Button className="w-full justify-start" variant="secondary" asChild data-testid="button-view-schedules">
              <Link href="/admin/schedules">
                <Clock className="w-4 h-4 mr-2" />
                Kelola Jadwal
              </Link>
            </Button>
            <Button className="w-full justify-start" variant="secondary" asChild data-testid="button-view-reports">
              <Link href="/admin/reports">
                <CheckCircle className="w-4 h-4 mr-2" />
                Lihat Laporan
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Data Absensi</CardTitle>
              <div className="text-sm text-muted-foreground">
                {filteredAttendances.length} dari {attendances.length} data
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <DataFilters
              searchValue={filters.search || ''}
              onSearchChange={(value) => updateFilter('search', value)}
              statusValue={filters.status || 'all'}
              onStatusChange={(value) => updateFilter('status', value)}
              dateFrom={filters.dateFrom}
              dateTo={filters.dateTo}
              onDateFromChange={(date) => updateFilter('dateFrom', date)}
              onDateToChange={(date) => updateFilter('dateTo', date)}
              onReset={resetFilters}
              hasActiveFilters={hasActiveFilters}
            />

            {/* Table */}
            {attendancesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : paginatedData.length > 0 ? (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Nama</TableHead>
                        <TableHead>Posisi</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Check-in</TableHead>
                        <TableHead>Check-out</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedData.map((attendance: any) => (
                        <TableRow key={attendance.id} data-testid={`row-attendance-${attendance.id}`}>
                          <TableCell className="font-mono text-sm">{attendance.employee?.employeeId}</TableCell>
                          <TableCell className="font-medium">{attendance.employee?.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{attendance.employee?.position}</TableCell>
                          <TableCell className="text-sm">
                            {attendance.date && format(new Date(attendance.date), "dd MMM yyyy", { locale: id })}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {attendance.checkIn && format(new Date(attendance.checkIn), "HH:mm", { locale: id })}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {attendance.checkOut ? format(new Date(attendance.checkOut), "HH:mm", { locale: id }) : '-'}
                          </TableCell>
                          <TableCell>{getStatusBadge(attendance.status || 'present')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Halaman {page} dari {totalPages} ({total} total)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={prevPage}
                        disabled={!hasPrevPage}
                      >
                        Sebelumnya
                      </Button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = i + 1;
                        return (
                          <Button
                            key={pageNum}
                            variant={page === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => goToPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                      {totalPages > 5 && <span className="px-2">...</span>}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={nextPage}
                        disabled={!hasNextPage}
                      >
                        Berikutnya
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 border rounded-md">
                <p className="text-muted-foreground">
                  {hasActiveFilters ? 'Tidak ada data yang sesuai dengan filter' : 'Belum ada data absensi'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <ErrorBoundary>
      <AdminDashboardContent />
    </ErrorBoundary>
  );
}
