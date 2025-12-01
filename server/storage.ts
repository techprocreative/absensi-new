import {
  users,
  employees,
  attendances,
  schedules,
  gpsAttendances,
  customerVisits,
  salesTargets,
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
  type SalesTargetWithEmployee,
} from "@shared/schema";
import { db } from "./db";
import { and, eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(userId: string, hashedPassword: string): Promise<boolean>;

  getEmployee(id: string): Promise<Employee | undefined>;
  getEmployeeByEmployeeId(employeeId: string): Promise<Employee | undefined>;
  getAllEmployees(activeOnly?: boolean): Promise<Employee[]>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(
    id: string,
    employee: Partial<InsertEmployee>,
  ): Promise<Employee | undefined>;
  deleteEmployee(id: string): Promise<boolean>;

  getAttendance(id: string): Promise<Attendance | undefined>;
  getAttendancesByEmployee(
    employeeId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Attendance[]>;
  getTodayAttendance(employeeId: string): Promise<Attendance | undefined>;
  getAllAttendances(
    startDate?: Date,
    endDate?: Date,
  ): Promise<AttendanceWithEmployee[]>;
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  updateAttendance(
    id: string,
    attendance: Partial<InsertAttendance>,
  ): Promise<Attendance | undefined>;

  getSchedule(id: string): Promise<Schedule | undefined>;
  getSchedulesByEmployee(employeeId: string): Promise<Schedule[]>;
  getAllSchedules(): Promise<Schedule[]>;
  createSchedule(schedule: InsertSchedule): Promise<Schedule>;
  updateSchedule(
    id: string,
    schedule: Partial<InsertSchedule>,
  ): Promise<Schedule | undefined>;
  deleteSchedule(id: string): Promise<boolean>;

  // GPS Attendance methods
  getGpsAttendance(id: string): Promise<GpsAttendance | undefined>;
  getTodayGpsAttendance(employeeId: string): Promise<GpsAttendance | undefined>;
  getGpsAttendancesByEmployee(
    employeeId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<GpsAttendance[]>;
  getAllGpsAttendances(
    startDate?: Date,
    endDate?: Date,
  ): Promise<GpsAttendanceWithEmployee[]>;
  createGpsAttendance(attendance: InsertGpsAttendance): Promise<GpsAttendance>;
  updateGpsAttendance(
    id: string,
    attendance: Partial<InsertGpsAttendance>,
  ): Promise<GpsAttendance | undefined>;

  // Customer Visit methods
  getCustomerVisit(id: string): Promise<CustomerVisit | undefined>;
  getCustomerVisitsByEmployee(
    employeeId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<CustomerVisit[]>;
  getCustomerVisitsByDate(date: Date): Promise<CustomerVisit[]>;
  getAllCustomerVisits(
    startDate?: Date,
    endDate?: Date,
  ): Promise<CustomerVisitWithEmployee[]>;
  createCustomerVisit(visit: InsertCustomerVisit): Promise<CustomerVisit>;
  updateCustomerVisit(
    id: string,
    visit: Partial<InsertCustomerVisit>,
  ): Promise<CustomerVisit | undefined>;
  deleteCustomerVisit(id: string): Promise<boolean>;

  // Sales Target methods
  getSalesTarget(id: string): Promise<SalesTarget | undefined>;
  getSalesTargetsByEmployee(
    employeeId: string,
    period?: string,
  ): Promise<SalesTarget[]>;
  getAllSalesTargets(): Promise<SalesTargetWithEmployee[]>;
  createSalesTarget(target: InsertSalesTarget): Promise<SalesTarget>;
  updateSalesTarget(
    id: string,
    target: Partial<InsertSalesTarget>,
  ): Promise<SalesTarget | undefined>;
  deleteSalesTarget(id: string): Promise<boolean>;
}

class DbStorage implements IStorage {
  // Users

  async getUser(id: string): Promise<User | undefined> {
    const [row] = await db.select().from(users).where(eq(users.id, id));
    return row;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return row;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [row] = await db.insert(users).values(insertUser).returning();
    return row;
  }

  async updateUserPassword(
    userId: string,
    hashedPassword: string,
  ): Promise<boolean> {
    const updateResult = await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId))
      .returning({ id: users.id });

    return updateResult.length > 0;
  }

  // Employees

  async getEmployee(id: string): Promise<Employee | undefined> {
    const [row] = await db
      .select()
      .from(employees)
      .where(eq(employees.id, id));
    return row;
  }

  async getEmployeeByEmployeeId(
    employeeId: string,
  ): Promise<Employee | undefined> {
    const [row] = await db
      .select()
      .from(employees)
      .where(eq(employees.employeeId, employeeId));
    return row;
  }

  async getAllEmployees(activeOnly = false): Promise<Employee[]> {
    if (activeOnly) {
      return db
        .select()
        .from(employees)
        .where(eq(employees.isActive, true));
    }
    return db.select().from(employees);
  }

  async createEmployee(insertEmployee: InsertEmployee): Promise<Employee> {
    const [row] = await db
      .insert(employees)
      .values(insertEmployee)
      .returning();
    return row;
  }

  async updateEmployee(
    id: string,
    employee: Partial<InsertEmployee>,
  ): Promise<Employee | undefined> {
    const data = cleanUpdate(employee);
    if (Object.keys(data).length === 0) {
      return this.getEmployee(id);
    }

    const [row] = await db
      .update(employees)
      .set(data)
      .where(eq(employees.id, id))
      .returning();
    return row;
  }

  async deleteEmployee(id: string): Promise<boolean> {
    const result = await db
      .delete(employees)
      .where(eq(employees.id, id))
      .returning({ id: employees.id });
    return result.length > 0;
  }

  // Attendance

  async getAttendance(id: string): Promise<Attendance | undefined> {
    const [row] = await db
      .select()
      .from(attendances)
      .where(eq(attendances.id, id));
    return row;
  }

  async getAttendancesByEmployee(
    employeeId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Attendance[]> {
    const rows = await db
      .select()
      .from(attendances)
      .where(eq(attendances.employeeId, employeeId));

    let result = rows;

    if (startDate) {
      result = result.filter(
        (att) => att.date && new Date(att.date as any) >= startDate,
      );
    }

    if (endDate) {
      result = result.filter(
        (att) => att.date && new Date(att.date as any) <= endDate,
      );
    }

    return result;
  }

  async getTodayAttendance(employeeId: string): Promise<Attendance | undefined> {
    const today = new Date().toISOString().split("T")[0];

    const [row] = await db
      .select()
      .from(attendances)
      .where(
        and(
          eq(attendances.employeeId, employeeId),
          eq(attendances.date, today),
        ),
      );

    return row;
  }

  async getAllAttendances(
    startDate?: Date,
    endDate?: Date,
  ): Promise<AttendanceWithEmployee[]> {
    const allAttendances = await db.select().from(attendances);

    let filtered = allAttendances;

    if (startDate) {
      filtered = filtered.filter(
        (att) => att.date && new Date(att.date as any) >= startDate,
      );
    }

    if (endDate) {
      filtered = filtered.filter(
        (att) => att.date && new Date(att.date as any) <= endDate,
      );
    }

    const allEmployees = await db.select().from(employees);
    const employeesByCode = new Map(
      allEmployees.map((emp) => [emp.employeeId, emp]),
    );

    const withEmployees: AttendanceWithEmployee[] = [];

    for (const att of filtered) {
      const employee = employeesByCode.get(att.employeeId);
      if (!employee) continue;
      withEmployees.push({
        ...att,
        employee,
      });
    }

    return withEmployees;
  }

  async createAttendance(
    insertAttendance: InsertAttendance,
  ): Promise<Attendance> {
    const [row] = await db
      .insert(attendances)
      .values(insertAttendance)
      .returning();
    return row;
  }

  async updateAttendance(
    id: string,
    attendance: Partial<InsertAttendance>,
  ): Promise<Attendance | undefined> {
    const data = cleanUpdate(attendance);
    if (Object.keys(data).length === 0) {
      return this.getAttendance(id);
    }

    const [row] = await db
      .update(attendances)
      .set(data)
      .where(eq(attendances.id, id))
      .returning();
    return row;
  }

  // Schedules

  async getSchedule(id: string): Promise<Schedule | undefined> {
    const [row] = await db
      .select()
      .from(schedules)
      .where(eq(schedules.id, id));
    return row;
  }

  async getSchedulesByEmployee(employeeId: string): Promise<Schedule[]> {
    return db
      .select()
      .from(schedules)
      .where(
        and(eq(schedules.employeeId, employeeId), eq(schedules.isActive, true)),
      );
  }

  async getAllSchedules(): Promise<Schedule[]> {
    return db.select().from(schedules);
  }

  async createSchedule(insertSchedule: InsertSchedule): Promise<Schedule> {
    const [row] = await db
      .insert(schedules)
      .values(insertSchedule)
      .returning();
    return row;
  }

  async updateSchedule(
    id: string,
    schedule: Partial<InsertSchedule>,
  ): Promise<Schedule | undefined> {
    const data = cleanUpdate(schedule);
    if (Object.keys(data).length === 0) {
      return this.getSchedule(id);
    }

    const [row] = await db
      .update(schedules)
      .set(data)
      .where(eq(schedules.id, id))
      .returning();
    return row;
  }

  async deleteSchedule(id: string): Promise<boolean> {
    const result = await db
      .delete(schedules)
      .where(eq(schedules.id, id))
      .returning({ id: schedules.id });
    return result.length > 0;
  }

  // GPS Attendance

  async getGpsAttendance(id: string): Promise<GpsAttendance | undefined> {
    const [row] = await db
      .select()
      .from(gpsAttendances)
      .where(eq(gpsAttendances.id, id));
    return row;
  }

  async getTodayGpsAttendance(
    employeeId: string,
  ): Promise<GpsAttendance | undefined> {
    const today = new Date().toISOString().split("T")[0];

    const [row] = await db
      .select()
      .from(gpsAttendances)
      .where(
        and(
          eq(gpsAttendances.employeeId, employeeId),
          eq(gpsAttendances.date, today),
        ),
      );

    return row;
  }

  async getGpsAttendancesByEmployee(
    employeeId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<GpsAttendance[]> {
    const rows = await db
      .select()
      .from(gpsAttendances)
      .where(eq(gpsAttendances.employeeId, employeeId));

    let result = rows;

    if (startDate) {
      result = result.filter(
        (att) => att.date && new Date(att.date as any) >= startDate,
      );
    }

    if (endDate) {
      result = result.filter(
        (att) => att.date && new Date(att.date as any) <= endDate,
      );
    }

    return result;
  }

  async getAllGpsAttendances(
    startDate?: Date,
    endDate?: Date,
  ): Promise<GpsAttendanceWithEmployee[]> {
    const allAttendances = await db.select().from(gpsAttendances);

    let filtered = allAttendances;

    if (startDate) {
      filtered = filtered.filter(
        (att) => att.date && new Date(att.date as any) >= startDate,
      );
    }

    if (endDate) {
      filtered = filtered.filter(
        (att) => att.date && new Date(att.date as any) <= endDate,
      );
    }

    const allEmployees = await db.select().from(employees);
    const employeesByCode = new Map(
      allEmployees.map((emp) => [emp.employeeId, emp]),
    );

    const withEmployees: GpsAttendanceWithEmployee[] = [];

    for (const att of filtered) {
      const employee = employeesByCode.get(att.employeeId);
      if (!employee) continue;
      withEmployees.push({
        ...att,
        employee,
      });
    }

    return withEmployees;
  }

  async createGpsAttendance(
    insertAttendance: InsertGpsAttendance,
  ): Promise<GpsAttendance> {
    const [row] = await db
      .insert(gpsAttendances)
      .values(insertAttendance)
      .returning();
    return row;
  }

  async updateGpsAttendance(
    id: string,
    attendance: Partial<InsertGpsAttendance>,
  ): Promise<GpsAttendance | undefined> {
    const data = cleanUpdate(attendance);
    if (Object.keys(data).length === 0) {
      return this.getGpsAttendance(id);
    }

    const [row] = await db
      .update(gpsAttendances)
      .set(data)
      .where(eq(gpsAttendances.id, id))
      .returning();
    return row;
  }

  // Customer Visits

  async getCustomerVisit(id: string): Promise<CustomerVisit | undefined> {
    const [row] = await db
      .select()
      .from(customerVisits)
      .where(eq(customerVisits.id, id));
    return row;
  }

  async getCustomerVisitsByEmployee(
    employeeId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<CustomerVisit[]> {
    const rows = await db
      .select()
      .from(customerVisits)
      .where(eq(customerVisits.employeeId, employeeId));

    let result = rows;

    if (startDate) {
      result = result.filter(
        (visit) =>
          visit.visitStart && new Date(visit.visitStart as any) >= startDate,
      );
    }

    if (endDate) {
      result = result.filter(
        (visit) =>
          visit.visitStart && new Date(visit.visitStart as any) <= endDate,
      );
    }

    return result;
  }

  async getCustomerVisitsByDate(date: Date): Promise<CustomerVisit[]> {
    const rows = await db.select().from(customerVisits);

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return rows.filter((visit) => {
      if (!visit.visitStart) return false;
      const visitDate = new Date(visit.visitStart as any);
      return visitDate >= startOfDay && visitDate <= endOfDay;
    });
  }

  async getAllCustomerVisits(
    startDate?: Date,
    endDate?: Date,
  ): Promise<CustomerVisitWithEmployee[]> {
    const rows = await db.select().from(customerVisits);

    let filtered = rows;

    if (startDate) {
      filtered = filtered.filter(
        (visit) =>
          visit.visitStart && new Date(visit.visitStart as any) >= startDate,
      );
    }

    if (endDate) {
      filtered = filtered.filter(
        (visit) =>
          visit.visitStart && new Date(visit.visitStart as any) <= endDate,
      );
    }

    const allEmployees = await db.select().from(employees);
    const employeesByCode = new Map(
      allEmployees.map((emp) => [emp.employeeId, emp]),
    );

    const withEmployees: CustomerVisitWithEmployee[] = [];

    for (const visit of filtered) {
      const employee = employeesByCode.get(visit.employeeId);
      if (!employee) continue;
      withEmployees.push({
        ...visit,
        employee,
      });
    }

    return withEmployees;
  }

  async createCustomerVisit(
    insertVisit: InsertCustomerVisit,
  ): Promise<CustomerVisit> {
    const [row] = await db
      .insert(customerVisits)
      .values(insertVisit)
      .returning();
    return row;
  }

  async updateCustomerVisit(
    id: string,
    visit: Partial<InsertCustomerVisit>,
  ): Promise<CustomerVisit | undefined> {
    const data = cleanUpdate(visit);
    if (Object.keys(data).length === 0) {
      return this.getCustomerVisit(id);
    }

    const [row] = await db
      .update(customerVisits)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(customerVisits.id, id))
      .returning();
    return row;
  }

  async deleteCustomerVisit(id: string): Promise<boolean> {
    const result = await db
      .delete(customerVisits)
      .where(eq(customerVisits.id, id))
      .returning({ id: customerVisits.id });
    return result.length > 0;
  }

  // Sales Targets

  async getSalesTarget(id: string): Promise<SalesTarget | undefined> {
    const [row] = await db
      .select()
      .from(salesTargets)
      .where(eq(salesTargets.id, id));
    return row;
  }

  async getSalesTargetsByEmployee(
    employeeId: string,
    period?: string,
  ): Promise<SalesTarget[]> {
    let rows = await db
      .select()
      .from(salesTargets)
      .where(eq(salesTargets.employeeId, employeeId));

    if (period) {
      rows = rows.filter((target) => target.period === period);
    }

    return rows;
  }

  async getAllSalesTargets(): Promise<SalesTargetWithEmployee[]> {
    const allTargets = await db.select().from(salesTargets);
    const allEmployees = await db.select().from(employees);
    const employeesByCode = new Map(
      allEmployees.map((emp) => [emp.employeeId, emp]),
    );

    const withEmployees: SalesTargetWithEmployee[] = [];

    for (const target of allTargets) {
      const employee = employeesByCode.get(target.employeeId);
      if (!employee) continue;
      withEmployees.push({
        ...target,
        employee,
      });
    }

    return withEmployees;
  }

  async createSalesTarget(
    insertTarget: InsertSalesTarget,
  ): Promise<SalesTarget> {
    const [row] = await db
      .insert(salesTargets)
      .values(insertTarget)
      .returning();
    return row;
  }

  async updateSalesTarget(
    id: string,
    target: Partial<InsertSalesTarget>,
  ): Promise<SalesTarget | undefined> {
    const data = cleanUpdate(target);
    if (Object.keys(data).length === 0) {
      return this.getSalesTarget(id);
    }

    const [row] = await db
      .update(salesTargets)
      .set(data)
      .where(eq(salesTargets.id, id))
      .returning();
    return row;
  }

  async deleteSalesTarget(id: string): Promise<boolean> {
    const result = await db
      .delete(salesTargets)
      .where(eq(salesTargets.id, id))
      .returning({ id: salesTargets.id });
    return result.length > 0;
  }
}

function cleanUpdate<T extends Record<string, unknown>>(data: T): Partial<T> {
  const result: Partial<T> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      (result as any)[key] = value;
    }
  }
  return result;
}

export const storage: IStorage = new DbStorage();
