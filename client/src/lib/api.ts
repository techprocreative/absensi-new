// API client with JWT authentication support

const API_BASE = "";

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: any[];
    timestamp: string;
    path: string;
  };
}

export class ApiException extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any[]
  ) {
    super(message);
    this.name = "ApiException";
  }
}

// Token management
export const tokenStorage = {
  get: (): string | null => {
    return localStorage.getItem("authToken");
  },
  
  set: (token: string): void => {
    localStorage.setItem("authToken", token);
  },
  
  remove: (): void => {
    localStorage.removeItem("authToken");
  },
};

// Make authenticated API request
export async function apiRequest<T = any>(
  method: string,
  endpoint: string,
  body?: any,
  requiresAuth: boolean = true
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  // Add authorization header if required
  if (requiresAuth) {
    const token = tokenStorage.get();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    // Try to parse response as JSON
    let data;
    try {
      data = await response.json();
    } catch (e) {
      // If JSON parsing fails, handle as text
      const text = await response.text();
      data = { error: text || "Invalid response from server" };
    }

    // Handle 401 Unauthorized - clear token and redirect to login
    if (response.status === 401) {
      tokenStorage.remove();
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = "/login";
      }
      const errorMessage = typeof data === 'object' && data.error ? data.error : "Sesi Anda telah berakhir, silakan login kembali";
      throw new ApiException(401, "UNAUTHORIZED", errorMessage);
    }

    // Handle error responses
    if (!response.ok) {
      // Backend might return { error: "message" } or { error: { message: "..." } }
      let errorMessage = "Terjadi kesalahan";
      
      if (typeof data === 'object') {
        if (typeof data.error === 'string') {
          errorMessage = data.error;
        } else if (data.error && typeof data.error.message === 'string') {
          errorMessage = data.error.message;
        } else if (data.message) {
          errorMessage = data.message;
        }
      }
      
      throw new ApiException(
        response.status,
        data.error?.code || "ERROR",
        errorMessage,
        data.error?.details
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiException) {
      throw error;
    }
    
    // Network or other errors
    console.error("API request failed:", error);
    throw new ApiException(
      0,
      "NETWORK_ERROR",
      "Tidak dapat terhubung ke server. Periksa koneksi internet Anda."
    );
  }
}

// API helper methods
export const api = {
  get: <T = any>(endpoint: string, requiresAuth = true) =>
    apiRequest<T>("GET", endpoint, undefined, requiresAuth),
  
  post: <T = any>(endpoint: string, body?: any, requiresAuth = true) =>
    apiRequest<T>("POST", endpoint, body, requiresAuth),
  
  put: <T = any>(endpoint: string, body?: any, requiresAuth = true) =>
    apiRequest<T>("PUT", endpoint, body, requiresAuth),
  
  delete: <T = any>(endpoint: string, requiresAuth = true) =>
    apiRequest<T>("DELETE", endpoint, undefined, requiresAuth),
};

// Auth API
export const authApi = {
  login: async (username: string, password: string) => {
    const response = await apiRequest<{
      user: any;
      employee: any;
      token: string;
    }>("POST", "/api/auth/login", { username, password }, false);
    
    // Store token
    if (response.token) {
      tokenStorage.set(response.token);
    }
    
    return response;
  },
  
  logout: () => {
    tokenStorage.remove();
    window.location.href = "/login";
  },
  
  isAuthenticated: (): boolean => {
    return !!tokenStorage.get();
  },
};

// Employee API
export const employeeApi = {
  getAll: (activeOnly = false) => 
    api.get(`/api/employees?activeOnly=${activeOnly}`),
  
  getById: (id: string) => 
    api.get(`/api/employees/${id}`),
  
  create: (employee: any) => 
    api.post("/api/employees", employee),
  
  update: (id: string, employee: any) => 
    api.put(`/api/employees/${id}`, employee),
  
  delete: (id: string) => 
    api.delete(`/api/employees/${id}`),
  
  registerFace: (id: string, descriptors: any[]) => 
    api.post(`/api/employees/${id}/face`, { descriptors }),
};

// Attendance API
export const attendanceApi = {
  recognize: (descriptor: number[]) => 
    api.post("/api/attendance/recognize", { descriptor }, false),
  
  getTodayAttendance: (employeeId: string) => 
    api.get(`/api/attendance/today/${employeeId}`, false),
  
  checkIn: (employeeId: string) => 
    api.post("/api/attendance/checkin", { employeeId }, false),
  
  breakStart: (employeeId: string) => 
    api.post("/api/attendance/break-start", { employeeId }, false),
  
  breakEnd: (employeeId: string) => 
    api.post("/api/attendance/break-end", { employeeId }, false),
  
  checkOut: (employeeId: string) => 
    api.post("/api/attendance/checkout", { employeeId }, false),
  
  getAll: (startDate?: Date, endDate?: Date) => {
    let url = "/api/attendance";
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate.toISOString());
    if (endDate) params.append("endDate", endDate.toISOString());
    if (params.toString()) url += `?${params.toString()}`;
    return api.get(url);
  },
  
  getByEmployee: (employeeId: string, startDate?: Date, endDate?: Date) => {
    let url = `/api/attendance/employee/${employeeId}`;
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate.toISOString());
    if (endDate) params.append("endDate", endDate.toISOString());
    if (params.toString()) url += `?${params.toString()}`;
    return api.get(url);
  },
};

// Schedule API
export const scheduleApi = {
  getAll: () => api.get("/api/schedules"),
  
  getByEmployee: (employeeId: string) => 
    api.get(`/api/schedules/employee/${employeeId}`),
  
  create: (schedule: any) => 
    api.post("/api/schedules", schedule),
  
  update: (id: string, schedule: any) => 
    api.put(`/api/schedules/${id}`, schedule),
  
  delete: (id: string) => 
    api.delete(`/api/schedules/${id}`),
};

// Reports API
export const reportsApi = {
  getStatistics: () => api.get("/api/reports/statistics"),
};

// GPS Attendance API
export type GpsAttendancePayload = {
  employeeId: string;
  latitude: number;
  longitude: number;
  address?: string;
  locationName?: string;
  notes?: string;
};

export const gpsAttendanceApi = {
  getToday: (employeeId: string) => api.get(`/api/gps-attendance/today/${employeeId}`),
  getByEmployee: (employeeId: string, startDate?: Date, endDate?: Date) => {
    let url = `/api/gps-attendance/employee/${employeeId}`;
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate.toISOString());
    if (endDate) params.append("endDate", endDate.toISOString());
    if (params.toString()) url += `?${params.toString()}`;
    return api.get(url);
  },
  checkIn: (payload: GpsAttendancePayload) => api.post("/api/gps-attendance/checkin", payload),
  checkOut: (payload: GpsAttendancePayload) => api.post("/api/gps-attendance/checkout", payload),
};

// Customer visit API
export type VisitType = "new_customer" | "follow_up" | "complaint" | "delivery" | "other";

export type CustomerVisitPayload = {
  employeeId: string;
  customerId: string;
  customerName: string;
  customerAddress?: string;
  customerPhone?: string;
  latitude: number;
  longitude: number;
  address?: string;
  visitType: VisitType;
  purpose?: string;
  notes?: string;
  photos?: any;
  visitStart: string;
  visitEnd?: string;
  status?: string;
};

export const customerVisitApi = {
  getByEmployee: (employeeId: string, startDate?: Date, endDate?: Date) => {
    let url = `/api/customer-visits/employee/${employeeId}`;
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate.toISOString());
    if (endDate) params.append("endDate", endDate.toISOString());
    if (params.toString()) url += `?${params.toString()}`;
    return api.get(url);
  },
  create: (payload: CustomerVisitPayload) => api.post("/api/customer-visits", payload),
  update: (id: string, payload: Partial<CustomerVisitPayload>) => api.put(`/api/customer-visits/${id}`, payload),
  delete: (id: string) => api.delete(`/api/customer-visits/${id}`),
};

// Sales target API
export type SalesTargetPayload = {
  employeeId: string;
  period: "daily" | "weekly" | "monthly";
  targetValue: number;
  targetType: "visits" | "revenue" | "new_customers" | "orders";
  startDate: string;
  endDate: string;
  actualValue?: number;
  isCompleted?: boolean;
  notes?: string;
};

export const salesTargetApi = {
  getByEmployee: (employeeId: string, period?: string) => {
    let url = `/api/sales-targets/employee/${employeeId}`;
    if (period) {
      url += `?period=${period}`;
    }
    return api.get(url);
  },
  create: (payload: SalesTargetPayload) => api.post("/api/sales-targets", payload),
  update: (id: string, payload: Partial<SalesTargetPayload>) => api.put(`/api/sales-targets/${id}`, payload),
  delete: (id: string) => api.delete(`/api/sales-targets/${id}`),
};
