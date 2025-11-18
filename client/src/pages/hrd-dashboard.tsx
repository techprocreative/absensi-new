import { useQuery } from "@tanstack/react-query";
import { Users, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { StatsCard } from "@/components/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Link } from "wouter";

export default function HRDDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/reports/statistics"],
  });

  const { data: employees } = useQuery({
    queryKey: ["/api/employees"],
  });

  const { data: attendances } = useQuery({
    queryKey: ["/api/attendance"],
  });

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
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard HRD</h1>
        <p className="text-muted-foreground">Statistik dan laporan kehadiran karyawan</p>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Export Laporan</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" data-testid="button-export-daily">
            Export Harian
          </Button>
          <Button variant="outline" data-testid="button-export-weekly">
            Export Mingguan
          </Button>
          <Button variant="outline" data-testid="button-export-monthly">
            Export Bulanan
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
