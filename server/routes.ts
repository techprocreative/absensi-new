import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertEmployeeSchema, 
  insertAttendanceSchema, 
  insertScheduleSchema,
  insertGpsAttendanceSchema,
  insertCustomerVisitSchema,
  insertSalesTargetSchema
} from "@shared/schema";
import { authMiddleware, requireRole, generateToken, type AuthRequest } from "./middleware/auth";
import { authRateLimiter } from "./middleware/security";
import { hashPassword, comparePassword, validatePassword } from "./utils/password";

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/auth/login", authRateLimiter, async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username dan password harus diisi" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Username atau password salah" });
      }

      // Check if password is hashed (starts with $2a$ or $2b$ for bcrypt)
      const isPasswordHashed = user.password.startsWith("$2");
      let isPasswordValid = false;

      if (isPasswordHashed) {
        isPasswordValid = await comparePassword(password, user.password);
      } else {
        // Fallback for unhashed passwords (during migration)
        isPasswordValid = user.password === password;
        // Auto-hash the password for next time
        if (isPasswordValid) {
          const hashedPassword = await hashPassword(password);
          await storage.updateUserPassword(user.id, hashedPassword);
        }
      }

      if (!isPasswordValid) {
        return res.status(401).json({ error: "Username atau password salah" });
      }

      let employee = null;
      if (user.employeeId) {
        employee = await storage.getEmployeeByEmployeeId(user.employeeId);
      }

      const token = generateToken({
        id: user.id,
        username: user.username,
        role: user.role,
        employeeId: user.employeeId || undefined,
      });

      res.json({ 
        user: { 
          id: user.id, 
          username: user.username, 
          role: user.role,
          employeeId: user.employeeId 
        },
        employee,
        token
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Terjadi kesalahan saat login" });
    }
  });

  // Employee routes - protected
  app.get("/api/employees", authMiddleware, requireRole("admin", "hrd"), async (req, res) => {
    try {
      const activeOnly = req.query.activeOnly === 'true';
      const employees = await storage.getAllEmployees(activeOnly);
      res.json(employees);
    } catch (error) {
      console.error("Get employees error:", error);
      res.status(500).json({ error: "Terjadi kesalahan saat mengambil data karyawan" });
    }
  });

  app.get("/api/employees/:id", authMiddleware, async (req, res) => {
    try {
      const employee = await storage.getEmployee(req.params.id);
      if (!employee) {
        return res.status(404).json({ error: "Karyawan tidak ditemukan" });
      }
      res.json(employee);
    } catch (error) {
      console.error("Get employee error:", error);
      res.status(500).json({ error: "Terjadi kesalahan saat mengambil data karyawan" });
    }
  });

  app.post("/api/employees", authMiddleware, requireRole("admin", "hrd"), async (req, res) => {
    try {
      const validatedData = insertEmployeeSchema.parse(req.body);
      const employee = await storage.createEmployee(validatedData);
      res.status(201).json(employee);
    } catch (error: any) {
      console.error("Create employee error:", error);
      if (error.errors) {
        return res.status(400).json({ error: "Data tidak valid", details: error.errors });
      }
      res.status(500).json({ error: "Terjadi kesalahan saat menambah karyawan" });
    }
  });

  app.put("/api/employees/:id", authMiddleware, requireRole("admin", "hrd"), async (req, res) => {
    try {
      const updated = await storage.updateEmployee(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Karyawan tidak ditemukan" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Update employee error:", error);
      res.status(500).json({ error: "Terjadi kesalahan saat mengupdate karyawan" });
    }
  });

  app.delete("/api/employees/:id", authMiddleware, requireRole("admin", "hrd"), async (req, res) => {
    try {
      const deleted = await storage.deleteEmployee(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Karyawan tidak ditemukan" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Delete employee error:", error);
      res.status(500).json({ error: "Terjadi kesalahan saat menghapus karyawan" });
    }
  });

  app.post("/api/employees/:id/face", authMiddleware, requireRole("admin", "hrd"), async (req, res) => {
    try {
      const { descriptors } = req.body;
      
      if (!descriptors || !Array.isArray(descriptors)) {
        return res.status(400).json({ error: "Face descriptors tidak valid" });
      }

      const updated = await storage.updateEmployee(req.params.id, {
        faceDescriptors: descriptors
      });

      if (!updated) {
        return res.status(404).json({ error: "Karyawan tidak ditemukan" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Register face error:", error);
      res.status(500).json({ error: "Terjadi kesalahan saat registrasi wajah" });
    }
  });

  app.post("/api/attendance/recognize", async (req, res) => {
    try {
      const { descriptor } = req.body;
      
      if (!descriptor || !Array.isArray(descriptor)) {
        return res.status(400).json({ error: "Face descriptor tidak valid" });
      }

      const employees = await storage.getAllEmployees(true);
      
      let bestMatch: { employee: any; distance: number } | null = null;
      const MATCH_THRESHOLD = 0.6;

      for (const employee of employees) {
        if (employee.faceDescriptors && Array.isArray(employee.faceDescriptors)) {
          for (const storedDescriptor of employee.faceDescriptors) {
            const distance = euclideanDistance(descriptor, storedDescriptor);
            
            if (distance < MATCH_THRESHOLD && (!bestMatch || distance < bestMatch.distance)) {
              bestMatch = { employee, distance };
            }
          }
        }
      }

      if (!bestMatch) {
        return res.status(404).json({ error: "Wajah tidak dikenali" });
      }

      const todayAttendance = await storage.getTodayAttendance(bestMatch.employee.id);

      res.json({
        employee: bestMatch.employee,
        attendance: todayAttendance,
        confidence: 1 - bestMatch.distance
      });
    } catch (error) {
      console.error("Face recognition error:", error);
      res.status(500).json({ error: "Terjadi kesalahan saat mengenali wajah" });
    }
  });

  app.get("/api/attendance/today/:employeeId", async (req, res) => {
    try {
      const attendance = await storage.getTodayAttendance(req.params.employeeId);
      res.json(attendance || null);
    } catch (error) {
      console.error("Get today attendance error:", error);
      res.status(500).json({ error: "Terjadi kesalahan saat mengambil data absensi" });
    }
  });

  app.post("/api/attendance/checkin", async (req, res) => {
    try {
      const { employeeId } = req.body;
      
      const employee = await storage.getEmployee(employeeId);
      if (!employee) {
        return res.status(404).json({ error: "Karyawan tidak ditemukan" });
      }

      const today = new Date().toISOString().split('T')[0];
      const existing = await storage.getTodayAttendance(employeeId);

      if (existing) {
        return res.status(400).json({ error: "Anda sudah check-in hari ini" });
      }

      const attendance = await storage.createAttendance({
        employeeId,
        date: today,
        checkIn: new Date(),
        status: "present"
      });

      res.status(201).json(attendance);
    } catch (error) {
      console.error("Check-in error:", error);
      res.status(500).json({ error: "Terjadi kesalahan saat check-in" });
    }
  });

  app.post("/api/attendance/break-start", async (req, res) => {
    try {
      const { employeeId } = req.body;
      
      const todayAttendance = await storage.getTodayAttendance(employeeId);
      if (!todayAttendance) {
        return res.status(404).json({ error: "Belum check-in hari ini" });
      }

      if (todayAttendance.breakStart) {
        return res.status(400).json({ error: "Sudah memulai istirahat" });
      }

      const updated = await storage.updateAttendance(todayAttendance.id, {
        breakStart: new Date(),
        status: "on_break"
      });

      res.json(updated);
    } catch (error) {
      console.error("Break start error:", error);
      res.status(500).json({ error: "Terjadi kesalahan saat memulai istirahat" });
    }
  });

  app.post("/api/attendance/break-end", async (req, res) => {
    try {
      const { employeeId } = req.body;
      
      const todayAttendance = await storage.getTodayAttendance(employeeId);
      if (!todayAttendance) {
        return res.status(404).json({ error: "Belum check-in hari ini" });
      }

      if (!todayAttendance.breakStart) {
        return res.status(400).json({ error: "Belum memulai istirahat" });
      }

      if (todayAttendance.breakEnd) {
        return res.status(400).json({ error: "Sudah mengakhiri istirahat" });
      }

      const updated = await storage.updateAttendance(todayAttendance.id, {
        breakEnd: new Date(),
        status: "present"
      });

      res.json(updated);
    } catch (error) {
      console.error("Break end error:", error);
      res.status(500).json({ error: "Terjadi kesalahan saat mengakhiri istirahat" });
    }
  });

  app.post("/api/attendance/checkout", async (req, res) => {
    try {
      const { employeeId } = req.body;
      
      const todayAttendance = await storage.getTodayAttendance(employeeId);
      if (!todayAttendance) {
        return res.status(404).json({ error: "Belum check-in hari ini" });
      }

      if (todayAttendance.checkOut) {
        return res.status(400).json({ error: "Sudah check-out hari ini" });
      }

      const updated = await storage.updateAttendance(todayAttendance.id, {
        checkOut: new Date(),
        status: "present"
      });

      res.json(updated);
    } catch (error) {
      console.error("Check-out error:", error);
      res.status(500).json({ error: "Terjadi kesalahan saat check-out" });
    }
  });

  // Attendance view routes - protected
  app.get("/api/attendance", authMiddleware, requireRole("admin", "hrd"), async (req, res) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      const attendances = await storage.getAllAttendances(startDate, endDate);
      res.json(attendances);
    } catch (error) {
      console.error("Get attendances error:", error);
      res.status(500).json({ error: "Terjadi kesalahan saat mengambil data absensi" });
    }
  });

  app.get("/api/attendance/employee/:employeeId", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const requestedEmployeeId = req.params.employeeId;
      
      // Employees can only view their own attendance
      if (req.user?.role === "employee" && req.user?.employeeId !== requestedEmployeeId) {
        return res.status(403).json({ error: "Anda tidak memiliki izin untuk melihat data ini" });
      }

      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      const attendances = await storage.getAttendancesByEmployee(
        requestedEmployeeId,
        startDate,
        endDate
      );
      res.json(attendances);
    } catch (error) {
      console.error("Get employee attendances error:", error);
      res.status(500).json({ error: "Terjadi kesalahan saat mengambil data absensi" });
    }
  });

  // Schedule routes - protected
  app.get("/api/schedules", authMiddleware, requireRole("admin", "hrd"), async (req, res) => {
    try {
      const schedules = await storage.getAllSchedules();
      res.json(schedules);
    } catch (error) {
      console.error("Get schedules error:", error);
      res.status(500).json({ error: "Terjadi kesalahan saat mengambil data jadwal" });
    }
  });

  app.get("/api/schedules/employee/:employeeId", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const requestedEmployeeId = req.params.employeeId;
      
      // Employees can only view their own schedule
      if (req.user?.role === "employee" && req.user?.employeeId !== requestedEmployeeId) {
        return res.status(403).json({ error: "Anda tidak memiliki izin untuk melihat data ini" });
      }

      const schedules = await storage.getSchedulesByEmployee(requestedEmployeeId);
      res.json(schedules);
    } catch (error) {
      console.error("Get employee schedules error:", error);
      res.status(500).json({ error: "Terjadi kesalahan saat mengambil data jadwal" });
    }
  });

  app.post("/api/schedules", authMiddleware, requireRole("admin"), async (req, res) => {
    try {
      const validatedData = insertScheduleSchema.parse(req.body);
      const schedule = await storage.createSchedule(validatedData);
      res.status(201).json(schedule);
    } catch (error: any) {
      console.error("Create schedule error:", error);
      if (error.errors) {
        return res.status(400).json({ error: "Data tidak valid", details: error.errors });
      }
      res.status(500).json({ error: "Terjadi kesalahan saat menambah jadwal" });
    }
  });

  app.put("/api/schedules/:id", authMiddleware, requireRole("admin"), async (req, res) => {
    try {
      const updated = await storage.updateSchedule(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Jadwal tidak ditemukan" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Update schedule error:", error);
      res.status(500).json({ error: "Terjadi kesalahan saat mengupdate jadwal" });
    }
  });

  app.delete("/api/schedules/:id", authMiddleware, requireRole("admin"), async (req, res) => {
    try {
      const deleted = await storage.deleteSchedule(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Jadwal tidak ditemukan" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Delete schedule error:", error);
      res.status(500).json({ error: "Terjadi kesalahan saat menghapus jadwal" });
    }
  });

  // Reports routes - protected
  app.get("/api/reports/statistics", authMiddleware, requireRole("admin", "hrd"), async (req, res) => {
    try {
      const employees = await storage.getAllEmployees(true);
      const today = new Date().toISOString().split('T')[0];
      const attendances = await storage.getAllAttendances();
      
      const todayAttendances = attendances.filter(att => att.date === today);
      
      const present = todayAttendances.filter(att => att.status === 'present' || att.status === 'on_break').length;
      const late = todayAttendances.filter(att => att.status === 'late').length;
      const absent = employees.length - todayAttendances.length;

      res.json({
        totalEmployees: employees.length,
        presentToday: present,
        lateToday: late,
        absentToday: absent,
        attendanceRate: employees.length > 0 ? ((present / employees.length) * 100).toFixed(1) : 0
      });
    } catch (error) {
      console.error("Get statistics error:", error);
      res.status(500).json({ error: "Terjadi kesalahan saat mengambil statistik" });
    }
  });

  // GPS Attendance routes - for salesmen
  app.get("/api/gps-attendance/today/:employeeId", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const requestedEmployeeId = req.params.employeeId;
      
      // Salesmen and employees can only view their own attendance
      if ((req.user?.role === "salesman" || req.user?.role === "employee") && req.user?.employeeId !== requestedEmployeeId) {
        return res.status(403).json({ error: "Anda tidak memiliki izin untuk melihat data ini" });
      }

      const attendance = await storage.getTodayGpsAttendance(requestedEmployeeId);
      res.json(attendance || null);
    } catch (error) {
      console.error("Get today GPS attendance error:", error);
      res.status(500).json({ error: "Terjadi kesalahan saat mengambil data absensi GPS" });
    }
  });

  app.post("/api/gps-attendance/checkin", authMiddleware, requireRole("salesman", "admin", "hrd"), async (req: AuthRequest, res) => {
    try {
      const { 
        employeeId, 
        latitude, 
        longitude, 
        address, 
        locationName,
        notes 
      } = req.body;

      // Salesmen can only check-in for themselves
      if (req.user?.role === "salesman" && req.user?.employeeId !== employeeId) {
        return res.status(403).json({ error: "Anda tidak dapat melakukan check-in untuk orang lain" });
      }
      
      const employee = await storage.getEmployeeByEmployeeId(employeeId);
      if (!employee) {
        return res.status(404).json({ error: "Karyawan tidak ditemukan" });
      }

      const today = new Date().toISOString().split('T')[0];
      const existing = await storage.getTodayGpsAttendance(employeeId);

      if (existing) {
        return res.status(400).json({ error: "Anda sudah check-in hari ini" });
      }

      const attendance = await storage.createGpsAttendance({
        employeeId,
        date: today,
        checkInLatitude: latitude,
        checkInLongitude: longitude,
        checkInAddress: address,
        checkInLocationName: locationName,
        checkIn: new Date(),
        status: "present",
        notes
      });

      res.status(201).json(attendance);
    } catch (error: any) {
      console.error("GPS Check-in error:", error);
      if (error.errors) {
        return res.status(400).json({ error: "Data tidak valid", details: error.errors });
      }
      res.status(500).json({ error: "Terjadi kesalahan saat GPS check-in" });
    }
  });

  app.post("/api/gps-attendance/checkout", authMiddleware, requireRole("salesman", "admin", "hrd"), async (req: AuthRequest, res) => {
    try {
      const { 
        employeeId, 
        latitude, 
        longitude, 
        address, 
        locationName,
        notes 
      } = req.body;

      // Salesmen can only check-out for themselves
      if (req.user?.role === "salesman" && req.user?.employeeId !== employeeId) {
        return res.status(403).json({ error: "Anda tidak dapat melakukan check-out untuk orang lain" });
      }
      
      const todayAttendance = await storage.getTodayGpsAttendance(employeeId);
      if (!todayAttendance) {
        return res.status(404).json({ error: "Belum check-in hari ini" });
      }

      if (todayAttendance.checkOut) {
        return res.status(400).json({ error: "Sudah check-out hari ini" });
      }

      const updated = await storage.updateGpsAttendance(todayAttendance.id, {
        checkOutLatitude: latitude,
        checkOutLongitude: longitude,
        checkOutAddress: address,
        checkOutLocationName: locationName,
        checkOut: new Date(),
        status: "present",
        notes
      });

      res.json(updated);
    } catch (error: any) {
      console.error("GPS Check-out error:", error);
      if (error.errors) {
        return res.status(400).json({ error: "Data tidak valid", details: error.errors });
      }
      res.status(500).json({ error: "Terjadi kesalahan saat GPS check-out" });
    }
  });

  app.get("/api/gps-attendance/employee/:employeeId", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const requestedEmployeeId = req.params.employeeId;
      
      // Salesmen can only view their own attendance
      if (req.user?.role === "salesman" && req.user?.employeeId !== requestedEmployeeId) {
        return res.status(403).json({ error: "Anda tidak memiliki izin untuk melihat data ini" });
      }

      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      const attendances = await storage.getGpsAttendancesByEmployee(
        requestedEmployeeId,
        startDate,
        endDate
      );
      res.json(attendances);
    } catch (error) {
      console.error("Get GPS attendances error:", error);
      res.status(500).json({ error: "Terjadi kesalahan saat mengambil data absensi GPS" });
    }
  });

  app.get("/api/gps-attendance", authMiddleware, requireRole("admin", "hrd"), async (req, res) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      const attendances = await storage.getAllGpsAttendances(startDate, endDate);
      res.json(attendances);
    } catch (error) {
      console.error("Get all GPS attendances error:", error);
      res.status(500).json({ error: "Terjadi kesalahan saat mengambil data absensi GPS" });
    }
  });

  // Customer Visit routes - for salesmen
  app.get("/api/customer-visits/employee/:employeeId", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const requestedEmployeeId = req.params.employeeId;
      
      // Salesmen can only view their own visits
      if (req.user?.role === "salesman" && req.user?.employeeId !== requestedEmployeeId) {
        return res.status(403).json({ error: "Anda tidak memiliki izin untuk melihat data ini" });
      }

      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      const visits = await storage.getCustomerVisitsByEmployee(
        requestedEmployeeId,
        startDate,
        endDate
      );
      res.json(visits);
    } catch (error) {
      console.error("Get customer visits error:", error);
      res.status(500).json({ error: "Terjadi kesalahan saat mengambil data kunjungan" });
    }
  });

  app.get("/api/customer-visits/today", authMiddleware, requireRole("admin", "hrd"), async (req, res) => {
    try {
      const today = new Date();
      const visits = await storage.getCustomerVisitsByDate(today);
      res.json(visits);
    } catch (error) {
      console.error("Get today customer visits error:", error);
      res.status(500).json({ error: "Terjadi kesalahan saat mengambil data kunjungan hari ini" });
    }
  });

  app.post("/api/customer-visits", authMiddleware, requireRole("salesman", "admin", "hrd"), async (req: AuthRequest, res) => {
    try {
      const validatedData = insertCustomerVisitSchema.parse(req.body);
      
      // Salesmen can only create visits for themselves
      if (req.user?.role === "salesman" && req.user?.employeeId !== validatedData.employeeId) {
        return res.status(403).json({ error: "Anda tidak dapat membuat kunjungan untuk orang lain" });
      }

      const visit = await storage.createCustomerVisit(validatedData);
      res.status(201).json(visit);
    } catch (error: any) {
      console.error("Create customer visit error:", error);
      if (error.errors) {
        return res.status(400).json({ error: "Data tidak valid", details: error.errors });
      }
      res.status(500).json({ error: "Terjadi kesalahan saat menambah kunjungan" });
    }
  });

  app.put("/api/customer-visits/:id", authMiddleware, requireRole("salesman", "admin", "hrd"), async (req: AuthRequest, res) => {
    try {
      const visit = await storage.getCustomerVisit(req.params.id);
      if (!visit) {
        return res.status(404).json({ error: "Kunjungan tidak ditemukan" });
      }

      // Salesmen can only update their own visits
      if (req.user?.role === "salesman" && req.user?.employeeId !== visit.employeeId) {
        return res.status(403).json({ error: "Anda tidak memiliki izin untuk mengupdate kunjungan ini" });
      }

      const updated = await storage.updateCustomerVisit(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Update customer visit error:", error);
      res.status(500).json({ error: "Terjadi kesalahan saat mengupdate kunjungan" });
    }
  });

  app.delete("/api/customer-visits/:id", authMiddleware, requireRole("salesman", "admin", "hrd"), async (req: AuthRequest, res) => {
    try {
      const visit = await storage.getCustomerVisit(req.params.id);
      if (!visit) {
        return res.status(404).json({ error: "Kunjungan tidak ditemukan" });
      }

      // Salesmen can only delete their own visits
      if (req.user?.role === "salesman" && req.user?.employeeId !== visit.employeeId) {
        return res.status(403).json({ error: "Anda tidak memiliki izin untuk menghapus kunjungan ini" });
      }

      const deleted = await storage.deleteCustomerVisit(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Kunjungan tidak ditemukan" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Delete customer visit error:", error);
      res.status(500).json({ error: "Terjadi kesalahan saat menghapus kunjungan" });
    }
  });

  app.get("/api/customer-visits", authMiddleware, requireRole("admin", "hrd"), async (req, res) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      const visits = await storage.getAllCustomerVisits(startDate, endDate);
      res.json(visits);
    } catch (error) {
      console.error("Get all customer visits error:", error);
      res.status(500).json({ error: "Terjadi kesalahan saat mengambil data kunjungan" });
    }
  });

  // Sales Target routes
  app.get("/api/sales-targets/employee/:employeeId", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const requestedEmployeeId = req.params.employeeId;
      const period = req.query.period as string;
      
      // Salesmen can only view their own targets
      if (req.user?.role === "salesman" && req.user?.employeeId !== requestedEmployeeId) {
        return res.status(403).json({ error: "Anda tidak memiliki izin untuk melihat data ini" });
      }

      const targets = await storage.getSalesTargetsByEmployee(requestedEmployeeId, period);
      res.json(targets);
    } catch (error) {
      console.error("Get sales targets error:", error);
      res.status(500).json({ error: "Terjadi kesalahan saat mengambil data target sales" });
    }
  });

  app.post("/api/sales-targets", authMiddleware, requireRole("admin", "hrd"), async (req, res) => {
    try {
      const validatedData = insertSalesTargetSchema.parse(req.body);
      const target = await storage.createSalesTarget(validatedData);
      res.status(201).json(target);
    } catch (error: any) {
      console.error("Create sales target error:", error);
      if (error.errors) {
        return res.status(400).json({ error: "Data tidak valid", details: error.errors });
      }
      res.status(500).json({ error: "Terjadi kesalahan saat menambah target sales" });
    }
  });

  app.put("/api/sales-targets/:id", authMiddleware, requireRole("admin", "hrd"), async (req, res) => {
    try {
      const updated = await storage.updateSalesTarget(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Target sales tidak ditemukan" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Update sales target error:", error);
      res.status(500).json({ error: "Terjadi kesalahan saat mengupdate target sales" });
    }
  });

  app.delete("/api/sales-targets/:id", authMiddleware, requireRole("admin", "hrd"), async (req, res) => {
    try {
      const deleted = await storage.deleteSalesTarget(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Target sales tidak ditemukan" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Delete sales target error:", error);
      res.status(500).json({ error: "Terjadi kesalahan saat menghapus target sales" });
    }
  });

  app.get("/api/sales-targets", authMiddleware, requireRole("admin", "hrd"), async (req, res) => {
    try {
      const targets = await storage.getAllSalesTargets();
      res.json(targets);
    } catch (error) {
      console.error("Get all sales targets error:", error);
      res.status(500).json({ error: "Terjadi kesalahan saat mengambil data target sales" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}

function euclideanDistance(arr1: number[], arr2: number[]): number {
  if (arr1.length !== arr2.length) {
    return Infinity;
  }
  
  let sum = 0;
  for (let i = 0; i < arr1.length; i++) {
    const diff = arr1[i] - arr2[i];
    sum += diff * diff;
  }
  
  return Math.sqrt(sum);
}
