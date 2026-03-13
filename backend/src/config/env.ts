import "dotenv/config";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");

export const PORT = Number(process.env.PORT) || 4000;
export const CORS_ORIGIN: string[] =
  process.env.CORS_ORIGIN?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? [];
export { DATABASE_URL };
