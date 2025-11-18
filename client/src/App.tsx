import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthProvider, RequireAuth, useAuth } from "@/lib/auth-context";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminEmployees from "@/pages/admin-employees";
import AdminSchedules from "@/pages/admin-schedules";
import AdminReports from "@/pages/admin-reports";
import HRDDashboard from "@/pages/hrd-dashboard";
import EmployeeDashboard from "@/pages/employee-dashboard";
import EmployeeHistory from "@/pages/employee-history";
import EmployeeSchedule from "@/pages/employee-schedule";
import SalesmanDashboard from "@/pages/salesman-dashboard";

type DashboardLayoutProps = {
  role: "admin" | "hrd" | "employee" | "salesman";
  children: React.ReactNode;
};

function DashboardLayout({ role, children }: DashboardLayoutProps) {
  const { user, employee, logout } = useAuth();

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  const userName = employee?.name || user?.username || "User";

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar role={role} userName={userName} onLogout={logout} />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 p-4 border-b border-border bg-card">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto bg-background">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AdminRoutes() {
  return (
    <RequireAuth allowedRoles={["admin"]}>
      <DashboardLayout role="admin">
        <Switch>
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/employees" component={AdminEmployees} />
          <Route path="/admin/schedules" component={AdminSchedules} />
          <Route path="/admin/reports" component={AdminReports} />
          <Route component={NotFound} />
        </Switch>
      </DashboardLayout>
    </RequireAuth>
  );
}

function HRDRoutes() {
  return (
    <RequireAuth allowedRoles={["hrd"]}>
      <DashboardLayout role="hrd">
        <Switch>
          <Route path="/hrd" component={HRDDashboard} />
          <Route path="/hrd/reports" component={AdminReports} />
          <Route path="/hrd/statistics" component={HRDDashboard} />
          <Route component={NotFound} />
        </Switch>
      </DashboardLayout>
    </RequireAuth>
  );
}

function EmployeeRoutes() {
  return (
    <RequireAuth allowedRoles={["employee"]}>
      <DashboardLayout role="employee">
        <Switch>
          <Route path="/employee" component={EmployeeDashboard} />
          <Route path="/employee/history" component={EmployeeHistory} />
          <Route path="/employee/schedule" component={EmployeeSchedule} />
          <Route component={NotFound} />
        </Switch>
      </DashboardLayout>
    </RequireAuth>
  );
}

function SalesmanRoutes() {
  return (
    <RequireAuth allowedRoles={["salesman"]}>
      <DashboardLayout role="salesman">
        <Switch>
          <Route path="/salesman" component={SalesmanDashboard} />
          <Route component={NotFound} />
        </Switch>
      </DashboardLayout>
    </RequireAuth>
  );
}

function Router() {
  const [location] = useLocation();

  if (location.startsWith("/admin")) {
    return <AdminRoutes />;
  }

  if (location.startsWith("/hrd")) {
    return <HRDRoutes />;
  }

  if (location.startsWith("/employee")) {
    return <EmployeeRoutes />;
  }

  if (location.startsWith("/salesman")) {
    return <SalesmanRoutes />;
  }

  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
