import { Router } from "express";
import {
  listEmployees,
  createEmployee,
  deleteEmployee,
} from "../controllers/employeeController";

const router = Router();

router.get("/employees", listEmployees);// list employees
router.post("/employees", createEmployee);// create employee
router.delete("/employees/:id", deleteEmployee);// delete employee

export default router;

