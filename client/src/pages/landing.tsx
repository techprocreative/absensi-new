import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { FaceCamera } from "@/components/face-camera";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Clock, Coffee, LogOut, CheckCircle2, AlertCircle, Loader2, Shield } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { attendanceApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

export default function Landing() {
  const [, setLocation] = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [faceDescriptor, setFaceDescriptor] = useState<Float32Array | null>(null);
  const [recognizedEmployee, setRecognizedEmployee] = useState<any>(null);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const lastRecognitionAttempt = useRef<number>(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard shortcut for login (Ctrl+L or Cmd+L)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        setLocation('/login');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [setLocation]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const recognizeMutation = useMutation({
    mutationFn: async (descriptor: Float32Array) => {
      return await attendanceApi.recognize(Array.from(descriptor));
    },
    onSuccess: (data) => {
      setRecognizedEmployee(data.employee);
      setTodayAttendance(data.attendance);
    },
    onError: () => {
      setMessage({ type: "error", text: "Wajah tidak dikenali. Pastikan Anda sudah terdaftar." });
      setRecognizedEmployee(null);
      setTodayAttendance(null);
    }
  });

  const checkInMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      return await attendanceApi.checkIn(employeeId);
    },
    onSuccess: (data) => {
      setTodayAttendance(data);
      setMessage({ type: "success", text: "Check-in berhasil!" });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["statistics"] });
    },
    onError: (error: any) => {
      setMessage({ type: "error", text: error.message || "Gagal melakukan check-in" });
    }
  });

  const breakStartMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      return await attendanceApi.breakStart(employeeId);
    },
    onSuccess: (data) => {
      setTodayAttendance(data);
      setMessage({ type: "success", text: "Selamat istirahat!" });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
    onError: (error: any) => {
      setMessage({ type: "error", text: error.message || "Gagal memulai istirahat" });
    }
  });

  const breakEndMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      return await attendanceApi.breakEnd(employeeId);
    },
    onSuccess: (data) => {
      setTodayAttendance(data);
      setMessage({ type: "success", text: "Selamat bekerja kembali!" });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
    onError: (error: any) => {
      setMessage({ type: "error", text: error.message || "Gagal mengakhiri istirahat" });
    }
  });

  const checkOutMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      return await attendanceApi.checkOut(employeeId);
    },
    onSuccess: (data) => {
      setTodayAttendance(data);
      setMessage({ type: "success", text: "Check-out berhasil! Terima kasih atas kerja keras Anda hari ini." });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["statistics"] });
    },
    onError: (error: any) => {
      setMessage({ type: "error", text: error.message || "Gagal melakukan check-out" });
    }
  });

  const handleFaceDetected = (descriptor: Float32Array) => {
    setFaceDescriptor(descriptor);
    
    const now = Date.now();
    if (now - lastRecognitionAttempt.current > 2000 && !recognizeMutation.isPending) {
      lastRecognitionAttempt.current = now;
      setRecognizedEmployee(null);
      setTodayAttendance(null);
      recognizeMutation.mutate(descriptor);
    }
  };

  const handleCheckIn = async () => {
    if (!recognizedEmployee) {
      setMessage({ type: "error", text: "Wajah belum dikenali. Pastikan wajah Anda terlihat jelas di kamera." });
      return;
    }
    checkInMutation.mutate(recognizedEmployee.id);
  };

  const handleBreak = async () => {
    if (!recognizedEmployee) return;
    breakStartMutation.mutate(recognizedEmployee.id);
  };

  const handleResumeWork = async () => {
    if (!recognizedEmployee) return;
    breakEndMutation.mutate(recognizedEmployee.id);
  };

  const handleCheckOut = async () => {
    if (!recognizedEmployee) return;
    checkOutMutation.mutate(recognizedEmployee.id);
  };

  const getAttendanceStatus = () => {
    if (!todayAttendance) return "not_checked_in";
    if (todayAttendance.checkOut) return "checked_out";
    if (todayAttendance.breakStart && !todayAttendance.breakEnd) return "on_break";
    return "checked_in";
  };

  const attendanceStatus = getAttendanceStatus();

  const getStatusBadge = () => {
    switch (attendanceStatus) {
      case "not_checked_in":
        return <Badge variant="secondary" className="gap-1"><AlertCircle className="w-3 h-3" /> Belum Check-in</Badge>;
      case "checked_in":
        return <Badge className="bg-green-500 hover:bg-green-600 gap-1"><CheckCircle2 className="w-3 h-3" /> Sudah Check-in</Badge>;
      case "on_break":
        return <Badge className="bg-amber-500 hover:bg-amber-600 gap-1"><Coffee className="w-3 h-3" /> Istirahat</Badge>;
      case "checked_out":
        return <Badge variant="secondary" className="gap-1"><LogOut className="w-3 h-3" /> Sudah Check-out</Badge>;
    }
  };

  const isLoading = checkInMutation.isPending || breakStartMutation.isPending || 
                    breakEndMutation.isPending || checkOutMutation.isPending;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Absensi Karyawan</h1>
            <p className="text-sm text-muted-foreground">Face Recognition System</p>
          </div>
          <div className="flex items-center gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation('/login')}
                    className="gap-2"
                  >
                    <Shield className="w-4 h-4" />
                    <span className="hidden sm:inline">Login Staff</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Login untuk Admin, HRD, atau Employee</p>
                  <p className="text-xs text-muted-foreground mt-1">Shortcut: Ctrl+L</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-3xl space-y-6">
          <Card className="border-primary/20" data-testid="card-status">
            <CardHeader className="text-center pb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-primary" />
                <CardTitle className="text-xl" data-testid="text-current-time">
                  {format(currentTime, "EEEE, dd MMMM yyyy", { locale: id })}
                </CardTitle>
              </div>
              <p className="text-4xl font-bold text-primary" data-testid="text-current-clock">
                {format(currentTime, "HH:mm:ss")}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center gap-4">
                <span className="text-sm font-medium text-muted-foreground">Status:</span>
                {getStatusBadge()}
              </div>
              
              {recognizedEmployee && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Karyawan Terdeteksi:</p>
                  <p className="text-lg font-semibold text-foreground" data-testid="text-employee-name">
                    {recognizedEmployee.name}
                  </p>
                  <p className="text-sm text-muted-foreground" data-testid="text-employee-id">
                    {recognizedEmployee.employeeId}
                  </p>
                </div>
              )}

              {recognizeMutation.isPending && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengenali wajah...</span>
                </div>
              )}
            </CardContent>
          </Card>

          <FaceCamera
            onFaceDetected={handleFaceDetected}
            isCapturing={true}
            className="w-full max-w-2xl mx-auto"
          />

          {message && (
            <Alert variant={message.type === "error" ? "destructive" : "default"} data-testid="alert-message">
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            {attendanceStatus === "not_checked_in" && (
              <Button
                size="lg"
                className="w-full text-base font-semibold"
                onClick={handleCheckIn}
                disabled={isLoading || !recognizedEmployee}
                data-testid="button-checkin"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Check-in
                  </>
                )}
              </Button>
            )}

            {attendanceStatus === "checked_in" && (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  size="lg"
                  variant="secondary"
                  className="text-base font-semibold"
                  onClick={handleBreak}
                  disabled={isLoading}
                  data-testid="button-break"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <Coffee className="w-5 h-5 mr-2" />
                      Istirahat
                    </>
                  )}
                </Button>
                <Button
                  size="lg"
                  className="text-base font-semibold"
                  onClick={handleCheckOut}
                  disabled={isLoading}
                  data-testid="button-checkout"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <LogOut className="w-5 h-5 mr-2" />
                      Check-out
                    </>
                  )}
                </Button>
              </div>
            )}

            {attendanceStatus === "on_break" && (
              <Button
                size="lg"
                className="w-full text-base font-semibold"
                onClick={handleResumeWork}
                disabled={isLoading}
                data-testid="button-resume"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Kembali Bekerja
                  </>
                  )}
              </Button>
            )}

            {attendanceStatus === "checked_out" && (
              <Alert data-testid="alert-checked-out">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-center">
                  Anda telah selesai bekerja hari ini. Sampai jumpa besok!
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
