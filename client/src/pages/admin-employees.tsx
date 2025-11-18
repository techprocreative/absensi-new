import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Plus, Edit, Trash2, Camera } from "lucide-react";
import { Link } from "wouter";
import { employeeApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { EmployeeFormModal } from "@/components/employee-form-modal";
import { FaceRegistrationModal } from "@/components/face-registration-modal";

export default function AdminEmployees() {
  const [searchQuery, setSearchQuery] = useState("");
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [faceModalOpen, setFaceModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const { toast } = useToast();

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: () => employeeApi.getAll(true),
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

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Kelola Karyawan</h1>
          <p className="text-muted-foreground">Manajemen data karyawan dan registrasi wajah</p>
        </div>
        <Button onClick={handleAddEmployee} data-testid="button-add-employee">
          <Plus className="w-4 h-4 mr-2" />
          Tambah Karyawan
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-lg">Daftar Karyawan</CardTitle>
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
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
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
          )}

          {!isLoading && filteredEmployees.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Tidak ada karyawan ditemukan</p>
            </div>
          )}
        </CardContent>
      </Card>

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
