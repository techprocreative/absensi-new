import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, UserCircle, AlertCircle, Eye, EyeOff, ArrowLeft, Lock, User } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { authApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ErrorBoundary } from "@/components/error-boundary";
import { useToast } from "@/hooks/use-toast";

function LoginContent() {
  const [, setLocation] = useLocation();
  const { login, user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});

  useEffect(() => {
    if (isAuthenticated && user) {
      const role = user.role;
      if (role === "admin") {
        setLocation("/admin");
      } else if (role === "hrd") {
        setLocation("/hrd");
      } else if (role === "employee") {
        setLocation("/employee");
      } else if (role === "salesman") {
        setLocation("/salesman");
      }
    }
  }, [isAuthenticated, user, setLocation]);

  // Load saved credentials if remember me was checked
  useEffect(() => {
    const savedUsername = localStorage.getItem("rememberedUsername");
    if (savedUsername) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
  }, []);

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      return await authApi.login(credentials.username, credentials.password);
    },
    onSuccess: (data) => {
      // Save username if remember me is checked
      if (rememberMe) {
        localStorage.setItem("rememberedUsername", username);
      } else {
        localStorage.removeItem("rememberedUsername");
      }

      // Login context now handles token storage
      login(data.user, data.employee, data.token);
      
      toast({
        title: "Login berhasil!",
        description: `Selamat datang, ${data.user.username}`,
      });

      const role = data.user.role;
      if (role === "admin") {
        setLocation("/admin");
      } else if (role === "hrd") {
        setLocation("/hrd");
      } else if (role === "employee") {
        setLocation("/employee");
      } else if (role === "salesman") {
        setLocation("/salesman");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Login gagal",
        description: error.message || "Username atau password salah",
        variant: "destructive",
      });
    }
  });

  const validateForm = () => {
    const newErrors: { username?: string; password?: string } = {};
    
    if (!username.trim()) {
      newErrors.username = "Username harus diisi";
    } else if (username.length < 3) {
      newErrors.username = "Username minimal 3 karakter";
    }
    
    if (!password) {
      newErrors.password = "Password harus diisi";
    } else if (password.length < 3) {
      newErrors.password = "Password minimal 3 karakter";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    loginMutation.mutate({ username, password });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col items-center justify-center p-6 relative">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-lg">
            <UserCircle className="w-12 h-12" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            FaceAttend
          </h1>
          <p className="text-muted-foreground">Sistem Absensi Karyawan</p>
          <p className="text-sm text-muted-foreground">Login untuk mengakses dashboard</p>
        </div>

        <Card className="shadow-xl border-primary/20">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">Login</CardTitle>
            <CardDescription>Masukkan kredensial Anda untuk melanjutkan</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Masukkan username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errors.username) setErrors({ ...errors, username: undefined });
                  }}
                  disabled={loginMutation.isPending}
                  data-testid="input-username"
                  className={errors.username ? "border-destructive" : ""}
                  autoComplete="username"
                  autoFocus
                />
                {errors.username && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.username}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors({ ...errors, password: undefined });
                    }}
                    disabled={loginMutation.isPending}
                    data-testid="input-password"
                    className={`pr-10 ${errors.password ? "border-destructive" : ""}`}
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loginMutation.isPending}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.password}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  disabled={loginMutation.isPending}
                />
                <Label
                  htmlFor="remember"
                  className="text-sm font-normal cursor-pointer"
                >
                  Ingat saya
                </Label>
              </div>

              {loginMutation.isError && (
                <Alert variant="destructive" data-testid="alert-error">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {(loginMutation.error as any)?.message || "Username atau password salah"}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                disabled={loginMutation.isPending || !username || !password}
                data-testid="button-login"
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5 mr-2" />
                    Login
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
                <UserCircle className="w-4 h-4" />
                Demo Credentials:
              </p>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 bg-background rounded hover:bg-muted/50 transition-colors cursor-pointer"
                     onClick={() => { setUsername("admin"); setPassword("admin"); }}>
                  <span className="font-medium">Admin</span>
                  <code className="text-muted-foreground">admin / admin</code>
                </div>
                <div className="flex items-center justify-between p-2 bg-background rounded hover:bg-muted/50 transition-colors cursor-pointer"
                     onClick={() => { setUsername("hrd"); setPassword("hrd"); }}>
                  <span className="font-medium">HRD</span>
                  <code className="text-muted-foreground">hrd / hrd</code>
                </div>
                <div className="flex items-center justify-between p-2 bg-background rounded hover:bg-muted/50 transition-colors cursor-pointer"
                     onClick={() => { setUsername("emp"); setPassword("emp"); }}>
                  <span className="font-medium">Employee</span>
                  <code className="text-muted-foreground">emp / emp</code>
                </div>
                <div className="flex items-center justify-between p-2 bg-background rounded hover:bg-muted/50 transition-colors cursor-pointer"
                     onClick={() => { setUsername("salesman"); setPassword("salesman"); }}>
                  <span className="font-medium">Salesman</span>
                  <code className="text-muted-foreground">salesman / salesman</code>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3 italic">
                💡 Tip: Klik untuk auto-fill kredensial
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            data-testid="link-back-home"
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Halaman Kiosk
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <ErrorBoundary>
      <LoginContent />
    </ErrorBoundary>
  );
}
