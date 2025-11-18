import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { scheduleApi, employeeApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ScheduleFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule?: any;
  mode: "add" | "edit";
}

const daysOfWeek = [
  { value: "0", label: "Minggu" },
  { value: "1", label: "Senin" },
  { value: "2", label: "Selasa" },
  { value: "3", label: "Rabu" },
  { value: "4", label: "Kamis" },
  { value: "5", label: "Jumat" },
  { value: "6", label: "Sabtu" },
];

const shifts = [
  { value: "pagi", label: "Pagi (08:00 - 16:00)", start: "08:00", end: "16:00" },
  { value: "siang", label: "Siang (14:00 - 22:00)", start: "14:00", end: "22:00" },
  { value: "malam", label: "Malam (22:00 - 06:00)", start: "22:00", end: "06:00" },
  { value: "custom", label: "Custom", start: "", end: "" },
];

export function ScheduleFormModal({
  open,
  onOpenChange,
  schedule,
  mode,
}: ScheduleFormModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    employeeId: "",
    dayOfWeek: "1",
    shift: "pagi",
    startTime: "08:00",
    endTime: "16:00",
    isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customShift, setCustomShift] = useState(false);

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => employeeApi.getAll(true),
  });

  useEffect(() => {
    if (schedule && mode === "edit") {
      setFormData({
        employeeId: schedule.employeeId || "",
        dayOfWeek: String(schedule.dayOfWeek) || "1",
        shift: schedule.shift || "pagi",
        startTime: schedule.startTime || "08:00",
        endTime: schedule.endTime || "16:00",
        isActive: schedule.isActive ?? true,
      });
      
      // Check if it's a custom shift
      const standardShift = shifts.find(s => s.value === schedule.shift);
      if (!standardShift || 
          (standardShift.start && standardShift.start !== schedule.startTime) ||
          (standardShift.end && standardShift.end !== schedule.endTime)) {
        setCustomShift(true);
      }
    } else {
      setFormData({
        employeeId: "",
        dayOfWeek: "1",
        shift: "pagi",
        startTime: "08:00",
        endTime: "16:00",
        isActive: true,
      });
      setCustomShift(false);
    }
    setErrors({});
  }, [schedule, mode, open]);

  const createMutation = useMutation({
    mutationFn: (data: any) => scheduleApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      toast({
        title: "Berhasil!",
        description: "Jadwal berhasil ditambahkan",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Gagal",
        description: error.message || "Gagal menambahkan jadwal",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => scheduleApi.update(schedule.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      toast({
        title: "Berhasil!",
        description: "Jadwal berhasil diperbarui",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Gagal",
        description: error.message || "Gagal memperbarui jadwal",
        variant: "destructive",
      });
    },
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.employeeId) {
      newErrors.employeeId = "Pilih karyawan";
    }

    if (!formData.startTime) {
      newErrors.startTime = "Jam mulai harus diisi";
    }

    if (!formData.endTime) {
      newErrors.endTime = "Jam selesai harus diisi";
    }

    if (formData.startTime && formData.endTime) {
      // Validate time format
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(formData.startTime)) {
        newErrors.startTime = "Format waktu tidak valid (HH:MM)";
      }
      if (!timeRegex.test(formData.endTime)) {
        newErrors.endTime = "Format waktu tidak valid (HH:MM)";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const submitData = {
      ...formData,
      dayOfWeek: parseInt(formData.dayOfWeek),
    };

    if (mode === "add") {
      createMutation.mutate(submitData);
    } else {
      updateMutation.mutate(submitData);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleShiftChange = (shiftValue: string) => {
    if (shiftValue === "custom") {
      setCustomShift(true);
      handleInputChange("shift", shiftValue);
    } else {
      setCustomShift(false);
      const selectedShift = shifts.find(s => s.value === shiftValue);
      if (selectedShift) {
        setFormData((prev) => ({
          ...prev,
          shift: shiftValue,
          startTime: selectedShift.start,
          endTime: selectedShift.end,
        }));
      }
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "Tambah Jadwal Baru" : "Edit Jadwal"}
          </DialogTitle>
          <DialogDescription>
            {mode === "add"
              ? "Buat jadwal kerja untuk karyawan. Klik simpan untuk menambahkan."
              : "Perbarui jadwal kerja karyawan. Klik simpan untuk menyimpan perubahan."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="employeeId">
              Karyawan <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.employeeId}
              onValueChange={(value) => handleInputChange("employeeId", value)}
              disabled={isPending}
            >
              <SelectTrigger className={errors.employeeId ? "border-red-500" : ""}>
                <SelectValue placeholder="Pilih karyawan" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp: any) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.employeeId} - {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.employeeId && (
              <p className="text-sm text-red-500">{errors.employeeId}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dayOfWeek">
              Hari <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.dayOfWeek}
              onValueChange={(value) => handleInputChange("dayOfWeek", value)}
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {daysOfWeek.map((day) => (
                  <SelectItem key={day.value} value={day.value}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="shift">
              Shift <span className="text-red-500">*</span>
            </Label>
            <Select
              value={customShift ? "custom" : formData.shift}
              onValueChange={handleShiftChange}
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {shifts.map((shift) => (
                  <SelectItem key={shift.value} value={shift.value}>
                    {shift.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">
                Jam Mulai <span className="text-red-500">*</span>
              </Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => handleInputChange("startTime", e.target.value)}
                disabled={!customShift || isPending}
                className={errors.startTime ? "border-red-500" : ""}
              />
              {errors.startTime && (
                <p className="text-sm text-red-500">{errors.startTime}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime">
                Jam Selesai <span className="text-red-500">*</span>
              </Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => handleInputChange("endTime", e.target.value)}
                disabled={!customShift || isPending}
                className={errors.endTime ? "border-red-500" : ""}
              />
              {errors.endTime && (
                <p className="text-sm text-red-500">{errors.endTime}</p>
              )}
            </div>
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
              {mode === "add" ? "Tambah Jadwal" : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
