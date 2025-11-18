import { useQuery } from "@tanstack/react-query";
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
import { Download, Calendar } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function AdminReports() {
  const { data: attendances, isLoading } = useQuery({
    queryKey: ["/api/attendance"],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/reports/statistics"],
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Laporan Absensi</h1>
          <p className="text-muted-foreground">Lihat dan export laporan kehadiran karyawan</p>
        </div>
        <Button data-testid="button-export">
          <Download className="w-4 h-4 mr-2" />
          Export ke Excel
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Hadir</p>
                <p className="text-2xl font-bold text-foreground">{stats?.presentToday || 0}</p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-md bg-green-500/10">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Terlambat</p>
                <p className="text-2xl font-bold text-foreground">{stats?.lateToday || 0}</p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-md bg-amber-500/10">
                <Calendar className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tidak Hadir</p>
                <p className="text-2xl font-bold text-foreground">{stats?.absentToday || 0}</p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-md bg-red-500/10">
                <Calendar className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Riwayat Absensi</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : attendances && attendances.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Total Jam</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendances.map((record: any) => (
                  <TableRow key={record.id} data-testid={`row-attendance-${record.id}`}>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(record.date), "dd MMM yyyy", { locale: id })}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{record.employee?.employeeId}</TableCell>
                    <TableCell className="font-medium">{record.employee?.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {record.checkIn && format(new Date(record.checkIn), "HH:mm")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {record.checkOut && format(new Date(record.checkOut), "HH:mm")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {calculateTotalHours(record.checkIn, record.checkOut)}
                    </TableCell>
                    <TableCell>{getStatusBadge(record.status || 'present')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Belum ada data absensi</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
