import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../../generated/prisma/client";
import { DATABASE_URL } from "../config/env";
import { logger } from "../config/logger";

const adapter = new PrismaNeon({
  connectionString: DATABASE_URL,
});

export const prisma = new PrismaClient({ adapter });

export async function verifyDatabaseConnection(): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info("Database connection verified successfully");
  } catch (error) {
    logger.error("Database connectivity check failed", { error });
    throw error;
  }
}
