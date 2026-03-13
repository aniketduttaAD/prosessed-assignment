import winston from "winston";

const { combine, timestamp, json, colorize, printf } = winston.format;

const logLevel = process.env.LOG_LEVEL || "info";

const consoleFormat = combine(
  colorize(),
  timestamp(),
  printf(({ level, message, timestamp: ts, ...meta }) => {
    const metaString = Object.keys(meta).length
      ? ` ${JSON.stringify(meta)}`
      : "";
    return `[${ts as string}] ${level}: ${String(message)}${metaString}`;
  }),
);

export const logger = winston.createLogger({
  level: logLevel,
  format: combine(timestamp(), json()),
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],
  exitOnError: false,
});
