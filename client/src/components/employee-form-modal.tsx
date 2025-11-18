import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { employeeApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface EmployeeFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: any;
  mode: "add" | "edit";
}

export function EmployeeFormModal({
  open,
  onOpenChange,
  employee,
  mode,
}: EmployeeFormModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    employeeId: "",
    name: "",
    position: "",
    email: "",
    phone: "",
    isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (employee && mode === "edit") {
      setFormData({
        employeeId: employee.employeeId || "",
        name: employee.name || "",
        position: employee.position || "",
        email: employee.email || "",
        phone: employee.phone || "",
        isActive: employee.isActive ?? true,
      });
    } else {
      setFormData({
        employeeId: "",
        name: "",
        position: "",
        email: "",
        phone: "",
        isActive: true,
      });
    }
    setErrors({});
  }, [employee, mode, open]);

  const createMutation = useMutation({
    mutationFn: (data: any) => employeeApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({
        title: "Berhasil!",
        description: "Karyawan berhasil ditambahkan",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Gagal",
        description: error.message || "Gagal menambahkan karyawan",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => employeeApi.update(employee.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({
        title: "Berhasil!",
        description: "Data karyawan berhasil diperbarui",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Gagal",
        description: error.message || "Gagal memperbarui data karyawan",
        variant: "destructive",
      });
    },
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.employeeId.trim()) {
      newErrors.employeeId = "ID Karyawan harus diisi";
    } else if (formData.employeeId.length < 3) {
      newErrors.employeeId = "ID Karyawan minimal 3 karakter";
    }

    if (!formData.name.trim()) {
      newErrors.name = "Nama harus diisi";
    } else if (formData.name.length < 3) {
      newErrors.name = "Nama minimal 3 karakter";
    }

    if (!formData.position.trim()) {
      newErrors.position = "Posisi harus diisi";
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Format email tidak valid";
    }

    if (formData.phone && !/^[0-9]{10,15}$/.test(formData.phone.replace(/[\s-]/g, ""))) {
      newErrors.phone = "Format nomor telepon tidak valid";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (mode === "add") {
      createMutation.mutate(formData);
    } else {
      updateMutation.mutate(formData);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "Tambah Karyawan Baru" : "Edit Data Karyawan"}
          </DialogTitle>
          <DialogDescription>
            {mode === "add"
              ? "Masukkan data karyawan baru. Klik simpan untuk menambahkan."
              : "Perbarui data karyawan. Klik simpan untuk menyimpan perubahan."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="employeeId">
              ID Karyawan <span className="text-red-500">*</span>
            </Label>
            <Input
              id="employeeId"
              placeholder="Contoh: EMP001"
              value={formData.employeeId}
              onChange={(e) => handleInputChange("employeeId", e.target.value)}
              disabled={mode === "edit" || isPending}
              className={errors.employeeId ? "border-red-500" : ""}
            />
            {errors.employeeId && (
              <p className="text-sm text-red-500">{errors.employeeId}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">
              Nama Lengkap <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Contoh: Budi Santoso"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              disabled={isPending}
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="position">
              Posisi/Jabatan <span className="text-red-500">*</span>
            </Label>
            <Input
              id="position"
              placeholder="Contoh: Software Engineer"
              value={formData.position}
              onChange={(e) => handleInputChange("position", e.target.value)}
              disabled={isPending}
              className={errors.position ? "border-red-500" : ""}
            />
            {errors.position && (
              <p className="text-sm text-red-500">{errors.position}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email (Opsional)</Label>
            <Input
              id="email"
              type="email"
              placeholder="Contoh: budi@company.com"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              disabled={isPending}
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Nomor Telepon (Opsional)</Label>
            <Input
              id="phone"
              placeholder="Contoh: 081234567890"
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              disabled={isPending}
              className={errors.phone ? "border-red-500" : ""}
            />
            {errors.phone && (
              <p className="text-sm text-red-500">{errors.phone}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="isActive">Status</Label>
            <Select
              value={formData.isActive ? "active" : "inactive"}
              onValueChange={(value) =>
                handleInputChange("isActive", value === "active")
              }
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="inactive">Tidak Aktif</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
              {mode === "add" ? "Tambah Karyawan" : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
