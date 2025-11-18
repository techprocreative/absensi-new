import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Clock, Calendar as CalendarIcon, Coffee } from "lucide-react";
import { StatsCard } from "@/components/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { id } from "date-fns/locale";
import { useAuth } from "@/lib/auth-context";

export default function EmployeeDashboard() {
  const { employee } = useAuth();
  
  const currentMonth = new Date();
  const monthDays = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const { data: attendances, isLoading } = useQuery({
    queryKey: ["/api/attendance/employee", employee?.id],
    enabled: !!employee?.id,
  });

  const { data: schedules } = useQuery({
    queryKey: ["/api/schedules/employee", employee?.id],
    enabled: !!employee?.id,
  });

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

  const scheduleToday = schedules?.[0] || null;
  const dayOfWeek = new Date().getDay();

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
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard Karyawan</h1>
        <p className="text-muted-foreground">Riwayat absensi dan jadwal kerja Anda</p>
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
            <div className="grid grid-cols-7 gap-2">
              {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map(day => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground p-2">
                  {day}
                </div>
              ))}
              {monthDays.map((day, index) => {
                const hasAttendance = monthlyAttendances.some((a: any) => isSameDay(new Date(a.date), day));
                const isToday = isSameDay(day, new Date());
                
                return (
                  <div
                    key={index}
                    className={`
                      aspect-square flex items-center justify-center rounded-md text-sm
                      ${hasAttendance ? 'bg-primary text-primary-foreground' : 'bg-muted/50'}
                      ${isToday ? 'ring-2 ring-primary' : ''}
                    `}
                  >
                    {format(day, 'd')}
                  </div>
                );
              })}
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
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : attendances && attendances.length > 0 ? (
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
                {attendances.slice(0, 10).map((record: any) => (
                  <TableRow key={record.id} data-testid={`row-attendance-${record.id}`}>
                    <TableCell className="font-medium">
                      {format(new Date(record.date), "dd MMMM yyyy", { locale: id })}
                    </TableCell>
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
              <p className="text-muted-foreground">Belum ada riwayat absensi</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
