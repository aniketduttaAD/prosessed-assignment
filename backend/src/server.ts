import express from "express";
import cors from "cors";
import { PORT, CORS_ORIGIN } from "./config/env";
import { registerRoutes } from "./routes";
import { notFoundHandler } from "./middlewares/notFoundHandler";
import { errorHandler } from "./middlewares/errorHandler";
import { logger } from "./config/logger";
import { verifyDatabaseConnection } from "./db/prismaClient";

async function startServer() {
  await verifyDatabaseConnection();
  const app = express();

  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || CORS_ORIGIN.includes(origin)),
    }),
  );
  app.use(express.json());
  app.all("/", (req, res) => {
    res.status(200);
    req.method === "HEAD" ? res.end() : res.send("OK");
  });

  registerRoutes(app);
  app.use(notFoundHandler);
  app.use(errorHandler);

  app.listen(PORT, () => logger.info("Backend listening", { port: PORT }));
}

startServer().catch((err) => {
  logger.error("Failed to start server", { error: err });
  process.exit(1);
});
