import type { Express } from "express";
import departmentRoutes from "./departmentRoutes";
import employeeRoutes from "./employeeRoutes";
import attendanceRoutes from "./attendanceRoutes";

export function registerRoutes(app: Express): void {
  app.use(departmentRoutes);  // register department routes
  app.use(employeeRoutes);  // register employee routes
  app.use(attendanceRoutes);  // register attendance routes
}

