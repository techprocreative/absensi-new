import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Plus, Edit, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function AdminSchedules() {
  const { toast } = useToast();

  const { data: schedules, isLoading } = useQuery({
    queryKey: ["/api/schedules"],
  });

  const { data: employees } = useQuery({
    queryKey: ["/api/employees"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/schedules/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      toast({
        title: "Berhasil",
        description: "Jadwal berhasil dihapus",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Gagal menghapus jadwal",
        variant: "destructive",
      });
    },
  });

  const getEmployeeName = (employeeId: string) => {
    const employee = employees?.find((emp: any) => emp.id === employeeId);
    return employee?.name || "Unknown";
  };

  const getEmployeeCode = (employeeId: string) => {
    const employee = employees?.find((emp: any) => emp.id === employeeId);
    return employee?.employeeId || "N/A";
  };

  const getDayName = (dayOfWeek: number) => {
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    return days[dayOfWeek] || dayOfWeek;
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

  const handleDelete = (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus jadwal ini?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Jadwal Karyawan</h1>
          <p className="text-muted-foreground">Kelola jadwal shift dan hari kerja karyawan</p>
        </div>
        <Button data-testid="button-add-schedule">
          <Plus className="w-4 h-4 mr-2" />
          Tambah Jadwal
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Daftar Jadwal</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : schedules && schedules.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Karyawan</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Hari</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Jam Kerja</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule: any) => (
                  <TableRow key={schedule.id} data-testid={`row-schedule-${schedule.id}`}>
                    <TableCell className="font-mono text-sm">{getEmployeeCode(schedule.employeeId)}</TableCell>
                    <TableCell className="font-medium">{getEmployeeName(schedule.employeeId)}</TableCell>
                    <TableCell className="text-muted-foreground">{getDayName(schedule.dayOfWeek)}</TableCell>
                    <TableCell>{getShiftBadge(schedule.shift)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {schedule.startTime} - {schedule.endTime}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button size="icon" variant="ghost" data-testid={`button-edit-${schedule.id}`}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          data-testid={`button-delete-${schedule.id}`}
                          onClick={() => handleDelete(schedule.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Belum ada jadwal</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Legenda Shift</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-500 hover:bg-blue-600">Pagi</Badge>
              <span className="text-sm text-muted-foreground">08:00 - 16:00</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-500 hover:bg-amber-600">Siang</Badge>
              <span className="text-sm text-muted-foreground">12:00 - 20:00</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-purple-500 hover:bg-purple-600">Malam</Badge>
              <span className="text-sm text-muted-foreground">20:00 - 04:00</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
