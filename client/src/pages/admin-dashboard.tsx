import { useQuery } from "@tanstack/react-query";
import { Users, CheckCircle, Clock, XCircle } from "lucide-react";
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
import { Link } from "wouter";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/reports/statistics"],
  });

  const { data: attendances, isLoading: attendancesLoading } = useQuery({
    queryKey: ["/api/attendance"],
  });

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

  const recentAttendances = attendances?.slice(0, 5) || [];

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard Administrator</h1>
        <p className="text-muted-foreground">Ringkasan absensi dan manajemen karyawan</p>
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
            <CardTitle className="text-lg">Absensi Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            {attendancesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentAttendances.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentAttendances.map((attendance: any) => (
                    <TableRow key={attendance.id} data-testid={`row-attendance-${attendance.id}`}>
                      <TableCell className="font-mono text-sm">{attendance.employee?.employeeId}</TableCell>
                      <TableCell className="font-medium">{attendance.employee?.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {attendance.checkIn && format(new Date(attendance.checkIn), "HH:mm", { locale: id })}
                      </TableCell>
                      <TableCell>{getStatusBadge(attendance.status || 'present')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Belum ada data absensi hari ini
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
