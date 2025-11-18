import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { reportsApi, attendanceApi } from "@/lib/api";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";

export function KioskStatistics() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["statistics"],
    queryFn: () => reportsApi.getStatistics(),
    refetchInterval: 30000, // Refresh every 30s
  });

  const { data: recentAttendances = [], isLoading: attendancesLoading } = useQuery({
    queryKey: ["recent-attendances"],
    queryFn: async () => {
      const all = await attendanceApi.getAll();
      // Get today's attendances, sorted by most recent
      const today = format(new Date(), 'yyyy-MM-dd');
      return all
        .filter((a: any) => a.date && format(new Date(a.date), 'yyyy-MM-dd') === today)
        .sort((a: any, b: any) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime())
        .slice(0, 5);
    },
    refetchInterval: 10000, // Refresh every 10s for recent activity
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "present":
        return <Badge className="bg-green-500 hover:bg-green-600 text-[10px]">Hadir</Badge>;
      case "late":
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-[10px]">Terlambat</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-3">
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Statistik Hari Ini
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {statsLoading ? (
              <>
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-muted-foreground">Hadir</span>
                  </div>
                  <span className="text-lg font-bold text-green-600">{stats?.presentToday || 0}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span className="text-xs text-muted-foreground">Terlambat</span>
                  </div>
                  <span className="text-lg font-bold text-amber-600">{stats?.lateToday || 0}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Kehadiran</span>
                  </div>
                  <span className="text-lg font-bold text-primary">{stats?.attendanceRate || 0}%</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Aktivitas Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            {attendancesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : recentAttendances.length > 0 ? (
              <ScrollArea className="h-[240px]">
                <div className="space-y-2">
                  {recentAttendances.map((attendance: any) => (
                    <div
                      key={attendance.id}
                      className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {attendance.employee?.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {attendance.checkIn && format(new Date(attendance.checkIn), 'HH:mm', { locale: id })}
                        </p>
                      </div>
                      <div className="ml-2">
                        {getStatusBadge(attendance.status || 'present')}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-xs text-muted-foreground">
                Belum ada aktivitas hari ini
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
