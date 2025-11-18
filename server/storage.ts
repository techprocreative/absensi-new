import { 
  type User, 
  type InsertUser,
  type Employee,
  type InsertEmployee,
  type Attendance,
  type InsertAttendance,
  type Schedule,
  type InsertSchedule,
  type AttendanceWithEmployee,
  type GpsAttendance,
  type InsertGpsAttendance,
  type CustomerVisit,
  type InsertCustomerVisit,
  type SalesTarget,
  type InsertSalesTarget,
  type GpsAttendanceWithEmployee,
  type CustomerVisitWithEmployee,
  type SalesTargetWithEmployee
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(userId: string, hashedPassword: string): Promise<boolean>;
  
  getEmployee(id: string): Promise<Employee | undefined>;
  getEmployeeByEmployeeId(employeeId: string): Promise<Employee | undefined>;
  getAllEmployees(activeOnly?: boolean): Promise<Employee[]>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: string, employee: Partial<InsertEmployee>): Promise<Employee | undefined>;
  deleteEmployee(id: string): Promise<boolean>;
  
  getAttendance(id: string): Promise<Attendance | undefined>;
  getAttendancesByEmployee(employeeId: string, startDate?: Date, endDate?: Date): Promise<Attendance[]>;
  getTodayAttendance(employeeId: string): Promise<Attendance | undefined>;
  getAllAttendances(startDate?: Date, endDate?: Date): Promise<AttendanceWithEmployee[]>;
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  updateAttendance(id: string, attendance: Partial<InsertAttendance>): Promise<Attendance | undefined>;
  
  getSchedule(id: string): Promise<Schedule | undefined>;
  getSchedulesByEmployee(employeeId: string): Promise<Schedule[]>;
  getAllSchedules(): Promise<Schedule[]>;
  createSchedule(schedule: InsertSchedule): Promise<Schedule>;
  updateSchedule(id: string, schedule: Partial<InsertSchedule>): Promise<Schedule | undefined>;
  deleteSchedule(id: string): Promise<boolean>;

  // GPS Attendance methods
  getGpsAttendance(id: string): Promise<GpsAttendance | undefined>;
  getTodayGpsAttendance(employeeId: string): Promise<GpsAttendance | undefined>;
  getGpsAttendancesByEmployee(employeeId: string, startDate?: Date, endDate?: Date): Promise<GpsAttendance[]>;
  getAllGpsAttendances(startDate?: Date, endDate?: Date): Promise<GpsAttendanceWithEmployee[]>;
  createGpsAttendance(attendance: InsertGpsAttendance): Promise<GpsAttendance>;
  updateGpsAttendance(id: string, attendance: Partial<InsertGpsAttendance>): Promise<GpsAttendance | undefined>;

  // Customer Visit methods
  getCustomerVisit(id: string): Promise<CustomerVisit | undefined>;
  getCustomerVisitsByEmployee(employeeId: string, startDate?: Date, endDate?: Date): Promise<CustomerVisit[]>;
  getCustomerVisitsByDate(date: Date): Promise<CustomerVisit[]>;
  getAllCustomerVisits(startDate?: Date, endDate?: Date): Promise<CustomerVisitWithEmployee[]>;
  createCustomerVisit(visit: InsertCustomerVisit): Promise<CustomerVisit>;
  updateCustomerVisit(id: string, visit: Partial<InsertCustomerVisit>): Promise<CustomerVisit | undefined>;
  deleteCustomerVisit(id: string): Promise<boolean>;

  // Sales Target methods
  getSalesTarget(id: string): Promise<SalesTarget | undefined>;
  getSalesTargetsByEmployee(employeeId: string, period?: string): Promise<SalesTarget[]>;
  getAllSalesTargets(): Promise<SalesTargetWithEmployee[]>;
  createSalesTarget(target: InsertSalesTarget): Promise<SalesTarget>;
  updateSalesTarget(id: string, target: Partial<InsertSalesTarget>): Promise<SalesTarget | undefined>;
  deleteSalesTarget(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private employees: Map<string, Employee>;
  private attendances: Map<string, Attendance>;
  private schedules: Map<string, Schedule>;
  private gpsAttendances: Map<string, GpsAttendance>;
  private customerVisits: Map<string, CustomerVisit>;
  private salesTargets: Map<string, SalesTarget>;

  constructor() {
    this.users = new Map();
    this.employees = new Map();
    this.attendances = new Map();
    this.schedules = new Map();
    this.gpsAttendances = new Map();
    this.customerVisits = new Map();
    this.salesTargets = new Map();
    this.seedData();
  }

  private seedData() {
    // Seed users with simple passwords for demo (will be auto-hashed on first login)
    const adminUser: User = {
      id: randomUUID(),
      username: "admin",
      password: "admin", // Simple password for demo
      role: "admin",
      employeeId: null,
    };
    
    const hrdUser: User = {
      id: randomUUID(),
      username: "hrd",
      password: "hrd", // Simple password for demo
      role: "hrd",
      employeeId: null,
    };

    const empUser: User = {
      id: randomUUID(),
      username: "emp",
      password: "emp", // Simple password for demo
      role: "employee",
      employeeId: "EMP001",
    };

    const salesmanUser: User = {
      id: randomUUID(),
      username: "salesman",
      password: "salesman", // Simple password for demo
      role: "salesman",
      employeeId: "EMP004",
    };

    this.users.set(adminUser.id, adminUser);
    this.users.set(hrdUser.id, hrdUser);
    this.users.set(empUser.id, empUser);
    this.users.set(salesmanUser.id, salesmanUser);

    // Seed employees with more realistic data
    const employees: Employee[] = [
      {
        id: randomUUID(),
        employeeId: "EMP001",
        name: "Budi Santoso",
        position: "Software Engineer",
        email: "budi.santoso@company.com",
        phone: "081234567890",
        photo: null,
        faceDescriptors: null,
        isActive: true,
        isSalesman: false,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        employeeId: "EMP002",
        name: "Siti Rahayu",
        position: "HR Manager",
        email: "siti@company.com",
        phone: "081234567891",
        photo: null,
        faceDescriptors: null,
        isActive: true,
        isSalesman: false,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        employeeId: "EMP003",
        name: "Ahmad Wijaya",
        position: "Designer",
        email: "ahmad@company.com",
        phone: "081234567892",
        photo: null,
        faceDescriptors: null,
        isActive: true,
        isSalesman: false,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        employeeId: "EMP004",
        name: "Rudi Hermawan",
        position: "Salesman",
        email: "rudi@company.com",
        phone: "081234567893",
        photo: null,
        faceDescriptors: null,
        isActive: true,
        isSalesman: true,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        employeeId: "EMP005",
        name: "Dewi Kartika",
        position: "Sales Executive",
        email: "dewi@company.com",
        phone: "081234567894",
        photo: null,
        faceDescriptors: null,
        isActive: true,
        isSalesman: true,
        createdAt: new Date(),
      },
    ];

    employees.forEach(emp => this.employees.set(emp.id, emp));
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      employeeId: insertUser.employeeId ?? null,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;
    
    user.password = hashedPassword;
    this.users.set(userId, user);
    return true;
  }

  async getEmployee(id: string): Promise<Employee | undefined> {
    return this.employees.get(id);
  }

  async getEmployeeByEmployeeId(employeeId: string): Promise<Employee | undefined> {
    return Array.from(this.employees.values()).find(
      (emp) => emp.employeeId === employeeId,
    );
  }

  async getAllEmployees(activeOnly = false): Promise<Employee[]> {
    const employees = Array.from(this.employees.values());
    return activeOnly ? employees.filter(emp => emp.isActive) : employees;
  }

  async createEmployee(insertEmployee: InsertEmployee): Promise<Employee> {
    const id = randomUUID();
    const employee: Employee = { 
      ...insertEmployee, 
      id,
      email: insertEmployee.email ?? null,
      phone: insertEmployee.phone ?? null,
      photo: insertEmployee.photo ?? null,
      faceDescriptors: insertEmployee.faceDescriptors ?? null,
      isActive: insertEmployee.isActive ?? true,
      isSalesman: insertEmployee.isSalesman ?? false,
      createdAt: new Date(),
    };
    this.employees.set(id, employee);
    return employee;
  }

  async updateEmployee(id: string, data: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const employee = this.employees.get(id);
    if (!employee) return undefined;
    
    const updated = { ...employee, ...data };
    this.employees.set(id, updated);
    return updated;
  }

  async deleteEmployee(id: string): Promise<boolean> {
    return this.employees.delete(id);
  }

  async getAttendance(id: string): Promise<Attendance | undefined> {
    return this.attendances.get(id);
  }

  async getAttendancesByEmployee(
    employeeId: string, 
    startDate?: Date, 
    endDate?: Date
  ): Promise<Attendance[]> {
    let attendances = Array.from(this.attendances.values()).filter(
      (att) => att.employeeId === employeeId,
    );

    if (startDate) {
      attendances = attendances.filter(att => att.date && new Date(att.date) >= startDate);
    }

    if (endDate) {
      attendances = attendances.filter(att => att.date && new Date(att.date) <= endDate);
    }

    return attendances;
  }

  async getTodayAttendance(employeeId: string): Promise<Attendance | undefined> {
    const today = new Date().toISOString().split('T')[0];
    return Array.from(this.attendances.values()).find(
      (att) => att.employeeId === employeeId && att.date === today,
    );
  }

  async getAllAttendances(startDate?: Date, endDate?: Date): Promise<AttendanceWithEmployee[]> {
    let attendances = Array.from(this.attendances.values());

    if (startDate) {
      attendances = attendances.filter(att => att.date && new Date(att.date) >= startDate);
    }

    if (endDate) {
      attendances = attendances.filter(att => att.date && new Date(att.date) <= endDate);
    }

    return attendances.map(att => {
      const employee = Array.from(this.employees.values()).find(emp => emp.id === att.employeeId);
      return {
        ...att,
        employee: employee!,
      };
    }).filter(att => att.employee);
  }

  async createAttendance(insertAttendance: InsertAttendance): Promise<Attendance> {
    const id = randomUUID();
    const attendance: Attendance = { 
      ...insertAttendance, 
      id,
      status: insertAttendance.status ?? null,
      checkIn: insertAttendance.checkIn ?? null,
      breakStart: insertAttendance.breakStart ?? null,
      breakEnd: insertAttendance.breakEnd ?? null,
      checkOut: insertAttendance.checkOut ?? null,
      createdAt: new Date(),
    };
    this.attendances.set(id, attendance);
    return attendance;
  }

  async updateAttendance(id: string, data: Partial<InsertAttendance>): Promise<Attendance | undefined> {
    const attendance = this.attendances.get(id);
    if (!attendance) return undefined;
    
    const updated = { ...attendance, ...data };
    this.attendances.set(id, updated);
    return updated;
  }

  async getSchedule(id: string): Promise<Schedule | undefined> {
    return this.schedules.get(id);
  }

  async getSchedulesByEmployee(employeeId: string): Promise<Schedule[]> {
    return Array.from(this.schedules.values()).filter(
      (schedule) => schedule.employeeId === employeeId && schedule.isActive,
    );
  }

  async getAllSchedules(): Promise<Schedule[]> {
    return Array.from(this.schedules.values());
  }

  async createSchedule(insertSchedule: InsertSchedule): Promise<Schedule> {
    const id = randomUUID();
    const schedule: Schedule = { 
      ...insertSchedule, 
      id,
      isActive: insertSchedule.isActive ?? true,
    };
    this.schedules.set(id, schedule);
    return schedule;
  }

  async updateSchedule(id: string, data: Partial<InsertSchedule>): Promise<Schedule | undefined> {
    const schedule = this.schedules.get(id);
    if (!schedule) return undefined;
    
    const updated = { ...schedule, ...data };
    this.schedules.set(id, updated);
    return updated;
  }

  async deleteSchedule(id: string): Promise<boolean> {
    return this.schedules.delete(id);
  }

  // GPS Attendance methods
  async getGpsAttendance(id: string): Promise<GpsAttendance | undefined> {
    return this.gpsAttendances.get(id);
  }

  async getTodayGpsAttendance(employeeId: string): Promise<GpsAttendance | undefined> {
    const today = new Date().toISOString().split('T')[0];
    return Array.from(this.gpsAttendances.values()).find(
      (att) => att.employeeId === employeeId && att.date === today,
    );
  }

  async getGpsAttendancesByEmployee(
    employeeId: string, 
    startDate?: Date, 
    endDate?: Date
  ): Promise<GpsAttendance[]> {
    let attendances = Array.from(this.gpsAttendances.values()).filter(
      (att) => att.employeeId === employeeId,
    );

    if (startDate) {
      attendances = attendances.filter(att => att.date && new Date(att.date) >= startDate);
    }

    if (endDate) {
      attendances = attendances.filter(att => att.date && new Date(att.date) <= endDate);
    }

    return attendances;
  }

  async getAllGpsAttendances(startDate?: Date, endDate?: Date): Promise<GpsAttendanceWithEmployee[]> {
    let attendances = Array.from(this.gpsAttendances.values());

    if (startDate) {
      attendances = attendances.filter(att => att.date && new Date(att.date) >= startDate);
    }

    if (endDate) {
      attendances = attendances.filter(att => att.date && new Date(att.date) <= endDate);
    }

    return attendances.map(att => {
      const employee = Array.from(this.employees.values()).find(emp => emp.id === att.employeeId);
      return {
        ...att,
        employee: employee!,
      };
    }).filter(att => att.employee);
  }

  async createGpsAttendance(insertAttendance: InsertGpsAttendance): Promise<GpsAttendance> {
    const id = randomUUID();
    const attendance: GpsAttendance = { 
      ...insertAttendance, 
      id,
      checkInLatitude: insertAttendance.checkInLatitude ?? null,
      checkInLongitude: insertAttendance.checkInLongitude ?? null,
      checkInAddress: insertAttendance.checkInAddress ?? null,
      checkInLocationName: insertAttendance.checkInLocationName ?? null,
      checkOutLatitude: insertAttendance.checkOutLatitude ?? null,
      checkOutLongitude: insertAttendance.checkOutLongitude ?? null,
      checkOutAddress: insertAttendance.checkOutAddress ?? null,
      checkOutLocationName: insertAttendance.checkOutLocationName ?? null,
      checkIn: insertAttendance.checkIn ?? null,
      checkOut: insertAttendance.checkOut ?? null,
      status: insertAttendance.status ?? null,
      notes: insertAttendance.notes ?? null,
      createdAt: new Date(),
    };
    this.gpsAttendances.set(id, attendance);
    return attendance;
  }

  async updateGpsAttendance(id: string, data: Partial<InsertGpsAttendance>): Promise<GpsAttendance | undefined> {
    const attendance = this.gpsAttendances.get(id);
    if (!attendance) return undefined;
    
    const updated = { ...attendance, ...data };
    this.gpsAttendances.set(id, updated);
    return updated;
  }

  // Customer Visit methods
  async getCustomerVisit(id: string): Promise<CustomerVisit | undefined> {
    return this.customerVisits.get(id);
  }

  async getCustomerVisitsByEmployee(
    employeeId: string, 
    startDate?: Date, 
    endDate?: Date
  ): Promise<CustomerVisit[]> {
    let visits = Array.from(this.customerVisits.values()).filter(
      (visit) => visit.employeeId === employeeId,
    );

    if (startDate) {
      visits = visits.filter(visit => visit.visitStart >= startDate);
    }

    if (endDate) {
      visits = visits.filter(visit => visit.visitStart <= endDate);
    }

    return visits;
  }

  async getCustomerVisitsByDate(date: Date): Promise<CustomerVisit[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return Array.from(this.customerVisits.values()).filter(visit => 
      visit.visitStart >= startOfDay && visit.visitStart <= endOfDay
    );
  }

  async getAllCustomerVisits(startDate?: Date, endDate?: Date): Promise<CustomerVisitWithEmployee[]> {
    let visits = Array.from(this.customerVisits.values());

    if (startDate) {
      visits = visits.filter(visit => visit.visitStart >= startDate);
    }

    if (endDate) {
      visits = visits.filter(visit => visit.visitStart <= endDate);
    }

    return visits.map(visit => {
      const employee = Array.from(this.employees.values()).find(emp => emp.id === visit.employeeId);
      return {
        ...visit,
        employee: employee!,
      };
    }).filter(visit => visit.employee);
  }

  async createCustomerVisit(insertVisit: InsertCustomerVisit): Promise<CustomerVisit> {
    const id = randomUUID();
    const visit: CustomerVisit = { 
      ...insertVisit, 
      id,
      customerId: insertVisit.customerId,
      customerName: insertVisit.customerName,
      customerAddress: insertVisit.customerAddress ?? null,
      customerPhone: insertVisit.customerPhone ?? null,
      address: insertVisit.address ?? null,
      purpose: insertVisit.purpose ?? null,
      notes: insertVisit.notes ?? null,
      photos: insertVisit.photos ?? null,
      visitEnd: insertVisit.visitEnd ?? null,
      status: insertVisit.status ?? "planned",
      updatedAt: new Date(),
      createdAt: new Date(),
    };
    this.customerVisits.set(id, visit);
    return visit;
  }

  async updateCustomerVisit(id: string, data: Partial<InsertCustomerVisit>): Promise<CustomerVisit | undefined> {
    const visit = this.customerVisits.get(id);
    if (!visit) return undefined;
    
    const updated = { ...visit, ...data, updatedAt: new Date() };
    this.customerVisits.set(id, updated);
    return updated;
  }

  async deleteCustomerVisit(id: string): Promise<boolean> {
    return this.customerVisits.delete(id);
  }

  // Sales Target methods
  async getSalesTarget(id: string): Promise<SalesTarget | undefined> {
    return this.salesTargets.get(id);
  }

  async getSalesTargetsByEmployee(employeeId: string, period?: string): Promise<SalesTarget[]> {
    let targets = Array.from(this.salesTargets.values()).filter(
      (target) => target.employeeId === employeeId,
    );

    if (period) {
      targets = targets.filter(target => target.period === period);
    }

    return targets;
  }

  async getAllSalesTargets(): Promise<SalesTargetWithEmployee[]> {
    return Array.from(this.salesTargets.values()).map(target => {
      const employee = Array.from(this.employees.values()).find(emp => emp.id === target.employeeId);
      return {
        ...target,
        employee: employee!,
      };
    }).filter(target => target.employee);
  }

  async createSalesTarget(insertTarget: InsertSalesTarget): Promise<SalesTarget> {
    const id = randomUUID();
    const target: SalesTarget = { 
      id,
      employeeId: insertTarget.employeeId,
      period: insertTarget.period,
      targetValue: insertTarget.targetValue?.toString() ?? "0",
      actualValue: insertTarget.actualValue?.toString() ?? "0",
      targetType: insertTarget.targetType,
      startDate: insertTarget.startDate,
      endDate: insertTarget.endDate,
      isCompleted: insertTarget.isCompleted ?? false,
      notes: insertTarget.notes ?? null,
      createdAt: new Date(),
    };
    this.salesTargets.set(id, target);
    return target;
  }

  async updateSalesTarget(id: string, data: Partial<InsertSalesTarget>): Promise<SalesTarget | undefined> {
    const target = this.salesTargets.get(id);
    if (!target) return undefined;
    
    const updated = { ...target, ...data };
    this.salesTargets.set(id, updated);
    return updated;
  }

  async deleteSalesTarget(id: string): Promise<boolean> {
    return this.salesTargets.delete(id);
  }
}

export const storage = new MemStorage();
