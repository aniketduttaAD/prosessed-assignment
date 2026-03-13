import { Router } from "express";
import { getDepartments } from "../controllers/departmentController";

const router = Router();

router.get("/departments", getDepartments); // get departments

export default router;
