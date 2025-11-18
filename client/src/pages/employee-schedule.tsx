import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, Clock3, Layers, RefreshCw, Timer, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsCard } from "@/components/stats-card";
import { useToast } from "@/hooks/use-toast";
import { scheduleApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ErrorBoundary } from "@/components/error-boundary";

type Shift = "pagi" | "siang" | "malam" | string;

type ScheduleRecord = {
  id: string;
  dayOfWeek: number;
  shift: Shift;
  startTime: string;
  endTime: string;
  isActive: boolean;
};

const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

const shiftColors: Record<string, string> = {
  pagi: "bg-blue-500 hover:bg-blue-600",
  siang: "bg-amber-500 hover:bg-amber-600",
  malam: "bg-purple-500 hover:bg-purple-600",
};

function calculateDuration(start: string, end: string) {
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  const totalMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
  if (totalMinutes <= 0) return "-";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}j ${minutes}m`;
}

function getNextShiftSchedule(schedules: ScheduleRecord[]) {
  if (!schedules?.length) return null;
  const today = new Date();
  const todayIndex = today.getDay();
  const sortedDays = Array.from({ length: 7 }).map((_, idx) => (todayIndex + idx) % 7);

  for (const day of sortedDays) {
    const daySchedule = schedules.find((schedule) => schedule.dayOfWeek === day && schedule.isActive);
    if (daySchedule) {
      const nextDate = new Date(today);
      const diffDays = (day - todayIndex + 7) % 7;
      nextDate.setDate(today.getDate() + diffDays);
      return { schedule: daySchedule, date: nextDate };
    }
  }
  return null;
}

function EmployeeScheduleContent() {
  const { employee } = useAuth();
  const employeeCode = employee?.employeeId ?? "";
  const employeeName = employee?.name ?? "Karyawan";
  const { toast } = useToast();

  const { data, isLoading, refetch, error } = useQuery<ScheduleRecord[]>({
    queryKey: ["schedule-employee", employeeCode],
    queryFn: () => scheduleApi.getByEmployee(employeeCode),
    enabled: !!employeeCode,
  });

  const schedules = data ?? [];

  useEffect(() => {
    if (error) {
      toast({
        title: "Gagal memuat jadwal",
        description: (error as Error).message || "Periksa koneksi",
        variant: "destructive",
      });
    }
  }, [error, toast]);

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

  const activeSchedules = schedules.filter((schedule) => schedule.isActive);
  const totalWeeklyHours = activeSchedules.reduce((acc, schedule) => {
    const [startHour, startMinute] = schedule.startTime.split(":").map(Number);
    const [endHour, endMinute] = schedule.endTime.split(":").map(Number);
    const minutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
    return minutes > 0 ? acc + minutes : acc;
  }, 0);
  const totalHours = `${Math.floor(totalWeeklyHours / 60)}j ${totalWeeklyHours % 60}m`;

  const nextShift = getNextShiftSchedule(activeSchedules);

  const weeklyTimeline = dayNames.map((day, index) => {
    const todaysSchedule = activeSchedules.filter((schedule) => schedule.dayOfWeek === index);
    return { day, schedules: todaysSchedule };
  });

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Jadwal Kerja</p>
          <h1 className="text-3xl font-bold">Agenda Mingguan</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {employeeName} • ID {employeeCode}
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Muat Ulang
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Shift Aktif" value={activeSchedules.length} icon={Layers} />
        <StatsCard title="Total Jadwal" value={schedules.length} icon={Calendar} />
        <StatsCard title="Jam / Minggu" value={totalHours} icon={Clock3} />
        <StatsCard title="Shift Berikutnya" value={nextShift ? dayNames[nextShift.schedule.dayOfWeek] : "-"} icon={Timer} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Daftar Jadwal</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <Skeleton key={idx} className="h-12 w-full" />
                ))}
              </div>
            ) : schedules.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hari</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead>Jam</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedules.map((schedule) => (
                      <TableRow key={schedule.id}>
                        <TableCell className="font-medium">{dayNames[schedule.dayOfWeek]}</TableCell>
                        <TableCell>
                          <Badge className={shiftColors[schedule.shift] ?? "bg-primary"}>
                            {schedule.shift}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {schedule.startTime} - {schedule.endTime}
                        </TableCell>
                        <TableCell>
                          {schedule.isActive ? (
                            <Badge variant="outline" className="text-green-600 border-green-200">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Aktif
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Nonaktif
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground border rounded-md">
                Tidak ada jadwal yang tersedia
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shift Berikutnya</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {nextShift ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{format(nextShift.date, "EEEE, dd MMM yyyy")}</p>
                <p className="text-2xl font-semibold">{dayNames[nextShift.schedule.dayOfWeek]}</p>
                <Badge className={shiftColors[nextShift.schedule.shift] ?? "bg-primary"}>
                  {nextShift.schedule.shift}
                </Badge>
                <p className="text-sm">
                  {nextShift.schedule.startTime} - {nextShift.schedule.endTime} ({
                    calculateDuration(nextShift.schedule.startTime, nextShift.schedule.endTime)
                  })
                </p>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                Jadwal aktif belum ditentukan
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Timeline Mingguan</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {weeklyTimeline.map(({ day, schedules: daySchedules }) => (
            <div key={day} className="border rounded-lg p-4 space-y-3">
              <p className="font-semibold">{day}</p>
              {daySchedules.length ? (
                daySchedules.map((schedule) => (
                  <div key={schedule.id} className="p-3 rounded-md bg-muted">
                    <div className="flex items-center justify-between">
                      <Badge className={shiftColors[schedule.shift] ?? "bg-primary"}>{schedule.shift}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {calculateDuration(schedule.startTime, schedule.endTime)}
                      </span>
                    </div>
                    <p className="text-sm mt-2">
                      {schedule.startTime} - {schedule.endTime}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">Tidak ada jadwal</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function EmployeeSchedule() {
  return (
    <ErrorBoundary>
      <EmployeeScheduleContent />
    </ErrorBoundary>
  );
}
