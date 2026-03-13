import type { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error("Unhandled error", {
    path: req.path,
    method: req.method,
    error: err,
  });
  res.status(500).json({ message: "Internal server error" });
}

