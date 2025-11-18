import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { EnhancedFaceCamera } from "@/components/enhanced-face-camera";
import { KioskStatistics } from "@/components/kiosk-statistics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Coffee,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Volume2,
  VolumeX,
  Settings,
  User,
  LogIn,
  Shield,
} from "lucide-react";
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
import { useAudioFeedback } from "@/hooks/use-audio-feedback";
import { ErrorBoundary } from "@/components/error-boundary";
import { useLocation } from "wouter";

function EnhancedLandingContent() {
  const [, setLocation] = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [faceDescriptor, setFaceDescriptor] = useState<Float32Array | null>(null);
  const [recognizedEmployee, setRecognizedEmployee] = useState<any>(null);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [faceCount, setFaceCount] = useState(0);
  const lastRecognitionAttempt = useRef<number>(0);
  const recognitionInProgress = useRef(false);

  const { playSuccess, playError, playDetected, playWarning, speak } = useAudioFeedback({
    enabled: audioEnabled,
    volume: 0.6,
  });

  // Update clock
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

  // Auto-clear messages
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Voice guidance when face count changes
  useEffect(() => {
    if (faceCount === 0 && recognizedEmployee) {
      setRecognizedEmployee(null);
      setTodayAttendance(null);
    } else if (faceCount > 1) {
      setMessage({ type: "info", text: "Mohon hanya satu orang di depan kamera" });
      if (audioEnabled) {
        speak("Mohon hanya satu orang di depan kamera");
      }
    }
  }, [faceCount, audioEnabled, recognizedEmployee]);

  const recognizeMutation = useMutation({
    mutationFn: async (descriptor: Float32Array) => {
      return await attendanceApi.recognize(Array.from(descriptor));
    },
    onSuccess: (data) => {
      setRecognizedEmployee(data.employee);
      setTodayAttendance(data.attendance);
      playDetected();
      if (audioEnabled) {
        speak(`Selamat datang, ${data.employee.name}`);
      }
    },
    onError: () => {
      setMessage({ type: "error", text: "Wajah tidak dikenali. Pastikan Anda sudah terdaftar." });
      setRecognizedEmployee(null);
      setTodayAttendance(null);
      playError();
      if (audioEnabled) {
        speak("Wajah tidak dikenali");
      }
    },
  });

  const checkInMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      return await attendanceApi.checkIn(employeeId);
    },
    onSuccess: (data) => {
      setTodayAttendance(data);
      setMessage({ type: "success", text: "Check-in berhasil! Selamat bekerja." });
      playSuccess();
      if (audioEnabled) {
        speak("Check-in berhasil. Selamat bekerja.");
      }
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["statistics"] });
      queryClient.invalidateQueries({ queryKey: ["recent-attendances"] });
    },
    onError: (error: any) => {
      setMessage({ type: "error", text: error.message || "Gagal melakukan check-in" });
      playError();
    },
  });

  const breakStartMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      return await attendanceApi.breakStart(employeeId);
    },
    onSuccess: (data) => {
      setTodayAttendance(data);
      setMessage({ type: "success", text: "Selamat istirahat!" });
      playSuccess();
      if (audioEnabled) {
        speak("Selamat istirahat");
      }
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["recent-attendances"] });
    },
    onError: (error: any) => {
      setMessage({ type: "error", text: error.message || "Gagal memulai istirahat" });
      playError();
    },
  });

  const breakEndMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      return await attendanceApi.breakEnd(employeeId);
    },
    onSuccess: (data) => {
      setTodayAttendance(data);
      setMessage({ type: "success", text: "Selamat bekerja kembali!" });
      playSuccess();
      if (audioEnabled) {
        speak("Selamat bekerja kembali");
      }
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["recent-attendances"] });
    },
    onError: (error: any) => {
      setMessage({ type: "error", text: error.message || "Gagal mengakhiri istirahat" });
      playError();
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      return await attendanceApi.checkOut(employeeId);
    },
    onSuccess: (data) => {
      setTodayAttendance(data);
      setMessage({ 
        type: "success", 
        text: "Check-out berhasil! Terima kasih atas kerja keras Anda hari ini." 
      });
      playSuccess();
      if (audioEnabled) {
        speak("Check-out berhasil. Terima kasih atas kerja keras Anda hari ini.");
      }
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["statistics"] });
      queryClient.invalidateQueries({ queryKey: ["recent-attendances"] });
    },
    onError: (error: any) => {
      setMessage({ type: "error", text: error.message || "Gagal melakukan check-out" });
      playError();
    },
  });

  const handleFaceDetected = (descriptor: Float32Array) => {
    if (faceCount !== 1) return;

    setFaceDescriptor(descriptor);

    const now = Date.now();
    if (
      now - lastRecognitionAttempt.current > 3000 &&
      !recognizeMutation.isPending &&
      !recognitionInProgress.current
    ) {
      lastRecognitionAttempt.current = now;
      recognitionInProgress.current = true;
      setRecognizedEmployee(null);
      setTodayAttendance(null);
      recognizeMutation.mutate(descriptor);
      setTimeout(() => {
        recognitionInProgress.current = false;
      }, 1000);
    }
  };

  const handleCheckIn = async () => {
    if (!recognizedEmployee) {
      setMessage({ type: "error", text: "Wajah belum dikenali. Pastikan wajah Anda terlihat jelas di kamera." });
      playWarning();
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
        return (
          <Badge variant="secondary" className="gap-1 text-sm px-3 py-1">
            <AlertCircle className="w-4 h-4" /> Belum Check-in
          </Badge>
        );
      case "checked_in":
        return (
          <Badge className="bg-green-500 hover:bg-green-600 gap-1 text-sm px-3 py-1">
            <CheckCircle2 className="w-4 h-4" /> Sudah Check-in
          </Badge>
        );
      case "on_break":
        return (
          <Badge className="bg-amber-500 hover:bg-amber-600 gap-1 text-sm px-3 py-1">
            <Coffee className="w-4 h-4" /> Istirahat
          </Badge>
        );
      case "checked_out":
        return (
          <Badge variant="secondary" className="gap-1 text-sm px-3 py-1">
            <LogOut className="w-4 h-4" /> Sudah Check-out
          </Badge>
        );
    }
  };

  const isLoading =
    checkInMutation.isPending ||
    breakStartMutation.isPending ||
    breakEndMutation.isPending ||
    checkOutMutation.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              FaceAttend Kiosk
            </h1>
            <p className="text-sm text-muted-foreground">Sistem Absensi Face Recognition</p>
          </div>
          <div className="flex items-center gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAudioEnabled(!audioEnabled)}
                    className="gap-2"
                  >
                    {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    <span className="hidden sm:inline">{audioEnabled ? "Suara ON" : "Suara OFF"}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Toggle suara dan voice guidance</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation('/login')}
                    className="gap-2 hover:bg-primary/10 hover:border-primary/50 transition-all"
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

      {/* Main Content */}
      <main className="flex-1 flex p-6">
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Camera and Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Time and Status Card */}
            <Card className="border-primary/20 shadow-lg" data-testid="card-status">
              <CardHeader className="text-center pb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <CardTitle className="text-xl" data-testid="text-current-time">
                    {format(currentTime, "EEEE, dd MMMM yyyy", { locale: id })}
                  </CardTitle>
                </div>
                <p className="text-5xl font-bold text-primary animate-pulse" data-testid="text-current-clock">
                  {format(currentTime, "HH:mm:ss")}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center gap-4">
                  <span className="text-sm font-medium text-muted-foreground">Status:</span>
                  {getStatusBadge()}
                </div>

                {recognizedEmployee && (
                  <div className="text-center bg-primary/10 rounded-lg p-4 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <User className="w-5 h-5 text-primary" />
                      <p className="text-sm text-muted-foreground">Karyawan Terdeteksi:</p>
                    </div>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-employee-name">
                      {recognizedEmployee.name}
                    </p>
                    <p className="text-sm text-muted-foreground font-mono mt-1" data-testid="text-employee-id">
                      ID: {recognizedEmployee.employeeId}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {recognizedEmployee.position}
                    </p>
                  </div>
                )}

                {recognizeMutation.isPending && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Mengenali wajah...</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Camera */}
            <EnhancedFaceCamera
              onFaceDetected={handleFaceDetected}
              onFaceCount={setFaceCount}
              isCapturing={true}
              className="w-full"
              showControls={true}
            />

            {/* Message Alert */}
            {message && (
              <Alert
                variant={message.type === "error" ? "destructive" : "default"}
                data-testid="alert-message"
                className="animate-in slide-in-from-bottom-4"
              >
                <AlertDescription className="text-center">{message.text}</AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {attendanceStatus === "not_checked_in" && (
                <Button
                  size="lg"
                  className="w-full text-lg font-semibold h-14 shadow-lg hover:shadow-xl transition-all"
                  onClick={handleCheckIn}
                  disabled={isLoading || !recognizedEmployee || faceCount !== 1}
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
                      Check-in Sekarang
                    </>
                  )}
                </Button>
              )}

              {attendanceStatus === "checked_in" && (
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="text-base font-semibold h-14 shadow-md hover:shadow-lg transition-all"
                    onClick={handleBreak}
                    disabled={isLoading}
                    data-testid="button-break"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Proses...
                      </>
                    ) : (
                      <>
                        <Coffee className="w-5 h-5 mr-2" />
                        Mulai Istirahat
                      </>
                    )}
                  </Button>
                  <Button
                    size="lg"
                    className="text-base font-semibold h-14 shadow-md hover:shadow-lg transition-all"
                    onClick={handleCheckOut}
                    disabled={isLoading}
                    data-testid="button-checkout"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Proses...
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
                  className="w-full text-lg font-semibold h-14 shadow-lg hover:shadow-xl transition-all"
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
                <Alert data-testid="alert-checked-out" className="border-green-500/50 bg-green-500/10">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <AlertDescription className="text-center font-medium">
                    Anda telah selesai bekerja hari ini. Terima kasih dan sampai jumpa besok!
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          {/* Right Column - Statistics */}
          <div className="lg:col-span-1">
            <KioskStatistics />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function EnhancedLanding() {
  return (
    <ErrorBoundary>
      <EnhancedLandingContent />
    </ErrorBoundary>
  );
}
