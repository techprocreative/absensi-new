import { useQuery, useMutation } from "@tanstack/react-query";
import { Users, CheckCircle, Clock, TrendingUp, RefreshCw, Download, FileSpreadsheet, Calendar, Search, Plus, Edit, Trash2, Camera, UserCheck } from "lucide-react";
import { StatsCard } from "@/components/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "wouter";
import { reportsApi, employeeApi, attendanceApi } from "@/lib/api";
import { ErrorBoundary } from "@/components/error-boundary";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import { exportAttendanceData, exportStatisticsReport } from "@/lib/export-utils";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { id } from "date-fns/locale";
import { EmployeeFormModal } from "@/components/employee-form-modal";
import { FaceRegistrationModal } from "@/components/face-registration-modal";

function HRDDashboardContent() {
  const { toast } = useToast();
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [dateRange, setDateRange] = useState<'weekly' | 'monthly'>('weekly');
  const [searchQuery, setSearchQuery] = useState("");
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [faceModalOpen, setFaceModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["statistics"],
    queryFn: () => reportsApi.getStatistics(),
  });

  const { data: employees = [], refetch: refetchEmployees } = useQuery({
    queryKey: ["employees"],
    queryFn: () => employeeApi.getAll(true),
  });

  const { data: attendances = [], isLoading: attendancesLoading, refetch: refetchAttendances } = useQuery({
    queryKey: ["attendance"],
    queryFn: () => attendanceApi.getAll(),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await employeeApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({
        title: "Berhasil",
        description: "Karyawan berhasil dihapus",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Gagal menghapus karyawan",
        variant: "destructive",
      });
    },
  });

  // Auto-refresh
  const { isRefreshing, lastRefresh } = useAutoRefresh({
    interval: 30000,
    enabled: autoRefreshEnabled,
    onRefresh: async () => {
      await Promise.all([refetchStats(), refetchEmployees(), refetchAttendances()]);
    },
  });

  const handleManualRefresh = async () => {
    try {
      await Promise.all([refetchStats(), refetchEmployees(), refetchAttendances()]);
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

  const handleExport = (period: 'daily' | 'weekly' | 'monthly', type: 'csv' | 'excel' = 'csv') => {
    try {
      const now = new Date();
      let filteredAttendances = attendances;

      if (period === 'daily') {
        const today = format(now, 'yyyy-MM-dd');
        filteredAttendances = attendances.filter((a: any) => 
          format(new Date(a.date), 'yyyy-MM-dd') === today
        );
      } else if (period === 'weekly') {
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
        filteredAttendances = attendances.filter((a: any) => {
          const date = new Date(a.date);
          return date >= weekStart && date <= weekEnd;
        });
      } else if (period === 'monthly') {
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        filteredAttendances = attendances.filter((a: any) => {
          const date = new Date(a.date);
          return date >= monthStart && date <= monthEnd;
        });
      }

      exportAttendanceData(filteredAttendances, type);
      toast({
        title: "Export berhasil",
        description: `Laporan ${period} berhasil diekspor`,
      });
    } catch (error) {
      toast({
        title: "Export gagal",
        description: "Terjadi kesalahan saat mengekspor data",
        variant: "destructive",
      });
    }
  };

  const filteredEmployees = employees?.filter((emp: any) =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.position.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleDelete = (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus karyawan ini?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleAddEmployee = () => {
    setModalMode("add");
    setSelectedEmployee(null);
    setEmployeeModalOpen(true);
  };

  const handleEditEmployee = (employee: any) => {
    setModalMode("edit");
    setSelectedEmployee(employee);
    setEmployeeModalOpen(true);
  };

  const handleRegisterFace = (employee: any) => {
    setSelectedEmployee(employee);
    setFaceModalOpen(true);
  };

  const weeklyData = attendances?.reduce((acc: any[], att: any) => {
    const day = new Date(att.date).getDay();
    const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const dayName = dayNames[day];
    
    const existing = acc.find(d => d.day === dayName);
    if (existing) {
      if (att.status === "present") existing.hadir++;
      if (att.status === "late") existing.terlambat++;
    } else {
      acc.push({
        day: dayName,
        hadir: att.status === "present" ? 1 : 0,
        terlambat: att.status === "late" ? 1 : 0
      });
    }
    return acc;
  }, []) || [];

  const departmentStats: { name: string; present: number; total: number; percentage: number }[] = [];

  const attendanceRate = stats?.attendanceRate || 0;

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard HRD</h1>
          <p className="text-muted-foreground">Statistik, laporan, dan manajemen karyawan</p>
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
              <DropdownMenuItem onClick={() => handleExport('daily', 'csv')}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Harian (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('daily', 'excel')}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Harian (Excel)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('weekly', 'csv')}>
                <Calendar className="w-4 h-4 mr-2" />
                Mingguan (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('weekly', 'excel')}>
                <Calendar className="w-4 h-4 mr-2" />
                Mingguan (Excel)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('monthly', 'csv')}>
                <TrendingUp className="w-4 h-4 mr-2" />
                Bulanan (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('monthly', 'excel')}>
                <TrendingUp className="w-4 h-4 mr-2" />
                Bulanan (Excel)
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
              title="Kehadiran Hari Ini"
              value={`${attendanceRate}%`}
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
              icon={TrendingUp}
            />
          </>
        )}
      </div>

      <Tabs defaultValue="reports" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Laporan
          </TabsTrigger>
          <TabsTrigger value="employees" className="flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            Manajemen Karyawan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-6">

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Kehadiran Mingguan</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Bar dataKey="hadir" fill="hsl(var(--primary))" name="Hadir" radius={[4, 4, 0, 0]} />
                <Bar dataKey="terlambat" fill="hsl(var(--chart-4))" name="Terlambat" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tren Kehadiran Bulanan</CardTitle>
            </CardHeader>
            <CardContent>
              {attendancesLoading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="day" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="hadir" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      name="Hadir"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="terlambat" 
                      stroke="hsl(var(--chart-4))" 
                      strokeWidth={2}
                      name="Terlambat"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ringkasan Kehadiran</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Karyawan</span>
                  <span className="text-lg font-bold">{employees.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Hadir Hari Ini</span>
                  <span className="text-lg font-bold text-green-600">{stats?.presentToday || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Terlambat Hari Ini</span>
                  <span className="text-lg font-bold text-amber-600">{stats?.lateToday || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Tidak Hadir</span>
                  <span className="text-lg font-bold text-red-600">{stats?.absentToday || 0}</span>
                </div>
              </div>
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Tingkat Kehadiran</span>
                  <span className="text-2xl font-bold text-primary">{attendanceRate}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Akses Cepat Export</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button 
              variant="outline" 
              data-testid="button-export-daily"
              onClick={() => handleExport('daily', 'excel')}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export Harian
            </Button>
            <Button 
              variant="outline" 
              data-testid="button-export-weekly"
              onClick={() => handleExport('weekly', 'excel')}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Export Mingguan
            </Button>
            <Button 
              variant="outline" 
              data-testid="button-export-monthly"
              onClick={() => handleExport('monthly', 'excel')}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Export Bulanan
            </Button>
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="employees" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <CardTitle className="text-lg">Daftar Karyawan</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari karyawan..."
                      className="pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      data-testid="input-search-employee"
                    />
                  </div>
                  <Button onClick={handleAddEmployee} data-testid="button-add-employee">
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Karyawan
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Karyawan</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Posisi</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee: any) => (
                    <TableRow key={employee.id} data-testid={`row-employee-${employee.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                              {getInitials(employee.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{employee.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{employee.employeeId}</TableCell>
                      <TableCell className="text-muted-foreground">{employee.position}</TableCell>
                      <TableCell className="text-muted-foreground">{employee.email}</TableCell>
                      <TableCell>
                        {employee.isActive ? (
                          <Badge className="bg-green-500 hover:bg-green-600">Aktif</Badge>
                        ) : (
                          <Badge variant="secondary">Tidak Aktif</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            data-testid={`button-register-face-${employee.id}`}
                            onClick={() => handleRegisterFace(employee)}
                            title="Registrasi Wajah"
                          >
                            <Camera className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            data-testid={`button-edit-${employee.id}`}
                            onClick={() => handleEditEmployee(employee)}
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            data-testid={`button-delete-${employee.id}`}
                            onClick={() => handleDelete(employee.id)}
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredEmployees.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Tidak ada karyawan ditemukan</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <EmployeeFormModal
        open={employeeModalOpen}
        onOpenChange={setEmployeeModalOpen}
        employee={selectedEmployee}
        mode={modalMode}
      />

      <FaceRegistrationModal
        open={faceModalOpen}
        onOpenChange={setFaceModalOpen}
        employee={selectedEmployee}
      />
    </div>
  );
}

export default function HRDDashboard() {
  return (
    <ErrorBoundary>
      <HRDDashboardContent />
    </ErrorBoundary>
  );
}
