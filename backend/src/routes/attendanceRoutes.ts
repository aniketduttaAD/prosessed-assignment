import { Router } from "express";
import {
  createAttendance,
  listAttendance,
  getAttendanceMonthSummary,
  getAttendanceByDay,
} from "../controllers/attendanceController";

const router = Router();

router.post("/attendance", createAttendance); // create attendance record
router.get("/attendance", listAttendance); // list attendance records
router.get("/attendance/month-summary", getAttendanceMonthSummary); // get attendance month summary
router.get("/attendance/day", getAttendanceByDay); // get attendance by day

export default router;

