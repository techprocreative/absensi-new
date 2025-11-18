import { 
  type User, 
  type InsertUser,
  type Employee,
  type InsertEmployee,
  type Attendance,
  type InsertAttendance,
  type Schedule,
  type InsertSchedule,
  type AttendanceWithEmployee
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
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
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private employees: Map<string, Employee>;
  private attendances: Map<string, Attendance>;
  private schedules: Map<string, Schedule>;

  constructor() {
    this.users = new Map();
    this.employees = new Map();
    this.attendances = new Map();
    this.schedules = new Map();
    this.seedData();
  }

  private seedData() {
    const adminUser: User = {
      id: randomUUID(),
      username: "admin",
      password: "admin",
      role: "admin",
      employeeId: null,
    };
    
    const hrdUser: User = {
      id: randomUUID(),
      username: "hrd",
      password: "hrd",
      role: "hrd",
      employeeId: null,
    };

    const empUser: User = {
      id: randomUUID(),
      username: "emp",
      password: "emp",
      role: "employee",
      employeeId: "EMP001",
    };

    this.users.set(adminUser.id, adminUser);
    this.users.set(hrdUser.id, hrdUser);
    this.users.set(empUser.id, empUser);

    const employees: Employee[] = [
      {
        id: randomUUID(),
        employeeId: "EMP001",
        name: "Budi Santoso",
        position: "Software Engineer",
        email: "budi@company.com",
        phone: "081234567890",
        photo: null,
        faceDescriptors: null,
        isActive: true,
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
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
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
    const schedule: Schedule = { ...insertSchedule, id };
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
}

export const storage = new MemStorage();
