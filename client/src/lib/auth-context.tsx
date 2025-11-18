import { createContext, useContext, useState, ReactNode } from "react";
import { useLocation } from "wouter";
import { tokenStorage } from "./api";

interface User {
  id: string;
  username: string;
  role: "admin" | "hrd" | "employee" | "salesman";
  employeeId: string | null;
}

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  position: string;
  email: string | null;
  phone: string | null;
  photo: string | null;
  faceDescriptors: any;
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  employee: Employee | null;
  login: (user: User, employee?: Employee, token?: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  // Only return user if token exists
  if (!tokenStorage.get()) return null;
  try {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function getStoredEmployee(): Employee | null {
  if (typeof window === "undefined") return null;
  // Only return employee if token exists
  if (!tokenStorage.get()) return null;
  try {
    const stored = localStorage.getItem("employee");
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(getStoredUser);
  const [employee, setEmployee] = useState<Employee | null>(getStoredEmployee);
  const [, setLocation] = useLocation();

  const login = (newUser: User, newEmployee?: Employee, token?: string) => {
    setUser(newUser);
    localStorage.setItem("user", JSON.stringify(newUser));
    
    if (newEmployee) {
      setEmployee(newEmployee);
      localStorage.setItem("employee", JSON.stringify(newEmployee));
    }

    // Store JWT token if provided
    if (token) {
      tokenStorage.set(token);
    }
  };

  const logout = () => {
    setUser(null);
    setEmployee(null);
    localStorage.removeItem("user");
    localStorage.removeItem("employee");
    tokenStorage.remove();
    setLocation("/login");
  };

  return (
    <AuthContext.Provider value={{ user, employee, login, logout, isAuthenticated: !!user && !!tokenStorage.get() }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function RequireAuth({ children, allowedRoles }: { children: ReactNode; allowedRoles?: string[] }) {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    setLocation("/login");
    return null;
  }

  return <>{children}</>;
}
