import type { Request, Response, NextFunction } from "express";
import { prisma } from "../db/prismaClient";
import { logger } from "../config/logger";

export async function createAttendance(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { employeeId, date, status } = req.body as {
      employeeId?: number;
      date?: string;
      status?: string;
    };

    if (!employeeId || !date || !status) {
      logger.warn("Create attendance validation failed: missing fields", {
        employeeId,
        date,
        status,
      });
      res
        .status(400)
        .json({ message: "employeeId, date, and status are required." });
      return;
    }

    const parsedId = Number(employeeId);
    if (Number.isNaN(parsedId)) {
      logger.warn("Create attendance validation failed: invalid employeeId", {
        employeeId,
      });
      res.status(400).json({ message: "Invalid employeeId." });
      return;
    }

    const normalizedStatus = String(status).toUpperCase();
    if (normalizedStatus !== "PRESENT" && normalizedStatus !== "ABSENT") {
      logger.warn("Create attendance validation failed: invalid status", {
        status,
      });
      res.status(400).json({ message: "Status must be PRESENT or ABSENT." });
      return;
    }

    const employee = await prisma.employee.findUnique({
      where: { id: parsedId },
    });
    if (!employee) {
      logger.warn("Create attendance failed: employee not found", {
        employeeId: parsedId,
      });
      res.status(404).json({ message: "Employee not found." });
      return;
    }

    const dateValue = new Date(date);
    if (Number.isNaN(dateValue.getTime())) {
      logger.warn("Create attendance validation failed: invalid date", {
        date,
      });
      res.status(400).json({ message: "Invalid date." });
      return;
    }

    const todayLocal = new Date();
    const normalizeLocal = (d: Date) =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diffDays =
      Math.abs(normalizeLocal(dateValue) - normalizeLocal(todayLocal)) /
      (1000 * 60 * 60 * 24);
    if (diffDays > 1) {
      logger.warn("Create attendance failed: non-current date", { date });
      res
        .status(400)
        .json({
          message: "Attendance can only be marked for the current date.",
        });
      return;
    }

    const existingRecord = await prisma.attendanceRecord.findFirst({
      where: {
        employeeId: parsedId,
        date: dateValue,
      },
    });

    let record;
    if (existingRecord) {
      record = await prisma.attendanceRecord.update({
        where: { id: existingRecord.id },
        data: {
          status: normalizedStatus as any,
        },
      });
      logger.info("Attendance updated", {
        id: record.id,
        employeeId: record.employeeId,
        date: record.date.toISOString(),
        status: record.status,
      });
      res.status(200).json(record);
      return;
    }

    record = await prisma.attendanceRecord.create({
      data: {
        employeeId: parsedId,
        date: dateValue,
        status: normalizedStatus as any,
      },
    });
    logger.info("Attendance created", {
      id: record.id,
      employeeId: record.employeeId,
      date: record.date.toISOString(),
      status: record.status,
    });
    res.status(201).json(record);
  } catch (err) {
    logger.error("Error creating attendance", { error: err });
    next(err);
  }
}

export async function listAttendance(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const employeeIdParam = req.query.employeeId as string | undefined;
    if (!employeeIdParam) {
      logger.warn("List attendance failed: missing employeeId query param");
      res
        .status(400)
        .json({ message: "employeeId query parameter is required." });
      return;
    }
    const employeeId = Number(employeeIdParam);
    if (Number.isNaN(employeeId)) {
      logger.warn("List attendance failed: invalid employeeId", {
        employeeId: employeeIdParam,
      });
      res.status(400).json({ message: "Invalid employeeId." });
      return;
    }

    const records = await prisma.attendanceRecord.findMany({
      where: { employeeId },
      orderBy: { date: "desc" },
    });
    logger.info("Attendance records fetched", {
      employeeId,
      count: records.length,
    });
    res.json(records);
  } catch (err) {
    logger.error("Error listing attendance", { error: err });
    next(err);
  }
}

export async function getAttendanceMonthSummary(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const yearParam = req.query.year as string | undefined;
    const monthParam = req.query.month as string | undefined;

    if (!yearParam || !monthParam) {
      res
        .status(400)
        .json({ message: "year and month query parameters are required." });
      return;
    }

    const year = Number(yearParam);
    const month = Number(monthParam);

    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      res.status(400).json({ message: "Invalid year or month." });
      return;
    }

    const rangeStart = new Date(year, month - 1, 1);
    const rangeEnd = new Date(year, month, 1);

    const [totalEmployees, grouped] = await Promise.all([
      prisma.employee.count(),
      prisma.attendanceRecord.groupBy({
        by: ["date", "status"],
        where: {
          date: {
            gte: rangeStart,
            lt: rangeEnd,
          },
        },
        _count: {
          _all: true,
        },
      }),
    ]);

    const days: Record<
      string,
      {
        present: number;
        absent: number;
      }
    > = {};

    for (const row of grouped) {
      const key = row.date.toISOString().slice(0, 10);
      if (!days[key]) {
        days[key] = { present: 0, absent: 0 };
      }
      if (row.status === "PRESENT") {
        days[key].present += row._count._all;
      } else if (row.status === "ABSENT") {
        days[key].absent += row._count._all;
      }
    }

    res.json({
      year,
      month,
      totalEmployees,
      days,
    });
  } catch (err) {
    logger.error("Error getting monthly attendance summary", { error: err });
    next(err);
  }
}

export async function getAttendanceByDay(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dateParam = req.query.date as string | undefined;
    if (!dateParam) {
      res
        .status(400)
        .json({ message: "date query parameter is required (YYYY-MM-DD)." });
      return;
    }

    const [year, month, day] = dateParam.split("-").map((v) => Number(v));
    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      !Number.isInteger(day) ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31
    ) {
      res.status(400).json({ message: "Invalid date format." });
      return;
    }

    const rangeStart = new Date(year, month - 1, day);
    const rangeEnd = new Date(year, month - 1, day + 1);

    const records = await prisma.attendanceRecord.findMany({
      where: {
        date: {
          gte: rangeStart,
          lt: rangeEnd,
        },
      },
      select: {
        employeeId: true,
        status: true,
      },
    });

    const statuses: Record<number, string> = {};
    for (const rec of records) {
      statuses[rec.employeeId] = rec.status;
    }

    res.json({
      date: dateParam,
      statuses,
    });
  } catch (err) {
    logger.error("Error getting daily attendance", { error: err });
    next(err);
  }
}
