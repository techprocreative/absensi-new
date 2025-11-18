import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Clock, Calendar as CalendarIcon, Coffee, RefreshCw, Download, TrendingUp } from "lucide-react";
import { StatsCard } from "@/components/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, differenceInHours } from "date-fns";
import { id } from "date-fns/locale";
import { useAuth } from "@/lib/auth-context";
import { attendanceApi, scheduleApi } from "@/lib/api";
import { ErrorBoundary } from "@/components/error-boundary";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import { exportAttendanceData } from "@/lib/export-utils";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { usePagination } from "@/hooks/use-pagination";

function EmployeeDashboardContent() {
  const { employee } = useAuth();
  const { toast } = useToast();
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const employeeCode = employee?.employeeId ?? "";
  
  const currentMonth = new Date();
  const monthDays = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const { data: attendances = [], isLoading, refetch: refetchAttendances } = useQuery({
    queryKey: ["attendance-employee", employeeCode],
    queryFn: () => attendanceApi.getByEmployee(employeeCode),
    enabled: !!employeeCode,
  });

  const { data: schedules = [], refetch: refetchSchedules } = useQuery({
    queryKey: ["schedules-employee", employeeCode],
    queryFn: () => scheduleApi.getByEmployee(employeeCode),
    enabled: !!employeeCode,
  });

  // Auto-refresh
  const { isRefreshing, lastRefresh } = useAutoRefresh({
    interval: 30000,
    enabled: autoRefreshEnabled,
    onRefresh: async () => {
      await Promise.all([refetchAttendances(), refetchSchedules()]);
    },
  });

  // Pagination for attendance history
  const {
    paginatedData: paginatedAttendances,
    page,
    totalPages,
    nextPage,
    prevPage,
    hasNextPage,
    hasPrevPage,
  } = usePagination(attendances, 10);

  const handleManualRefresh = async () => {
    try {
      await Promise.all([refetchAttendances(), refetchSchedules()]);
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

  const handleExport = () => {
    try {
      exportAttendanceData(attendances, 'excel');
      toast({
        title: "Export berhasil",
        description: "Riwayat absensi berhasil diekspor",
      });
    } catch (error) {
      toast({
        title: "Export gagal",
        description: "Terjadi kesalahan saat mengekspor data",
        variant: "destructive",
      });
    }
  };

  const monthlyAttendances = attendances?.filter((att: any) => {
    const attDate = new Date(att.date);
    return attDate >= startOfMonth(currentMonth) && attDate <= endOfMonth(currentMonth);
  }) || [];

  const presentCount = monthlyAttendances.filter((att: any) => att.status === "present").length;
  const lateCount = monthlyAttendances.filter((att: any) => att.status === "late").length;

  const totalHours = monthlyAttendances.reduce((total: number, att: any) => {
    if (att.checkIn && att.checkOut) {
      const start = new Date(att.checkIn);
      const end = new Date(att.checkOut);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return total + hours;
    }
    return total;
  }, 0);

  const dayOfWeek = new Date().getDay();
  const scheduleToday = schedules?.find((schedule: any) => schedule.dayOfWeek === dayOfWeek) || schedules?.[0] || null;

  const getDayName = (dayNum: number) => {
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    return days[dayNum];
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

  const getShiftBadge = (shift: string) => {
    switch (shift) {
      case "pagi":
        return <Badge className="bg-blue-500 hover:bg-blue-600">Pagi</Badge>;
      case "siang":
        return <Badge className="bg-amber-500 hover:bg-amber-600">Siang</Badge>;
      case "malam":
        return <Badge className="bg-purple-500 hover:bg-purple-600">Malam</Badge>;
      default:
        return <Badge variant="secondary">{shift}</Badge>;
    }
  };

  const calculateTotalHours = (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut) return "-";
    
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diff = end.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard Karyawan</h1>
          <p className="text-muted-foreground">Riwayat absensi dan jadwal kerja Anda</p>
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
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
        <StatsCard
          title="Hadir Bulan Ini"
          value={presentCount}
          icon={CheckCircle}
        />
        <StatsCard
          title="Terlambat"
          value={lateCount}
          icon={Clock}
        />
        <StatsCard
          title="Total Jam Kerja"
          value={`${Math.round(totalHours)}h`}
          icon={Coffee}
        />
        <StatsCard
          title="Hari Kerja"
          value={monthlyAttendances.length}
          icon={CalendarIcon}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Jadwal Hari Ini</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {scheduleToday ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Hari</span>
                  <span className="text-sm font-medium">{getDayName(scheduleToday.dayOfWeek)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Shift</span>
                  {getShiftBadge(scheduleToday.shift)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Jam Kerja</span>
                  <span className="text-sm font-medium">
                    {scheduleToday.startTime} - {scheduleToday.endTime}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm">
                Tidak ada jadwal untuk hari ini
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Kalender Kehadiran</CardTitle>
          </CardHeader>
          <CardContent>
            <TooltipProvider>
              <div className="grid grid-cols-7 gap-2">
                {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map(day => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground p-2">
                    {day}
                  </div>
                ))}
                {monthDays.map((day, index) => {
                  const attendance = monthlyAttendances.find((a: any) => isSameDay(new Date(a.date), day));
                  const hasAttendance = !!attendance;
                  const isToday = isSameDay(day, new Date());
                  
                  const dayElement = (
                    <div
                      key={index}
                      className={`
                        aspect-square flex items-center justify-center rounded-md text-sm cursor-default
                        ${hasAttendance ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-muted/50'}
                        ${isToday ? 'ring-2 ring-primary' : ''}
                      `}
                    >
                      {format(day, 'd')}
                    </div>
                  );

                  if (hasAttendance && attendance) {
                    return (
                      <Tooltip key={index}>
                        <TooltipTrigger asChild>
                          {dayElement}
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1">
                            <p className="font-medium">{format(day, 'dd MMM yyyy', { locale: id })}</p>
                            <p className="text-xs">Check-in: {attendance.checkIn ? format(new Date(attendance.checkIn), 'HH:mm') : '-'}</p>
                            <p className="text-xs">Check-out: {attendance.checkOut ? format(new Date(attendance.checkOut), 'HH:mm') : '-'}</p>
                            <p className="text-xs">Status: {attendance.status}</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return dayElement;
                })}
              </div>
            </TooltipProvider>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Riwayat Absensi</CardTitle>
            <div className="text-sm text-muted-foreground">
              {attendances.length} total absensi
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : paginatedAttendances && paginatedAttendances.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Check-in</TableHead>
                      <TableHead>Check-out</TableHead>
                      <TableHead>Total Jam</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAttendances.map((record: any) => (
                      <TableRow key={record.id} data-testid={`row-attendance-${record.id}`}>
                        <TableCell className="font-medium">
                          {format(new Date(record.date), "dd MMMM yyyy", { locale: id })}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {record.checkIn && format(new Date(record.checkIn), "HH:mm")}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {record.checkOut ? format(new Date(record.checkOut), "HH:mm") : '-'}
                        </TableCell>
                        <TableCell className="font-medium">
                          {calculateTotalHours(record.checkIn, record.checkOut)}
                        </TableCell>
                        <TableCell>{getStatusBadge(record.status || 'present')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Halaman {page} dari {totalPages}
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
              <p className="text-muted-foreground">Belum ada riwayat absensi</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function EmployeeDashboard() {
  return (
    <ErrorBoundary>
      <EmployeeDashboardContent />
    </ErrorBoundary>
  );
}
