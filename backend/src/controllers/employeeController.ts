import type { Request, Response, NextFunction } from "express";
import { prisma } from "../db/prismaClient";
import { logger } from "../config/logger";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

export async function listEmployees(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const {
      page = "1",
      pageSize = String(DEFAULT_PAGE_SIZE),
      search,
      department,
    } = req.query as {
      page?: string;
      pageSize?: string;
      search?: string;
      department?: string;
    };

    const pageNum = Math.max(1, Number(page) || 1);
    const sizeNum = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number(pageSize) || DEFAULT_PAGE_SIZE),
    );

    const term = search?.trim().toLowerCase() ?? "";
    const where: NonNullable<
      Parameters<typeof prisma.employee.findMany>[0]
    >["where"] = {};

    if (term) {
      where.OR = [
        { employeeId: { contains: term, mode: "insensitive" } },
        { fullName: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
        { department: { contains: term, mode: "insensitive" } },
      ];
    }

    if (department && department !== "all") {
      where.department = department;
    }

    logger.info("Listing employees with pagination", {
      page: pageNum,
      pageSize: sizeNum,
      search: term || undefined,
      department: where.department,
    });

    const [employees, totalEmployees, totalDepartments] = await Promise.all([
      prisma.employee.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (pageNum - 1) * sizeNum,
        take: sizeNum,
      }),
      prisma.employee.count(),
      prisma.department.count(),
    ]);

    res.json({
      items: employees,
      page: pageNum,
      pageSize: sizeNum,
      totalEmployees,
      totalDepartments,
      hasMore: pageNum * sizeNum < totalEmployees,
    });
  } catch (err) {
    next(err);
  }
}

export async function createEmployee(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { employeeId, fullName, email, department } = req.body as {
      employeeId?: string;
      fullName?: string;
      email?: string;
      department?: string;
    };

    if (!employeeId || !fullName || !email || !department) {
      logger.warn("Create employee validation failed: missing fields", {
        employeeId,
        fullName,
        email,
        department,
      });
      res.status(400).json({ message: "All fields are required." });
      return;
    }

    const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!emailPattern.test(email)) {
      logger.warn("Create employee validation failed: invalid email", {
        email,
      });
      res.status(400).json({ message: "Invalid email format." });
      return;
    }

    const existingEmail = await prisma.employee.findFirst({
      where: { email },
    });
    if (existingEmail) {
      logger.warn("Create employee failed: email already exists", { email });
      res
        .status(409)
        .json({ message: "A user with this email already exists." });
      return;
    }

    let finalEmployeeId = employeeId;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const existing = await prisma.employee.findUnique({
        where: { employeeId: finalEmployeeId },
      });
      if (!existing) break;

      const base =
        finalEmployeeId
          .split("-")[0]
          ?.toLowerCase()
          .replace(/[^a-z0-9]/g, "") || "user";
      const suffix = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
      finalEmployeeId = `${base}-${suffix}`;
    }

    const normalizedDept = department.trim();

    const departmentRecord = await prisma.department.upsert({
      where: { name: normalizedDept },
      update: {},
      create: { name: normalizedDept },
    });

    const created = await prisma.employee.create({
      data: {
        employeeId: finalEmployeeId,
        fullName,
        email,
        department: normalizedDept,
        departmentId: departmentRecord.id,
      },
    });
    logger.info("Employee created", {
      id: created.id,
      employeeId: created.employeeId,
    });
    res.status(201).json(created);
  } catch (err) {
    logger.error("Error creating employee", { error: err });
    next(err);
  }
}

export async function deleteEmployee(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      logger.warn("Delete employee failed: invalid id", { id: req.params.id });
      res.status(400).json({ message: "Invalid employee id." });
      return;
    }

    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) {
      logger.warn("Delete employee failed: not found", { id });
      res.status(404).json({ message: "Employee not found." });
      return;
    }

    await prisma.attendanceRecord.deleteMany({ where: { employeeId: id } });
    await prisma.employee.delete({ where: { id } });

    logger.info("Employee deleted", { id });
    res.status(204).send();
  } catch (err) {
    logger.error("Error deleting employee", { error: err });
    next(err);
  }
}
