import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertEmployeeSchema, 
  insertAttendanceSchema, 
  insertScheduleSchema 
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ error: "Username atau password salah" });
      }

      let employee = null;
      if (user.employeeId) {
        employee = await storage.getEmployeeByEmployeeId(user.employeeId);
      }

      res.json({ 
        user: { 
          id: user.id, 
          username: user.username, 
          role: user.role,
          employeeId: user.employeeId 
        },
        employee
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Terjadi kesalahan saat login" });
    }
  });

  app.get("/api/employees", async (req, res) => {
    try {
      const activeOnly = req.query.activeOnly === 'true';
      const employees = await storage.getAllEmployees(activeOnly);
      res.json(employees);
    } catch (error) {
      console.error("Get employees error:", error);
      res.status(500).json({ error: "Terjadi kesalahan saat mengambil data karyawan" });
    }
  });

  app.get("/api/employees/:id", async (req, res) => {
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

  app.post("/api/employees", async (req, res) => {
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

  app.put("/api/employees/:id", async (req, res) => {
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

  app.delete("/api/employees/:id", async (req, res) => {
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

  app.post("/api/employees/:id/face", async (req, res) => {
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

  app.get("/api/attendance", async (req, res) => {
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

  app.get("/api/attendance/employee/:employeeId", async (req, res) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      const attendances = await storage.getAttendancesByEmployee(
        req.params.employeeId,
        startDate,
        endDate
      );
      res.json(attendances);
    } catch (error) {
      console.error("Get employee attendances error:", error);
      res.status(500).json({ error: "Terjadi kesalahan saat mengambil data absensi" });
    }
  });

  app.get("/api/schedules", async (req, res) => {
    try {
      const schedules = await storage.getAllSchedules();
      res.json(schedules);
    } catch (error) {
      console.error("Get schedules error:", error);
      res.status(500).json({ error: "Terjadi kesalahan saat mengambil data jadwal" });
    }
  });

  app.get("/api/schedules/employee/:employeeId", async (req, res) => {
    try {
      const schedules = await storage.getSchedulesByEmployee(req.params.employeeId);
      res.json(schedules);
    } catch (error) {
      console.error("Get employee schedules error:", error);
      res.status(500).json({ error: "Terjadi kesalahan saat mengambil data jadwal" });
    }
  });

  app.post("/api/schedules", async (req, res) => {
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

  app.put("/api/schedules/:id", async (req, res) => {
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

  app.delete("/api/schedules/:id", async (req, res) => {
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

  app.get("/api/reports/statistics", async (req, res) => {
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
