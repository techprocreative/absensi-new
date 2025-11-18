import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, boolean, integer, date, time, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["admin", "hrd", "employee", "salesman"] }).notNull(),
  employeeId: varchar("employee_id"),
});

export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: text("employee_id").notNull().unique(),
  name: text("name").notNull(),
  position: text("position").notNull(),
  email: text("email"),
  phone: text("phone"),
  photo: text("photo"),
  faceDescriptors: jsonb("face_descriptors"),
  isActive: boolean("is_active").notNull().default(true),
  isSalesman: boolean("is_salesman").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const attendances = pgTable("attendances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull(),
  date: date("date").notNull(),
  checkIn: timestamp("check_in"),
  breakStart: timestamp("break_start"),
  breakEnd: timestamp("break_end"),
  checkOut: timestamp("check_out"),
  status: text("status", { enum: ["present", "late", "absent", "on_break"] }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const schedules = pgTable("schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull(),
  dayOfWeek: integer("day_of_week").notNull(),
  shift: text("shift", { enum: ["pagi", "siang", "malam"] }).notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const gpsAttendances = pgTable("gps_attendances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull(),
  date: date("date").notNull(),
  checkInLatitude: numeric("check_in_latitude"),
  checkInLongitude: numeric("check_in_longitude"),
  checkInAddress: text("check_in_address"),
  checkInLocationName: text("check_in_location_name"),
  checkOutLatitude: numeric("check_out_latitude"),
  checkOutLongitude: numeric("check_out_longitude"),
  checkOutAddress: text("check_out_address"),
  checkOutLocationName: text("check_out_location_name"),
  checkIn: timestamp("check_in"),
  checkOut: timestamp("check_out"),
  status: text("status", { enum: ["present", "late", "absent", "on_break"] }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const customerVisits = pgTable("customer_visits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull(),
  customerId: varchar("customer_id").notNull(),
  customerName: text("customer_name").notNull(),
  customerAddress: text("customer_address"),
  customerPhone: text("customer_phone"),
  latitude: numeric("latitude").notNull(),
  longitude: numeric("longitude").notNull(),
  address: text("address"),
  visitType: text("visit_type", { enum: ["new_customer", "follow_up", "complaint", "delivery", "other"] }).notNull(),
  purpose: text("purpose"),
  notes: text("notes"),
  photos: jsonb("photos"),
  visitStart: timestamp("visit_start").notNull(),
  visitEnd: timestamp("visit_end"),
  status: text("status", { enum: ["planned", "in_progress", "completed", "cancelled"] }).default("planned"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const salesTargets = pgTable("sales_targets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull(),
  period: text("period", { enum: ["daily", "weekly", "monthly"] }).notNull(),
  targetValue: numeric("target_value").notNull(),
  actualValue: numeric("actual_value").default("0"),
  targetType: text("target_type", { enum: ["visits", "revenue", "new_customers", "orders"] }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  isCompleted: boolean("is_completed").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
});

export const insertAttendanceSchema = createInsertSchema(attendances).omit({
  id: true,
  createdAt: true,
});

export const insertScheduleSchema = createInsertSchema(schedules).omit({
  id: true,
});

export const insertGpsAttendanceSchema = createInsertSchema(gpsAttendances).omit({
  id: true,
  createdAt: true,
});

export const insertCustomerVisitSchema = createInsertSchema(customerVisits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSalesTargetSchema = createInsertSchema(salesTargets).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employees.$inferSelect;

export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendances.$inferSelect;

export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type Schedule = typeof schedules.$inferSelect;

export type InsertGpsAttendance = z.infer<typeof insertGpsAttendanceSchema>;
export type GpsAttendance = typeof gpsAttendances.$inferSelect;

export type InsertCustomerVisit = z.infer<typeof insertCustomerVisitSchema>;
export type CustomerVisit = typeof customerVisits.$inferSelect;

export type InsertSalesTarget = z.infer<typeof insertSalesTargetSchema>;
export type SalesTarget = typeof salesTargets.$inferSelect;

export type AttendanceWithEmployee = Attendance & { employee: Employee };
export type ScheduleWithEmployee = Schedule & { employee: Employee };
export type GpsAttendanceWithEmployee = GpsAttendance & { employee: Employee };
export type CustomerVisitWithEmployee = CustomerVisit & { employee: Employee };
export type SalesTargetWithEmployee = SalesTarget & { employee: Employee };
