import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, isSameMonth, startOfMonth, subMonths, differenceInMinutes } from "date-fns";
import { id } from "date-fns/locale";
import { Calendar, Filter, RefreshCw, Search, Clock3, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { attendanceApi } from "@/lib/api";
import { usePagination } from "@/hooks/use-pagination";
import { exportAttendanceData } from "@/lib/export-utils";
import { useToast } from "@/hooks/use-toast";
import { ErrorBoundary } from "@/components/error-boundary";
import { StatsCard } from "@/components/stats-card";

type AttendanceStatus = "present" | "late" | "absent" | "on_break" | null;

type AttendanceRecord = {
  id: string;
  date: string;
  checkIn?: string | null;
  checkOut?: string | null;
  breakStart?: string | null;
  breakEnd?: string | null;
  status?: AttendanceStatus;
  notes?: string | null;
};

const statusOptions = [
  { value: "all", label: "Semua Status" },
  { value: "present", label: "Hadir" },
  { value: "late", label: "Terlambat" },
  { value: "on_break", label: "Istirahat" },
  { value: "absent", label: "Tidak Hadir" },
];

function getStatusBadge(status?: AttendanceStatus) {
  switch (status) {
    case "present":
      return <Badge className="bg-green-500 hover:bg-green-600">Hadir</Badge>;
    case "late":
      return <Badge className="bg-amber-500 hover:bg-amber-600">Terlambat</Badge>;
    case "on_break":
      return <Badge className="bg-blue-500 hover:bg-blue-600">Istirahat</Badge>;
    case "absent":
      return <Badge variant="destructive">Tidak Hadir</Badge>;
    default:
      return <Badge variant="secondary">-</Badge>;
  }
}

function calculateDuration(checkIn?: string | null, checkOut?: string | null) {
  if (!checkIn || !checkOut) return "-";
  const start = parseISO(checkIn);
  const end = parseISO(checkOut);
  const minutes = differenceInMinutes(end, start);
  if (minutes <= 0) return "-";
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}j ${remainingMinutes}m`;
}

function EmployeeHistoryContent() {
  const { employee } = useAuth();
  const employeeCode = employee?.employeeId ?? "";
  const employeeName = employee?.name ?? "Karyawan";
  const employeePosition = employee?.position ?? "-";
  const { toast } = useToast();

  const monthOptions = useMemo(() => {
    return Array.from({ length: 6 }).map((_, idx) => {
      const date = subMonths(new Date(), idx);
      return {
        value: format(date, "yyyy-MM"),
        label: format(date, "MMMM yyyy", { locale: id }),
      };
    });
  }, []);

  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.value ?? format(new Date(), "yyyy-MM"));
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const {
    data,
    isLoading,
    refetch,
    error,
  } = useQuery<AttendanceRecord[]>({
    queryKey: ["attendance-employee-history", employeeCode],
    queryFn: () => attendanceApi.getByEmployee(employeeCode),
    enabled: !!employeeCode,
  });

  const attendances = data ?? [];

  useEffect(() => {
    if (error) {
      toast({
        title: "Gagal memuat data",
        description: (error as Error).message || "Periksa koneksi Anda",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const filteredAttendances = useMemo(() => {
    if (!attendances) return [];
    let rows = [...attendances];

    if (selectedMonth) {
      const [year, month] = selectedMonth.split("-");
      const baseDate = startOfMonth(new Date(Number(year), Number(month) - 1));
      rows = rows.filter((record) => record.date && isSameMonth(parseISO(record.date), baseDate));
    }

    if (statusFilter !== "all") {
      rows = rows.filter((record) => record.status === (statusFilter as AttendanceStatus));
    }

    if (searchTerm.trim()) {
      const keyword = searchTerm.toLowerCase();
      rows = rows.filter((record) => {
        const dateString = record.date ? format(parseISO(record.date), "dd MMMM yyyy", { locale: id }) : "";
        return (
          dateString.toLowerCase().includes(keyword) ||
          (record.status ?? "").toLowerCase().includes(keyword) ||
          (record.notes ?? "").toLowerCase().includes(keyword)
        );
      });
    }

    return rows;
  }, [attendances, selectedMonth, statusFilter, searchTerm]);

  const {
    paginatedData,
    page,
    totalPages,
    nextPage,
    prevPage,
    hasNextPage,
    hasPrevPage,
  } = usePagination(filteredAttendances, 12);

  const presentCount = filteredAttendances.filter((att) => att.status === "present").length;
  const lateCount = filteredAttendances.filter((att) => att.status === "late").length;
  const absentCount = filteredAttendances.filter((att) => att.status === "absent").length;

  const handleExport = (type: "csv" | "excel" | "json") => {
    if (filteredAttendances.length === 0) {
      toast({
        title: "Tidak ada data",
        description: "Tidak ada data untuk diekspor pada filter ini",
        variant: "destructive",
      });
      return;
    }

    const exportPayload = filteredAttendances.map((record) => ({
      ...record,
      employee: {
        employeeId: employeeCode,
        name: employeeName,
        position: employeePosition,
      },
    }));

    exportAttendanceData(exportPayload, type);
    toast({ title: "Export berhasil", description: "Riwayat absensi berhasil disiapkan." });
  };

  if (!employeeCode) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Data karyawan tidak ditemukan.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Riwayat Absensi</p>
          <h1 className="text-3xl font-bold">Log Kehadiran</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {employeeName} • ID {employeeCode}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            {isLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Muat Ulang
          </Button>
          <Button variant="outline" onClick={() => handleExport("csv")}>CSV</Button>
          <Button variant="outline" onClick={() => handleExport("excel")}>Excel</Button>
          <Button variant="outline" onClick={() => handleExport("json")}>JSON</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Rekaman" value={filteredAttendances.length} icon={Calendar} />
        <StatsCard title="Hadir" value={presentCount} icon={CheckCircle2} />
        <StatsCard title="Terlambat" value={lateCount} icon={Clock3} />
        <StatsCard title="Tidak Hadir" value={absentCount} icon={AlertCircle} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filter Riwayat
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Periode</p>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih bulan" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Status</p>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Semua status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Pencarian</p>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari tanggal, status, atau catatan"
                className="pl-9"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>Daftar Kehadiran</CardTitle>
            <p className="text-sm text-muted-foreground">Menampilkan {filteredAttendances.length} data</p>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Segarkan
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, idx) => (
                <Skeleton key={idx} className="h-12 w-full" />
              ))}
            </div>
          ) : paginatedData.length > 0 ? (
            <div className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Check-in</TableHead>
                      <TableHead>Check-out</TableHead>
                      <TableHead>Durasi</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {record.date ? format(parseISO(record.date), "dd MMM yyyy", { locale: id }) : "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {record.checkIn ? format(parseISO(record.checkIn), "HH:mm") : "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {record.checkOut ? format(parseISO(record.checkOut), "HH:mm") : "-"}
                        </TableCell>
                        <TableCell>{calculateDuration(record.checkIn, record.checkOut)}</TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <p>
                    Halaman {page} dari {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={prevPage} disabled={!hasPrevPage}>
                      Sebelumnya
                    </Button>
                    <Button variant="outline" size="sm" onClick={nextPage} disabled={!hasNextPage}>
                      Berikutnya
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground border rounded-md">
              Tidak ada data pada periode ini
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function EmployeeHistory() {
  return (
    <ErrorBoundary>
      <EmployeeHistoryContent />
    </ErrorBoundary>
  );
}
