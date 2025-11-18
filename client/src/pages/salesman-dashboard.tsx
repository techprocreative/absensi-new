import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { MapPin, Calendar, Target, TrendingUp, Navigation, CheckCircle2, Clock3, Loader2, Users, Phone, ClipboardList, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatsCard } from "@/components/stats-card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { gpsAttendanceApi, customerVisitApi, salesTargetApi, type GpsAttendancePayload, type CustomerVisitPayload, type VisitType } from "@/lib/api";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

type GpsAttendanceRecord = {
  id: string;
  date: string;
  checkIn?: string | null;
  checkOut?: string | null;
  checkInAddress?: string | null;
  checkOutAddress?: string | null;
  status?: string | null;
};

type CustomerVisitRecord = {
  id: string;
  employeeId: string;
  customerId: string;
  customerName: string;
  customerAddress?: string | null;
  customerPhone?: string | null;
  visitType: VisitType;
  purpose?: string | null;
  notes?: string | null;
  latitude: string | number;
  longitude: string | number;
  address?: string | null;
  visitStart: string;
  visitEnd?: string | null;
  status?: string | null;
};

type SalesTargetRecord = {
  id: string;
  employeeId: string;
  period: "daily" | "weekly" | "monthly";
  targetValue: string | number;
  actualValue?: string | number | null;
  targetType: "visits" | "revenue" | "new_customers" | "orders";
  startDate: string;
  endDate: string;
  isCompleted?: boolean;
  notes?: string | null;
};

type VisitFormState = {
  customerId: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  visitType: VisitType | "";
  purpose: string;
  notes: string;
};

const visitTypeOptions: { label: string; value: VisitType }[] = [
  { label: "Customer Baru", value: "new_customer" },
  { label: "Follow Up", value: "follow_up" },
  { label: "Komplain", value: "complaint" },
  { label: "Pengantaran", value: "delivery" },
  { label: "Lainnya", value: "other" },
];

const initialVisitForm: VisitFormState = {
  customerId: "",
  customerName: "",
  customerAddress: "",
  customerPhone: "",
  visitType: "",
  purpose: "",
  notes: "",
};

const statusBadgeClass = (status?: string | null) => {
  switch (status) {
    case "present":
    case "completed":
      return "bg-green-100 text-green-700";
    case "in_progress":
      return "bg-blue-100 text-blue-700";
    case "late":
    case "complaint":
      return "bg-amber-100 text-amber-700";
    case "cancelled":
    case "absent":
      return "bg-red-100 text-red-700";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const visitTypeLabel = (value: VisitType) => {
  const option = visitTypeOptions.find((opt) => opt.value === value);
  return option ? option.label : value;
};

export default function SalesmanDashboard() {
  const { employee } = useAuth();
  const employeeId = employee?.employeeId ?? "";
  const displayName = employee?.name ?? "Salesman";
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [visitDialogOpen, setVisitDialogOpen] = useState(false);
  const [visitForm, setVisitForm] = useState<VisitFormState>(initialVisitForm);
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
  const [locationLabel, setLocationLabel] = useState("Lokasi belum tersedia");

  const requestLocation = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setLocationStatus("error");
      toast({
        title: "GPS tidak tersedia",
        description: "Perangkat Anda tidak mendukung lokasi atau akses diblokir.",
        variant: "destructive",
      });
      return;
    }

    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setCurrentLocation(coords);
        setLocationStatus("ready");
        setLocationLabel(`Lat: ${coords.latitude.toFixed(6)}, Lng: ${coords.longitude.toFixed(6)}`);
      },
      (error) => {
        console.error("GPS error", error);
        setLocationStatus("error");
        toast({
          title: "Lokasi gagal",
          description: error.message || "Tidak dapat mengambil lokasi",
          variant: "destructive",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, [toast]);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const {
    data: gpsAttendanceData,
    isLoading: attendanceLoading,
    error: attendanceError,
  } = useQuery({
    queryKey: ["gps-attendance-today", employeeId],
    queryFn: () => gpsAttendanceApi.getToday(employeeId),
    enabled: !!employeeId,
    staleTime: 60_000,
  });

  const {
    data: customerVisitsData,
    isLoading: visitsLoading,
    error: visitsError,
    refetch: refetchVisits,
  } = useQuery({
    queryKey: ["customer-visits", employeeId],
    queryFn: () => customerVisitApi.getByEmployee(employeeId),
    enabled: !!employeeId,
    staleTime: 60_000,
  });

  const {
    data: salesTargetsData,
    isLoading: targetsLoading,
    error: targetsError,
  } = useQuery({
    queryKey: ["sales-targets", employeeId],
    queryFn: () => salesTargetApi.getByEmployee(employeeId),
    enabled: !!employeeId,
  });

  const todayGpsAttendance = (gpsAttendanceData ?? null) as GpsAttendanceRecord | null;
  const customerVisits: CustomerVisitRecord[] = Array.isArray(customerVisitsData) ? customerVisitsData : [];
  const salesTargets: SalesTargetRecord[] = Array.isArray(salesTargetsData) ? salesTargetsData : [];

  useEffect(() => {
    if (attendanceError) {
      const error = attendanceError as Error;
      toast({
        title: "Gagal memuat absensi",
        description: error?.message || "Periksa koneksi Anda",
        variant: "destructive",
      });
    }
  }, [attendanceError, toast]);

  useEffect(() => {
    if (visitsError) {
      const error = visitsError as Error;
      toast({
        title: "Gagal memuat kunjungan",
        description: error?.message || "Periksa koneksi Anda",
        variant: "destructive",
      });
    }
  }, [visitsError, toast]);

  useEffect(() => {
    if (targetsError) {
      const error = targetsError as Error;
      toast({
        title: "Gagal memuat target",
        description: error?.message || "Periksa koneksi Anda",
        variant: "destructive",
      });
    }
  }, [targetsError, toast]);

  const checkInMutation = useMutation({
    mutationFn: (payload: GpsAttendancePayload) => gpsAttendanceApi.checkIn(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gps-attendance-today", employeeId] });
      toast({ title: "Berhasil check-in", description: "Absensi GPS tercatat" });
    },
    onError: (error: any) => {
      toast({ title: "Check-in gagal", description: error?.message || "Coba ulangi", variant: "destructive" });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: (payload: GpsAttendancePayload) => gpsAttendanceApi.checkOut(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gps-attendance-today", employeeId] });
      toast({ title: "Berhasil check-out", description: "Absensi GPS diperbarui" });
    },
    onError: (error: any) => {
      toast({ title: "Check-out gagal", description: error?.message || "Coba ulangi", variant: "destructive" });
    },
  });

  const createVisitMutation = useMutation({
    mutationFn: (payload: CustomerVisitPayload) => customerVisitApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-visits", employeeId] });
      setVisitDialogOpen(false);
      setVisitForm(initialVisitForm);
      toast({ title: "Kunjungan disimpan", description: "Data kunjungan berhasil dicatat" });
    },
    onError: (error: any) => {
      toast({ title: "Gagal menyimpan", description: error?.message || "Periksa kembali data Anda", variant: "destructive" });
    },
  });

  const todayVisits = useMemo(() => {
    const today = new Date().toDateString();
    return customerVisits.filter((visit) => new Date(visit.visitStart).toDateString() === today).length;
  }, [customerVisits]);

  const monthlyVisits = useMemo(() => {
    const now = new Date();
    return customerVisits.filter((visit) => {
      const date = new Date(visit.visitStart);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;
  }, [customerVisits]);

  const visitsTarget = useMemo(() => salesTargets.find((target) => target.period === "monthly" && target.targetType === "visits"), [salesTargets]);
  const monthlyTargetValue = Number(visitsTarget?.targetValue ?? 0);
  const targetProgress = monthlyTargetValue > 0 ? Math.min(100, (monthlyVisits / monthlyTargetValue) * 100) : 0;

  const recentVisits = useMemo(() => {
    return [...customerVisits]
      .sort((a, b) => new Date(b.visitStart).getTime() - new Date(a.visitStart).getTime())
      .slice(0, 8);
  }, [customerVisits]);

  const handleCheckIn = () => {
    if (!employeeId) return;
    if (!currentLocation) {
      requestLocation();
      toast({ title: "Lokasi diperlukan", description: "Ambil lokasi terlebih dahulu" });
      return;
    }

    checkInMutation.mutate({
      employeeId,
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      address: locationLabel,
      locationName: "Lokasi Salesman",
      notes: "Check-in melalui dashboard salesman",
    });
  };

  const handleCheckOut = () => {
    if (!employeeId) return;
    if (!currentLocation) {
      requestLocation();
      toast({ title: "Lokasi diperlukan", description: "Ambil lokasi terlebih dahulu" });
      return;
    }

    checkOutMutation.mutate({
      employeeId,
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      address: locationLabel,
      locationName: "Lokasi Salesman",
      notes: "Check-out melalui dashboard salesman",
    });
  };

  const handleCreateVisit = () => {
    if (!employeeId) return;
    if (!visitForm.customerId.trim() || !visitForm.customerName.trim() || !visitForm.visitType) {
      toast({ title: "Lengkapi data", description: "ID customer, nama, dan tipe wajib diisi", variant: "destructive" });
      return;
    }
    if (!currentLocation) {
      requestLocation();
      toast({ title: "Lokasi diperlukan", description: "Ambil lokasi sebelum menyimpan", variant: "destructive" });
      return;
    }

    createVisitMutation.mutate({
      employeeId,
      customerId: visitForm.customerId.trim(),
      customerName: visitForm.customerName.trim(),
      customerAddress: visitForm.customerAddress.trim() || undefined,
      customerPhone: visitForm.customerPhone.trim() || undefined,
      visitType: visitForm.visitType as VisitType,
      purpose: visitForm.purpose.trim() || undefined,
      notes: visitForm.notes.trim() || undefined,
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      address: locationLabel,
      visitStart: new Date().toISOString(),
      status: "in_progress",
    });
  };

  if (!employeeId) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">Memuat data karyawan...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasCheckedIn = !!todayGpsAttendance?.checkIn;
  const hasCheckedOut = !!todayGpsAttendance?.checkOut;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Salesman</h1>
          <p className="text-muted-foreground">Pantau absensi GPS, kunjungan, dan pencapaian target Anda</p>
        </div>
        <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-3 py-1">
              <Users className="w-4 h-4 mr-2" />
              {displayName}
            </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Kunjungan Hari Ini" value={todayVisits} icon={MapPin} />
        <StatsCard title="Kunjungan Bulanan" value={monthlyVisits} icon={Calendar} />
        <StatsCard title="Target Bulanan" value={monthlyTargetValue || 0} icon={Target} />
        <StatsCard title="Progress Target" value={`${targetProgress.toFixed(0)}%`} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col gap-2">
            <CardTitle className="flex items-center gap-2">
              <Navigation className="w-5 h-5" />
              Absensi GPS Hari Ini
            </CardTitle>
            <p className="text-sm text-muted-foreground">Pastikan GPS aktif sebelum check-in/check-out</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-lg border p-4 bg-muted/30">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 mt-1 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Lokasi Saat Ini</p>
                  <p className="font-medium">{locationLabel}</p>
                  {currentLocation?.accuracy && (
                    <p className="text-xs text-muted-foreground">Akurasi ± {Math.round(currentLocation.accuracy)} m</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={
                  locationStatus === "ready"
                    ? "bg-green-100 text-green-700"
                    : locationStatus === "loading"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-700"
                }>
                  {locationStatus === "loading" ? "Mengambil lokasi..." : locationStatus === "ready" ? "GPS siap" : "Lokasi tidak tersedia"}
                </Badge>
                <Button variant="outline" size="sm" onClick={requestLocation} disabled={locationStatus === "loading"}>
                  {locationStatus === "loading" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Navigation className="w-4 h-4 mr-2" />}
                  Refresh
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground mb-1">Check-in</p>
                {attendanceLoading ? (
                  <p className="text-sm text-muted-foreground">Memuat...</p>
                ) : hasCheckedIn ? (
                  <div className="space-y-1">
                    <p className="text-2xl font-semibold">{todayGpsAttendance?.checkIn ? format(new Date(todayGpsAttendance.checkIn), "HH:mm", { locale: id }) : "-"}</p>
                    <p className="text-sm text-muted-foreground">{todayGpsAttendance?.checkInAddress || "Alamat tidak tersedia"}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Belum check-in</p>
                )}
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground mb-1">Check-out</p>
                {attendanceLoading ? (
                  <p className="text-sm text-muted-foreground">Memuat...</p>
                ) : hasCheckedOut ? (
                  <div className="space-y-1">
                    <p className="text-2xl font-semibold">{todayGpsAttendance?.checkOut ? format(new Date(todayGpsAttendance.checkOut), "HH:mm", { locale: id }) : "-"}</p>
                    <p className="text-sm text-muted-foreground">{todayGpsAttendance?.checkOutAddress || "Alamat tidak tersedia"}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Belum check-out</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleCheckIn} disabled={checkInMutation.isPending || hasCheckedIn}>
                {checkInMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Check-in GPS
              </Button>
              <Button variant="outline" onClick={handleCheckOut} disabled={!hasCheckedIn || hasCheckedOut || checkOutMutation.isPending}>
                {checkOutMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Clock3 className="w-4 h-4 mr-2" />}
                Check-out GPS
              </Button>
            </div>

            {todayGpsAttendance?.status && (
              <Badge className={statusBadgeClass(todayGpsAttendance.status)}>
                Status: {todayGpsAttendance.status}
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-2">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Target Penjualan
            </CardTitle>
            <p className="text-sm text-muted-foreground">Pantau progres target aktif</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {targetsLoading ? (
              <p className="text-sm text-muted-foreground">Memuat target...</p>
            ) : salesTargets.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada target yang ditetapkan</p>
            ) : (
              salesTargets.slice(0, 3).map((target) => {
                const targetValue = Number(target.targetValue) || 0;
                const actualValue = Number(target.actualValue) || 0;
                const progress = targetValue > 0 ? Math.min(100, (actualValue / targetValue) * 100) : 0;
                return (
                  <div key={target.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold capitalize">{target.targetType.replace("_", " ")}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(target.startDate), "dd MMM", { locale: id })} - {format(new Date(target.endDate), "dd MMM", { locale: id })}</p>
                      </div>
                      <Badge variant={target.isCompleted ? "default" : "secondary"}>{target.period}</Badge>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{actualValue} aktual</span>
                      <span>dari {targetValue}</span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Kunjungan Pelanggan
            </CardTitle>
            <p className="text-sm text-muted-foreground">Catat dan pantau kunjungan lapangan</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetchVisits()} disabled={visitsLoading}>
              {visitsLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Navigation className="w-4 h-4 mr-2" />}
              Refresh
            </Button>
            <Dialog open={visitDialogOpen} onOpenChange={(open) => {
              setVisitDialogOpen(open);
              if (open) requestLocation();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Kunjungan
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Kunjungan Baru</DialogTitle>
                  <DialogDescription>Lengkapi detail kunjungan dan pastikan GPS aktif.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="customerId">ID Customer</Label>
                      <Input id="customerId" value={visitForm.customerId} onChange={(e) => setVisitForm((prev) => ({ ...prev, customerId: e.target.value }))} placeholder="Misal: CUST-001" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="customerName">Nama Customer</Label>
                      <Input id="customerName" value={visitForm.customerName} onChange={(e) => setVisitForm((prev) => ({ ...prev, customerName: e.target.value }))} placeholder="Nama toko / orang" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="customerPhone">No. Telepon</Label>
                      <Input id="customerPhone" value={visitForm.customerPhone} onChange={(e) => setVisitForm((prev) => ({ ...prev, customerPhone: e.target.value }))} placeholder="08xxxxxxxx" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="visitType">Tipe Kunjungan</Label>
                      <Select value={visitForm.visitType} onValueChange={(value: VisitType) => setVisitForm((prev) => ({ ...prev, visitType: value }))}>
                        <SelectTrigger id="visitType">
                          <SelectValue placeholder="Pilih tipe" />
                        </SelectTrigger>
                        <SelectContent>
                          {visitTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="customerAddress">Alamat Customer</Label>
                    <Textarea id="customerAddress" rows={2} value={visitForm.customerAddress} onChange={(e) => setVisitForm((prev) => ({ ...prev, customerAddress: e.target.value }))} placeholder="Alamat lengkap / catatan lokasi" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="purpose">Tujuan / Rencana</Label>
                    <Textarea id="purpose" rows={2} value={visitForm.purpose} onChange={(e) => setVisitForm((prev) => ({ ...prev, purpose: e.target.value }))} placeholder="Misal: follow up order, penagihan, demo produk" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="notes">Catatan Tambahan</Label>
                    <Textarea id="notes" rows={2} value={visitForm.notes} onChange={(e) => setVisitForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Keterangan lain" />
                  </div>
                  <div className="space-y-1">
                    <Label>Lokasi GPS</Label>
                    <Input value={locationLabel} readOnly className="bg-muted" />
                  </div>
                </div>
                <DialogFooter className="mt-4">
                  <Button variant="outline" onClick={() => setVisitDialogOpen(false)} disabled={createVisitMutation.isPending}>
                    Batal
                  </Button>
                  <Button onClick={handleCreateVisit} disabled={createVisitMutation.isPending}>
                    {createVisitMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}Simpan Kunjungan
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {visitsLoading ? (
            <p className="text-sm text-muted-foreground">Memuat data kunjungan...</p>
          ) : recentVisits.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada kunjungan tercatat.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Kontak</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentVisits.map((visit) => (
                    <TableRow key={visit.id}>
                      <TableCell>
                        <p className="font-medium">{visit.customerName}</p>
                        <p className="text-xs text-muted-foreground">{visit.customerAddress || visit.address || "-"}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{visitTypeLabel(visit.visitType)}</Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{format(new Date(visit.visitStart), "dd MMM yyyy", { locale: id })}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(visit.visitStart), "HH:mm", { locale: id })}</p>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusBadgeClass(visit.status)}>
                          {visit.status || "in_progress"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-xs">
                          {visit.customerPhone && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Phone className="w-3 h-3" />
                              {visit.customerPhone}
                            </span>
                          )}
                          {visit.customerId && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <ClipboardList className="w-3 h-3" />
                              {visit.customerId}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
