import { Home, Users, Calendar, FileText, LogOut, UserCircle, BarChart3, Clock } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface AppSidebarProps {
  role: "admin" | "hrd" | "employee";
  userName?: string;
  onLogout?: () => void;
}

export function AppSidebar({ role, userName = "User", onLogout }: AppSidebarProps) {
  const [location] = useLocation();

  const adminItems = [
    { title: "Dashboard", url: "/admin", icon: Home },
    { title: "Kelola Karyawan", url: "/admin/employees", icon: Users },
    { title: "Jadwal", url: "/admin/schedules", icon: Calendar },
    { title: "Laporan Absensi", url: "/admin/reports", icon: FileText },
  ];

  const hrdItems = [
    { title: "Dashboard", url: "/hrd", icon: Home },
    { title: "Laporan Absensi", url: "/hrd/reports", icon: BarChart3 },
    { title: "Statistik", url: "/hrd/statistics", icon: FileText },
  ];

  const employeeItems = [
    { title: "Dashboard", url: "/employee", icon: Home },
    { title: "Riwayat Absensi", url: "/employee/history", icon: Clock },
    { title: "Jadwal Saya", url: "/employee/schedule", icon: Calendar },
  ];

  const items = role === "admin" ? adminItems : role === "hrd" ? hrdItems : employeeItems;
  const roleLabel = role === "admin" ? "Administrator" : role === "hrd" ? "HRD" : "Karyawan";

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary text-primary-foreground">
            <UserCircle className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-semibold text-sidebar-foreground">Absensi</span>
            <span className="text-xs text-muted-foreground">Face Recognition</span>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="p-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground mb-2">
            {roleLabel}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = location === item.url || 
                  (item.url !== "/" && location.startsWith(item.url));
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <Link href={item.url}>
                        <item.icon className="w-4 h-4" />
                        <span className="text-sm">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {getInitials(userName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{userName}</p>
            <p className="text-xs text-muted-foreground capitalize">{roleLabel}</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full justify-start gap-2" 
          onClick={onLogout}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4" />
          Keluar
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
